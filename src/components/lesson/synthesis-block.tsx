// Bloco de fechamento (PRD §9.6): síntese { princípio, condições de uso, erro
// mais provável, próxima aplicação } derivada do contrato Lesson — nunca
// texto solto. Renderizada em superfície de evidência (§14.4); a
// autodeclaração no Meu app não substitui este fechamento (D9).

import { CheckCircle2 } from "lucide-react";
import type { Lesson } from "@/lib/lessons/types";
import { deriveSynthesis } from "@/lib/lessons/synthesis";

export function SynthesisBlock({ lesson }: { lesson: Lesson }) {
  const s = deriveSynthesis(lesson);
  return (
    <section
      aria-label="Síntese da aula"
      className="surface-evidence mb-8 rounded-2xl border border-border/70 p-5"
    >
      <h2 className="mb-3 flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
        <CheckCircle2 className="size-4 text-primary" /> Síntese
      </h2>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="mb-0.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Princípio
          </dt>
          <dd className="leading-relaxed text-foreground/90">{s.principle}</dd>
        </div>
        <div>
          <dt className="mb-0.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Condições de uso
          </dt>
          <dd>
            <ul className="space-y-1">
              {s.conditions.map((c, i) => (
                <li key={i} className="flex gap-2 text-foreground/90">
                  <span className="font-mono text-primary">·</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </dd>
        </div>
        <div>
          <dt className="mb-0.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Erro mais provável
          </dt>
          <dd className="leading-relaxed text-foreground/90">{s.likelyError}</dd>
        </div>
        <div>
          <dt className="mb-0.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Próxima aplicação
          </dt>
          <dd className="leading-relaxed text-foreground/90">{s.nextApplication}</dd>
        </div>
      </dl>
      <p className="mt-4 border-t border-border/60 pt-3 text-xs text-muted-foreground">
        Registrar que aplicou no seu app é autodeclaração em{" "}
        <span className="font-semibold text-foreground">Meu app</span> — não conta
        como domínio aqui.
      </p>
    </section>
  );
}
