# Conferência cruzada dos 6 documentos — 26/11/2026

| # | O que foi conferido | Resultado |
|---|---|---|
| 1 | As 11 decisões do dono (PRD §7) aparecem no TRD, no DESIGN e no PLANO | OK |
| 2 | Toda tela citada no FLUXO existe no DESIGN | **Corrigido**: faltava a tela de boas-vindas/download do navegador (DESIGN §4.0) |
| 3 | Toda ação do FLUXO tem função ou mensagem no BACKEND | **Corrigido**: faltavam `historicoApagar` e `prepararNavegador` (BACKEND §7) |
| 4 | Toda promessa do PRD é possível pelas regras do TRD | **Corrigido**: "senhas fracas aceitas" exigiria enviar formulários, o que a navegação segura proíbe — saiu do PRD |
| 5 | Formato `Resultado` (BACKEND §3) cobre tudo que a tela Resultado mostra (DESIGN §4.4) | OK (notas, medidas, blocos, ajustes com lugar, base legal, origem "ia") |
| 6 | Segurança: senha nunca guardada, chave de IA fora de relatórios, confirmação de autorização | OK no TRD §4/§8/§11, BACKEND §2/§5/§8, PLANO Etapas 4 e 7 |
| 7 | Regras do dono: sem barra de rolagem, português, textos separados para tradução | OK no DESIGN §1 e PLANO Etapa 8 |
| 8 | Toda etapa do PLANO tem conferência de uso real, além do teste automático | OK |
| 9 | Nada da lista "nunca abrir" (memória repos-publicos-oss) entra no repositório | OK — só documentos novos; regra repetida no PLANO |
| 10 | Pontos que ainda dependem de conferência técnica estão marcados | OK: medida "Pronto para tocar" (Etapa 1), cofre compartilhado app/linha de comando (Etapa 4), endereços dos provedores de IA (Etapa 7), nome `raiox` livre no npm (Etapa 9) |

## Revisão 1 — nota de Segurança (26/11/2026, pedido do dono depois da 1ª aprovação)

| # | O que foi conferido | Resultado |
|---|---|---|
| 1 | Decisões 12 (Segurança) e 13 (teste final no nosso sistema) aparecem em PRD, TRD, FLUXO, DESIGN, BACKEND e PLANO | OK |
| 2 | Cada frente de segurança do PRD §5.4 tem regra no TRD §5.1 | OK: chaves (site e repositório), banco (consulta montada, senha, Supabase, Firebase), arquivos expostos, configuração |
| 3 | Nota de Segurança cabe no `Resultado` (BACKEND §3) e na tela (DESIGN §4.4) | OK: campo `seguranca` com `parcial` e `alerta`; 5º círculo |
| 4 | Regras antigas `codigo.segredos/dependencias/dados-pessoais-em-log` não ficaram duplicadas | OK: viraram `seguranca.*`; restos do texto antigo trocados ("4 círculos", "4 notas" no histórico) |
| 5 | Nada de invasão: sem conectar no banco, sem enviar formulário, arquivos expostos só com `souDono` e só leitura | OK no PRD §5.4, TRD §5.1 |
| 6 | Valor inteiro de chave nunca gravado | OK no BACKEND §3 e DESIGN §5; conferido no PLANO Etapa 6 |
| 7 | Falso positivo: chaves feitas para ser públicas e sites que respondem 200 para tudo | OK: tratados no TRD §5.1 |
| 8 | Teste final no Street Server com relatório fora do repositório público | OK no PLANO Etapa 10 |
