// Teste de verdade com o site de exemplo com login (exemplos/login/servidor.mjs).
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  abrirNavegador,
  caiuNoLogin,
  classificarLink,
  conferirSessao,
  descobrirPaginas,
  entrar,
  ErroRaioX,
  lerSessao,
  medir,
  motivoParaPular,
  palavrasPerigosas,
  Registro,
  type EstadoDoNavegador,
} from '../src/index.js'
// @ts-expect-error módulo de exemplo em JavaScript, sem tipos
import { criarSiteComLogin } from '../../../exemplos/login/servidor.mjs'

describe('palavras perigosas e tela de entrada', () => {
  const p = palavrasPerigosas()
  const pular = (u: string, texto = '') => motivoParaPular(new URL(u), texto, p)
  it('pula pelo caminho, pela consulta e pelo texto do link, sem acento', () => {
    expect(pular('https://a.com/sair')).toMatch(/perigosa/)
    expect(pular('https://a.com/conta/excluir')).toMatch(/excluir/)
    expect(pular('https://a.com/loja?acao=comprar')).toMatch(/comprar/)
    expect(pular('https://a.com/ajuda', 'Cancelar assinatura')).toMatch(/cancelar/)
    expect(pular('https://a.com/x', 'Sair da conta')).toMatch(/sair/)
    expect(pular('https://a.com/auth/sign-out')).toMatch(/sign-out/)
    expect(pular('https://a.com/manual.pdf')).toMatch(/\.pdf/)
    // abrir um convite pode entrar no servidor/grupo sozinho
    expect(pular('https://a.com/convite/AbC123')).toMatch(/convite/)
    expect(pular('https://a.com/invite/x')).toMatch(/invite/)
  })
  it('não confunde palavra dentro de outra', () => {
    expect(pular('https://a.com/ensaio')).toBeNull()
    expect(pular('https://a.com/perfil', 'Meu perfil')).toBeNull()
    expect(pular('https://a.com/cancelamentos-antigos')).toBeNull()
  })
  it('palavras extras', () => {
    expect(motivoParaPular(new URL('https://a.com/voz/sala-1'), '', palavrasPerigosas(['voz']))).toMatch(/voz/)
  })
  it('protocolos, download e fora do site', () => {
    const o = 'https://a.com'
    expect(classificarLink({ href: 'mailto:x@a.com', texto: '', download: false }, o, p)).toMatchObject({ motivo: 'protocolo: mailto:' })
    expect(classificarLink({ href: 'javascript:void(0)', texto: '', download: false }, o, p)).toMatchObject({ motivo: 'protocolo: javascript:' })
    expect(classificarLink({ href: 'https://a.com/baixar', texto: '', download: true }, o, p)).toMatchObject({ motivo: 'download' })
    expect(classificarLink({ href: 'https://b.com/x', texto: '', download: false }, o, p)).toBeNull()
    expect(classificarLink({ href: 'https://a.com/perfil#topo', texto: '', download: false }, o, p)).toEqual({ endereco: 'https://a.com/perfil' })
  })
  it('caiu na tela de entrada', () => {
    expect(caiuNoLogin('https://a.com/painel', 'https://a.com/entrar', false)).toBe(true)
    expect(caiuNoLogin('https://a.com/painel', 'https://a.com/login?volta=/painel', false)).toBe(true)
    expect(caiuNoLogin('https://a.com/painel', 'https://a.com/painel', true)).toBe(true)
    expect(caiuNoLogin('https://a.com/painel', 'https://a.com/painel/', false)).toBe(false)
    expect(caiuNoLogin('https://a.com/entrar', 'https://a.com/entrar', true)).toBe(false)
  })
})

