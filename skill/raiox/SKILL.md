---
name: raiox
description: >-
  Faz um "raio-x" de um site com a ferramenta Raio-X (código aberto, Lighthouse + Playwright): mede desempenho,
  acessibilidade, boas práticas e busca (SEO) no celular e no computador, explica as notas em português e mostra a
  lista "O que ajustar", do maior impacto ao menor, com o lugar de cada problema e um texto pronto para a IA — e
  oferece corrigir no código do projeto, sempre perguntando antes. Use quando pedirem "faz um raio-x do site",
  "testa a velocidade do meu site", "por que meu site está lento", "nota do Lighthouse/PageSpeed", "o que ajustar
  no site", "acessibilidade do site", "SEO do site" ou citarem o Raio-X. Also use for English requests such as
  "x-ray my website", "run a Lighthouse/PageSpeed audit", "why is my site slow", "check my site's performance,
  accessibility or SEO and tell me what to fix".
---

# Raio-X de um site

Responda sempre em português do Brasil, em linguagem simples (a pessoa pode não ser programadora).

## 1. Conferir se o Raio-X está instalado

```
raiox versao
```
Se o comando não existir, explique como instalar (precisa de Node 22.19+ e pnpm 9) e pare:
```
git clone https://github.com/welingtonivoivo-ctrl/raiox
cd raiox
pnpm install
pnpm instalar-comando
pnpm instalar-skill
```
Sem instalar o comando, dá para rodar de dentro da pasta do repositório com `pnpm raiox …`.

## 2. Analisar

```
raiox analisar <endereço> --json --sem-cor
```
- Com `--json` sem arquivo, a saída normal traz **só o JSON** do resultado; o andamento, o resumo e os caminhos dos
  arquivos (`Relatório:`, `Textos para a IA:`, `Dados:`) vêm na saída de erros. Leia as duas.
- Demora: cerca de 30–90 s por página em cada aparelho (bem mais em PC fraco). Rode com prazo de pelo menos 10
  minutos, ou em segundo plano, e avise a pessoa que está medindo.
- O endereço pode vir sem `https://` (`meusite.com.br`): o comando completa sozinho.
- Vários endereços na mesma linha = várias páginas do mesmo site.
- `--perfil celular` (ou `computador`) mede só um aparelho e fica mais rápido; `--precisao` faz 3 rodadas e usa a do
  meio (nota mais estável, 3× mais lento).
- Endereço do próprio computador (`localhost`, `192.168…`) só com `--local`, e só quando for o projeto da pessoa.
- **Ainda não existem** (chegam nas próximas versões): login (`raiox entrar`, `--com-login`), modo completo
  (`--completo`, `--repo`) e IA própria (`--ia`). Se pedirem, diga que ainda não está disponível e faça a análise das
  páginas públicas.
- Só analise sites públicos ou da própria pessoa. O Raio-X só abre páginas: não clica, não envia formulários.

O formato do resultado está em [referencias/resultado.md](referencias/resultado.md).

## 3. Explicar

1. As **4 notas** de cada página, no celular e no computador (90–100 bom, 50–89 médio, 0–49 ruim). Não despeje o JSON.
2. **Avisos**: se `forcaProcessador` < 1000 (aviso "computador lento"), explique que a nota de desempenho no celular
   sai mais baixa que no PageSpeed do Google, porque o teste simula um celular a partir do processador deste PC;
   os itens de desempenho com `*` estão inflados por isso. Sugira comparar no pagespeed.web.dev.
3. **O que ajustar**: os 5 primeiros itens (`ajustes` já vem ordenado), cada um em uma ou duas frases: o que é, onde
   está (`lugares`, `detalhes`) e quanto ganha (`ganho`). Diga quantos itens há no total.
4. Diga onde está o relatório HTML (botões para copiar os textos) e o arquivo de textos para a IA.

## 4. Oferecer corrigir

Se o código do site estiver na pasta aberta, você mesmo é a IA: ofereça corrigir os itens, **perguntando antes de
mexer** em qualquer arquivo. Para achar o lugar no código:
- `seletor` com classes de CSS Modules (`home-module__a1B2c3__titulo`) → arquivo `home.module.css`, classe `.titulo`.
- `motivo` do contraste traz as cores exatas e a proporção pedida → procure a variável de cor no CSS.
- `recurso` com nome embaralhado (`_next/static/chunks/…`) não diz o componente: use o analisador do empacotador
  (`@next/bundle-analyzer`, `rollup-plugin-visualizer`, `source-map-explorer`) ou peça para a pessoa.
- O `textoIA` de cada item já resume o problema, o lugar e a dica: use-o como ponto de partida.

Corrija um item por vez, explique o que mudou e sugira rodar `raiox analisar` de novo para conferir a nota.
Se o site não for da pessoa, não ofereça mexer em código: só explique.

## 5. Cuidados

- Relatórios ficam só no PC da pessoa (`%APPDATA%\Raio-X\analises`). Não publique relatório de site de terceiros.
- O Raio-X apaga dos trechos o que parece senha ou chave (`••••`). Nunca peça a pessoa para colar senhas ou chaves.
