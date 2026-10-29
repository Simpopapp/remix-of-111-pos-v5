import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SANDBOXES, SANDBOX_LINKS, type SandboxId } from "@/lib/simulators";
import { LAB_CATALOG } from "@/lib/bench";
import { getConcept } from "@/lib/concepts";

export const Route = createFileRoute("/sandboxes")({
  validateSearch: (search: Record<string, unknown>): { s?: string | undefined } => ({
    s: typeof search["s"] === "string" ? search["s"] : undefined,
  }),
  // Compat: deep-links antigos ?s=<id> apontam agora para o laboratório focado.
  beforeLoad: ({ search }) => {
    if (search.s && SANDBOXES.some((sb) => sb.id === search.s)) {
      throw redirect({ to: "/labs/$id", params: { id: search.s } });
    }
  },
  head: () => ({
    meta: [
      { title: "Labs — VibeCoder Academy" },
      {
        name: "description",
        content:
          "Seis laboratórios focados: rate limiting, circuit breaking, consultas N+1, SQL injection, filas e latência de cauda. Cada card declara o fenômeno, os controles reais, a competência que constrói e os limites.",
      },
      { property: "og:title", content: "Labs — VibeCoder Academy" },
      {
        property: "og:description",
        content:
          "Seis laboratórios focados com uma bancada explícita: prever, executar, observar e relatar. Fenômeno, controles, competência e limites declarados de antemão.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SandboxesPage,
});

function SandboxesPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <div className="text-center">
        <h1 className="font-serif text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Labs
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Six focused laboratories of the production patterns from the guide. Each bench follows
          the same ritual: predict before you run, then observe and report.
        </p>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {SANDBOXES.map((meta) => {
          const catalog = LAB_CATALOG[meta.id];
          return (
            <Link
              key={meta.id}
              to="/labs/$id"
              params={{ id: meta.id }}
              className="group flex flex-col rounded-2xl border border-border/70 bg-card/40 p-5 transition-colors hover:border-primary/40 hover:bg-card/60"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Lab #{meta.num}
                  </span>
                  <h2 className="font-serif text-xl font-bold text-foreground">{meta.title}</h2>
                </div>
                <ArrowRight
                  className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  aria-hidden="true"
                />
              </div>

              {/* Fenômeno */}
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">{catalog.phenomenon}</p>

              {/* Controles reais */}
              <div className="mt-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Controls on the bench</p>
                <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  {catalog.controls.slice(0, 3).map((c, i) => (
                    <li key={i}>· {c}</li>
                  ))}
                </ul>
              </div>

              {/* Competência */}
              <div className="mt-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Competence</p>
                <p className="mt-0.5 text-xs text-foreground/90">{catalog.competence}</p>
              </div>

              {/* Limites honestos */}
              <div className="mt-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">What it does NOT show</p>
                <ul className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">
                  {catalog.limits.map((l, i) => (
                    <li key={i}>· {l}</li>
                  ))}
                </ul>
              </div>

              {/* Relação de prática direta vs. apoio contextual com os conceitos */}
              <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-3">
                {meta.conceptIds.map((cid) => {
                  const c = getConcept(cid);
                  const link = SANDBOX_LINKS[cid];
                  if (!c) return null;
                  return (
                    <span
                      key={cid}
                      title={link?.kind === "context" ? link.note : undefined}
                      className={
                        "rounded-full border px-2 py-0.5 font-mono text-[10px] " +
                        (link?.kind === "direct"
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border/60 bg-secondary/60 text-muted-foreground")
                      }
                    >
                      {link?.kind === "direct" ? "practice" : "context"} · #{cid} {c.name}
                    </span>
                  );
                })}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
