// Junta as ocorrências de todas as páginas e perfis na lista "O que ajustar",
// ordenada por impacto (docs/02-TRD.md §7).
import textos from '@raiox/textos/pt-BR.json' with { type: 'json' }
import type { Ajuste, Lugar } from '../tipos.js'
import type { Ocorrencia } from './lighthouse.js'
import { montarTextoIA, preencher } from './texto-ia.js'

/** Quantos lugares cada item mostra; o resto vira "…e mais N". */
export const LIMITE_LUGARES = 10

const PESO_GRAVIDADE = { alta: 3, media: 2, baixa: 1 } as const

/** Gravidade dos itens do Lighthouse pelos pontos que devolvem. */
export function gravidadePorPontos(pontos: number): Ajuste['gravidade'] {
  if (pontos >= 5) return 'alta'
  if (pontos >= 1) return 'media'
  return 'baixa'
}

/** Mesmo problema no celular e no computador vira um lugar só, sem perfil. */
function juntarLugares(ocs: Ocorrencia[]): Lugar[] {
  const porChave = new Map<string, Lugar>()
  for (const oc of ocs) {
    const lugares: Lugar[] = oc.lugares.length ? oc.lugares : [{ tipo: 'pagina', endereco: oc.pagina, perfil: oc.perfil }]
    for (const l of lugares) {
      if (l.tipo !== 'pagina') continue
      const chave = `${l.endereco}|${l.seletor ?? ''}|${l.recurso ?? ''}|${l.trecho ?? ''}`
      const ja = porChave.get(chave)
      if (!ja) porChave.set(chave, { ...l })
      else if (ja.tipo === 'pagina' && ja.perfil !== l.perfil) delete ja.perfil
    }
  }
  return [...porChave.values()]
}

function textoDoGanho(melhor: Ocorrencia): string {
  const t = textos.ajustes
  const nota = textos.notasMinusculas[melhor.bloco]
  if (melhor.pontos >= 1) {
    let g = preencher(t.ganhoPontos, { pontos: Math.round(melhor.pontos), nota })
    // a nota de desempenho é diferente em cada aparelho: sempre dizer qual
    if (melhor.bloco === 'desempenho') {
      g += ` ${preencher(t.noPerfil, { perfil: textos.perfis[melhor.perfil].toLowerCase() })}`
    }
    return g
  }
  return melhor.economia ?? preencher(t.ganhoPequeno, { nota })
}

/**
 * Ordem: impacto, depois o que aparece em mais páginas, depois gravidade, depois
 * o que economiza mais bytes (`bytes`, opcional, por id).
 */
export function ordenarAjustes(lista: Ajuste[], bytes: Map<string, number> = new Map()): Ajuste[] {
  return [...lista].sort(
    (a, b) =>
      b.impacto - a.impacto ||
      b.paginasAfetadas - a.paginasAfetadas ||
      PESO_GRAVIDADE[b.gravidade] - PESO_GRAVIDADE[a.gravidade] ||
      (bytes.get(b.id) ?? 0) - (bytes.get(a.id) ?? 0) ||
      a.id.localeCompare(b.id),
  )
}

export function juntarAjustes(ocorrencias: Ocorrencia[], site: string): Ajuste[] {
  const grupos = new Map<string, Ocorrencia[]>()
  for (const oc of ocorrencias) grupos.set(oc.id, [...(grupos.get(oc.id) ?? []), oc])

  const lista: Ajuste[] = []
  const bytes = new Map<string, number>()
  for (const [id, ocs] of grupos) {
    bytes.set(id, Math.max(...ocs.map((o) => o.bytes)))
    const melhor = ocs.reduce((a, b) => (b.pontos > a.pontos ? b : a))
    const todos = juntarLugares(ocs)
    const lugares = todos.slice(0, LIMITE_LUGARES)
    const outrosLugares = todos.length - lugares.length
    const impacto = Math.round(melhor.pontos * 10) / 10
    const ajuste: Ajuste = {
      id,
      bloco: melhor.bloco,
      origem: 'lighthouse',
      titulo: melhor.titulo,
      explicacao: melhor.explicacao,
      gravidade: gravidadePorPontos(melhor.pontos),
      impacto,
      ganho: textoDoGanho(melhor),
      lugares,
      paginasAfetadas: new Set(ocs.map((o) => o.pagina)).size,
      textoIA: '',
      estado: ocs.some((o) => o.estado === 'falha') ? 'falha' : 'atencao',
    }
    if (melhor.saibaMais) ajuste.saibaMais = melhor.saibaMais
    if (outrosLugares > 0) ajuste.outrosLugares = outrosLugares
    if (melhor.detalhes?.length) ajuste.detalhes = melhor.detalhes
    const dados: Parameters<typeof montarTextoIA>[0] = { ...ajuste, site }
    if (melhor.dica) dados.dica = melhor.dica
    ajuste.textoIA = montarTextoIA(dados)
    lista.push(ajuste)
  }
  return ordenarAjustes(lista, bytes)
}
