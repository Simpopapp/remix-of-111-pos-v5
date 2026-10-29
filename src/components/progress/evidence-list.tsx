// Evidência inspecionável (PRD §14.7 / D8): por conceito, cada tentativa
// mostra tarefa, cenário, resposta, apoio, critérios, resultado e data —
// casada com o registro de evidência pelo MESMO ts (findTaskEvidence). Duas
// tentativas podem ser comparadas lado a lado e levadas ao caderno com
// origem rastreada. Evidência da bancada/missão tem seção própria, com
// status honesto (revealed nunca demonstra).

import { Link } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronRight,
  Compass,
  GitCompareArrows,
  NotebookPen,
} from "lucide-react";
import { useMemo, useState } from "react";
import { CONCEPTS, getConcept } from "@/lib/concepts";
import { getTask } from "@/lib/exercises-data";
import type { Answer, Task } from "@/lib/exercises";
import type { Attempt } from "@/lib/learning";
import { DIMENSIONS, DIMENSION_LABELS, DIMENSION_MEANING, progressOverview } from "@/lib/progress";
import { findTaskEvidence } from "@/lib/evidence";
import { useEvidence } from "@/hooks/use-evidence";
import { useLearning } from "@/hooks/use-learning";
import { addNotebookEntry } from "@/lib/notebook";

const STATUS_LABEL: Record<string, string> = {
  evaluated: "Avaliada com critérios",
  revealed: "Solução revelada — consolida, não demonstra",
  personal: "Reflexão pessoal",
};

const OUTCOME_LABEL: Record<string, string> = {
  met: "atendido",
  partial: "parcial",
  missed: "não atendido",
};

const formatDate = (ts: number) =>
  new Date(ts).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const attemptKey = (a: Attempt) => `${a.taskId}:${a.ts}`;

function answerLabels(answer: Answer, task: Task | undefined): string {
  const labelOf = (key: string) => task?.options?.find((o) => o.key === key)?.label ?? key;
  const parts: string[] = [];
  if (answer.picked?.length) parts.push(answer.picked.map(labelOf).join("; "));
  if (answer.order?.length) parts.push(answer.order.map(labelOf).join(" → "));
  if (answer.text) parts.push(answer.text);
  return parts.join(" · ") || "—";
}

interface AttemptRowProps {
  attempt: Attempt;
  selected: boolean;
  selectionFull: boolean;
  onToggle: (key: string) => void;
}

