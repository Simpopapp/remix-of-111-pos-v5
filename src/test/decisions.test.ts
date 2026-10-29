import { describe, expect, it } from "vitest";
import {
  DECISIONS_KEY,
  addDecision,
  buildDecision,
  getDecision,
  getDecisionsServerSnapshot,
  legacyDeclarationView,
  orderDecisionsByRelevance,
  parseDecisions,
  type DecisionRecord,
} from "@/lib/decisions";

const full: DecisionRecord = {
  id: "dec-1",
  createdAt: 1000,
  updatedAt: 1000,
  conceptId: 27,
  need: "A página de pedidos faz 51 queries",
  decision: "Buscar com join de relação",
  rationale: "Remove round trips por linha sem perder o nome do cliente",
  rejectedAlternative: "Subir o limite do pool — esconde o problema",
  evidenceNote: "t-27-find-flaw atendida sem ajuda decisiva",
  nextCheck: "Rever quando a lista ganhar paginação",
};

describe("registro de decisão — contrato (F7/§9.5)", () => {
  it("ficha completa nasce de necessidade + decisão + motivo; campos opcionais atravessam", () => {
    const built = buildDecision(
      {
        need: full.need,
        decision: full.decision,
        rationale: full.rationale,
        conceptId: 27,
        rejectedAlternative: full.rejectedAlternative ?? "",
        evidenceNote: full.evidenceNote ?? "",
        nextCheck: full.nextCheck ?? "",
      },
      "id-1",
      5000,
    );
    expect(built?.need).toBe(full.need);
    expect(built?.conceptId).toBe(27);
    expect(built?.rejectedAlternative).toBe("Subir o limite do pool — esconde o problema");
    expect(built?.createdAt).toBe(5000);
  });

  it("'não se aplica' é conclusão de primeira classe — sem texto de decisão, com motivo", () => {
    const na = buildDecision(
      { need: "Filas com DLQ", rationale: "O app não tem fila — não cabe no escopo", notApplicable: true },
      "id-2",
      6000,
    );
    expect(na?.notApplicable).toBe(true);
    expect(na?.decision).toBe("");
    // Mesmo sem decisão, sem motivo não é ficha: 'não se aplica' explica o porquê.
    expect(buildDecision({ need: "x", notApplicable: true }, "id-3", 6000)).toBeNull();
  });

  it("sem necessidade não há ficha — e sem decisão/motivo a ficha é recusada", () => {
    expect(buildDecision({ need: "  ", decision: "a", rationale: "b" }, "id-4", 5)).toBeNull();
    expect(buildDecision({ need: "n", decision: "", rationale: "b" }, "id-5", 5)).toBeNull();
    expect(buildDecision({ need: "n", decision: "a" }, "id-6", 5)).toBeNull();
  });

  it("criação recusada não grava nada no store", () => {
    const before = parseDecisions(window.localStorage.getItem(DECISIONS_KEY)).records.length;
    addDecision({ need: "", decision: "a", rationale: "b" }, 7000);
    const after = parseDecisions(window.localStorage.getItem(DECISIONS_KEY)).records.length;
    expect(after).toBe(before);
  });

  it("getDecision desconhecido volta undefined", () => {
    expect(getDecision("dec-inexistente")).toBeUndefined();
  });

  it("ordenação por relevância: ligadas ao percurso do objetivo primeiro, depois recência", () => {
    const other: DecisionRecord = { ...full, id: "dec-2", conceptId: 80, updatedAt: 9000 };
    const unrelated: DecisionRecord = { ...full, id: "dec-3", updatedAt: 9500 };
    delete unrelated.conceptId; // sem conceito ligado — fora do percurso
    const ordered = orderDecisionsByRelevance([unrelated, other, full], [27, 25, 26]);
    expect(ordered.map((r) => r.id)).toEqual(["dec-1", "dec-3", "dec-2"]);
  });

  it("legado preservado 1:1: note e nA atravessam com o mesmo significado", () => {
    const view = legacyDeclarationView(15, {
      ts: 1234,
      note: "Registrado no checklist antigo (autodeclaração).",
      nA: true,
    });
    expect(view.conceptId).toBe(15);
    expect(view.ts).toBe(1234);
    expect(view.note).toBe("Registrado no checklist antigo (autodeclaração).");
    expect(view.nA).toBe(true);
  });

  it("parse tolerante: lixo → vazio; ficha inválida cai fora sozinha", () => {
    expect(parseDecisions(null)).toEqual({ records: [] });
    expect(parseDecisions("{{{")).toEqual({ records: [] });
    const mixed = JSON.stringify({
      records: [full, { ...full, id: "bad", need: 42 }, "lixo"],
    });
    expect(parseDecisions(mixed).records.map((r) => r.id)).toEqual(["dec-1"]);
  });

  it("snapshot de servidor é neutro e congelado — hidratação nunca diverge (D3)", () => {
    expect(getDecisionsServerSnapshot().records).toEqual([]);
    expect(getDecisionsServerSnapshot()).toBe(getDecisionsServerSnapshot());
  });
});
