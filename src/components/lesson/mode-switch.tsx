// Seletor dos três modos de aula (PRD §9.6): estado na URL (?mode=), guided
// é o default (sem parâmetro). Links — cada modo é endereçável e volta à
// mesma aula sem perder o modo.

import { Link } from "@tanstack/react-router";
import { BookOpen, ListChecks, Zap } from "lucide-react";

export type LessonMode = "guided" | "reference" | "practice";

const MODES: { key: LessonMode; label: string; hint: string; icon: typeof BookOpen }[] = [
  { key: "guided", label: "Guiada", hint: "percurso completo", icon: BookOpen },
  { key: "reference", label: "Consulta", hint: "definição e limites", icon: Zap },
  { key: "practice", label: "Prática", hint: "decidir e verificar", icon: ListChecks },
];

export function ModeSwitch({
  conceptId,
  mode,
}: {
  conceptId: number;
  mode: LessonMode;
}) {
  return (
    <nav aria-label="Modos da aula" className="mb-6 flex flex-wrap gap-2">
      {MODES.map((m) => {
        const active = m.key === mode;
        const Icon = m.icon;
        return (
          <Link
            key={m.key}
            to="/concepts/$id"
            params={{ id: String(conceptId) }}
            search={m.key === "guided" ? {} : { mode: m.key }}
            aria-current={active ? "page" : undefined}
            className={
              "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors " +
              (active
                ? "border-primary/60 bg-primary/15 text-foreground"
                : "border-border bg-secondary text-muted-foreground hover:border-primary/30 hover:text-foreground")
            }
          >
            <Icon className="size-3.5 text-primary" />
            {m.label}
            <span className="font-normal text-muted-foreground">{m.hint}</span>
          </Link>
        );
      })}
    </nav>
  );
}
