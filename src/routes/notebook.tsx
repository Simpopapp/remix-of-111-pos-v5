import { createFileRoute } from "@tanstack/react-router";
import { NotebookView } from "@/components/notebook/notebook-view";

export const Route = createFileRoute("/notebook")({
  head: () => ({
    meta: [
      { title: "Caderno — VibeCoder Academy" },
      {
        name: "description",
        content:
          "Caderno de decisões: relatórios de experimento, comparações, dossiês e anotações — cada entrada referenciando a evidência de origem.",
      },
      { property: "og:title", content: "Caderno — VibeCoder Academy" },
      {
        property: "og:description",
        content: "Hipóteses, relatórios e comparações recuperáveis, com origem rastreada.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotebookPage,
});

function NotebookPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-10 sm:px-6">
      <header>
        <h1 className="font-serif text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Caderno
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Não é uma coleção de resumos: cada entrada aponta para a evidência de
          origem — tarefa respondida, experimento executado ou comparação feita.
        </p>
      </header>
      <NotebookView />
    </div>
  );
}
