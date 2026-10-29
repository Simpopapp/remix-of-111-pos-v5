import { useState } from "react";
import { simulateQueries, type NPlusOneStrategy } from "@/lib/simulators";
import type { BenchParamSpec, BenchToggleSpec, RunObservation } from "@/lib/bench";
import { BenchShell, type BenchRunContext } from "./bench-shell";

const SPECS: BenchParamSpec[] = [
  {
    key: "users",
    label: "Itens (usuários)",
    min: 5,
    max: 50,
    step: 5,
    default: 12,
    hint: "as mesmas entidades em cada execução de estratégia",
  },
  {
    key: "roundTripMs",
    label: "Custo de ida e volta",
    min: 5,
    max: 100,
    step: 5,
    default: 30,
    unit: "ms",
    hint: "custo por consulta, ida e volta (modelo didático)",
  },
];

const TOGGLES: BenchToggleSpec[] = [
  {
    key: "strategy",
    label: "Estratégia de busca",
    options: [
      { value: "per-item", label: "Por item (1 consulta por usuário)" },
      { value: "batch", label: "Lote (listas IN)" },
      { value: "join", label: "JOIN" },
    ],
    default: "per-item",
    hint: "trocar a estratégia muda o plano, não as entidades",
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
      headline: `${strategy}: ${result.count} consultas · ${result.rows} linhas · ${result.latencyMs} ms no total`,
      detail: [
        `Fórmula: ${result.formula}`,
        `Primeiras consultas: ${result.sql.slice(0, 2).join("  |  ")}${result.sql.length > 2 ? ` … (+${result.sql.length - 2} mais)` : ""}`,
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
      actions={[{ key: "run", label: "Executar plano de busca", variant: "primary" }]}
      onRun={onRun}
      onReset={onReset}
      instrument={
        plan ? (
          <div>
            <div className="mb-3 grid grid-cols-3 gap-2 text-center">
              {(
                [
                  ["Consultas", plan.count, "text-info"],
                  ["Linhas", plan.rows, "text-foreground"],
                  ["Custo total", `${plan.latencyMs}ms`, strategyView === "per-item" ? "text-destructive" : "text-success"],
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
              aria-label="Plano de consultas"
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
            [Pronto] Preveja qual estratégia paga mais idas e voltas, e depois execute o plano. Os mesmos ids de usuário (user_id = 1…N) aparecem em todas as estratégias.
          </p>
        )
      }
    />
  );
}
