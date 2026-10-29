// Contrato da bancada unificada (PRD project3 D6, §3/F4, 9.7).
// Lógica da bancada é pura; componentes apenas renderizam o estado retornado.
// Os simuladores continuam em simulators.ts (contrato de testes intacto).

import type { SandboxId } from "./simulators";

// ---------- Parâmetros rotulados ----------

export interface BenchParamSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
  /** O que o controle faz e qual é o limite dele. */
  hint: string;
}

export interface BenchToggleSpec {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  default: string;
  /** O que a escolha muda — e o que ela NÃO muda. */
  hint: string;
}

export type BenchParamValues = Record<string, number>;
export type BenchToggleValues = Record<string, string>;

/** Configuração rotulada de uma execução (9.7: config com rótulo explícito). */
export interface BenchRunConfig {
  label: string;
  params: BenchParamValues;
  toggles: BenchToggleValues;
}

// ---------- Observação ----------

export interface RunObservation {
  headline: string;
  detail: string[];
  /** Caso fora do modelo: nomeado com o limite, nunca fingido. */
  outOfModel?: string;
}

export interface Attempt {
  /** Nº da execução — execução identificável (D6). */
  n: number;
  config: BenchRunConfig;
  at: string;
  observation: RunObservation;
}

// ---------- Estados da bancada (D6 / §15) ----------

export type BenchState =
  | "no-run" // sem execução
  | "invalid-param" // parâmetro inválido
  | "partial" // parcial (previsão ou interpretação pendente)
  | "paused" // pausa
  | "out-of-model" // fora do modelo
  | "ready"; // evidência suficiente

// ---------- Validação ----------

export type ParamErrors = Record<string, string>;

