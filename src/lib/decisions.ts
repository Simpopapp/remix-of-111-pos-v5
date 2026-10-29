// Registro de decisão contextual (PRD project3 F7/§9.5). Chave própria
// "vibecoder-decisions-v1" — as declarações legadas do checklist de adoção
// permanecem INTACTAS em learning.application (significado histórico, nunca
// reinterpretadas como domínio). O registro novo é reflexão: nada é marcado
// "implementado" como prova; "não se aplica" é conclusão válida de
// primeira classe, nunca falha.
//
// Padrão do projeto: parse tolerante, snapshot de servidor neutro congelado
// (D3), aditivo com edição de conteúdo.

export const DECISIONS_KEY = "vibecoder-decisions-v1";

export interface DecisionRecord {
  id: string;
  createdAt: number; // epoch ms
  updatedAt: number;
  /** Princípio estudado ligado à decisão (conceito canônico 1..111). */
  conceptId?: number;
  missionSlug?: string;
  /** Necessidade no projeto do aluno — obrigatoria (a ficha nasce dela). */
  need: string;
  decision: string;
  rationale: string;
  rejectedAlternative?: string;
  /** Evidência disponível, honesta — o que se tem, não o que se gostaria. */
  evidenceNote?: string;
  /** Próxima verificação — quando e como a decisão será rechecada. */
  nextCheck?: string;
  /** Conclusão válida de primeira classe: o mecanismo não cabe no app. */
  notApplicable?: boolean;
  /** Índice da declaração legada mapeada (learning.application), se houver. */
  legacyLegacyIndex?: number;
}

export interface DecisionsState {
  records: DecisionRecord[];
}

const EMPTY: DecisionsState = { records: [] };

/** Estado neutro estável para SSR (sem mismatch de hidratação). */
export function emptyDecisions(): DecisionsState {
  return EMPTY;
}

function asRecord(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
}

/** Parse tolerante: valor corrompido → estado vazio (padrão learning.ts). */
export function parseDecisions(raw: string | null): DecisionsState {
  if (!raw) return { records: [] };
  try {
    const parsed: unknown = JSON.parse(raw);
    const rec = asRecord(parsed);
    const list = rec["records"];
    if (!Array.isArray(list)) return { records: [] };
    const records: DecisionRecord[] = [];
    for (const item of list) {
      const r = asRecord(item);
      if (
        typeof r["id"] === "string" &&
        typeof r["need"] === "string" &&
        typeof r["decision"] === "string" &&
        typeof r["rationale"] === "string" &&
        typeof r["createdAt"] === "number" &&
        typeof r["updatedAt"] === "number"
      ) {
        const entry: DecisionRecord = {
          id: r["id"] as string,
          createdAt: r["createdAt"] as number,
          updatedAt: r["updatedAt"] as number,
          need: r["need"] as string,
          decision: r["decision"] as string,
          rationale: r["rationale"] as string,
        };
        if (typeof r["conceptId"] === "number") entry.conceptId = r["conceptId"] as number;
        if (typeof r["missionSlug"] === "string") entry.missionSlug = r["missionSlug"] as string;
        if (typeof r["rejectedAlternative"] === "string")
          entry.rejectedAlternative = r["rejectedAlternative"] as string;
        if (typeof r["evidenceNote"] === "string") entry.evidenceNote = r["evidenceNote"] as string;
        if (typeof r["nextCheck"] === "string") entry.nextCheck = r["nextCheck"] as string;
        if (r["notApplicable"] === true) entry.notApplicable = true;
        if (typeof r["legacyLegacyIndex"] === "number")
          entry.legacyLegacyIndex = r["legacyLegacyIndex"] as number;
        records.push(entry);
      }
    }
    return { records };
  } catch {
    return { records: [] };
  }
}

// ============= Contratos puros (testáveis sem store) =============

export interface DecisionInput {
  need: string;
  decision?: string;
  rationale?: string;
  conceptId?: number;
  missionSlug?: string;
  rejectedAlternative?: string;
  evidenceNote?: string;
  nextCheck?: string;
  notApplicable?: boolean;
  legacyLegacyIndex?: number;
}

/**
 * Criação PURA: necessidade é sempre obrigatória (a ficha nasce dela);
 * decisão e motivo são exigidos — EXCETO quando a conclusão é "não se
 * aplica", que é válida por si e explica o porquê no motivo.
 */
