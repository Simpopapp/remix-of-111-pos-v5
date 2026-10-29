import { useEffect, useState, useSyncExternalStore } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  CircleSlash2,
  FlaskConical,
  HelpCircle,
  NotebookPen,
} from "lucide-react";
import { useEvidence } from "@/hooks/use-evidence";
import { getMission, latestHypothesisText, deriveDossierDraft } from "@/lib/missions";
import { getTask } from "@/lib/exercises-data";
import { evaluate, type Answer, type Task } from "@/lib/exercises";
import { useLearning } from "@/hooks/use-learning";
import type { MissionHistoryEntry, MissionProgress } from "@/lib/learning";
import {
  getBenchReports,
  getBenchReportsServerSnapshot,
  subscribeBenchReports,
} from "@/lib/bench-reports";

export const Route = createFileRoute("/missions/$slug")({
  beforeLoad: ({ params }) => {
    if (!getMission(params.slug)) throw notFound();
  },
  head: ({ params }) => {
    const mission = getMission(params.slug);
    const title = mission
      ? `${mission.title} — Missions — VibeCoder Academy`
      : "Mission — VibeCoder Academy";
    const description = mission ? mission.problem : "An integrated learning mission.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: MissionPage,
});

/**
 * Rótulo honesto do histórico (D7): etapa percorrida / critério demonstrado /
 * reflexão não avaliada — nunca nota falsa de texto aberto.
 */
function historyLabel(entry: MissionHistoryEntry): string {
  switch (entry.status) {
    case "collected":
      return "Reflexão — coletada, sem nota";
    case "lab":
      return `Evidência do laboratório ${entry.labId}`;
    case "met":
      return "Critério demonstrado";
    case "partial":
      return "Parcialmente demonstrado";
    case "missed":
      return "Critério não atendido";
  }
}

function ReasoningPanel({ history }: { history: MissionHistoryEntry[] | undefined }) {
  if (!history || history.length === 0) return null;
  return (
    <section
      data-testid="mission-history"
      className="mt-6 rounded-2xl border border-ink-muted/30 bg-paper-muted p-5"
    >
      <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-ink">
        <NotebookPen className="size-4 text-primary" /> Reasoning so far
      </h2>
      <p className="mt-1 text-xs text-ink-muted">
        Every prediction, revision and decision stays here — consultable at any
        step. Nothing is erased when you move on.
      </p>
      <ul className="mt-3 space-y-2">
        {history.map((entry) => (
          <li
            key={entry.id}
            data-testid="mission-history-entry"
            className="rounded-xl border border-border/60 bg-card/70 p-3"
          >
            <p className="font-mono text-[11px] uppercase tracking-wide text-ink-muted">
              {entry.kind} · {historyLabel(entry)}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink">{entry.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Relatórios recentes do laboratório desta etapa (D7): o retorno da
 * ida-e-volta oferece incorporar o resultado como evidência da missão.
 */
function LabReports({
  labId,
  onIncorporate,
}: {
  labId: string;
  onIncorporate: (text: string, reportId: string) => void;
}) {
  const reports = useSyncExternalStore(
    subscribeBenchReports,
    getBenchReports,
    getBenchReportsServerSnapshot,
  );
  const labReports = reports.reports.filter((r) => r.labId === labId).slice(0, 3);
  if (labReports.length === 0) return null;
  return (
    <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <p className="font-mono text-[11px] uppercase tracking-wide text-primary">
        Recent experiment reports · {labId}
      </p>
      <ul className="mt-2 space-y-2">
        {labReports.map((report) => (
          <li key={report.id} className="rounded-lg border border-border/60 bg-card/70 p-3">
            <p className="text-xs text-muted-foreground">
              Config {JSON.stringify(report.config)} · {report.createdAt}
            </p>
            <p className="mt-1 text-sm text-ink">Observation: {report.observation}</p>
            <p className="text-sm text-muted-foreground">Interpreted: {report.interpretation}</p>
            <button
              type="button"
              data-testid="mission-incorporate-report"
              onClick={() =>
                onIncorporate(
                  `Bench ${labId} — observation: ${report.observation} — interpretation: ${report.interpretation}`,
                  report.id,
                )
              }
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-primary/40 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              <FlaskConical className="size-3.5" /> Incorporate as evidence
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Tarefa de prática da missão (motor D8) com seletores estáveis para E2E. */
function MissionTask({
  task,
  onSubmitted,
}: {
  task: Task;
  onSubmitted: (outcome: "met" | "partial" | "missed", chosen: string) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [helpLevel, setHelpLevel] = useState(0);
  const [submitted, setSubmitted] = useState<ReturnType<typeof evaluate> | null>(null);
  const { recordAttempt } = useLearning();
  const { addEvidence } = useEvidence();

  const submit = () => {
    const answer: Answer = { picked };
    const result = evaluate(task, answer, helpLevel);
    setSubmitted(result);
    // Mesmo ts para tentativa e evidência (D8): o Progresso casa os dois
    // registros por (taskId, ts) — o detalhe de evidência mostra a resposta.
    const ts = Date.now();
    recordAttempt({
      taskId: task.id,
      conceptId: task.conceptId,
      ts,
      help: Math.min(3, helpLevel) as 0 | 1 | 2 | 3,
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
        helpUsed: Math.min(3, helpLevel),
        scenario: task.context ?? task.prompt,
      },
      ts,
    );
    const chosen =
      task.options
        ?.filter((o) => picked.includes(o.key))
        .map((o) => o.label)
        .join("; ") ?? "";
    onSubmitted(result.outcome, chosen);
  };

  return (
    <div className="rounded-xl border border-border/60 p-4">
      <p className="mb-1 font-mono text-xs text-muted-foreground">
        Practice · {task.type} · {task.id}
      </p>
      <p className="mb-2 text-sm font-semibold text-foreground">{task.prompt}</p>
      {task.context ? (
        <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{task.context}</p>
      ) : null}

      <div className="mb-3 flex flex-col gap-2">
        {task.options?.map((o) => (
          <button
            key={o.key}
            type="button"
            data-testid={`task-option-${o.key}`}
            disabled={submitted !== null}
            onClick={() => setPicked([o.key])}
            className={
              "flex items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:opacity-70 " +
              (picked.includes(o.key)
                ? "border-primary/50 bg-primary/10 text-foreground"
                : "border-border/60 bg-card/60 text-muted-foreground hover:border-primary/30 hover:text-foreground")
            }
          >
            <span className="mt-0.5 font-mono text-xs text-primary">
              {picked.includes(o.key) ? "●" : "○"}
            </span>
            <span>{o.label}</span>
          </button>
        ))}
      </div>

      {!submitted ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="task-submit"
            onClick={submit}
            disabled={picked.length === 0}
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
        <div data-testid="task-feedback" className="mt-3 space-y-2" aria-live="polite">
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
            <p className="rounded-lg border border-accent-2/30 bg-accent-2/10 p-3 text-sm text-foreground/90">
              Valid alternative: {submitted.feedback.tradeoffs}
            </p>
          ) : null}
          <p className="text-sm font-medium text-foreground">
            Next step: {submitted.feedback.nextStep}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function MissionPage() {
  const { slug } = Route.useParams();
  const mission = getMission(slug)!;
  const { learning, setMission, addMissionHistory } = useLearning();
  const progress = learning.missions[slug];
  const history = progress?.history;

  const [evidence, setEvidence] = useState("");
  const [dossier, setDossier] = useState(progress?.dossier ?? "");
  const [taskDone, setTaskDone] = useState(false);
  const [savedState, setSavedState] = useState(progress?.dossier !== undefined);

  const stepIndex = progress
    ? Math.max(0, mission.steps.findIndex((s) => s.id === progress.step))
    : 0;
  const step = mission.steps[stepIndex]!;
  const task = step.taskId ? getTask(step.taskId) : undefined;

  // O evidence e a submissão pertencem ao step: trocar de step limpa o
  // estado do formulário — o TEXTO já foi preservado no histórico (D7).
  useEffect(() => {
    setEvidence("");
    setTaskDone(false);
  }, [step.id]);

  // Dossiê derivado do histórico (D7): nunca redigido do zero em campo
  // vazio. O rascunho cobre o que foi registrado; editável a partir daí.
  const storedDossier = progress?.dossier;
  useEffect(() => {
    if (step.kind !== "dossier") return;
    setDossier((d) => {
      if (d.trim().length > 0) return d;
      if (storedDossier && storedDossier.trim().length > 0) return storedDossier;
      return deriveDossierDraft(history);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id, storedDossier]);

  const showEvidence =
    step.kind === "briefing" || step.kind === "experiment" || step.kind === "decide";
  const needsTask = step.kind === "predict" || step.kind === "transfer" || step.kind === "decide";
  const canAdvance =
    step.kind === "dossier"
      ? savedState
      : (showEvidence ? evidence.trim().length > 0 : true) &&
        (needsTask ? taskDone : true);
  const canSave = dossier.trim().length > 0;

  /** Avanço preservando o raciocínio: o texto da etapa entra no histórico
   * ANTES de trocar de etapa (D7 — nada é limpo), numa única gravação —
   * um append separado seria sobrescrito pelo setMission do mesmo clique. */
  const commitMission = (stepId: string, dossierText?: string) => {
    const ts = Date.now();
    const collected =
      showEvidence &&
      step.kind !== "dossier" &&
      evidence.trim().length > 0 &&
      // O retorno do laboratório já incorporou o mesmo texto como evidência
      // ("lab"): não duplicar como "collected" ao avançar.
      !(progress?.history ?? []).some(
        (h) => h.stepId === step.id && h.text === evidence.trim(),
      )
        ? [
            {
              id: `${step.id}-${ts}`,
              stepId: step.id,
              kind: step.kind,
              status: "collected" as const,
              text: evidence.trim(),
              ts,
            },
          ]
        : [];
    const next: MissionProgress = {
      ...(progress ?? { ts }),
      step: stepId,
      ts,
      history: [...(progress?.history ?? []), ...collected],
    };
    if (dossierText !== undefined) next.dossier = dossierText;
    setMission(slug, next);
    if (dossierText !== undefined) setSavedState(true);
  };

  const onTaskSubmitted = (outcome: "met" | "partial" | "missed", chosen: string) => {
    setTaskDone(true);
    addMissionHistory(slug, {
      id: `${step.id}-task-${Date.now()}`,
      stepId: step.id,
      kind: step.kind,
      status: outcome,
      text: chosen ? `(${task?.id}) Chose: ${chosen}` : `(${task?.id}) Submitted.`,
      ts: Date.now(),
    });
  };

  const incorporateReport = (text: string, reportId: string) => {
    addMissionHistory(slug, {
      id: `lab-${reportId}`,
      stepId: step.id,
      kind: "experiment",
      status: "lab",
      labId: step.labId!,
      text,
      ts: Date.now(),
    });
    setEvidence((e) => (e.trim().length > 0 ? e : text));
  };

  const hypothesisForLab = latestHypothesisText(history);
  const nextStep = mission.steps[stepIndex + 1];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <header>
        <Link
          to="/missions"
          search={{}}
          className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
        >
          ← All missions
        </Link>
        <h1 className="mt-2 font-serif text-3xl font-extrabold tracking-tight text-foreground">
          {mission.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{mission.problem}</p>
        <p className="mt-3 text-xs text-foreground/90">
          <span className="font-semibold text-primary">Competency: </span>
          {mission.competency}
        </p>
        <p className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs leading-relaxed text-foreground/90">
          <span className="font-semibold text-primary">Learning product: </span>
          {mission.product}
        </p>
      </header>

      <ReasoningPanel history={history} />

      <div className="mt-6 flex items-center justify-between border-b border-border/60 pb-4">
        <p className="font-mono text-xs text-muted-foreground">
          Step {stepIndex + 1} of {mission.steps.length}
        </p>
        <p className="flex gap-1">
          {mission.steps.map((s, i) => (
            <span
              key={s.id}
              aria-label={`Step ${i + 1}: ${s.title}`}
              className={
                "size-2 rounded-full " +
                (i < stepIndex ? "bg-success" : i === stepIndex ? "bg-primary" : "bg-muted")
              }
            />
          ))}
        </p>
      </div>

      <section
        key={step.id}
        data-testid={`mission-step-${step.id}`}
        className="prose-paper mt-6 rounded-2xl p-6"
      >
        <p className="font-mono text-xs uppercase tracking-wide text-ink-muted">
          {step.kind} · {step.id}
        </p>
        <h2 className="mt-1 font-serif text-xl font-bold text-ink">{step.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink">{step.body}</p>

        {task ? (
          <div className="mt-4 rounded-xl border border-ink-muted/30 bg-card p-4">
            <MissionTask task={task} onSubmitted={onTaskSubmitted} />
          </div>
        ) : null}

        {step.kind === "experiment" && step.labId ? (
          <div className="mt-4 rounded-lg border border-ink-muted/30 bg-paper-muted p-3 text-sm text-ink-muted">
            Open the bench in{" "}
            <Link
              to="/labs/$id"
              params={{ id: step.labId }}
              search={
                hypothesisForLab
                  ? { mission: slug, hypothesis: hypothesisForLab }
                  : {}
              }
              data-testid="mission-lab-link"
              className="font-semibold text-ink underline underline-offset-2"
            >
              the {step.labId} lab
            </Link>{" "}
            — the bench receives the hypothesis you are testing and the mission
            offers to incorporate the experiment report when you return.
          </div>
        ) : null}

        {step.kind === "experiment" && step.labId ? (
          <LabReports labId={step.labId} onIncorporate={incorporateReport} />
        ) : null}

        {step.kind !== "dossier" ? (
          showEvidence ? (
            <div className="mt-5">
              <label htmlFor="mission-evidence" className="text-sm font-semibold text-ink">
                Your evidence:
              </label>
              <textarea
                id="mission-evidence"
                data-testid="mission-evidence"
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                rows={3}
                placeholder={step.needsEvidence ?? "O que você observou ou decidiu?"}
                className="mt-1.5 w-full rounded-lg border border-ink-muted/40 bg-white/70 p-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-primary focus:outline-none"
              />
              <p className="mt-1 text-xs text-ink-muted">
                Collected as your reasoning — consultable later, never graded as
                an answer.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-xs text-ink-muted">
              {step.needsEvidence}
            </p>
          )
        ) : (
          <div className="mt-5">
            <label htmlFor="mission-dossier" className="text-sm font-semibold text-ink">
              Dossier — {step.needsEvidence}
            </label>
            <textarea
              id="mission-dossier"
              data-testid="mission-dossier"
              value={dossier}
              onChange={(e) => setDossier(e.target.value)}
              rows={8}
              placeholder="Derivado do seu raciocínio abaixo — edite à vontade."
              className="mt-1.5 w-full rounded-lg border border-ink-muted/40 bg-white/70 p-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-primary focus:outline-none"
            />
            <p className="mt-1 text-xs text-ink-muted">
              Drafted from your recorded predictions, evidence and decisions —
              edit it; nothing here is graded automatically.
            </p>
            <button
              type="button"
              data-testid="mission-save-dossier"
              onClick={() => commitMission(step.id, dossier.trim())}
              disabled={!canSave}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-transform active:scale-95 disabled:opacity-40"
            >
              Save dossier
            </button>
            {savedState ? (
              <p
                data-testid="mission-saved"
                className="mt-3 flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 p-3 text-sm font-semibold text-success"
              >
                <CheckCircle2 className="size-4" /> Dossier saved on this device. A
                review of your transfer variant was scheduled automatically
                (+72h) when you completed it.
              </p>
            ) : null}
          </div>
        )}
      </section>

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {showEvidence && step.kind !== "dossier" ? step.needsEvidence : ""}
        </p>
        {nextStep ? (
          <button
            type="button"
            data-testid="mission-next"
            onClick={() => commitMission(nextStep.id)}
            disabled={!canAdvance}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-transform active:scale-95 disabled:opacity-40"
          >
            Next: {nextStep.title} <ArrowRight className="size-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
