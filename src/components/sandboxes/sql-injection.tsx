import { useRef, useState } from "react";
import { evaluateSqlInjection, SQL_DEMO_USERS, type SqlInjectionResult } from "@/lib/simulators";
import type { BenchToggleSpec, RunObservation } from "@/lib/bench";
import { BenchShell, type BenchRunContext } from "./bench-shell";

const TOGGLES: BenchToggleSpec[] = [
  {
    key: "queryStyle",
    label: "Estilo de consulta",
    options: [
      { value: "concat", label: "Concatenação de strings" },
      { value: "parameterized", label: "Parametrizada" },
    ],
    default: "concat",
    hint: "a mesma entrada, dois destinos diferentes",
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
        headline: "Nenhuma entrada digitada — nada para avaliar",
        detail: ["Digite um usuário (experimente os usuários de demo ou um payload)."],
      };
    }
    const mode = (ctx.toggles["queryStyle"] ?? "concat") as "concat" | "parameterized";
    const r = evaluateSqlInjection(input, mode);
    setResult(r);
    const observation: RunObservation = {
      headline: r.supported
        ? `${r.mode}: ${r.rows.length} linha(s) retornada(s)`
        : "Fora do modelo: esta entrada não é coberta pelo simulador",
      detail: [
        `Query: ${r.sql}`,
        r.mode === "parameterized"
          ? "Os parâmetros são vinculados pelo driver — a entrada nunca vira texto SQL."
          : `Tokens da entrada: código = [${r.tokens.code.join(", ") || "—"}], dado = [${r.tokens.data.join(", ") || "—"}]`,
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
      actions={[{ key: "login", label: "Tentar login", variant: "primary" }]}
      onRun={onRun}
      onReset={onReset}
      controlsExtra={
        <div>
          <label htmlFor="sqli-username" className="block text-xs font-semibold text-foreground">
            Usuário
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
            Usuários de demo: {SQL_DEMO_USERS.join(", ")} — ou digite a sua própria string.
          </p>
        </div>
      }
      instrument={
        result ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-background/60 p-3">
              <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Consulta enviada</p>
              <p className="break-all font-mono text-xs text-foreground">{result.sql}</p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Entrada como tokens
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
                Resultado — {result.rows.length} linha(s)
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
            [Pronto] Preveja o que acontece com a consulta para uma dada entrada, e depois tente o login. A consulta, a entrada, os parâmetros e o resultado aparecem no mesmo campo.
          </p>
        )
      }
    />
  );
}
