import { useRef, useState } from "react";
import { Zap } from "lucide-react";
import { createTokenBucket, type TokenBucket } from "@/lib/simulators";
import type { BenchParamSpec, BenchToggleSpec, RunObservation } from "@/lib/bench";
import { BenchShell, type BenchRunContext } from "./bench-shell";

const SPECS: BenchParamSpec[] = [
  {
    key: "capacity",
    label: "Capacidade do balde",
    min: 1,
    max: 10,
    step: 1,
    default: 5,
    unit: "tokens",
    hint: "rajada que o balde absorve antes de rejeitar",
  },
  {
    key: "refillMs",
    label: "Intervalo de reabastecimento",
    min: 250,
    max: 3000,
    step: 250,
    default: 1500,
    unit: "ms",
    hint: "fluxo sustentado = 1 token por intervalo",
  },
];

const TOGGLES: BenchToggleSpec[] = [
  {
    key: "scope",
    label: "Escopo do limite",
    options: [
      { value: "per-ip", label: "Por cliente (por-IP)" },
      { value: "global", label: "Balde global compartilhado" },
    ],
    default: "per-ip",
    hint: "por-IP limita um cliente barulhento; global limita todos juntos",
  },
];

interface LogLine {
  ok: boolean | null;
  text: string;
}

const CAPACITY = 5;

function gauge(tokens: number, capacity: number) {
  return Array.from({ length: capacity }, (_, i) => (
    <div
      key={i}
      className={
        "flex size-7 items-center justify-center rounded-lg border font-mono text-xs font-bold transition-all " +
        (i < tokens
          ? "border-warning bg-warning text-warning-foreground"
          : "border-border bg-muted text-muted-foreground/50")
      }
    >
      <Zap className="size-3.5" aria-hidden="true" />
    </div>
  ));
}

