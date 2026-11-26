// Formato dos dados do Raio-X (docs/05-BACKEND.md §2 e §3).
// Etapa 1: só a parte da medição. Os outros campos chegam nas próximas etapas.

export type Perfil = 'celular' | 'computador'
export type Faixa = 'bom' | 'medio' | 'ruim'

export type Medida = { valor: number; unidade: 'ms' | 's' | ''; faixa: Faixa }

export type Notas = {
  desempenho: number
  acessibilidade: number
  boasPraticas: number
  busca: number
}

export type Medidas = {
  primeiraCoisa: Medida
  maiorElemento: Medida
  tempoBloqueado: Medida
  telaPulando: Medida
  indiceVelocidade: Medida
  prontoParaTocar?: Medida
}

export type ResultadoPerfil = { notas: Notas; medidas: Medidas }

export type ResultadoPagina = {
  endereco: string
  comLogin: boolean
  perfis: Partial<Record<Perfil, ResultadoPerfil>>
  erro?: string
}

export type OpcoesMedicao = {
  perfis: Perfil[]
  /** 3 rodadas por perfil e usa a do meio (mediana). */
  precisao: boolean
  /** Permite http://localhost e parecidos (para testar o próprio projeto rodando). */
  permitirLocal: boolean
}

export type ResultadoMedicao = {
  versaoFormato: 1
  versaoRaioX: string
  versaoLighthouse: string
  /** Canal e versão do navegador usado (ex.: "msedge 158.0.4370.33") — as notas variam um pouco entre navegadores. */
  navegador: string
  /** Força do processador medida pelo Lighthouse (menor rodada). PC fraco = desempenho no celular sai mais baixo. */
  forcaProcessador: number | null
  /** Avisos sobre a confiabilidade da medição (em português). */
  avisos: string[]
  site: string
  quando: string
  paginas: ResultadoPagina[]
}
