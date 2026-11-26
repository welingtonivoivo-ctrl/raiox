// Relatório HTML de página única, tema claro para imprimir (docs/04-DESIGN.md §5).
// Arquivo independente: sem nada baixado da internet, sem cookies, sem chaves.
import textos from '@raiox/textos/pt-BR.json' with { type: 'json' }
import { descreverLugar, preencher } from '../ajustes/texto-ia.js'
import type { Ajuste, Medida, Medidas, Notas, Perfil, ResultadoMedicao, ResultadoPerfil } from '../tipos.js'
import { FORCA_MINIMA } from '../limites.js'
import { nomeDoSite, textosMarkdown } from './markdown.js'


export function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Só deixa virar link o que é http/https. */
function link(endereco: string, texto: string): string {
  return /^https?:\/\//i.test(endereco)
    ? `<a href="${escapar(endereco)}" rel="noopener noreferrer" target="_blank">${escapar(texto)}</a>`
    : escapar(texto)
}

function corDaNota(n: number): string {
  if (n >= 90) return 'bom'
  if (n >= 50) return 'medio'
  return 'ruim'
}

function anel(nota: number, nome: string, marca = ''): string {
  const raio = 34
  const volta = 2 * Math.PI * raio
  const cheio = (Math.max(0, Math.min(100, nota)) / 100) * volta
  return `<figure class="nota ${corDaNota(nota)}">
  <svg viewBox="0 0 80 80" role="img" aria-label="${escapar(`${nome}: ${nota}`)}">
    <circle cx="40" cy="40" r="${raio}" class="trilho"/>
    <circle cx="40" cy="40" r="${raio}" class="arco" stroke-dasharray="${cheio.toFixed(1)} ${volta.toFixed(1)}" transform="rotate(-90 40 40)"/>
    <text x="40" y="47" text-anchor="middle">${nota}</text>
  </svg>
  <figcaption>${escapar(nome)}${marca}</figcaption>
</figure>`
}

function valorDaMedida(m: Medida): string {
  const v = m.unidade === 's' ? m.valor.toFixed(1) : m.unidade === 'ms' ? m.valor.toLocaleString('pt-BR') : String(m.valor)
  return `${v.replace('.', ',')}${m.unidade ? ` ${m.unidade}` : ''}`
}

function blocoPerfil(perfil: Perfil, res: ResultadoPerfil, pcLento: boolean): string {
  const notas = (Object.keys(res.notas) as (keyof Notas)[])
    .map((k) => anel(res.notas[k], textos.notas[k], k === 'desempenho' && perfil === 'celular' && pcLento ? '<sup>*</sup>' : ''))
    .join('')
  const medidas = (Object.entries(res.medidas) as [keyof Medidas, Medida][])
    .map(
      ([k, m]) =>
        `<li class="${m.faixa}"><span>${escapar(textos.medidas[k])}</span><strong>${escapar(valorDaMedida(m))}</strong><em>${escapar(textos.faixas[m.faixa])}</em></li>`,
    )
    .join('')
  const rodape = perfil === 'celular' && pcLento ? `<p class="obs"><sup>*</sup> ${escapar(textos.relatorio.forcaBaixa)}</p>` : ''
  return `<section class="perfil"><h3>${escapar(textos.perfis[perfil])}</h3><div class="notas">${notas}</div><ul class="medidas">${medidas}</ul>${rodape}</section>`
}

function cartao(a: Ajuste, n: number, pcLento: boolean): string {
  const t = textos.relatorio
  const paginas =
    a.paginasAfetadas === 1
      ? textos.ajustes.paginasAfetadas.um
      : preencher(textos.ajustes.paginasAfetadas.varios, { n: a.paginasAfetadas })
  const lugares = a.lugares.map((l) => `<li>${escapar(descreverLugar(l))}</li>`).join('')
  const outros = a.outrosLugares ? `<li>${escapar(preencher(textos.ajustes.outrosLugares, { n: a.outrosLugares }))}</li>` : ''
  const saiba = a.saibaMais ? `<p class="saiba">${link(a.saibaMais, t.saibaMais)}</p>` : ''
  const base = a.baseLegal ? `<p class="base">${escapar(a.baseLegal)}</p>` : ''
  return `<article class="ajuste ${a.gravidade}" id="ajuste-${n}">
  <header>
    <span class="num">${n}</span>
    <span class="etiqueta">${escapar(textos.blocos[a.bloco])}</span>
    <span class="grav">${escapar(textos.ajustes.gravidades[a.gravidade])}</span>
    <span class="estado ${a.estado}">${escapar(textos.ajustes.estados[a.estado])}</span>
    ${a.ganho ? `<span class="ganho">${escapar(a.ganho)}${pcLento && a.bloco === 'desempenho' ? '<sup>*</sup>' : ''}</span>` : ''}
    <span class="pags">${escapar(paginas)}</span>
  </header>
  <h3>${escapar(a.titulo)}</h3>
  <h4>${escapar(t.explicacao)}</h4>
  <p>${escapar(a.explicacao)}</p>${base}${saiba}
  ${lugares ? `<h4>${escapar(t.lugar)}</h4><ul class="lugares">${lugares}${outros}</ul>` : ''}
  ${a.detalhes?.length ? `<h4>${escapar(t.mediu)}</h4><ul class="lugares">${a.detalhes.map((x) => `<li>${escapar(x)}</li>`).join('')}</ul>` : ''}
  <div class="ia">
    <div class="ia-topo"><h4>${escapar(t.textoIA)}</h4><button type="button" data-copiar="ia-${n}">${escapar(t.copiar)}</button></div>
    <pre id="ia-${n}">${escapar(a.textoIA)}</pre>
  </div>
</article>`
}

