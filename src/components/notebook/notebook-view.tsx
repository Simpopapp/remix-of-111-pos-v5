// Caderno (PRD §9.4/§14.7): página única onde relatórios de experimento,
// comparações, dossiês e anotações ficam recuperáveis — cada entrada
// referenciando a evidência de origem. Nova entrada livre é "note";
// os demais tipos nascem com origem (bancada, comparação, dossiê).

import { Link } from "@tanstack/react-router";
import { BookOpen, NotebookPen } from "lucide-react";
import { useState } from "react";
import { useNotebook } from "@/hooks/use-notebook";
import { useEvidence } from "@/hooks/use-evidence";
import { getEvidence as findRecord } from "@/lib/evidence";
import type { NotebookEntry, NotebookType } from "@/lib/notebook";

const TYPE_LABEL: Record<NotebookType, string> = {
  "experiment-report": "Relatório de experimento",
  dossier: "Dossiê",
  note: "Anotação",
  comparison: "Comparação",
};

const formatDate = (ts: number) =>
  new Date(ts).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function OriginLine({ entry }: { entry: NotebookEntry }) {
  const { evidence } = useEvidence();
  if (entry.originEvidenceIds.length === 0) {
    return <p className="text-xs text-muted-foreground">Anotação livre — sem evidência de origem.</p>;
  }
  return (
    <p className="text-xs text-muted-foreground">
      Origem: {entry.originEvidenceIds.length}{" "}
      {entry.originEvidenceIds.length === 1 ? "evidência" : "evidências"} ·{" "}
      {entry.originEvidenceIds
        .map((id) => findRecord(evidence, id))
        .filter(Boolean)
        .map((r) => (r!.source.kind === "lab" ? `experimento ${r!.source.labId}` : r!.source.kind))
        .join(", ")}
    </p>
  );
}

function EntryCard({ entry }: { entry: NotebookEntry }) {
  return (
    <li data-testid="notebook-entry" className="rounded-xl border border-border/60 bg-card/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">{entry.title}</span>
        <span className="flex items-center gap-2">
          <span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-primary">
            {TYPE_LABEL[entry.type]}
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">{formatDate(entry.createdAt)}</span>
        </span>
      </div>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/90">{entry.body}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <OriginLine entry={entry} />
        {entry.links?.conceptId !== undefined ? (
          <Link
            to="/concepts/$id"
            params={{ id: String(entry.links.conceptId) }}
            search={{}}
            className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
          >
            #{entry.links.conceptId}
          </Link>
        ) : null}
        {entry.links?.missionSlug ? (
          <Link
            to="/missions/$slug"
            params={{ slug: entry.links.missionSlug }}
            className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
          >
            missão {entry.links.missionSlug}
          </Link>
        ) : null}
      </div>
    </li>
  );
}

export function NotebookView() {
  const { notebook, addEntry } = useNotebook();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const canSave = title.trim().length > 0 && body.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    addEntry({ title: title.trim(), type: "note", body: body.trim() });
    setTitle("");
    setBody("");
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card/40 p-5">
        <h2 className="mb-2 flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
          <NotebookPen className="size-4 text-primary" /> Nova anotação
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Anotação livre entra no caderno sem origem. Relatórios de experimento
          e comparações nascem com origem rastreada — na bancada e no Progresso.
        </p>
        <div className="space-y-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da anotação"
            aria-label="Título da anotação"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="O que vale registrar — decisão, dúvida, hipótese."
            aria-label="Corpo da anotação"
            rows={3}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            data-testid="save-note"
            onClick={save}
            disabled={!canSave}
            className="inline-flex rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Salvar anotação
          </button>
        </div>
      </section>

      {notebook.entries.length === 0 ? (
        <section className="rounded-2xl border border-border/70 bg-card/40 p-5">
          <h2 className="mb-2 flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
            <BookOpen className="size-4 text-primary" /> Caderno
          </h2>
          <p className="text-sm text-muted-foreground">
            Caderno vazio. Salve um relatório de experimento na bancada, compare
            duas tentativas no Progresso — ou escreva a primeira anotação acima.
          </p>
        </section>
      ) : (
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
            <BookOpen className="size-4 text-primary" /> Caderno
          </h2>
          <ul className="space-y-3">
            {notebook.entries.map((e) => (
              <EntryCard key={e.id} entry={e} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