/** S1 — Rate Limiting na bancada unificada (F4: clientes/tokens/tempo/destino). */
export function RateLimiterSandbox() {
  const cfg = useRef({ capacity: 5, refillMs: 1500, scope: "per-ip" });
  const buckets = useRef<{ A: TokenBucket; B: TokenBucket } | null>(null);
  const [log, setLog] = useState<LogLine[]>([
    { ok: null, text: "[Pronto] Faça a previsão e envie requisições do Cliente A ou do Cliente B." },
  ]);
  const [tokensView, setTokensView] = useState({ a: 5, b: 5, capacity: 5, scope: "per-ip" });

  const ensure = () => {
    if (!buckets.current) {
      const mk = () =>
        createTokenBucket({
          capacity: cfg.current.capacity,
          refillIntervalMs: cfg.current.refillMs,
        });
      buckets.current = { A: mk(), B: mk() };
    }
    return buckets.current;
  };

  const bucketFor = (client: "A" | "B"): TokenBucket => {
    const b = ensure();
    // Escopo global: um único balde compartilhado pelos dois clientes.
    return cfg.current.scope === "global" ? b.A : b[client];
  };

  const bucketName = (client: "A" | "B") =>
    cfg.current.scope === "global" ? "o balde compartilhado" : `Balde do Cliente ${client}`;

  const sendOne = (client: "A" | "B") => {
    const b = bucketFor(client);
    b.tick();
    const res = b.tryConsume();
    const time = new Date().toLocaleTimeString();
    setLog((prev) =>
      [
        {
          ok: res.ok,
          text: res.ok
            ? `[${time}] Cliente ${client} → 200 OK encaminhado ao serviço (tokens restantes: ${res.remaining})`
            : `[${time}] Cliente ${client} → 429 TOO MANY REQUESTS — rejeitado na borda (sem tokens)`,
        },
        ...prev,
      ].slice(0, 24),
    );
    return res;
  };

  const refreshView = () => {
    setTokensView({
      a: bucketFor("A").tokens(),
      b: bucketFor("B").tokens(),
      capacity: cfg.current.capacity,
      scope: cfg.current.scope,
    });
  };

  const onRun = (ctx: BenchRunContext): RunObservation => {
    if (ctx.action === "request-a" || ctx.action === "request-b") {
      const client = ctx.action === "request-a" ? "A" : "B";
      const res = sendOne(client);
      refreshView();
      return {
        headline: res.ok
          ? `Cliente ${client} aceito — 1 token consumido, encaminhado ao serviço`
          : `Cliente ${client} rejeitado com 429 na borda`,
        detail: [
          `Tokens restantes em ${bucketName(client)}: ${res.remaining}/${cfg.current.capacity}`,
          res.ok ? "Destino: serviço da API" : "Destino: rejeitado na borda (sem chamada ao serviço)",
        ],
      };
    }
    // burst-a: 5 requisições seguidas do mesmo cliente
    const results = Array.from({ length: 5 }, () => sendOne("A"));
    const accepted = results.filter((r) => r.ok).length;
    const rejected = 5 - accepted;
    refreshView();
    return {
      headline: `Rajada ×5 do Cliente A: ${accepted} aceitas, ${rejected} rejeitadas com 429`,
      detail: [
        accepted > 0 ? `${accepted} tokens consumidos e chegaram ao serviço` : "O balde não tinha tokens restantes",
        rejected > 0
          ? `${rejected} rejeitadas — rajada maior que o balde (ou mais rápida que o reabastecimento) transborda`
          : "A rajada inteira coube na capacidade do balde",
      ],
    };
  };

  const onConfigChange = (params: Record<string, number>, toggles: Record<string, string>) => {
    // Troca de configuração: recria os baldes com a nova config (efeito nomeado
    // no log, nunca um reinício silencioso).
    cfg.current = {
      capacity: params["capacity"] ?? cfg.current.capacity,
      refillMs: params["refillMs"] ?? cfg.current.refillMs,
      scope: toggles["scope"] ?? cfg.current.scope,
    };
    buckets.current = null;
    ensure();
    setLog((prev) =>
      [
        {
          ok: null,
          text: `[CFG] Baldes recriados com ${cfg.current.capacity} tokens, reabastecimento 1/${cfg.current.refillMs}ms, escopo ${cfg.current.scope} — tokens restaurados ao máximo.`,
        },
        ...prev,
      ].slice(0, 24),
    );
    refreshView();
  };

  const onReset = () => {
    buckets.current = null;
    ensure();
    refreshView();
    setLog([{ ok: null, text: "[Reinício] Sessão reiniciada: baldes cheios, log limpo." }]);
  };

  return (
    <BenchShell
      id="ratelimit"
      specs={SPECS}
      toggleSpecs={TOGGLES}
      actions={[
        { key: "request-a", label: "Enviar requisição (Cliente A)", variant: "primary" },
        { key: "request-b", label: "Enviar requisição (Cliente B)", variant: "secondary" },
        { key: "burst-a", label: "Rajada ×5 (Cliente A)", variant: "warning" },
      ]}
      onRun={onRun}
      onReset={onReset}
      onConfigChange={onConfigChange}
      instrument={
        <div>
          <div className="mb-3 space-y-2">
            {tokensView.scope === "global" ? (
              <div>
                <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Balde compartilhado (escopo global)
                </p>
                <div className="flex gap-1">{gauge(tokensView.a, tokensView.capacity)}</div>
              </div>
            ) : (
              (["A", "B"] as const).map((c) => (
                <div key={c}>
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Cliente {c} (balde por-IP)
                  </p>
                  <div className="flex gap-1">
                    {gauge(c === "A" ? tokensView.a : tokensView.b, tokensView.capacity)}
                  </div>
                </div>
              ))
            )}
          </div>
          <p className="mb-3 text-center font-mono text-xs text-muted-foreground">
            capacidade {tokensView.capacity} tokens · reabastecimento 1 / {cfg.current.refillMs}ms · escopo{" "}
            {tokensView.scope === "global" ? "global" : "por-IP"} (reabastece a cada requisição)
          </p>
          <div
            role="log"
            aria-label="Registro de requisições"
            className="scrollbar-thin h-28 overflow-y-auto rounded-lg border border-border bg-background/60 p-3 font-mono text-xs text-muted-foreground"
          >
            {log.map((line, i) => (
              <div key={i} className={line.ok === true ? "text-success" : line.ok === false ? "font-bold text-destructive" : ""}>
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
