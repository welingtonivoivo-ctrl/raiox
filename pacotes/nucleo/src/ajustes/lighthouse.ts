// Converte as auditorias do Lighthouse que não passaram em ocorrências da lista
// "O que ajustar", com o lugar e quantos pontos de nota devolvem (docs/02-TRD.md §7).
import type { Result as RelatorioLighthouse } from 'lighthouse'
import textos from '@raiox/textos/pt-BR.json' with { type: 'json' }
import type { Ajuste, Lugar, Notas, Perfil } from '../tipos.js'
import { notaDaMedida, type Curva } from './nota.js'
import { limparEndereco, limparTrecho } from './segredos.js'

/** Um problema numa página e num perfil; várias viram um só `Ajuste` em `juntarAjustes`. */
export type Ocorrencia = {
  id: string
  bloco: keyof Notas
  titulo: string
  explicacao: string
  saibaMais?: string
  dica?: string
  /** Pontos de nota que o item devolve se for corrigido. */
  pontos: number
  /** Economia que o Lighthouse mostra (ex.: "Economia estimada de 27 KiB"). */
  economia?: string
  /** Bytes que se economiza (desempate entre itens sem ganho de pontos). */
  bytes: number
  /** O que o teste mediu, quando não há elemento nem arquivo (ex.: "Avaliação de script: 1.200 ms"). */
  detalhes?: string[]
  estado: Ajuste['estado']
  pagina: string
  perfil: Perfil
  lugares: Lugar[]
}

const CATEGORIAS: Record<string, keyof Notas> = {
  performance: 'desempenho',
  accessibility: 'acessibilidade',
  'best-practices': 'boasPraticas',
  seo: 'busca',
}

/** Modos de auditoria que não contam na nota e não viram ajuste. */
const SEM_NOTA = new Set(['notApplicable', 'manual', 'informative', 'error'])

/**
 * Motivos do cache de voltar/avançar que vêm do próprio navegador de teste
 * (ele abre com esse cache desligado), não do site — não podem virar ajuste.
 */
const BFCACHE_DO_TESTE = new Set([
  'BackForwardCacheDisabled',
  'BackForwardCacheDisabledByCommandLine',
  'BackForwardCacheDisabledByLowMemory',
  'BackForwardCacheDisabledForDelegate',
  'BackForwardCacheDisabledForPrerender',
])

type Auditoria = RelatorioLighthouse['audits'][string]
type Objeto = Record<string, unknown>

const ehObjeto = (v: unknown): v is Objeto => typeof v === 'object' && v !== null

/** Tira os links em Markdown da descrição do Lighthouse e guarda o último como "saiba mais". */
export function separarLink(descricao: string): { texto: string; link?: string } {
  const LINK = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g
  const achados = [...descricao.matchAll(LINK)]
  const ultimo = achados.at(-1)
  let texto = descricao
  if (ultimo && descricao.slice((ultimo.index ?? 0) + ultimo[0].length).trim().replace(/^\.$/, '') === '') {
    // link no fim da descrição ("Saiba mais…"): sai do texto e vira o "saiba mais"
    texto = descricao.slice(0, ultimo.index)
  }
  texto = texto.replace(LINK, '$1').replace(/\s+/g, ' ').trim()
  return ultimo ? { texto, link: ultimo[2] } : { texto }
}

function lugarDoNo(no: Objeto, pagina: string, perfil: Perfil, recurso?: string): Lugar {
  const l: Lugar = { tipo: 'pagina', endereco: pagina, perfil }
  if (typeof no.selector === 'string' && no.selector) l.seletor = limparTrecho(no.selector)
  if (typeof no.snippet === 'string' && no.snippet) l.trecho = limparTrecho(no.snippet)
  if (recurso) l.recurso = limparEndereco(recurso)
  // explicação do axe (vem em inglês): cores e proporção do contraste, atributo que falta…
  if (typeof no.explanation === 'string' && no.explanation.trim()) {
    const motivo = no.explanation.replace(/^Fix (?:any|all) of the following:\s*/i, '').replace(/\s+/g, ' ').trim()
    if (motivo) l.motivo = limparTrecho(motivo)
  }
  return l
}

