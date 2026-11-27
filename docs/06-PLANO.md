# 06 — PLANO: etapas de implementação

> Estado: **rascunho para aprovação do dono** — 26/11/2026.
> Cada etapa termina com conferência própria. "Compilou" não é teste: cada etapa separa **validação de arquivo** (testes automáticos) de **validação de uso** (rodar de verdade contra um site).

## Etapa 0 — Repositório e documentos (esta)
- Repositório público `raiox` no GitHub do dono, com LICENSE (GPL-3.0), README e os 6 documentos.
- **Feito quando**: dono aprova os documentos; repositório criado com eles (primeiro envio aprovado pelo dono).

## Etapa 1 — Esqueleto e medição pública
- pnpm com espaços de trabalho, TypeScript, Vitest, conferência automática no GitHub (testes a cada envio).
- `nucleo/medir`: Playwright abre o Chromium com porta de depuração; Lighthouse mede celular e computador; 4 notas + 6 medidas no formato `Resultado`.
- Fixar versões de Lighthouse e Playwright; conferir se a medida "Pronto para tocar" existe.
- **Conferir**: teste automático com página de exemplo local; rodar contra server.playdravix.com e comparar com o PageSpeed (até 5 pontos de diferença).

## Etapa 2 — "O que ajustar" e relatório
- Conversão das oportunidades/auditorias do Lighthouse em `Ajuste`, com lugar e ganho; fórmula de impacto; textos para IA.
- Relatório HTML, arquivo Markdown de textos e JSON.
- **Conferir**: colar 3 textos gerados no Claude e ver se a correção sugerida faz sentido para o problema.
- **Feito em 26/11**: 42 testes (página de exemplo com problemas de propósito, relatório aberto no navegador, limpeza de segredos). Rodado num site real nosso. Conferência dos textos contra o código desse site: o de contraste leva direto à classe e à variável de cor certas (o seletor + as cores e a proporção vindas do axe bastam); o de JavaScript legado leva ao `browserslist`; o de JavaScript não usado aponta um arquivo de nome embaralhado — a dica passou a indicar o analisador do empacotador. Limite conhecido: em PC lento, os itens de "trabalho da thread principal" saem inflados (marcados com `*`).

## Etapa 3 — Linha de comando e skill
- Comando `raiox analisar` (superfície) com resumo em português e as saídas.
- `skill/raiox/SKILL.md` + instruções de instalação.
- **Conferir**: a skill instalada responde "faz um raio-x do server.playdravix.com" com o resultado certo.
- **Feito em 26/11**: pacote `pacotes/cli` (comando `raiox`, roda o TypeScript pelo tsx; versão compilada fica para a Etapa 9), `scripts/instalar.mjs` (comando na pasta global do npm e skill ligada em `~/.claude/skills/raiox`), skill em `skill/raiox`. O núcleo passou a carregar Lighthouse e Playwright só na hora de medir: `raiox versao` caiu de ~40 s para ~1 s num PC fraco. Testes rodam um arquivo por vez (no PC fraco, em paralelo derrubavam a nota de desempenho e estouravam o prazo). Conferência: a skill apareceu no Claude Code e o raio-x do Street Server rodou de outra pasta com o JSON e o resumo certos. O `*` de PC lento ficou só nos ganhos em pontos (economia em bytes não depende do PC).

## Etapa 4 — Login e páginas fechadas
- `raiox entrar`, sessão criptografada, cofre do Windows, sessão vencida, descoberta de páginas com a lista de palavras perigosas e limite de velocidade.
- Decidir o compartilhamento de sessão entre app e linha de comando (05-BACKEND §8).
- **Conferir**: entrar no Street Server com a conta de teste; descobrir e medir ≥ 10 páginas fechadas; conferir no registro que nenhum endereço perigoso foi aberto; conferir que o arquivo da sessão não é legível sem o cofre.
- **Feito em 27/11 (parte automática)**: `src/navegar/` (cofre trocável, sessão AES-256-GCM com o host como dado autenticado, `entrar` que termina com Enter ou ao fechar a janela, descoberta com palavras perigosas, registro e ritmo de 1 página/s); comandos `raiox entrar`, `descobrir`, `sessoes` e `analisar --com-login --paginas N`, todos exigindo `--sou-dono`. Medição logada: o navegador de medição passou a usar perfil temporário (`launchPersistentContext` + `setStorageState`), porque o Lighthouse abre a aba dele no contexto padrão — provado com o site de exemplo (`exemplos/login`), que registra cada pedido: nenhum endereço perigoso foi pedido. Antes de cada página o Raio-X confere se continua logado; depois, se o Lighthouse não foi parar na tela de entrada (`finalDisplayedUrl`). Lição: teste que estoura o prazo deixa o navegador rodando e derruba os seguintes — apagar processos com perfil `raiox-perfil-` antes de repetir.
- **Falta (com o dono)**: conta de teste do Street Server; o dono roda `raiox entrar` e digita a senha; depois descobrir e medir ≥ 10 páginas, revisando a lista antes (salas de voz podem entrar sozinhas: `--evitar`).

