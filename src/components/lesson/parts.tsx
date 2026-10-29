// Peças compartilhadas dos modos de aula (F3). Extraídas de lesson-view para
// evitar ciclos de import entre os modos: lesson-view compõe os modos, os
// modos compõem estas peças.

import { useState } from "react";
import {
  CheckCircle2,
  CircleSlash2,
  FlaskConical,
  HelpCircle,
  XCircle,
} from "lucide-react";
import type { Lesson } from "@/lib/lessons/types";
import { evaluate, type Answer, type Task } from "@/lib/exercises";
import { getTask } from "@/lib/exercises-data";
import { useLearning } from "@/hooks/use-learning";
import { useEvidence } from "@/hooks/use-evidence";
import { LessonRepresentation } from "@/components/lesson/representation";

export function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof FlaskConical;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8 rounded-2xl border border-border/70 bg-card/40 p-5">
      <h2 className="mb-3 flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
        <Icon className="size-4 text-primary" />
        {title}
      </h2>
      {children}
    </section>
  );
}

export function RepresentationBlock({ lesson }: { lesson: Lesson }) {
  const { kind, caption, textEquivalent, data } = lesson.representation;
  const hasVersions =
    kind === "query-explainer" &&
    Array.isArray((data as Record<string, unknown>)["versions"]);
  return (
    <Section icon={FlaskConical} title="Representation — what to observe">
      <p className="mb-4 text-sm text-muted-foreground">{caption}</p>
      {hasVersions ? (
        <p className="mb-4 rounded-lg border border-info/30 bg-info/5 px-3 py-2 text-xs text-foreground/90">
          Before/after comparison — same scenario and data, two versions side by
          side. Compare the cause, not only the result.
        </p>
      ) : null}
      <LessonRepresentation lesson={lesson} />
      <div className="mt-4 rounded-lg border border-border/60 bg-background/60 p-3">
        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Text equivalent
        </p>
        <p className="text-sm leading-relaxed text-foreground/90">{textEquivalent}</p>
      </div>
    </Section>
  );
}

