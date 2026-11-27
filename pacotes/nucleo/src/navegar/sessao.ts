// Sessão do login guardada criptografada no PC (docs/02-TRD.md §4).
// Arquivo: sessoes\<host>.bin = versão (1 byte) | nonce (12) | tag (16) | dados (AES-256-GCM).
// O host vai como dado autenticado: um .bin renomeado para outro site não abre.
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ErroRaioX } from '../medir/endereco.js'
import { nomeDoHost, pastaDeDados } from '../pastas.js'
import { chaveMestra, escolherCofre, type Cofre } from './cofre.js'

const VERSAO = 1

/** O mesmo formato do storageState do Playwright (cookies, localStorage e IndexedDB). */
export type EstadoDoNavegador = {
  cookies: unknown[]
  origins: unknown[]
}

export type SessaoSalva = {
  versao: 1
  /** Endereço onde a pessoa entrou (usado para conferir se a sessão ainda vale). */
  entrada: string
  salvaEm: string
  estado: EstadoDoNavegador
}

export type EstadoSessao = {
  site: string
  existe: boolean
  salvaEm?: string
  entrada?: string
  /** true/false depois de conferir abrindo o site; ausente se não conferiu. */
  valida?: boolean
}

export type OpcoesSessao = { amb?: NodeJS.ProcessEnv; cofre?: Cofre }

export function caminhoDaSessao(site: string, amb: NodeJS.ProcessEnv = process.env): string {
  return join(pastaDeDados(amb), 'sessoes', `${nomeDoHost(site)}.bin`)
}

export function cifrar(dados: Buffer, chave: Buffer, host: string): Buffer {
  const nonce = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', chave, nonce)
  c.setAAD(Buffer.from(host, 'utf8'))
  const cifrado = Buffer.concat([c.update(dados), c.final()])
  return Buffer.concat([Buffer.from([VERSAO]), nonce, c.getAuthTag(), cifrado])
}

export function decifrar(arquivo: Buffer, chave: Buffer, host: string): Buffer {
  if (arquivo.length < 1 + 12 + 16 || arquivo[0] !== VERSAO) throw new ErroRaioX('sessaoIlegivel')
  const nonce = arquivo.subarray(1, 13)
  const tag = arquivo.subarray(13, 29)
  try {
    const d = createDecipheriv('aes-256-gcm', chave, nonce)
    d.setAAD(Buffer.from(host, 'utf8'))
    d.setAuthTag(tag)
    return Buffer.concat([d.update(arquivo.subarray(29)), d.final()])
  } catch {
    // chave errada, arquivo mexido ou de outro site
    throw new ErroRaioX('sessaoIlegivel')
  }
}

async function chave(op: OpcoesSessao): Promise<Buffer> {
  return chaveMestra(op.cofre ?? (await escolherCofre(op.amb)))
}

export async function salvarSessao(site: string, entrada: string, estado: EstadoDoNavegador, op: OpcoesSessao = {}): Promise<string> {
  const host = nomeDoHost(site)
  const dados: SessaoSalva = { versao: 1, entrada, salvaEm: new Date().toISOString(), estado }
  const caminho = caminhoDaSessao(site, op.amb)
  await mkdir(join(caminho, '..'), { recursive: true })
  await writeFile(caminho, cifrar(Buffer.from(JSON.stringify(dados), 'utf8'), await chave(op), host))
  return caminho
}

/** Lê a sessão do site; null se não existir. */
export async function lerSessao(site: string, op: OpcoesSessao = {}): Promise<SessaoSalva | null> {
  let arquivo: Buffer
  try {
    arquivo = await readFile(caminhoDaSessao(site, op.amb))
  } catch {
    return null
  }
  const texto = decifrar(arquivo, await chave(op), nomeDoHost(site)).toString('utf8')
  return JSON.parse(texto) as SessaoSalva
}

export async function apagarSessao(site: string, op: OpcoesSessao = {}): Promise<boolean> {
  const caminho = caminhoDaSessao(site, op.amb)
  try {
    await stat(caminho)
  } catch {
    return false
  }
  await rm(caminho, { force: true })
  return true
}

/** Sessões guardadas (pelo nome do arquivo; não precisa decifrar). */
export async function listarSessoes(amb: NodeJS.ProcessEnv = process.env): Promise<{ host: string; alteradaEm: string }[]> {
  const pasta = join(pastaDeDados(amb), 'sessoes')
  let nomes: string[]
  try {
    nomes = await readdir(pasta)
  } catch {
    return []
  }
  const lista: { host: string; alteradaEm: string }[] = []
  for (const n of nomes.filter((x) => x.endsWith('.bin')).sort()) {
    const s = await stat(join(pasta, n))
    lista.push({ host: n.slice(0, -4), alteradaEm: s.mtime.toISOString() })
  }
  return lista
}
