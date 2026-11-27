import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { inflado, relatorioHtml, salvarRelatorios, textosMarkdown, type Ajuste, type ResultadoMedicao } from '../src/index.js'
import { abrirNavegador } from '../src/medir/navegador.js'

const medida = { valor: 1.2, unidade: 's' as const, faixa: 'bom' as const }
const ajuste: Ajuste = {
  id: 'lighthouse.image-alt',
  bloco: 'acessibilidade',
  origem: 'lighthouse',
  titulo: 'Imagens sem <alt> </script><script>alert(1)</script>',
  explicacao: 'Leitores de tela precisam do texto.',
  saibaMais: 'javascript:alert(1)',
  gravidade: 'alta',
  impacto: 25,
  ganho: 'ganha ~+25 de acessibilidade',
  lugares: [{ tipo: 'pagina', endereco: 'https://example.com/', seletor: 'img.banner', trecho: '<img class="banner">' }],
  paginasAfetadas: 1,
  textoIA: 'No meu site https://example.com/, a ferramenta Raio-X encontrou: Imagens sem alt.\nlinha 2 </script>',
  estado: 'falha',
}
const resultado: ResultadoMedicao = {
  versaoFormato: 1,
  versaoRaioX: '0.0.0',
  versaoLighthouse: '13.6.0',
  navegador: 'msedge 158',
  forcaProcessador: 400,
  avisos: ['Este computador está lento para o teste.'],
  site: 'https://example.com/',
  quando: '2026-11-26T15:00:00.000Z',
  paginas: [
    {
      endereco: 'https://example.com/',
      comLogin: false,
      perfis: {
        celular: {
          notas: { desempenho: 64, acessibilidade: 88, boasPraticas: 100, busca: 100 },
          medidas: { primeiraCoisa: medida, maiorElemento: medida, tempoBloqueado: { valor: 4530, unidade: 'ms', faixa: 'ruim' }, telaPulando: { valor: 0, unidade: '', faixa: 'bom' }, indiceVelocidade: medida },
        },
      },
    },
  ],
  ajustes: [ajuste],
}

describe('arquivo de textos (Markdown)', () => {
  const md = textosMarkdown(resultado)
  it('segue o formato do 04-DESIGN §6', () => {
    expect(md).toMatch(/^# Raio-X — example\.com — 26\/11\/2026/)
    expect(md).toContain('## 1. [Acessibilidade · ganha ~+25 de acessibilidade] Imagens sem')
    expect(md).toContain('Lugar:\n- página https://example.com/ — elemento img.banner')
    expect(md).toContain('Texto para a IA:\n> No meu site https://example.com/')
    expect(md).toContain('> linha 2')
    expect(md).toContain('> ⚠ Este computador está lento')
  })
})

describe('relatório HTML', () => {
  const html = relatorioHtml(resultado)

  it('escapa o que vem do site e não cria link perigoso', () => {
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;alt&gt;')
    expect(html).not.toContain('href="javascript:')
    // dentro do JSON embutido, nenhum "</script>" que feche o bloco antes da hora
    const json = html.split('id="todos-os-textos">')[1]!.split('</script>')[0]!
    expect(json).not.toContain('<')
  })

  it('marca o desempenho do celular quando o PC é lento', () => {
    expect(html).toContain('Desempenho<sup>*</sup>')
    expect(html).toContain('medido num computador lento')
  })

  it('não mostra barra de rolagem', () => {
    expect(html).toContain('scrollbar-width:none')
    expect(html).toContain('::-webkit-scrollbar')
  })

  it('abre no navegador sem erro e os botões de copiar funcionam', async () => {
    const nav = await abrirNavegador()
    try {
      const contexto = nav.contexto
      await contexto.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'https://example.com' }).catch(() => {})
      const pagina = await contexto.newPage()
      const erros: string[] = []
      pagina.on('pageerror', (e) => erros.push(e.message))
      pagina.on('dialog', (d) => {
        erros.push(`diálogo: ${d.message()}`)
        void d.dismiss()
      })
      await pagina.setContent(html)
      expect(await pagina.locator('article.ajuste').count()).toBe(1)
      expect(await pagina.locator('figure.nota').count()).toBe(4)
      // o JSON com todos os textos lê de volta igual ao Markdown
      const todos = await pagina.evaluate(() => JSON.parse(document.getElementById('todos-os-textos')!.textContent!))
      expect(todos).toBe(textosMarkdown(resultado))
      await pagina.locator('button[data-copiar="todos"]').click()
      await expect.poll(() => pagina.locator('button[data-copiar="todos"]').textContent()).toBe('Copiado')
      await pagina.locator('button[data-copiar="ia-1"]').click()
      expect(erros).toEqual([])
    } finally {
      await nav.fechar()
    }
  }, 60_000)
})

describe('salvarRelatorios', () => {
  const pasta = mkdtempSync(join(tmpdir(), 'raiox-'))
  afterAll(() => rmSync(pasta, { recursive: true, force: true }))

  it('grava HTML, JSON e Markdown', async () => {
    const c = await salvarRelatorios(resultado, pasta)
    expect(JSON.parse(readFileSync(c.json, 'utf8'))).toEqual(resultado)
    expect(readFileSync(c.html, 'utf8')).toMatch(/^<!doctype html>/)
    expect(readFileSync(c.textos, 'utf8')).toBe(textosMarkdown(resultado))
  })
})

describe('asterisco de PC lento', () => {
  it('só em ganho de pontos de desempenho, não em economia de bytes', () => {
    expect(inflado({ bloco: 'desempenho', impacto: 30 }, 400)).toBe(true)
    expect(inflado({ bloco: 'desempenho', impacto: 0 }, 400)).toBe(false)
    expect(inflado({ bloco: 'acessibilidade', impacto: 25 }, 400)).toBe(false)
    expect(inflado({ bloco: 'desempenho', impacto: 30 }, 1500)).toBe(false)
    expect(inflado({ bloco: 'desempenho', impacto: 30 }, null)).toBe(false)
  })
})
