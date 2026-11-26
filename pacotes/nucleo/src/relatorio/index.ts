// Saídas da análise: HTML, Markdown de textos para a IA e JSON (docs/05-BACKEND.md §1 e §9).
// O PDF chega com o app (printToPDF do Electron, Etapa 8).
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ResultadoMedicao } from '../tipos.js'
import { relatorioHtml } from './html.js'
import { textosMarkdown } from './markdown.js'

export { relatorioHtml } from './html.js'
export { textosMarkdown } from './markdown.js'

export type FormatoRelatorio = 'html' | 'json' | 'textos'

const ARQUIVOS: Record<FormatoRelatorio, string> = {
  html: 'relatorio.html',
  json: 'resultado.json',
  textos: 'textos-ia.md',
}

function conteudo(r: ResultadoMedicao, formato: FormatoRelatorio): string {
  if (formato === 'html') return relatorioHtml(r)
  if (formato === 'textos') return textosMarkdown(r)
  return `${JSON.stringify(r, null, 2)}\n`
}

/** Grava um formato na pasta e devolve o caminho do arquivo. */
export async function gerarRelatorio(r: ResultadoMedicao, formato: FormatoRelatorio, pasta: string): Promise<string> {
  await mkdir(pasta, { recursive: true })
  const caminho = join(pasta, ARQUIVOS[formato])
  await writeFile(caminho, conteudo(r, formato), 'utf8')
  return caminho
}

/** Grava os três formatos e devolve os caminhos. */
export async function salvarRelatorios(r: ResultadoMedicao, pasta: string): Promise<Record<FormatoRelatorio, string>> {
  return {
    html: await gerarRelatorio(r, 'html', pasta),
    json: await gerarRelatorio(r, 'json', pasta),
    textos: await gerarRelatorio(r, 'textos', pasta),
  }
}
