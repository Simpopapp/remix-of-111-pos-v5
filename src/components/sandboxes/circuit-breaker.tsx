import { useRef, useState } from "react";
import { createCircuitBreaker, type BreakerState } from "@/lib/simulators";
import type { BenchParamSpec, BenchToggleSpec, RunObservation } from "@/lib/bench";
import { BenchShell, type BenchRunContext } from "./bench-shell";

const SPECS: BenchParamSpec[] = [
  {
    key: "threshold",
    label: "Limite de falhas",
    min: 1,
    max: 5,
    step: 1,
    default: 3,
    hint: "falhas consecutivas que abrem o disjuntor",
  },
  {
    key: "cooldownMs",
    label: "Cooldown",
    min: 1000,
    max: 10000,
    step: 500,
    default: 5000,
    unit: "ms",
    hint: "tempo em OPEN antes de permitir uma sonda half-open",
  },
];

const TOGGLES: BenchToggleSpec[] = [
  {
    key: "protection",
    label: "Proteção",
    options: [
      { value: "protected", label: "Disjuntor LIGADO" },
      { value: "unprotected", label: "Disjuntor DESLIGADO (chamadas diretas)" },
    ],
    default: "protected",
    hint: "a mesma sequência de chamadas, com e sem proteção",
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
  { id: "closed", label: "CLOSED — chamadas normais", tone: "border-success/40 bg-success/10 text-success" },
  { id: "open", label: "OPEN — falhando rápido", tone: "border-destructive/40 bg-destructive/10 text-destructive" },
  { id: "half-open", label: "HALF-OPEN — sondando", tone: "border-warning/40 bg-warning/10 text-warning" },
];

/** S2 — Circuit Breaker na bancada unificada (F4: estados acompanham a execução). */
export function CircuitBreakerSandbox() {
  const breaker = useRef<ReturnType<typeof createCircuitBreaker> | null>(null);
  const outage = useRef(false);
  const clock = useRef(0);
  const cfg = useRef({ threshold: 3, cooldownMs: 5000, protection: "protected" });
  const [log, setLog] = useState<CallLine[]>([
    { tone: "info", text: "[Pronto] Preveja: o que acontece com a 4ª chamada durante uma queda?" },
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
      push("err", "[QUEDA] O provedor de pagamento está FORA — as próximas chamadas vão falhar.");
      return {
        headline: "Queda do serviço injetada",
        detail: ["Nenhuma chamada foi feita; a injeção só muda o que as próximas chamadas encontram."],
      };
    }
    if (ctx.action === "restore") {
      outage.current = false;
      setOutageView(false);
      push("info", "[RESTAURADO] Provedor de pagamento de volta — as próximas chamadas devem funcionar.");
      return {
        headline: "Serviço restaurado",
        detail: ["O disjuntor só descobre isso quando a próxima sonda/chamada funciona."],
      };
    }

    // Ação "call": o relógio virtual avança 1s por chamada (o cooldown corre).
    clock.current += 1000;
    const callN = clock.current / 1000;
    if (!outage.current) {
      if (cfg.current.protection === "protected") {
        const res = b.record(true);
        setStateView(res.state);
        push("ok", `[${String(callN).padStart(2, "0")}s] Chamada → 200 OK em 120 ms (disjuntor: ${res.state.toUpperCase()})`);
        return {
          headline: `Chamada OK em 120 ms (disjuntor ${res.state.toUpperCase()})`,
          detail: ["O sucesso zera a contagem de falhas."],
        };
      }
      push("ok", `[${String(callN).padStart(2, "0")}s] Chamada → 200 OK em 120 ms (sem disjuntor configurado)`);
      return {
        headline: "Chamada OK em 120 ms — sem proteção configurada",
        detail: ["Sem proteção, é igual quando tudo está saudável; a diferença aparece na queda."],
      };
    }

    if (cfg.current.protection === "protected") {
      const res = b.record(false);
      setStateView(res.state);
      if (res.blocked) {
        push("warn", `[${String(callN).padStart(2, "0")}s] Chamada BLOQUEADA em ~5 ms — disjuntor OPEN, falhando rápido.`);
        return {
          headline: `Chamada #${callN} bloqueada em ~5 ms — disjuntor OPEN, falhando rápido`,
          detail: [
            "O chamador recebeu um erro imediato em vez de esperar 5000 ms.",
            "Cada chamada bloqueada avança o relógio virtual, então o cooldown passa.",
          ],
        };
      }
      push("err", `[${String(callN).padStart(2, "0")}s] Chamada → TIMEOUT após 5000 ms (falha contada)`);
      return {
        headline: `Chamada #${callN} deu timeout após 5000 ms — falha contada`,
        detail: [
          res.state === "half-open"
            ? "Esta era uma sonda half-open: falhou, então o disjuntor reabre."
            : "As falhas consecutivas se aproximam do limite que abre o disjuntor.",
        ],
      };
    }

    push("err", `[${String(callN).padStart(2, "0")}s] Chamada → TIMEOUT após 5000 ms (sem proteção: toda chamada paga o timeout completo)`);
    return {
      headline: `Chamada #${callN} deu timeout após 5000 ms — sem proteção`,
      detail: ["Todo chamador paga o timeout completo com o provedor fora; nada dispara, nada falha rápido."],
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
      `[CFG] Disjuntor recriado com limite ${cfg.current.threshold}, cooldown ${cfg.current.cooldownMs}ms, proteção ${cfg.current.protection} — estado do disjuntor reiniciado.`,
    );
  };

  const onReset = () => {
    breaker.current = null;
    outage.current = false;
    clock.current = 0;
    ensure();
    setStateView("closed");
    setOutageView(false);
    setLog([{ tone: "info", text: "[Reinício] Sessão reiniciada: disjuntor CLOSED, sem queda, relógio em 0." }]);
  };

  return (
    <BenchShell
      id="circuit"
      specs={SPECS}
      toggleSpecs={TOGGLES}
      actions={[
        { key: "call", label: "Chamar API de pagamento", variant: "primary" },
        { key: "outage", label: "Injetar queda", variant: "warning" },
        { key: "restore", label: "Restaurar serviço", variant: "secondary" },
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
                Sem disjuntor — as chamadas sempre fluem, saudáveis ou não
              </div>
            )}
          </div>
          {outageView ? (
            <p className="mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-center text-xs font-bold text-destructive">
              QUEDA ATIVA — provedor de pagamento está fora
            </p>
          ) : null}
          <div
            role="log"
            aria-label="Registro de chamadas"
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
