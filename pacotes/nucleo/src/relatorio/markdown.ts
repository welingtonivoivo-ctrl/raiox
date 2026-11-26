// Arquivo de textos para a IA (docs/04-DESIGN.md §6).
import textos from '@raiox/textos/pt-BR.json' with { type: 'json' }
import { descreverLugar, preencher } from '../ajustes/texto-ia.js'
import { FORCA_MINIMA } from '../limites.js'
import type { ResultadoMedicao } from '../tipos.js'

export function dataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR')
}

export function nomeDoSite(site: string): string {
  try {
    return new URL(site).host
  } catch {
    return site
  }
}

/** Todos os textos para a IA num arquivo Markdown, do maior impacto ao menor. */
export function textosMarkdown(r: ResultadoMedicao): string {
  const t = textos.relatorio
  const linhas = [preencher(t.mdTitulo, { site: nomeDoSite(r.site), data: dataCurta(r.quando) }), '']
  for (const a of r.avisos) linhas.push(`> ⚠ ${a}`, '')
  if (!r.ajustes.length) linhas.push(t.nadaAjustar, '')
  r.ajustes.forEach((a, i) => {
    const lento = r.forcaProcessador !== null && r.forcaProcessador < FORCA_MINIMA && a.bloco === 'desempenho'
    const ganho = `${a.ganho ?? textos.ajustes.gravidades[a.gravidade]}${lento ? '*' : ''}`
    linhas.push(preencher(t.mdItem, { n: i + 1, bloco: textos.blocos[a.bloco], ganho, titulo: a.titulo }))
    if (a.lugares.length) {
      linhas.push(t.mdLugar)
      for (const l of a.lugares) linhas.push(`- ${descreverLugar(l)}`)
      if (a.outrosLugares) linhas.push(`- ${preencher(textos.ajustes.outrosLugares, { n: a.outrosLugares })}`)
    }
    if (a.detalhes?.length) {
      linhas.push(`${t.mediu}:`)
      for (const x of a.detalhes) linhas.push(`- ${x}`)
    }
    linhas.push('', t.mdTexto)
    for (const l of a.textoIA.split('\n')) linhas.push(`> ${l}`)
    linhas.push('')
  })
  if (r.forcaProcessador !== null && r.forcaProcessador < FORCA_MINIMA && r.ajustes.some((a) => a.bloco === 'desempenho')) {
    linhas.push(`\\* ${t.forcaBaixa}`, '')
  }
  return linhas.join('\n')
}
