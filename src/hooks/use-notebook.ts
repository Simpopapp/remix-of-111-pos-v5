import { useCallback, useSyncExternalStore } from "react";
import {
  addNotebookEntry,
  getNotebookServerSnapshot,
  getNotebookState,
  subscribeNotebook,
  updateNotebookEntry,
  type NotebookInput,
  type NotebookLinks,
  type NotebookState,
} from "@/lib/notebook";

/**
 * Caderno de decisões (D8) — mesmo padrão de use-learning: snapshot de
 * servidor neutro congelado, estado real após hidratação. Origem nunca é
 * regravada pela UI; entradas sem origem só existem como "note".
 */
export function useNotebook() {
  const notebook = useSyncExternalStore<NotebookState>(
    subscribeNotebook,
    getNotebookState,
    getNotebookServerSnapshot,
  );

  const addEntry = useCallback((input: NotebookInput) => {
    return addNotebookEntry(input);
  }, []);

  const patchEntry = useCallback(
    (id: string, patch: { title?: string; body?: string; links?: NotebookLinks }) => {
      updateNotebookEntry(id, patch);
    },
    [],
  );

  return { notebook, addEntry, patchEntry };
}
