import { useState } from "react";
import { FlaskConical, RotateCcw, Save, Scale } from "lucide-react";
import {
  defaultParamValues,
  defaultToggleValues,
  formatConfig,
  reportReadiness,
  validateParams,
  type Attempt,
  type BenchParamSpec,
  type BenchParamValues,
  type BenchRunConfig,
  type BenchState,
  type BenchToggleSpec,
  type BenchToggleValues,
  type ExperimentReport,
  type ParamErrors,
  type RunObservation,
} from "@/lib/bench";
import { addBenchReport } from "@/lib/bench-reports";
import { appendEvidence } from "@/lib/evidence";
import { addNotebookEntry } from "@/lib/notebook";
import type { SandboxId } from "@/lib/simulators";

export interface BenchAction {
  key: string;
  label: string;
  variant: "primary" | "warning" | "secondary";
}

export interface BenchRunContext {
  params: BenchParamValues;
  toggles: BenchToggleValues;
  action: string;
  attemptN: number;
}

export interface BenchShellProps {
  id: SandboxId;
  specs: BenchParamSpec[];
  toggleSpecs?: BenchToggleSpec[];
  /** Primeira ação é a execução principal; as demais ficam ao lado. */
  actions: BenchAction[];
  onRun: (ctx: BenchRunContext) => RunObservation;
  /** Reinício explícito: limpa a sessão E o estado vivo do laboratório. */
  onReset: () => void;
  /** Troca de configuração: aplicada à próxima execução, sem reiniciar (D6). */
  onConfigChange?: (params: BenchParamValues, toggles: BenchToggleValues) => void;
  /** null = laboratório não tem pausa. */
  paused?: boolean;
  instrument: React.ReactNode;
  controlsExtra?: React.ReactNode;
}

const GROUPS_OF = 3;

interface ConfigGroup {
  label: string;
  config: BenchRunConfig;
  runs: Attempt[];
}

function groupAttempts(attempts: Attempt[]): ConfigGroup[] {
  const groups: ConfigGroup[] = [];
  for (const attempt of attempts) {
    const last = groups[groups.length - 1];
    if (last && last.label === attempt.config.label) {
      last.runs.push(attempt);
    } else {
      groups.push({ label: attempt.config.label, config: attempt.config, runs: [attempt] });
    }
  }
  return groups;
}

const STATE_CHIP: Record<BenchState, { label: string; className: string }> = {
  "no-run": { label: "no run yet", className: "border-border bg-muted text-muted-foreground" },
  "invalid-param": { label: "invalid parameter", className: "border-destructive/40 bg-destructive/10 text-destructive" },
  partial: { label: "partial", className: "border-warning/40 bg-warning/10 text-warning" },
  paused: { label: "paused", className: "border-info/40 bg-info/10 text-info" },
  "out-of-model": { label: "out of model", className: "border-warning/40 bg-warning/10 text-warning" },
  ready: { label: "evidence ready", className: "border-success/40 bg-success/10 text-success" },
};

const ACTION_CLASS: Record<BenchAction["variant"], string> = {
  primary: "bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95",
  warning: "border border-warning/40 bg-warning/10 text-warning",
  secondary: "border border-border bg-secondary text-foreground hover:bg-accent",
};