export function buildDecision(
  input: DecisionInput,
  id: string,
  now: number = Date.now(),
): DecisionRecord | null {
  const need = input.need.trim();
  if (need.length === 0) return null;
  if (input.notApplicable === true) {
    const rationale = (input.rationale ?? "").trim();
    if (rationale.length === 0) return null;
    return {
      id,
      createdAt: now,
      updatedAt: now,
      need,
      decision: "",
      rationale,
      notApplicable: true,
      ...(input.conceptId !== undefined ? { conceptId: input.conceptId } : {}),
      ...(input.missionSlug !== undefined ? { missionSlug: input.missionSlug } : {}),
      ...(input.evidenceNote !== undefined ? { evidenceNote: input.evidenceNote } : {}),
      ...(input.nextCheck !== undefined ? { nextCheck: input.nextCheck } : {}),
      ...(input.legacyLegacyIndex !== undefined
        ? { legacyLegacyIndex: input.legacyLegacyIndex }
        : {}),
    };
  }
  const decision = (input.decision ?? "").trim();
  const rationale = (input.rationale ?? "").trim();
  if (decision.length === 0 || rationale.length === 0) return null;
  return {
    id,
    createdAt: now,
    updatedAt: now,
    need,
    decision,
    rationale,
    ...(input.conceptId !== undefined ? { conceptId: input.conceptId } : {}),
    ...(input.missionSlug !== undefined ? { missionSlug: input.missionSlug } : {}),
    ...(input.rejectedAlternative !== undefined
      ? { rejectedAlternative: input.rejectedAlternative }
      : {}),
    ...(input.evidenceNote !== undefined ? { evidenceNote: input.evidenceNote } : {}),
    ...(input.nextCheck !== undefined ? { nextCheck: input.nextCheck } : {}),
    ...(input.legacyLegacyIndex !== undefined
      ? { legacyLegacyIndex: input.legacyLegacyIndex }
      : {}),
  };
}

/**
 * Ordenação por relevância para o objetivo (§14.8): decisões ligadas a
 * conceitos do percurso do objetivo primeiro; depois recência — nunca data
 * crua como único critério. "Não se aplica" é ficha como qualquer outra.
 */
export function orderDecisionsByRelevance(
  records: DecisionRecord[],
  routeConceptIds: number[] = [],
): DecisionRecord[] {
  const inRoute = new Set(routeConceptIds);
  const rank = (r: DecisionRecord) => (r.conceptId !== undefined && inRoute.has(r.conceptId) ? 0 : 1);
  return [...records].sort(
    (a, b) => rank(a) - rank(b) || b.updatedAt - a.updatedAt,
  );
}

/** Visão 1:1 da declaração legada — significado histórico preservado. */
export interface LegacyDeclarationView {
  conceptId: number;
  ts: number;
  note?: string;
  nA?: boolean;
}

/**
 * Mapeamento 1:1 (F7 aceite): note e nA atravessam com o mesmo significado —
 * autodeclaração, nunca reinterpretada como domínio.
 */
export function legacyDeclarationView(
  conceptId: number,
  record: { ts: number; note?: string; nA?: boolean },
): LegacyDeclarationView {
  const view: LegacyDeclarationView = { conceptId, ts: record.ts };
  if (record.note !== undefined) view.note = record.note;
  if (record.nA !== undefined) view.nA = record.nA;
  return view;
}

// ============= Store compartilhado =============

let state: DecisionsState = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function ensureLoaded(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const raw = window.localStorage.getItem(DECISIONS_KEY);
  const next = parseDecisions(raw);
  if (next.records.length > 0) state = next;
}

export function getDecisionsState(): DecisionsState {
  ensureLoaded();
  return state;
}

export function subscribeDecisions(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Server snapshot neutro e congelado: hidratação nunca diverge (D3). */
export function getDecisionsServerSnapshot(): DecisionsState {
  return EMPTY;
}

function commit(next: DecisionsState): void {
  state = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(DECISIONS_KEY, JSON.stringify(next));
  }
  for (const listener of listeners) listener();
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `dec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Criação no store: delega ao contrato puro; nulo = ficha recusada. */
export function addDecision(input: DecisionInput, now: number = Date.now()): DecisionRecord | null {
  ensureLoaded();
  const record = buildDecision(input, newId(), now);
  if (record === null) return null;
  commit({ records: [record, ...state.records] });
  return record;
}

/** Edição com updatedAt real; a origem legada nunca é regravada. */
export function updateDecision(
  id: string,
  patch: Partial<Pick<DecisionRecord, "decision" | "rationale" | "evidenceNote" | "nextCheck" | "rejectedAlternative" | "notApplicable">>,
  now: number = Date.now(),
): void {
  ensureLoaded();
  commit({
    records: state.records.map((r) => {
      if (r.id !== id) return r;
      const next: DecisionRecord = { ...r, updatedAt: now };
      for (const key of ["decision", "rationale", "evidenceNote", "nextCheck", "rejectedAlternative"] as const) {
        const value = patch[key];
        if (value !== undefined) next[key] = value;
      }
      if (patch.notApplicable !== undefined) next.notApplicable = patch.notApplicable;
      return next;
    }),
  });
}

export function getDecision(id: string): DecisionRecord | undefined {
  ensureLoaded();
  return state.records.find((r) => r.id === id);
}
