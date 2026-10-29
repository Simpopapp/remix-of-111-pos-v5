// Relatórios de experimento (9.7/D6) — chave própria, sem tocar em learning.ts
// (risco de colisão de store: PRD §12). Padrão de parse tolerante e snapshot
// de servidor neutro, como learning.ts.

import type { ExperimentReport } from "./bench";

export const BENCH_REPORTS_KEY = "vibecoder-bench-reports-v1";

export interface BenchReportsState {
  reports: ExperimentReport[];
}

const EMPTY: BenchReportsState = { reports: [] };

/** Estado neutro estável para SSR (sem mismatch de hidratação). */
export function emptyBenchReports(): BenchReportsState {
  return EMPTY;
}

function asRecord(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
}

/** Parse tolerante: valor corrompido → estado vazio (padrão learning.ts). */
export function parseBenchReports(raw: string | null): BenchReportsState {
  if (!raw) return { reports: [] };
  try {
    const parsed: unknown = JSON.parse(raw);
    const rec = asRecord(parsed);
    const list = rec["reports"];
    if (!Array.isArray(list)) return { reports: [] };
    const reports: ExperimentReport[] = [];
    for (const item of list) {
      const r = asRecord(item);
      const id = r["id"];
      const labId = r["labId"];
      const hypothesis = r["hypothesis"];
      const config = r["config"];
      const observation = r["observation"];
      const interpretation = r["interpretation"];
      if (
        typeof id === "string" &&
        typeof labId === "string" &&
        typeof hypothesis === "string" &&
        typeof observation === "string" &&
        typeof interpretation === "string" &&
        typeof config === "object" &&
        config !== null
      ) {
        const report: ExperimentReport = {
          id,
          labId: labId as ExperimentReport["labId"],
          hypothesis,
          config: config as ExperimentReport["config"],
          observation,
          interpretation,
          createdAt: typeof r["createdAt"] === "string" ? r["createdAt"] : "",
        };
        if (typeof r["verdict"] === "string") report.verdict = r["verdict"];
        reports.push(report);
      }
    }
    return { reports };
  } catch {
    return { reports: [] };
  }
}

let state: BenchReportsState = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function ensureLoaded(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const raw = window.localStorage.getItem(BENCH_REPORTS_KEY);
  const next = parseBenchReports(raw);
  if (next.reports.length > 0) state = next;
}

export function getBenchReports(): BenchReportsState {
  ensureLoaded();
  return state;
}

export function subscribeBenchReports(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Server snapshot neutro e congelado: hidratação nunca diverge. */
export function getBenchReportsServerSnapshot(): BenchReportsState {
  return EMPTY;
}

function commit(next: BenchReportsState): void {
  state = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(BENCH_REPORTS_KEY, JSON.stringify(next));
  }
  for (const listener of listeners) listener();
}

export function addBenchReport(report: ExperimentReport): void {
  const current = getBenchReports();
  commit({ reports: [report, ...current.reports] });
}

/** Total de relatórios por laboratório — usado pela bancada. */
export function countReportsForLab(labId: string): number {
  return getBenchReports().reports.filter((r) => r.labId === labId).length;
}
