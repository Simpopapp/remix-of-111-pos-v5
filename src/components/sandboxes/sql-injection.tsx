import { useRef, useState } from "react";
import { evaluateSqlInjection, SQL_DEMO_USERS, type SqlInjectionResult } from "@/lib/simulators";
import type { BenchToggleSpec, RunObservation } from "@/lib/bench";
import { BenchShell, type BenchRunContext } from "./bench-shell";

const TOGGLES: BenchToggleSpec[] = [
  {
    key: "queryStyle",
    label: "Query style",
    options: [
      { value: "concat", label: "String concatenation" },
      { value: "parameterized", label: "Parameterized" },
    ],
    default: "concat",
    hint: "the same input, two different fates",
  },
];

/** S4 — SQL Injection na bancada unificada (F4: consulta/entrada/parâmetros/resultado). */
export function SqlInjectionSandbox() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [result, setResult] = useState<SqlInjectionResult | null>(null);
  const [inputView, setInputView] = useState("");

  const onRun = (ctx: BenchRunContext): RunObservation => {
    const input = inputRef.current?.value ?? "";
    setInputView(input);
    if (input.trim().length === 0) {
      return {
        headline: "No input entered — nothing to evaluate",
        detail: ["Type a username (try the demo users or a payload)."],
      };
    }
    const mode = (ctx.toggles["queryStyle"] ?? "concat") as "concat" | "parameterized";
    const r = evaluateSqlInjection(input, mode);
    setResult(r);
    const observation: RunObservation = {
      headline: r.supported
        ? `${r.mode}: ${r.rows.length} row${r.rows.length === 1 ? "" : "s"} returned`
        : "Out of model: this input is not covered by the simulator",
      detail: [
        `Query: ${r.sql}`,
        r.mode === "parameterized"
          ? "Parameters are bound by the driver — the input never becomes SQL text."
          : `Tokens in the input: code = [${r.tokens.code.join(", ") || "—"}], data = [${r.tokens.data.join(", ") || "—"}]`,
      ],
    };
    if (!r.supported) observation.outOfModel = r.verdict;
    return observation;
  };

  const onReset = () => {
    setResult(null);
    setInputView("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <BenchShell
      id="sqli"
      specs={[]}
      toggleSpecs={TOGGLES}
      actions={[{ key: "login", label: "Attempt login", variant: "primary" }]}
      onRun={onRun}
      onReset={onReset}
      controlsExtra={
        <div>
          <label htmlFor="sqli-username" className="block text-xs font-semibold text-foreground">
            Username input
          </label>
          <input
            id="sqli-username"
            ref={inputRef}
            list="sqli-demo-users"
            placeholder="alice"
            className="mt-1 w-full rounded-lg border border-border bg-background/60 px-2 py-1.5 font-mono text-xs text-foreground"
          />
          <datalist id="sqli-demo-users">
            {SQL_DEMO_USERS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Demo users: {SQL_DEMO_USERS.join(", ")} — or type your own string.
          </p>
        </div>
      }
      instrument={
        result ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-background/60 p-3">
              <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Query sent</p>
              <p className="break-all font-mono text-xs text-foreground">{result.sql}</p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Input as tokens
              </p>
              <p className="font-mono text-xs">
                {result.tokens.code.map((t, i) => (
                  <span key={`c${i}`} className="rounded bg-destructive/10 px-1 font-bold text-destructive">
                    {t}{" "}
                  </span>
                ))}
                {result.tokens.data.map((t, i) => (
                  <span key={`d${i}`} className="rounded bg-info/10 px-1 text-info">
                    {t}{" "}
                  </span>
                ))}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background/60 p-3">
              <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Result — {result.rows.length} row{result.rows.length === 1 ? "" : "s"}
              </p>
              {result.rows.length > 0 ? (
                <p className="font-mono text-xs text-success">{result.rows.join(", ")}</p>
              ) : (
                <p className="font-mono text-xs text-muted-foreground">—</p>
              )}
              <p className="mt-2 text-xs leading-relaxed text-foreground/90">{result.verdict}</p>
            </div>
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            [Ready] Predict what happens to the query for a given input, then attempt the login. The query, the entry, the parameters and the result appear in the same field.
          </p>
        )
      }
    />
  );
}
