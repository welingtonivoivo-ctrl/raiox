import { mkdtempSync, readFileSync, renameSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import {
  apagarSessao,
  caminhoDaSessao,
  chaveMestra,
  cifrar,
  cofreNaMemoria,
  decifrar,
  ErroRaioX,
  escolherCofre,
  lerSessao,
  listarSessoes,
  salvarSessao,
} from '../src/index.js'

const pasta = mkdtempSync(join(tmpdir(), 'raiox-sessao-'))
const amb = { RAIOX_DADOS: pasta, RAIOX_COFRE: 'memoria' }
afterAll(() => rmSync(pasta, { recursive: true, force: true }))

const estado = {
  cookies: [{ name: 'sessao', value: 'valor-muito-secreto-987', domain: 'example.com', path: '/' }],
  origins: [{ origin: 'https://example.com', localStorage: [{ name: 'token', value: 'outro-segredo-654' }] }],
}

describe('cofre', () => {
  it('os testes usam o cofre na memória (nunca o do sistema)', async () => {
    expect(process.env.RAIOX_COFRE).toBe('memoria')
    const c = await escolherCofre(amb)
    expect(c.ler === undefined).toBe(false)
  })
  it('cria a chave mestra na primeira vez e devolve a mesma depois', () => {
    const c = cofreNaMemoria()
    const a = chaveMestra(c)
    expect(a).toHaveLength(32)
    expect(chaveMestra(c).equals(a)).toBe(true)
  })
  it('não sobrescreve conteúdo estranho no cofre', () => {
    const c = cofreNaMemoria()
    c.gravar('curto')
    expect(() => chaveMestra(c)).toThrow(ErroRaioX)
    expect(c.ler()).toBe('curto')
  })
})

describe('criptografia da sessão', () => {
  const chave = Buffer.alloc(32, 7)
  it('volta igual com a mesma chave e o mesmo site', () => {
    const c = cifrar(Buffer.from('olá'), chave, 'example.com')
    expect(decifrar(c, chave, 'example.com').toString()).toBe('olá')
  })
  it('nonce novo a cada gravação', () => {
    expect(cifrar(Buffer.from('x'), chave, 'a').equals(cifrar(Buffer.from('x'), chave, 'a'))).toBe(false)
  })
  it('outra chave, outro site ou arquivo mexido: erro', () => {
    const c = cifrar(Buffer.from('olá'), chave, 'example.com')
    expect(() => decifrar(c, Buffer.alloc(32, 8), 'example.com')).toThrow(ErroRaioX)
    expect(() => decifrar(c, chave, 'outro.com')).toThrow(ErroRaioX)
    const mexido = Buffer.from(c)
    mexido[mexido.length - 1]! ^= 1
    expect(() => decifrar(mexido, chave, 'example.com')).toThrow(ErroRaioX)
  })
})

describe('sessão salva', () => {
  it('grava, lê, lista e apaga', async () => {
    const arquivo = await salvarSessao('https://example.com/painel', 'https://example.com/painel', estado, { amb })
    expect(arquivo).toBe(caminhoDaSessao('https://example.com', amb))
    // o arquivo não tem nada legível: nem cookie, nem token, nem o nome do site
    const bruto = readFileSync(arquivo).toString('latin1')
    for (const t of ['valor-muito-secreto-987', 'outro-segredo-654', 'sessao', 'example.com']) expect(bruto).not.toContain(t)
    const lida = await lerSessao('https://example.com/qualquer', { amb })
    expect(lida?.estado).toEqual(estado)
    expect(lida?.entrada).toBe('https://example.com/painel')
    expect((await listarSessoes(amb)).map((s) => s.host)).toEqual(['example.com'])
    expect(await apagarSessao('https://example.com', { amb })).toBe(true)
    expect(await lerSessao('https://example.com', { amb })).toBeNull()
    expect(await apagarSessao('https://example.com', { amb })).toBe(false)
  })
  it('arquivo renomeado para outro site não abre', async () => {
    const arquivo = await salvarSessao('https://a.example.com', 'https://a.example.com', estado, { amb })
    renameSync(arquivo, caminhoDaSessao('https://b.example.com', amb))
    await expect(lerSessao('https://b.example.com', { amb })).rejects.toThrow(ErroRaioX)
  })
})
