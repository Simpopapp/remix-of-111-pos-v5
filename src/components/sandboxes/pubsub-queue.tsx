import { useEffect, useRef, useState } from "react";
import { createPubSubQueue, type QueueStepResult } from "@/lib/simulators";
import type { BenchParamSpec, BenchToggleSpec, RunObservation } from "@/lib/bench";
import { BenchShell, type BenchRunContext } from "./bench-shell";

const SPECS: BenchParamSpec[] = [
  {
    key: "workers",
    label: "Workers / subscribers",
    min: 1,
    max: 5,
    step: 1,
    default: 3,
    hint: "competing: N workers share one queue · fan-out: N copies per event",
  },
];

const TOGGLES: BenchToggleSpec[] = [
  {
    key: "mode",
    label: "Structure",
    options: [
      { value: "competing", label: "Competing consumers" },
      { value: "fanout", label: "Fan-out (topic)" },
    ],
    default: "competing",
    hint: "competing splits events between workers; fan-out delivers one copy each",
  },
  {
    key: "failure",
    label: "Failure kind",
    options: [
      { value: "none", label: "None (healthy)" },
      { value: "transient", label: "Transient (retry works)" },
      { value: "poison", label: "Poison (never succeeds)" },
      { value: "slow", label: "Slow consumer" },
    ],
    default: "none",
    hint: "distinct causes: transient retries, poison dead-letters, slow lags",
  },
];

interface LogLine {
  tone: "ok" | "err" | "warn" | "info";
  text: string;
}

const TONE_CLASS: Record<LogLine["tone"], string> = {
  ok: "text-success",
  err: "text-destructive",
  warn: "text-warning",
  info: "text-info",
};

const MAX_ATTEMPTS = 3;

