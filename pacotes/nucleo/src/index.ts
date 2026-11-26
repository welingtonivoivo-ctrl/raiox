import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { conferirEndereco } from './medir/endereco.js'
import { abrirNavegador } from './medir/navegador.js'
import { medirPerfil } from './medir/lighthouse.js'
import { converterRelatorio, forcaDoProcessador } from './medir/converter.js'
import { ocorrenciasDoLighthouse, type Ocorrencia } from './ajustes/lighthouse.js'
import { juntarAjustes } from './ajustes/juntar.js'
import { FORCA_MINIMA } from './limites.js'
import textos from '@raiox/textos/pt-BR.json' with { type: 'json' }
import type { OpcoesMedicao, ResultadoMedicao, ResultadoPagina } from './tipos.js'

export * from './tipos.js'
export { conferirEndereco, ErroRaioX } from './medir/endereco.js'
export { converterRelatorio, faixaDaNota, forcaDoProcessador } from './medir/converter.js'
export { ocorrenciasDoLighthouse, coletarLugares, pontosDeDesempenho, resumirTabela, separarLink, type Ocorrencia } from './ajustes/lighthouse.js'
export { juntarAjustes, ordenarAjustes, gravidadePorPontos, LIMITE_LUGARES } from './ajustes/juntar.js'
export { montarTextoIA, descreverLugar, preencher } from './ajustes/texto-ia.js'
export { limparEndereco, limparTrecho, MASCARA } from './ajustes/segredos.js'
export { notaDaMedida } from './ajustes/nota.js'
export { gerarRelatorio, salvarRelatorios, relatorioHtml, textosMarkdown, type FormatoRelatorio } from './relatorio/index.js'

const exigir = createRequire(import.meta.url)
export const VERSAO_RAIOX: string = exigir('../package.json').version
export const VERSAO_LIGHTHOUSE: string = exigir('lighthouse/package.json').version

export { FORCA_MINIMA, inflado, pcLento } from './limites.js'

const PADRAO: OpcoesMedicao = { perfis: ['celular', 'computador'], precisao: false, permitirLocal: false }

/** Mede as páginas públicas nos perfis pedidos (Etapa 1 do plano). */
export async function medir(
  enderecos: string[],
  opcoes: Partial<OpcoesMedicao> = {},
  aoAndar: (msg: string) => void = () => {},
): Promise<ResultadoMedicao> {
  const op = { ...PADRAO, ...opcoes }
  const urls = enderecos.map((e) => conferirEndereco(e, op.permitirLocal).href)
  const quando = new Date().toISOString()
  const paginas: ResultadoPagina[] = []
  const forcas: number[] = []
  const ocorrencias: Ocorrencia[] = []
  const nav = await abrirNavegador()
  const navegador = `${nav.canal} ${nav.navegador.version()}`
  try {
    for (const [i, endereco] of urls.entries()) {
      const pagina: ResultadoPagina = { endereco, comLogin: false, perfis: {} }
      try {
        for (const perfil of op.perfis) {
          aoAndar(`página ${i + 1} de ${urls.length} — medindo no ${perfil}`)
          const rel = await medirPerfil(endereco, nav.porta, perfil, op.precisao)
          if (op.pastaBruta) {
            await mkdir(op.pastaBruta, { recursive: true })
            await writeFile(join(op.pastaBruta, `lighthouse-${i + 1}-${perfil}.json`), JSON.stringify(rel), 'utf8')
          }
          const f = forcaDoProcessador(rel)
          if (f !== null) forcas.push(f)
          pagina.perfis[perfil] = converterRelatorio(rel)
          ocorrencias.push(...ocorrenciasDoLighthouse(rel, endereco, perfil))
        }
      } catch (e) {
        pagina.erro = e instanceof Error ? e.message : String(e)
      }
      paginas.push(pagina)
    }
  } finally {
    await nav.fechar()
  }
  const forcaProcessador = forcas.length ? Math.min(...forcas) : null
  const avisos: string[] = []
  if (forcaProcessador !== null && forcaProcessador < FORCA_MINIMA && op.perfis.includes('celular')) {
    avisos.push(textos.avisos.processadorLento.replace('{forca}', String(forcaProcessador)))
  }
  const site = urls[0] ?? ''
  return {
    versaoFormato: 1,
    versaoRaioX: VERSAO_RAIOX,
    versaoLighthouse: VERSAO_LIGHTHOUSE,
    navegador,
    forcaProcessador,
    avisos,
    site,
    quando,
    paginas,
    ajustes: juntarAjustes(ocorrencias, site),
  }
}
