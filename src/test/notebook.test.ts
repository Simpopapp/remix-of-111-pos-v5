import { describe, expect, it } from "vitest";
import {
  NOTEBOOK_KEY,
  addNotebookEntry,
  buildNotebookEntry,
  getNotebookEntry,
  listNotebook,
  parseNotebook,
  withNotebookPatch,
  type NotebookEntry,
} from "@/lib/notebook";

const base: NotebookEntry = {
  id: "nb-1",
  createdAt: 1000,
  updatedAt: 1000,
  title: "Relatório — burst no rate limiter",
  type: "experiment-report",
  originEvidenceIds: ["ev-1"],
  body: "Burst de 20 requisições perdeu 3 com bucket de 5.",
};

describe("caderno de decisões — contrato (F6/D8)", () => {
  it("entrada sem origem só é legítima como note — experimento/dossiê/comparação exigem evidência", () => {
    expect(buildNotebookEntry({ title: "x", type: "experiment-report", body: "b" }, "id-1", 5)).toBeNull();
    expect(buildNotebookEntry({ title: "x", type: "dossier", body: "b" }, "id-2", 5)).toBeNull();
    expect(buildNotebookEntry({ title: "x", type: "comparison", body: "b" }, "id-3", 5)).toBeNull();
    const note = buildNotebookEntry({ title: "nota livre", type: "note", body: "b" }, "id-4", 5);
    expect(note?.originEvidenceIds).toEqual([]);
  });

  it("origem rastreada: experimento criado aponta para a evidência e é filtrável por ela", () => {
    const entry = addNotebookEntry(
      {
        title: "Relatório — tail no p99",
        type: "experiment-report",
        originEvidenceIds: ["ev-tail-1"],
        body: "Nearest-rank: 99% é o 99º de 100.",
        links: { conceptId: 93 },
      },
      5000,
    );
    expect(entry?.originEvidenceIds).toEqual(["ev-tail-1"]);
    expect(listNotebook({ originEvidenceId: "ev-tail-1" }).map((e) => e.id)).toEqual([entry!.id]);
    expect(listNotebook({ originEvidenceId: "ev-inexistente" })).toEqual([]);
    expect(listNotebook({ type: "experiment-report" }).every((e) => e.type === "experiment-report")).toBe(true);
  });

  it("edição atualiza updatedAt e nunca regrava a origem", () => {
    const patched = withNotebookPatch(base, { body: "nova observação" }, 9000);
    expect(patched.body).toBe("nova observação");
    expect(patched.updatedAt).toBe(9000);
    expect(patched.createdAt).toBe(1000);
    expect(patched.originEvidenceIds).toEqual(["ev-1"]);
    expect(withNotebookPatch(base, {}).updatedAt).toBe(base.updatedAt);
  });

  it("criação recusada não grava nada (contrato puro antes do store)", () => {
    const before = parseNotebook(window.localStorage.getItem(NOTEBOOK_KEY)).entries.length;
    addNotebookEntry({ title: "sem origem", type: "dossier", body: "b" }, 6000);
    const after = parseNotebook(window.localStorage.getItem(NOTEBOOK_KEY)).entries.length;
    expect(after).toBe(before);
  });

  it("getNotebookEntry desconhecido volta undefined", () => {
    expect(getNotebookEntry("nb-inexistente")).toBeUndefined();
  });

  it("caderno ordena mais recente primeiro (recência declarada, sem peso inventado)", () => {
    const ids = listNotebook().map((e) => e.createdAt);
    expect([...ids].sort((a, b) => b - a)).toEqual(ids);
  });

  it("parse tolerante: lixo → vazio; type inválido e entrada corrompida caem fora sozinhos", () => {
    expect(parseNotebook(null)).toEqual({ entries: [] });
    expect(parseNotebook("{{{lixo")).toEqual({ entries: [] });
    expect(parseNotebook('{"entries": 42}')).toEqual({ entries: [] });
    const mixed = JSON.stringify({
      entries: [
        base,
        { ...base, id: "bad-type", type: "resumo-solto" },
        { ...base, id: "no-origin", originEvidenceIds: "não-lista" },
        "lixo",
      ],
    });
    expect(parseNotebook(mixed).entries.map((e) => e.id)).toEqual(["nb-1"]);
  });

  it("links de conceito/missão sobrevivem ao roundtrip", () => {
    const entry: NotebookEntry = {
      ...base,
      id: "nb-links",
      links: { conceptId: 12, missionSlug: "checkout-timeout" },
    };
    const parsed = parseNotebook(JSON.stringify({ entries: [entry] }));
    expect(parsed.entries[0]?.links).toEqual({ conceptId: 12, missionSlug: "checkout-timeout" });
  });
});
