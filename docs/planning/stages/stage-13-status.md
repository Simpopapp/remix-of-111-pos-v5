# Stage 13 — F8: acabamento transversal (estados §15, teclado, mobile, pt-BR)

Data: 2026-10-29 · Fase F8 do `roadmap-proj3` · PRD §3/F8, §15–§17 do planejamento, D4, D10, D12

## Entregado

- **Passada de idioma pt-BR na UI (D4)** — varredura final incluiu rótulos estruturais da aula (Sistema/Dado/Sintoma/Restrições/Linha de base), sumários acessíveis da máquina de estados e do fluxo de requisição ("Instrumento: máquina de estados. Estado atual: …", "orçamento", painel "histórico"), kickers dos modos de aula ("Aula X · aula âncora/prática/consulta rápida") e "Tentar de novo": toda a interface e o feedback do motor nas telas novas passaram a pt-BR — bancada (estados da bancada, avisos de parâmetro inválido/previsão exigida, registro de execuções, comparação rotulada, previsão/interpretação/veredito), os 6 laboratórios (controles, botões, logs, rótulos de estados), instrumentos (trilha de eventos, histograma, explicador de consulta, tabela, máquina de estados), catálogo de laboratórios (fenômeno/controles/competência/limites em `LAB_CATALOG` e `labs.ts`: cenário, caption, equivalente textual, evidência, interpretação, desafio), missões (rótulos de histórico, chips do índice), aula (cabeçalho, modos, status editorial), biblioteca, Meu app, caderno e os meta títulos/descrições de todas as rotas. Significados intactos — só o idioma mudou (D9).
- **Conteúdo preservado em inglês (D4)**: acervo editorial (`src/lib/lessons`, `concepts`), motor puro `simulators.ts` (sql/verdict/formula) e textos de lição continuam em inglês — tradução integral automática continua proibida sem decisão de produto.
- **Uppercase**: conferência de todos os usos restantes — são kickers/rótulos curtos (1–3 palavras) ou cabeçalhos de tabela; nenhuma explicação em caixa alta permanece.
- **Teclado completo (D10)**: `e2e_f8_keyboard` navega aula → laboratório → missão por Tab; controles da bancada (inputs, select, botões de execução/reinício, campos de relatório) e os comandos da aula (modos, previsão, revelar, registrar no meu app, abrir laboratório) são todos alcançáveis; foco visível via `:focus-visible` global (anel violeta, já contratado); seleção ≠ foco mantidos.
- **Equivalentes textuais (D10)**: instrumentos continuam com `role="img"` + `aria-label` que responde à mesma pergunta do gráfico (histograma com marcadores e faixas), anúncios `role="status"` discretos, legendas de status.
- **Reduced-motion**: `prefers-reduced-motion` respeitado globalmente (animações/transições a ~0) — sem regressão.
- **Mobile recomposto (D10)**: verificação Playwright em 390×844 de home, biblioteca, aula, laboratório, missão e progresso — 0 overflow horizontal; header compacto com navegação rolável; bancada mantém controles e observação próximos (grid que colapsa em coluna com controles acima do instrumento); aula recomposta em etapas curtas (previsão → modelo → prática).
- **Estados §15 por tela**: aula (previsão exigida antes do modelo), bancada (no-run/invalid-param/partial/paused/out-of-model/ready; reinício ≠ configuração; relatório bloqueado com motivo), missão (histórico preservado), progresso (perguntas antes da matriz), Meu app (ficha de decisão), caderno, biblioteca (vazio orientado). Nenhum comando destrutivo se confunde com comparativo.

## Gates (números reais)

- `bunx tsgo --noEmit`: limpo (após cada pacote de edição).
- `bunx vitest run`: **196/196** (nenhum teste removido; `bench.test` e `progress.test` tiveram strings fixadas atualizadas ao idioma novo, mesmas asserções semânticas: motivo do bloqueio, fora-do-intervalo, denominadores).
- Build do preview: **build OK** (build-errors.log, entradas verdes 02:26Z).
- E2E `e2e_f8_keyboard` (Playwright, `/tmp/browser/vibecoder/e2e_f8_keyboard.py`): **16 passos verdes, 0 falhas, 0 pageerrors** (teclado em aula+lab+missão, estados por tela, vazio orientado).
- Mobile: 0 overflow horizontal nas 6 telas verificadas em 390×844.

## Decisões registradas

- Engine `simulators.ts` (strings de sql/verdict/formula, blurb traduzido separadamente) permanece com contrato de testes intacto — nada de `simulators.test` foi tocado.
- Uppercase mantido apenas em kickers/rótulos curtos e cabeçalhos de tabela; explicação nenhuma em caixa alta.
- Meta descrições de rota passaram a pt-BR (títulos "111 Essenciais de Produção", "Laboratórios", "Missões") — produtos em pt-BR desde F1.

## Bloqueios externos

- Runtime OpenCode (monitor) indisponível: rota `/oc` responde "OpenCode indisponível" e 127.0.0.1:4096 sem resposta (mesma condição de stage-10/11/12). O "remix finalizado (+1)" e o relatório do monitor ficam registrados em `docs/planning/reports/remix3-f8-acabamento.md`, pendentes de entrega quando o ambiente recuperar.

## Próximo remix

F9 — Conteúdo: percursos fechados e honestidade de cobertura (auditoria dos 111 conceitos pelos 8 critérios, elos frágeis primeiro).