/** Tarefa de prática interativa (motor D8; feedback diagnóstico, §9.7). */
export function PracticeTask({ task }: { task: Task }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [helpLevel, setHelpLevel] = useState(0);
  const [submitted, setSubmitted] = useState<ReturnType<typeof evaluate> | null>(null);
  const isOrder = task.type === "order";
  const record = useAttemptRecorder();

  const answer: Answer = isOrder ? { order } : { picked };

  const submit = () => {
    const result = evaluate(task, answer, helpLevel);
    setSubmitted(result);
    record(task, result, helpLevel, answer);
  };

  const togglePick = (key: string) => {
    if (submitted) return;
    setPicked((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const appendOrder = (key: string) => {
    if (submitted) return;
    setOrder((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  const removeOrderAt = (index: number) => {
    if (submitted) return;
    setOrder((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="mb-6 rounded-xl border border-border/60 bg-background/50 p-4">
      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Practice · {task.type} · {task.id}
      </p>
      <p className="mb-2 text-sm font-semibold text-foreground">{task.prompt}</p>
      {task.context ? (
        <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{task.context}</p>
      ) : null}

      <div className="mb-3 flex flex-col gap-2">
        {task.options?.map((o) => {
          const chosen = isOrder ? order.includes(o.key) : picked.includes(o.key);
          const orderIndex = order.indexOf(o.key);
          return (
            <button
              key={o.key}
              type="button"
              onClick={isOrder ? () => appendOrder(o.key) : () => togglePick(o.key)}
              className={
                "flex items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors " +
                (chosen
                  ? "border-primary/50 bg-primary/10 text-foreground"
                  : "border-border/60 bg-card/60 text-muted-foreground hover:border-primary/30 hover:text-foreground")
              }
            >
              <span className="mt-0.5 font-mono text-xs text-primary">
                {isOrder && orderIndex >= 0 ? `${orderIndex + 1}` : "○"}
              </span>
              <span>{o.label}</span>
            </button>
          );
        })}
      </div>

      {isOrder && order.length ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Your order:
          </span>
          {order.map((key, i) => (
            <button
              key={`${key}-${i}`}
              type="button"
              onClick={() => removeOrderAt(i)}
              className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 font-mono text-xs text-foreground"
            >
              {i + 1}. {task.options?.find((o) => o.key === key)?.label.slice(0, 28)}… ✕
            </button>
          ))}
        </div>
      ) : null}

      {!submitted ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={isOrder ? order.length === 0 : picked.length === 0}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-transform active:scale-95 disabled:opacity-40"
          >
            Submit decision
          </button>
          {helpLevel < 3 ? (
            <button
              type="button"
              onClick={() => setHelpLevel((h) => (h + 1) as 1 | 2 | 3)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground transition-colors hover:bg-accent"
            >
              <HelpCircle className="size-3.5" /> Help ({helpLevel}/3)
            </button>
          ) : null}
        </div>
      ) : null}

      {helpLevel > 0 && !submitted ? (
        <div className="mt-3 rounded-lg border border-border/60 bg-card/60 p-3 text-sm text-muted-foreground">
          {task.helpLevels.slice(0, helpLevel).map((h, i) => (
            <p key={i} className="mb-1">
              {h}
            </p>
          ))}
        </div>
      ) : null}

      {submitted ? (
        <div className="space-y-3">
          <div
            role="status"
            className={
              "rounded-lg border px-3 py-2 text-sm font-semibold " +
              (submitted.outcome === "met"
                ? "border-success/40 bg-success/10 text-success"
                : submitted.outcome === "partial"
                  ? "border-warning/40 bg-warning/10 text-warning"
                  : "border-destructive/40 bg-destructive/10 text-destructive")
            }
          >
            {submitted.outcome === "met"
              ? "Atendido — "
              : submitted.outcome === "partial"
                ? "Parcial — "
                : "Não atendido — "}
            {submitted.feedback.verdict}
          </div>
          {submitted.feedback.causes.map((cause, i) => (
            <p key={i} className="flex gap-2 text-sm text-muted-foreground">
              <CircleSlash2 className="mt-0.5 size-4 shrink-0 text-destructive" />
              {cause}
            </p>
          ))}
          {submitted.feedback.tradeoffs ? (
            <p className="rounded-lg border border-info/30 bg-info/5 p-3 text-sm text-foreground/90">
              Valid alternative: {submitted.feedback.tradeoffs}
            </p>
          ) : null}
          <ul className="space-y-1 text-sm">
            {task.rubric.criteria.map((c) => (
              <li key={c.key} className="flex gap-2 text-muted-foreground">
                {submitted.criteria[c.key] ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                ) : (
                  <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                )}
                <span>{c.label}</span>
              </li>
            ))}
          </ul>
          {helpLevel >= 3 ? (
            <div className="rounded-lg border border-border/60 bg-card/60 p-3 text-sm text-foreground/90">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Reasoned answer
              </p>
              {task.rubric.expected}
            </div>
          ) : null}
          <p className="text-sm font-medium text-foreground">
            Next step: {submitted.feedback.nextStep}
          </p>
          <button
            type="button"
            onClick={() => {
              setSubmitted(null);
              setPicked([]);
              setOrder([]);
              setHelpLevel(0);
            }}
            className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground transition-colors hover:bg-accent"
          >
            Tentar de novo
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Grava a tentativa no store compartilhado (D7/D9) E a evidência contextual
 * (D8): o registro de evidência usa o MESMO ts da tentativa — a comparação
 * tentativa↔evidência no Progresso casa por (taskId, ts). O status
 * (evaluated/revealed) deriva do apoio usado; nunca é escolhido à mão.
 */
export function useAttemptRecorder() {
  const { recordAttempt } = useLearning();
  const { addEvidence } = useEvidence();
  return (
    task: Task,
    result: ReturnType<typeof evaluate>,
    help: number,
    answer: Answer,
  ) => {
    const ts = Date.now();
    recordAttempt({
      taskId: task.id,
      conceptId: task.conceptId,
      ts,
      help: Math.min(3, help) as 0 | 1 | 2 | 3,
      criteria: { ...result.criteria },
      outcome: result.outcome,
    });
    addEvidence(
      {
        kind: "task",
        taskId: task.id,
        conceptId: task.conceptId,
        outcome: result.outcome,
        answer,
        helpUsed: Math.min(3, help),
        scenario: task.context ?? task.prompt,
      },
      ts,
    );
  };
}

/** Tarefas da lição resolvidas contra o motor. */
export function lessonTasks(lesson: Lesson): Task[] {
  return lesson.practiceIds
    .map((id) => getTask(id))
    .filter((t): t is Task => Boolean(t));
}
