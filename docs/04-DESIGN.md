# 04 — DESIGN: telas do app

> Estado: **rascunho para aprovação do dono** — 26/11/2026.
> Visual: **Azul Neon do Street Server** (decisão 11). Cores e medidas tiradas da skill `street-server-visual` (`assets/tokens.css`); o arquivo de cores é copiado para `pacotes/app/src/estilos/cores.css` com os mesmos valores.

## 1. Regras gerais

- **Nenhuma barra de rolagem visível** em nenhuma tela (regra do dono): rolagem só pela roda do mouse/toque, com as barras escondidas por CSS (`scrollbar-width: none` e `::-webkit-scrollbar { display: none }`).
- Fundo escuro azul-marinho (`--background #05080f`), painéis `--background-secondary #0a0f1c`, cartões `--surface #0e1527`, bordas `--border #1a2643`.
- Azul elétrico da marca: `--primary #1f6bff`; botão principal com `--primary-fill`.
- Texto `--text-primary #e9eefb`, secundário `--text-secondary #94a1c0`.
- Fonte Inter (mesma do Street Server).
- Todas as frases vêm de `pacotes/textos/pt-BR.json`.
- O próprio app precisa passar no Raio-X de acessibilidade: contraste mínimo 4,5:1, tudo alcançável pelo teclado, foco visível.
- Nada de animação infinita; transições curtas (150–200 ms).
- Janela mínima 1100 × 700; o conteúdo se reorganiza, sem rolagem lateral.

## 2. Cores das notas e estados

| Faixa | Cor | Variável |
|---|---|---|
| 90–100 (bom) | verde | `--success #22c55e` |
| 50–89 (médio) | laranja | `--warning #f5a524` |
| 0–49 (ruim) | vermelho | `--danger #ef4444` |
| Não deu para conferir | cinza | `--text-muted #5e6b8a` |

Toda cor vem acompanhada de ícone ou palavra (bom / médio / ruim) — nunca só a cor.

## 3. Estrutura da janela

```
┌──────┬──────────────────────────────────────────────────────┐
│ RAIO │  barra do topo: nome do site · botões da tela          │
│  -X  ├──────────────────────────────────────────────────────┤
│      │                                                        │
│ Nova │                 conteúdo da tela                       │
│ Hist.│                                                        │
│ IA   │                                                        │
│ Conf.│                                                        │
└──────┴──────────────────────────────────────────────────────┘
```
Trilho à esquerda com ícones + nome: **Nova análise**, **Histórico**, **Minhas IAs**, **Configurações**. Logotipo "RAIO-X" no topo do trilho com letras espaçadas, no estilo da marca do Street Server (sem usar o escudo nem o nome Street).

## 4. Telas

### 4.0 Boas-vindas (só na primeira vez)
- Logotipo, frase "O Raio-X examina o seu site por fora e por dentro. Tudo fica no seu computador."
- Barra de progresso do download do navegador de teste (~150 MB), com tamanho baixado/total.
- Sem internet: mensagem e botão **Tentar de novo**. Ao terminar: botão **Começar** → Nova análise.

### 4.1 Nova análise
- Campo grande do endereço com botão **Analisar**.
- Dois cartões grandes para escolher o modo: **Superfície** ("o site no ar, como o visitante vê") e **Completo** ("site + código do projeto").
- Interruptores: Celular, Computador, Precisão (3 rodadas), Testar páginas com login.
- Quando login ligado: quadro da sessão (estado + Entrar no site / Já entrei / Apagar sessão) e caixa de autorização.
- Quando Completo: seletor de pasta + seletor da análise inteligente (Sem IA / uma das minhas IAs / Configurar IA).

### 4.2 Descobrir páginas
- Lista de páginas encontradas com caixa de marcar, agrupadas por caminho (`/painel`, `/servidores/...`).
- Etiqueta "pulada por segurança" nas perigosas (cinza, não marcável).
- Campo "colar mais endereços". Contador "12 de 50 marcadas". Botão **Analisar estas páginas**.

