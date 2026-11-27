// Login feito na mão pela pessoa numa janela visível (docs/02-TRD.md §4).
// A senha nunca passa pelo Raio-X: só a sessão (cookies, localStorage, IndexedDB) é guardada, criptografada.
import type { Page } from 'playwright-core'
import { ErroRaioX } from '../medir/endereco.js'
import { abrirNavegador } from '../medir/navegador.js'
import { abrir } from './descobrir.js'
import { enderecoDeLogin } from './regras.js'
import { Registro, Ritmo } from './registro.js'
import { lerSessao, salvarSessao, type EstadoDoNavegador, type EstadoSessao, type OpcoesSessao } from './sessao.js'

export type OpcoesEntrar = OpcoesSessao & {
  /**
   * Termina quando esta promessa resolver (ex.: Enter no terminal, botão "Já entrei" no app).
   * Fechar a janela do site também termina.
   */
  jaEntrei?: Promise<void>
  /** Avisos para mostrar à pessoa enquanto espera. */
  aoAndar?: (msg: string) => void
  /**
   * Só para testes: abre sem janela e chama esta função com a página aberta (o teste faz o login
   * e fecha a janela ou resolve `jaEntrei`). Nunca usado pelo comando.
   */
  aoAbrirParaTeste?: (pagina: Page) => Promise<void>
}

export type ResultadoEntrar = EstadoSessao & {
  /**
   * true = confirmado de verdade: com a sessão a página abre, e sem ela cai na tela de entrada.
   * false = a página abre até sem entrar (é pública): a sessão foi salva, mas não deu para provar o login.
   */
  confirmada: boolean
}

const tem = (e: EstadoDoNavegador) => e.cookies.length > 0 || e.origins.length > 0
const VAZIO: EstadoDoNavegador = { cookies: [], origins: [] }

/**
 * Abre a janela no endereço, espera a pessoa entrar e salva a sessão.
 * A entrada guardada é a última página do site (fora da tela de entrada) que a janela visitou.
 * Confere sem janela: com a sessão não pode cair no login; sem a sessão, deve cair (senão a página é pública).
 */
export async function entrar(endereco: string, op: OpcoesEntrar = {}): Promise<ResultadoEntrar> {
  const origem = new URL(endereco).origin
  const nav = await abrirNavegador({ visivel: !op.aoAbrirParaTeste })
  let ultimo: EstadoDoNavegador = VAZIO
  let ultimaPagina: string | null = enderecoDeLogin(endereco) ? null : endereco
  const fotografar = async () => {
    try {
      ultimo = (await nav.contexto.storageState({ indexedDB: true })) as EstadoDoNavegador
    } catch {
      // janela fechando: fica a última foto
    }
  }
  const acompanhar = (p: Page) => {
    p.on('load', () => void fotografar())
    p.on('framenavigated', (f) => {
      if (f !== p.mainFrame()) return
      try {
        const u = new URL(f.url())
        u.hash = ''
        if (u.origin === origem && !enderecoDeLogin(u.href)) ultimaPagina = u.href
      } catch {
        // endereço estranho (about:blank): ignora
      }
    })
  }
  try {
    const pagina = nav.contexto.pages()[0] ?? (await nav.contexto.newPage())
    // guarda a sessão a cada página carregada e de tempos em tempos (a última foto vale se a janela fechar)
    nav.contexto.on('page', acompanhar)
    acompanhar(pagina)
    const relogio = setInterval(() => void fotografar(), 2_000)
    try {
      const fechou = new Promise<void>((ok) => {
        nav.contexto.on('close', () => ok())
        const conferir = () => {
          if (nav.contexto.pages().length === 0) ok()
        }
        nav.contexto.on('page', (p) => p.on('close', conferir))
        pagina.on('close', conferir)
      })
      await pagina.goto(endereco, { waitUntil: 'domcontentloaded', timeout: 60_000 })
      op.aoAndar?.('janela aberta')
      const espera = Promise.race([fechou, op.jaEntrei ?? new Promise<void>(() => {})])
      if (op.aoAbrirParaTeste) await op.aoAbrirParaTeste(pagina)
      await espera
      await fotografar()
    } finally {
      clearInterval(relogio)
    }
  } finally {
    await nav.fechar()
  }
  if (!tem(ultimo)) throw new ErroRaioX('nadaSalvo')
  // sem nenhuma página da área logada visitada (só a tela de entrada): não há o que conferir
  if (!ultimaPagina) throw new ErroRaioX('entradaNaoConfirmada')
  const entrada = ultimaPagina
  if (!(await logado(entrada, ultimo))) throw new ErroRaioX('entradaNaoConfirmada')
  const confirmada = !(await logado(entrada, VAZIO))
  await salvarSessao(endereco, entrada, ultimo, op)
  return { site: endereco, existe: true, entrada, salvaEm: new Date().toISOString(), valida: true, confirmada }
}

/** Abre o endereço sem janela, com o estado dado, e diz se a página abriu sem cair na tela de entrada. */
async function logado(endereco: string, estado: EstadoDoNavegador, registro = new Registro()): Promise<boolean> {
  const nav = await abrirNavegador({ sessao: estado })
  try {
    const pagina = await nav.contexto.newPage()
    const r = await abrir(pagina, endereco, new Ritmo(0), registro, 'conferencia')
    return !r.noLogin
  } finally {
    await nav.fechar()
  }
}

/** Confere a sessão salva do site (abre o endereço de entrada sem janela). */
export async function conferirSessao(site: string, op: OpcoesSessao = {}): Promise<EstadoSessao> {
  const s = await lerSessao(site, op)
  if (!s) return { site, existe: false }
  const valida = await logado(s.entrada, s.estado)
  return { site, existe: true, entrada: s.entrada, salvaEm: s.salvaEm, valida }
}
