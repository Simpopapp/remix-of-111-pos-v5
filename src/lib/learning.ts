// Estado de aprendizagem — fonte única (PRD project2 D7). Load/save tolerante
// a storage corrompido (padrão readiness.ts). Os dados do checklist antigo
// migram 1:1 para `application` e mantêm significado de autodeclaração:
// nunca são reinterpretados como domínio (PRD D7, planejamento §14.3/§20).

export interface Attempt {
  taskId: string;
  conceptId: number;
  ts: number;
  /** Nível de apoio usado: 0 = nenhum; 3 = solução revelada. */
  help: 0 | 1 | 2 | 3;
  criteria: Record<string, boolean>;
  outcome: "met" | "partial" | "missed";
}

export interface ApplicationRecord {
  ts: number;
  note?: string;
  /** "Não se aplica" — planejamento §9.8. */
  nA?: boolean;
}

/**
 * Entrada do histórico de raciocínio da missão (PRD project3 D7): previsões,
 * revisões de hipótese, evidências e decisões preservadas — nunca limpas ao
 * trocar de etapa. Status honesto (sem nota falsa de texto aberto):
 * "collected" = reflexão coletada, não avaliada; "lab" = evidência vinda de
 * relatório de laboratório; "met"/"partial"/"missed" = critério avaliado.
 */
export type MissionHistoryStatus = "collected" | "lab" | "met" | "partial" | "missed";

export interface MissionHistoryEntry {
  id: string;
  stepId: string;
  /** MissionStepKind da etapa de origem (string para tolerância a versões). */
  kind: string;
  status: MissionHistoryStatus;
  text: string;
  ts: number;
  /** Laboratório de origem quando status === "lab". */
  labId?: string;
}

export interface MissionProgress {
  step: string;
  dossier?: string;
  ts: number;
  /** Histórico de raciocínio preservado (D7) — aditivo, nunca truncado. */
  history?: MissionHistoryEntry[];
}

export interface ReviewItem {
  taskId: string;
  dueTs: number;
  doneTs?: number;
}

export interface LearningState {
  /** conceptId -> ts do último acesso (dimensão Contato). */
  contact: Record<number, number>;
  attempts: Attempt[];
  /** Autodeclaração legada ("implemented in my app") + "não se aplica". */
  application: Record<number, ApplicationRecord>;
  missions: Record<string, MissionProgress>;
  /** Objetivo escolhido (D11). */
  objective?: { goal: string; ts: number };
  /** Retenção: variantes reagendadas (D9). */
  reviews: ReviewItem[];
}

export const LEARNING_KEY = "vibecoder-learning-v1";
export const READINESS_LEGACY_KEY = "vibecoder.readiness.v1";

/**
 * Intervalo inicial de retenção (D9) — hipótese de calibração declarada na
 * UI (planejamento §14.4), não número científico. Fonte única: learning.ts.
 */
export const RETENTION_INTERVAL_MS = 72 * 60 * 60 * 1000;

const EMPTY: LearningState = {
  contact: {},
  attempts: [],
  application: {},
  missions: {},
  reviews: [],
};

/** Estado neutro estável para SSR (sem mismatch de hidratação). */
export function emptyLearning(): LearningState {
  return EMPTY;
}

function asRecord(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
}

