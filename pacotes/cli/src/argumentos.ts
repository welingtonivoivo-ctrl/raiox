// Leitura das opções do comando `raiox` (docs/03-FLUXO.md §6 e docs/05-BACKEND.md §9).
import textos from '@raiox/textos/pt-BR.json' with { type: 'json' }
import { preencher, type Perfil } from '@raiox/nucleo'

export type Comando = 'analisar' | 'entrar' | 'descobrir' | 'sessoes' | 'ajuda' | 'versao'
export type AcaoSessoes = 'listar' | 'conferir' | 'apagar'

export type PedidoCli = {
  comando: Comando
  enderecos: string[]
  perfis: Perfil[]
  precisao: boolean
  permitirLocal: boolean
  bruto: boolean
  /** Arquivo do JSON; "-" = escrever o resultado na tela. */
  json?: string
  saida?: string
  textos?: string
  minimoDesempenho?: number
  semCor: boolean
  /** Confirmação "este site é meu ou tenho autorização" (obrigatória para login). */
  souDono: boolean
  comLogin: boolean
  /** Com --com-login: descobrir e medir até N páginas fechadas (além das digitadas). */
  paginas?: number
  /** Descoberta: máximo de páginas e de níveis. */
  limite?: number
  niveis?: number
  /** Palavras perigosas a mais (não abrir links com elas). */
  evitar: string[]
  acaoSessoes: AcaoSessoes
}

type CodigoErro = keyof typeof textos.cli.erros

export class ErroCli extends Error {
  constructor(
    public codigo: CodigoErro,
    valores: Record<string, string | number> = {},
  ) {
    super(preencher(textos.cli.erros[codigo], valores))
    this.name = 'ErroCli'
  }
}

/** Opções que já estão no plano, mas chegam em etapas futuras. */
const FUTURAS: Record<string, number> = {
  '--completo': 6,
  '--repo': 6,
  '--ia': 7,
}

/** Aceita sem efeito por enquanto (a skill e os documentos já usam). */
const SEM_EFEITO = new Set(['--sem-ia'])

const COM_VALOR = new Set(['--perfil', '--saida', '--textos', '--minimo-desempenho', '--paginas', '--limite', '--niveis', '--evitar'])

const COMANDOS: Record<string, Comando> = {
  analisar: 'analisar',
  entrar: 'entrar',
  descobrir: 'descobrir',
  sessoes: 'sessoes',
  'sessões': 'sessoes',
  ajuda: 'ajuda',
  '--ajuda': 'ajuda',
  '-h': 'ajuda',
  help: 'ajuda',
  '--help': 'ajuda',
  versao: 'versao',
  '--versao': 'versao',
  '-v': 'versao',
  '--version': 'versao',
}

function perfisDe(valor: string): Perfil[] {
  if (valor === 'ambos') return ['celular', 'computador']
  if (valor === 'celular' || valor === 'computador') return [valor]
  throw new ErroCli('perfilInvalido', { valor })
}

function inteiro(opcao: string, v: string, min: number, max: number): number {
  const n = Number(v)
  if (!Number.isInteger(n) || n < min || n > max) throw new ErroCli('numeroInvalido', { opcao, min, max })
  return n
}

/**
 * "meusite.com.br" → "https://meusite.com.br" (como se digita no navegador).
 * localhost e endereços numéricos ganham http://, porque projetos rodando no PC quase nunca têm https.
 * Endereço com protocolo fica como está (o núcleo recusa o que não for http/https).
 */
export function completarEndereco(texto: string): string {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(texto) || /^[a-z]+:/i.test(texto.replace(/^localhost:/i, ''))) return texto
  const local = /^(localhost|127\.|\[?::1|\d{1,3}(\.\d{1,3}){3})/i.test(texto) || /\.localhost(:|\/|$)/i.test(texto)
  return `${local ? 'http' : 'https'}://${texto}`
}

