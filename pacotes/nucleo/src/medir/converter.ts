import type { Result as RelatorioLighthouse } from 'lighthouse'
import type { Faixa, Medida, Medidas, Notas, ResultadoPerfil } from '../tipos.js'

/** Faixa pela própria nota que o Lighthouse dá à medida (0,9+ bom; 0,5+ médio). */
export function faixaDaNota(nota: number | null | undefined): Faixa {
  if (nota == null) return 'ruim'
  if (nota >= 0.9) return 'bom'
  if (nota >= 0.5) return 'medio'
  return 'ruim'
}

function nota(rel: RelatorioLighthouse, categoria: string): number {
  const n = rel.categories[categoria]?.score
  return n == null ? 0 : Math.round(n * 100)
}

function medida(rel: RelatorioLighthouse, id: string, unidade: Medida['unidade']): Medida | undefined {
  const a = rel.audits[id]
  if (!a || typeof a.numericValue !== 'number') return undefined
  let valor = a.numericValue
  if (unidade === 's') valor = Math.round((valor / 1000) * 10) / 10
  else if (unidade === 'ms') valor = Math.round(valor)
  else valor = Math.round(valor * 1000) / 1000
  return { valor, unidade, faixa: faixaDaNota(a.score) }
}

function medidaObrigatoria(rel: RelatorioLighthouse, id: string, unidade: Medida['unidade']): Medida {
  return medida(rel, id, unidade) ?? { valor: 0, unidade, faixa: 'ruim' }
}

/** Força do processador que o Lighthouse mediu antes da rodada (benchmarkIndex). */
export function forcaDoProcessador(rel: RelatorioLighthouse): number | null {
  const n = rel.environment?.benchmarkIndex
  return typeof n === 'number' ? Math.round(n) : null
}

/** Converte o relatório do Lighthouse no formato do Raio-X (docs/02-TRD.md §3). */
export function converterRelatorio(rel: RelatorioLighthouse): ResultadoPerfil {
  const notas: Notas = {
    desempenho: nota(rel, 'performance'),
    acessibilidade: nota(rel, 'accessibility'),
    boasPraticas: nota(rel, 'best-practices'),
    busca: nota(rel, 'seo'),
  }
  const medidas: Medidas = {
    primeiraCoisa: medidaObrigatoria(rel, 'first-contentful-paint', 's'),
    maiorElemento: medidaObrigatoria(rel, 'largest-contentful-paint', 's'),
    tempoBloqueado: medidaObrigatoria(rel, 'total-blocking-time', 'ms'),
    telaPulando: medidaObrigatoria(rel, 'cumulative-layout-shift', ''),
    indiceVelocidade: medidaObrigatoria(rel, 'speed-index', 's'),
  }
  const pronto = medida(rel, 'interactive', 's')
  if (pronto) medidas.prontoParaTocar = pronto
  return { notas, medidas }
}
