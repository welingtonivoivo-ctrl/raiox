# 03 — FLUXO: passo a passo de quem usa

> Estado: **rascunho para aprovação do dono** — 26/11/2026.

## 1. Primeira vez no app

1. Instala o `Raio-X-Instalador.exe` (aviso do SmartScreen na v1 — o README explica).
2. Abre o app. Tela de boas-vindas: "O Raio-X examina o seu site por fora e por dentro. Tudo fica no seu computador."
3. O app baixa o navegador de teste (~150 MB) com barra de progresso. Sem internet → mensagem clara e botão "tentar de novo".
4. Vai para a tela **Nova análise**.

## 2. Análise de superfície (sem login)

1. Cola o endereço (ex.: `https://meusite.com.br`).
2. Escolhe **Superfície**. Marca: celular, computador (os dois marcados por padrão) e "precisão" (3 rodadas, desmarcado).
3. Clica **Analisar**.
4. Andamento: "Abrindo o navegador → Medindo no celular → Medindo no computador → Conferindo a segurança → Conferindo as leis → Montando a lista".
5. Abre o **Resultado**:
   - alternador Celular / Computador;
   - 5 círculos de nota (Segurança com a etiqueta "parcial (sem o código)" neste modo);
   - 6 medidas;
   - 5 blocos legais com nota;
   - lista "O que ajustar".
6. Em cada item: abre o detalhe (lugar do problema, quanto ganha) e clica **Copiar texto para IA**.
7. Botões no topo: **Copiar todos os textos**, **Baixar relatório (HTML / PDF)**, **Analisar de novo**.

## 3. Superfície com páginas atrás do login

1. Na Nova análise, liga **"Testar páginas com login"**.
2. Confirmação obrigatória: "Este site é meu ou tenho autorização para testá-lo." (caixa de marcar).
3. Se não há sessão para esse site → botão **Entrar no site**:
   - abre uma janela do navegador no endereço;
   - a pessoa entra normalmente;
   - volta ao app e clica **Já entrei**;
   - o app confere se a sessão funciona (abre a página inicial e vê se não voltou para o login) e mostra "Sessão salva neste computador".
4. Se já há sessão → mostra "Sessão salva em 25/11 — usar / entrar de novo / apagar".
5. **Descobrir páginas**: o app visita o site logado e lista as páginas achadas (até 50), já sem as perigosas (sair, excluir, pagar...). A pessoa marca quais testar e pode colar endereços a mais.
6. Analisa cada página marcada (celular + computador). Andamento mostra "página 3 de 12".
7. Resultado ganha uma **lista de páginas** à esquerda com a nota de desempenho de cada uma; "O que ajustar" junta os problemas repetidos ("aparece em 9 páginas").
8. Se a sessão vencer no meio: pausa e pede "Entrar de novo"; ao voltar, continua de onde parou.

## 4. Análise completa (com o repositório)

1. Na Nova análise, escolhe **Completo**.
2. Confirmação obrigatória de autorização (igual ao login).
3. Escolhe a **pasta do repositório** no PC.
4. Escolhe a **análise inteligente**:
   - "Sem IA (só regras fixas)";
   - "Minha IA" → escolhe provedor salvo (Claude, OpenAI, Gemini, Groq, OpenRouter, Ollama…) ou **Configurar IA** (provedor, endereço quando precisar, modelo, chave).
5. Se escolheu IA: tela **"O que vai para a IA"** com a lista de arquivos e o tamanho total. Pode desmarcar arquivos. Botão **Concordo, enviar para a minha IA**.
6. Roda: superfície (com ou sem login) → segurança do código e do banco → outras regras do código → IA (se escolhida).
7. Resultado igual ao da superfície, mais:
   - nota de **Segurança** completa (sem a etiqueta "parcial"), com chaves no código e no histórico do git, banco de dados (consultas, senhas, Supabase/Firebase), dependências;
   - bloco **Código** (registros de acesso, cookies sem consentimento, acessibilidade no código);
   - itens com **arquivo:linha** como lugar;
   - etiqueta "achado pela IA" nos itens que vieram da IA (a pessoa sabe o que conferir com mais atenção).

## 5. Histórico

1. Tela **Histórico**: lista de sites; cada site mostra a última nota e a data.
2. Abre um site: gráfico com a evolução das 5 notas e dos blocos legais, e a lista de análises.
3. Abre uma análise antiga: o mesmo resultado de antes, com "comparado à anterior: +6 desempenho, −2 acessibilidade, 3 itens resolvidos, 1 novo".
4. Pode apagar uma análise ou um site inteiro (pede confirmação).

## 6. Pela linha de comando

```
raiox analisar https://meusite.com.br                       # superfície, celular + computador
raiox entrar https://meusite.com.br                         # abre a janela de login e salva a sessão
raiox analisar https://meusite.com.br --com-login --paginas 20
raiox analisar https://meusite.com.br --completo --repo C:\projetos\meusite --ia minha-claude
raiox analisar ... --saida relatorio.html --json resultado.json --textos textos-ia.md
raiox sessoes                                               # lista / apaga sessões
```
A confirmação de autorização na linha de comando é a opção `--sou-dono`; sem ela, login e modo completo não rodam.

## 7. Pela skill do Claude

1. O desenvolvedor pede no Claude Code: "faz um raio-x do meu site" ou "raio-x completo do repositório".
2. A skill confere se o `raiox` está instalado (se não, diz como instalar: `npm i -g raiox` quando publicado, ou pelo repositório).
3. Superfície: roda `raiox analisar <endereço> --json` e explica o resultado em português, com a lista ordenada.
4. Login: pede para o desenvolvedor rodar `raiox entrar <endereço>` (a janela abre para ele) e depois analisa com `--com-login`.
5. Completo: roda `raiox analisar ... --completo --sem-ia --json` e o **próprio Claude** lê o repositório para a parte inteligente, no mesmo formato de achados.
6. Oferece corrigir os itens ali mesmo (afinal, o Claude já é a IA), sempre perguntando antes de mexer.

## 8. Erros e como aparecem

| Situação | O que a pessoa vê |
|---|---|
| Endereço não abre | "Não consegui abrir o site (tempo esgotado / endereço não existe). Confira o endereço." |
| Site bloqueia robôs | "O site recusou o navegador de teste (código 403). Se o site é seu, libere o Raio-X no firewall." |
| Sessão vencida | "Sua sessão venceu. Entre de novo para continuar." |
| Chave de IA inválida | "A IA recusou a chave. Confira a chave em Configurar IA." |
| Limite da IA grátis | "A IA avisou que passou do limite. Tente mais tarde ou troque de provedor." A análise termina sem a parte de IA. |
| Pasta não é repositório | Aceita mesmo assim (só pula a busca de segredos no histórico do git). |
| Parar no meio | Guarda o que já mediu como análise "incompleta". |
| Chave secreta achada no site no ar | Aviso vermelho no topo do resultado: "Achamos uma chave secreta exposta. Troque a chave no serviço agora — só apagar do código não resolve." |
