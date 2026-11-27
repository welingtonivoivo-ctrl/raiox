// Login feito na mão pela pessoa numa janela visível (docs/02-TRD.md §4).
// A senha nunca passa pelo Raio-X: só a sessão (cookies, localStorage, IndexedDB) é guardada, criptografada.
import { ErroRaioX } from '../medir/endereco.js'
import { abrirNavegador } from '../medir/navegador.js'
import { abrir } from './descobrir.js'
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
  /** Só para testes: faz o login sozinho na janela (nunca usado pelo comando). */
  automatico?: (pagina: import('playwright-core').Page) => Promise<void>
}

const tem = (e: EstadoDoNavegador) => e.cookies.length > 0 || e.origins.length > 0

/**
 * Abre a janela no endereço, espera a pessoa entrar, salva a sessão e confere
 * abrindo o endereço de novo (sem janela) para ver se não volta à tela de entrada.
 */
export async function entrar(endereco: string, op: OpcoesEntrar = {}): Promise<EstadoSessao> {
  const nav = await abrirNavegador({ visivel: !op.automatico })
  let ultimo: EstadoDoNavegador = { cookies: [], origins: [] }
  const fotografar = async () => {
    try {
      ultimo = (await nav.contexto.storageState({ indexedDB: true })) as EstadoDoNavegador
    } catch {
      // janela fechando: fica a última foto
    }
  }
  try {
    const pagina = nav.contexto.pages()[0] ?? (await nav.contexto.newPage())
    // guarda a sessão a cada página carregada e de tempos em tempos (a última foto vale se a janela fechar)
    nav.contexto.on('page', (p) => p.on('load', () => void fotografar()))
    pagina.on('load', () => void fotografar())
    const relogio = setInterval(() => void fotografar(), 2_000)
    try {
      await pagina.goto(endereco, { waitUntil: 'domcontentloaded', timeout: 60_000 })
      op.aoAndar?.('janela aberta')
      const fechou = new Promise<void>((ok) => {
        nav.contexto.on('close', () => ok())
        const conferir = () => {
          if (nav.contexto.pages().length === 0) ok()
        }
        nav.contexto.on('page', (p) => p.on('close', conferir))
        pagina.on('close', conferir)
      })
      if (op.automatico) await op.automatico(pagina)
      else await Promise.race([fechou, op.jaEntrei ?? new Promise<void>(() => {})])
      await fotografar()
    } finally {
      clearInterval(relogio)
    }
  } finally {
    await nav.fechar()
  }
  if (!tem(ultimo)) throw new ErroRaioX('nadaSalvo')
  const conferido = await conferirComEstado(endereco, ultimo, op)
  if (!conferido) throw new ErroRaioX('entradaNaoConfirmada')
  await salvarSessao(endereco, endereco, ultimo, op)
  return { site: endereco, existe: true, entrada: endereco, salvaEm: new Date().toISOString(), valida: true }
}

/** Abre o endereço sem janela, com a sessão, e diz se continua logado. */
async function conferirComEstado(endereco: string, estado: EstadoDoNavegador, _op: OpcoesSessao, registro = new Registro()): Promise<boolean> {
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
  const valida = await conferirComEstado(s.entrada, s.estado, op)
  return { site, existe: true, entrada: s.entrada, salvaEm: s.salvaEm, valida }
}

