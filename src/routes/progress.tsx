import { createFileRoute } from "@tanstack/react-router";
import { OpenQuestions } from "@/components/progress/open-questions";
import { ReviewSession } from "@/components/progress/review-session";
import { DimensionMatrix } from "@/components/progress/dimension-matrix";
import { EvidenceList } from "@/components/progress/evidence-list";
import { NotebookPen } from "lucide-react";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Progresso — VibeCoder Academy" },
      {
        name: "description",
        content:
          "Progresso honesto: contato, prática, demonstração, transferência, retenção e aplicação declarada — cada dimensão com denominador explícito, evidência inspecionável e recuperação agendada.",
      },
      { property: "og:title", content: "Progresso — VibeCoder Academy" },
      {
        property: "og:description",
        content:
          "Seis dimensões honestas de aprendizagem, com denominadores rotulados, evidência inspecionável e sessão de recuperação.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10 sm:px-6">
      <header>
        <h1 className="font-serif text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Progresso
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Seis dimensões, cada uma dizendo o que mede e o que não mede. O que
          sustenta cada estado é inspecionável — decisões, critérios e apoio
          usado, não tempo de página.
        </p>
      </header>
      <OpenQuestions />
      <ReviewSession />
      <DimensionMatrix />
      <EvidenceList />
      <footer className="flex items-center gap-2 text-xs text-muted-foreground">
        <NotebookPen className="size-3.5" />
        <a href="/notebook" className="font-semibold text-primary underline-offset-2 hover:underline">
          Caderno
        </a>{" "}
        — relatórios de experimento, comparações, dossiês e anotações com origem rastreada.
      </footer>
    </div>
  );
}