/** Bancada unificada (D6): previsão → execução identificável → observação → relatório. */
export function BenchShell(props: BenchShellProps) {
  const toggleSpecs = props.toggleSpecs ?? [];
  const [params, setParams] = useState(() => defaultParamValues(props.specs));
  const [toggles, setToggles] = useState(() => defaultToggleValues(toggleSpecs));
  const [prediction, setPrediction] = useState("");
  const [interpretation, setInterpretation] = useState("");
  const [verdict, setVerdict] = useState("");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [paramErrors, setParamErrors] = useState<ParamErrors | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const groups = groupAttempts(attempts);
  const latest = attempts[attempts.length - 1];
  const outOfModel = latest?.observation.outOfModel;

  const state: BenchState = paramErrors
    ? "invalid-param"
    : attempts.length === 0
      ? "no-run"
      : props.paused
        ? "paused"
        : interpretation.trim().length === 0
          ? "partial"
          : "ready";

  const applyParams = (key: string, value: number) => {
    const next = { ...params, [key]: value };
    setParams(next);
    props.onConfigChange?.(next, toggles);
  };

  const applyToggle = (key: string, value: string) => {
    const next = { ...toggles, [key]: value };
    setToggles(next);
    props.onConfigChange?.(params, next);
  };

  const run = (action: string) => {
    const errors = validateParams(props.specs, params);
    if (errors) {
      setParamErrors(errors);
      setNotice("Invalid parameter — fix the highlighted control before running.");
      return;
    }
    setParamErrors(null);
    if (attempts.length === 0 && prediction.trim().length === 0) {
      setNotice("Prediction required before the first run: write what you expect to observe.");
      return;
    }
    const attemptN = attempts.length + 1;
    const observation = props.onRun({
      params: { ...params },
      toggles: { ...toggles },
      action,
      attemptN,
    });
    const config: BenchRunConfig = {
      label: formatConfig(props.specs, toggleSpecs, params, toggles),
      params: { ...params },
      toggles: { ...toggles },
    };
    const at = new Date().toLocaleTimeString();
    setAttempts((prev) => [...prev, { n: attemptN, config, at, observation }]);
    setNotice(null);
  };

  const resetSession = () => {
    setAttempts([]);
    setPrediction("");
    setInterpretation("");
    setVerdict("");
    setParamErrors(null);
    setNotice(null);
    props.onReset();
  };

  const readiness = reportReadiness({ attempts, hypothesis: prediction, interpretation });

  const saveReport = () => {
    if (readiness.state !== "ready") return;
    const latestGroup = groups[groups.length - 1];
    const earlierGroup = groups.find((g) => g !== latestGroup);
    const observation = attempts
      .slice(-GROUPS_OF * 2)
      .map((a) => `#${a.n} [${a.config.label}] ${a.observation.headline}`)
      .join(" · ");
    const report: ExperimentReport = {
      id: `report-${props.id}-${Date.now().toString(36)}`,
      labId: props.id,
      hypothesis: prediction,
      config: latestGroup!.config,
      observation,
      interpretation,
      createdAt: new Date().toISOString(),
    };
    if (earlierGroup) report.previousConfig = earlierGroup.config;
    if (verdict.trim().length > 0) report.verdict = verdict;
    addBenchReport(report);
    // Evidência contextual (D8): o relatório da bancada vira registro de
    // evidência (reflexão pessoal) e entra no caderno com origem rastreada.
    const evidence = appendEvidence({
      kind: "lab",
      labId: props.id,
      hypothesis: prediction,
      config: { ...latestGroup!.config.params },
      observation,
      interpretation,
    });
    addNotebookEntry({
      title: `Relatório de experimento — ${props.id}`,
      type: "experiment-report",
      originEvidenceIds: [evidence.id],
      body: `Hipótese: ${prediction}\nObservação: ${observation}\nInterpretação: ${interpretation}`,
    });
    setNotice("Experiment report registered — it becomes notebook material in Progress.");
  };

  const chip = STATE_CHIP[state];

  return (
    <div className="rounded-2xl border border-border/70 bg-card/40">
      {/* Faixa de estado da bancada */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 px-4 py-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-4 text-primary" aria-hidden="true" />
          <span className="font-serif text-sm font-semibold text-foreground">Workbench</span>
          <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${chip.className}`}>
            {chip.label}
          </span>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {attempts.length} run{attempts.length === 1 ? "" : "s"} · {groups.length} config{groups.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
        {/* Coluna de controles com limites visíveis */}
        <div className="space-y-4 border-b border-border/50 p-4 lg:border-b-0 lg:border-r">
          {props.specs.map((spec) => {
            const error = paramErrors?.[spec.key];
            return (
              <div key={spec.key}>
                <label htmlFor={`bench-${props.id}-${spec.key}`} className="block text-xs font-semibold text-foreground">
                  {spec.label}
                </label>
                <input
                  id={`bench-${props.id}-${spec.key}`}
                  type="number"
                  min={spec.min}
                  max={spec.max}
                  step={spec.step}
                  value={params[spec.key] ?? spec.default}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) applyParams(spec.key, v);
                  }}
                  aria-invalid={error ? true : undefined}
                  className={
                    "mt-1 w-full rounded-lg border bg-background/60 px-2 py-1.5 font-mono text-xs text-foreground " +
                    (error ? "border-destructive" : "border-border")
                  }
                />
                <p className={"mt-0.5 text-[10px] " + (error ? "text-destructive" : "text-muted-foreground")}>
                  {error ?? `${spec.min}–${spec.max}${spec.unit ? " " + spec.unit : ""} · ${spec.hint}`}
                </p>
              </div>
            );
          })}

          {toggleSpecs.map((spec) => (
            <div key={spec.key}>
              <label htmlFor={`bench-${props.id}-${spec.key}`} className="block text-xs font-semibold text-foreground">
                {spec.label}
              </label>
              <select
                id={`bench-${props.id}-${spec.key}`}
                value={toggles[spec.key] ?? spec.default}
                onChange={(e) => applyToggle(spec.key, e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background/60 px-2 py-1.5 text-xs text-foreground"
              >
                {spec.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{spec.hint}</p>
            </div>
          ))}

          {props.controlsExtra}
        </div>

        {/* Instrumento vivo + execução identificável */}
        <div className="space-y-4 p-4">
          <div aria-label="Live instrument">{props.instrument}</div>

          <div className="flex flex-wrap items-center gap-2">
            {props.actions.map((action, i) => (
              <button
                key={action.key}
                type="button"
                onClick={() => run(action.key)}
                className={"rounded-xl px-4 py-2 text-xs font-bold " + ACTION_CLASS[action.variant]}
              >
                {i === 0 ? `${action.label} · run #${attempts.length + 1}` : action.label}
              </button>
            ))}
            <button
              type="button"
              onClick={resetSession}
              className="ml-auto rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive"
              title="Restart the session: clears runs, prediction and report draft."
            >
              <RotateCcw className="mr-1 inline size-3" aria-hidden="true" />
              Restart session
            </button>
          </div>

          {notice ? (
            <p role="status" className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
              {notice}
            </p>
          ) : null}
          {outOfModel ? (
            <p role="status" className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
              Out of model: {outOfModel}
            </p>
          ) : null}
          {paramErrors ? (
            <p role="status" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              Invalid parameter: {Object.values(paramErrors).join("; ")}
            </p>
          ) : null}

          {/* Faixa de registro — cada execução identificável */}
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Run record</p>
            <div
              role="log"
              aria-label="Run record"
              className="scrollbar-thin max-h-44 space-y-1 overflow-y-auto rounded-lg border border-border bg-background/60 p-3 font-mono text-xs text-muted-foreground"
            >
              {attempts.length === 0 ? (
                <p>No runs yet — predict, then execute.</p>
              ) : (
                [...attempts].reverse().map((a) => (
                  <div key={a.n}>
                    <span className="text-primary">#{a.n}</span>{" "}
                    <span className="text-muted-foreground">[{a.config.label}]</span>{" "}
                    <span className={a.observation.outOfModel ? "text-warning" : "text-foreground"}>{a.observation.headline}</span>
                    {a.observation.detail.slice(0, 2).map((d, i) => (
                      <div key={i} className="pl-6 text-muted-foreground/80">
                        {d}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
            {/* Único anúncio discreto: a última execução */}
            <div role="status" className="sr-only">
              {latest ? `Run ${latest.n}: ${latest.observation.headline}` : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Comparação rotulada */}
      {groups.length >= 2 ? (
        <div className="border-t border-border/50 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Scale className="size-3.5 text-primary" aria-hidden="true" />
            Labeled comparison
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {groups.slice(-2).map((g, i) => (
              <div key={g.label} className="rounded-lg border border-border bg-background/60 p-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Config {String.fromCharCode(65 + (groups.slice(-2).length - 1 - i))} · {g.runs.length} run{g.runs.length === 1 ? "" : "s"}
                </p>
                <p className="mt-1 font-mono text-xs text-foreground">{g.label}</p>
                <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  {g.runs.slice(-3).map((a) => (
                    <li key={a.n}>
                      #{a.n} {a.observation.headline}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Previsão → observação → interpretação → relatório (9.7) */}
      <div className="space-y-3 border-t border-border/50 p-4">
        <div>
          <label htmlFor={`bench-${props.id}-prediction`} className="block text-xs font-semibold text-foreground">
            Prediction (required before the first run)
          </label>
          <textarea
            id={`bench-${props.id}-prediction`}
            value={prediction}
            onChange={(e) => setPrediction(e.target.value)}
            rows={2}
            placeholder="What do you expect to observe when you run?"
            className="mt-1 w-full rounded-lg border border-border bg-background/60 px-2 py-1.5 text-xs text-foreground"
          />
        </div>
        <div>
          <label htmlFor={`bench-${props.id}-interpretation`} className="block text-xs font-semibold text-foreground">
            Interpretation
          </label>
          <textarea
            id={`bench-${props.id}-interpretation`}
            value={interpretation}
            onChange={(e) => setInterpretation(e.target.value)}
            rows={2}
            placeholder="What does the evidence show?"
            className="mt-1 w-full rounded-lg border border-border bg-background/60 px-2 py-1.5 text-xs text-foreground"
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-40 flex-1">
            <label htmlFor={`bench-${props.id}-verdict`} className="block text-xs font-semibold text-foreground">
              Verdict <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <input
              id={`bench-${props.id}-verdict`}
              value={verdict}
              onChange={(e) => setVerdict(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background/60 px-2 py-1.5 text-xs text-foreground"
            />
          </div>
          <button
            type="button"
            onClick={saveReport}
            disabled={readiness.state !== "ready"}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="mr-1 inline size-3" aria-hidden="true" />
            Save experiment report
          </button>
        </div>
        <p role="status" className="text-[10px] text-muted-foreground">
          {readiness.state === "ready"
            ? "Ready to register: hypothesis, labeled config, observation and interpretation."
            : readiness.reason}
        </p>
      </div>
    </div>
  );
}
