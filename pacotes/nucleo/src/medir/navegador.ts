import { createServer } from 'node:net'
import { chromium, type Browser } from 'playwright-core'
import { ErroRaioX } from './endereco.js'

export type NavegadorDeTeste = { navegador: Browser; porta: number; canal: string; fechar: () => Promise<void> }

/**
 * Ordem de tentativa: Chromium baixado pelo Playwright, depois Edge e Chrome
 * instalados no PC (todos são Chromium, o Lighthouse funciona igual).
 * RAIOX_NAVEGADOR=msedge (ou chrome/chromium) força um deles.
 */
const CANAIS = ['chromium', 'msedge', 'chrome'] as const

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
 * Abre o Chromium do Playwright com porta de depuração, para o Lighthouse
 * se conectar no mesmo navegador (docs/02-TRD.md §3). Na Etapa 4 a sessão
 * do login será colocada neste navegador antes de medir.
 */
export async function abrirNavegador(): Promise<NavegadorDeTeste> {
  const forcado = process.env.RAIOX_NAVEGADOR
  const canais = forcado ? [forcado] : [...CANAIS]
  const falhas: string[] = []
  for (const canal of canais) {
    const porta = await portaLivre()
    try {
      const navegador = await chromium.launch({
        channel: canal, // Chromium completo no modo sem janela novo (o Lighthouse precisa dele)
        headless: true,
        args: [`--remote-debugging-port=${porta}`, '--remote-debugging-address=127.0.0.1'],
      })
      return { navegador, porta, canal, fechar: () => navegador.close() }
    } catch (e) {
      falhas.push(`${canal}: ${String(e).split('\n')[0]}`)
    }
  }
  const erro = new ErroRaioX('navegadorFaltando')
  erro.message += `\n${falhas.join('\n')}`
  throw erro
}
