import type { Result as RelatorioLighthouse } from 'lighthouse'
import type { Perfil } from '../tipos.js'

const CATEGORIAS = ['performance', 'accessibility', 'best-practices', 'seo']

// O Lighthouse é pesado para carregar (dezenas de segundos num PC fraco): só entra quando vai medir,
// para `raiox versao`, `raiox ajuda` e o relatório abrirem na hora.
const carregar = () => import('lighthouse')

/** Uma rodada do Lighthouse num navegador já aberto (porta de depuração). */
export async function rodarLighthouse(endereco: string, porta: number, perfil: Perfil): Promise<RelatorioLighthouse> {
  const { default: lighthouse, desktopConfig } = await carregar()
  const config = perfil === 'computador' ? desktopConfig : undefined // sem config = perfil celular padrão
  const r = await lighthouse(
    endereco,
    {
      port: porta,
      output: 'json',
      logLevel: 'error',
      locale: 'pt', // títulos e explicações em português do Brasil (o 'pt' do Lighthouse é o brasileiro)
      onlyCategories: CATEGORIAS,
      disableStorageReset: true, // não apaga o login (Etapa 4)
    },
    config,
  )
  if (!r) throw new Error('O Lighthouse não devolveu resultado.')
  if (r.lhr.runtimeError) throw new Error(`${r.lhr.runtimeError.code}: ${r.lhr.runtimeError.message}`)
  return r.lhr
}

/** 1 rodada, ou 3 com a do meio (mediana) quando "precisão" está ligada. */
export async function medirPerfil(endereco: string, porta: number, perfil: Perfil, precisao: boolean): Promise<RelatorioLighthouse> {
  if (!precisao) return rodarLighthouse(endereco, porta, perfil)
  const rodadas: RelatorioLighthouse[] = []
  for (let i = 0; i < 3; i++) rodadas.push(await rodarLighthouse(endereco, porta, perfil))
  const { computeMedianRun } = await import('lighthouse/core/lib/median-run.js')
  return computeMedianRun(rodadas)
}
