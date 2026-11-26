import { describe, expect, it } from 'vitest'
import type { Result as RelatorioLighthouse } from 'lighthouse'
import {
  juntarAjustes,
  LIMITE_LUGARES,
  limparEndereco,
  limparTrecho,
  MASCARA,
  notaDaMedida,
  ocorrenciasDoLighthouse,
  pontosDeDesempenho,
  resumirTabela,
  coletarLugares,
  separarLink,
  type Ocorrencia,
} from '../src/index.js'

const SITE = 'https://example.com/'

/** Relatório do Lighthouse de mentira, só com o que o Raio-X lê. */
function relatorio(a11yScore = 0) {
  return {
    categories: {
      performance: {
        score: 0.5,
        auditRefs: [
          { id: 'largest-contentful-paint', weight: 25, group: 'metrics', acronym: 'LCP' },
          { id: 'total-blocking-time', weight: 75, group: 'metrics', acronym: 'TBT' },
          { id: 'render-blocking-insight', weight: 0, group: 'insights' },
          { id: 'server-response-time', weight: 0, group: 'hidden' },
          { id: 'bf-cache', weight: 0, group: 'diagnostics' },
          { id: 'long-tasks', weight: 0, group: 'diagnostics' },
        ],
      },
      accessibility: {
        score: 0.9,
        auditRefs: [
          { id: 'image-alt', weight: 10 },
          { id: 'color-contrast', weight: 30 },
          { id: 'video-caption', weight: 0 },
        ],
      },
      'best-practices': { score: 1, auditRefs: [] },
      seo: { score: 1, auditRefs: [] },
    },
    audits: {
      'largest-contentful-paint': {
        id: 'largest-contentful-paint', title: 'LCP', score: 0.5, scoreDisplayMode: 'numeric',
        numericValue: 4000, scoringOptions: { p10: 2500, median: 4000 },
      },
      'total-blocking-time': {
        id: 'total-blocking-time', title: 'TBT', score: 1, scoreDisplayMode: 'numeric',
        numericValue: 10, scoringOptions: { p10: 200, median: 600 },
      },
      'render-blocking-insight': {
        // no objeto vivo do Lighthouse o campo existe vazio (só some ao salvar em JSON)
        scoringOptions: undefined,
        id: 'render-blocking-insight', title: 'Solicitações de bloqueio de renderização', score: 0,
        scoreDisplayMode: 'metricSavings', metricSavings: { LCP: 1500 }, displayValue: 'Economia estimada de 1.500 ms',
        description: 'Arquivos travam a primeira pintura. [Saiba mais](https://developer.chrome.com/x)',
        details: { type: 'table', items: [{ url: 'https://example.com/estilo.css?token=abc123secreto', wastedMs: 1500 }] },
      },
      'server-response-time': { id: 'server-response-time', title: 'escondida', score: 0, scoreDisplayMode: 'metricSavings' },
      'long-tasks': { id: 'long-tasks', title: 'informativa', score: 0, scoreDisplayMode: 'informative' },
      'bf-cache': {
        id: 'bf-cache', title: 'A página impede o cache de voltar', score: 0, scoreDisplayMode: 'binary', description: '',
        details: {
          type: 'table',
          items: [{ reason: 'desligado pelo teste', protocolReason: 'BackForwardCacheDisabledByCommandLine' }],
        },
      },
      'image-alt': {
        id: 'image-alt', title: 'Imagens sem alt', score: a11yScore, scoreDisplayMode: 'binary',
        description: 'Leitores de tela precisam do texto. [Saiba como](https://dequeuniversity.com/rules/axe/image-alt)',
        details: {
          type: 'table',
          items: [{ node: { type: 'node', selector: 'main > img.banner', snippet: '<img class="banner" src="x.png">' } }],
        },
      },
      'color-contrast': { id: 'color-contrast', title: 'Contraste', score: 1, scoreDisplayMode: 'binary' },
      'video-caption': { id: 'video-caption', title: 'Legenda', score: null, scoreDisplayMode: 'notApplicable' },
    },
  } as unknown as RelatorioLighthouse
}