const ESTILO = `
:root{--fundo:#f6f8fc;--papel:#fff;--tinta:#0f1b2d;--suave:#55627a;--linha:#dde3ee;--azul:#0b63e5;--bom:#0a8a4b;--medio:#c26a00;--ruim:#d11f3a}
*{box-sizing:border-box}
html{scrollbar-width:none}
html::-webkit-scrollbar,pre::-webkit-scrollbar{display:none}
body{margin:0;background:var(--fundo);color:var(--tinta);font:15px/1.55 "Segoe UI",system-ui,-apple-system,sans-serif}
main{max-width:1000px;margin:0 auto;padding:32px 16px 48px}
h1{font-size:28px;margin:0 0 4px;letter-spacing:-.02em}
h1 span{color:var(--azul)}
h2{font-size:20px;margin:36px 0 12px}
h3{font-size:16px;margin:0 0 8px}
h4{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--suave);margin:14px 0 4px}
a{color:var(--azul)}
.meta{color:var(--suave);font-size:13px;margin:2px 0}
.avisos{background:#fff7e6;border:1px solid #f2c46d;border-radius:12px;padding:12px 16px;margin:20px 0}
.avisos p{margin:4px 0}
.pagina{background:var(--papel);border:1px solid var(--linha);border-radius:16px;padding:20px;margin:16px 0}
.pagina>h3{word-break:break-all;font-weight:600}
.erro{color:var(--ruim)}
.perfis{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:20px}
.perfil h3{margin-top:8px}
.notas{display:flex;flex-wrap:wrap;gap:8px 18px}
.nota{margin:0;width:84px;text-align:center}
.nota svg{width:72px;height:72px}
.nota .trilho{fill:none;stroke:var(--linha);stroke-width:7}
.nota .arco{fill:none;stroke-width:7;stroke-linecap:round}
.nota text{font:700 22px "Segoe UI",system-ui,sans-serif;fill:var(--tinta)}
.nota.bom .arco{stroke:var(--bom)}.nota.medio .arco{stroke:var(--medio)}.nota.ruim .arco{stroke:var(--ruim)}
.nota figcaption{font-size:12px;color:var(--suave)}
.medidas{list-style:none;padding:0;margin:14px 0 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px}
.medidas li{border:1px solid var(--linha);border-left-width:4px;border-radius:10px;padding:8px 10px;display:flex;flex-direction:column}
.medidas li span{font-size:12px;color:var(--suave)}
.medidas li em{font-style:normal;font-size:12px}
.medidas li.bom{border-left-color:var(--bom)}.medidas li.medio{border-left-color:var(--medio)}.medidas li.ruim{border-left-color:var(--ruim)}
.obs{font-size:12px;color:var(--suave)}
.topo-lista{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px}
.ajuste{background:var(--papel);border:1px solid var(--linha);border-left:5px solid var(--linha);border-radius:14px;padding:16px 18px;margin:12px 0;break-inside:avoid}
.ajuste.alta{border-left-color:var(--ruim)}.ajuste.media{border-left-color:var(--medio)}.ajuste.baixa{border-left-color:var(--azul)}
.ajuste header{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:8px;font-size:12px}
.ajuste header span{border:1px solid var(--linha);border-radius:999px;padding:1px 9px}
.ajuste .num{background:var(--tinta);color:#fff;border-color:var(--tinta)!important}
.ajuste .etiqueta{color:var(--azul);border-color:#b7cff7!important}
.ajuste .ganho{font-weight:600}
.estado.falha{color:var(--ruim)}.estado.atencao{color:var(--medio)}
.ajuste p{margin:4px 0}
.lugares{margin:4px 0;padding-left:20px;word-break:break-all;font-size:13px}
.ia{margin-top:12px}
.ia-topo{display:flex;align-items:center;justify-content:space-between}
pre{background:#0f1b2d;color:#e8f0ff;border-radius:10px;padding:12px 14px;white-space:pre-wrap;word-break:break-word;font:13px/1.5 Consolas,"Cascadia Mono",monospace;margin:6px 0 0;scrollbar-width:none}
button{font:inherit;font-size:13px;border:1px solid var(--azul);background:var(--azul);color:#fff;border-radius:8px;padding:5px 12px;cursor:pointer}
button:focus-visible{outline:3px solid #9cc2ff;outline-offset:2px}
.ainda,.rodape{color:var(--suave);font-size:13px}
.rodape{margin-top:32px;border-top:1px solid var(--linha);padding-top:12px}
@media print{body{background:#fff}button{display:none}.pagina,.ajuste{border-color:#ccc}pre{background:#f3f5f9;color:#000;border:1px solid #ccc}}
`

