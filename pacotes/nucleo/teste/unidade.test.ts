import { describe, expect, it } from 'vitest'
import type { Result as RelatorioLighthouse } from 'lighthouse'
import { conferirEndereco, converterRelatorio, ErroRaioX, faixaDaNota } from '../src/index.js'

describe('conferirEndereco', () => {
  it('aceita http e https', () => {
    expect(conferirEndereco('https://example.com', false).href).toBe('https://example.com/')
    expect(conferirEndereco('  http://example.com/a  ', false).pathname).toBe('/a')
  })
  it('recusa outros protocolos e texto solto', () => {
    expect(() => conferirEndereco('file:///C:/x.html', false)).toThrow(ErroRaioX)
    expect(() => conferirEndereco('javascript:alert(1)', false)).toThrow(ErroRaioX)
    expect(() => conferirEndereco('meusite', false)).toThrow(ErroRaioX)
  })
  it('recusa endereço local sem a opção ligada', () => {
    for (const e of ['http://localhost:3000', 'http://127.0.0.1', 'http://192.168.0.10', 'http://172.20.1.1', 'http://app.localhost']) {
      expect(() => conferirEndereco(e, false)).toThrow(ErroRaioX)
      expect(conferirEndereco(e, true)).toBeInstanceOf(URL)
    }
    expect(conferirEndereco('http://172.32.0.1', false)).toBeInstanceOf(URL)
  })
})

describe('faixaDaNota', () => {
  it('segue as faixas do Lighthouse', () => {
    expect(faixaDaNota(1)).toBe('bom')
    expect(faixaDaNota(0.9)).toBe('bom')
    expect(faixaDaNota(0.89)).toBe('medio')
    expect(faixaDaNota(0.5)).toBe('medio')
    expect(faixaDaNota(0.49)).toBe('ruim')
    expect(faixaDaNota(null)).toBe('ruim')
  })
})

describe('converterRelatorio', () => {
  const auditoria = (numericValue: number, score: number) => ({ numericValue, score })
  const rel = {
    categories: {
      performance: { score: 0.951 },
      accessibility: { score: 0.95 },
      'best-practices': { score: 1 },
      seo: { score: null },
    },
    audits: {
      'first-contentful-paint': auditoria(1234, 0.95),
      'largest-contentful-paint': auditoria(2650, 0.7),
      'total-blocking-time': auditoria(410.6, 0.4),
      'cumulative-layout-shift': auditoria(0.14, 0.78),
      'speed-index': auditoria(3000, 0.9),
    },
  } as unknown as RelatorioLighthouse

  it('converte notas para 0–100', () => {
    expect(converterRelatorio(rel).notas).toEqual({ desempenho: 95, acessibilidade: 95, boasPraticas: 100, busca: 0 })
  })
  it('converte medidas com unidade e faixa', () => {
    const m = converterRelatorio(rel).medidas
    expect(m.primeiraCoisa).toEqual({ valor: 1.2, unidade: 's', faixa: 'bom' })
    expect(m.maiorElemento).toEqual({ valor: 2.7, unidade: 's', faixa: 'medio' })
    expect(m.tempoBloqueado).toEqual({ valor: 411, unidade: 'ms', faixa: 'ruim' })
    expect(m.telaPulando).toEqual({ valor: 0.14, unidade: '', faixa: 'medio' })
  })
  it('deixa "Pronto para tocar" de fora quando não existe', () => {
    expect(converterRelatorio(rel).medidas.prontoParaTocar).toBeUndefined()
  })
})
