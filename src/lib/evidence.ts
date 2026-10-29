// Evidência contextual (PRD project3 D8 / §9.3). Store ADITIVO próprio,
// chave "vibecoder-evidence-v1" — nunca toca em "vibecoder-learning-v1"
// (risco de colisão de store, PRD §12). Padrão do projeto: parse tolerante,
// snapshot de servidor neutro congelado (regra D3), useSyncExternalStore.
//
// Distinguimento contratado (testado): "evaluated" = resposta com critérios
// objetivos; "revealed" = solução vista (NUNCA conta como demonstração);
// "personal" = anotação/reflexão própria, sem critérios (laboratório e
// missão entram como personal — a bancada não avalia critérios).

import type { Answer, Outcome } from "@/lib/exercises";

export const EVIDENCE_KEY = "vibecoder-evidence-v1";

export type EvidenceStatus = "evaluated" | "revealed" | "personal";

export type EvidenceSource =
  | {
      kind: "task";
      taskId: string;
      conceptId: number;
      outcome: Outcome;
      answer: Answer;
      /** Nível de apoio usado: 3 = solução revelada. */
      helpUsed: number;
      /** Enunciado/cenário concreto usado na resposta. */
      scenario?: string;
    }
  | {
      kind: "lab";
      labId: string;
      hypothesis: string;
      config: Record<string, number | string>;
      observation: string;
      interpretation: string;
    }
  | {
      kind: "mission";
      missionSlug: string;
      stageIndex: number;
      note: string;
    };

export interface EvidenceRecord {
  id: string;
  createdAt: number; // epoch ms
  source: EvidenceSource;
  status: EvidenceStatus;
  /** Anotação pessoal opcional sobre o registro. */
  note?: string;
}

export interface EvidenceState {
  records: EvidenceRecord[];
}

const EMPTY: EvidenceState = { records: [] };

/** Estado neutro estável para SSR (sem mismatch de hidratação). */
export function emptyEvidence(): EvidenceState {
  return EMPTY;
}

/**
 * Status derivado da origem (D8): tarefa com apoio nível 3 é solução
 * revelada — consolidação, não demonstração. Laboratório e missão são
 * reflexão pessoal (sem critérios objetivos avaliados).
 */
export function deriveEvidenceStatus(source: EvidenceSource): EvidenceStatus {
  if (source.kind === "task") return source.helpUsed >= 3 ? "revealed" : "evaluated";
  return "personal";
}

/**
 * Filtro de listagem: apenas recortes aditivos — kind, conceito da tarefa,
 * missão ou laboratório. Combinável (E entre campos presentes).
 */
export interface EvidenceFilter {
  kind?: EvidenceSource["kind"] | undefined;
  conceptId?: number | undefined;
  missionSlug?: string | undefined;
  labId?: string | undefined;
}

function matches(record: EvidenceRecord, filter: EvidenceFilter): boolean {
  if (filter.kind !== undefined && record.source.kind !== filter.kind) return false;
  if (filter.conceptId !== undefined) {
    if (record.source.kind !== "task" || record.source.conceptId !== filter.conceptId)
      return false;
  }
  if (filter.missionSlug !== undefined) {
    if (record.source.kind !== "mission" || record.source.missionSlug !== filter.missionSlug)
      return false;
  }
  if (filter.labId !== undefined) {
    if (record.source.kind !== "lab" || record.source.labId !== filter.labId) return false;
  }
  return true;
}

export function listEvidence(
  state: EvidenceState,
  filter: EvidenceFilter = {},
): EvidenceRecord[] {
  const filtered = state.records.filter((r) => matches(r, filter));
  // Mais recente primeiro: o registro de agora é o mais relevante.
  return filtered.sort((a, b) => b.createdAt - a.createdAt);
}

export function getEvidence(state: EvidenceState, id: string): EvidenceRecord | undefined {
  return state.records.find((r) => r.id === id);
}

/**
 * Casa a evidência de tarefa com a tentativa do learning store: ambos são
 * gravados com o MESMO ts pelo gravador (parts.tsx / missão). Sem casamento,
 * o detalhe de evidência não tem a resposta — nunca chutar por proximidade.
 */
export function findTaskEvidence(
  state: EvidenceState,
  taskId: string,
  ts: number,
): EvidenceRecord | undefined {
  return state.records.find(
    (r) => r.source.kind === "task" && r.source.taskId === taskId && r.createdAt === ts,
  );
}

function asRecord(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
}

const VALID_STATUS = new Set<EvidenceStatus>(["evaluated", "revealed", "personal"]);

/** Parse tolerante: valor corrompido → estado vazio (padrão learning.ts). */
export function parseEvidence(raw: string | null): EvidenceState {
  if (!raw) return { records: [] };
  try {
    const parsed: unknown = JSON.parse(raw);
    const rec = asRecord(parsed);
    const list = rec["records"];
    if (!Array.isArray(list)) return { records: [] };
    const records: EvidenceRecord[] = [];
    for (const item of list) {
      const r = asRecord(item);
      const id = r["id"];
      const source = r["source"];
      const status = r["status"];
      if (
        typeof id === "string" &&
        id.length > 0 &&
        typeof source === "object" &&
        source !== null &&
        typeof status === "string" &&
        VALID_STATUS.has(status as EvidenceStatus) &&
        typeof r["createdAt"] === "number"
      ) {
        // A origem entra como veio: o parse tolera variantes de campo e a
        // fonte da verdade do conteúdo é quem gravou (mesmo padrão do
        // histórico de missão — entradas inválidas caem fora inteiras).
        records.push({
          id,
          createdAt: r["createdAt"] as number,
          source: source as EvidenceSource,
          status: status as EvidenceStatus,
          ...(typeof r["note"] === "string" ? { note: r["note"] as string } : {}),
        });
      }
    }
    return { records };
  } catch {
    return { records: [] };
  }
}

// ============= Store compartilhado =============

let state: EvidenceState = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function ensureLoaded(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const raw = window.localStorage.getItem(EVIDENCE_KEY);
  const next = parseEvidence(raw);
  if (next.records.length > 0) state = next;
}

export function getEvidenceState(): EvidenceState {
  ensureLoaded();
  return state;
}

export function subscribeEvidence(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Server snapshot neutro e congelado: hidratação nunca diverge (D3). */
export function getEvidenceServerSnapshot(): EvidenceState {
  return EMPTY;
}

function commit(next: EvidenceState): void {
  state = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(EVIDENCE_KEY, JSON.stringify(next));
  }
  for (const listener of listeners) listener();
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Append puro: nunca destrutivo, nunca regrava. O status vem da origem
 * (deriveEvidenceStatus) — o chamador não escolhe status: evidência não
 * pode ser rotulada como demonstração à mão.
 */
export function appendEvidence(
  source: EvidenceSource,
  createdAt: number = Date.now(),
): EvidenceRecord {
  ensureLoaded();
  const record: EvidenceRecord = {
    id: newId(),
    createdAt,
    source,
    status: deriveEvidenceStatus(source),
  };
  commit({ records: [record, ...state.records] });
  return record;
}

/**
 * Única mutação pós-gravação: a anotação pessoal. Nada destrutivo,
 * nada de reclassificar status — revealed nunca vira evaluated.
 */
export function updateEvidenceNote(id: string, note: string | null): void {
  ensureLoaded();
  const next = {
    records: state.records.map((r) => {
      if (r.id !== id) return r;
      if (note === null) {
        const { note: _drop, ...rest } = r;
        return rest;
      }
      return { ...r, note };
    }),
  };
  commit(next);
}
