// Curva de nota das medidas do Lighthouse (log-normal com p10 e mediana).
// Reescrita a partir da descrição pública do Lighthouse para estimar quantos
// pontos de desempenho um ajuste devolve (docs/02-TRD.md §7).

/** Função erro (aproximação de Abramowitz e Stegun, a mesma ordem de precisão usada pelo Lighthouse). */
function erf(x: number): number {
  const sinal = Math.sign(x)
  const v = Math.abs(x)
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911
  const t = 1 / (1 + p * v)
  const y = t * (a1 + t * (a2 + t * (a3 + t * (a4 + t * a5))))
  return sinal * (1 - y * Math.exp(-v * v))
}

export type Curva = { p10: number; median: number }

/** Nota de 0 a 1 de uma medida: valor ≤ p10 → 0,9+; valor = mediana → 0,5. */
export function notaDaMedida(curva: Curva, valor: number): number {
  if (curva.median <= 0) return 0
  if (valor <= 0) return 1
  const INVERSA_ERFC_UM_QUINTO = 0.9061938024368232
  const razao = Math.log(Math.max(Number.MIN_VALUE, valor / curva.median))
  const razaoP10 = -Math.log(Math.max(Number.MIN_VALUE, curva.p10 / curva.median))
  const x = (razao * INVERSA_ERFC_UM_QUINTO) / razaoP10
  const percentil = (1 - erf(x)) / 2
  if (valor <= curva.p10) return Math.max(0.9, Math.min(1, percentil))
  if (valor <= curva.median) return Math.max(0.5, Math.min(0.8999999999999999, percentil))
  return Math.max(0, Math.min(0.49999999999999994, percentil))
}
