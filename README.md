# Raio-X

Ferramenta de código aberto que examina o seu site **por fora e por dentro**:

- notas de 0 a 100 em **Desempenho, Acessibilidade, Boas práticas e Busca (SEO)**, para celular e computador;
- medidas de carregamento (primeira coisa na tela, maior elemento, tempo bloqueado, tela pulando, índice de velocidade);
- testa também as **páginas atrás do login** — você entra no seu site numa janela e o Raio-X guarda só a sessão, criptografada, no seu computador;
- nota de **Segurança**: chaves de API expostas no site e no código (inclusive no histórico do git), arquivos que não deviam estar públicos (`.env`, `.git`, cópias do banco), banco de dados pelo código (consultas inseguras, senhas no código, Supabase e Firebase sem regras de acesso) — sem nunca entrar no banco nem tentar invadir nada;
- **modo completo**: lê o repositório do projeto (segurança, dependências com falha, dados pessoais em registros);
- conferência técnica das **leis brasileiras**: Cookies, LGPD, Acessibilidade (LBI), Defesa do Consumidor e Marco Civil;
- lista **"O que ajustar"** ordenada por impacto, cada item com o lugar do problema e um **texto pronto para colar numa IA**;
- análise inteligente com **a sua IA** (Claude, OpenAI, Gemini, Groq, OpenRouter, Ollama e outras, paga ou grátis) — o projeto não tem servidor e não cobra nada.

Três jeitos de usar: **app de computador** (Windows), **linha de comando** (`raiox`) e **skill do Claude Code**.

> **Estado: em construção.** A Etapa 1 (medição das páginas públicas) já funciona pelo script de desenvolvimento abaixo. O que vai ser feito está em [`docs/`](docs/):
> [PRD](docs/01-PRD.md) · [Técnico](docs/02-TRD.md) · [Fluxo](docs/03-FLUXO.md) · [Telas](docs/04-DESIGN.md) · [Núcleo](docs/05-BACKEND.md) · [Plano](docs/06-PLANO.md) · [Conferência](docs/CONFERENCIA.md)

> A conferência das leis é técnica e automática. **Não substitui a análise de um advogado.**

## Instalar (a partir do repositório)

Precisa de Node 22.19+ e pnpm 9.

```
pnpm install
pnpm --filter @raiox/nucleo exec playwright-core install chromium
pnpm instalar-comando   # cria o comando `raiox` (na pasta global do npm, que já está no PATH)
pnpm instalar-skill     # liga a skill do Claude Code em ~/.claude/skills/raiox
```
`pnpm desinstalar` remove os dois (só o que esses comandos criaram). Sem instalar, use `pnpm raiox …` dentro da pasta do repositório.

## Usar

```
raiox analisar meusite.com.br                          # celular e computador
raiox analisar meusite.com.br/loja meusite.com.br/contato --perfil celular
raiox analisar meusite.com.br --precisao               # 3 rodadas por aparelho, usa a do meio
raiox analisar meusite.com.br --saida relatorio.html --textos textos-ia.md --json resultado.json
raiox analisar meusite.com.br --minimo-desempenho 90   # código 2 se ficar abaixo (para testes automáticos)
raiox analisar localhost:3000 --local                  # o seu projeto rodando no PC
raiox ajuda
```

Toda análise fica guardada em `%APPDATA%\Raio-X\analises\<site>\<data>\`:
- `relatorio.html`: notas, medidas e a lista **O que ajustar**, do maior impacto ao menor, com botões para copiar os textos;
- `textos-ia.md`: um texto pronto para colar numa IA para cada item;
- `resultado.json`: tudo em formato de dados.

**Com o Claude Code**: depois de `pnpm instalar-skill`, peça "faz um raio-x do meusite.com.br". O Claude roda o Raio-X, explica as notas e oferece corrigir os itens no seu código, perguntando antes.

Se o Chromium baixado não abrir, o Raio-X usa o Edge ou o Chrome do seu PC. Em computador lento, a nota de desempenho no celular sai mais baixa que no PageSpeed do Google; o Raio-X avisa e marca essas notas com `*`.

## Desenvolver

```
pnpm tipos && pnpm teste
```

## Usar com responsabilidade

O teste com login e o modo completo exigem confirmar que o site é seu ou que você tem autorização. O Raio-X só abre páginas: nunca clica em botões, nunca envia formulários e pula links como "sair", "excluir" e "pagar".

## Contribuir

Contribuições são bem-vindas — principalmente regras novas (cada regra é um arquivo com um teste), provedores de IA e traduções. O guia completo chega junto com o código (Etapa 9 do plano). Até lá, abra um *issue* com sua ideia.

## Créditos

Inspirado na ideia do [speed.upteam.com.br](https://speed.upteam.com.br/), com texto, visual e código próprios. Usa [Lighthouse](https://github.com/GoogleChrome/lighthouse), [Playwright](https://github.com/microsoft/playwright) e [axe-core](https://github.com/dequelabs/axe-core).

## Licença

[GPL-3.0](LICENSE).
