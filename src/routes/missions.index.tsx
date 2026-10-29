import { createFileRoute, Link } from "@tanstack/react-router";
import { MISSIONS } from "@/lib/missions";
import { getConcept } from "@/lib/concepts";
import { useLearning } from "@/hooks/use-learning";

export const Route = createFileRoute("/missions/")({
  head: () => ({
    meta: [
      { title: "Missions — VibeCoder Academy" },
      {
        name: "description",
        content:
          "Integrated missions on a recurring scenario: predict, experiment, decide, transfer and write the dossier — the full learning cycle in order.",
      },
      { property: "og:title", content: "Missions — VibeCoder Academy" },
      {
        property: "og:description",
        content:
          "Investigation missions on the Digital Store scenario — no answer revealed in advance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MissionsIndexPage,
});

function MissionsIndexPage() {
  const { learning } = useLearning();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <header>
        <h1 className="font-serif text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Missions
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          The recurring scenario is a digital store with a catalog and order
          processing. Each mission walks the full cycle — predict, experiment,
          decide, transfer — and never tells you which pattern is the answer.
        </p>
      </header>

      <div className="space-y-4">
        {MISSIONS.map((m) => {
          const progress = learning.missions[m.slug];
          const done = progress?.dossier !== undefined;
          const stepIndex = progress
            ? m.steps.findIndex((s) => s.id === progress.step)
            : -1;
          const interrupted = !done && progress !== undefined;
          return (
            <Link
              key={m.slug}
              to="/missions/$slug"
              params={{ slug: m.slug }}
              data-testid="mission-card"
              className="block rounded-2xl border border-border/70 bg-card/50 p-5 transition-colors hover:border-primary/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-serif text-lg font-bold text-foreground">{m.title}</h2>
                <span
                  className={
                    "rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide " +
                    (done
                      ? "bg-success/15 text-success"
                      : interrupted
                        ? "bg-warning/15 text-warning"
                        : "bg-muted text-muted-foreground")
                  }
                >
                  {done ? "dossier saved" : interrupted ? "interrupted" : "not started"}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.problem}</p>

              <p className="mt-3 text-xs text-foreground/90">
                <span className="font-semibold text-primary">Competency: </span>
                {m.competency}
              </p>
              <p className="mt-2 text-xs text-foreground/90">
                <span className="font-semibold text-primary">Learning product: </span>
                {m.product}
              </p>

              <p className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                  Prerequisites:
                </span>
                {m.prereqConceptIds.map((cid) => {
                  const c = getConcept(cid);
                  if (!c) return null;
                  return (
                    <span
                      key={cid}
                      className="rounded-full border border-border/60 bg-secondary/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                    >
                      #{cid} {c.name}
                    </span>
                  );
                })}
              </p>

              <p className="mt-3 font-mono text-xs text-muted-foreground">
                {m.steps.length} steps
                {interrupted && stepIndex >= 0
                  ? ` · interrupted at: ${m.steps[stepIndex]!.title}`
                  : ""}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
