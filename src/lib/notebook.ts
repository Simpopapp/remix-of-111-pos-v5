// Caderno de decisões (PRD project3 D8 / §9.4). Chave própria
// "vibecoder-notebook-v1" — coleção RECUPERÁVEL de relatórios de experimento,
// dossiês, comparações e anotações, cada entrada referenciando a evidência de
// origem (originEvidenceIds). Não é mais uma coleção de resumos: sem origem,
// entrada de experimento/dossiê não existe.
//
// Mesmo padrão de bench-reports.ts / evidence.ts: parse tolerante, snapshot
// de servidor neutro congelado (D3), aditivo com edição apenas de conteúdo.

export const NOTEBOOK_KEY = "vibecoder-notebook-v1";

export type NotebookType = "experiment-report" | "dossier" | "note" | "comparison";

export interface NotebookLinks {
  conceptId?: number;
  missionSlug?: string;
}

export interface NotebookEntry {
  id: string;
  createdAt: number; // epoch ms
  updatedAt: number;
  title: string;
  type: NotebookType;
  /** Rastreia a evidência de origem (store "vibecoder-evidence-v1"). */
  originEvidenceIds: string[];
  body: string; // pt-BR
  links?: NotebookLinks;
}

export interface NotebookState {
  entries: NotebookEntry[];
}

const EMPTY: NotebookState = { entries: [] };

/** Estado neutro estável para SSR (sem mismatch de hidratação). */
export function emptyNotebook(): NotebookState {
  return EMPTY;
}

const VALID_TYPES = new Set<NotebookType>([
  "experiment-report",
  "dossier",
  "note",
  "comparison",
]);

function asRecord(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
}

/** Parse tolerante: valor corrompido → estado vazio (padrão learning.ts). */
export function parseNotebook(raw: string | null): NotebookState {
  if (!raw) return { entries: [] };
  try {
    const parsed: unknown = JSON.parse(raw);
    const rec = asRecord(parsed);
    const list = rec["entries"];
    if (!Array.isArray(list)) return { entries: [] };
    const entries: NotebookEntry[] = [];
    for (const item of list) {
      const r = asRecord(item);
      if (
        typeof r["id"] === "string" &&
        typeof r["title"] === "string" &&
        typeof r["type"] === "string" &&
        VALID_TYPES.has(r["type"] as NotebookType) &&
        typeof r["body"] === "string" &&
        typeof r["createdAt"] === "number" &&
        typeof r["updatedAt"] === "number" &&
        Array.isArray(r["originEvidenceIds"])
      ) {
        const entry: NotebookEntry = {
          id: r["id"] as string,
          createdAt: r["createdAt"] as number,
          updatedAt: r["updatedAt"] as number,
          title: r["title"] as string,
          type: r["type"] as NotebookType,
          originEvidenceIds: (r["originEvidenceIds"] as unknown[]).filter(
            (v): v is string => typeof v === "string",
          ),
          body: r["body"] as string,
        };
        const links = asRecord(r["links"]);
        if (typeof links["conceptId"] === "number" || typeof links["missionSlug"] === "string") {
          const parsedLinks: NotebookLinks = {};
          if (typeof links["conceptId"] === "number") parsedLinks.conceptId = links["conceptId"] as number;
          if (typeof links["missionSlug"] === "string") parsedLinks.missionSlug = links["missionSlug"] as string;
          entry.links = parsedLinks;
        }
        entries.push(entry);
      }
    }
    return { entries };
  } catch {
    return { entries: [] };
  }
}

// ============= Store compartilhado =============

let state: NotebookState = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function ensureLoaded(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const raw = window.localStorage.getItem(NOTEBOOK_KEY);
  const next = parseNotebook(raw);
  if (next.entries.length > 0) state = next;
}

export function getNotebookState(): NotebookState {
  ensureLoaded();
  return state;
}

export function subscribeNotebook(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Server snapshot neutro e congelado: hidratação nunca diverge (D3). */
export function getNotebookServerSnapshot(): NotebookState {
  return EMPTY;
}

function commit(next: NotebookState): void {
  state = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(next));
  }
  for (const listener of listeners) listener();
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `nb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface NotebookInput {
  title: string;
  type: NotebookType;
  originEvidenceIds?: string[];
  body: string;
  links?: NotebookLinks;
}

/**
 * Criação PURA (testável sem store): entrada SEM origem só é legítima como
 * "note" — relatório de experimento, dossiê e comparação precisam
 * referenciar evidência (D8: recuperável e rastreada, nunca resumo solto).
 */
export function buildNotebookEntry(
  input: NotebookInput,
  id: string,
  now: number = Date.now(),
): NotebookEntry | null {
  const needsOrigin = input.type !== "note";
  if (needsOrigin && (input.originEvidenceIds ?? []).length === 0) return null;
  return {
    id,
    createdAt: now,
    updatedAt: now,
    title: input.title,
    type: input.type,
    originEvidenceIds: input.originEvidenceIds ?? [],
    body: input.body,
    ...(input.links ? { links: input.links } : {}),
  };
}

/** Criação no store: delega ao contrato puro; nulo = entrada recusada. */
export function addNotebookEntry(
  input: NotebookInput,
  now: number = Date.now(),
): NotebookEntry | null {
  ensureLoaded();
  const entry = buildNotebookEntry(input, newId(), now);
  if (entry === null) return null;
  commit({ entries: [entry, ...state.entries] });
  return entry;
}

/** Pura: edição de título/corpo/links com updatedAt real; origem intacta.
 *  Patch vazio não é edição — updatedAt não se move. */
export function withNotebookPatch(
  entry: NotebookEntry,
  patch: { title?: string; body?: string; links?: NotebookLinks },
  now: number = Date.now(),
): NotebookEntry {
  const changed =
    patch.title !== undefined || patch.body !== undefined || patch.links !== undefined;
  if (!changed) return entry;
  return {
    ...entry,
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.body !== undefined ? { body: patch.body } : {}),
    ...(patch.links !== undefined ? { links: patch.links } : {}),
    updatedAt: now,
  };
}

export function getNotebookEntry(id: string): NotebookEntry | undefined {
  ensureLoaded();
  return state.entries.find((e) => e.id === id);
}

/** Edição no store: delega ao contrato puro. */
export function updateNotebookEntry(
  id: string,
  patch: { title?: string; body?: string; links?: NotebookLinks },
  now: number = Date.now(),
): void {
  ensureLoaded();
  commit({
    entries: state.entries.map((e) => (e.id === id ? withNotebookPatch(e, patch, now) : e)),
  });
}

/**
 * Caderno ordenado por recência declarada (mais recente primeiro) — sem
 * peso de relevância inventado (planejamento §13: sem métrica fake).
 */
export function listNotebook(
  filter?: { type?: NotebookType; originEvidenceId?: string },
): NotebookEntry[] {
  const entries = getNotebookState().entries;
  const filtered =
    filter === undefined
      ? entries
      : entries.filter(
          (e) =>
            (filter.type === undefined || e.type === filter.type) &&
            (filter.originEvidenceId === undefined ||
              e.originEvidenceIds.includes(filter.originEvidenceId)),
        );
  return filtered.sort((a, b) => b.createdAt - a.createdAt);
}
