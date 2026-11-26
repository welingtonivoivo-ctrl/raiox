// Limpeza de valores que parecem segredo antes de gravar trechos e endereços
// (docs/05-BACKEND.md §3: "trecho passa por limpeza … cortado em 300 caracteres").

export const MASCARA = '••••'
export const TAMANHO_MAXIMO_TRECHO = 300

/** Parâmetros de endereço que costumam levar segredo. */
const PARAMETROS = /([?&#;](?:token|access_token|refresh_token|id_token|key|apikey|api_key|auth|authorization|senha|password|pass|secret|client_secret|sig|signature|code|session|sessionid|jwt)=)[^&#\s"'<>]+/gi

/** Começos conhecidos de chaves (OpenAI, Stripe, GitHub, Slack, AWS, Google, SendGrid…). */
const PREFIXOS = /\b(?:sk-(?:proj-|ant-)?|sk_(?:live|test)_|rk_(?:live|test)_|pk_live_|ghp_|gho_|ghs_|ghu_|github_pat_|xox[abprs]-|AKIA|ASIA|AIza|SG\.)[A-Za-z0-9_\-.]{10,}/g

/** Token JWT (três partes em base64). */
const JWT = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g

/** Atributos/variáveis com nome de segredo: senha="…", apiKey: '…', token=…. */
const ATRIBUICOES = /((?:senha|password|passwd|secret|token|api[_-]?key|apikey|client[_-]?secret|private[_-]?key)["']?\s*[:=]\s*["']?)[^"'\s,;}<>]{4,}/gi

/**
 * Sequências longas e aleatórias (32+ letras e números misturados, sem "-" e "_"
 * para não apagar nomes de classe como "landing-module__6d9mHW__heroText").
 */
const ALEATORIO = /\b(?=[A-Za-z0-9+/]*\d)(?=[A-Za-z0-9+/]*[A-Za-z])[A-Za-z0-9+/]{32,}={0,2}/g

/** Endereço: tira só valores de parâmetros sensíveis e chaves conhecidas (não mexe no caminho). */
export function limparEndereco(endereco: string): string {
  return endereco.replace(PARAMETROS, `$1${MASCARA}`).replace(PREFIXOS, MASCARA).replace(JWT, MASCARA)
}

/** Trecho de HTML/código: tira tudo que parece segredo e corta no tamanho máximo. */
export function limparTrecho(trecho: string): string {
  let t = trecho
    .replace(PARAMETROS, `$1${MASCARA}`)
    .replace(JWT, MASCARA)
    .replace(PREFIXOS, MASCARA)
    .replace(ATRIBUICOES, `$1${MASCARA}`)
    .replace(ALEATORIO, MASCARA)
  if (t.length > TAMANHO_MAXIMO_TRECHO) t = `${t.slice(0, TAMANHO_MAXIMO_TRECHO - 1)}…`
  return t
}
