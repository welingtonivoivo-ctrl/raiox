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
  /** Pasta para guardar o relatório original do Lighthouse de cada rodada (lighthouse-<n>-<perfil>.json). */
  pastaBruta?: string
}

/** Blocos da lista "O que ajustar". Os legais e de código chegam nas Etapas 5 e 6. */
export type BlocoAjuste =
  | 'desempenho' | 'acessibilidade' | 'boasPraticas' | 'busca' | 'seguranca'
  | 'cookies' | 'lgpd' | 'lbi' | 'cdc' | 'marcoCivil' | 'codigo'

export type Lugar =
  | {
      tipo: 'pagina'
      endereco: string
      perfil?: Perfil
      seletor?: string
      /** Arquivo do site envolvido (script, imagem, fonte…). */
      recurso?: string
      trecho?: string
      /** Por que o elemento falhou (ex.: cores e proporção do contraste). */
      motivo?: string
    }
  | { tipo: 'arquivo'; caminho: string; linha?: number; trecho?: string }

/** Um item da lista "O que ajustar" (docs/05-BACKEND.md §3). */
export type Ajuste = {
  id: string
  bloco: BlocoAjuste
  origem: 'lighthouse' | 'axe' | 'regra' | 'ia'
  titulo: string
  explicacao: string
  /** Página com mais explicação (vinda do Lighthouse). */
  saibaMais?: string
  gravidade: 'alta' | 'media' | 'baixa'
  /** Usado para ordenar (docs/02-TRD.md §7). Nos itens do Lighthouse = pontos de nota que se ganha. */
  impacto: number
  ganho?: string
  baseLegal?: string
  lugares: Lugar[]
  /** Quantos lugares ficaram de fora da lista (limite por item). */
  outrosLugares?: number
  /** O que o teste mediu, quando não há elemento nem arquivo (ex.: "Avaliação de script: 1.200 ms"). */
  detalhes?: string[]
  paginasAfetadas: number
  textoIA: string
  estado: 'falha' | 'atencao' | 'naoConferido'
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
  /** Lista "O que ajustar", do maior impacto ao menor. */
  ajustes: Ajuste[]
}
