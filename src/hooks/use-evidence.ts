import { useCallback, useSyncExternalStore } from "react";
import {
  appendEvidence,
  getEvidenceServerSnapshot,
  getEvidenceState,
  subscribeEvidence,
  updateEvidenceNote,
  type EvidenceSource,
  type EvidenceState,
} from "@/lib/evidence";

/**
 * Store de evidência contextual (D8) — mesmo padrão de use-learning:
 * snapshot de servidor neutro congelado, estado real após hidratação.
 * A UI só lê e aponta; append é aditivo e o status nunca é escolhido à mão.
 */
export function useEvidence() {
  const evidence = useSyncExternalStore<EvidenceState>(
    subscribeEvidence,
    getEvidenceState,
    getEvidenceServerSnapshot,
  );

  const addEvidence = useCallback((source: EvidenceSource, createdAt?: number) => {
    return appendEvidence(source, createdAt);
  }, []);

  const setEvidenceNote = useCallback((id: string, note: string | null) => {
    updateEvidenceNote(id, note);
  }, []);

  return { evidence, addEvidence, setEvidenceNote };
}
