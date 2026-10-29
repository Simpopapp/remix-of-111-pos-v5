import { useState } from "react";
import { simulateQueries, type NPlusOneStrategy } from "@/lib/simulators";
import type { BenchParamSpec, BenchToggleSpec, RunObservation } from "@/lib/bench";
import { BenchShell, type BenchRunContext } from "./bench-shell";

const SPECS: BenchParamSpec[] = [
  {
    key: "users",
    label: "Items (users)",
    min: 5,
    max: 50,
    step: 5,
    default: 12,
    hint: "the same entities in every strategy run",
  },
  {
    key: "roundTripMs",
    label: "Round-trip cost",
    min: 5,
    max: 100,
    step: 5,
    default: 30,
    unit: "ms",
    hint: "cost per query round-trip (teaching model)",
  },
];

const TOGGLES: BenchToggleSpec[] = [
  {
    key: "strategy",
    label: "Fetch strategy",
    options: [
      { value: "per-item", label: "Per-item (1 query per user)" },
      { value: "batch", label: "Batch (IN lists)" },
      { value: "join", label: "JOIN" },
    ],
    default: "per-item",
    hint: "switching strategy changes the plan, not the entities",
  },
];

/** S3 — N+1 na bancada unificada (F4: mesma entidade identificável antes/depois). */
export function NPlusOneSandbox() {
  const [plan, setPlan] = useState<ReturnType<typeof simulateQueries> | null>(null);
  const [strategyView, setStrategyView] = useState<NPlusOneStrategy>("per-item");

  const onRun = (ctx: BenchRunContext): RunObservation => {
    const strategy = (ctx.toggles["strategy"] ?? "per-item") as NPlusOneStrategy;
    const users = ctx.params["users"] ?? 12;
    const roundTripMs = ctx.params["roundTripMs"] ?? 30;
    const result = simulateQueries({ users, cardinality: 2, roundTripMs, strategy });
    setPlan(result);
    setStrategyView(strategy);
    return {
      headline: `${strategy}: ${result.count} queries · ${result.rows} rows · ${result.latencyMs} ms total`,
      detail: [
        `Formula: ${result.formula}`,
        `First queries: ${result.sql.slice(0, 2).join("  |  ")}${result.sql.length > 2 ? ` … (+${result.sql.length - 2} more)` : ""}`,
      ],
    };
  };

  const onReset = () => {
    setPlan(null);
    setStrategyView("per-item");
  };

  return (
    <BenchShell
      id="nplusone"
      specs={SPECS}
      toggleSpecs={TOGGLES}
      actions={[{ key: "run", label: "Run fetch plan", variant: "primary" }]}
      onRun={onRun}
      onReset={onReset}
      instrument={
        plan ? (
          <div>
            <div className="mb-3 grid grid-cols-3 gap-2 text-center">
              {(
                [
                  ["Queries", plan.count, "text-info"],
                  ["Rows", plan.rows, "text-foreground"],
                  ["Total cost", `${plan.latencyMs}ms`, strategyView === "per-item" ? "text-destructive" : "text-success"],
                ] as const
              ).map(([label, value, cls]) => (
                <div key={label} className="rounded-xl border border-border bg-background/60 p-2">
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
                  <span className={"font-mono text-lg font-extrabold " + cls}>{value}</span>
                </div>
              ))}
            </div>
            <div
              role="log"
              aria-label="Query plan"
              className="scrollbar-thin h-32 overflow-y-auto rounded-lg border border-border bg-background/60 p-3 font-mono text-xs text-muted-foreground"
            >
              {plan.sql.map((sql, i) => (
                <div key={i} className={i === 0 ? "text-info" : ""}>
                  {sql}
                </div>
              ))}
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {plan.formula}
            </p>
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            [Ready] Predict which strategy pays more round-trips, then run the plan. The same user ids (user_id = 1…N) appear in every strategy.
          </p>
        )
      }
    />
  );
}