export function validateParams(
  specs: BenchParamSpec[],
  values: BenchParamValues,
): ParamErrors | null {
  const errors: ParamErrors = {};
  for (const spec of specs) {
    const v = values[spec.key];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      errors[spec.key] = `${spec.label}: value required`;
      continue;
    }
    if (v < spec.min || v > spec.max) {
      errors[spec.key] = `${spec.label}: ${v} is out of range (${spec.min}–${spec.max}${spec.unit ? " " + spec.unit : ""})`;
    }
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

/** Rótulo legível da configuração — o mesmo texto entra no registro e no relatório. */
export function formatConfig(
  specs: BenchParamSpec[],
  toggleSpecs: BenchToggleSpec[],
  values: BenchParamValues,
  toggles: BenchToggleValues,
): string {
  const parts: string[] = [];
  for (const spec of specs) {
    const v = values[spec.key];
    const unit = spec.unit ? ` ${spec.unit}` : "";
    const short = spec.label.toLowerCase();
    parts.push(`${short} ${v}${unit}`);
  }
  for (const spec of toggleSpecs) {
    const opt = spec.options.find((o) => o.value === toggles[spec.key]);
    parts.push(`${spec.label.toLowerCase()}: ${opt ? opt.label.toLowerCase() : "?"}`);
  }
  return parts.join(" · ");
}

export function defaultParamValues(specs: BenchParamSpec[]): BenchParamValues {
  const out: BenchParamValues = {};
  for (const spec of specs) out[spec.key] = spec.default;
  return out;
}

export function defaultToggleValues(specs: BenchToggleSpec[]): BenchToggleValues {
  const out: BenchToggleValues = {};
  for (const spec of specs) out[spec.key] = spec.default;
  return out;
}

/** Mesma configuração? (rótulo é comparado campo a campo, não por string.) */
export function sameConfig(a: BenchRunConfig, b: BenchRunConfig): boolean {
  return (
    a.label === b.label &&
    JSON.stringify(a.params) === JSON.stringify(b.params) &&
    JSON.stringify(a.toggles) === JSON.stringify(b.toggles)
  );
}

// ---------- Relatório de experimento (9.7 / D6) ----------

export interface ExperimentReport {
  id: string;
  labId: SandboxId;
  /** Previsão pedida antes da execução (D6). */
  hypothesis: string;
  /** Configuração rotulada (e a anterior, quando a comparação tem A/B). */
  config: BenchRunConfig;
  previousConfig?: BenchRunConfig;
  observation: string;
  interpretation: string;
  /** Veredito é opcional: nem todo experimento fecha um veredito. */
  verdict?: string;
  createdAt: string;
}

export type ReportReadiness =
  | { state: "ready" }
  | { state: "blocked"; reason: string };

/**
 * Quando o relatório pode ser registrado. Sem evidência suficiente o
 * relatório é BLOQUEADO com motivo — nunca salvo parcial como válido (§5.4).
 */
export function reportReadiness(input: {
  attempts: Attempt[];
  hypothesis: string;
  interpretation: string;
}): ReportReadiness {
  if (input.attempts.length === 0) {
    return { state: "blocked", reason: "No evidence yet: run the experiment first." };
  }
  if (input.hypothesis.trim().length === 0) {
    return { state: "blocked", reason: "Prediction missing: write what you expect before running." };
  }
  if (input.interpretation.trim().length === 0) {
    return { state: "blocked", reason: "Interpretation missing: write what the evidence shows." };
  }
  return { state: "ready" };
}

// ---------- Catálogo (F4: fenômeno, controles, competência, limites) ----------

export interface LabCatalogEntry {
  /** O fenômeno que o laboratório torna observável. */
  phenomenon: string;
  /** Controles reais disponíveis na bancada. */
  controls: string[];
  /** Competência que a bancada sustenta (o que dá para demonstrar). */
  competence: string;
  /** O que o laboratório NÃO demonstra — limites honestos. */
  limits: string[];
}

export const LAB_CATALOG: Record<SandboxId, LabCatalogEntry> = {
  ratelimit: {
    phenomenon:
      "A limiter counts tokens, not requests: bursts inside capacity pass while a flow faster than the refill drains the bucket.",
    controls: [
      "Bucket capacity (1–10 tokens)",
      "Refill interval (0.25–3 s)",
      "Scope: per-client or shared global bucket",
      "Actions: single request from each client, or a burst of 5",
    ],
    competence:
      "Point at the moment 429s start, separate an acceptable burst from a sustained flow, and compare per-IP against global scope with the same traffic.",
    limits: [
      "No adaptive or quota-based policies — only a token bucket",
      "Distributed limiters (multiple nodes sharing state) are not modeled",
    ],
  },
  circuit: {
    phenomenon:
      "A breaker opens after repeated failures so callers fail fast instead of waiting for a dead dependency.",
    controls: [
      "Failure threshold (1–5 consecutive failures)",
      "Cooldown before probing (1–10 s)",
      "Protection on/off on the same call sequence",
      "Actions: call the API, inject an outage, restore it",
    ],
    competence:
      "Follow each state transition with its trigger, and compare the same call sequence with and without protection.",
    limits: [
      "Single caller and single dependency — no bulkheads or fallback trees",
      "Half-open probes are one at a time; concurrency is not modeled",
    ],
  },
  nplusone: {
    phenomenon:
      "One query per item multiplies round-trips; batching or joining collapses them for the same entities.",
    controls: [
      "Items in the dataset (5–50)",
      "Network round-trip cost (5–100 ms)",
      "Strategy: per-item, batch, or JOIN",
    ],
    competence:
      "Count queries, rows and total cost for the same identifiable entities before and after changing strategy.",
    limits: [
      "No caching, no DataLoader-style coalescing, no read replicas",
      "Cost is a didactic model, not a benchmark",
    ],
  },
  sqli: {
    phenomenon:
      "String concatenation lets input become code; a parameterized query keeps data as data.",
    controls: [
      "Username input (try the demo users or your own string)",
      "Query style: concatenated vs parameterized",
    ],
    competence:
      "Read the query, the entry, the parameters and the result in the same field, and say why the attack short-circuits.",
    limits: [
      "Only classic injection in one query — no second-order injection, no XSS, no WAF layer",
      "The users table is a didactic fixture, not a real database",
    ],
  },
  pubsub: {
    phenomenon:
      "Competing consumers and fan-out are different structures: the delivery shape decides who receives each event and what a failure does.",
    controls: [
      "Mode: competing consumers vs fan-out",
      "Workers/subscribers (1–5)",
      "Failure kind: none, transient, poison, slow consumer",
      "Actions: publish events, step the queue, pause/resume",
    ],
    competence:
      "Trace one event from publish to ack or dead-letter, and read the DLQ as the consequence of a retry policy.",
    limits: [
      "At-least-once delivery only; exactly-once and ordering guarantees are out of scope",
      "Fan-out failures are per-subscriber; shared subscription semantics differ",
    ],
  },
  tail: {
    phenomenon:
      "Percentiles expose the slow tail that averages hide: most requests are fast and the slow ones still hurt real users.",
    controls: [
      "Sample size (100–1000 requests)",
      "Seed (deterministic sample)",
    ],
    competence:
      "Read the histogram with units and sample size, locate the p99 marker, and explain why one outlier shifts p99 far more than p50.",
    limits: [
      "Latencies come from a didactic model, never from a real benchmark",
      "No percentiles beyond p99.9, no per-endpoint breakdown",
    ],
  },
};
