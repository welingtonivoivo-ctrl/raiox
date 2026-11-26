# 05 — BACKEND: núcleo, formatos e mensagens

> Estado: **rascunho para aprovação do dono** — 26/11/2026.
> "Backend" aqui é o **núcleo local** (`pacotes/nucleo`). Não existe servidor na internet nem banco de dados: tudo são arquivos no PC de quem usa.

## 1. Funções públicas do núcleo

```ts
analisar(pedido: PedidoAnalise, aoAndar: (andamento: Andamento) => void, sinalParar: AbortSignal): Promise<Resultado>
entrar(site: string): Promise<EstadoSessao>          // abre a janela, espera "Já entrei", confere e salva
conferirSessao(site: string): Promise<EstadoSessao>
apagarSessao(site: string): Promise<void>
descobrirPaginas(site: string, opcoes: OpcoesDescoberta): Promise<PaginaEncontrada[]>
prepararEnvioIA(repo: string, provedor: string): Promise<PrevisaoEnvio>   // lista do que vai para a IA
testarIA(provedor: ConfigIA): Promise<{ ok: boolean; erro?: string }>
gerarRelatorio(resultado: Resultado, formato: 'html' | 'pdf' | 'json' | 'textos'): Promise<string>  // caminho do arquivo
```
A linha de comando, o app e a skill usam só essas funções.

## 2. Pedido de análise

```ts
type PedidoAnalise = {
  site: string                       // endereço inicial, só http/https
  modo: 'superficie' | 'completo'
  perfis: ('celular' | 'computador')[]
  precisao: boolean                  // 3 rodadas, usa a mediana
  comLogin: boolean
  paginas: string[]                  // vazio = só o endereço inicial
  souDono: boolean                   // obrigatório true se comLogin ou completo
  repo?: string                      // pasta, só no modo completo
  ia?: { provedor: string } | 'sem-ia'
  arquivosIA?: string[]              // lista confirmada na tela "O que vai para a IA"
}
```
Recusas do núcleo (erro com mensagem dos textos): `souDono` falso com login/completo; endereço fora de http/https; endereço local sem a opção ligada; repo inexistente.

## 3. Resultado (salvo em `resultado.json`)

```ts
type Resultado = {
  versaoFormato: 1
  versaoRaioX: string
  versaoLighthouse: string
  navegador: string                  // canal e versão, ex.: "msedge 158.0.4370.33"
  forcaProcessador: number | null    // força do processador medida pelo Lighthouse (menor rodada)
  avisos: string[]                   // ex.: PC lento para o teste
  site: string
  quando: string                     // ISO 8601
  modo: 'superficie' | 'completo'
  completo: boolean                  // false se parou no meio
  paginas: ResultadoPagina[]
  seguranca: { nota: number; parcial: boolean; alerta: boolean; falhas: number; atencoes: number; naoConferidos: number }
  //  parcial = modo superfície (sem código); alerta = chave secreta ou arquivo exposto no site no ar (nota limitada a 20)
  blocosLegais: Record<BlocoLegal, { nota: number; falhas: number; atencoes: number; naoConferidos: number }>
  ajustes: Ajuste[]                  // já ordenados por impacto
  ia?: { provedor: string; modelo: string; arquivosEnviados: number; caracteres: number }
}

type ResultadoPagina = {
  endereco: string
  comLogin: boolean
  perfis: Partial<Record<'celular' | 'computador', {
    notas: { desempenho: number; acessibilidade: number; boasPraticas: number; busca: number }
    medidas: {
      primeiraCoisa: Medida; maiorElemento: Medida; tempoBloqueado: Medida
      telaPulando: Medida; indiceVelocidade: Medida; prontoParaTocar?: Medida
    }
  }>>
  erro?: string
}
type Medida = { valor: number; unidade: 'ms' | 's' | ''; faixa: 'bom' | 'medio' | 'ruim' }

type BlocoLegal = 'cookies' | 'lgpd' | 'lbi' | 'cdc' | 'marcoCivil' | 'codigo'

type Ajuste = {
  id: string                         // ex.: "lighthouse.uses-optimized-images" ou "cdc.identificacao"
  bloco: 'desempenho' | 'acessibilidade' | 'boasPraticas' | 'busca' | 'seguranca' | BlocoLegal
  origem: 'lighthouse' | 'axe' | 'regra' | 'ia'
  titulo: string
  explicacao: string
  saibaMais?: string                 // página com mais explicação (Lighthouse)
  gravidade: 'alta' | 'media' | 'baixa'
  impacto: number                    // usado para ordenar (fórmula no 02-TRD §7)
  ganho?: string                     // "ganha ~+8 de desempenho no celular" / "Economia estimada de 27 KiB"
  baseLegal?: string                 // "LGPD art. 8º" / "Decreto 7.962/2013 art. 2º"
  lugares: Lugar[]                   // no máximo 10 (LIMITE_LUGARES)
  outrosLugares?: number             // quantos ficaram de fora ("…e mais N")
  detalhes?: string[]                // o que o teste mediu, quando não há elemento nem arquivo ("Execução de scripts: 1.157 ms")
  paginasAfetadas: number            // desempate na ordem e número no cartão
  textoIA: string
  estado: 'falha' | 'atencao' | 'naoConferido'
}
type Lugar =
  | { tipo: 'pagina'; endereco: string; perfil?: 'celular' | 'computador'; seletor?: string
      recurso?: string               // arquivo do site envolvido (script, imagem, fonte)
      trecho?: string
      motivo?: string }              // por que o elemento falhou (ex.: cores e proporção do contraste, em inglês, vindo do axe)
  | { tipo: 'arquivo'; caminho: string; linha?: number; trecho?: string }   // caminho relativo ao repo
```
O mesmo lugar medido no celular e no computador vira um só, sem `perfil`.

