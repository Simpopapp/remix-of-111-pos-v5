// Modo consulta (PRD §9.6): definição, mecanismo, exemplo, contraexemplo e
// limites sem percorrer a aula inteira — sem esconder que existe mais, com
// link para o modo guiado.

import { Link } from "@tanstack/react-router";
import { BookOpen, Brain, HelpCircle, ListChecks, ScrollText } from "lucide-react";
import type { Lesson } from "@/lib/lessons/types";
import { Section } from "./parts";

export function ReferenceLesson({ lesson, conceptId }: { lesson: Lesson; conceptId: number }) {
  return (
    <div>
      <section className="mb-8 rounded-2xl border border-border/70 bg-card/40 p-5">
        <p className="mb-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Lesson {lesson.rev} · consulta rápida
        </p>
        <h2 className="mb-2 flex items-center gap-2 font-serif text-xl font-bold text-foreground">
          <BookOpen className="size-5 text-primary" /> Definição
        </h2>
        <p className="text-sm leading-relaxed text-foreground/90">
          {lesson.mentalModel.definition}
        </p>
      </section>

      <Section icon={Brain} title="Mecanismo">
        <p className="mb-1 text-sm leading-relaxed text-foreground/90">
          <span className="font-semibold text-primary">Analogia: </span>
          {lesson.mentalModel.analogy}
        </p>
        <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
          <span className="font-semibold">Onde a analogia quebra: </span>
          {lesson.mentalModel.analogyLimits}
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-1.5 pr-2 font-semibold">In the model</th>
              <th className="py-1.5 font-semibold">In the system</th>
            </tr>
          </thead>
          <tbody>
            {lesson.mentalModel.correspondence.map(([a, b], i) => (
              <tr key={i} className="border-b border-border/30">
                <td className="py-1.5 pr-2 text-foreground/90">{a}</td>
                <td className="py-1.5 text-muted-foreground">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section icon={ListChecks} title="Exemplo trabalhado">
        <p className="mb-3 text-sm font-semibold text-foreground">{lesson.worked.decision}</p>
        <ol className="space-y-1.5 text-sm text-muted-foreground">
          {lesson.worked.reasoning.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-mono text-primary">{i + 1}.</span>
              <span>{r}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section icon={HelpCircle} title="Contraexemplos">
        <div className="space-y-3">
          {lesson.misconceptions.map((m, i) => (
            <div key={i} className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm">
              <p className="font-semibold text-foreground">“{m.wrong}”</p>
              <p className="text-muted-foreground">Discriminant: {m.discriminant}</p>
              <p className="text-muted-foreground">Counterexample: {m.counterexample}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={ScrollText} title="Limites">
        <ul className="space-y-2 text-sm text-muted-foreground">
          {lesson.contrast.map((c, i) => (
            <li key={i}>
              <span className="font-semibold text-foreground">{c.alternative}</span> — não use
              quando: {c.whenNotToUse}
            </li>
          ))}
        </ul>
      </Section>

      <div className="mb-8 rounded-2xl border border-primary/30 bg-primary/5 p-5 text-sm">
        <p className="text-foreground/90">
          Esta é a consulta rápida — o percurso guiado tem situação, previsão
          antes do modelo, representação, prática e síntese.
        </p>
        <Link
          to="/concepts/$id"
          params={{ id: String(conceptId) }}
          search={{}}
          className="mt-3 inline-flex rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-transform active:scale-95"
        >
          Abrir o modo guiado
        </Link>
      </div>
    </div>
  );
}
