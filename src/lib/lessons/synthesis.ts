// Síntese final derivada do contrato Lesson (PRD §9.6: fechamento de todas as
// lições com princípio, condições de uso, erro mais provável e próxima
// aplicação). Função pura — a UI nunca inventa texto de fechamento fora
// destas derivações, e a autodeclaração não substitui o fechamento (D9).

import type { Lesson } from "./types";

export interface LessonSynthesis {
  /** O princípio: definição técnica correta do modelo mental. */
  principle: string;
  /** Condições de uso: restrições do cenário + quando preferir a alternativa. */
  conditions: string[];
  /** Erro mais provável: primeira concepção errada + discriminante. */
  likelyError: string;
  /** Próxima aplicação: variante de transferência + domínio declarado. */
  nextApplication: string;
}

export function deriveSynthesis(lesson: Lesson): LessonSynthesis {
  const firstMisconception = lesson.misconceptions[0];

  return {
    principle: lesson.mentalModel.definition,
    conditions: [
      ...lesson.scenario.constraints.map((c) => `Constraint of the scenario: ${c}.`),
      ...lesson.contrast.map(
        (c) => `Where ${c.whenNotToUse} — prefer ${c.alternative}.`,
      ),
    ],
    likelyError: firstMisconception
      ? `“${firstMisconception.wrong}” — discriminant: ${firstMisconception.discriminant}`
      : "No misconception registered for this lesson yet.",
    nextApplication: `${lesson.transfer.variant} (transfer to: ${lesson.transfer.domain})`,
  };
}
