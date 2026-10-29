// Matriz de progresso (PRD §14.7): 6 dimensões com rótulo pt-BR e
// denominador honesto (semântica de progress.ts intacta — só apresentação).
// 0/0 não é desempenho: quando o recorte não tem prática disponível, a
// célula DIZ isso em vez de exibir uma nota falsa.

import { Link } from "@tanstack/react-router";
import { ArrowRight, ListChecks, Table2 } from "lucide-react";
import { useMemo } from "react";
import {
  DIMENSIONS,
  DIMENSION_LABELS,
  DIMENSION_MEANING,
  progressOverview,
} from "@/lib/progress";
import { useLearning } from "@/hooks/use-learning";

export function DimensionMatrix() {
  const { learning } = useLearning();
  const overview = useMemo(() => progressOverview(learning), [learning]);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
          <ListChecks className="size-4 text-primary" /> As seis dimensões
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DIMENSIONS.map((d) => {
            const t = overview.totals[d];
            return (
              <div key={d} className="rounded-xl border border-border/70 bg-card/50 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-bold text-foreground">{DIMENSION_LABELS[d]}</span>
                  <span className="font-mono text-lg font-extrabold text-foreground">
                    {t.count}
                    <span className="text-xs font-medium text-muted-foreground"> / {t.denominator}</span>
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  {t.count} de {t.denominatorLabel}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {DIMENSION_MEANING[d]}
                </p>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Nenhuma porcentagem global de propósito: uma nota única misturaria
          consultar uma página com demonstrar uma decisão. A aplicação declarada
          vive em{" "}
          <Link to="/readiness" className="font-semibold text-primary underline-offset-2 hover:underline">
            Meu app
          </Link>{" "}
          — autodeclaração, nunca prova.
        </p>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
          <Table2 className="size-4 text-primary" /> Por competência
        </h2>
        <div className="overflow-x-auto rounded-xl border border-border/70">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-card/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Categoria</th>
                {DIMENSIONS.map((d) => (
                  <th key={d} className="px-3 py-2 font-semibold">
                    {DIMENSION_LABELS[d]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {overview.byCategory.map((row) => (
                <tr key={row.cat} className="border-b border-border/30 last:border-b-0">
                  <td className="px-3 py-2 font-semibold text-foreground">
                    {row.cat}
                    <span className="ml-1.5 font-mono text-xs font-normal text-muted-foreground">
                      {row.concepts} conceitos
                    </span>
                  </td>
                  {DIMENSIONS.map((d) => {
                    const s = row.dims[d];
                    return (
                      <td key={d} className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {s.denominator === 0 ? (
                          <span className="italic text-muted-foreground/70">sem prática disponível</span>
                        ) : (
                          `${s.count}/${s.denominator}`
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Denominadores seguem o recorte: prática conta só conceitos com
          tarefas; transferência e retenção, só com variantes. "Sem prática
          disponível" é sobre o acervo, não sobre você.
        </p>
      </section>

      <footer className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ArrowRight className="size-3.5" />
        A retenção usa um primeiro intervalo fixo de 72 h — hipótese de
        calibração, declarada aqui em vez de passar por ciência.
      </footer>
    </div>
  );
}
