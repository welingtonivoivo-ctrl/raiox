# 01 — PRD: Raio-X (o que é e para quem)

> Estado: **rascunho para aprovação do dono** — 26/11/2026.
> Decisões vindas da entrevista com o dono (11 perguntas, 26/11/2026). Nada aqui foi implementado ainda.

## 1. Em uma frase

O **Raio-X** é uma ferramenta de código aberto que examina um site por fora (velocidade, acessibilidade, boas práticas, busca) **e por dentro** (as páginas atrás do login e o próprio código do projeto), confere pontos das leis brasileiras (LGPD, cookies, acessibilidade, Defesa do Consumidor, Marco Civil) e devolve uma lista do que ajustar, cada item com um texto pronto para colar numa IA.

## 2. De onde veio

O dono testou o Street Server no speed.upteam.com.br e gostou: notas de 0 a 100, medidas de carregamento e a lista "O que ajustar" com textos para a IA. Faltava o que ele mais queria: **testar as páginas que ficam atrás do login** e **olhar o código do projeto**. O Raio-X nasce inspirado na ideia, mas com texto, visual e código próprios (nada é copiado do speed.upteam).

## 3. Para quem

- **Desenvolvedor que testa o próprio site** (público principal). Ele é dono do site e do código, por isso pode fazer login e entregar o repositório.
- **Equipe do Street** (primeiro usuário real: server.playdravix.com).
- **Quem quiser contribuir** no GitHub (regras novas, traduções, provedores de IA).

## 4. Os dois modos de análise

| Modo | O que olha | Precisa de |
|---|---|---|
| **Superfície** | O site no ar, igual ao speed.upteam: páginas públicas **e** páginas atrás do login | Endereço do site; login opcional |
| **Completo** | Tudo da superfície **mais** o repositório do projeto (código, dependências, configurações) | Endereço + pasta do repositório no PC |

## 5. O que o Raio-X entrega

### 5.1 Notas de 0 a 100, para celular e para computador
- Desempenho
- Acessibilidade
- Boas práticas
- Busca (SEO)

Cores das notas: verde 90–100, laranja 50–89, vermelho 0–49.

### 5.2 Medidas de carregamento (celular e computador)
- Primeira coisa na tela
- Maior elemento na tela
- Tempo bloqueado
- Tela pulando
- Índice de velocidade
- Pronto para tocar (informativo)

Cada medida mostra o valor e se está boa, média ou ruim.

### 5.3 Conferência das leis brasileiras
Cinco blocos, cada um com nota de 0 a 100 e lista de pontos (cumpre / atenção / falha / não deu para conferir):

1. **Cookies** — aviso que espera o "aceito" antes de carregar rastreadores; opção de recusar tão fácil quanto aceitar; lista dos cookies.
2. **LGPD** — política de privacidade acessível, contato do encarregado, dados enviados sem HTTPS, dados pessoais e segredos expostos no código (modo completo).
3. **Acessibilidade (LBI, art. 63)** — com base no padrão WCAG 2.2 e no eMAG: contraste, textos alternativos, teclado, rótulos de formulário.
4. **Defesa do Consumidor** (CDC + Decreto 7.962/2013 do comércio eletrônico) — CNPJ ou CPF e razão social, endereço, canal de atendimento, preço total claro, direito de arrependimento de 7 dias, termos de uso.
5. **Marco Civil + segurança** — guarda de registros de acesso (modo completo), cabeçalhos de segurança, HTTPS, pacotes com falha conhecida (modo completo). Conferir se o site aceita senha fraca fica de fora: exigiria enviar formulários, e o Raio-X nunca envia formulários.

O relatório sempre avisa: **"Conferência técnica automática. Não substitui a análise de um advogado."**

### 5.4 Lista "O que ajustar"
- Ordenada por impacto (o que mais melhora a nota ou o risco legal vem primeiro).
- Cada item traz: o problema em linguagem simples, **o lugar** (página e elemento, ou arquivo e linha no modo completo), quanto ganha ao corrigir e **um texto pronto para colar numa IA**.
- Botão "copiar todos os textos" gera um único texto com tudo.

### 5.5 Análise inteligente do código (modo completo)
- Regras fixas que rodam sem IA e de graça.
- Parte inteligente feita **pela IA do próprio desenvolvedor**: pela skill no Claude Code dele, ou por uma chave de qualquer IA (paga ou grátis: Claude, OpenAI, Gemini, Groq, OpenRouter, DeepSeek, IA local com Ollama/LM Studio etc.) colada no app.
- O Raio-X não tem servidor próprio e não paga nem cobra IA.

### 5.6 Histórico e relatórios
- Cada análise fica guardada no PC: gráfico da evolução das notas e "melhorou / piorou desde a última".
- Exportar relatório em HTML e PDF, e um arquivo com todos os textos para a IA.

## 6. As três partes do projeto

1. **Skill do Claude** (`raiox`) — roda as análises a pedido ("analisa meu site", "faz um raio-x do repositório") e, no modo completo, o próprio Claude faz a parte inteligente.
2. **App de computador** (Electron, Windows primeiro) — painel com visual Azul Neon do Street Server.
3. **Repositório público no GitHub** (`raiox`, licença GPL-3.0) — para outras pessoas contribuírem; também traz a linha de comando `raiox`.

## 7. Decisões do dono (entrevista de 26/11/2026)

| # | Pergunta | Decisão |
|---|---|---|
| 1 | Motor | Lighthouse (notas) + Playwright (login e navegação), os dois de licença aberta |
| 2 | App de computador | Electron |
| 3 | Login | Na mão, numa janela; só a sessão fica guardada, criptografada, no PC. Nunca a senha |
| 4 | Análise inteligente | IA do próprio desenvolvedor (skill ou chave de qualquer IA, paga ou grátis) + regras fixas |
| 5 | Licença | GPL-3.0 |
| 6 | Nome | Raio-X (repositório `raiox`) |
| 7 | Idioma | Português, com os textos num arquivo separado, pronto para tradução |
| 8 | Leis | Cookies, LGPD, Acessibilidade (LBI), Defesa do Consumidor, Marco Civil + segurança |
| 9 | Guardar | Histórico no PC + relatório para baixar (HTML/PDF) |
| 10 | Sistemas | Windows primeiro; Linux e Mac depois |
| 11 | Visual | Azul Neon do Street Server |

## 8. Fora da primeira versão
- Testes agendados e no GitHub a cada envio (fica para depois — opção 3 da pergunta 9).
- Instaladores de Linux e Mac (a linha de comando e a skill já funcionam neles).
- Servidor na internet ou conta de usuário: o Raio-X é 100% local.
- Testar sites de terceiros com login: o login e o modo completo exigem confirmar que o site é seu ou que você tem autorização.

## 9. Como saber que deu certo
1. Notas de desempenho/acessibilidade/boas práticas/busca do Raio-X ficam a até 5 pontos do PageSpeed do Google na mesma página e no mesmo momento (o Lighthouse varia um pouco a cada rodada).
2. Testa ao menos 10 páginas atrás do login do server.playdravix.com sem clicar em nada perigoso (sair, excluir, pagar).
3. No modo completo, encontra um segredo de teste plantado de propósito num repositório de exemplo.
4. Texto pronto para a IA, colado no Claude, gera uma correção que melhora a nota daquele item.
5. Nenhuma barra de rolagem visível no app.