/** Procura elementos (nós) e arquivos do site dentro dos detalhes da auditoria. */
export function coletarLugares(detalhes: unknown, pagina: string, perfil: Perfil): Lugar[] {
  const lugares: Lugar[] = []
  const vistos = new Set<string>()
  const guardar = (l: Lugar) => {
    if (l.tipo !== 'pagina') return
    const chave = `${l.seletor ?? ''}|${l.recurso ?? ''}|${l.trecho ?? ''}`
    if (chave === '||' || vistos.has(chave)) return
    vistos.add(chave)
    lugares.push(l)
  }
  const visitar = (v: unknown, fundo: number): void => {
    if (fundo > 6 || lugares.length >= 50) return
    if (Array.isArray(v)) {
      for (const x of v) visitar(x, fundo + 1)
      return
    }
    if (!ehObjeto(v)) return
    const recurso = typeof v.url === 'string' && /^https?:\/\//.test(v.url) ? v.url : undefined
    if (v.type === 'node') {
      guardar(lugarDoNo(v, pagina, perfil))
      return
    }
    if (ehObjeto(v.node) && v.node.type === 'node') {
      guardar(lugarDoNo(v.node, pagina, perfil, recurso))
      return
    }
    if (recurso && v.type !== 'source-location') {
      // linha de tabela com arquivo do site; os subitens (posições no arquivo) não viram lugares a mais
      guardar({ tipo: 'pagina', endereco: pagina, perfil, recurso: limparEndereco(recurso) })
      return
    }
    visitar(v.items, fundo + 1)
    if (v.type === 'list-section') visitar(v.value, fundo + 1)
  }
  visitar(detalhes, 0)
  return lugares
}

/** Pontos de desempenho que voltam se a economia (ms por medida) se confirmar. */
export function pontosDeDesempenho(rel: RelatorioLighthouse, economias: Record<string, number> | undefined): number {
  const cat = rel.categories.performance
  if (!cat || !economias) return 0
  let pontos = 0
  for (const ref of cat.auditRefs) {
    if (!ref.weight || !ref.acronym) continue
    const economia = economias[ref.acronym]
    const medida = rel.audits[ref.id] as (Auditoria & { scoringOptions?: Curva }) | undefined
    if (!economia || economia <= 0 || !medida || typeof medida.numericValue !== 'number' || !medida.scoringOptions) continue
    const antes = medida.score ?? notaDaMedida(medida.scoringOptions, medida.numericValue)
    const depois = notaDaMedida(medida.scoringOptions, Math.max(0, medida.numericValue - economia))
    pontos += ref.weight * Math.max(0, depois - antes)
  }
  const maximo = 100 - Math.round((cat.score ?? 0) * 100)
  return Math.min(pontos, maximo)
}

/** Peso da auditoria na nota × o que falta para ela passar, em pontos de 0 a 100. */
function pontosDaCategoria(rel: RelatorioLighthouse, categoria: string, idAuditoria: string, nota: number): number {
  const refs = rel.categories[categoria]?.auditRefs ?? []
  const soma = refs.reduce((t, r) => t + (r.weight || 0), 0)
  const ref = refs.find((r) => r.id === idAuditoria)
  if (!ref?.weight || soma <= 0) return 0
  return (ref.weight / soma) * 100 * (1 - nota)
}

const LINHAS_RESUMO = 5