## Etapa 5 — Segurança e conferências legais da superfície
- **Segurança no site no ar**: chaves nos scripts e mapas de código, arquivos expostos (`/.env`, `/.git`, cópias do banco), cookies de sessão, conteúdo misto, cabeçalhos; nota de Segurança "parcial" e aviso vermelho.
- Regras de Cookies, LGPD, Acessibilidade (axe-core + Lighthouse, agrupado por WCAG 2.2/eMAG), Defesa do Consumidor, Marco Civil.
- Lista aberta de domínios de rastreio; notas dos blocos; aviso legal.
- Páginas de exemplo que falham e que cumprem cada regra.
- **Conferir**: todos os testes de regra passam; rodar contra o Street Server e uma loja de exemplo e revisar cada achado com o dono (falso positivo vira correção da regra).

## Etapa 6 — Modo completo: segurança do código e do banco + outras regras
- **Segurança**: segredos (código + histórico do git), `.env` versionado, consultas ao banco montadas juntando texto, senha do banco no código e senhas padrão, Supabase sem regras de acesso / chave de serviço exposta, Firebase com regras abertas, dependências com falha conhecida, dados pessoais em registros.
- Outras: registros de acesso, cookies sem consentimento, acessibilidade em JSX/HTML.
- `.raioxignore`.
- **Conferir**: repositório de exemplo com segredo falso plantado (no código e só no histórico), dependência antiga, consulta montada, tabela Supabase sem RLS e regra do Firebase aberta → tudo aparece com `arquivo:linha`; nenhum valor inteiro de chave aparece em `resultado.json`.

## Etapa 7 — Análise inteligente (IA)
- Provedores Anthropic, compatível com OpenAI (OpenAI, Groq, OpenRouter, DeepSeek, Mistral, Together, Ollama, LM Studio) e Gemini.
- Tela/lista "O que vai para a IA", limpeza de segredos, divisão por bloco, validação dos achados.
- Skill: modo completo com o próprio Claude.
- **Conferir**: rodar com pelo menos uma IA paga e uma grátis/local (ex.: Groq ou Ollama); achados inventados (arquivo inexistente) são descartados; nenhuma chave aparece em `resultado.json`, relatório ou registros (busca no texto).

## Etapa 8 — App de computador
- Electron + React + Vite, visual Azul Neon, todas as telas do 04-DESIGN, núcleo em processo separado, mensagens do 05-BACKEND §7.
- Histórico com gráfico e comparação; exportar HTML/PDF.
- **Anotado na Etapa 4**: a recusa sem `souDono` (05-BACKEND §2) hoje está só no comando (`--sou-dono`). Levar a trava para o núcleo (`analisar`/`entrar`/`descobrirPaginas` recusam sem `souDono: true`) antes do app chamar essas funções.
- **Conferir**: fluxos 2, 3, 4 e 5 do 03-FLUXO de ponta a ponta; o próprio app passa no axe-core sem falha alta; nenhuma barra de rolagem visível (conferido pelo estilo calculado de cada área rolável, sem captura de tela).

## Etapa 9 — Instalador e lançamento v0.1
- electron-builder NSIS para Windows; Chromium baixado na primeira execução.
- Conferir se o nome `raiox` está livre no npm para a linha de comando; se não, usar outro nome de pacote (o comando continua `raiox`).
- CONTRIBUTING (como criar regra, provedor e tradução), modelos de problema/pedido no GitHub, tópicos do repositório, versão v0.1.0 nos lançamentos do GitHub.
- **Conferir**: instalar num Windows limpo (ou máquina virtual), rodar uma análise com login e uma completa.

## Etapa 10 — Teste final no nosso sistema (pedido do dono em 26/11)
- Rodar o Raio-X no Street Server: superfície sem login, superfície com login (páginas fechadas) e completo no repositório `street-server`, com e sem IA.
- Comparar as 4 notas com o speed.upteam/PageSpeed; revisar com o dono a nota de Segurança e cada achado de segurança (falso positivo vira correção da regra; falha real vira tarefa de correção no Street Server, com troca de chave se for o caso).
- O relatório desse teste **não vai para o repositório público** (tem dados do nosso sistema); fica só no PC.
- Ajustes do que o dono apontar.

## Antes de cada envio público (todas as etapas)
- Conferir que nada da lista "nunca abrir" (memória `repos-publicos-oss`) entrou: nada do street-base, street_store, bot, instalador, migração, skill street-roleplay, backups.
- Nenhum segredo, IP de servidor, ID de jogador, e-mail pessoal ou relatório de análise real com dados do Street nos arquivos nem no histórico (busca com grep e, quando disponível, gitleaks).
- Exemplos usam `example.com` / sites de exemplo locais.
- Mensagens de envio em português.

## Riscos
| Risco | Como lidar |
|---|---|
| Notas variam a cada rodada | Opção "precisão" (mediana de 3) e aviso na tela |
| Regra legal com falso positivo | Estado "atenção" em vez de "falha" quando a conferência é por texto; aviso legal sempre visível |
| Site com proteção contra robôs | Mensagem clara; o dono do site pode liberar |
| IA inventa achados | Validação de arquivo/linha e etiqueta "achado pela IA" |
| Instalador sem assinatura | README explica o aviso do SmartScreen; assinatura fica para depois |
| Mudanças no Lighthouse | Versão fixada; atualização é tarefa própria com comparação de notas |