/** Parse tolerante: valor corrompido → estado vazio + flag (PRD D7). */
export function parseLearning(raw: string | null): {
  state: LearningState;
  corrupt: boolean;
} {
  if (!raw) return { state: { ...EMPTY }, corrupt: false };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return { state: { ...EMPTY }, corrupt: true };
    }
    const p = parsed as Record<string, unknown>;

    const contact: Record<number, number> = {};
    for (const [k, v] of Object.entries(asRecord(p["contact"]))) {
      const id = Number(k);
      if (Number.isInteger(id) && id >= 1 && id <= 111 && typeof v === "number") {
        contact[id] = v;
      }
    }

    const application: Record<number, ApplicationRecord> = {};
    for (const [k, v] of Object.entries(asRecord(p["application"]))) {
      const id = Number(k);
      if (Number.isInteger(id) && id >= 1 && id <= 111 && typeof v === "object" && v !== null) {
        const rec = asRecord(v);
        const entry: ApplicationRecord = { ts: typeof rec["ts"] === "number" ? (rec["ts"] as number) : 0 };
        if (typeof rec["note"] === "string") entry.note = rec["note"] as string;
        if (typeof rec["nA"] === "boolean") entry.nA = rec["nA"] as boolean;
        application[id] = entry;
      }
    }

    const attempts = Array.isArray(p["attempts"]) ? (p["attempts"] as Attempt[]) : [];
    const reviews = Array.isArray(p["reviews"]) ? (p["reviews"]) as ReviewItem[] : [];
    const missionsRaw = asRecord(p["missions"]);
    // Histórico de raciocínio (D7): parse tolerante entrada a entrada —
    // estados antigos sem history continuam válidos, entradas inválidas
    // caem fora sem invalidar o resto.
    const VALID_HISTORY_STATUS = new Set<MissionHistoryStatus>([
      "collected",
      "lab",
      "met",
      "partial",
      "missed",
    ]);
    const missions: Record<string, MissionProgress> = {};
    for (const [slug, raw] of Object.entries(missionsRaw)) {
      const rec = asRecord(raw);
      const parsed: MissionProgress = {
        step: typeof rec["step"] === "string" ? (rec["step"] as string) : "",
        ts: typeof rec["ts"] === "number" ? (rec["ts"] as number) : 0,
      };
      if (typeof rec["dossier"] === "string") parsed.dossier = rec["dossier"] as string;
      if (Array.isArray(rec["history"])) {
        const history: MissionHistoryEntry[] = [];
        for (const item of rec["history"]) {
          const h = asRecord(item);
          const status = h["status"];
          if (
            typeof h["id"] === "string" &&
            typeof h["stepId"] === "string" &&
            typeof h["kind"] === "string" &&
            typeof status === "string" &&
            VALID_HISTORY_STATUS.has(status as MissionHistoryStatus) &&
            typeof h["text"] === "string" &&
            typeof h["ts"] === "number"
          ) {
            const entry: MissionHistoryEntry = {
              id: h["id"] as string,
              stepId: h["stepId"] as string,
              kind: h["kind"] as string,
              status: status as MissionHistoryStatus,
              text: h["text"] as string,
              ts: h["ts"] as number,
            };
            if (typeof h["labId"] === "string") entry.labId = h["labId"] as string;
            history.push(entry);
          }
        }
        if (history.length > 0) parsed.history = history;
      }
      missions[slug] = parsed;
    }
    const objRaw = asRecord(p["objective"]);

    const result: LearningState = {
      contact,
      application,
      attempts,
      missions,
      reviews,
    };
    if (typeof objRaw["goal"] === "string" && typeof objRaw["ts"] === "number") {
      result.objective = { goal: objRaw["goal"] as string, ts: objRaw["ts"] as number };
    }
    return { state: result, corrupt: false };
  } catch {
    return { state: { ...EMPTY }, corrupt: true };
  }
}

export function loadLearning(): { state: LearningState; corrupt: boolean } {
  if (typeof window === "undefined") return { state: { ...EMPTY }, corrupt: false };
  return parseLearning(window.localStorage.getItem(LEARNING_KEY));
}

export function saveLearning(state: LearningState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LEARNING_KEY, JSON.stringify(state));
}

/**
 * Migração 1:1 do checklist antigo (vibecoder.readiness.v1) para
 * `application`. Idempotente: ids já presentes não são sobrescritos.
 */
export function migrateReadinessInto(
  state: LearningState,
  rawReadiness: string | null,
  now: number = Date.now(),
): LearningState {
  if (!rawReadiness) return state;
  try {
    const parsed: unknown = JSON.parse(rawReadiness);
    if (!Array.isArray(parsed)) return state;
    const next = { ...state, application: { ...state.application } };
    for (const v of parsed) {
      if (Number.isInteger(v) && v >= 1 && v <= 111 && !next.application[v]) {
        next.application[v] = {
          ts: now,
          note: "Registrado no checklist antigo (autodeclaração).",
        };
      }
    }
    return next;
  } catch {
    return state;
  }
}

/**
 * Carga completa com migração: primeiro acesso sem estado de aprendizagem
 * herda o checklist antigo como autodeclaração (PRD §8).
 */
export function loadLearningMigrated(now: number = Date.now()): {
  state: LearningState;
  corrupt: boolean;
  migrated: boolean;
} {
  const raw =
    typeof window === "undefined" ? null : window.localStorage.getItem(LEARNING_KEY);
  const readinessRaw =
    typeof window === "undefined" ? null : window.localStorage.getItem(READINESS_LEGACY_KEY);
  const { state, corrupt } = parseLearning(raw);
  const hasLearning = raw !== null;
  const next = migrateReadinessInto(state, readinessRaw, now);
  const migrated = !hasLearning && readinessRaw !== null && next !== state;
  if (migrated && typeof window !== "undefined") saveLearning(next);
  return { state: next, corrupt, migrated };
}

/**
 * Histórico de raciocínio da missão (PRD project3 D7): append puro e
 * ADITIVO — trocar de etapa nunca limpa entradas; id duplicado não
 * regrava. O hook delega a este contrato (testado em mission-history.test).
 */
export function withMissionHistory(
  state: LearningState,
  slug: string,
  entry: MissionHistoryEntry,
): LearningState {
  const current = state.missions[slug];
  const base: MissionProgress = current ?? { step: entry.stepId, ts: entry.ts };
  if (base.history?.some((h) => h.id === entry.id)) return state;
  return {
    ...state,
    missions: {
      ...state.missions,
      [slug]: { ...base, history: [...(base.history ?? []), entry] },
    },
  };
}
