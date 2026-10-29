// Aula em três modos (F3 / PRD §9.6): guiada, consulta e prática, com estado
// na URL. O fechamento (síntese derivada) aparece em todos os modos; o rodapé
// de provenance permanece honesto.

import { useEffect } from "react";
import type { Lesson } from "@/lib/lessons/types";
import { useLearning } from "@/hooks/use-learning";
import { ModeSwitch, type LessonMode } from "./mode-switch";
import { GuidedLesson } from "./lesson-guided";
import { ReferenceLesson } from "./lesson-reference";
import { PracticeLesson } from "./lesson-practice";
import { SynthesisBlock } from "./synthesis-block";

export type { LessonMode };

export function LessonView({
  lesson,
  conceptId,
  mode,
}: {
  lesson: Lesson;
  conceptId: number;
  mode: LessonMode;
}) {
  const { markContact } = useLearning();
  useEffect(() => {
    markContact(conceptId);
  }, [conceptId, markContact]);

  return (
    <div className="mt-6 space-y-0">
      <ModeSwitch conceptId={conceptId} mode={mode} />

      {mode === "reference" ? (
        <ReferenceLesson lesson={lesson} conceptId={conceptId} />
      ) : mode === "practice" ? (
        <PracticeLesson lesson={lesson} conceptId={conceptId} />
      ) : (
        <GuidedLesson lesson={lesson} />
      )}

      <SynthesisBlock lesson={lesson} />

      <p className="mb-8 text-xs leading-relaxed text-muted-foreground">
        Status editorial: {lesson.provenance.reviewed ? "revisado" : "ainda sem revisão independente"}.{" "}
        {lesson.provenance.notes}
      </p>
    </div>
  );
}
