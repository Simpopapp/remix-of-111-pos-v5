// Motivos editoriais dos pré-requisitos (F3 / PRD §14.4: ficha com nome,
// motivo e retomada curta). O contrato Lesson traz apenas prereqIds; o motivo
// por par (lição, pré-requisito) vive aqui na camada editorial de lições.
// Par sem motivo aqui é lacuna editorial: denunciada pelo teste de cobertura
// em lesson-modes.test.ts, nunca fingida na UI (fallback honesto).

import type { Lesson } from "./types";
import { getConcept } from "@/lib/concepts";

export const PREREQ_MOTIVES: Record<string, string> = {
  "5:1": "A política de borda que nega por volume é o contraste central: esta lição separa limite de taxa de autorização e rastreia onde a negativa para.",
  "5:4": "Localizar onde o pedido foi negado exige saber quem está na frente do serviço antes de abrir a política.",
  "10:11": "O breaker conta chamadas pendentes; sem tempo-limite uma chamada nunca termina e o estado não transita.",
  "12:11": "Repetir só é decidível com o tempo restante conhecido — o orçamento que limita cada tentativa vem dos timeouts.",
  "12:14": "Repetir só é seguro quando repetir não muda o resultado; idempotência é o que separa retry seguro de duplicação.",
  "13:11": "O atraso calculado precisa caber no tempo-limite que resta; sem deadline a espera pode consumir a tentativa.",
  "13:12": "A classificação da falha decide se há repetição a agendar — sem ela o cálculo de atraso não tem entrada.",
  "15:11": "Trabalho que nunca termina é exatamente o que a fila acumula; a predição de trabalho não concluído parte daí.",
  "16:15": "Pub/sub é contrastado com a fila: obrigações de entrega por assinante contra tentativas de entrega.",
  "17:15": "Separar o fato de negócio commitado das reações posteriores usa o desacoplamento que a fila fornece.",
  "17:16": "As reações posteriores alcançam vários interessados; o mecanismo dessa entrega é o pub/sub.",
  "20:15": "A contagem de tentativas pertence ao pipeline de entrega da fila; é nele que o esgotamento aparece.",
  "20:12": "Tentativas esgotadas são a política de retry levada ao limite — distinguir esgotamento de veneno exige a política.",
  "44:15": "Backlog é a medida da fila; admitir ou rejeitar depende de ler o trabalho não concluído antes de prometer mais capacidade.",
  "60:58": "trace_id só orienta sobre uma base de monitoramento que já diz o que observar e onde.",
  "61:58": "O vocabulário do que medir vem da prática anterior de monitorar sinais e reagir a eles.",
  "63:58": "O SLI é escolhido entre sinais que o monitoramento já coleta; sem eles a escolha é arbitrária.",
  "63:61": "Counter, rate, gauge e histograma são os tipos entre os quais o SLI é definido e agregado.",
  "109:58": "A linha do tempo do incidente é montada com os sinais de monitoramento captados durante a resposta.",
  "109:60": "Causas concorrentes são separadas com evidência de tracing: quem chamou quem, quando e com quê.",
  "109:61": "O impacto e a recuperação do incidente são quantificados com métricas, não com impressões.",
  "109:63": "A verificação da mitigação consulta o orçamento de erro: sem SLO não há critério de término.",
  "111:109": "O postmortem herda a linha do tempo e a verificação construídas na resposta ao incidente.",
};

export interface PrereqCard {
  id: number;
  /** Nome canônico do conceito — nunca o número sozinho (§14.4). */
  name: string;
  /** Por que esta lição o pressupõe; undefined = lacuna editorial honesta. */
  motive?: string | undefined;
  /** Retomada curta derivada da primeira frase do ELI10 do conceito. */
  retake: string;
}

function shortRetake(prereqId: number): string {
  const concept = getConcept(prereqId);
  if (!concept) return "";
  const firstSentence = concept.eli.split(/(?<=[.!?])\s+/)[0];
  return (firstSentence ?? concept.eli).trim();
}

/** Fichas de pré-requisito da lição, na ordem declarada. */
export function getPrereqCards(lesson: Lesson): PrereqCard[] {
  return lesson.prereqIds.map((id) => {
    const concept = getConcept(id);
    if (!concept) {
      throw new Error(`lesson ${lesson.id}: prereq ${id} não é um conceito canônico`);
    }
    return {
      id,
      name: concept.name,
      motive: PREREQ_MOTIVES[`${lesson.id}:${id}`],
      retake: shortRetake(id),
    };
  });
}
