// Modo guiado (PRD §9.6): situação → previsão → modelo → representação →
// contraste → prática. A previsão vem antes do modelo (§14.4: alternância
// observar → explicar → decidir); nada do modelo é revelado antes.

import { useState } from "react";
import { Brain, ListChecks, ScrollText, Target } from "lucide-react";
import type { Lesson } from "@/lib/lessons/types";
import { Section, RepresentationBlock, PracticeTask, lessonTasks } from "./parts";
import { PrereqCards } from "./prereq-cards";

function PredictGate({ lesson, onReveal }: { lesson: Lesson; onReveal: () => void }) {
  const [prediction, setPrediction] = useState("");
  return (
    <Section icon={Target} title="Sua previsão antes do modelo">
      <p className="mb-2 text-sm text-muted-foreground">
        Antes de ler o mecanismo: o que você acha que produz o sintoma abaixo?
        Escreva sua previsão — ela fica só nesta sessão e não é avaliada.
      </p>
      <p className="mb-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm text-foreground/90">
        {lesson.scenario.symptom}
      </p>
      <textarea
        aria-label="Sua previsão"
        value={prediction}
        onChange={(e) => setPrediction(e.target.value)}
        rows={3}
        placeholder="Ex.: a latência cresce porque…"
        className="mb-3 w-full rounded-lg border border-border/60 bg-background/60 p-3 text-sm text-foreground placeholder:text-muted-foreground"
      />
      <button
        type="button"
        onClick={onReveal}
        className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-transform active:scale-95"
      >
        Revelar o modelo
      </button>
    </Section>
  );
}

export function GuidedLesson({ lesson }: { lesson: Lesson }) {
  const [revealed, setRevealed] = useState(false);
  const tasks = lessonTasks(lesson);

  return (
    <div>
      <section className="mb-8 rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <p className="mb-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Aula {lesson.rev} · aula âncora
        </p>
        <h2 className="mb-2 flex items-center gap-2 font-serif text-xl font-bold text-foreground">
          <Target className="size-5 text-primary" /> Objetivo
        </h2>
        <p className="text-sm leading-relaxed text-foreground/90">{lesson.objective}</p>
      </section>

      <PrereqCards lesson={lesson} />

      <Section icon={ScrollText} title="Situação">
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="font-semibold text-foreground">System</dt>
            <dd className="text-muted-foreground">{lesson.scenario.system}</dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Data</dt>
            <dd className="text-muted-foreground">{lesson.scenario.data}</dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Symptom</dt>
            <dd className="text-muted-foreground">{lesson.scenario.symptom}</dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Constraints</dt>
            <dd className="text-muted-foreground">
              <ul className="list-inside list-disc">
                {lesson.scenario.constraints.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Baseline</dt>
            <dd className="text-muted-foreground">{lesson.scenario.baseline}</dd>
          </div>
        </dl>
      </Section>

      {!revealed ? <PredictGate lesson={lesson} onReveal={() => setRevealed(true)} /> : null}

      {revealed ? (
        <>
          <Section icon={Brain} title="Seu modelo mental">
            <p className="mb-3 text-sm leading-relaxed text-foreground/90">
              {lesson.mentalModel.definition}
            </p>
            <p className="mb-1 text-sm leading-relaxed text-foreground/90">
              <span className="font-semibold text-primary">Analogy: </span>
              {lesson.mentalModel.analogy}
            </p>
            <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
              <span className="font-semibold">Where it breaks: </span>
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

          <RepresentationBlock lesson={lesson} />

          <Section icon={ListChecks} title="Contrast — when not to use it">
            <div className="space-y-3">
              {lesson.contrast.map((c, i) => (
                <div key={i} className="rounded-lg border border-border/60 bg-background/50 p-3 text-sm">
                  <p className="font-semibold text-foreground">{c.alternative}</p>
                  <p className="text-muted-foreground">Trade-off: {c.tradeoff}</p>
                  <p className="text-muted-foreground">Not for: {c.whenNotToUse}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section icon={ListChecks} title="Practice — decide and check">
            {tasks.length ? (
              tasks.map((t) => <PracticeTask key={t.id} task={t} />)
            ) : (
              <p className="text-sm text-muted-foreground">
                No practice tasks are authorized for this lesson yet.
              </p>
            )}
          </Section>
        </>
      ) : null}
    </div>
  );
}
