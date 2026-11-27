import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { conferirEndereco } from './medir/endereco.js'
import { abrirNavegador } from './medir/navegador.js'
import { ErroRaioX } from './medir/endereco.js'
import { abrir } from './navegar/descobrir.js'
import { Registro, Ritmo } from './navegar/registro.js'
import { caiuNoLogin } from './navegar/regras.js'
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

/**
 * Mede as páginas nos perfis pedidos. Com `sessao`, mede logado: antes de cada página confere
 * se ainda está logado e, depois do Lighthouse, se a página medida não foi a tela de entrada.
 */
export async function medir(
  enderecos: string[],
  opcoes: Partial<OpcoesMedicao> = {},
  aoAndar: (msg: string) => void = () => {},
  registro = new Registro(),
): Promise<ResultadoMedicao> {
  const op = { ...PADRAO, ...opcoes }
  const urls = enderecos.map((e) => conferirEndereco(e, op.permitirLocal).href)
  const quando = new Date().toISOString()
  const paginas: ResultadoPagina[] = []
  const forcas: number[] = []
  const ocorrencias: Ocorrencia[] = []
  const comLogin = Boolean(op.sessao)
  const nav = await abrirNavegador(op.sessao ? { sessao: op.sessao } : {})
  const navegador = `${nav.canal} ${nav.versao}`
  const ritmo = new Ritmo()
  let vencida = false
  try {
    for (const [i, endereco] of urls.entries()) {
      const pagina: ResultadoPagina = { endereco, comLogin, perfis: {} }
      if (vencida) {
        pagina.erro = textos.erros.sessaoVencida
        paginas.push(pagina)
        continue
      }
      try {
        if (comLogin) {
          aoAndar(`página ${i + 1} de ${urls.length} — conferindo o login`)
          const conferidor = await nav.contexto.newPage()
          try {
            const r = await abrir(conferidor, endereco, ritmo, registro, 'conferencia')
            if (r.noLogin) throw new ErroRaioX('sessaoVencida')
          } finally {
            await conferidor.close().catch(() => {})
          }
        }
        for (const perfil of op.perfis) {
          aoAndar(`página ${i + 1} de ${urls.length} — medindo no ${perfil}`)
          registro.anotar(endereco, 'medicao')
          const rel = await medirPerfil(endereco, nav.porta, perfil, op.precisao)
          // o site pode ter mandado o Lighthouse para a tela de entrada: não vale como medida da página
          if (comLogin && caiuNoLogin(endereco, rel.finalDisplayedUrl ?? endereco, false)) throw new ErroRaioX('sessaoVencida')
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
        if (e instanceof ErroRaioX && e.codigo === 'sessaoVencida') {
          vencida = true
          // não mistura medida da tela de entrada com a da página
          pagina.perfis = {}
        }
        pagina.erro = e instanceof Error ? e.message : String(e)
      }
      paginas.push(pagina)
    }
  } finally {
    await nav.fechar()
  }
  const forcaProcessador = forcas.length ? Math.min(...forcas) : null
  const avisos: string[] = []
  if (vencida) avisos.push(textos.erros.sessaoVencida)
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
    ...(comLogin ? { registro: registro.entradas } : {}),
  }
}
export { pastaDeDados, pastaDaAnalise, nomeDoHost } from './pastas.js'
export { abrirNavegador, type NavegadorDeTeste } from './medir/navegador.js'
export { descobrirPaginas, classificarLink, PADRAO_DESCOBERTA, type OpcoesDescoberta, type PaginaEncontrada, type PaginaPulada, type ResultadoDescoberta } from './navegar/descobrir.js'
export { entrar, conferirSessao, type OpcoesEntrar } from './navegar/entrar.js'
export { salvarSessao, lerSessao, apagarSessao, listarSessoes, caminhoDaSessao, cifrar, decifrar, type EstadoDoNavegador, type EstadoSessao, type SessaoSalva } from './navegar/sessao.js'
export { cofreNaMemoria, chaveMestra, escolherCofre, type Cofre } from './navegar/cofre.js'
export { motivoParaPular, palavrasPerigosas, enderecoDeLogin, caiuNoLogin, mesmoEndereco, normalizar } from './navegar/regras.js'
export { Registro, Ritmo, type EntradaRegistro } from './navegar/registro.js'
