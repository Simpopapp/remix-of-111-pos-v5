import { useCallback, useSyncExternalStore } from "react";
import {
  addDecision,
  getDecisionsServerSnapshot,
  getDecisionsState,
  subscribeDecisions,
  updateDecision,
  type DecisionInput,
  type DecisionsState,
} from "@/lib/decisions";

/**
 * Store de decisões (F7/§9.5) — mesmo padrão de use-learning: snapshot de
 * servidor neutro congelado, estado real após hidratação. Registro é
 * reflexão, nunca certificação; legado de learning.application não é tocado.
 */
export function useDecisions() {
  const decisions = useSyncExternalStore<DecisionsState>(
    subscribeDecisions,
    getDecisionsState,
    getDecisionsServerSnapshot,
  );

  const add = useCallback((input: DecisionInput) => {
    return addDecision(input);
  }, []);

  const patch = useCallback(
    (
      id: string,
      update: Partial<
        Pick<
          import("@/lib/decisions").DecisionRecord,
          "decision" | "rationale" | "evidenceNote" | "nextCheck" | "rejectedAlternative" | "notApplicable"
        >
      >,
    ) => {
      updateDecision(id, update);
    },
    [],
  );

  return { decisions, addDecision: add, updateDecision: patch };
}
