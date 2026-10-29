// Fichas de pré-requisito (F3 / §14.4): nome, motivo e retomada curta — nunca
// números soltos. Cada ficha leva ao conceito com ?from= para que a volta
// retome o mesmo ponto da aula (chip de retorno na página do pré-requisito).

import { Link } from "@tanstack/react-router";
import { CornerDownRight, Repeat } from "lucide-react";
import type { Lesson } from "@/lib/lessons/types";
import { getPrereqCards } from "@/lib/lessons/prereq-motives";

export function PrereqCards({ lesson }: { lesson: Lesson }) {
  const cards = getPrereqCards(lesson);
  if (!cards.length) return null;

  return (
    <section id="prereqs" className="mb-8 rounded-2xl border border-border/70 bg-card/40 p-5">
      <h2 className="mb-1 flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
        <Repeat className="size-4 text-primary" /> Pré-requisitos
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        O que esta lição pressupõe — retome só o que fizer falta e volte ao
        mesmo ponto.
      </p>
      <ul className="space-y-3">
        {cards.map((card) => (
          <li key={card.id} className="rounded-xl border border-border/60 bg-background/50 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Link
                to="/concepts/$id"
                params={{ id: String(card.id) }}
                search={{ from: lesson.id }}
                className="text-sm font-semibold text-foreground underline-offset-2 hover:underline"
              >
                {card.name} <span className="font-mono text-xs text-muted-foreground">#{card.id}</span>
              </Link>
              <span className="font-mono text-xs text-muted-foreground">Retomar →</span>
            </div>
            <p className="mt-1.5 flex gap-1.5 text-sm text-foreground/90">
              <CornerDownRight className="mt-0.5 size-3.5 shrink-0 text-primary" />
              {card.motive ?? "Motivo ainda não registrado nesta lição — lacuna editorial declarada."}
            </p>
            {card.retake ? (
              <p className="mt-1.5 border-l-2 border-border pl-2 text-xs leading-relaxed text-muted-foreground">
                Retomada curta: {card.retake}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
