// Timeline dedicada (F3 / D5): render próprio para o kind "timeline" das
// lições. Suporta as duas formas editoriais em uso: segmentos contínuos
// [start,end] (linha de orçamento com deadline) e teto/amostra (backoff: o
// teto cresce, a amostra não precisa crescer). As barras são decorativas
// (aria-hidden) e cada evento tem linha textual equivalente — nada só no
// desenho.

import { useId } from "react";
import type { RepresentationSpec } from "@/lib/lessons/types";

export interface TimelineData {
  unit: string;
  note: string;
  events: {
    label: string;
    /** Segmento contínuo [start, end] — linha de orçamento. */
    start?: number;
    end?: number;
    /** Teto da espera (backoff). */
    ceiling?: number;
    /** Amostra observada dentro do teto (backoff). */
    sampledWait?: number;
  }[];
  /** Momento final que o orçamento não pode exceder. */
  deadline?: number;
  /** Fórmula declarada do teto, quando houver. */
  formula?: string;
  /** Política de amostragem declarada, quando houver. */
  jitter?: string;
}

export type { TimelineData as TimelineInstrumentData };

export function TimelineInstrument({ spec }: { spec: RepresentationSpec }) {
  const titleId = useId();
  const data = spec.data as unknown as TimelineData;

  const scaleMax = Math.max(
    1,
    ...data.events.map((e) =>
      Math.max(e.end ?? 0, e.ceiling ?? 0, e.sampledWait ?? 0),
    ),
    data.deadline ?? 0,
  );
  const pct = (v: number) => (v / scaleMax) * 100;

  return (
    <figure aria-labelledby={titleId} className="min-w-0 space-y-4 text-foreground">
      <figcaption id={titleId} className="text-sm font-semibold break-words">
        Timeline — {spec.caption}
      </figcaption>

      <p className="text-xs text-muted-foreground">
        Scale ({data.unit}): 0 → {scaleMax}. Bars show declared intervals and
        ceilings; the numbers under each event are the exact values.
      </p>

      {typeof data.deadline === "number" ? (
        <div className="space-y-1">
          <div aria-hidden="true" className="relative h-3 rounded border border-border">
            <span
              className="absolute inset-y-0 border-l-2 border-destructive"
              style={{ left: `${pct(data.deadline)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Deadline mark: {data.deadline} {data.unit}.
          </p>
        </div>
      ) : null}

      <div className="space-y-4">
        {data.events.map((event, i) => {
          const isSegment =
            typeof event.start === "number" && typeof event.end === "number";
          const isCeiling =
            typeof event.ceiling === "number" &&
            typeof event.sampledWait === "number";
          return (
            <div key={i} className="min-w-0">
              <p className="mb-1 text-sm font-semibold break-words">{event.label}</p>
              <div aria-hidden="true" className="relative h-4 rounded bg-muted">
                {isSegment ? (
                  <div
                    className="absolute inset-y-0 rounded bg-primary/70"
                    style={{
                      left: `${pct(event.start ?? 0)}%`,
                      width: `${pct((event.end ?? 0) - (event.start ?? 0))}%`,
                    }}
                  />
                ) : null}
                {isCeiling ? (
                  <>
                    <div
                      className="absolute inset-y-0 rounded border border-primary/40 bg-primary/10"
                      style={{ left: 0, width: `${pct(event.ceiling ?? 0)}%` }}
                    />
                    <div
                      className="absolute inset-y-0 rounded bg-primary/70"
                      style={{ left: 0, width: `${pct(event.sampledWait ?? 0)}%` }}
                    />
                  </>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {isSegment
                  ? `${event.start}–${event.end} ${data.unit}`
                  : isCeiling
                    ? `ceiling ${event.ceiling} ${data.unit} · sampled wait ${event.sampledWait} ${data.unit}`
                    : ""}
              </p>
            </div>
          );
        })}
      </div>

      {typeof data.deadline === "number" ? (
        <p className="text-xs text-muted-foreground">
          Deadline: {data.deadline} {data.unit} (vertical mark). Elapsed time
          reduces what remains — the timeline cannot grant more than the
          budget that is left.
        </p>
      ) : null}
      {data.formula ? (
        <p className="font-mono text-xs text-muted-foreground">{data.formula}</p>
      ) : null}
      {data.jitter ? (
        <p className="text-xs text-muted-foreground">Sampling: {data.jitter}.</p>
      ) : null}

      <p className="border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground break-words">
        <strong>Model limits:</strong> {data.note}
      </p>
    </figure>
  );
}
