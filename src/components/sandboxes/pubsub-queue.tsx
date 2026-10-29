import { useEffect, useRef, useState } from "react";
import { createPubSubQueue, type QueueStepResult } from "@/lib/simulators";
import type { BenchParamSpec, BenchToggleSpec, RunObservation } from "@/lib/bench";
import { BenchShell, type BenchRunContext } from "./bench-shell";

const SPECS: BenchParamSpec[] = [
  {
    key: "workers",
    label: "Workers / assinantes",
    min: 1,
    max: 5,
    step: 1,
    default: 3,
    hint: "concorrentes: N workers dividem uma fila · fan-out: N cópias por evento",
  },
];

const TOGGLES: BenchToggleSpec[] = [
  {
    key: "mode",
    label: "Estrutura",
    options: [
      { value: "competing", label: "Consumidores concorrentes" },
      { value: "fanout", label: "Fan-out (tópico)" },
    ],
    default: "competing",
    hint: "concorrentes dividem os eventos entre workers; fan-out entrega uma cópia a cada um",
  },
  {
    key: "failure",
    label: "Tipo de falha",
    options: [
      { value: "none", label: "Nenhuma (saudável)" },
      { value: "transient", label: "Transitória (retry funciona)" },
      { value: "poison", label: "Venenosa (nunca funciona)" },
      { value: "slow", label: "Consumidor lento" },
    ],
    default: "none",
    hint: "causas distintas: transitória re tenta, venenosa vai à dead-letter, lenta atrasa",
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
    { tone: "info", text: "[Pronto] Preveja: para onde vai um evento nesta estrutura?" },
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
        text: `Evento #${r.event?.id} → worker #${r.worker} processou "${r.event?.payload}" (${totals.current.processed} concluídos)`,
      };
    }
    if (r.outcome === "retry") {
      return {
        tone: "warn",
        text: `Evento #${r.event?.id} → worker #${r.worker} FALHOU "${r.event?.payload}" (tentativa ${r.event?.attempts}/${MAX_ATTEMPTS}) — de volta à fila`,
      };
    }
    return {
      tone: "err",
      text: `Evento #${r.event?.id} → worker #${r.worker} FALHOU "${r.event?.payload}" ${MAX_ATTEMPTS}× — enviado para a DEAD LETTER QUEUE`,
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
        push("info", `[PUB] Evento #${ev.id} "${payload}" distribuído para ${cfg.current.workers} assinantes (uma cópia para cada).`);
        return {
          headline: `Evento #${ev.id} publicado → copiado para ${cfg.current.workers} assinantes`,
          detail: [
            "Caminho: publish → uma entrega por assinante (estrutura fan-out).",
            "A cópia de cada assinante falha e re tenta de forma independente.",
          ],
        };
      }
      push("info", `[PUB] Evento #${ev.id} "${payload}" enfileirado → profundidade ${snap.queueDepth}.`);
      return {
        headline: `Evento #${ev.id} publicado → fila com ${snap.queueDepth}`,
        detail: [
          "Caminho: publish → fila compartilhada → UM worker pega o evento (estrutura concorrente).",
          "Os outros workers nunca veem este evento.",
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
      headline: `Fila avançada ×5: ${processed} processados, ${dead} na dead-letter`,
      detail: [
        outcomes.length > 0 ? outcomes.join(" · ") : "Nada para processar — a fila está ociosa.",
        cfg.current.failure !== "none"
          ? `Política de falha: ${cfg.current.failure} — maxAttempts ${MAX_ATTEMPTS} decide o que chega à DLQ.`
          : "Sem falha configurada: toda entrega confirma na primeira tentativa.",
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
      `[CFG] Estrutura recriada: ${cfg.current.mode}, ${cfg.current.workers} workers, falha ${cfg.current.failure}. O estado em andamento da estrutura antiga é descartado; contadores preservados (${totals.current.processed} processados, ${totals.current.dead} mortos).`,
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
    setLog([{ tone: "info", text: "[Reinício] Sessão reiniciada: fila vazia, contadores zerados." }]);
  };

  return (
    <BenchShell
      id="pubsub"
      specs={SPECS}
      toggleSpecs={TOGGLES}
      actions={[
        { key: "publish", label: "Publicar evento", variant: "primary" },
        { key: "step", label: "Avançar ×5 passos", variant: "secondary" },
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
            push("info", next ? "[PAUSA] Processamento automático pausado. A fila mantém o que tem." : "[RETOMA] Processamento automático retomado.");
          }}
          className={
            "w-full rounded-xl border px-3 py-2 text-xs font-semibold transition-colors " +
            (paused ? "border-info/40 bg-info/10 text-info" : "border-border bg-secondary text-foreground hover:bg-accent")
          }
        >
          {paused ? "Retomar processamento" : "Pausar processamento"}
        </button>
      }
      instrument={
        <div>
          <div className="mb-3 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-border bg-background/60 p-2">
              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Na fila</span>
              <span className="font-mono text-2xl font-extrabold text-warning">{view.queueDepth}</span>
            </div>
            <div className="rounded-xl border border-border bg-background/60 p-2">
              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Processados</span>
              <span className="font-mono text-2xl font-extrabold text-success">{view.processed}</span>
            </div>
            <div className="rounded-xl border border-border bg-background/60 p-2">
              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Na dead-letter</span>
              <span className={"font-mono text-2xl font-extrabold " + (view.dead > 0 ? "text-destructive" : "text-foreground")}>
                {view.dead}
              </span>
            </div>
          </div>
          {view.dead > 0 ? (
            <p className="mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-center text-xs font-bold text-destructive">
              DEAD LETTER QUEUE: {view.dead} mensagem(ens) — consequência do maxAttempts {MAX_ATTEMPTS}, aguardando revisão humana
            </p>
          ) : null}
          <div
            role="log"
            aria-label="Trajetória dos eventos"
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