function formatarValor(valor: number, tipo: string): string {
  if (tipo === 'bytes') return `${(valor / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} KiB`
  if (tipo === 'ms' || tipo === 'timespanMs') return `${Math.round(valor).toLocaleString('pt-BR')} ms`
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

/**
 * Linhas "nome: valor" da tabela da auditoria (ex.: "Avaliação de script: 1.200 ms").
 * Usadas quando a auditoria não aponta elemento nem arquivo, para a IA saber o que pesou.
 */
export function resumirTabela(detalhes: unknown): string[] {
  if (!ehObjeto(detalhes) || !Array.isArray(detalhes.headings) || !Array.isArray(detalhes.items)) return []
  const cabecalhos = detalhes.headings.filter(ehObjeto)
  const nome = cabecalhos.find((h) => typeof h.key === 'string' && ['text', 'url', 'code'].includes(String(h.valueType)))
  const numero = cabecalhos.find((h) => typeof h.key === 'string' && ['ms', 'timespanMs', 'bytes', 'numeric'].includes(String(h.valueType)))
  if (!nome) return []
  const linhas: string[] = []
  for (const item of detalhes.items) {
    if (linhas.length >= LINHAS_RESUMO || !ehObjeto(item)) break
    const rotulo = item[String(nome.key)]
    if (typeof rotulo !== 'string' || !rotulo) continue
    const traduzido = (textos.termosLighthouse as Record<string, string>)[rotulo] ?? rotulo
    const texto = nome.valueType === 'url' ? limparEndereco(traduzido) : limparTrecho(traduzido)
    // tabela só de texto (ex.: motivos do cache de voltar/avançar): a linha é o próprio texto
    if (!numero) {
      linhas.push(texto)
      continue
    }
    const valor = item[String(numero.key)]
    if (typeof valor !== 'number') continue
    linhas.push(`${texto}: ${formatarValor(valor, String(numero.valueType))}`)
  }
  return linhas
}

/** Bytes economizados: total da oportunidade ou soma de wastedBytes das linhas. */
function bytesEconomizados(detalhes: unknown): number {
  if (!ehObjeto(detalhes)) return 0
  if (typeof detalhes.overallSavingsBytes === 'number') return detalhes.overallSavingsBytes
  if (!Array.isArray(detalhes.items)) return 0
  return detalhes.items.reduce<number>((t, i) => t + (ehObjeto(i) && typeof i.wastedBytes === 'number' ? i.wastedBytes : 0), 0)
}

function filtrarBfcache(a: Auditoria): Auditoria | null {
  const det = a.details as { items?: Objeto[] } | undefined
  if (!det?.items) return a
  const itens = det.items.filter((i) => !BFCACHE_DO_TESTE.has(String(i.protocolReason)))
  if (!itens.length) return null
  return { ...a, details: { ...det, items: itens } } as Auditoria
}

/** Ocorrências de uma rodada do Lighthouse (uma página, um perfil). */
export function ocorrenciasDoLighthouse(rel: RelatorioLighthouse, pagina: string, perfil: Perfil): Ocorrencia[] {
  const saida: Ocorrencia[] = []
  const jaVistas = new Set<string>()
  const dicas = textos.lighthouse as Record<string, { titulo?: string; dica?: string } | undefined>
  for (const [categoria, bloco] of Object.entries(CATEGORIAS)) {
    for (const ref of rel.categories[categoria]?.auditRefs ?? []) {
      // medidas (nota das métricas) e auditorias antigas escondidas não são ajustes
      if (ref.group === 'metrics' || ref.group === 'hidden' || jaVistas.has(ref.id)) continue
      let a: Auditoria | null | undefined = rel.audits[ref.id]
      if (!a || SEM_NOTA.has(a.scoreDisplayMode) || a.score === null || a.score >= 0.9) continue
      // medidas têm curva de nota; no objeto vivo do Lighthouse o campo existe vazio nas outras auditorias
      if ((a as { scoringOptions?: unknown }).scoringOptions) continue
      if (a.id === 'bf-cache') a = filtrarBfcache(a)
      if (!a) continue
      jaVistas.add(ref.id)
      const nota = a.score ?? 0
      const pontos =
        bloco === 'desempenho'
          ? pontosDeDesempenho(rel, a.metricSavings as Record<string, number> | undefined)
          : pontosDaCategoria(rel, categoria, a.id, nota)
      const { texto, link } = separarLink(a.description ?? '')
      const extra = dicas[a.id]
      const oc: Ocorrencia = {
        id: `lighthouse.${a.id}`,
        bloco,
        titulo: extra?.titulo ?? a.title,
        explicacao: texto,
        pontos,
        bytes: bytesEconomizados(a.details),
        // no desempenho, "falha" só quando o item devolve pelo menos 1 ponto; diagnósticos sem ganho ficam em "atenção"
        estado: (bloco === 'desempenho' ? pontos >= 1 : nota < 0.5) ? 'falha' : 'atencao',
        pagina,
        perfil,
        lugares: coletarLugares(a.details, pagina, perfil),
      }
      if (!oc.lugares.length) {
        const resumo = resumirTabela(a.details)
        if (resumo.length) oc.detalhes = resumo
      }
      if (link) oc.saibaMais = link
      if (extra?.dica) oc.dica = extra.dica
      // só quando o Lighthouse mostra uma economia ("Economia estimada de 27 KiB"), não um tempo medido
      if (a.displayValue && /economi/i.test(a.displayValue)) oc.economia = a.displayValue
      saida.push(oc)
    }
  }
  return saida
}
