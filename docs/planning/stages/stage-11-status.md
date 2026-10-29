# Stage 11 — F5: missões com memória de raciocínio

Data: 2026-10-29 · Fase F5 do `roadmap-proj3` · PRD §3/F5, D7, 14.6

## Entregado

- **Histórico de raciocínio preservado (D7)**: novo contrato `MissionHistoryEntry`/`MissionHistoryStatus` em `learning.ts` (`MissionProgress.history`, parse tolerante entrada a entrada — estado legado sem history permanece válido). Append puro `withMissionHistory` (aditivo, id duplicado não regrava) delegado pelo hook `addMissionHistory` — trocar de etapa nunca limpa o histórico.
- **Painel "Reasoning so far"** na missão: previsões, revisões, evidências e decisões consultáveis a qualquer momento, com rótulos honestos — Reflexão coletada (não avaliada) / Critério demonstrado / Parcial / Não atendido / Evidência do laboratório.
- **Dossiê derivado e editável**: `deriveDossierDraft` (puro, em `missions.ts`) pré-preenche a etapa dossiê a partir do histórico — seções sem entradas ficam pendentes em vez de sumirem; nunca campo vazio.
- **Ida-e-volta missão↔laboratório**: o convite de experimento leva a hipótese em teste (`latestHypothesisText`) via `?mission=&hypothesis=`; o laboratório mostra faixa de contexto com link de retorno; ao voltar, relatórios recentes da bancada são oferecidos com "Incorporate as evidence" (entrada `status: "lab"`, sem duplicar como "collected" ao avançar).
- **Índice F5 (14.6)**: cards com problema, **competência** (campo novo `Mission.competency` nas 5 missões), pré-requisitos como chips, produto e estado **interrompida** com a etapa onde parou.
- **Gravação atômica**: avanço de etapa grava evidência + progresso numa única escrita (append separado seria sobrescrito pelo mesmo clique).

## Gates (números reais)

- `bunx tsgo --noEmit`: limpo.
- `bunx vitest run`: **169/169** (157 anteriores + `mission-history.test`: 12 contratos — preservação entre etapas, aditividade, dedupe de id, independência entre missões, parse legado, entradas inválidas, derivação do dossiê, hipótese para o lab, contrato do índice). Nenhum teste contratado enfraquecido.
- Build do preview: **build OK** (build-errors.log, 2 entradas verdes).
- E2E `e2e_f5_mission` (Playwright, `/tmp/browser/vibecoder/`): **9 passos verdes, 0 pageerrors** — índice (5 cards com competência/pré-reqs/produto), briefing preservado na etapa seguinte, resultado de tarefa no histórico, interrompida com etapa no índice, hipótese carregada ao lab, relatório de bancada registrado, incorporação como evidência, dossiê derivado + salvo, recarga preserva 6 entradas + dossiê.

## Decisões registradas

- Histórico mora em `MissionProgress.history` (mesma chave `vibecoder-learning-v1`), não em store novo: é progresso da missão, não evidência contextual (D8/F6 tem store próprio).
- Contrato puro (`withMissionHistory`, `deriveDossierDraft`, `latestHypothesisText`) testável sem renderer; hook só delega.
- Dedupe: avançar com o texto do relatório já incorporado não regrava entrada "collected" (mesmo stepId + texto).

## Bloqueios externos

- Runtime OpenCode (monitor) indisponível no fim da rodada: `GET /api/health` em 127.0.0.1:4096 sem resposta (mesma condição registrada no stage-10). O relatório do monitor para o stage-11 fica pendente até a recuperação do ambiente.

## Próximo remix

F6 — Progresso, evidências e revisão (store de evidência contextual `vibecoder-evidence-v1`, progresso como perguntas/lacunas/evidências, revisão como sessão de recuperação, caderno com origem rastreada).
