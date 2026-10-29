// F5 (PRD project3 D7): histórico de raciocínio preservado entre etapas e
// dossiê derivado. Contrato de store puro (learning.ts) + derivação pura
// (missions.ts). Trocar de etapa NUNCA limpa o histórico.

import { describe, expect, it } from "vitest";
import {
  emptyLearning,
  parseLearning,
  withMissionHistory,
  type MissionHistoryEntry,
} from "@/lib/learning";
import { deriveDossierDraft, getMission, latestHypothesisText } from "@/lib/missions";

const entry = (over: Partial<MissionHistoryEntry>): MissionHistoryEntry => ({
  id: "h1",
  stepId: "cbl-briefing",
  kind: "briefing",
  status: "collected",
  text: "The customer believes the payment failed; I would check the processor logs.",
  ts: 1000,
  ...over,
});

describe("mission history — preservação entre etapas (D7)", () => {
  it("entradas de etapas distintas coexistem: trocar de etapa não limpa o histórico", () => {
    let state = emptyLearning();
    state = withMissionHistory(state, "charged-but-lost", entry({ id: "h1", stepId: "cbl-briefing" }));
    state = withMissionHistory(state, "charged-but-lost", entry({ id: "h2", stepId: "cbl-predict", kind: "predict" }));
    state = withMissionHistory(state, "charged-but-lost", entry({ id: "h3", stepId: "cbl-experiment", kind: "experiment", status: "lab", labId: "circuit" }));

    const history = state.missions["charged-but-lost"]!.history!;
    expect(history.map((h) => h.id)).toEqual(["h1", "h2", "h3"]);
    expect(new Set(history.map((h) => h.stepId)).size).toBe(3);
  });

  it("append é aditivo mesmo quando o progresso avança de etapa", () => {
    let state = withMissionHistory(
      withMissionHistory(emptyLearning(), "charged-but-lost", entry({ id: "h1" })),
      "charged-but-lost",
      entry({ id: "h2", stepId: "cbl-decide", kind: "decide" }),
    );
    // O progresso avança: o registro base é atualizado com o novo step,
    // sem descartar o histórico anterior.
    const mission = state.missions["charged-but-lost"]!;
    state = {
      ...state,
      missions: {
        ...state.missions,
        "charged-but-lost": { ...mission, step: "cbl-decide", ts: 2000 },
      },
    };
    state = withMissionHistory(state, "charged-but-lost", entry({ id: "h3", stepId: "cbl-decide", kind: "decide", text: "Chose retry with the same operation id." }));

    const history = state.missions["charged-but-lost"]!.history!;
    expect(history).toHaveLength(3);
    expect(state.missions["charged-but-lost"]!.step).toBe("cbl-decide");
  });

  it("mesmo id não regrava (sem duplicar)", () => {
    let state = emptyLearning();
    state = withMissionHistory(state, "charged-but-lost", entry({ id: "h1" }));
    state = withMissionHistory(state, "charged-but-lost", entry({ id: "h1" }));
    expect(state.missions["charged-but-lost"]!.history).toHaveLength(1);
  });

  it("missoes distintas têm históricos independentes", () => {
    let state = withMissionHistory(emptyLearning(), "charged-but-lost", entry({ id: "h1" }));
    state = withMissionHistory(state, "slow-catalog", entry({ id: "h2", stepId: "sc-briefing", text: "Slowness comes from the query pattern." }));
    expect(state.missions["charged-but-lost"]!.history).toHaveLength(1);
    expect(state.missions["slow-catalog"]!.history).toHaveLength(1);
  });
});

describe("mission history — parse tolerante (estado legado)", () => {
  it("progresso antigo sem history permanece válido", () => {
    const r = parseLearning(
      JSON.stringify({ missions: { "charged-but-lost": { step: "cbl-briefing", ts: 5, dossier: "d" } } }),
    );
    expect(r.corrupt).toBe(false);
    expect(r.state.missions["charged-but-lost"]!.dossier).toBe("d");
    expect(r.state.missions["charged-but-lost"]!.history).toBeUndefined();
  });

  it("entradas inválidas caem fora; válidas sobrevivem", () => {
    const r = parseLearning(
      JSON.stringify({
        missions: {
          "charged-but-lost": {
            step: "cbl-briefing",
            ts: 5,
            history: [
              { id: "ok", stepId: "cbl-briefing", kind: "briefing", status: "collected", text: "h", ts: 1 },
              { id: "bad", stepId: "cbl-briefing", kind: "briefing", status: "grade-a", text: "h", ts: 1 },
              { id: "bad2", kind: "briefing", status: "collected", text: "h", ts: 1 },
            ],
          },
        },
      }),
    );
    const history = r.state.missions["charged-but-lost"]!.history!;
    expect(history).toHaveLength(1);
    expect(history[0]!.id).toBe("ok");
  });
});

describe("dossiê derivado (D7) — nunca campo vazio", () => {
  it("deriva seções rotuladas do histórico registrado", () => {
    const history: MissionHistoryEntry[] = [
      entry({ id: "h1", stepId: "cbl-briefing", kind: "briefing", status: "collected", text: "Hypothesis: timeout before the response." }),
      entry({ id: "h2", stepId: "cbl-experiment", kind: "experiment", status: "lab", labId: "circuit", text: "3 attempts, 3 possible billings with fresh ids." }),
      entry({ id: "h3", stepId: "cbl-decide", kind: "decide", status: "met", text: "Retry with the same operation id." }),
    ];
    const draft = deriveDossierDraft(history);
    expect(draft).toContain("Hypothesis: timeout before the response.");
    expect(draft).toContain("3 attempts, 3 possible billings with fresh ids.");
    expect(draft).toContain("Retry with the same operation id.");
    expect(draft).toContain("What I changed my mind about:");
  });

  it("histórico parcial: seções ausentes ficam pendentes em vez de sumirem", () => {
    const draft = deriveDossierDraft([entry({ id: "h1" })]);
    expect(draft).toContain("(not yet recorded)");
    expect(draft).toContain("(no lab result incorporated yet)");
  });

  it("histórico vazio: rascunho estruturado, nunca campo em branco", () => {
    const draft = deriveDossierDraft(undefined);
    expect(draft.trim().length).toBeGreaterThan(0);
    expect(draft).toContain("First hypothesis:");
  });
});

describe("hipótese levada ao laboratório (D7)", () => {
  it("retorna a última hipótese/previsão registrada", () => {
    const history: MissionHistoryEntry[] = [
      entry({ id: "h1", kind: "briefing", text: "First guess." }),
      entry({ id: "h2", stepId: "cbl-predict", kind: "predict", text: "Caller stops waiting first." }),
    ];
    expect(latestHypothesisText(history)).toBe("Caller stops waiting first.");
  });

  it("sem hipótese registrada, nada a carregar (a UI não inventa)", () => {
    expect(latestHypothesisText(undefined)).toBeUndefined();
    expect(latestHypothesisText([entry({ id: "h1", kind: "experiment", text: "observation" })])).toBeUndefined();
  });
});

describe("missões — contrato do índice F5 (14.6)", () => {
  it("cada missão declara competência, pré-reqs e produto", () => {
    for (const m of [
      getMission("charged-but-lost"),
      getMission("slow-catalog"),
      getMission("orders-pile-up"),
      getMission("breaking-change"),
      getMission("metric-moved"),
    ]) {
      expect(m!.competency.trim().length).toBeGreaterThan(0);
      expect(m!.product.trim().length).toBeGreaterThan(0);
      expect(m!.prereqConceptIds.length).toBeGreaterThan(0);
    }
  });
});
