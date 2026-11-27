import { describe, expect, it } from 'vitest'
import { completarEndereco, ErroCli, lerArgumentos } from '../src/argumentos.js'
import { pastaDaAnalise, pastaDeDados } from '@raiox/nucleo'

describe('lerArgumentos', () => {
  it('sem nada mostra a ajuda; aceita versao e ajuda com apelidos', () => {
    expect(lerArgumentos([]).comando).toBe('ajuda')
    expect(lerArgumentos(['--help']).comando).toBe('ajuda')
    expect(lerArgumentos(['-v']).comando).toBe('versao')
  })

  it('analisar com padrões', () => {
    const p = lerArgumentos(['analisar', 'https://example.com'])
    expect(p).toMatchObject({ comando: 'analisar', enderecos: ['https://example.com'], perfis: ['celular', 'computador'], precisao: false, permitirLocal: false })
    expect(p.json).toBeUndefined()
  })

  it('várias páginas e todas as opções', () => {
    const p = lerArgumentos([
      'analisar', 'https://a.com', 'https://a.com/b', '--perfil', 'celular', '--precisao', '--local', '--bruto',
      '--saida', 'r.html', '--textos=t.md', '--json', 'r.json', '--minimo-desempenho', '90', '--sem-cor', '--sem-ia', '--sou-dono',
    ])
    expect(p).toMatchObject({
      enderecos: ['https://a.com', 'https://a.com/b'], perfis: ['celular'], precisao: true, permitirLocal: true, bruto: true,
      saida: 'r.html', textos: 't.md', json: 'r.json', minimoDesempenho: 90, semCor: true,
    })
  })

  it('--json sem arquivo escreve na tela, mesmo antes do endereço', () => {
    expect(lerArgumentos(['analisar', 'https://a.com', '--json']).json).toBe('-')
    const p = lerArgumentos(['analisar', '--json', 'https://a.com'])
    expect(p.json).toBe('-')
    expect(p.enderecos).toEqual(['https://a.com'])
    expect(lerArgumentos(['analisar', 'https://a.com', '--json', '--precisao']).json).toBe('-')
    // endereço sem protocolo depois de --json continua sendo endereço (só .json é arquivo)
    const q = lerArgumentos(['analisar', '--json', 'meusite.com.br'])
    expect(q.json).toBe('-')
    expect(q.enderecos).toEqual(['https://meusite.com.br'])
  })

  it('login: entrar, descobrir, sessoes e --com-login', () => {
    expect(lerArgumentos(['entrar', 'meusite.com.br', '--sou-dono'])).toMatchObject({ comando: 'entrar', enderecos: ['https://meusite.com.br'], souDono: true })
    expect(lerArgumentos(['descobrir', 'a.com', '--sou-dono', '--limite', '20', '--niveis', '2', '--evitar', 'voz, chamada'])).toMatchObject({
      comando: 'descobrir', limite: 20, niveis: 2, evitar: ['voz', 'chamada'],
    })
    expect(lerArgumentos(['analisar', 'a.com', '--com-login', '--sou-dono', '--paginas', '10'])).toMatchObject({ comLogin: true, paginas: 10 })
    expect(lerArgumentos(['sessoes'])).toMatchObject({ comando: 'sessoes', acaoSessoes: 'listar' })
    expect(lerArgumentos(['sessoes', 'apagar', 'a.com'])).toMatchObject({ acaoSessoes: 'apagar', enderecos: ['https://a.com'] })
  })

  it('erros claros', () => {
    const erro = (args: string[]) => {
      try {
        lerArgumentos(args)
      } catch (e) {
        expect(e).toBeInstanceOf(ErroCli)
        return (e as ErroCli).codigo
      }
      return 'sem erro'
    }
    expect(erro(['medir'])).toBe('comandoDesconhecido')
    expect(erro(['analisar'])).toBe('semEndereco')
    expect(erro(['analisar', 'https://a.com', '--xyz'])).toBe('opcaoDesconhecida')
    expect(erro(['analisar', 'https://a.com', '--perfil', 'tablet'])).toBe('perfilInvalido')
    expect(erro(['analisar', 'https://a.com', '--minimo-desempenho', '120'])).toBe('minimoInvalido')
    expect(erro(['analisar', 'https://a.com', '--saida'])).toBe('faltaValor')
    expect(erro(['analisar', 'https://a.com', '--saida', 'r.pdf'])).toBe('pdfAindaNao')
    // login exige a confirmação --sou-dono (a skill nunca põe sozinha)
    expect(erro(['analisar', 'https://a.com', '--com-login'])).toBe('precisaSouDono')
    expect(erro(['entrar', 'https://a.com'])).toBe('precisaSouDono')
    expect(erro(['descobrir', 'https://a.com'])).toBe('precisaSouDono')
    expect(erro(['entrar', 'a.com', 'b.com', '--sou-dono'])).toBe('umEndereco')
    expect(erro(['sessoes', 'apagar'])).toBe('umEndereco')
    expect(erro(['analisar', 'a.com', '--paginas', '5'])).toBe('paginasSemLogin')
    expect(erro(['analisar', 'a.com', '--com-login', '--sou-dono', '--paginas', '0'])).toBe('numeroInvalido')
    expect(erro(['analisar', 'https://a.com', '--completo'])).toBe('emBreve')
  })
})

describe('pastas', () => {
  it('usa RAIOX_DADOS, depois APPDATA', () => {
    expect(pastaDeDados({ RAIOX_DADOS: 'X:\\dados' })).toBe('X:\\dados')
    expect(pastaDeDados({ APPDATA: '/ap' }).replace(/\\/g, '/')).toBe('/ap/Raio-X')
  })
  it('pasta da análise por site e data', () => {
    const p = pastaDaAnalise('https://meu-site.com.br:8080/x', new Date(2026, 10, 26, 9, 5, 7), { RAIOX_DADOS: '/d' })
    expect(p.replace(/\\/g, '/')).toBe('/d/analises/meu-site.com.br_8080/20261126-090507')
  })
})

describe('completarEndereco', () => {
  it('põe https:// em domínio digitado sem protocolo', () => {
    expect(completarEndereco('server.example.com')).toBe('https://server.example.com')
    expect(completarEndereco('example.com/pagina?x=1')).toBe('https://example.com/pagina?x=1')
    expect(lerArgumentos(['analisar', 'example.com']).enderecos).toEqual(['https://example.com'])
  })
  it('localhost e números ganham http://', () => {
    expect(completarEndereco('localhost:3000')).toBe('http://localhost:3000')
    expect(completarEndereco('127.0.0.1:8080/x')).toBe('http://127.0.0.1:8080/x')
    expect(completarEndereco('192.168.0.10')).toBe('http://192.168.0.10')
    expect(completarEndereco('app.localhost')).toBe('http://app.localhost')
  })
  it('não mexe em endereço com protocolo (o núcleo recusa o que não é http/https)', () => {
    expect(completarEndereco('http://a.com')).toBe('http://a.com')
    expect(completarEndereco('file:///C:/x.html')).toBe('file:///C:/x.html')
    expect(completarEndereco('javascript:alert(1)')).toBe('javascript:alert(1)')
  })
})