describe('notaDaMedida', () => {
  const curva = { p10: 2500, median: 4000 }
  it('segue a curva do Lighthouse', () => {
    expect(notaDaMedida(curva, 4000)).toBeCloseTo(0.5, 2)
    expect(notaDaMedida(curva, 2500)).toBeCloseTo(0.9, 2)
    expect(notaDaMedida(curva, 1000)).toBeGreaterThan(0.9)
    expect(notaDaMedida(curva, 20000)).toBeLessThan(0.05)
    expect(notaDaMedida(curva, 0)).toBe(1)
  })
})

describe('pontosDeDesempenho', () => {
  it('converte a economia em ms nos pontos que a nota sobe', () => {
    // LCP 4000 → 2500 ms: nota da medida 0,5 → 0,9, peso 25 → ~10 pontos
    expect(pontosDeDesempenho(relatorio(), { LCP: 1500 })).toBeCloseTo(10, 0)
  })
  it('não passa do que falta para 100', () => {
    expect(pontosDeDesempenho(relatorio(), { LCP: 4000, TBT: 9999 })).toBeLessThanOrEqual(50)
  })
  it('sem economia, zero', () => {
    expect(pontosDeDesempenho(relatorio(), undefined)).toBe(0)
    expect(pontosDeDesempenho(relatorio(), { FCP: 0 })).toBe(0)
  })
})

describe('separarLink', () => {
  it('tira o link do fim e guarda como "saiba mais"', () => {
    expect(separarLink('Texto. [Saiba mais](https://a.com/x).')).toEqual({ texto: 'Texto.', link: 'https://a.com/x' })
  })
  it('link no meio vira só o texto', () => {
    expect(separarLink('Use [pré-conexão](https://a.com/p) cedo.')).toEqual({ texto: 'Use pré-conexão cedo.', link: 'https://a.com/p' })
  })
})

describe('ocorrenciasDoLighthouse', () => {
  const ocs = ocorrenciasDoLighthouse(relatorio(), SITE, 'celular')
  const ids = ocs.map((o) => o.id)

  it('pula medidas, escondidas, informativas, que passaram e que não se aplicam', () => {
    expect(ids).not.toContain('lighthouse.largest-contentful-paint')
    expect(ids).not.toContain('lighthouse.server-response-time')
    expect(ids).not.toContain('lighthouse.long-tasks')
    expect(ids).not.toContain('lighthouse.color-contrast')
    expect(ids).not.toContain('lighthouse.video-caption')
  })

  it('ignora o cache de voltar/avançar desligado pelo próprio navegador de teste', () => {
    expect(ids).not.toContain('lighthouse.bf-cache')
  })

  it('mantém o cache de voltar/avançar quando o motivo é do site', () => {
    const rel = relatorio()
    ;(rel.audits['bf-cache']!.details as { items: unknown[] }).items.push({ reason: 'unload', protocolReason: 'UnloadHandlerExistsInMainFrame' })
    const bf = ocorrenciasDoLighthouse(rel, SITE, 'celular').find((o) => o.id === 'lighthouse.bf-cache')
    expect(bf).toBeDefined()
  })

  it('desempenho: pontos, economia, lugar com endereço limpo e "saiba mais"', () => {
    const rb = ocs.find((o) => o.id === 'lighthouse.render-blocking-insight')!
    expect(rb.pontos).toBeCloseTo(10, 0)
    expect(rb.estado).toBe('falha')
    expect(rb.economia).toBe('Economia estimada de 1.500 ms')
    expect(rb.saibaMais).toBe('https://developer.chrome.com/x')
    expect(rb.explicacao).toBe('Arquivos travam a primeira pintura.')
    expect(rb.lugares).toEqual([{ tipo: 'pagina', endereco: SITE, perfil: 'celular', recurso: `https://example.com/estilo.css?token=${MASCARA}` }])
    expect(rb.dica).toBeTruthy()
  })

  it('acessibilidade: peso da auditoria na nota e o elemento com o trecho', () => {
    const alt = ocs.find((o) => o.id === 'lighthouse.image-alt')!
    expect(alt.bloco).toBe('acessibilidade')
    expect(alt.pontos).toBeCloseTo(25, 5) // 10 de 40 de peso
    expect(alt.estado).toBe('falha')
    expect(alt.lugares[0]).toMatchObject({ seletor: 'main > img.banner', trecho: '<img class="banner" src="x.png">' })
  })
})

