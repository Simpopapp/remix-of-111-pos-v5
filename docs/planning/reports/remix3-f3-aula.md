# Registro — remix 3, F3 concluída (aula em três modos)

**Data:** 2026-10-23
**Escopo executado:** F3 (roadmap-proj3) — agente principal, sem enxame (pacote de dono único).

## O que foi feito

- **Modos de aula (§9.6):** `/concepts/$id` recebe `validateSearch` com `?mode=`
  (guided default sem parâmetro, reference, practice). Seletor de modos como
  links — cada modo é endereçável e o estado sobrevive a voltar.
- **Pré-requisitos nomeados (§14.4):** fichas com nome canônico, motivo
  editorial e retomada curta (primeira frase do ELI10). Motivos por par
  (lição, pré-requisito) em `src/lib/lessons/prereq-motives.ts` — 23 pares
  cobertos; par sem motivo seria lacuna denunciada por teste, não fingida.
- **Retorno ao mesmo ponto:** a ficha leva ao pré-requisito com `?from=13`; a
  página do pré-requisito mostra o chip "Retomar aula" que volta para
  `/concepts/13#prereqs`.
- **Timeline dedicada (D5):** `TimelineInstrument` em
  `components/instruments/timeline.tsx`, com suporte às duas formas editoriais
  (segmento start/end com deadline; teto/amostra de backoff), barras
  decorativas + linha textual por evento. Antes: só equivalente textual.
- **Síntese final (§9.6):** `deriveSynthesis(lesson)` pura em
  `src/lib/lessons/synthesis.ts` — princípio (definition), condições de uso
  (constraints + contrast), erro mais provável (misconceptions[0] +
  discriminante), próxima aplicação (transfer). Renderizada em todos os modos
  sobre `.surface-evidence`; nota explícita de que autodeclaração não conta
  como domínio.
- **Modo guiado:** situação → previsão (textarea local, não avaliada) → modelo
  → representação → contraste → prática. Modelo oculto até a previsão.
- **Modo consulta:** definição, mecanismo, exemplo trabalhado, contraexemplos,
  limites — com aviso de que existe mais e link para o guiado.
- **Modo prática:** motor + variante de transferência + critérios de evidência.
- **Comparação antes/depois:** quando a representação traz `versions`
  (query-explainer), faixa rotulada de comparação com cenário compartilhado.

## Gates F3 (verificados nesta rodada)

- tsgo limpo (exato, `bunx tsgo --noEmit`).
- vitest 145/145 (antes: 141; +4 em `lesson-modes.test.ts`; shapes de
  `timeline` incluídos em `instruments-shapes.test.ts`). Nenhum teste
  contratado enfraquecido.
- build OK (vite build).
- `e2e/e2e_f3_lesson.py` verde: 5 passos (guiado default com pré-reqs
  nomeados, previsão→modelo→timeline, retorno ao ponto, consulta sem
  prática, prática com síntese), 0 pageerrors.

## Decisões registradas

- Motivos de pré-requisito centralizados em `prereq-motives.ts` na camada
  `lessons/` (contrato `Lesson` não foi alterado; conteúdo editorial vive na
  camada lessons — regra do AGENTS.md).
- Síntese derivada por função pura; a UI nunca inventa fechamento.
- `from` validado em `validateSearch` contra 1..111; chip só aparece quando o
  `from` é um conceito válido distinto da página atual.

## Próximo remix

F4 — Laboratórios: catálogo intencional + bancada unificada (PRD §3/F4, §10).

## Monitor

Runtime OpenCode (`/oc`) segue indisponível (502, igual às rodadas 07–10 e F2).
Este registro é a persistência oficial da avaliação desta fase até o runtime
voltar.
