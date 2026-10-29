import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, CircleOff, Info, ScrollText } from "lucide-react";
import { useMemo, useState } from "react";
import { CONCEPTS } from "@/lib/concepts";
import { useLearning } from "@/hooks/use-learning";
import { useDecisions } from "@/hooks/use-decisions";
import {
  buildDecision,
  legacyDeclarationView,
  orderDecisionsByRelevance,
  type LegacyDeclarationView,
} from "@/lib/decisions";
import { objectiveRouteConceptIds } from "@/lib/recommend";

export const Route = createFileRoute("/readiness")({
  head: () => ({
    meta: [
      { title: "Meu app — registro de decisão — VibeCoder Academy" },
      {
        name: "description",
        content:
          "Ficha de decisão contextual: necessidade, decisão, motivo, alternativa descartada, evidência disponível e próxima verificação. Autodeclaração, nunca prova.",
      },
      {
        property: "og:title",
        content: "Meu app — registro de decisão — VibeCoder Academy",
      },
      {
        property: "og:description",
        content:
          "Registre decisões do seu projeto com contexto — e o que não se aplica, como conclusão legítima.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DecisionRecordPage,
});

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });

function ConceptSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Conceito vinculado (opcional)"
      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
    >
      <option value="">Sem conceito vinculado</option>
      {CONCEPTS.map((c) => (
        <option key={c.id} value={String(c.id)}>
          #{c.id} {c.name}
        </option>
      ))}
    </select>
  );
}

function DecisionForm() {
  const { addDecision } = useDecisions();
  const [need, setNeed] = useState("");
  const [decision, setDecision] = useState("");
  const [rationale, setRationale] = useState("");
  const [rejected, setRejected] = useState("");
  const [evidence, setEvidence] = useState("");
  const [nextCheck, setNextCheck] = useState("");
  const [conceptId, setConceptId] = useState("");
  const [notApplicable, setNotApplicable] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const canSave = buildDecision(
    {
      need,
      decision,
      rationale,
      notApplicable,
      ...(conceptId ? { conceptId: Number(conceptId) } : {}),
    },
    "preview",
  ) !== null;

  const save = () => {
    const created = addDecision({
      need,
      decision,
      rationale,
      notApplicable,
      ...(conceptId ? { conceptId: Number(conceptId) } : {}),
      ...(rejected.trim() ? { rejectedAlternative: rejected.trim() } : {}),
      ...(evidence.trim() ? { evidenceNote: evidence.trim() } : {}),
      ...(nextCheck.trim() ? { nextCheck: nextCheck.trim() } : {}),
    });
    if (created) {
      setSaved(notApplicable ? "não se aplica" : created.decision);
      setNeed("");
      setDecision("");
      setRationale("");
      setRejected("");
      setEvidence("");
      setNextCheck("");
      setConceptId("");
      setNotApplicable(false);
    }
  };

  return (
    <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
      <h2 className="mb-1 flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
        <BadgeCheck className="size-4 text-primary" /> Nova ficha de decisão
      </h2>
      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
        Reflexão, nunca certificação: registrar aqui diz "decidi com este
        contexto" — não prova domínio. "Não se aplica" é conclusão legítima.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2 text-sm">
          <span className="mb-1 block font-semibold text-foreground">Necessidade no meu app</span>
          <input
            type="text"
            value={need}
            onChange={(e) => setNeed(e.target.value)}
            placeholder="O que o app precisava resolver"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </label>
        {notApplicable ? (
          <p className="sm:col-span-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
            Conclusão: <strong>não se aplica ao meu app</strong> — explique o porquê no motivo.
          </p>
        ) : (
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Decisão</span>
            <input
              type="text"
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              placeholder="O que foi decidido"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </label>
        )}
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Motivo</span>
          <input
            type="text"
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder={notApplicable ? "Por que não se aplica" : "Por que esta decisão"}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Alternativa descartada (opcional)</span>
          <input
            type="text"
            value={rejected}
            onChange={(e) => setRejected(e.target.value)}
            placeholder="O que ficou de fora, e por quê"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Evidência disponível (opcional)</span>
          <input
            type="text"
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder="O que sustenta a decisão hoje — honesto"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Próxima verificação (opcional)</span>
          <input
            type="text"
            value={nextCheck}
            onChange={(e) => setNextCheck(e.target.value)}
            placeholder="Quando/como rechecar a decisão"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block font-semibold text-foreground">Conceito vinculado (opcional)</span>
          <ConceptSelect value={conceptId} onChange={setConceptId} />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-testid="save-decision"
          onClick={save}
          disabled={!canSave}
          className="inline-flex rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {notApplicable ? "Registrar “não se aplica”" : "Registrar decisão"}
        </button>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={notApplicable}
            onChange={(e) => setNotApplicable(e.target.checked)}
            aria-label="Concluir como não se aplica"
          />
          este mecanismo não se aplica ao meu app
        </label>
        {saved ? (
          <span data-testid="decision-saved" className="text-xs font-semibold text-success">
            Registrada: {saved}
          </span>
        ) : null}
      </div>
    </section>
  );
}

