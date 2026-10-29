import { useRef, useState } from "react";
import { createCircuitBreaker, type BreakerState } from "@/lib/simulators";
import type { BenchParamSpec, BenchToggleSpec, RunObservation } from "@/lib/bench";
import { BenchShell, type BenchRunContext } from "./bench-shell";

const SPECS: BenchParamSpec[] = [
  {
    key: "threshold",
    label: "Failure threshold",
    min: 1,
    max: 5,
    step: 1,
    default: 3,
    hint: "consecutive failures that open the breaker",
  },
  {
    key: "cooldownMs",
    label: "Cooldown",
    min: 1000,
    max: 10000,
    step: 500,
    default: 5000,
    unit: "ms",
    hint: "time in OPEN before a half-open probe is allowed",
  },
];

const TOGGLES: BenchToggleSpec[] = [
  {
    key: "protection",
    label: "Protection",
    options: [
      { value: "protected", label: "Breaker ON" },
      { value: "unprotected", label: "Breaker OFF (raw calls)" },
    ],
    default: "protected",
    hint: "same call sequence, with and without protection",
  },
];

interface CallLine {
  tone: "ok" | "err" | "warn" | "info";
  text: string;
}

const TONE_CLASS: Record<CallLine["tone"], string> = {
  ok: "text-success",
  err: "text-destructive",
  warn: "text-warning",
  info: "text-info",
};

const STATES: { id: BreakerState; label: string; tone: string }[] = [
  { id: "closed", label: "CLOSED — normal calls", tone: "border-success/40 bg-success/10 text-success" },
  { id: "open", label: "OPEN — failing fast", tone: "border-destructive/40 bg-destructive/10 text-destructive" },
  { id: "half-open", label: "HALF-OPEN — probing", tone: "border-warning/40 bg-warning/10 text-warning" },
];

