# AGENTS.md — regras técnicas de `src/`

*Leia antes de mudar qualquer arquivo desta árvore. Protocolo de remix e verificação ficam no `AGENTS.md` da raiz.*

## Arquitetura e Ambiente
- Estado de aprendizagem é store compartilhado em `src/hooks/use-learning.ts` (fonte única `src/lib/learning.ts`) via `useSyncExternalStore`; header global, aula, progresso e missões veem o mesmo estado ao vivo. `getServerSnapshot` DEVE retornar o estado neutro congelado (regra D3: SSR neutro, hidratação sem mismatch). O antigo `use-readiness.ts`/`readiness.ts` foram removidos na F5 — o checklist vive como `application` (autodeclaração).
- Retenção (D9): `recordAttempt` agenda automaticamente a recuperação de uma tarefa `variant` com `met` para +72h (`RETENTION_INTERVAL_MS` em `learning.ts`) e fecha o item quando a recuperação vence — a UI nunca agenda na mão.
- Busca da home vive em estado local com debounce de 250ms e depois sincroniza `?q=`/`?cat=` na URL (TanStack search params com `exactOptionalPropertyTypes`: tipos opcionais precisam de `| undefined` explícito). Busca casa sintoma/sinônimo via `src/lib/symptoms.ts`.
- Lógica dos 6 simuladores é pura em `src/lib/simulators.ts`, com tempo/rng injetáveis; componentes apenas renderizam o estado retornado (testes injetam rng determinístico — falha da fila é `rng() < 0.75`).
- Card de conceito: o Link-overlay é `z-10` e fica acima de todo o conteúdo — conteúdo nunca pode pintar por cima do overlay (regressão de clique). O card não tem toggle de "implementado"; o registro de aplicação vive em "Meu app" (`/readiness`).
- Rotas de seção com índice + detalhe (padrão `/missions`): o arquivo da seção é LAYOUT que renderiza `<Outlet />`; índice em `missions.index.tsx`, detalhe em `missions.$slug.tsx`. Componente de índice como pai do detalhe sem Outlet faz o índice pintar por cima do detalhe (e o SSR falha o match com irmãos planos).
- Estado vindo do store hidratado (ex.: dossiê em `learning.missions`) nunca se lê só no initializer de `useState`: sincronizar via efeito quando o valor hidratado chega, sem sobrescrever edição da sessão.

## Project 2 — estrutura editorial e de estado
- O catálogo gerado `src/lib/concepts.ts` nunca é editado à mão: conteúdo editorial novo vive na camada `src/lib/lessons/` (um arquivo por categoria, agregado em `lessons/index.ts`, cobertura em `lessons/coverage.ts`). Lições referenciam conceitos por `id` canônico 1..111; `/concepts/$id` renderiza lição completa quando coberta, senão os blocos legados com aviso honesto — nunca fingir profundidade inexistente.
- Relações entre conceitos são tipadas em `src/lib/relations.ts` (`prereq | contrast | composition | context | practice`); "relacionado" solto não existe. Links conceito→laboratório distinguem prática direta de apoio contextual.
- Estado de aprendizagem tem fonte única em `src/lib/learning.ts` (chave `vibecoder-learning-v1`). Dados do antigo readiness migram 1:1 para `application` e mantêm significado de autodeclaração — nunca são reinterpretados como domínio.
- Progresso usa as dimensões Contato · Prática · Demonstrado · Transferido · Retido · Aplicação declarada, cada uma com denominador rotulado; nenhum percentual global, nenhum "Mission ready", nenhuma cor hardcoded em componentes (tokens semânticos em `src/styles.css`).