**Itens do Lighthouse (Etapa 2)**: viram `Ajuste` as auditorias das 4 categorias com nota abaixo de 0,9, menos as medidas (com curva de nota), as do grupo escondido, as informativas, manuais e as que não se aplicam. No desempenho, `impacto` = pontos que a nota sobe se a economia por medida (`metricSavings`) se confirmar, pela mesma curva log-normal do Lighthouse, limitado ao que falta para 100; nos outros blocos, peso da auditoria ÷ soma dos pesos × 100 × (1 − nota). Gravidade: ≥ 5 pontos alta, ≥ 1 média, senão baixa. No desempenho, "falha" só quando devolve pelo menos 1 ponto. Os motivos do cache de voltar/avançar que vêm do próprio navegador de teste (desligado por linha de comando) são descartados. Títulos e explicações vêm do Lighthouse em português; `pacotes/textos` pode trocar o título e acrescentar uma dica por auditoria.

`trecho`, `motivo`, `detalhes` e `recurso` passam por limpeza: valores que parecem segredo viram `••••` (nos endereços, só os parâmetros sensíveis, como `token=`), e trechos são cortados em 300 caracteres. Nos achados de segurança, o valor da chave aparece só como os primeiros 8 caracteres + `…` e o serviço provável (`servicoProvavel: 'OpenAI'`); o valor inteiro nunca é gravado em `resultado.json`, relatório, histórico ou registros.

`ctx` da segurança traz também: lista de scripts e `.map` baixados de cada página (só o texto, apagado ao fim da análise) e as respostas dos endereços da lista de arquivos expostos (código de resposta + primeiros 512 bytes).

## 4. Como uma regra é escrita

```ts
export default defineRegra({
  id: 'cdc.identificacao',
  bloco: 'cdc',
  modo: 'superficie',
  gravidade: 'alta',
  baseLegal: 'Decreto 7.962/2013 art. 2º, I e II',
  quandoAplica: (ctx) => ctx.paginas.some((p) => p.temPreco),
  conferir: async (ctx) => {
    // devolve [] se cumpre, ou uma lista de achados { estado, lugares, detalhes }
  },
  textoIA: 'regras.cdc.identificacao.textoIA',   // chave em textos/pt-BR.json
})
```
`ctx` (contexto) traz: páginas visitadas (texto visível, links, HTML do rodapé, cabeçalhos HTTP, pedidos de rede antes de qualquer clique, cookies gravados), resultado do Lighthouse e do axe, e no modo completo a lista de arquivos do repo com leitura sob demanda.

Toda regra nova vem com teste: uma página em `exemplos/` que falha e outra que cumpre.

## 5. Modelo do texto para a IA

Montado a partir dos textos com as informações do achado:
```
No meu site {site}, a ferramenta Raio-X encontrou: {titulo}.
Onde: {lugares, um por linha}.
{O que o teste mediu: detalhes, um por linha — quando houver}
Por que importa: {explicacao}{ — base legal: baseLegal}.
{Mais detalhes: saibaMais — quando houver}
O que eu preciso: corrija esse problema no meu projeto sem mudar o comportamento do resto.
Explique o que mudou e como conferir que deu certo.
{dica específica da regra, quando houver}
```
O texto nunca leva cookies, chaves ou trechos com segredo.

## 6. Provedores de IA

```ts
type ConfigIA = {
  id: string                // nome dado pela pessoa, ex.: "minha-claude"
  tipo: 'anthropic' | 'openai-compativel' | 'gemini'
  endereco?: string         // obrigatório no compatível; padrões conhecidos preenchidos
  modelo: string
  // a chave NÃO fica aqui: fica em chaves-ia.bin, criptografada
}
interface Provedor {
  pedir(mensagens: Mensagem[], opcoes: { maxTokens: number; sinal: AbortSignal }): Promise<string>
}
```
Endereços conhecidos do tipo compatível (preenchidos sozinhos, editáveis): OpenAI, Groq, OpenRouter, DeepSeek, Mistral, Together, Ollama (`http://localhost:11434/v1`), LM Studio (`http://localhost:1234/v1`). Os endereços exatos são conferidos na Etapa 7, na documentação de cada provedor.

