// Resumo em português para o terminal (docs/05-BACKEND.md §9).
import textos from '@raiox/textos/pt-BR.json' with { type: 'json' }
import { FORCA_MINIMA, inflado, preencher, type Notas, type Perfil, type ResultadoMedicao } from '@raiox/nucleo'

const ITENS_NO_RESUMO = 10

type Pintar = (texto: string, cor: 'verde' | 'laranja' | 'vermelho' | 'fraco' | 'negrito' | 'amarelo') => string

const CODIGOS = { verde: 32, laranja: 33, vermelho: 31, fraco: 2, negrito: 1, amarelo: 33 } as const

export function pintor(comCor: boolean): Pintar {
  return comCor ? (t, cor) => `\x1b[${CODIGOS[cor]}m${t}\x1b[0m` : (t) => t
}

function corDaNota(n: number): 'verde' | 'laranja' | 'vermelho' {
  if (n >= 90) return 'verde'
  if (n >= 50) return 'laranja'
  return 'vermelho'
}

/** Notas de desempenho abaixo do mínimo, como "https://x/ (celular: 72)". */
export function abaixoDoMinimo(r: ResultadoMedicao, minimo: number): string[] {
  const lista: string[] = []
  for (const p of r.paginas) {
    for (const [perfil, res] of Object.entries(p.perfis) as [Perfil, NonNullable<(typeof p.perfis)[Perfil]>][]) {
      if (res.notas.desempenho < minimo) lista.push(`${p.endereco} (${textos.perfis[perfil].toLowerCase()}: ${res.notas.desempenho})`)
    }
  }
  return lista
}

export function montarResumo(r: ResultadoMedicao, arquivos: { relatorio: string; textos: string; dados: string }, comCor: boolean): string {
  const pinta = pintor(comCor)
  const t = textos.cli
  const pcLento = r.forcaProcessador !== null && r.forcaProcessador < FORCA_MINIMA
  let site = r.site
  try {
    site = new URL(r.site).host
  } catch {
    // mantém o endereço
  }
  const quando = new Date(r.quando).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  const linhas = [pinta(preencher(t.titulo, { site, quando }), 'negrito'), '']

  const largura = Math.max(...Object.values(textos.notas).map((n) => n.length)) + 2
  for (const p of r.paginas) {
    linhas.push(pinta(p.endereco, 'negrito'))
    if (p.erro) {
      linhas.push(pinta(`  ${p.erro}`, 'vermelho'), '')
      continue
    }
    const perfis = Object.keys(p.perfis) as Perfil[]
    linhas.push(`  ${''.padEnd(largura)}${perfis.map((pf) => t.colunas[pf].padStart(12)).join('')}`)
    for (const nota of Object.keys(textos.notas).filter((k) => k !== 'seguranca') as (keyof Notas)[]) {
      const celulas = perfis.map((pf) => {
        const n = p.perfis[pf]!.notas[nota]
        const marca = pcLento && nota === 'desempenho' && pf === 'celular' ? '*' : ' '
        return pinta(`${n}${marca}`.padStart(12), corDaNota(n))
      })
      linhas.push(`  ${textos.notas[nota].padEnd(largura)}${celulas.join('')}`)
    }
    linhas.push('')
  }
  for (const a of r.avisos) linhas.push(pinta(`⚠ ${a}`, 'amarelo'))
  if (r.avisos.length) linhas.push('')

  if (!r.ajustes.length) linhas.push(t.nadaAjustar)
  else {
    linhas.push(pinta(preencher(t.oQueAjustar, { n: r.ajustes.length }), 'negrito'))
    r.ajustes.slice(0, ITENS_NO_RESUMO).forEach((a, i) => {
      const lento = inflado(a, r.forcaProcessador) ? '*' : ''
      const etiqueta = `[${textos.blocos[a.bloco]} · ${a.ganho ?? textos.ajustes.gravidades[a.gravidade]}${lento}]`
      const cor = a.gravidade === 'alta' ? 'vermelho' : a.gravidade === 'media' ? 'laranja' : 'fraco'
      linhas.push(`  ${String(i + 1).padStart(2)}. ${pinta(etiqueta, cor)} ${a.titulo}`)
    })
    if (r.ajustes.length > ITENS_NO_RESUMO) linhas.push(preencher(t.maisItens, { n: r.ajustes.length - ITENS_NO_RESUMO }))
  }
  if (pcLento) linhas.push('', pinta(t.asterisco, 'fraco'))
  linhas.push(
    '',
    `${t.arquivos.relatorio} ${arquivos.relatorio}`,
    `${t.arquivos.textos} ${arquivos.textos}`,
    `${t.arquivos.dados} ${arquivos.dados}`,
  )
  return linhas.join('\n')
}
