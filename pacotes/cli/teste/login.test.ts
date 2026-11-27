// O comando com login, contra o site de exemplo (a sessão é colocada direto, sem janela).
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Writable } from 'node:stream'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { salvarSessao, type ResultadoMedicao } from '@raiox/nucleo'
import { principal } from '../src/principal.js'
// @ts-expect-error módulo de exemplo em JavaScript, sem tipos
import { criarSiteComLogin } from '../../../exemplos/login/servidor.mjs'

const site = criarSiteComLogin()
const pasta = mkdtempSync(join(tmpdir(), 'raiox-cli-login-'))
const amb = { ...process.env, RAIOX_DADOS: join(pasta, 'dados'), RAIOX_COFRE: 'memoria' }
let base = ''

function rodar(args: string[]) {
  let out = ''
  let err = ''
  const w = (f: (t: string) => void) => new Writable({ write: (p, _c, ok) => (f(String(p)), ok()) })
  return principal(args, { out: w((t) => (out += t)), err: w((t) => (err += t)), amb, pasta }).then((codigo) => ({ codigo, out, err }))
}

beforeAll(async () => {
  base = await site.iniciar()
})
afterAll(async () => {
  await site.fechar()
  rmSync(pasta, { recursive: true, force: true })
})

describe('raiox com login', () => {
  it('sem sessão: avisa para entrar primeiro', async () => {
    const r = await rodar(['analisar', `${base}/perfil`, '--local', '--com-login', '--sou-dono'])
    expect(r.codigo).toBe(1)
    expect(r.err).toContain('raiox entrar')
  })

  it('sessoes lista e apaga', async () => {
    await salvarSessao(base, `${base}/painel`, { cookies: [], origins: [] }, { amb })
    expect((await rodar(['sessoes'])).out).toContain('127.0.0.1_')
    expect((await rodar(['sessoes', 'apagar', base, '--local'])).out).toContain('apagada')
    expect((await rodar(['sessoes'])).out).toContain('Nenhuma')
  })

  it('descobrir lista as páginas e o que pulou, sem abrir nada perigoso', async () => {
    await salvarSessao(base, `${base}/painel`, { cookies: [{ name: site.cookie.nome, value: site.cookie.valor, domain: '127.0.0.1', path: '/', expires: -1, httpOnly: true, secure: false, sameSite: 'Lax' }], origins: [] }, { amb })
    const antes = site.abertos.length
    const r = await rodar(['descobrir', `${base}/painel`, '--local', '--sou-dono', '--evitar', 'config'])
    expect(r.codigo).toBe(0)
    expect(r.out).toContain(`${base}/perfil`)
    expect(r.out).toMatch(/\/config\s+— perigosa: config/)
    expect(r.out).toMatch(/\/sair\s+— perigosa: sair/)
    const pedidos = site.abertos.slice(antes).join(' ')
    for (const x of ['/sair', '/excluir', '/checkout', '/config']) expect(pedidos).not.toContain(x)
  })

  it('analisar --com-login --paginas: descobre e mede logado, com registro', async () => {
    const r = await rodar(['analisar', `${base}/painel`, '--local', '--com-login', '--sou-dono', '--paginas', '2', '--perfil', 'computador', '--json'])
    expect(r.codigo).toBe(0)
    const res = JSON.parse(r.out) as ResultadoMedicao
    expect(res.paginas.map((p) => new URL(p.endereco).pathname)).toEqual(['/painel', '/perfil'])
    expect(res.paginas.every((p) => p.comLogin && !p.erro)).toBe(true)
    expect(res.registro?.some((e) => e.motivo === 'descoberta')).toBe(true)
    expect(res.registro?.some((e) => e.motivo === 'medicao')).toBe(true)
    expect(res.puladas?.some((p) => /sair/.test(p.motivo))).toBe(true)
    expect(r.err).toContain('Endereços abertos nesta análise')
  })
})