/** S5 — Pub/Sub + Queue na bancada unificada (F4: estruturas, trajetória, DLQ). */
export function PubSubQueueSandbox() {
  const queue = useRef<ReturnType<typeof createPubSubQueue> | null>(null);
  const cfg = useRef({ mode: "competing", workers: 3, failure: "none" });
  const nextEvent = useRef(1);
  const totals = useRef({ processed: 0, dead: 0 });
  const [paused, setPaused] = useState(false);
  const [view, setView] = useState({ queueDepth: 0, processed: 0, dead: 0 });
  const [log, setLog] = useState<LogLine[]>([
    { tone: "info", text: "[Ready] Predict: where does one event go in this structure?" },
  ]);

  const ensure = () => {
    if (!queue.current) {
      const opts: Parameters<typeof createPubSubQueue>[0] = {
        mode: cfg.current.mode as "competing" | "fanout",
        workers: cfg.current.workers,
        maxAttempts: MAX_ATTEMPTS,
      };
      if (cfg.current.failure !== "none") {
        opts.failure = cfg.current.failure as "transient" | "poison" | "slow";
      }
      queue.current = createPubSubQueue(opts);
    }
    return queue.current;
  };

  const push = (tone: LogLine["tone"], text: string) => {
    setLog((prev) => [{ tone, text }, ...prev].slice(0, 40));
  };

  const refresh = () => {
    const snap = ensure().snapshot();
    setView({ queueDepth: snap.queueDepth, processed: totals.current.processed, dead: totals.current.dead });
  };

  const describeStep = (r: QueueStepResult): { tone: LogLine["tone"]; text: string } | null => {
    if (r.outcome === "idle") return null;
    if (r.outcome === "processed") {
      return {
        tone: "ok",
        text: `Event #${r.event?.id} → worker #${r.worker} processed "${r.event?.payload}" (${totals.current.processed} done)`,
      };
    }
    if (r.outcome === "retry") {
      return {
        tone: "warn",
        text: `Event #${r.event?.id} → worker #${r.worker} FAILED "${r.event?.payload}" (attempt ${r.event?.attempts}/${MAX_ATTEMPTS}) — back in the queue`,
      };
    }
    return {
      tone: "err",
      text: `Event #${r.event?.id} → worker #${r.worker} FAILED "${r.event?.payload}" ${MAX_ATTEMPTS}× — sent to the DEAD LETTER QUEUE`,
    };
  };

  const stepOnce = (): QueueStepResult => ensure().step();

  // Processamento contínuo; pausa é explícita (estado de bancada).
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      const before = { ...totals.current };
      const r = stepOnce();
      if (r.outcome === "idle") return;
      if (r.outcome === "processed") totals.current.processed++;
      if (r.outcome === "dead") totals.current.dead++;
      const described = describeStep(r);
      if (described) push(described.tone, described.text);
      if (before.processed !== totals.current.processed || before.dead !== totals.current.dead) refresh();
      setView((v) => ({ ...v, queueDepth: r.queueDepth, processed: totals.current.processed, dead: totals.current.dead }));
    }, 700);
    return () => clearInterval(t);
  }, [paused]);

  const onRun = (ctx: BenchRunContext): RunObservation => {
    if (ctx.action === "publish") {
      const q = ensure();
      const payload = `event-${nextEvent.current}`;
      nextEvent.current++;
      const ev = q.publish(payload);
      const snap = q.snapshot();
      if (cfg.current.mode === "fanout") {
        push("info", `[PUB] Event #${ev.id} "${payload}" fanned out to ${cfg.current.workers} subscribers (one copy each).`);
        return {
          headline: `Published event #${ev.id} → copied to ${cfg.current.workers} subscribers`,
          detail: [
            "Path: publish → one delivery per subscriber (fan-out structure).",
            "Each subscriber's copy fails and retries independently.",
          ],
        };
      }
      push("info", `[PUB] Event #${ev.id} "${payload}" queued → depth ${snap.queueDepth}.`);
      return {
        headline: `Published event #${ev.id} → queue depth ${snap.queueDepth}`,
        detail: [
          "Path: publish → shared queue → ONE worker picks it up (competing structure).",
          "The other workers never see this event.",
        ],
      };
    }

    // step ×5: processa até 5 passos sincronamente
    const outcomes: string[] = [];
    let processed = 0;
    let dead = 0;
    for (let i = 0; i < 5; i++) {
      const r = stepOnce();
      if (r.outcome === "idle") break;
      if (r.outcome === "processed") {
        processed++;
        totals.current.processed++;
        outcomes.push(`#${r.event?.id} ✓ worker ${r.worker}`);
      } else if (r.outcome === "dead") {
        dead++;
        totals.current.dead++;
        outcomes.push(`#${r.event?.id} ✗ → DLQ`);
      } else {
        outcomes.push(`#${r.event?.id} retry ${r.event?.attempts}/${MAX_ATTEMPTS}`);
      }
      const described = describeStep(r);
      if (described) push(described.tone, described.text);
    }
    refresh();
    return {
      headline: `Stepped the queue ×5: ${processed} processed, ${dead} dead-lettered`,
      detail: [
        outcomes.length > 0 ? outcomes.join(" · ") : "Nothing to process — the queue is idle.",
        cfg.current.failure !== "none"
          ? `Failure policy: ${cfg.current.failure} — maxAttempts ${MAX_ATTEMPTS} decides what reaches the DLQ.`
          : "No failure configured: every delivery acks on the first attempt.",
      ],
    };
  };

  const onConfigChange = (params: Record<string, number>, toggles: Record<string, string>) => {
    cfg.current = {
      mode: toggles["mode"] ?? cfg.current.mode,
      workers: params["workers"] ?? cfg.current.workers,
      failure: toggles["failure"] ?? cfg.current.failure,
    };
    const old = queue.current?.snapshot();
    queue.current = null;
    ensure();
    totals.current.processed += old?.processed ?? 0;
    totals.current.dead += old?.dead ?? 0;
    push(
      "info",
      `[CFG] Structure rebuilt: ${cfg.current.mode}, ${cfg.current.workers} workers, failure ${cfg.current.failure}. In-flight state of the old structure is dropped; counters preserved (${totals.current.processed} processed, ${totals.current.dead} dead).`,
    );
    refresh();
  };

  const onReset = () => {
    queue.current = null;
    totals.current = { processed: 0, dead: 0 };
    nextEvent.current = 1;
    ensure();
    setPaused(false);
    setView({ queueDepth: 0, processed: 0, dead: 0 });
    setLog([{ tone: "info", text: "[Reset] Session restarted: empty queue, counters zeroed." }]);
  };

  return (
    <BenchShell
      id="pubsub"
      specs={SPECS}
      toggleSpecs={TOGGLES}
      actions={[
        { key: "publish", label: "Publish event", variant: "primary" },
        { key: "step", label: "Process ×5 steps", variant: "secondary" },
      ]}
      onRun={onRun}
      onReset={onReset}
      onConfigChange={onConfigChange}
      paused={paused}
      controlsExtra={
        <button
          type="button"
          onClick={() => {
            const next = !paused;
            setPaused(next);
            push("info", next ? "[PAUSE] Auto-processing paused. The queue keeps what it has." : "[RESUME] Auto-processing resumed.");
          }}
          className={
            "w-full rounded-xl border px-3 py-2 text-xs font-semibold transition-colors " +
            (paused ? "border-info/40 bg-info/10 text-info" : "border-border bg-secondary text-foreground hover:bg-accent")
          }
        >
          {paused ? "Resume auto-processing" : "Pause auto-processing"}
        </button>
      }
      instrument={
        <div>
          <div className="mb-3 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-border bg-background/60 p-2">
              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">In queue</span>
              <span className="font-mono text-2xl font-extrabold text-warning">{view.queueDepth}</span>
            </div>
            <div className="rounded-xl border border-border bg-background/60 p-2">
              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Processed</span>
              <span className="font-mono text-2xl font-extrabold text-success">{view.processed}</span>
            </div>
            <div className="rounded-xl border border-border bg-background/60 p-2">
              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Dead-lettered</span>
              <span className={"font-mono text-2xl font-extrabold " + (view.dead > 0 ? "text-destructive" : "text-foreground")}>
                {view.dead}
              </span>
            </div>
          </div>
          {view.dead > 0 ? (
            <p className="mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-center text-xs font-bold text-destructive">
              DEAD LETTER QUEUE: {view.dead} message{view.dead > 1 ? "s" : ""} — consequence of maxAttempts {MAX_ATTEMPTS}, awaiting human review
            </p>
          ) : null}
          <div
            role="log"
            aria-label="Event trajectory log"
            className="scrollbar-thin h-32 overflow-y-auto rounded-lg border border-border bg-background/60 p-3 font-mono text-xs text-muted-foreground"
          >
            {log.map((line, i) => (
              <div key={i} className={TONE_CLASS[line.tone]}>
                {line.text}
              </div>
            ))}
          </div>
          <div role="status" className="sr-only">
            {log[0]?.text ?? ""}
          </div>
        </div>
      }
    />
  );
}
