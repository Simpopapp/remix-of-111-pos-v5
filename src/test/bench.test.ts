import { describe, expect, it } from "vitest";
import {
  defaultParamValues,
  formatConfig,
  reportReadiness,
  sameConfig,
  validateParams,
  type Attempt,
  type BenchParamSpec,
  type BenchToggleSpec,
} from "@/lib/bench";
import { parseBenchReports } from "@/lib/bench-reports";

const SPECS: BenchParamSpec[] = [
  { key: "capacity", label: "Bucket capacity", min: 1, max: 10, step: 1, default: 5, unit: "tokens", hint: "burst size" },
  { key: "refillMs", label: "Refill interval", min: 250, max: 3000, step: 250, default: 1500, unit: "ms", hint: "sustained rate" },
];

const TOGGLES: BenchToggleSpec[] = [
  {
    key: "scope",
    label: "Limit scope",
    options: [
      { value: "per-ip", label: "Per client" },
      { value: "global", label: "Shared global" },
    ],
    default: "per-ip",
    hint: "who is limited",
  },
];

function attempt(n: number, label = "config A"): Attempt {
  return {
    n,
    config: { label, params: { capacity: 5, refillMs: 1500 }, toggles: { scope: "per-ip" } },
    at: "12:00:00",
    observation: { headline: `run ${n}`, detail: [] },
  };
}

describe("bancada unificada — contrato (F4/D6)", () => {
  it("parâmetro fora da faixa é nomeado, não silenciado", () => {
    const errors = validateParams(SPECS, { capacity: 99, refillMs: 1500 });
    expect(errors).not.toBeNull();
    expect(errors!["capacity"]).toContain("fora do intervalo");
    expect(errors!["capacity"]).toContain("1–10");
  });

  it("parâmetros dentro da faixa validam limpos", () => {
    expect(validateParams(SPECS, { capacity: 5, refillMs: 1500 })).toBeNull();
  });

  it("rótulo da configuração é explícito e inclui os toggles", () => {
    const label = formatConfig(SPECS, TOGGLES, { capacity: 3, refillMs: 500 }, { scope: "global" });
    expect(label).toContain("bucket capacity 3 tokens");
    expect(label).toContain("refill interval 500 ms");
    expect(label).toContain("limit scope: shared global");
  });

  it("defaults derivam das specs (a UI nunca inventa números)", () => {
    expect(defaultParamValues(SPECS)).toEqual({ capacity: 5, refillMs: 1500 });
  });

  it("configurações diferentes não são a mesma (comparação rotulada)", () => {
    const a: Attempt["config"] = { label: "a", params: { capacity: 5 }, toggles: {} };
    const b: Attempt["config"] = { label: "b", params: { capacity: 3 }, toggles: {} };
    expect(sameConfig(a, a)).toBe(true);
    expect(sameConfig(a, b)).toBe(false);
  });

  it("relatório sem execução é bloqueado com motivo (sem evidência suficiente)", () => {
    const r = reportReadiness({ attempts: [], hypothesis: "h", interpretation: "i" });
    expect(r.state).toBe("blocked");
    if (r.state === "blocked") expect(r.reason).toMatch(/sem evidência/i);
  });

  it("relatório sem previsão é bloqueado (previsão antes da execução)", () => {
    const r = reportReadiness({ attempts: [attempt(1)], hypothesis: "  ", interpretation: "i" });
    expect(r.state).toBe("blocked");
    if (r.state === "blocked") expect(r.reason).toMatch(/previsão/i);
  });

  it("relatório sem interpretação é bloqueado", () => {
    const r = reportReadiness({ attempts: [attempt(1)], hypothesis: "h", interpretation: "" });
    expect(r.state).toBe("blocked");
    if (r.state === "blocked") expect(r.reason).toMatch(/interpretação/i);
  });

  it("com previsão + execuções + interpretação o relatório fica pronto", () => {
    const r = reportReadiness({ attempts: [attempt(1)], hypothesis: "h", interpretation: "i" });
    expect(r.state).toBe("ready");
  });
});

describe("store de relatórios de experimento (chave própria)", () => {
  it("parse tolerante: entrada corrompida vira estado vazio", () => {
    expect(parseBenchReports("not json").reports).toEqual([]);
    expect(parseBenchReports('{"reports": "nope"}').reports).toEqual([]);
  });

  it("parse mantém relatórios válidos e descarta inválidos", () => {
    const valid = {
      id: "report-tail-1",
      labId: "tail",
      hypothesis: "p99 sobe",
      config: { label: "sample size 100 requests", params: { sampleSize: 100 }, toggles: {} },
      observation: "p99 3120ms",
      interpretation: "a cauda domina",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const parsed = parseBenchReports(JSON.stringify({ reports: [valid, { id: 1 }, null] }));
    expect(parsed.reports).toHaveLength(1);
    expect(parsed.reports[0]!.labId).toBe("tail");
    expect(parsed.reports[0]!.hypothesis).toBe("p99 sobe");
  });

  it("entrada ausente → vazio (sem relatórios fabricados)", () => {
    expect(parseBenchReports(null).reports).toEqual([]);
  });
});
