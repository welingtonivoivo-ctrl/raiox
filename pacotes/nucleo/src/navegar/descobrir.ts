// Descoberta das páginas do site depois do login (docs/02-TRD.md §4).
// Só ABRE endereços (nunca clica nem envia formulário), só do mesmo site, até 3 níveis,
// até 50 páginas, no máximo 1 por segundo, pulando links perigosos.
import type { BrowserContext, Page } from 'playwright-core'
import { ErroRaioX } from '../medir/endereco.js'
import { caiuNoLogin, mesmoEndereco, motivoParaPular, palavrasPerigosas } from './regras.js'
import { Registro, Ritmo } from './registro.js'
import { limparEndereco, limparTrecho } from '../ajustes/segredos.js'

export type OpcoesDescoberta = {
  /** Máximo de páginas encontradas (padrão 50). */
  limite: number
  /** Níveis de links a partir do endereço inicial (padrão 3). */
  niveis: number
  /** Palavras perigosas a mais. */
  evitar: string[]
}

export type PaginaEncontrada = {
  endereco: string
  /** Texto do primeiro link que levou a ela. */
  texto: string
  nivel: number
}

export type PaginaPulada = { endereco: string; texto: string; motivo: string }

export type ResultadoDescoberta = {
  paginas: PaginaEncontrada[]
  puladas: PaginaPulada[]
}

export const PADRAO_DESCOBERTA: OpcoesDescoberta = { limite: 50, niveis: 3, evitar: [] }

type Link = { href: string; texto: string; download: boolean }

/** Links <a href> da página (só leitura do HTML; nada é clicado). */
async function lerLinks(pagina: Page): Promise<Link[]> {
  return pagina.$$eval('a[href]', (as) =>
    as.map((a) => ({
      href: (a as HTMLAnchorElement).href,
      texto: ((a as HTMLElement).innerText || a.getAttribute('aria-label') || a.getAttribute('title') || '').trim().slice(0, 120),
      download: a.hasAttribute('download'),
    })),
  )
}

export async function temCampoDeSenha(pagina: Page): Promise<boolean> {
  return pagina
    .locator('input[type="password"]')
    .first()
    .isVisible()
    .catch(() => false)
}

/** Abre o endereço (com ritmo e registro) e diz se caiu na tela de entrada. */
export async function abrir(
  pagina: Page,
  endereco: string,
  ritmo: Ritmo,
  registro: Registro,
  motivo: 'conferencia' | 'descoberta',
): Promise<{ final: string; noLogin: boolean }> {
  await ritmo.esperar()
  registro.anotar(endereco, motivo)
  await pagina.goto(endereco, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  // dá tempo de um redirecionamento feito por script (apps que conferem o token no navegador)
  await pagina.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
  const final = pagina.url()
  return { final, noLogin: caiuNoLogin(endereco, final, await temCampoDeSenha(pagina)) }
}

/** Classifica um link: endereço limpo para visitar, ou motivo para pular. null = ignora calado (fora do site, âncora). */
export function classificarLink(link: Link, origem: string, perigosas: string[]): { endereco: string } | PaginaPulada | null {
  let url: URL
  try {
    url = new URL(link.href)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { endereco: link.href, texto: link.texto, motivo: `protocolo: ${url.protocol}` }
  if (url.origin !== origem) return null
  url.hash = ''
  const endereco = url.href
  if (link.download) return { endereco, texto: link.texto, motivo: 'download' }
  const motivo = motivoParaPular(url, link.texto, perigosas)
  return motivo ? { endereco, texto: link.texto, motivo } : { endereco }
}

/**
 * Visita o site logado e junta as páginas do mesmo site.
 * Se o endereço inicial cair na tela de entrada, a sessão venceu (erro).
 */
export async function descobrirPaginas(
  contexto: BrowserContext,
  inicio: string,
  op: Partial<OpcoesDescoberta> = {},
  registro = new Registro(),
  aoAndar: (msg: string) => void = () => {},
): Promise<ResultadoDescoberta> {
  const o = { ...PADRAO_DESCOBERTA, ...op }
  const perigosas = palavrasPerigosas(o.evitar)
  const origem = new URL(inicio).origin
  const ritmo = new Ritmo()
  const pagina = await contexto.newPage()
  const encontradas: PaginaEncontrada[] = [{ endereco: new URL(inicio).href.replace(/#.*$/, ''), texto: '', nivel: 0 }]
  const puladas = new Map<string, PaginaPulada>()
  const vistas = new Set(encontradas.map((p) => p.endereco))
  try {
    for (let i = 0; i < encontradas.length; i++) {
      const atual = encontradas[i]!
      if (atual.nivel >= o.niveis) continue
      aoAndar(`lendo os links de ${atual.endereco}`)
      let r: { final: string; noLogin: boolean }
      try {
        r = await abrir(pagina, atual.endereco, ritmo, registro, 'descoberta')
      } catch {
        continue // página que não abriu: segue com as outras
      }
      if (r.noLogin) {
        if (i === 0) throw new ErroRaioX('sessaoVencida')
        continue
      }
      // redirecionou para outro site: não segue os links de lá
      if (new URL(r.final).origin !== origem) continue
      if (!mesmoEndereco(atual.endereco, r.final)) vistas.add(r.final.replace(/#.*$/, ''))
      for (const link of await lerLinks(pagina)) {
        const c = classificarLink(link, origem, perigosas)
        if (!c) continue
        if ('motivo' in c) {
          if (!puladas.has(c.endereco)) puladas.set(c.endereco, { endereco: limparEndereco(c.endereco), texto: limparTrecho(c.texto), motivo: c.motivo })
          continue
        }
        if (vistas.has(c.endereco) || encontradas.length >= o.limite) continue
        vistas.add(c.endereco)
        encontradas.push({ endereco: c.endereco, texto: link.texto, nivel: atual.nivel + 1 })
      }
    }
  } finally {
    await pagina.close().catch(() => {})
  }
  return { paginas: encontradas, puladas: [...puladas.values()] }
}
