# 02 — TRD: como o Raio-X é construído

> Estado: **rascunho para aprovação do dono** — 26/11/2026. Versões de pacotes serão fixadas na Etapa 1, conferindo a mais recente estável de cada um.

## 1. Peças e tecnologias

| Peça | Tecnologia | Licença | Papel |
|---|---|---|---|
| Notas e medidas | **Lighthouse** (pacote `lighthouse`, Node) | Apache-2.0 | 4 notas, medidas, oportunidades de melhoria |
| Navegador e login | **Playwright** (`playwright-core` + Chromium próprio do Playwright) | Apache-2.0 | Abre o navegador, janela de login, descobre páginas, guarda a sessão |
| Acessibilidade extra | **axe-core** | MPL-2.0 | Regras de acessibilidade além das do Lighthouse (base da conferência LBI) |
| Núcleo, linha de comando | **Node 22 LTS + TypeScript** | — | Toda a lógica, sem interface |
| App de computador | **Electron** + **React + Vite** | MIT | Painel; roda o núcleo num processo separado |
| Cofre de chaves | **Electron `safeStorage`** (no app) e **`@napi-rs/keyring`** (na linha de comando) — ambos usam o cofre do Windows | MIT | Guarda a chave que criptografa sessões e chaves de IA |
| PDF | `printToPDF` do próprio Chromium | — | Exporta o relatório |
| Instalador | **electron-builder** (NSIS, Windows) | MIT | `.exe` de instalação |
| Testes | **Vitest** + páginas de exemplo locais | MIT | Testes automáticos de regras e do núcleo |

Todas as licenças são compatíveis com GPL-3.0.

## 2. Organização do repositório (um só repositório, pacotes separados)

```
raiox/
├─ LICENSE (GPL-3.0)  README.md  CONTRIBUTING.md  CODE_OF_CONDUCT.md  SECURITY.md
├─ docs/                       ← estes 6 documentos
├─ pacotes/
│  ├─ nucleo/                  ← motor: Lighthouse, Playwright, regras, IA, relatório
│  │  ├─ src/medir/            ← roda o Lighthouse (celular e computador)
│  │  ├─ src/navegar/          ← login, sessão, descoberta de páginas
│  │  ├─ src/regras/           ← uma pasta por bloco: cookies, lgpd, lbi, cdc, marco-civil, codigo
│  │  ├─ src/ia/               ← provedores de IA e montagem dos pedidos
│  │  ├─ src/ajustes/          ← junta tudo na lista "O que ajustar" e gera os textos para IA
│  │  └─ src/relatorio/        ← HTML/PDF/JSON e o arquivo de textos
│  ├─ cli/                     ← comando `raiox`
│  ├─ app/                     ← Electron (principal + tela React)
│  └─ textos/                  ← pt-BR.json (todas as frases; base para tradução)
├─ skill/raiox/                ← SKILL.md + referências da skill do Claude
└─ exemplos/                   ← sites de teste locais (com problemas de propósito)
```

Gerenciador: **pnpm** com espaços de trabalho (o mesmo do Street Server).

## 3. Como a medição funciona

1. O Playwright abre o Chromium com uma **porta de depuração** (`--remote-debugging-port`).
2. Se houver sessão salva, ela é colocada nesse navegador (cookies + armazenamento local).
3. O Lighthouse se conecta na mesma porta e mede a página com `disableStorageReset: true` (para não apagar o login).
4. Roda duas vezes por página: perfil **celular** (tela pequena, rede e processador mais lentos, igual ao padrão do Lighthouse) e perfil **computador**.
5. Opção "precisão": 3 rodadas por perfil e usa a do meio (mediana), porque o Lighthouse varia a cada rodada.
6. Na mesma visita, o núcleo grava os pedidos de rede (para a regra de cookies/rastreadores) e roda o axe-core.

