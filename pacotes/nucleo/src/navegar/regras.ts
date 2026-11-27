// Regras de navegação segura (docs/02-TRD.md §4): o que é tela de entrada, o que é perigoso abrir.
import textos from '@raiox/textos/pt-BR.json' with { type: 'json' }

/** Minúsculas e sem acento, para comparar palavras. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** A palavra aparece inteira (separada por algo que não é letra ou número)? Aceita palavras com "-". */
function temPalavra(texto: string, palavra: string): boolean {
  const p = normalizar(palavra).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z0-9])${p}($|[^a-z0-9])`).test(texto)
}

/** Lista de palavras perigosas: a padrão dos textos + as extras pedidas. */
export function palavrasPerigosas(extras: string[] = []): string[] {
  return [...textos.navegacao.palavrasPerigosas, ...extras.map((x) => x.trim()).filter(Boolean)]
}

/**
 * Motivo para não abrir o link, ou null se pode abrir.
 * Confere o caminho, a consulta (?…) e o texto do link.
 */
export function motivoParaPular(url: URL, textoDoLink: string, perigosas: string[]): string | null {
  const caminho = normalizar(decodeURIComponentSeguro(url.pathname))
  const consulta = normalizar(decodeURIComponentSeguro(url.search))
  const texto = normalizar(textoDoLink)
  for (const palavra of perigosas) {
    if (temPalavra(caminho, palavra) || temPalavra(consulta, palavra) || temPalavra(texto, palavra)) return `perigosa: ${palavra}`
  }
  const ext = /\.([a-z0-9]{1,5})$/i.exec(url.pathname)?.[1]?.toLowerCase()
  if (ext && textos.navegacao.extensoesQueNaoSaoPaginas.includes(ext)) return `arquivo: .${ext}`
  return null
}

function decodeURIComponentSeguro(t: string): string {
  try {
    return decodeURIComponent(t)
  } catch {
    return t
  }
}

/** O endereço parece de tela de entrada (/entrar, /login, /auth/…)? */
export function enderecoDeLogin(endereco: string): boolean {
  let caminho: string
  try {
    caminho = normalizar(new URL(endereco).pathname)
  } catch {
    return false
  }
  return textos.navegacao.palavrasDeLogin.some((p) => temPalavra(caminho, p))
}

/** Mesmo endereço, ignorando a âncora (#) e a barra no fim. */
export function mesmoEndereco(a: string, b: string): boolean {
  const limpar = (x: string) => {
    try {
      const u = new URL(x)
      u.hash = ''
      return u.href.replace(/\/$/, '')
    } catch {
      return x
    }
  }
  return limpar(a) === limpar(b)
}

/**
 * Caiu na tela de entrada? Pediu uma página e o site mandou para um endereço de login,
 * ou a página aberta tem campo de senha visível (quem pediu não era a própria tela de entrada).
 */
export function caiuNoLogin(pedido: string, final: string, temCampoDeSenha: boolean): boolean {
  if (enderecoDeLogin(pedido)) return false
  if (!mesmoEndereco(pedido, final) && enderecoDeLogin(final)) return true
  return temCampoDeSenha
}
