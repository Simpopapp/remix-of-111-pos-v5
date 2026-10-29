# Relatório da rodada de remix — Project 3, F4 (Laboratórios)

**Data:** 2026-10-28
**Status:** F4 concluída com gates verdes. "remix finalizado (+F4)"

## O que foi entregue

- **Contrato da bancada unificada** (`src/lib/bench.ts`): specs de parâmetros
  com limites, validação nomeada (`invalid-param`), configuração rotulada
  (`formatConfig`), estados da bancada (no-run · invalid-param · partial ·
  paused · out-of-model · ready), `reportReadiness` (relatório bloqueado com
  motivo quando falta evidência/previsão/interpretação) e `LAB_CATALOG`
  (fenômeno, controles reais, competência, limites por lab).
- **Shell unificado** (`src/components/sandboxes/bench-shell.tsx`): previsão
  exigida antes da 1ª execução, execução identificável (nº + config rotulada +
  hora), faixa de registro, comparação A/B rotulada, reinício explícito
  distinto de troca de configuração, painel de relatório (9.7) com estados.
- **Store próprio de relatórios** (`src/lib/bench-reports.ts`, chave
  `vibecoder-bench-reports-v1`): parse tolerante, snapshot de servidor neutro;
  não toca em `learning.ts`.
- **Os 6 labs reescritos sobre a bancada**: ratelimit (dois clientes + escopo
  per-IP/global + burst), circuit (máquina de estados segue a execução real;
  comparação com/sem proteção na mesma sequência), nplusone (mesmas entidades
  em todas as estratégias), sqli (consulta/entrada/parâmetros/resultado no
  mesmo campo; caso fora do modelo honesto), pubsub (competing vs fan-out,
  trajetória por evento, DLQ como consequência de política, pausa nomeada),
  tail (histograma com unidades/amostra e marcador de p99).
- **Catálogo `/sandboxes`** redesenhado: fenômeno + controles + competência +
  limites + chips `practice`/`context` por conceito (nota de alcance no title).
- **`/labs/$id`** recomposto: cenário → bancada → representação → evidência →
  interpretação → desafio → conceitos.

## Gates (números reais)

- `tsgo --noEmit`: limpo.
- `vitest run`: **157/157** em 16 arquivos (+12 contratos em `bench.test.ts`;
  `simulators.test.ts` intacto, 30/30).
- Build: OK (build-errors.log, `build 2026-10-28T23:55:19Z → build OK`).
- E2E `e2e_f4_lab.py` (8 passos): previsão exigida antes da 1ª execução ·
  execução identificável (#1) · comparação A/B rotulada · relatório registrado
  · reinício explícito · catálogo completo nos 6 cards · pausa nomeada no
  pubsub · unidades/amostra no tail — **0 pageerrors**.

## Notas para o monitor

- O runtime OpenCode não estava no ar nesta sandbox (binário ausente no PATH;
  porta 4096 sem resposta). Registro feito neste relatório, na interface
  durável `docs/planning/`; notificação direta ao monitor fica pendente de um
  ambiente com `opencode serve`.
- Próxima fase do roadmap central: **F5 — Missões: investigação com memória**.