Medidas usadas (nomes do Lighthouse → nome no Raio-X): `first-contentful-paint` → Primeira coisa na tela; `largest-contentful-paint` → Maior elemento na tela; `total-blocking-time` → Tempo bloqueado; `cumulative-layout-shift` → Tela pulando; `speed-index` → Índice de velocidade; `interactive` → Pronto para tocar (informativo, não entra na nota no Lighthouse atual — conferir na Etapa 1 se a medida ainda existe na versão escolhida; se não existir, ela sai da tela).

## 4. Login e páginas fechadas

- **Login na mão**: o núcleo abre uma janela visível do Chromium no endereço de entrada. O desenvolvedor entra como sempre (senha, Google, Discord, código, 2 fatores). Quando ele clica "Pronto" no app, o Playwright salva a sessão (cookies + armazenamento local).
- **Sessão guardada**: criptografada (AES-256-GCM) num arquivo em `%APPDATA%\Raio-X\sessoes\<site>.bin`. A chave fica no cofre do Windows. A senha nunca passa pelo Raio-X.
- **Sessão vencida**: se a página de teste redirecionar para o login, o Raio-X avisa "sessão vencida, entre de novo" em vez de medir a tela de login.
- **Descoberta de páginas**: depois do login, visita o endereço inicial e junta os links do **mesmo site** (até 50 por padrão, até 3 níveis). O desenvolvedor confere e marca quais testar.
- **Segurança da navegação** (obrigatório):
  - só abre endereços (nunca clica em botões nem envia formulários);
  - pula links com palavras perigosas: sair, logout, signout, excluir, deletar, apagar, remover, cancelar, pagar, comprar, checkout, desinscrever (lista nos textos, ampliável);
  - no máximo 1 página por segundo;
  - confirmação obrigatória "este site é meu ou tenho autorização" antes de login e modo completo.

## 5. Regras (conferências)

Cada regra é um arquivo com: identificador, bloco (cookies/lgpd/lbi/cdc/marco-civil/codigo), base legal (artigo), modo (superfície/completo), gravidade (alta/média/baixa), função de conferência e modelo de texto para a IA. Contribuir = criar um arquivo novo + um teste com página de exemplo.

Exemplos de regras da superfície:
- **cookies.rastreador-antes-do-aceite**: grava os pedidos de rede antes de qualquer clique; se houver pedido a domínios de rastreio conhecidos (lista aberta no repositório) → falha.
- **cookies.recusar-dificil**: existe "aceitar" sem "recusar"/"configurar" no mesmo aviso → atenção.
- **lgpd.politica-privacidade**: link com "privacidade" no rodapé ou menu, e a página abre → cumpre.
- **cdc.identificacao**: procura CNPJ (formato `00.000.000/0000-00` com dígito verificador válido) ou CPF e endereço no rodapé/páginas "sobre"/"termos" → falha se não achar em loja (página com preço).
- **cdc.arrependimento**: em página com preço/carrinho, procura texto sobre 7 dias / arrependimento → atenção se não achar.
- **marco-civil.cabecalhos**: confere HTTPS, `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`.
- **lbi.***: resultado do axe-core + acessibilidade do Lighthouse, agrupados por critério WCAG 2.2 / eMAG.

Regras do modo completo (lendo a pasta do repositório, sem IA):
- **codigo.segredos**: procura chaves e senhas no código e no histórico do git (padrões abertos, no estilo do gitleaks); mostra só o começo do valor.
- **codigo.dependencias**: roda `npm audit --json` / `pnpm audit --json` (ou equivalente do gerenciador achado) quando disponível.
- **codigo.dados-pessoais-em-log**: CPF, e-mail ou telefone indo para `console.log`/logs.
- **codigo.registros-de-acesso** (Marco Civil art. 15): procura guarda de IP + data/hora de acesso; se não achar → "não deu para conferir, verifique".
- **codigo.cookies-sem-consentimento**: gravação de cookie de rastreio fora do fluxo de consentimento.
- **codigo.acessibilidade-jsx**: imagens sem `alt`, botões sem texto em arquivos React/Vue/Svelte/HTML.