export function lerArgumentos(args: string[]): PedidoCli {
  const pedido: PedidoCli = {
    comando: 'ajuda',
    enderecos: [],
    perfis: ['celular', 'computador'],
    precisao: false,
    permitirLocal: false,
    bruto: false,
    semCor: false,
    souDono: false,
    comLogin: false,
    evitar: [],
    acaoSessoes: 'listar',
  }
  if (!args.length) return pedido
  const [primeiro, ...resto] = args as [string, ...string[]]
  const comando = COMANDOS[primeiro]
  if (!comando) throw new ErroCli('comandoDesconhecido', { comando: primeiro })
  pedido.comando = comando
  if (comando === 'ajuda' || comando === 'versao') return pedido

  let inicio = 0
  if (comando === 'sessoes' && (resto[0] === 'apagar' || resto[0] === 'conferir' || resto[0] === 'listar')) {
    pedido.acaoSessoes = resto[0]
    inicio = 1
  }

  for (let i = inicio; i < resto.length; i++) {
    const bruto = resto[i]!
    // aceita --opcao=valor e --opcao valor
    const igual = bruto.startsWith('--') ? bruto.indexOf('=') : -1
    const opcao = igual > 0 ? bruto.slice(0, igual) : bruto
    const valorJunto = igual > 0 ? bruto.slice(igual + 1) : undefined
    const proximoValor = () => {
      if (valorJunto !== undefined) return valorJunto
      const v = resto[i + 1]
      if (v === undefined || v.startsWith('--')) throw new ErroCli('faltaValor', { opcao })
      i++
      return v
    }

    if (!opcao.startsWith('-')) {
      pedido.enderecos.push(completarEndereco(opcao))
      continue
    }
    if (opcao in FUTURAS) throw new ErroCli('emBreve', { opcao, etapa: FUTURAS[opcao]! })
    if (SEM_EFEITO.has(opcao)) continue
    switch (opcao) {
      case '--precisao':
        pedido.precisao = true
        break
      case '--local':
        pedido.permitirLocal = true
        break
      case '--bruto':
        pedido.bruto = true
        break
      case '--sem-cor':
        pedido.semCor = true
        break
      case '--sou-dono':
        pedido.souDono = true
        break
      case '--com-login':
        pedido.comLogin = true
        break
      case '--json': {
        // valor opcional: só um nome terminado em .json é arquivo; sem ele, o resultado vai para a tela
        if (valorJunto !== undefined) pedido.json = valorJunto || '-'
        else {
          const v = resto[i + 1]
          if (v !== undefined && /\.json$/i.test(v)) {
            pedido.json = v
            i++
          } else pedido.json = '-'
        }
        break
      }
      default: {
        if (!COM_VALOR.has(opcao)) throw new ErroCli('opcaoDesconhecida', { opcao })
        const v = proximoValor()
        if (opcao === '--perfil') pedido.perfis = perfisDe(v)
        else if (opcao === '--saida') {
          if (/\.pdf$/i.test(v)) throw new ErroCli('pdfAindaNao')
          pedido.saida = v
        } else if (opcao === '--textos') pedido.textos = v
        else if (opcao === '--paginas') pedido.paginas = inteiro(opcao, v, 1, 200)
        else if (opcao === '--limite') pedido.limite = inteiro(opcao, v, 1, 200)
        else if (opcao === '--niveis') pedido.niveis = inteiro(opcao, v, 1, 5)
        else if (opcao === '--evitar') pedido.evitar.push(...v.split(',').map((x) => x.trim()).filter(Boolean))
        else {
          const n = Number(v.replace(',', '.'))
          if (!Number.isFinite(n) || n < 0 || n > 100) throw new ErroCli('minimoInvalido')
          pedido.minimoDesempenho = n
        }
      }
    }
  }

  if (pedido.comando === 'sessoes') {
    if (pedido.acaoSessoes !== 'listar' && pedido.enderecos.length !== 1) throw new ErroCli('umEndereco', { comando: `sessoes ${pedido.acaoSessoes}` })
    return pedido
  }
  if (!pedido.enderecos.length) throw new ErroCli('semEndereco')
  if ((pedido.comando === 'entrar' || pedido.comando === 'descobrir') && pedido.enderecos.length !== 1) {
    throw new ErroCli('umEndereco', { comando: pedido.comando })
  }
  if (pedido.paginas !== undefined && !pedido.comLogin) throw new ErroCli('paginasSemLogin')
  const precisaDono = pedido.comando === 'entrar' || pedido.comando === 'descobrir' || pedido.comLogin
  if (precisaDono && !pedido.souDono) throw new ErroCli('precisaSouDono')
  return pedido
}