Resposta pedida à IA: JSON com `achados: [{ bloco, titulo, explicacao, gravidade, baseLegal?, caminho, linha?, textoIA }]`. O núcleo:
1. descarta o que não é JSON válido (tenta 1 vez de novo pedindo só o JSON);
2. descarta achados com arquivo que não existe ou linha fora do arquivo;
3. marca tudo como `origem: 'ia'`.

Pedidos grandes são divididos por bloco (cookies/LGPD, acessibilidade, consumidor, segurança) para caber no limite de cada modelo; o tamanho máximo por pedido é configurável.

## 7. Mensagens entre a tela e o núcleo (app)

Canal fechado via `contextBridge` (a tela só enxerga `window.raiox`):

| Mensagem | Direção | Conteúdo |
|---|---|---|
| `analisar` | tela → núcleo | `PedidoAnalise` → devolve id da análise |
| `andamento` | núcleo → tela | `{ id, etapa, pagina?, total?, restanteSeg? }` |
| `parar` | tela → núcleo | `{ id }` |
| `resultado` | núcleo → tela | `{ id, caminho }` (a tela lê o JSON salvo) |
| `entrar` / `jaEntrei` / `apagarSessao` / `estadoSessao` | ida e volta | `{ site }` → `EstadoSessao` |
| `descobrirPaginas` | ida e volta | `{ site, opcoes }` → `PaginaEncontrada[]` |
| `prepararEnvioIA` | ida e volta | `{ repo, provedor }` → `PrevisaoEnvio` |
| `iaListar` / `iaSalvar` / `iaApagar` / `iaTestar` | ida e volta | `ConfigIA` (+ chave só na ida do salvar) |
| `historico` | ida e volta | `{ site? }` → lista de análises |
| `historicoApagar` | tela → núcleo | `{ site, id? }` (sem id = site inteiro; tela já confirmou) |
| `prepararNavegador` | ida e volta | baixa o Chromium na primeira vez; manda `andamento` com bytes baixados/total |
| `exportar` | ida e volta | `{ id, formato }` → caminho |
| `escolherPasta` | ida e volta | abre o seletor do Windows → caminho |
| `apagarTudo` | tela → núcleo | sem conteúdo (tela já confirmou) |

O núcleo confere tudo que chega (tipos, endereço, pasta existe) mesmo vindo da própria tela.

## 8. Criptografia

- Chave mestra aleatória de 32 bytes, criada na primeira execução e guardada no cofre do Windows (app: `safeStorage`; linha de comando: `@napi-rs/keyring`, entrada "Raio-X").
- `sessoes/*.bin` e `chaves-ia.bin`: AES-256-GCM com nonce aleatório por gravação.
- **Ponto a decidir na Etapa 4**: o `safeStorage` do Electron e o cofre usado pela linha de comando precisam ler a mesma chave para o app e a linha de comando compartilharem sessões. Se não der de forma simples, cada um guarda as suas e o README explica.

## 9. Linha de comando — saída e códigos

- Sem `--json`: resumo colorido em português (notas, blocos, 10 primeiros ajustes); sem cor com `--sem-cor`, `NO_COLOR` ou fora do terminal.
- `--json <arquivo>`: `Resultado` completo. **`--json` sem arquivo** (decidido na Etapa 3): o `Resultado` sai na tela e o resumo, o andamento e os caminhos vão para a saída de erros — é o que a skill usa. `--saida`: HTML (PDF chega com o app, Etapa 8). `--textos`: arquivo Markdown de textos para IA.
- Toda análise também fica guardada em `%APPDATA%\Raio-X\analises\<site>\<AAAAMMDD-HHMMSS>\` (`RAIOX_DADOS` troca a pasta). `--bruto` guarda junto o relatório original do Lighthouse.
- Outras opções: `--perfil celular|computador|ambos`, `--precisao`, `--local` (endereços do próprio PC). Endereço sem protocolo ganha `https://` (`http://` para localhost e números).
- Opções e comandos das próximas etapas (`entrar`, `sessoes`, `--com-login`, `--paginas`, `--completo`, `--repo`, `--ia`) respondem "chega na Etapa N"; `--sem-ia` e `--sou-dono` são aceitas sem efeito.
- Códigos de saída: 0 ok; 1 erro; 2 análise feita mas abaixo do limite pedido por `--minimo-desempenho 90` (pronto para uso futuro em testes automáticos).

## 10. Skill do Claude (`skill/raiox/SKILL.md`)

- Descrição em português e inglês (para o Claude reconhecer pedidos nas duas línguas), corpo em português.
- Passos: conferir instalação → rodar `raiox` com `--json` → ler o `Resultado` → explicar → no completo, ler o repositório e produzir achados no mesmo formato do §6 → oferecer corrigir, perguntando antes.
- Referências: lista das regras (gerada do código), formato do `Resultado`, como fazer login.
- Instalação: pasta copiada ou ligada em `~/.claude/skills/raiox`, como as skills MRI.
