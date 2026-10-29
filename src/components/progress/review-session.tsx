// Sessão de recuperação (PRD §14.7 / D9): revisão NÃO é releitura — é
// pergunta → resposta → apoio sob demanda → fechamento. O motor é o mesmo
// PracticeTask da aula (apoio graduado, feedback diagnóstico); a retenção
// (`retained`) só muda via recordAttempt — nunca na mão (D9).

import { HelpCircle } from "lucide-react";
import { getConcept } from "@/lib/concepts";
import { getTask } from "@/lib/exercises-data";
import { PracticeTask } from "@/components/lesson/parts";
import { useLearning } from "@/hooks/use-learning";

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });

export function ReviewSession() {
  const { learning } = useLearning();
  const now = Date.now();
  const due = learning.reviews
    .filter((r) => r.doneTs === undefined && r.dueTs <= now)
    .sort((a, b) => a.dueTs - b.dueTs);

  return (
    <section id="review" className="scroll-mt-24">
      <h2 className="mb-1 flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
        <HelpCircle className="size-4 text-primary" /> Recuperação agendada
      </h2>
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        Recontar o raciocínio depois do intervalo (72 h — hipótese de calibração
        declarada) é a evidência de retenção. Atraso não apaga o que já foi
        demonstrado; a fila nunca pune.
      </p>
      {due.length === 0 ? (
        <div className="rounded-2xl border border-border/70 bg-card/40 p-5">
          <p className="text-sm text-muted-foreground">
            Nenhuma recuperação pendente. Recuperações são agendadas quando uma
            variante de transferência é resolvida — e aparecem aqui 72 h depois.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {due.map((r) => {
            const task = getTask(r.taskId);
            if (!task) return null;
            const concept = getConcept(task.conceptId);
            return (
              <li
                key={r.taskId}
                data-testid="review-item"
                className="rounded-2xl border border-primary/30 bg-primary/5 p-5"
              >
                <p className="mb-1 text-sm font-semibold text-foreground">
                  Variante de transferência de{" "}
                  <a
                    href={`/concepts/${task.conceptId}`}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    #{task.conceptId} {concept?.name ?? ""}
                  </a>
                </p>
                <p className="mb-3 text-xs text-muted-foreground">
                  Agendada em {formatDate(r.dueTs)} · responder sem ver a solução
                  mantém a evidência honesta.
                </p>
                <PracticeTask task={task} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
