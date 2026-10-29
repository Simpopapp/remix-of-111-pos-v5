// Abertura do Progresso (PRD §14.7): perguntas respondidas antes de matriz —
// "o que consigo demonstrar?", "o que vale praticar agora?" e lacunas
// acionáveis. A matriz continua abaixo (F6 mantém as 6 dimensões).

import { Link } from "@tanstack/react-router";
import { HelpCircle, Lightbulb, Target } from "lucide-react";
import { useMemo } from "react";
import { getConcept } from "@/lib/concepts";
import { progressOverview, type Dimension } from "@/lib/progress";
import { recommendNext, type Recommendation } from "@/lib/recommend";
import { missionHintsFromLearning } from "@/lib/missions";
import { useLearning } from "@/hooks/use-learning";
import { useEvidence } from "@/hooks/use-evidence";

const KIND_BADGE: Record<Recommendation["kind"], string> = {
  review: "Retenção",
  "mission-gap": "Missão",
  "route-step": "Percurso",
  challenge: "Prática",
};

/** Dimensões nas quais um conceito é lacuna acionável (praticou, não provou). */
const GAP_DIMENSIONS: Dimension[] = ["practiced", "demonstrated"];

export function OpenQuestions() {
  const { learning } = useLearning();
  const { evidence } = useEvidence();
  const overview = useMemo(() => progressOverview(learning), [learning]);
  const recs = useMemo(
    () =>
      recommendNext(learning, learning.objective?.goal, {
        missionHints: missionHintsFromLearning(learning),
      }),
    [learning],
  );

  const demonstrated = overview.active.filter((a) => a.dims.demonstrated);
  const gaps = overview.active.filter(
    (a) => GAP_DIMENSIONS.some((d) => a.dims[d]) && !a.dims.demonstrated,
  );
  const dueReviews = learning.reviews.filter(
    (r) => r.doneTs === undefined && r.dueTs <= Date.now(),
  );

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <h2 className="mb-2 flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
          <Target className="size-4 text-primary" /> O que consigo demonstrar?
        </h2>
        {demonstrated.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nada demonstrado ainda. Demonstrar é atender todos os critérios de
            uma tarefa sem ajuda decisiva — abra uma aula no modo{" "}
            <Link to="/library" className="font-semibold text-primary underline-offset-2 hover:underline">
              prática
            </Link>
            .
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {demonstrated.map((a) => {
              const concept = getConcept(a.conceptId);
              return (
                <li key={a.conceptId}>
                  <Link
                    to="/concepts/$id"
                    params={{ id: String(a.conceptId) }}
                    search={{}}
                    className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-success/20"
                  >
                    <span className="font-mono text-[10px] text-muted-foreground">#{a.conceptId}</span>
                    {concept?.name ?? `#${a.conceptId}`}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {overview.totals.demonstrated.count} de {overview.totals.demonstrated.denominatorLabel} ·{" "}
          {evidence.records.length} {evidence.records.length === 1 ? "registro de evidência" : "registros de evidência"} inspecionáveis abaixo.
        </p>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card/40 p-5">
        <h2 className="mb-2 flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
          <Lightbulb className="size-4 text-primary" /> O que vale praticar agora?
        </h2>
        {dueReviews.length > 0 ? (
          <p className="mb-3 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-foreground">
            <a href="#review" className="font-semibold text-primary underline-offset-2 hover:underline">
              {dueReviews.length}{" "}
              {dueReviews.length === 1 ? "recuperação agendada está" : "recuperações agendadas estão"} vencidas
            </a>{" "}
            — responder sem ver a solução é a evidência de retenção.
          </p>
        ) : null}
        {recs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Abra uma aula ou execute um experimento — recomendações aparecem quando há
            atividade para continuar.
          </p>
        ) : (
          <ul className="space-y-2">
            {recs.map((r, i) => (
              <li key={i}>
                <a
                  href={r.href}
                  className="block rounded-xl border border-border/60 bg-card/60 p-3 transition-colors hover:border-primary/40"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">{r.label}</span>
                    <span className="shrink-0 rounded bg-primary/15 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-primary">
                      {KIND_BADGE[r.kind]}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{r.reason}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {gaps.length > 0 ? (
        <section className="rounded-2xl border border-border/70 bg-card/40 p-5">
          <h2 className="mb-2 flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
            <HelpCircle className="size-4 text-primary" /> Lacunas acionáveis
          </h2>
          <ul className="space-y-2">
            {gaps.map((a) => {
              const concept = getConcept(a.conceptId);
              return (
                <li key={a.conceptId} className="rounded-xl border border-border/60 bg-background/40 p-3 text-sm">
                  <Link
                    to="/concepts/$id"
                    params={{ id: String(a.conceptId) }}
                    search={{ mode: "practice" }}
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    #{a.conceptId} {concept?.name ?? ""}
                  </Link>
                  <span className="text-muted-foreground">
                    {" "}
                    — você praticou, ainda não demonstrou. Retomar a tarefa no modo prática
                    fecha a lacuna com critérios, não com releitura.
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
