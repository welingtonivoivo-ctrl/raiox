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