function DecisionCard({ record, inRoute }: { record: import("@/lib/decisions").DecisionRecord; inRoute: boolean }) {
  const concept = record.conceptId !== undefined ? CONCEPTS.find((c) => c.id === record.conceptId) : undefined;
  return (
    <li
      data-testid="decision-card"
      className={
        "rounded-xl border p-4 " +
        (record.notApplicable
          ? "border-warning/40 bg-warning/5"
          : "border-border/60 bg-card/50")
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">{record.need}</span>
        <span className="flex items-center gap-2">
          {inRoute ? (
            <span className="rounded bg-info/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-info">
              percurso do objetivo
            </span>
          ) : null}
          {record.notApplicable ? (
            <span className="flex items-center gap-1 rounded bg-warning/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-foreground">
              <CircleOff className="size-3" /> não se aplica
            </span>
          ) : null}
          <span className="font-mono text-[11px] text-muted-foreground">{formatDate(record.createdAt)}</span>
        </span>
      </div>
      {record.decision ? (
        <p className="mt-2 text-sm text-foreground/90">
          <span className="font-semibold">Decisão:</span> {record.decision}
        </p>
      ) : null}
      <p className="mt-1 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">Motivo:</span> {record.rationale}
      </p>
      {record.rejectedAlternative ? (
        <p className="mt-1 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Descartada:</span> {record.rejectedAlternative}
        </p>
      ) : null}
      {record.evidenceNote ? (
        <p className="mt-1 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Evidência:</span> {record.evidenceNote}
        </p>
      ) : null}
      {record.nextCheck ? (
        <p className="mt-1 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Próxima verificação:</span> {record.nextCheck}
        </p>
      ) : null}
      {concept ? (
        <Link
          to="/concepts/$id"
          params={{ id: String(concept.id) }}
          search={{}}
          className="mt-2 inline-block text-xs font-semibold text-primary underline-offset-2 hover:underline"
        >
          #{concept.id} {concept.name}
        </Link>
      ) : null}
    </li>
  );
}

function LegacyList() {
  const { learning } = useLearning();
  const entries = useMemo(
    () =>
      Object.entries(learning.application)
        .map(([id, rec]) => legacyDeclarationView(Number(id), rec))
        .sort((a, b) => b.ts - a.ts),
    [learning.application],
  );
  if (entries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Nenhuma declaração do checklist antigo neste dispositivo — as fichas de
        decisão acima são o registro vivo.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {entries.map((v: LegacyDeclarationView) => {
        const concept = CONCEPTS.find((c) => c.id === v.conceptId);
        return (
          <li key={v.conceptId} data-testid="legacy-declaration" className="rounded-xl border border-border/60 bg-card/40 p-3 text-xs">
            <p className="flex flex-wrap items-center justify-between gap-2">
              <Link
                to="/concepts/$id"
                params={{ id: String(v.conceptId) }}
                search={{}}
                className="font-semibold text-foreground underline-offset-2 hover:underline"
              >
                #{v.conceptId} {concept?.name ?? ""}
              </Link>
              {v.nA ? (
                <span className="rounded bg-warning/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-foreground">
                  não se aplica
                </span>
              ) : (
                <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  declarado
                </span>
              )}
            </p>
            {v.note ? <p className="mt-1 text-muted-foreground">{v.note}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}

function DecisionRecordPage() {
  const { decisions } = useDecisions();
  const { learning } = useLearning();
  const routeIds = useMemo(
    () => objectiveRouteConceptIds(learning.objective?.goal),
    [learning.objective?.goal],
  );
  const ordered = useMemo(
    () => orderDecisionsByRelevance(decisions.records, routeIds),
    [decisions.records, routeIds],
  );
  const inRoute = new Set(routeIds);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-10 sm:px-6">
      <header>
        <h1 className="font-serif text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Meu app — registro de decisão
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Decisões do seu projeto com contexto: necessidade, decisão, motivo,
          alternativa descartada, evidência disponível e próxima verificação.
          Autodeclaração — nunca contada como domínio.
        </p>
      </header>

      <div className="flex items-start gap-2 rounded-xl border border-accent-2/30 bg-accent-2/10 p-3 text-xs leading-relaxed text-foreground/90">
        <Info className="mt-0.5 size-4 shrink-0 text-info" />
        <span>
          Nada aqui é marcado “implementado” como prova: o registro é reflexão.
          A evidência de aprendizagem vive em{" "}
          <Link to="/progress" className="font-semibold text-info underline-offset-2 hover:underline">
            Progresso
          </Link>
          . Declarações do checklist antigo ficam preservadas abaixo, com
          significado histórico.
        </span>
      </div>

      <DecisionForm />

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
          <BadgeCheck className="size-4 text-primary" /> Fichas registradas
        </h2>
        {ordered.length === 0 ? (
          <div className="rounded-2xl border border-border/70 bg-card/40 p-5">
            <p className="text-sm text-muted-foreground">
              Nenhuma ficha ainda. Registre a primeira decisão — ou conclua
              honestamente que algo não se aplica.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {ordered.map((r) => (
              <DecisionCard key={r.id} record={r} inRoute={inRoute.has(r.conceptId ?? -1)} />
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Ordenadas por relevância para o objetivo declarado
          {learning.objective ? ` (“${learning.objective.goal}”)` : " — nenhum objetivo definido ainda"}
          , depois por recência.
        </p>
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
          <ScrollText className="size-4 text-primary" /> Declarações do checklist antigo
        </h2>
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
          Preservadas 1:1 com significado histórico — autodeclaração do
          checklist anterior, nunca reinterpretada como domínio. Somente leitura;
          o registro vivo são as fichas acima.
        </p>
        <LegacyList />
      </section>
    </div>
  );
}
