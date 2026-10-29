import { useRef, useState } from "react";
import { Zap } from "lucide-react";
import { createTokenBucket, type TokenBucket } from "@/lib/simulators";
import type { BenchParamSpec, BenchToggleSpec, RunObservation } from "@/lib/bench";
import { BenchShell, type BenchRunContext } from "./bench-shell";

const SPECS: BenchParamSpec[] = [
  {
    key: "capacity",
    label: "Bucket capacity",
    min: 1,
    max: 10,
    step: 1,
    default: 5,
    unit: "tokens",
    hint: "burst size the bucket absorbs before rejecting",
  },
  {
    key: "refillMs",
    label: "Refill interval",
    min: 250,
    max: 3000,
    step: 250,
    default: 1500,
    unit: "ms",
    hint: "sustained rate = 1 token per interval",
  },
];

const TOGGLES: BenchToggleSpec[] = [
  {
    key: "scope",
    label: "Limit scope",
    options: [
      { value: "per-ip", label: "Per client (per-IP)" },
      { value: "global", label: "Shared global bucket" },
    ],
    default: "per-ip",
    hint: "per-IP throttles one noisy client; global throttles everyone together",
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
    { ok: null, text: "[Ready] Predict, then send requests from Client A or Client B." },
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
    cfg.current.scope === "global" ? "the shared bucket" : `Client ${client}'s bucket`;

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
            ? `[${time}] Client ${client} → 200 OK forwarded to the service (tokens left: ${res.remaining})`
            : `[${time}] Client ${client} → 429 TOO MANY REQUESTS — rejected at the edge (no tokens left)`,
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
          ? `Client ${client} accepted — 1 token consumed, forwarded to the service`
          : `Client ${client} rejected with 429 at the edge`,
        detail: [
          `Tokens left in ${bucketName(client)}: ${res.remaining}/${cfg.current.capacity}`,
          res.ok ? "Destination: API service" : "Destination: rejected at the edge (no service call)",
        ],
      };
    }
    // burst-a: 5 requisições seguidas do mesmo cliente
    const results = Array.from({ length: 5 }, () => sendOne("A"));
    const accepted = results.filter((r) => r.ok).length;
    const rejected = 5 - accepted;
    refreshView();
    return {
      headline: `Burst ×5 from Client A: ${accepted} accepted, ${rejected} rejected with 429`,
      detail: [
        accepted > 0 ? `${accepted} consumed tokens and reached the service` : "The bucket had no tokens left",
        rejected > 0
          ? `${rejected} rejected — a burst wider than the bucket (or faster than the refill) overflows`
          : "The whole burst fit inside the bucket capacity",
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
          text: `[CFG] Buckets re-created with ${cfg.current.capacity} tokens, refill 1/${cfg.current.refillMs}ms, scope ${cfg.current.scope} — tokens restored to full.`,
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
    setLog([{ ok: null, text: "[Reset] Session restarted: buckets full, log cleared." }]);
  };

  return (
    <BenchShell
      id="ratelimit"
      specs={SPECS}
      toggleSpecs={TOGGLES}
      actions={[
        { key: "request-a", label: "Send request (Client A)", variant: "primary" },
        { key: "request-b", label: "Send request (Client B)", variant: "secondary" },
        { key: "burst-a", label: "Burst ×5 (Client A)", variant: "warning" },
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
                  Shared bucket (global scope)
                </p>
                <div className="flex gap-1">{gauge(tokensView.a, tokensView.capacity)}</div>
              </div>
            ) : (
              (["A", "B"] as const).map((c) => (
                <div key={c}>
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Client {c} (per-IP bucket)
                  </p>
                  <div className="flex gap-1">
                    {gauge(c === "A" ? tokensView.a : tokensView.b, tokensView.capacity)}
                  </div>
                </div>
              ))
            )}
          </div>
          <p className="mb-3 text-center font-mono text-xs text-muted-foreground">
            capacity {tokensView.capacity} tokens · refill 1 / {cfg.current.refillMs}ms · scope{" "}
            {tokensView.scope === "global" ? "global" : "per-IP"} (refills on request)
          </p>
          <div
            role="log"
            aria-label="Request log"
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
