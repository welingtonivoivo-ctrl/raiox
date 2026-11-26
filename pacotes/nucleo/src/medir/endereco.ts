import textos from '@raiox/textos/pt-BR.json' with { type: 'json' }

const NOMES_LOCAIS = new Set(['localhost', '127.0.0.1', '[::1]', '0.0.0.0'])

export class ErroRaioX extends Error {
  constructor(public codigo: keyof typeof textos.erros) {
    super(textos.erros[codigo])
    this.name = 'ErroRaioX'
  }
}

export function ehLocal(host: string): boolean {
  const h = host.toLowerCase()
  if (NOMES_LOCAIS.has(h) || h.endsWith('.localhost')) return true
  // redes internas: 10.x, 192.168.x, 172.16–31.x
  if (/^10\./.test(h) || /^192\.168\./.test(h)) return true
  const m = /^172\.(\d+)\./.exec(h)
  return m !== null && Number(m[1]) >= 16 && Number(m[1]) <= 31
}

/** Confere o endereço digitado (docs/02-TRD.md §11). */
export function conferirEndereco(bruto: string, permitirLocal: boolean): URL {
  let url: URL
  try {
    url = new URL(bruto.trim())
  } catch {
    throw new ErroRaioX('enderecoInvalido')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new ErroRaioX('enderecoInvalido')
  if (!permitirLocal && ehLocal(url.hostname)) throw new ErroRaioX('enderecoLocal')
  return url
}