/** S2 — Circuit Breaker na bancada unificada (F4: estados acompanham a execução). */
export function CircuitBreakerSandbox() {
  const breaker = useRef<ReturnType<typeof createCircuitBreaker> | null>(null);
  const outage = useRef(false);
  const clock = useRef(0);
  const cfg = useRef({ threshold: 3, cooldownMs: 5000, protection: "protected" });
  const [log, setLog] = useState<CallLine[]>([
    { tone: "info", text: "[Ready] Predict: what happens to the 4th call during an outage?" },
  ]);
  const [stateView, setStateView] = useState<BreakerState>("closed");
  const [outageView, setOutageView] = useState(false);

  const ensure = () => {
    if (!breaker.current) {
      breaker.current = createCircuitBreaker({
        threshold: cfg.current.threshold,
        cooldownMs: cfg.current.cooldownMs,
        now: () => clock.current,
      });
    }
    return breaker.current;
  };

  const push = (tone: CallLine["tone"], text: string) => {
    setLog((prev) => [{ tone, text }, ...prev].slice(0, 24));
  };

  const onRun = (ctx: BenchRunContext): RunObservation => {
    const b = ensure();

    if (ctx.action === "outage") {
      outage.current = true;
      setOutageView(true);
      push("err", "[OUTAGE] Downstream payment provider is DOWN — next calls will fail.");
      return {
        headline: "Downstream outage injected",
        detail: ["No call was issued; the injection only changes what the next calls meet."],
      };
    }
    if (ctx.action === "restore") {
      outage.current = false;
      setOutageView(false);
      push("info", "[RESTORE] Payment provider is back up — next calls should succeed.");
      return {
        headline: "Downstream restored",
        detail: ["The breaker only learns this when the next probe/call succeeds."],
      };
    }

    // Ação "call": o relógio virtual avança 1s por chamada (o cooldown corre).
    clock.current += 1000;
    const callN = clock.current / 1000;
    if (!outage.current) {
      if (cfg.current.protection === "protected") {
        const res = b.record(true);
        setStateView(res.state);
        push("ok", `[${String(callN).padStart(2, "0")}s] Call → 200 OK in 120 ms (breaker: ${res.state.toUpperCase()})`);
        return {
          headline: `Call succeeded in 120 ms (breaker ${res.state.toUpperCase()})`,
          detail: ["Success resets the failure count."],
        };
      }
      push("ok", `[${String(callN).padStart(2, "0")}s] Call → 200 OK in 120 ms (no breaker configured)`);
      return {
        headline: "Call succeeded in 120 ms — no protection configured",
        detail: ["Without protection this is identical when things are healthy; the difference appears in the outage."],
      };
    }

    if (cfg.current.protection === "protected") {
      const res = b.record(false);
      setStateView(res.state);
      if (res.blocked) {
        push("warn", `[${String(callN).padStart(2, "0")}s] Call BLOCKED in ~5 ms — breaker OPEN, failing fast.`);
        return {
          headline: `Call #${callN} blocked in ~5 ms — breaker OPEN, failing fast`,
          detail: [
            "The caller got an immediate error instead of waiting 5000 ms.",
            "Each blocked call advances the virtual clock, so the cooldown elapses.",
          ],
        };
      }
      push("err", `[${String(callN).padStart(2, "0")}s] Call → TIMEOUT after 5000 ms (failure counted)`);
      return {
        headline: `Call #${callN} timed out after 5000 ms — failure counted`,
        detail: [
          res.state === "half-open"
            ? "This was a half-open probe: it failed, so the breaker re-opens."
            : "Consecutive failures approach the threshold that opens the breaker.",
        ],
      };
    }

    push("err", `[${String(callN).padStart(2, "0")}s] Call → TIMEOUT after 5000 ms (no protection: every call pays the full timeout)`);
    return {
      headline: `Call #${callN} timed out after 5000 ms — no protection`,
      detail: ["Every caller pays the full timeout while the provider is down; nothing trips, nothing fails fast."],
    };
  };

  const onConfigChange = (params: Record<string, number>, toggles: Record<string, string>) => {
    cfg.current = {
      threshold: params["threshold"] ?? cfg.current.threshold,
      cooldownMs: params["cooldownMs"] ?? cfg.current.cooldownMs,
      protection: toggles["protection"] ?? cfg.current.protection,
    };
    breaker.current = null;
    ensure();
    setStateView("closed");
    push(
      "info",
      `[CFG] Breaker re-created with threshold ${cfg.current.threshold}, cooldown ${cfg.current.cooldownMs}ms, protection ${cfg.current.protection} — breaker state restarted.`,
    );
  };

  const onReset = () => {
    breaker.current = null;
    outage.current = false;
    clock.current = 0;
    ensure();
    setStateView("closed");
    setOutageView(false);
    setLog([{ tone: "info", text: "[Reset] Session restarted: breaker CLOSED, no outage, clock at 0." }]);
  };

  return (
    <BenchShell
      id="circuit"
      specs={SPECS}
      toggleSpecs={TOGGLES}
      actions={[
        { key: "call", label: "Call payment API", variant: "primary" },
        { key: "outage", label: "Inject outage", variant: "warning" },
        { key: "restore", label: "Restore downstream", variant: "secondary" },
      ]}
      onRun={onRun}
      onReset={onReset}
      onConfigChange={onConfigChange}
      instrument={
        <div>
          <div className="mb-3 grid gap-2 sm:grid-cols-3">
            {cfg.current.protection === "protected" ? (
              STATES.map((s) => (
                <div
                  key={s.id}
                  className={
                    "rounded-lg border px-2 py-1.5 text-center text-[10px] font-mono uppercase tracking-wider " +
                    (stateView === s.id ? s.tone : "border-border bg-muted text-muted-foreground/60")
                  }
                >
                  {s.label}
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-border bg-muted px-2 py-1.5 text-center text-[10px] font-mono uppercase tracking-wider text-muted-foreground sm:col-span-3">
                No breaker — calls always flow, healthy or not
              </div>
            )}
          </div>
          {outageView ? (
            <p className="mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-center text-xs font-bold text-destructive">
              OUTAGE ACTIVE — payment provider is down
            </p>
          ) : null}
          <div
            role="log"
            aria-label="Call log"
            className="scrollbar-thin h-28 overflow-y-auto rounded-lg border border-border bg-background/60 p-3 font-mono text-xs text-muted-foreground"
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
