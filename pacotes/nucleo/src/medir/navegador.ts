import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { BrowserContext } from 'playwright-core'
import type { EstadoDoNavegador } from '../navegar/sessao.js'
import { ErroRaioX } from './endereco.js'

export type NavegadorDeTeste = {
  /**
   * Contexto persistente: é o contexto padrão do navegador, o mesmo em que o Lighthouse
   * abre a aba dele pela porta de depuração — por isso a sessão do login colocada aqui vale na medição.
   */
  contexto: BrowserContext
  porta: number
  canal: string
  /** Versão do navegador (ex.: "158.0.4370.33"). */
  versao: string
  fechar: () => Promise<void>
}

export type OpcoesNavegador = {
  /** Sessão do login para colocar no navegador antes de medir. */
  sessao?: EstadoDoNavegador
  /** Janela visível (para a pessoa entrar no site). */
  visivel?: boolean
}

/**
 * Ordem de tentativa: Chromium baixado pelo Playwright, depois Edge e Chrome
 * instalados no PC (todos são Chromium, o Lighthouse funciona igual).
 * RAIOX_NAVEGADOR=msedge (ou chrome/chromium) força um deles.
 */
const CANAIS = ['chromium', 'msedge', 'chrome'] as const

class ErroSessaoNoNavegador extends Error {
  constructor(public causa: unknown) {
    super('não consegui colocar a sessão no navegador')
  }
}

/**
 * Versão do navegador (ex.: "158.0.4370.33"). No contexto persistente o Playwright não dá
 * o objeto do navegador (browser() é null), então pergunta pelo protocolo de depuração.
 */
async function versaoDoNavegador(contexto: BrowserContext): Promise<string> {
  const direto = contexto.browser()?.version()
  if (direto) return direto
  try {
    const pagina = contexto.pages()[0] ?? (await contexto.newPage())
    const cdp = await contexto.newCDPSession(pagina)
    const v = (await cdp.send('Browser.getVersion')) as { product: string }
    await cdp.detach().catch(() => {})
    return v.product.split('/')[1] ?? v.product
  } catch {
    return '?'
  }
}

/** Porta livre do sistema para a depuração do Chromium. */
async function portaLivre(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = createServer()
    s.unref()
    s.on('error', reject)
    s.listen(0, '127.0.0.1', () => {
      const end = s.address()
      const porta = typeof end === 'object' && end ? end.port : 0
      s.close(() => resolve(porta))
    })
  })
}

/**
 * Abre o navegador com um perfil temporário (apagado ao fechar) e porta de depuração,
 * para o Lighthouse se conectar no mesmo navegador (docs/02-TRD.md §3).
 */
export async function abrirNavegador(op: OpcoesNavegador = {}): Promise<NavegadorDeTeste> {
  const forcado = process.env.RAIOX_NAVEGADOR
  const canais = forcado ? [forcado] : [...CANAIS]
  // carregado só aqui, para não pesar quem só gera relatório ou lê a ajuda
  const { chromium } = await import('playwright-core')
  const falhas: string[] = []
  for (const canal of canais) {
    const porta = await portaLivre()
    const perfil = await mkdtemp(join(tmpdir(), 'raiox-perfil-'))
    const apagarPerfil = () => rm(perfil, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {})
    try {
      const contexto = await chromium.launchPersistentContext(perfil, {
        channel: canal, // Chromium completo no modo sem janela novo (o Lighthouse precisa dele)
        headless: !op.visivel,
        viewport: op.visivel ? null : { width: 1280, height: 800 },
        args: [`--remote-debugging-port=${porta}`, '--remote-debugging-address=127.0.0.1'],
      })
      if (op.sessao) {
        try {
          await contexto.setStorageState(op.sessao as Parameters<BrowserContext['setStorageState']>[0])
        } catch (e) {
          await contexto.close().catch(() => {})
          await apagarPerfil()
          // erro da sessão, não do navegador: não tenta o próximo canal
          throw new ErroSessaoNoNavegador(e)
        }
      }
      const versao = await versaoDoNavegador(contexto)
      return {
        contexto,
        porta,
        canal,
        versao,
        fechar: async () => {
          await contexto.close().catch(() => {})
          await apagarPerfil()
        },
      }
    } catch (e) {
      if (e instanceof ErroSessaoNoNavegador) throw new ErroRaioX('sessaoIlegivel')
      await apagarPerfil()
      falhas.push(`${canal}: ${String(e).split('\n')[0]}`)
    }
  }
  const erro = new ErroRaioX('navegadorFaltando')
  erro.message += `\n${falhas.join('\n')}`
  throw erro
}