Pastas sempre ignoradas: `node_modules`, `.git` (exceto na busca de segredos no histórico), `dist`, `build`, `.next`, arquivos acima de 1 MB.

## 6. Notas dos blocos legais
Nota = 100 − soma das penalidades (alta 25, média 10, baixa 3), mínimo 0. "Não deu para conferir" não penaliza, mas aparece. Fórmula num único arquivo, fácil de ajustar por contribuição.

## 7. Ordem da lista "O que ajustar"
Pontuação de impacto de cada item:
- itens de desempenho: economia estimada pelo Lighthouse (milissegundos) convertida em pontos de nota;
- outras categorias do Lighthouse: peso da auditoria na nota × (1 − nota da auditoria);
- itens legais e de código: gravidade (alta 30, média 15, baixa 5).
Empate: vale primeiro o que aparece em mais páginas.

## 8. Análise inteligente (IA)
- **Provedores** (um arquivo cada, interface comum `pedir(mensagens) → texto`):
  - Anthropic (Claude);
  - **compatível com OpenAI** — cobre OpenAI, Groq, OpenRouter, DeepSeek, Mistral, Together, Ollama e LM Studio (só muda o endereço e o modelo);
  - Google Gemini.
- A chave é colada no app, guardada criptografada no cofre do Windows, e **nunca** vai para relatórios, histórico ou registros.
- **Antes de enviar código para a IA**: o app mostra quais arquivos vão e quantos caracteres; tira valores que parecem segredo; respeita `.gitignore` e um arquivo `.raioxignore`.
- O que vai para a IA: resumo da estrutura do projeto + arquivos mais relevantes para cada bloco (rotas, cadastro, cookies, pagamento, autenticação) + os achados das regras fixas. Ela devolve achados novos num formato JSON fixo (problema, arquivo, linha, gravidade, base legal, texto para IA), que o núcleo confere (arquivo existe, linha existe) antes de mostrar.
- **Pela skill**: no Claude Code, a skill roda o núcleo sem IA (`raiox analisar --sem-ia --json`) e o próprio Claude lê o repositório e faz a parte inteligente, seguindo o mesmo formato.

## 9. Onde ficam os dados (só no PC)
```
%APPDATA%\Raio-X\
├─ configuracoes.json
├─ sessoes\<site>.bin          (criptografado)
├─ chaves-ia.bin               (criptografado)
└─ analises\<site>\<data-hora>\
     ├─ resultado.json          (tudo da análise)
     ├─ lighthouse-*.json       (relatórios brutos, opcional)
     └─ relatorio.html
```
Nada é enviado para servidor do projeto (não existe servidor). Sem telemetria.

## 10. Requisitos e limites
- Windows 10/11 64 bits para o app; Node 22 para a linha de comando.
- O Chromium do Playwright é baixado na primeira execução (~150 MB) — o app avisa e mostra o progresso.
- Um teste de 1 página nos 2 perfis: ~30–60 s. 20 páginas: ~15–20 min (o app mostra o andamento e permite parar).
- Instalador sem assinatura digital na v1 → o Windows mostra o aviso do SmartScreen ("Mais informações → Executar assim mesmo"). Assinatura fica para depois.

## 11. Segurança
- O processo do núcleo roda separado da tela (`utilityProcess`); a tela não tem acesso direto ao Node (`contextIsolation`, `sandbox`, sem `nodeIntegration`).
- A tela fala com o núcleo só por um conjunto fechado de mensagens (lista no 05-BACKEND).
- Endereços digitados são conferidos (só `http`/`https`); `file://` e endereços internos do PC só com opção "permitir localhost" (útil para testar o próprio projeto rodando).
- Relatórios exportados não levam cookies nem chaves.