describe('juntarAjustes', () => {
  const cel = ocorrenciasDoLighthouse(relatorio(), SITE, 'celular')
  const pc = ocorrenciasDoLighthouse(relatorio(), SITE, 'computador')
  const ajustes = juntarAjustes([...cel, ...pc], SITE)

  it('um item por problema, ordenado por impacto', () => {
    expect(ajustes.map((a) => a.id)).toEqual(['lighthouse.image-alt', 'lighthouse.render-blocking-insight'])
    expect(ajustes[0]!.impacto).toBeGreaterThan(ajustes[1]!.impacto)
    expect(ajustes[0]!.gravidade).toBe('alta')
  })

  it('mesmo lugar nos dois perfis vira um só, sem perfil', () => {
    expect(ajustes[0]!.lugares).toHaveLength(1)
    expect(ajustes[0]!.lugares[0]).not.toHaveProperty('perfil')
  })

  it('ganho em texto', () => {
    expect(ajustes[0]!.ganho).toBe('ganha ~+25 de acessibilidade')
    expect(ajustes[1]!.ganho).toBe('ganha ~+10 de desempenho no celular')
  })

  it('texto para a IA com site, título, lugar, explicação, pedido e dica — sem segredo', () => {
    const t = ajustes[1]!.textoIA
    expect(t).toContain(`No meu site ${SITE}, a ferramenta Raio-X encontrou: Solicitações de bloqueio de renderização.`)
    expect(t).toContain(`estilo.css?token=${MASCARA}`)
    expect(t).not.toContain('abc123secreto')
    expect(t).toContain('Por que importa: Arquivos travam a primeira pintura.')
    expect(t).toContain('corrija esse problema no meu projeto')
    expect(t).toContain('Dica:')
  })

  it('limita os lugares e conta o resto', () => {
    const muitos: Ocorrencia = {
      ...cel.find((o) => o.id === 'lighthouse.image-alt')!,
      lugares: Array.from({ length: LIMITE_LUGARES + 3 }, (_, i) => ({ tipo: 'pagina' as const, endereco: SITE, perfil: 'celular' as const, seletor: `img.n${i}` })),
    }
    const [a] = juntarAjustes([muitos], SITE)
    expect(a!.lugares).toHaveLength(LIMITE_LUGARES)
    expect(a!.outrosLugares).toBe(3)
    expect(a!.textoIA).toContain('…e mais 3 lugares parecidos.')
  })

  it('empate: o que aparece em mais páginas vem antes', () => {
    const base = cel.find((o) => o.id === 'lighthouse.image-alt')!
    const um = { ...base, id: 'a.um', pontos: 1 }
    const dois = [
      { ...base, id: 'b.dois', pontos: 1 },
      { ...base, id: 'b.dois', pontos: 1, pagina: 'https://example.com/outra' },
    ]
    expect(juntarAjustes([um, ...dois], SITE).map((a) => a.id)).toEqual(['b.dois', 'a.um'])
  })

  it('empate sem pontos: quem economiza mais bytes vem antes', () => {
    const base = cel.find((o) => o.id === 'lighthouse.image-alt')!
    const pouco = { ...base, id: 'a.pouco', pontos: 0, bytes: 1000 }
    const muito = { ...base, id: 'b.muito', pontos: 0, bytes: 50000 }
    expect(juntarAjustes([pouco, muito], SITE).map((a) => a.id)).toEqual(['b.muito', 'a.pouco'])
  })
})