function AttemptRow({ attempt, selected, selectionFull, onToggle }: AttemptRowProps) {
  const { evidence } = useEvidence();
  const record = useMemo(
    () => findTaskEvidence(evidence, attempt.taskId, attempt.ts),
    [evidence, attempt.taskId, attempt.ts],
  );
  const task = getTask(attempt.taskId);
  const key = attemptKey(attempt);
  const source = record?.source;
  const answer = source?.kind === "task" ? source.answer : undefined;
  const scenario = source?.kind === "task" ? source.scenario : undefined;

  return (
    <div data-testid="evidence-attempt" className="rounded-lg border border-border/50 bg-card/50 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs text-primary">{attempt.taskId}</span>
        <span className="flex items-center gap-2">
          <span className="font-semibold text-foreground">
            resultado: {OUTCOME_LABEL[attempt.outcome] ?? attempt.outcome} · apoio {attempt.help}/3 ·{" "}
            {formatDate(attempt.ts)}
          </span>
          <label className="flex items-center gap-1 font-normal text-muted-foreground">
            <input
              type="checkbox"
              checked={selected}
              disabled={!selected && selectionFull}
              onChange={() => onToggle(key)}
              aria-label={`Comparar tentativa ${attempt.taskId} de ${formatDate(attempt.ts)}`}
            />
            comparar
          </label>
        </span>
      </div>
      {scenario ? (
        <p className="mt-1 text-muted-foreground">
          <span className="font-semibold text-foreground">Cenário:</span> {scenario}
        </p>
      ) : null}
      {answer ? (
        <p className="mt-0.5 text-muted-foreground">
          <span className="font-semibold text-foreground">Resposta:</span>{" "}
          {answerLabels(answer, task ?? undefined)}
        </p>
      ) : null}
      {task ? (
        <ul className="mt-1.5 space-y-0.5 text-muted-foreground">
          {task.rubric.criteria.map((c) => (
            <li key={c.key}>
              {attempt.criteria[c.key] ? "✓" : "✗"} {c.label}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-1.5 font-medium text-muted-foreground">
        {record
          ? `Evidência registrada · ${STATUS_LABEL[record.status] ?? record.status}`
          : "Tentativa anterior à evidência contextual — resposta não registrada."}
      </p>
    </div>
  );
}

function ComparePanel({ attempts, onClear }: { attempts: Attempt[]; onClear: () => void }) {
  const { evidence } = useEvidence();
  const saveComparison = () => {
    const ids = attempts
      .map((a) => findTaskEvidence(evidence, a.taskId, a.ts)?.id)
      .filter((v): v is string => Boolean(v));
    const [a, b] = attempts;
    addNotebookEntry({
      title: `Comparação — ${a!.taskId}`,
      type: "comparison",
      originEvidenceIds: ids,
      body:
        `Tentativa 1 (${formatDate(a!.ts)}): resultado ${OUTCOME_LABEL[a!.outcome] ?? a!.outcome}, apoio ${a!.help}/3.\n` +
        `Tentativa 2 (${formatDate(b!.ts)}): resultado ${OUTCOME_LABEL[b!.outcome] ?? b!.outcome}, apoio ${b!.help}/3.`,
    });
    onClear();
  };

  return (
    <div data-testid="evidence-comparison" className="rounded-xl border border-primary/40 bg-primary/5 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <GitCompareArrows className="size-4 text-primary" /> Comparação lado a lado
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {attempts.map((a, i) => (
          <div key={attemptKey(a)} className="rounded-lg border border-border/60 bg-card/60 p-3 text-xs">
            <p className="font-mono text-primary">{a.taskId}</p>
            <p className="mt-1 text-foreground">
              Tentativa {i + 1} · {formatDate(a.ts)}
            </p>
            <p className="mt-1 text-muted-foreground">
              Resultado: {OUTCOME_LABEL[a.outcome] ?? a.outcome} · apoio {a.help}/3
            </p>
            <ul className="mt-1.5 space-y-0.5 text-muted-foreground">
              {Object.entries(a.criteria).map(([k, ok]) => (
                <li key={k}>
                  {ok ? "✓" : "✗"}{" "}
                  {getTask(a.taskId)?.rubric.criteria.find((c) => c.key === k)?.label ?? k}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <button
        type="button"
        data-testid="save-comparison"
        onClick={saveComparison}
        className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
      >
        <NotebookPen className="size-3.5" /> Salvar comparação no caderno
      </button>
    </div>
  );
}

function ConceptEvidenceRow({ conceptId }: { conceptId: number }) {
  const { learning } = useLearning();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const overview = useMemo(() => progressOverview(learning), [learning]);
  const concept = getConcept(conceptId);
  const entry = overview.active.find((a) => a.conceptId === conceptId);
  if (!concept || !entry) return null;
  const attempts = learning.attempts.filter((a) => a.conceptId === conceptId);

  const toggle = (key: string) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key].slice(-2),
    );
  };
  const chosen = attempts.filter((a) => selected.includes(attemptKey(a)));

  return (
    <li className="border-b border-border/30 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="font-mono text-xs text-primary">#{concept.id}</span>
          <span className="truncate text-sm font-medium text-foreground">{concept.name}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {DIMENSIONS.map((d) => (
            <span
              key={d}
              title={`${DIMENSION_LABELS[d]}: ${entry.dims[d] ? DIMENSION_MEANING[d] : "sem evidência ainda"}`}
              className={
                "rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide " +
                (entry.dims[d] ? "bg-success/15 text-success" : "bg-muted text-muted-foreground/60")
              }
            >
              {DIMENSION_LABELS[d].slice(0, 4)}
            </span>
          ))}
          {open ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </span>
      </button>
      {open ? (
        <div className="space-y-2 border-t border-border/30 bg-background/40 px-4 py-3">
          {attempts.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Só contato — abra a aula ou tente uma tarefa para construir evidência.
            </p>
          ) : null}
          {attempts.map((a) => (
            <AttemptRow
              key={attemptKey(a)}
              attempt={a}
              selected={selected.includes(attemptKey(a))}
              selectionFull={selected.length >= 2 && !selected.includes(attemptKey(a))}
              onToggle={toggle}
            />
          ))}
          {chosen.length === 2 ? <ComparePanel attempts={chosen} onClear={() => setSelected([])} /> : null}
        </div>
      ) : null}
    </li>
  );
}

export function EvidenceList() {
  const { learning } = useLearning();
  const { evidence } = useEvidence();
  const overview = useMemo(() => progressOverview(learning), [learning]);
  const otherRecords = evidence.records.filter(
    (r): r is typeof r & { source: { kind: "lab" | "mission" } } =>
      r.source.kind === "lab" || r.source.kind === "mission",
  );

  if (overview.active.length === 0 && evidence.records.length === 0) {
    return (
      <section className="rounded-2xl border border-border/70 bg-card/40 p-5">
        <h2 className="mb-2 flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
          <Compass className="size-4 text-primary" /> Evidência por conceito
        </h2>
        <p className="text-sm text-muted-foreground">
          Nada registrado ainda. Abra uma{" "}
          <Link to="/" className="text-primary underline-offset-2 hover:underline">
            aula
          </Link>{" "}
          ou comece por um{" "}
          <Link to="/sandboxes" className="text-primary underline-offset-2 hover:underline">
            laboratório
          </Link>
          .
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      {overview.active.length > 0 ? (
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
            <Compass className="size-4 text-primary" /> Evidência por conceito
          </h2>
          <ul className="overflow-hidden rounded-xl border border-border/70 bg-card/40">
            {overview.active.map((a) => (
              <ConceptEvidenceRow key={a.conceptId} conceptId={a.conceptId} />
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            {overview.active.length} de {CONCEPTS.length} conceitos têm atividade
            registrada — abra uma linha para inspecionar a evidência por trás de
            cada dimensão e comparar tentativas.
          </p>
        </section>
      ) : null}

      {otherRecords.length > 0 ? (
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
            <NotebookPen className="size-4 text-primary" /> Bancada, missões e anotações
          </h2>
          <ul className="space-y-2">
            {otherRecords.map((r) => (
              <li
                key={r.id}
                data-testid="other-evidence"
                className="rounded-xl border border-border/60 bg-card/50 p-3 text-xs"
              >
                <p className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-foreground">
                    {r.source.kind === "lab"
                      ? `Experimento · ${r.source.labId}`
                      : `Missão · ${r.source.missionSlug}`}
                  </span>
                  <span className="rounded bg-muted px-2 py-0.5 font-medium text-muted-foreground">
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </p>
                {r.source.kind === "lab" ? (
                  <p className="mt-1 text-muted-foreground">
                    Hipótese: {r.source.hypothesis} · Observação: {r.source.observation} · Interpretação:{" "}
                    {r.source.interpretation}
                  </p>
                ) : (
                  <p className="mt-1 text-muted-foreground">{r.source.note}</p>
                )}
                <p className="mt-1 text-muted-foreground">{formatDate(r.createdAt)}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
