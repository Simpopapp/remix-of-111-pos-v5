// Testes F3: síntese derivada do contrato Lesson (§9.6) e fichas de
// pré-requisito com nome/motivo/retomada (§14.4). Os modos são estado de URL
// na rota; o que é contratado aqui é a derivação pura e a cobertura editorial.

import { describe, expect, it } from "vitest";
import { LESSONS } from "@/lib/lessons";
import { deriveSynthesis } from "@/lib/lessons/synthesis";
import { getPrereqCards, PREREQ_MOTIVES } from "@/lib/lessons/prereq-motives";
import { CONCEPTS } from "@/lib/concepts";

describe("lesson-modes — síntese derivada (§9.6)", () => {
  it("deriva campo a campo do contrato Lesson", () => {
    const lesson = LESSONS.find((l) => l.id === 13)!;
    const firstMisconception = lesson.misconceptions[0]!;
    const firstContrast = lesson.contrast[0]!;
    const firstConstraint = lesson.scenario.constraints[0]!;
    const s = deriveSynthesis(lesson);
    expect(s.principle).toBe(lesson.mentalModel.definition);
    expect(s.likelyError).toContain(firstMisconception.wrong);
    expect(s.likelyError).toContain(firstMisconception.discriminant);
    expect(s.nextApplication).toContain(lesson.transfer.variant);
    expect(s.nextApplication).toContain(lesson.transfer.domain);
    expect(s.conditions.some((c) => c.includes(firstConstraint))).toBe(true);
    expect(s.conditions.some((c) => c.includes(firstContrast.whenNotToUse))).toBe(true);
    expect(s.conditions.some((c) => c.includes(firstContrast.alternative))).toBe(true);
  });

  it("nenhuma parte da síntese é vazia em lição alguma", () => {
    for (const lesson of LESSONS) {
      const s = deriveSynthesis(lesson);
      expect(s.principle.length, `lesson ${lesson.id} principle`).toBeGreaterThan(0);
      expect(s.conditions.length, `lesson ${lesson.id} conditions`).toBeGreaterThan(0);
      expect(s.likelyError.length, `lesson ${lesson.id} likelyError`).toBeGreaterThan(0);
      expect(s.nextApplication.length, `lesson ${lesson.id} nextApplication`).toBeGreaterThan(0);
    }
  });
});

describe("lesson-modes — pré-requisitos nomeados (§14.4)", () => {
  it("toda ficha tem nome canônico, motivo editorial e retomada curta", () => {
    for (const lesson of LESSONS) {
      const cards = getPrereqCards(lesson);
      expect(cards.map((c) => c.id)).toEqual(lesson.prereqIds);
      for (const card of cards) {
        const concept = CONCEPTS.find((c) => c.id === card.id);
        expect(concept, `lesson ${lesson.id} prereq ${card.id}: conceito inexistente`).toBeTruthy();
        expect(card.name).toBe(concept!.name);
        expect(card.motive, `lesson ${lesson.id} prereq ${card.id}: motivo ausente`).toBeTruthy();
        expect(card.retake.length, `lesson ${lesson.id} prereq ${card.id}: retomada vazia`).toBeGreaterThan(0);
      }
    }
  });

  it("nenhum motivo órfão (chave sem par lição/pré-requisito correspondente)", () => {
    const valid = new Set(
      LESSONS.flatMap((l) => l.prereqIds.map((p) => `${l.id}:${p}`)),
    );
    for (const key of Object.keys(PREREQ_MOTIVES)) {
      expect(valid.has(key), `motivo órfão: ${key}`).toBe(true);
    }
  });
});
