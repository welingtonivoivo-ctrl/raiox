import { createRequire } from 'node:module'
import { conferirEndereco } from './medir/endereco.js'
import { abrirNavegador } from './medir/navegador.js'
import { medirPerfil } from './medir/lighthouse.js'
import { converterRelatorio, forcaDoProcessador } from './medir/converter.js'
import textos from '@raiox/textos/pt-BR.json' with { type: 'json' }
import type { OpcoesMedicao, ResultadoMedicao, ResultadoPagina } from './tipos.js'

export * from './tipos.js'
export { conferirEndereco, ErroRaioX } from './medir/endereco.js'
export { converterRelatorio, faixaDaNota, forcaDoProcessador } from './medir/converter.js'

const exigir = createRequire(import.meta.url)
const VERSAO_RAIOX: string = exigir('../package.json').version
const VERSAO_LIGHTHOUSE: string = exigir('lighthouse/package.json').version

/**
 * Abaixo desta força o Raio-X avisa que o desempenho no celular pode sair mais baixo
 * que no PageSpeed (escolha do Raio-X; os servidores do Google costumam medir acima de 1000).
 */
export const FORCA_MINIMA = 1000

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
  const nav = await abrirNavegador()
  const navegador = `${nav.canal} ${nav.navegador.version()}`
  try {
    for (const [i, endereco] of urls.entries()) {
      const pagina: ResultadoPagina = { endereco, comLogin: false, perfis: {} }
      try {
        for (const perfil of op.perfis) {
          aoAndar(`página ${i + 1} de ${urls.length} — medindo no ${perfil}`)
          const rel = await medirPerfil(endereco, nav.porta, perfil, op.precisao)
          const f = forcaDoProcessador(rel)
          if (f !== null) forcas.push(f)
          pagina.perfis[perfil] = converterRelatorio(rel)
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
  return {
    versaoFormato: 1,
    versaoRaioX: VERSAO_RAIOX,
    versaoLighthouse: VERSAO_LIGHTHOUSE,
    navegador,
    forcaProcessador,
    avisos,
    site: urls[0] ?? '',
    quando,
    paginas,
  }
}