### 4.3 Andamento
- Linha de etapas com a atual destacada em azul; "página 3 de 12"; tempo estimado restante.
- Botão **Parar** (pede confirmação; guarda o que já mediu).

### 4.4 Resultado
- Topo: alternador **Celular | Computador**, data da análise, botões Copiar todos os textos / Baixar relatório / Analisar de novo.
- Coluna de páginas à esquerda (só quando há mais de uma), cada linha com a nota de desempenho em bolinha colorida.
- Aviso vermelho fixo no topo quando houver chave secreta ou arquivo exposto no site no ar (com botão "ver onde").
- Faixa de **5 círculos de nota** (anel colorido, número grande no meio, nome embaixo): Desempenho, Acessibilidade, Boas práticas, Busca e **Segurança**. Segurança não muda com o alternador Celular/Computador e mostra "parcial (sem o código)" no modo superfície.
- Grade de **6 medidas** (nome, valor, faixa colorida bom/médio/ruim).
- Faixa de **5 blocos legais** (Cookies, LGPD, Acessibilidade, Consumidor, Marco Civil) + **Código** no modo completo, cada um com nota e contagem "3 falhas · 2 atenções".
- **O que ajustar**: lista de cartões, do maior impacto ao menor. Cada cartão: etiqueta do bloco, título simples, "ganha ~+8 de desempenho" ou "risco alto", número de páginas afetadas. Ao abrir: explicação, **lugar** (página + elemento, ou `arquivo:linha` clicável que abre a pasta), base legal quando houver, caixa com o **texto para IA** e botão **Copiar**. Etiqueta "achado pela IA" quando for o caso.
- Filtros por bloco e por gravidade acima da lista.
- Aviso fixo no fim dos blocos legais: "Conferência técnica automática. Não substitui a análise de um advogado."

### 4.5 O que vai para a IA
- Lista de arquivos com caixa de marcar e tamanho; total de caracteres e estimativa de custo quando o provedor informar preço (senão "confira o preço no seu provedor").
- Destaque: "Valores que parecem senha ou chave foram trocados por ••••".
- Botões **Concordo, enviar para a minha IA** e **Voltar**.

### 4.6 Histórico
- Grade de sites (cartão com nome, última data, 5 notas pequenas).
- Página do site: gráfico de linhas com a evolução das notas (uma cor por nota, legenda em texto), lista de análises com "+6 / −2" em relação à anterior.

### 4.7 Minhas IAs
- Lista de provedores configurados (nome dado pela pessoa, provedor, modelo, "chave salva").
- **Adicionar IA**: provedor (Claude, OpenAI, Gemini, Groq, OpenRouter, DeepSeek, Mistral, Ollama, LM Studio, Outro compatível com OpenAI), endereço (preenchido sozinho quando conhecido), modelo, chave (campo escondido), botão **Testar** (manda "responda OK").

### 4.8 Configurações
- Idioma (só pt-BR na v1, preparado para mais).
- Páginas por análise (padrão 50), velocidade da navegação (padrão 1 por segundo), palavras perigosas extras.
- Permitir testar endereços locais (localhost).
- Pasta dos dados, botão **Apagar tudo** (sessões, chaves, histórico — pede confirmação).
- Sobre: versão, licença GPL-3.0, link do repositório.

## 5. Relatório exportado (HTML / PDF)
- Mesmo conteúdo da tela Resultado, em página única, com tema claro (para imprimir) e cores das notas.
- Página 1: site, data, modo, as 4 notas nos dois perfis, a nota de Segurança, blocos legais.
- Chaves achadas aparecem só com o começo do valor (ex.: `sk-proj-4f…`), nunca inteiras.
- Depois: medidas, "O que ajustar" com todos os detalhes abertos, aviso legal no fim.
- Sem cookies, sem chaves, sem conteúdo das páginas testadas.

## 6. Arquivo de textos para IA (Markdown)
```
# Raio-X — meusite.com.br — 26/11/2026
## 1. [Desempenho · ganha ~+8] Imagens grandes demais na página inicial
Lugar: https://meusite.com.br/ — <img class="banner">
Texto para a IA:
> No meu site, a imagem ... (texto completo)
```