const SCRIPT = `
const todos = JSON.parse(document.getElementById('todos-os-textos').textContent);
async function copiar(texto, botao) {
  try { await navigator.clipboard.writeText(texto); } catch {
    const area = document.createElement('textarea'); area.value = texto; document.body.appendChild(area);
    area.select(); document.execCommand('copy'); area.remove();
  }
  const antes = botao.textContent; botao.textContent = botao.dataset.copiado; setTimeout(() => { botao.textContent = antes }, 1500);
}
for (const b of document.querySelectorAll('button[data-copiar]')) {
  b.dataset.copiado = ${JSON.stringify(textos.relatorio.copiado)};
  b.addEventListener('click', () => copiar(b.dataset.copiar === 'todos' ? todos : document.getElementById(b.dataset.copiar).textContent, b));
}
`

/** JSON seguro dentro de <script>: nenhum "<" vivo. */
function jsonNoScript(valor: unknown): string {
  // o bloco é application/json lido com JSON.parse: basta não deixar "<" (fecharia o </script>)
  return JSON.stringify(valor).replaceAll('<', '\\' + 'u003c')
}

export function relatorioHtml(r: ResultadoMedicao): string {
  const t = textos.relatorio
  const site = nomeDoSite(r.site)
  const pcLento = r.forcaProcessador !== null && r.forcaProcessador < FORCA_MINIMA
  const quando = new Date(r.quando).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })
  const avisos = r.avisos.length
    ? `<section class="avisos" role="note"><strong>${escapar(t.avisos)}</strong>${r.avisos.map((a) => `<p>⚠ ${escapar(a)}</p>`).join('')}</section>`
    : ''
  const paginas = r.paginas
    .map((p) => {
      const perfis = (Object.entries(p.perfis) as [Perfil, ResultadoPerfil][]).map(([pf, res]) => blocoPerfil(pf, res, pcLento)).join('')
      const erro = p.erro ? `<p class="erro">${escapar(preencher(t.erroPagina, { erro: p.erro }))}</p>` : ''
      return `<section class="pagina"><h3>${link(p.endereco, p.endereco)}</h3>${erro}<div class="perfis">${perfis}</div></section>`
    })
    .join('')
  const lista = r.ajustes.length
    ? r.ajustes.map((a, i) => cartao(a, i + 1, pcLento)).join('')
    : `<p>${escapar(t.nadaAjustar)}</p>`
  const obsLento = pcLento && r.ajustes.some((a) => a.bloco === 'desempenho') ? `<p class="obs"><sup>*</sup> ${escapar(t.forcaBaixa)}</p>` : ''
  const copiarTodos = r.ajustes.length ? `<button type="button" data-copiar="todos">${escapar(t.copiarTodos)}</button>` : ''
  const forca = r.forcaProcessador === null ? '' : ` · ${escapar(preencher(t.forca, { forca: r.forcaProcessador }))}`

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapar(preencher(t.titulo, { site }))}</title>
<style>${ESTILO}</style>
</head>
<body>
<main>
<h1><span>Raio-X</span> · ${escapar(site)}</h1>
<p class="meta">${escapar(preencher(t.gerado, { quando }))}</p>
<p class="meta">${escapar(preencher(t.navegador, { navegador: r.navegador, lighthouse: r.versaoLighthouse, raiox: r.versaoRaioX }))}${forca}</p>
${avisos}
<h2>${escapar(t.notas)}</h2>
${paginas}
<div class="topo-lista"><h2>${escapar(t.oQueAjustar)}</h2>${copiarTodos}</div>
${lista}
${obsLento}
<p class="ainda">${escapar(t.ainda)}</p>
<p class="rodape">${escapar(t.rodape)}</p>
</main>
<script type="application/json" id="todos-os-textos">${jsonNoScript(textosMarkdown(r))}</script>
<script>${SCRIPT}</script>
</body>
</html>
`
}
