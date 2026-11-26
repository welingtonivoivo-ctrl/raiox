# Raio-X

Ferramenta de código aberto que examina o seu site **por fora e por dentro**:

- notas de 0 a 100 em **Desempenho, Acessibilidade, Boas práticas e Busca (SEO)**, para celular e computador;
- medidas de carregamento (primeira coisa na tela, maior elemento, tempo bloqueado, tela pulando, índice de velocidade);
- testa também as **páginas atrás do login** — você entra no seu site numa janela e o Raio-X guarda só a sessão, criptografada, no seu computador;
- **modo completo**: lê o repositório do projeto (segredos expostos, dependências com falha, dados pessoais em registros);
- conferência técnica das **leis brasileiras**: Cookies, LGPD, Acessibilidade (LBI), Defesa do Consumidor e Marco Civil;
- lista **"O que ajustar"** ordenada por impacto, cada item com o lugar do problema e um **texto pronto para colar numa IA**;
- análise inteligente com **a sua IA** (Claude, OpenAI, Gemini, Groq, OpenRouter, Ollama e outras, paga ou grátis) — o projeto não tem servidor e não cobra nada.

Três jeitos de usar: **app de computador** (Windows), **linha de comando** (`raiox`) e **skill do Claude Code**.

> **Estado: em planejamento.** Ainda não há código. O que vai ser feito está em [`docs/`](docs/):
> [PRD](docs/01-PRD.md) · [Técnico](docs/02-TRD.md) · [Fluxo](docs/03-FLUXO.md) · [Telas](docs/04-DESIGN.md) · [Núcleo](docs/05-BACKEND.md) · [Plano](docs/06-PLANO.md) · [Conferência](docs/CONFERENCIA.md)

> A conferência das leis é técnica e automática. **Não substitui a análise de um advogado.**

## Usar com responsabilidade

O teste com login e o modo completo exigem confirmar que o site é seu ou que você tem autorização. O Raio-X só abre páginas: nunca clica em botões, nunca envia formulários e pula links como "sair", "excluir" e "pagar".

## Contribuir

Contribuições são bem-vindas — principalmente regras novas (cada regra é um arquivo com um teste), provedores de IA e traduções. O guia completo chega junto com o código (Etapa 9 do plano). Até lá, abra um *issue* com sua ideia.

## Créditos

Inspirado na ideia do [speed.upteam.com.br](https://speed.upteam.com.br/), com texto, visual e código próprios. Usa [Lighthouse](https://github.com/GoogleChrome/lighthouse), [Playwright](https://github.com/microsoft/playwright) e [axe-core](https://github.com/dequelabs/axe-core).

## Licença

[GPL-3.0](LICENSE).
