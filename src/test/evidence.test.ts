import { describe, expect, it } from "vitest";
import {
  EVIDENCE_KEY,
  appendEvidence,
  deriveEvidenceStatus,
  findTaskEvidence,
  getEvidence,
  getEvidenceServerSnapshot,
  listEvidence,
  parseEvidence,
  updateEvidenceNote,
  type EvidenceRecord,
  type EvidenceSource,
} from "@/lib/evidence";

const taskSource = (helpUsed: number, conceptId = 27): EvidenceSource => ({
  kind: "task",
  taskId: `t-${conceptId}`,
  conceptId,
  outcome: helpUsed >= 3 ? "partial" : "met",
  answer: { picked: ["a"] },
  helpUsed,
});

const labSource: EvidenceSource = {
  kind: "lab",
  labId: "ratelimit",
  hypothesis: "burst enche o balde",
  config: { capacity: 5, refillMs: 1500 },
  observation: "3 execuções perdidas no burst",
  interpretation: "capacidade insuficiente para o burst",
};

const missionSource: EvidenceSource = {
  kind: "mission",
  missionSlug: "checkout-timeout",
  stageIndex: 2,
  note: "hipótese revisada: timeout não é retry",
};

function record(
  id: string,
  createdAt: number,
  source: EvidenceSource,
  status: EvidenceRecord["status"],
): EvidenceRecord {
  return { id, createdAt, source, status };
}

describe("evidência contextual — contrato (F6/D8)", () => {
  it("tarefa com apoio ≤ 2 é evaluated; apoio 3 é solução revelada, nunca demonstração", () => {
    expect(deriveEvidenceStatus(taskSource(0))).toBe("evaluated");
    expect(deriveEvidenceStatus(taskSource(2))).toBe("evaluated");
    expect(deriveEvidenceStatus(taskSource(3))).toBe("revealed");
  });

  it("laboratório e missão são reflexão pessoal — a bancada não avalia critérios", () => {
    expect(deriveEvidenceStatus(labSource)).toBe("personal");
    expect(deriveEvidenceStatus(missionSource)).toBe("personal");
  });

  it("append é aditivo, mais recente primeiro, e grava na chave própria", () => {
    const before = parseEvidence(window.localStorage.getItem(EVIDENCE_KEY)).records.length;
    const created = appendEvidence(taskSource(1), 1000);
    const after = parseEvidence(window.localStorage.getItem(EVIDENCE_KEY)).records;
    expect(after.length).toBe(before + 1);
    expect(after[0]!.id).toBe(created.id);
    expect(created.createdAt).toBe(1000);
    expect(window.localStorage.getItem(EVIDENCE_KEY)).toContain(created.id);
  });

  it("a única mutação pós-gravação é a anotação — revealed nunca vira evaluated", () => {
    const created = appendEvidence(taskSource(3), 2000);
    updateEvidenceNote(created.id, "revelei a solução para comparar");
    const withNote = getEvidence(getEvidenceServerSnapshot(), created.id);
    // store atual via parse do localStorage (mesma fonte do app).
    const stored = parseEvidence(window.localStorage.getItem(EVIDENCE_KEY));
    const rec = getEvidence(stored, created.id);
    expect(withNote).toBeUndefined(); // snapshot de servidor é neutro — nunca vaza estado
    expect(rec?.status).toBe("revealed");
    expect(rec?.note).toBe("revelei a solução para comparar");
    updateEvidenceNote(created.id, null);
    const cleaned = getEvidence(parseEvidence(window.localStorage.getItem(EVIDENCE_KEY)), created.id);
    expect(cleaned?.note).toBeUndefined();
    expect(cleaned?.status).toBe("revealed");
  });

  it("listEvidence filtra por kind, conceito, missão e laboratório em conjunto", () => {
    const state = {
      records: [
        record("a", 300, taskSource(1, 27), "evaluated"),
        record("b", 200, taskSource(2, 15), "evaluated"),
        record("c", 100, labSource, "personal"),
        record("d", 50, missionSource, "personal"),
      ],
    };
    expect(listEvidence(state, { kind: "task" }).map((r) => r.id)).toEqual(["a", "b"]);
    expect(listEvidence(state, { conceptId: 15 }).map((r) => r.id)).toEqual(["b"]);
    expect(listEvidence(state, { missionSlug: "checkout-timeout" }).map((r) => r.id)).toEqual(["d"]);
    expect(listEvidence(state, { labId: "ratelimit" }).map((r) => r.id)).toEqual(["c"]);
    expect(listEvidence(state, { kind: "lab", conceptId: 15 })).toEqual([]);
  });

  it("listEvidence ordena mais recente primeiro (o registro de agora é o mais relevante)", () => {
    const state = {
      records: [record("old", 10, taskSource(1), "evaluated"), record("new", 999, taskSource(1), "evaluated")],
    };
    expect(listEvidence(state).map((r) => r.id)).toEqual(["new", "old"]);
  });

  it("getEvidence desconhecido volta undefined", () => {
    const state = { records: [record("a", 1, taskSource(1), "evaluated")] };
    expect(getEvidence(state, "a")?.id).toBe("a");
    expect(getEvidence(state, "nope")).toBeUndefined();
  });

  it("parse tolerante: lixo → vazio; entrada inválida não invalida o resto", () => {
    expect(parseEvidence(null)).toEqual({ records: [] });
    expect(parseEvidence("não-json{{{")).toEqual({ records: [] });
    expect(parseEvidence('{"records": "não-lista"}')).toEqual({ records: [] });
    const mixed = JSON.stringify({
      records: [
        { id: "ok", createdAt: 5, status: "evaluated", source: taskSource(1) },
        { id: "", createdAt: 5, status: "evaluated", source: taskSource(1) },
        { id: "bad-status", createdAt: 5, status: "demonstrado", source: taskSource(1) },
        "lixo",
      ],
    });
    const parsed = parseEvidence(mixed);
    expect(parsed.records.map((r) => r.id)).toEqual(["ok"]);
  });

  it("findTaskEvidence casa tentativa e evidência pelo mesmo ts — sem chute por proximidade", () => {
    const state = {
      records: [
        { id: "r1", createdAt: 1000, source: taskSource(1), status: "evaluated" as const },
        { id: "r2", createdAt: 1001, source: taskSource(1), status: "evaluated" as const },
      ],
    };
    expect(findTaskEvidence(state, "t-27", 1001)?.id).toBe("r2");
    expect(findTaskEvidence(state, "t-27", 999)).toBeUndefined();
  });

  it("snapshot de servidor é neutro e congelado — hidratação nunca diverge (D3)", () => {
    expect(getEvidenceServerSnapshot().records).toEqual([]);
    expect(getEvidenceServerSnapshot()).toBe(getEvidenceServerSnapshot());
  });
});
