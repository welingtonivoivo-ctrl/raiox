import type { Ajuste } from './tipos.js'

/**
 * Abaixo desta força o Raio-X avisa que o desempenho no celular pode sair mais baixo
 * que no PageSpeed (escolha do Raio-X; os servidores do Google costumam medir acima de 1000).
 */
export const FORCA_MINIMA = 1000

export function pcLento(forcaProcessador: number | null): boolean {
  return forcaProcessador !== null && forcaProcessador < FORCA_MINIMA
}

/**
 * Item cujo ganho em pontos depende do processador (marcado com * em PC lento).
 * Economia em bytes não depende do PC: não leva *.
 */
export function inflado(a: Pick<Ajuste, 'bloco' | 'impacto'>, forcaProcessador: number | null): boolean {
  return pcLento(forcaProcessador) && a.bloco === 'desempenho' && a.impacto >= 1
}
