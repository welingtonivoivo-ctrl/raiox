// Leitura das opções do comando `raiox` (docs/03-FLUXO.md §6 e docs/05-BACKEND.md §9).
import textos from '@raiox/textos/pt-BR.json' with { type: 'json' }
import { preencher, type Perfil } from '@raiox/nucleo'

export type Comando = 'analisar' | 'ajuda' | 'versao'

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

/** Opções e comandos que já estão no plano, mas chegam em etapas futuras. */
const FUTURAS: Record<string, number> = {
  '--com-login': 4,
  '--paginas': 4,
  '--completo': 6,
  '--repo': 6,
  '--ia': 7,
  entrar: 4,
  sessoes: 4,
}

/** Aceitas sem efeito por enquanto (a skill e os documentos já usam). */
const SEM_EFEITO = new Set(['--sem-ia', '--sou-dono'])

const COM_VALOR = new Set(['--perfil', '--saida', '--textos', '--minimo-desempenho'])

const COMANDOS: Record<string, Comando> = {
  analisar: 'analisar',
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
  }
  if (!args.length) return pedido
  const [primeiro, ...resto] = args as [string, ...string[]]
  if (primeiro in FUTURAS) throw new ErroCli('emBreve', { opcao: `raiox ${primeiro}`, etapa: FUTURAS[primeiro]! })
  const comando = COMANDOS[primeiro]
  if (!comando) throw new ErroCli('comandoDesconhecido', { comando: primeiro })
  pedido.comando = comando
  if (comando !== 'analisar') return pedido

  for (let i = 0; i < resto.length; i++) {
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
      case '--json': {
        // valor opcional: sem arquivo (ou seguido de endereço/opção) = escrever na tela
        if (valorJunto !== undefined) pedido.json = valorJunto || '-'
        else {
          const v = resto[i + 1]
          if (v !== undefined && !v.startsWith('-') && !/^https?:\/\//i.test(v)) {
            pedido.json = v
            i++
          } else pedido.json = '-'
        }
        break
      }
      default:
        if (!COM_VALOR.has(opcao)) throw new ErroCli('opcaoDesconhecida', { opcao })
        {
          const v = proximoValor()
          if (opcao === '--perfil') pedido.perfis = perfisDe(v)
          else if (opcao === '--saida') {
            if (/\.pdf$/i.test(v)) throw new ErroCli('pdfAindaNao')
            pedido.saida = v
          } else if (opcao === '--textos') pedido.textos = v
          else {
            const n = Number(v.replace(',', '.'))
            if (!Number.isFinite(n) || n < 0 || n > 100) throw new ErroCli('minimoInvalido')
            pedido.minimoDesempenho = n
          }
        }
    }
  }
  if (!pedido.enderecos.length) throw new ErroCli('semEndereco')
  return pedido
}