describe('login no site de exemplo', () => {
  const site = criarSiteComLogin()
  const pasta = mkdtempSync(join(tmpdir(), 'raiox-login-'))
  const amb = { RAIOX_DADOS: pasta, RAIOX_COFRE: 'memoria' }
  let base = ''
  let sessao: EstadoDoNavegador

  beforeAll(async () => {
    base = await site.iniciar()
  })
  afterAll(async () => {
    await site.fechar()
    rmSync(pasta, { recursive: true, force: true })
  })

  it('entrar: salva a sessão (sem a senha) e confere abrindo o painel', async () => {
    const r = await entrar(`${base}/painel`, {
      amb,
      automatico: async (pagina) => {
        // a "pessoa" entra: só neste teste o Raio-X preenche, nunca no comando
        await pagina.fill('input[type=password]', 'senha-de-teste')
        await Promise.all([pagina.waitForURL('**/painel'), pagina.click('button')])
        await pagina.evaluate(() => localStorage.setItem('token_exemplo', 'ok'))
      },
    })
    expect(r).toMatchObject({ existe: true, valida: true })
    const salva = await lerSessao(base, { amb })
    expect(salva?.estado.cookies).toHaveLength(1)
    expect(JSON.stringify(salva)).not.toContain('senha-de-teste')
    sessao = salva!.estado
    expect((await conferirSessao(base, { amb })).valida).toBe(true)
  })

  it('entrar sem fazer login: avisa que nada foi confirmado', async () => {
    await expect(entrar(`${base}/painel`, { amb, automatico: async () => {} })).rejects.toThrow(ErroRaioX)
  })

  it('descobre as páginas sem abrir nada perigoso', async () => {
    const nav = await abrirNavegador({ sessao })
    const registro = new Registro()
    try {
      const antes = site.abertos.length
      const r = await descobrirPaginas(nav.contexto, `${base}/painel`, {}, registro)
      const achadas = r.paginas.map((p) => new URL(p.endereco).pathname + new URL(p.endereco).search)
      expect(achadas).toEqual(['/painel', '/perfil', '/config', '/local'])
      const motivos = Object.fromEntries(
        r.puladas.filter((p) => p.endereco.startsWith('http')).map((p) => [new URL(p.endereco).pathname + new URL(p.endereco).search, p.motivo]),
      )
      expect(motivos['/sair']).toMatch(/perigosa/)
      expect(motivos['/conta/excluir']).toMatch(/perigosa/)
      expect(motivos['/checkout?x=1']).toMatch(/perigosa/)
      expect(motivos['/loja?acao=comprar']).toMatch(/perigosa/)
      expect(motivos['/ajuda']).toMatch(/cancelar/)
      expect(motivos['/arquivo.pdf']).toMatch(/\.pdf/)
      expect(motivos['/baixar']).toBe('download')
      // o servidor confirma: nenhum endereço perigoso foi pedido
      const pedidos = site.abertos.slice(antes).join(' ')
      for (const perigoso of ['/sair', '/excluir', '/checkout', 'comprar', '/ajuda', '.pdf', '/baixar']) expect(pedidos).not.toContain(perigoso)
      // e o registro do Raio-X bate com o que foi aberto
      expect(registro.entradas.every((e) => e.motivo === 'descoberta')).toBe(true)
      expect(registro.entradas.map((e) => new URL(e.endereco).pathname)).toEqual(['/painel', '/perfil', '/config', '/local'])
      // no máximo 1 página por segundo
      const tempos = registro.entradas.map((e) => Date.parse(e.quando))
      for (let i = 1; i < tempos.length; i++) expect(tempos[i]! - tempos[i - 1]!).toBeGreaterThanOrEqual(990)
    } finally {
      await nav.fechar()
    }
  })

  it('sem sessão a descoberta avisa que a sessão venceu', async () => {
    const nav = await abrirNavegador()
    try {
      await expect(descobrirPaginas(nav.contexto, `${base}/painel`)).rejects.toThrow(/venceu/)
    } finally {
      await nav.fechar()
    }
  })

  it('mede páginas fechadas logado (a medida é da página, não da tela de entrada)', async () => {
    const r = await medir([`${base}/perfil`, `${base}/local`], { permitirLocal: true, perfis: ['computador'], sessao })
    for (const p of r.paginas) {
      expect(p.erro).toBeUndefined()
      expect(p.comLogin).toBe(true)
      expect(p.perfis.computador?.notas.acessibilidade).toBeGreaterThan(0)
    }
    expect(r.registro?.map((e) => `${e.motivo} ${new URL(e.endereco).pathname}`)).toEqual([
      'conferencia /perfil', 'medicao /perfil', 'conferencia /local', 'medicao /local',
    ])
  })

  it('sessão vencida: para e não mede a tela de entrada', async () => {
    const r = await medir([`${base}/perfil`, `${base}/config`], { permitirLocal: true, perfis: ['computador'], sessao: { cookies: [], origins: [] } })
    expect(r.paginas.every((p) => p.erro && /venceu/.test(p.erro))).toBe(true)
    expect(r.paginas.every((p) => Object.keys(p.perfis).length === 0)).toBe(true)
    expect(r.avisos.join(' ')).toMatch(/venceu/)
    // só conferiu a primeira; a segunda nem foi aberta
    expect(r.registro?.map((e) => new URL(e.endereco).pathname)).toEqual(['/perfil'])
  })
})