describe('limpeza de segredos', () => {
  it('troca chaves conhecidas, JWT e atribuições de senha', () => {
    const t = limparTrecho(
      `<script>const k="sk-proj-AbCdEf1234567890xyz"; var jwt="eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N"; senha="minhaSenha123"</script>`,
    )
    expect(t).not.toContain('AbCdEf1234567890xyz')
    expect(t).not.toContain('eyJzdWIiOiIxMjM0NTY3ODkwIn0')
    expect(t).not.toContain('minhaSenha123')
    expect(t).toContain(MASCARA)
  })
  it('não estraga nomes de classe com números', () => {
    const t = '<p class="landing-module__6d9mHW__heroText">'
    expect(limparTrecho(t)).toBe(t)
  })
  it('corta trechos longos em 300 caracteres', () => {
    expect(limparTrecho('a'.repeat(500))).toHaveLength(300)
  })
  it('no endereço, só os parâmetros sensíveis', () => {
    expect(limparEndereco('https://a.com/_next/static/chunks/0qsqv_etzz5ha.js?v=2&api_key=XYZ987&x=1')).toBe(
      `https://a.com/_next/static/chunks/0qsqv_etzz5ha.js?v=2&api_key=${MASCARA}&x=1`,
    )
  })
})

describe('resumirTabela', () => {
  it('linhas "nome: valor" quando a auditoria não aponta elemento nem arquivo', () => {
    const det = {
      type: 'table',
      headings: [
        { key: 'groupLabel', valueType: 'text', label: 'Categoria' },
        { key: 'duration', valueType: 'ms', label: 'Tempo' },
      ],
      items: [
        { group: 'scriptEvaluation', groupLabel: 'Avaliação de script', duration: 1200.4 },
        { group: 'styleLayout', groupLabel: 'Estilo e layout', duration: 310 },
      ],
    }
    expect(resumirTabela(det)).toEqual(['Avaliação de script: 1.200 ms', 'Estilo e layout: 310 ms'])
  })
  it('bytes em KiB e nada quando não há tabela', () => {
    const det = { headings: [{ key: 'url', valueType: 'url' }, { key: 'wastedBytes', valueType: 'bytes' }], items: [{ url: 'inline', wastedBytes: 12800 }] }
    expect(resumirTabela(det)).toEqual(['inline: 12,5 KiB'])
    expect(resumirTabela({ type: 'list', items: [] })).toEqual([])
  })
})

describe('texto para a IA', () => {
  it('não repete o ponto final do título', () => {
    const [a] = juntarAjustes([{ ...ocorrenciasDoLighthouse(relatorio(), SITE, 'celular')[0]!, titulo: 'Contraste baixo.' }], SITE)
    expect(a!.textoIA).toContain('encontrou: Contraste baixo.\n')
  })
})

describe('motivo e termos traduzidos', () => {
  it('guarda a explicação do axe sem o "Fix any of the following"', () => {
    const lugares = coletarLugares(
      { type: 'table', items: [{ node: { type: 'node', selector: 'p.x', explanation: 'Fix any of the following:\n  Element has insufficient color contrast of 3.5 (foreground color: #5e6b8a, background color: #0c1222). Expected contrast ratio of 4.5:1' } }] },
      SITE,
      'computador',
    )
    expect(lugares[0]).toMatchObject({ seletor: 'p.x', motivo: expect.stringMatching(/^Element has insufficient color contrast of 3\.5 \(foreground color: #5e6b8a/) })
  })
  it('traduz as categorias da thread principal', () => {
    const det = { headings: [{ key: 'groupLabel', valueType: 'text' }, { key: 'duration', valueType: 'ms' }], items: [{ groupLabel: 'Script Evaluation', duration: 10 }] }
    expect(resumirTabela(det)).toEqual(['Execução de scripts: 10 ms'])
  })
})