## Project 3 — F0–F3 (identidade, home, biblioteca, aula)
- Identidade v3: tema CLARO é o shell do produto (tokens em `src/styles.css`); bancada instrumental usa `.bench` e o registro de evidência `.surface-evidence` — mudança de superfície indica mudança de tarefa. O violeta é marca (CTA/foco), nunca fundo de tudo. Nada de cores hardcoded.
- `/library` é a dona do catálogo (componente compartilhado `src/components/library/catalog.tsx` com ?q=/?cat=); a home `/` é mesa de trabalho e NÃO volta a listar o acervo.
- A home decide a ação interrompida com a função pura `src/lib/next-action.ts` (`computeHomeState`); objetivos sem percurso correspondente são ADMITIDOS (sem fallback silencioso — usar `objectiveRouteStatus` de recommend.ts), nunca encaminhados ao 1º percurso.
- Busca da biblioteca é pura em `src/lib/library-search.ts` (motivo da relevância por resultado; correspondência fraca rotulada e por último; `depth` restringe a conceitos); `catalog.tsx` apenas renderiza e sincroniza ?q/?cat/?type/?depth/?view na URL.
- Aula (F3) tem 3 modos com estado na URL (`/concepts/$id?mode=`, guided é o default sem parâmetro); peças compartilhadas em `components/lesson/parts.tsx`, modos importam peças — nunca o contrário (sem ciclo). Fichas de pré-requisito derivam de `getPrereqCards` (`src/lib/lessons/prereq-motives.ts`): par (lição, pré-req) sem motivo é lacuna denunciada por teste, nunca fingida na UI. Síntese final é `deriveSynthesis` (`src/lib/lessons/synthesis.ts`) — a UI nunca inventa texto de fechamento; o kind `timeline` tem render dedicado (`instruments/timeline.tsx`) validado por shapes.

## Project 3 — qualidade pedagógica
- Correções de precisão dos simuladores (S4 semântico com casos suportados e estado "fora do modelo"; S5 competing vs fan-out; S3 parametrizado com fórmula transparente; S6 nearest-rank com exemplo 99×100/1×10.000) são comportamento contratado em testes — não podem regredir.
- Toda tarefa de prática retorna feedback diagnóstico (critério quebrado + causa provável + próxima ação); respostas com solução revelada (help 3) não contam como domínio.

## Project 3 — F4 (bancada unificada dos laboratórios)
- O contrato da bancada é `src/lib/bench.ts` (specs com limites, validação, estados da bancada, relatório 9.7, catálogo); os componentes em `src/components/sandboxes/*` apenas renderizam `bench-shell.tsx` — cada lab implementa `onRun`/`onReset`/`onConfigChange` e mantém a lógica viva com os simuladores puros de `simulators.ts` (testes contratados intactos). Relatórios de experimento têm store próprio (`src/lib/bench-reports.ts`, chave `vibecoder-bench-reports-v1`, snapshot de servidor neutro) e nunca entram em `learning.ts`.

## Project 3 — F6/F7 (evidência, caderno, revisão e decisões)
- Evidência contextual, caderno e decisões têm stores próprios e aditivos (`src/lib/evidence.ts` chave `vibecoder-evidence-v1`, `src/lib/notebook.ts` chave `vibecoder-notebook-v1`, `src/lib/decisions.ts` chave `vibecoder-decisions-v1`, todos com parse tolerante e snapshot de servidor neutro) e nunca entram em `learning.ts`; o legado de `learning.application` permanece intacto e somente-leitura na UI (significado histórico, nunca reinterpretado).
- O status da evidência deriva da origem (`deriveEvidenceStatus`): ajuda ≤ 2 = `evaluated`, ajuda 3 = `revealed` (nunca demonstra), bancada/missão = `personal` — o chamador nunca escolhe status; tentativa e evidência de tarefa são gravadas com o MESMO ts e casadas por (taskId, ts) via `findTaskEvidence`, nunca por proximidade.
- Entrada de caderno sem origem só existe como `note`; experiment-report/dossier/comparison exigem `originEvidenceIds` (recusa na criação pura). "Não se aplica" em decisões é conclusão de primeira classe (dispensa decisão, exige motivo); fichas de decisão ordenam por relevância ao percurso do objetivo primeiro, recência depois.
- Revisão/recuperação é sessão em /progress reusando `PracticeTask`; `retained` só muda via `recordAttempt` — nunca na mão; 0/0 na matriz de progresso é "sem prática disponível" (sobre o acervo, não sobre o aluno).
