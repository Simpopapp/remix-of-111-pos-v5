// Modo prática (PRD §9.6): motor de prática da lição + variante de
// transferência + critérios de evidência. Respostas com solução revelada
// (help 3) não contam como domínio — o motor registra isso.

import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ListChecks } from "lucide-react";
import type { Lesson } from "@/lib/lessons/types";
import { Section, PracticeTask, lessonTasks } from "./parts";

export function PracticeLesson({ lesson, conceptId }: { lesson: Lesson; conceptId: number }) {
  const tasks = lessonTasks(lesson);

  return (
    <div>
      <section className="mb-8 rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <p className="mb-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Lesson {lesson.rev} · prática
        </p>
        <h2 className="mb-2 flex items-center gap-2 font-serif text-xl font-bold text-foreground">
          <ListChecks className="size-5 text-primary" /> Decida e verifique
        </h2>
        <p className="text-sm leading-relaxed text-foreground/90">{lesson.objective}</p>
      </section>

      <Section icon={ListChecks} title="Practice — decide and check">
        {tasks.length ? (
          tasks.map((t) => <PracticeTask key={t.id} task={t} />)
        ) : (
          <p className="text-sm text-muted-foreground">
            No practice tasks are authorized for this lesson yet.
          </p>
        )}
      </Section>

      <Section icon={ArrowRight} title="Variante de transferência">
        <p className="text-sm leading-relaxed text-foreground/90">{lesson.transfer.variant}</p>
        <p className="mt-1 text-xs text-muted-foreground">Domain: {lesson.transfer.domain}</p>
      </Section>

      <Section icon={CheckCircle2} title="Critérios — você entendeu se">
        <ul className="space-y-2 text-sm text-muted-foreground">
          {lesson.evidenceCriteria.map((e, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-mono text-primary">□</span>
              <span>{e}</span>
            </li>
          ))}
        </ul>
      </Section>

      <div className="mb-8 rounded-2xl border border-border/70 bg-card/40 p-5 text-sm">
        <p className="text-muted-foreground">
          Dúvida no mecanismo? O modo guiado tem a situação completa e o modelo
          passo a passo.
        </p>
        <Link
          to="/concepts/$id"
          params={{ id: String(conceptId) }}
          search={{}}
          className="mt-3 inline-flex rounded-xl border border-border bg-secondary px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
        >
          Abrir o modo guiado
        </Link>
      </div>
    </div>
  );
}
