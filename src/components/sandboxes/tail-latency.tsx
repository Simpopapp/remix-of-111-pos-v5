import { useRef, useState } from "react";
import { percentile, simulateLatencies } from "@/lib/simulators";
import type { BenchParamSpec, RunObservation } from "@/lib/bench";
import { BenchShell, type BenchRunContext } from "./bench-shell";

const SPECS: BenchParamSpec[] = [
  {
    key: "sampleSize",
    label: "Sample size",
    min: 100,
    max: 1000,
    step: 100,
    default: 100,
    unit: "requests",
    hint: "deterministic sample: same seed → same distribution",
  },
];

interface Result {
  n: number;
  seed: number;
  p50: number;
  p99: number;
  p999: number;
  max: number;
  buckets: { from: number; to: number; count: number }[];
  p99In: number;
}

const EDGES = [400, 800, 1200, 2000, 4000, 11000];

function bucketize(sorted: number[]): Result["buckets"] {
  const bins: Result["buckets"] = [];
  for (let i = 0; i < EDGES.length - 1; i++) {
    bins.push({
      from: EDGES[i]!,
      to: EDGES[i + 1]!,
      count: sorted.filter((v) => v >= EDGES[i]! && v < EDGES[i + 1]!).length,
    });
  }
  return bins;
}

/** S6 — P99 & Tail Latency na bancada unificada (F4: histograma+marcador+unidades). */
export function TailLatencySandbox() {
  const seed = useRef(0);
  const [result, setResult] = useState<Result | null>(null);

  const onRun = (ctx: BenchRunContext): RunObservation => {
    const n = ctx.params["sampleSize"] ?? 100;
    const nextSeed = seed.current + 1;
    seed.current = nextSeed;
    const sorted = [...simulateLatencies(n, nextSeed * 7919)].sort((a, b) => a - b);
    const p50 = percentile(sorted, 50);
    const p99 = percentile(sorted, 99);
    const p999 = percentile(sorted, 99.9);
    const max = sorted[sorted.length - 1] ?? 0;
    const buckets = bucketize(sorted);
    const p99In = buckets.findIndex((b) => p99 >= b.from && p99 < b.to);
    setResult({ n, seed: nextSeed, p50, p99, p999, max, buckets, p99In });
    return {
      headline: `n=${n} · p50 ${p50} ms · p99 ${p99} ms`,
      detail: [
        `p99.9 ${p999} ms · slowest request ${max} ms`,
        `sample: ${n} simulated requests · units: ms · teaching model, not a benchmark`,
      ],
    };
  };

  const onReset = () => {
    setResult(null);
    seed.current = 0;
  };

  const maxCount = result ? Math.max(...result.buckets.map((b) => b.count)) : 1;

  return (
    <BenchShell
      id="tail"
      specs={SPECS}
      actions={[{ key: "run", label: "Send simulated requests", variant: "primary" }]}
      onRun={onRun}
      onReset={onReset}
      instrument={
        result ? (
          <div>
            <div className="mb-4 grid grid-cols-4 gap-2 text-center">
              {(
                [
                  ["p50", result.p50, "text-info"],
                  ["p99", result.p99, "text-warning"],
                  ["p99.9", result.p999, "text-destructive"],
                  ["max", result.max, "text-destructive"],
                ] as const
              ).map(([label, value, cls]) => (
                <div key={label} className="rounded-xl border border-border bg-background/60 p-2">
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
                  <span className={"font-mono text-lg font-extrabold " + cls}>{value}ms</span>
                </div>
              ))}
            </div>
            <div className="mb-3 flex h-32 items-end gap-1 rounded-xl border border-border bg-background/60 p-3">
              {result.buckets.map((b, i) => (
                <div
                  key={i}
                  className="flex flex-1 flex-col items-center gap-1"
                  title={`${b.from}–${b.to} ms: ${b.count} requests`}
                  aria-label={`${b.from} to ${b.to} milliseconds: ${b.count} requests`}
                >
                  <span className="font-mono text-xs text-muted-foreground" aria-hidden="true">
                    {b.count > 0 ? b.count : ""}
                  </span>
                  <div
                    className={
                      "w-full rounded-t " +
                      (i === result.p99In
                        ? "border-2 border-primary bg-warning"
                        : b.to >= 7000
                          ? "bg-destructive"
                          : b.from >= 1800
                            ? "bg-warning"
                            : "bg-info")
                    }
                    style={{ height: `${Math.max(2, (b.count / maxCount) * 100)}%` }}
                  />
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Histogram units: ms · sample: n={result.n} simulated requests (seed {result.seed}) · the{" "}
              <span className="text-warning">p99 marker</span> sits in the highlighted bucket — 99% of requests are faster than it.
            </p>
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            [Ready] Predict the shape of the distribution, then fire a simulated batch. Units are ms; the sample size is yours to choose.
          </p>
        )
      }
    />
  );
}
