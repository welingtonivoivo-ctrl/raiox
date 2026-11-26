# Formato do resultado (`raiox analisar … --json`)

Versão do formato: `versaoFormato: 1`. Referência completa: `docs/05-BACKEND.md` §3 no repositório.

```ts
type Resultado = {
  versaoFormato: 1
  versaoRaioX: string
  versaoLighthouse: string
  navegador: string                 // ex.: "msedge 158.0.4370.33"
  forcaProcessador: number | null   // < 1000 = PC lento: desempenho no celular sai mais baixo que no PageSpeed
  avisos: string[]                  // em português, prontos para mostrar
  site: string                      // primeiro endereço
  quando: string                    // ISO 8601
  paginas: {
    endereco: string
    comLogin: boolean
    erro?: string                   // página que não deu para medir
    perfis: {
      celular?: Perfil
      computador?: Perfil
    }
  }[]
  ajustes: Ajuste[]                 // já do maior impacto ao menor
}

type Perfil = {
  notas: { desempenho: number; acessibilidade: number; boasPraticas: number; busca: number }   // 0–100
  medidas: {                        // cada uma: { valor, unidade: 's' | 'ms' | '', faixa: 'bom' | 'medio' | 'ruim' }
    primeiraCoisa      // primeira coisa na tela (FCP)
    maiorElemento      // maior elemento na tela (LCP)
    tempoBloqueado     // tempo bloqueado (TBT)
    telaPulando        // tela pulando (CLS)
    indiceVelocidade   // índice de velocidade (Speed Index)
    prontoParaTocar?   // pronto para tocar (TTI)
  }
}

type Ajuste = {
  id: string                        // "lighthouse.<auditoria>", ex.: "lighthouse.color-contrast"
  bloco: 'desempenho' | 'acessibilidade' | 'boasPraticas' | 'busca'   // (segurança e blocos legais: próximas versões)
  origem: 'lighthouse'
  titulo: string
  explicacao: string
  saibaMais?: string                // página com mais explicação
  gravidade: 'alta' | 'media' | 'baixa'
  impacto: number                   // pontos de nota que voltam ao corrigir (usado na ordem)
  ganho?: string                    // "ganha ~+8 de desempenho no celular" ou "Economia estimada de 27 KiB"
  lugares: {                        // no máximo 10; outrosLugares conta o resto
    tipo: 'pagina'
    endereco: string
    perfil?: 'celular' | 'computador'   // ausente = os dois
    seletor?: string                // seletor CSS do elemento
    recurso?: string                // arquivo do site (script, imagem, fonte)
    trecho?: string                 // HTML do elemento (limpo de segredos, até 300 caracteres)
    motivo?: string                 // por que falhou, em inglês (ex.: cores e proporção do contraste)
  }[]
  outrosLugares?: number
  detalhes?: string[]               // o que o teste mediu quando não há elemento nem arquivo ("Execução de scripts: 1.157 ms")
  paginasAfetadas: number
  textoIA: string                   // texto pronto para colar numa IA
  estado: 'falha' | 'atencao'
}
```

Códigos de saída do comando: 0 deu certo · 1 erro · 2 desempenho abaixo de `--minimo-desempenho`.
