# Stage 12 — F6 + F7: evidência, revisão, caderno e decisões

Data: 2026-10-29 · Fases F6 e F7 do `roadmap-proj3` · PRD §3/F6–F7, §9.3–9.5, D8, §14.7–14.8

## Entregado (F6 — Progresso, evidências e revisão)

- **Store de evidência contextual (D8)**: `src/lib/evidence.ts`, chave `vibecoder-evidence-v1`, aditivo, parse tolerante, snapshot de servidor neutro (D3). Status deriva da origem (`deriveEvidenceStatus`): apoio ≤ 2 = `evaluated`; apoio 3 = `revealed` (nunca demonstra); bancada/missão = `personal`. O chamador nunca escolhe status.
- **Emissão nos 3 pontos**: gravador de aula (`parts.tsx`) e tarefa de missão gravam tentativa e evidência com o MESMO ts (casamento contratado `findTaskEvidence(taskId, ts)`); `saveReport` da bancada grava evidência `lab` + cria entrada de caderno `experiment-report` com origem rastreada.
- **Progresso como perguntas (§14.7)**: abertura "O que consigo demonstrar?" / "O que vale praticar agora?" / lacunas acionáveis (praticou, não demonstrou) antes da matriz. Matriz mantém as 6 dimensões com semântica intacta; rótulos agora em pt-BR (D9: idioma muda, semântica não); célula com denominador 0 diz "sem prática disponível" em vez de 0/0.
- **Revisão como sessão de recuperação**: seção em /progress lista recuperações vencidas e reusa o `PracticeTask` (pergunta → resposta → apoio sob demanda → fechamento); `retained` só muda via `recordAttempt` — nunca na mão (D9).
- **Detalhe de evidência + comparação**: tentativa mostra tarefa, cenário, resposta, apoio, critérios, resultado e data; duas tentativas comparadas lado a lado e salvas no caderno como `comparison` com origem.
- **Caderno (D8/§9.4)**: `src/lib/notebook.ts` + `/notebook`. Entrada sem origem só existe como `note`; experiment-report/dossier/comparison exigem `originEvidenceIds` (recusadas na criação pura `buildNotebookEntry`).

## Entregado (F7 — Meu app: registro contextual)

- **Store de decisões (§9.5)**: `src/lib/decisions.ts`, chave `vibecoder-decisions-v1`. Ficha: necessidade → decisão → motivo → alternativa descartada → evidência disponível → próxima verificação → conceito vinculado. "Não se aplica" é conclusão de primeira classe (dispensa texto de decisão, exige motivo). Criação pura (`buildDecision`) recusa ficha sem necessidade, ou sem decisão/motivo fora do "não se aplica".
- **Ordenação por relevância (§14.8)**: `orderDecisionsByRelevance` — fichas ligadas ao percurso do objetivo primeiro (`objectiveRouteConceptIds`), depois recência; nunca data crua como único critério.
- **Legado preservado 1:1**: declarações de `learning.application` seguem intactas e agora aparecem como seção histórica somente-leitura (`legacyDeclarationView` mantém note/nA com o mesmo significado — autodeclaração, nunca domínio). O checklist "marcar implementado" saiu da UI: o registro novo é reflexão.

## Gates (números reais)

- `bunx tsgo --noEmit`: limpo (após cada pacote).
- `bunx vitest run`: **196/196** (169 + evidence 10 + notebook 8 + decisions 9). Nenhum teste contratado enfraquecido; learning/recommend/next-action/simulators intactos.
- Build do preview: **build OK** (build-errors.log, entrada verde 02:13Z).
- E2E `e2e_f6_progress` (Playwright, `/tmp/browser/vibecoder/`): **9 passos verdes, 0 pageerrors**.
- E2E `e2e_f7_mine`: **5 passos verdes, 0 pageerrors**.

## Decisões registradas

- Casamento tentativa↔evidência é por (taskId, ts) idênticos — nunca por proximidade; contrato testado (`findTaskEvidence`).
- Relatório da bancada cria automaticamente a entrada de caderno `experiment-report` no `saveReport` (D8: relatório recuperável com origem).
- `legacyLegacyIndex` mantém o nome do PRD §9.5 (mapeia declaração legada); por enquanto nenhuma ficha migra automaticamente — o legado é exibido 1:1.
- Rótulos de dimensão em pt-BR (F6/D9); `DIMENSION_MEANING` e demais textos em inglês aguardam a passada F8.

## Bloqueios externos

- Runtime OpenCode (monitor) novamente indisponível: `GET /api/health` em 127.0.0.1:4096 sem resposta (mesma condição de stage-10/11). Relatório do monitor e "remix finalizado (+2)" ficam pendentes até a recuperação do ambiente.

## Próximo remix

F8 — Acabamento transversal (estados §15, teclado, mobile recomposto, passada pt-BR, reduced-motion) — roadmap-proj3 F8.
