// Texto pronto para colar numa IA (docs/05-BACKEND.md §5) e descrição dos lugares.
import textos from '@raiox/textos/pt-BR.json' with { type: 'json' }
import type { Ajuste, Lugar } from '../tipos.js'

/** Troca {chave} pelos valores. */
export function preencher(modelo: string, valores: Record<string, string | number>): string {
  return modelo.replace(/\{(\w+)\}/g, (todo, chave: string) => (chave in valores ? String(valores[chave]) : todo))
}

/** Uma linha legível para o lugar: página, perfil, elemento, arquivo do site e trecho. */
export function descreverLugar(l: Lugar): string {
  const t = textos.ajustes
  const partes: string[] = []
  if (l.tipo === 'pagina') {
    partes.push(preencher(t.lugarPagina, { endereco: l.endereco }))
    if (l.perfil) partes.push(preencher(t.lugarPerfil, { perfil: textos.perfis[l.perfil].toLowerCase() }))
    if (l.seletor) partes.push(`— ${preencher(t.lugarElemento, { seletor: l.seletor })}`)
    if (l.recurso) partes.push(`— ${preencher(t.lugarRecurso, { recurso: l.recurso })}`)
    if (l.motivo) partes.push(`— ${preencher(t.lugarMotivo, { motivo: l.motivo })}`)
  } else {
    partes.push(preencher(t.lugarArquivo, { caminho: l.caminho }))
    if (l.linha) partes.push(preencher(t.lugarLinha, { linha: l.linha }))
  }
  if (l.trecho) partes.push(`— ${preencher(t.lugarTrecho, { trecho: l.trecho })}`)
  return partes.join(' ')
}

export type DadosTextoIA = Pick<Ajuste, 'titulo' | 'explicacao' | 'baseLegal' | 'saibaMais' | 'lugares' | 'outrosLugares' | 'detalhes'> & {
  site: string
  dica?: string
}

/** Monta o texto para a IA. Nunca leva cookies nem chaves: os lugares já chegam limpos. */
export function montarTextoIA(d: DadosTextoIA): string {
  const t = textos.textoIA
  // o modelo já fecha a frase com ponto: tira o do título do Lighthouse
  const titulo = d.titulo.replace(/[.\s]+$/, '')
  const linhas = [preencher(t.abertura, { site: d.site, titulo })]
  if (d.lugares.length) {
    linhas.push(t.onde)
    for (const l of d.lugares) linhas.push(`- ${descreverLugar(l)}`)
    if (d.outrosLugares) linhas.push(preencher(textos.ajustes.outrosLugares, { n: d.outrosLugares }))
  }
  if (d.detalhes?.length) {
    linhas.push(t.mediu)
    for (const x of d.detalhes) linhas.push(`- ${x}`)
  }
  let porque = preencher(t.porque, { explicacao: d.explicacao })
  if (d.baseLegal) porque += preencher(t.baseLegal, { baseLegal: d.baseLegal })
  linhas.push(porque)
  if (d.saibaMais) linhas.push(preencher(t.saibaMais, { endereco: d.saibaMais }))
  linhas.push(t.pedido)
  if (d.dica) linhas.push(preencher(t.dica, { dica: d.dica }))
  return linhas.join('\n')
}
