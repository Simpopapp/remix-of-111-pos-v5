// Contrato da bancada unificada (PRD project3 D6, §3/F4, 9.7).
// Lógica da bancada é pura; componentes apenas renderizam o estado retornado.
// Os simuladores continuam em simulators.ts (contrato de testes intacto).

import type { SandboxId } from "./simulators";

// ---------- Parâmetros rotulados ----------

export interface BenchParamSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
  /** O que o controle faz e qual é o limite dele. */
  hint: string;
}

export interface BenchToggleSpec {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  default: string;
  /** O que a escolha muda — e o que ela NÃO muda. */
  hint: string;
}

export type BenchParamValues = Record<string, number>;
export type BenchToggleValues = Record<string, string>;

/** Configuração rotulada de uma execução (9.7: config com rótulo explícito). */
export interface BenchRunConfig {
  label: string;
  params: BenchParamValues;
  toggles: BenchToggleValues;
}

// ---------- Observação ----------

export interface RunObservation {
  headline: string;
  detail: string[];
  /** Caso fora do modelo: nomeado com o limite, nunca fingido. */
  outOfModel?: string;
}

export interface Attempt {
  /** Nº da execução — execução identificável (D6). */
  n: number;
  config: BenchRunConfig;
  at: string;
  observation: RunObservation;
}

// ---------- Estados da bancada (D6 / §15) ----------

export type BenchState =
  | "no-run" // sem execução
  | "invalid-param" // parâmetro inválido
  | "partial" // parcial (previsão ou interpretação pendente)
  | "paused" // pausa
  | "out-of-model" // fora do modelo
  | "ready"; // evidência suficiente

// ---------- Validação ----------

export type ParamErrors = Record<string, string>;

export function validateParams(
  specs: BenchParamSpec[],
  values: BenchParamValues,
): ParamErrors | null {
  const errors: ParamErrors = {};
  for (const spec of specs) {
    const v = values[spec.key];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      errors[spec.key] = `${spec.label}: informe um valor`;
      continue;
    }
    if (v < spec.min || v > spec.max) {
      errors[spec.key] = `${spec.label}: ${v} está fora do intervalo (${spec.min}–${spec.max}${spec.unit ? " " + spec.unit : ""})`;
    }
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

/** Rótulo legível da configuração — o mesmo texto entra no registro e no relatório. */
export function formatConfig(
  specs: BenchParamSpec[],
  toggleSpecs: BenchToggleSpec[],
  values: BenchParamValues,
  toggles: BenchToggleValues,
): string {
  const parts: string[] = [];
  for (const spec of specs) {
    const v = values[spec.key];
    const unit = spec.unit ? ` ${spec.unit}` : "";
    const short = spec.label.toLowerCase();
    parts.push(`${short} ${v}${unit}`);
  }
  for (const spec of toggleSpecs) {
    const opt = spec.options.find((o) => o.value === toggles[spec.key]);
    parts.push(`${spec.label.toLowerCase()}: ${opt ? opt.label.toLowerCase() : "?"}`);
  }
  return parts.join(" · ");
}

export function defaultParamValues(specs: BenchParamSpec[]): BenchParamValues {
  const out: BenchParamValues = {};
  for (const spec of specs) out[spec.key] = spec.default;
  return out;
}

export function defaultToggleValues(specs: BenchToggleSpec[]): BenchToggleValues {
  const out: BenchToggleValues = {};
  for (const spec of specs) out[spec.key] = spec.default;
  return out;
}

/** Mesma configuração? (rótulo é comparado campo a campo, não por string.) */
export function sameConfig(a: BenchRunConfig, b: BenchRunConfig): boolean {
  return (
    a.label === b.label &&
    JSON.stringify(a.params) === JSON.stringify(b.params) &&
    JSON.stringify(a.toggles) === JSON.stringify(b.toggles)
  );
}

// ---------- Relatório de experimento (9.7 / D6) ----------

export interface ExperimentReport {
  id: string;
  labId: SandboxId;
  /** Previsão pedida antes da execução (D6). */
  hypothesis: string;
  /** Configuração rotulada (e a anterior, quando a comparação tem A/B). */
  config: BenchRunConfig;
  previousConfig?: BenchRunConfig;
  observation: string;
  interpretation: string;
  /** Veredito é opcional: nem todo experimento fecha um veredito. */
  verdict?: string;
  createdAt: string;
}

export type ReportReadiness =
  | { state: "ready" }
  | { state: "blocked"; reason: string };

/**
 * Quando o relatório pode ser registrado. Sem evidência suficiente o
 * relatório é BLOQUEADO com motivo — nunca salvo parcial como válido (§5.4).
 */
export function reportReadiness(input: {
  attempts: Attempt[];
  hypothesis: string;
  interpretation: string;
}): ReportReadiness {
  if (input.attempts.length === 0) {
    return { state: "blocked", reason: "Ainda sem evidência: execute o experimento primeiro." };
  }
  if (input.hypothesis.trim().length === 0) {
    return { state: "blocked", reason: "Previsão faltando: escreva o que você espera antes de executar." };
  }
  if (input.interpretation.trim().length === 0) {
    return { state: "blocked", reason: "Interpretação faltando: escreva o que a evidência mostra." };
  }
  return { state: "ready" };
}

// ---------- Catálogo (F4: fenômeno, controles, competência, limites) ----------

export interface LabCatalogEntry {
  /** O fenômeno que o laboratório torna observável. */
  phenomenon: string;
  /** Controles reais disponíveis na bancada. */
  controls: string[];
  /** Competência que a bancada sustenta (o que dá para demonstrar). */
  competence: string;
  /** O que o laboratório NÃO demonstra — limites honestos. */
  limits: string[];
}

export const LAB_CATALOG: Record<SandboxId, LabCatalogEntry> = {
  ratelimit: {
    phenomenon:
      "O limitador conta tokens, não requisições: rajadas dentro da capacidade passam, enquanto um fluxo mais rápido que o reabastecimento esvazia o balde.",
    controls: [
      "Capacidade do balde (1–10 tokens)",
      "Intervalo de reabastecimento (0,25–3 s)",
      "Escopo: por cliente ou balde global compartilhado",
      "Ações: uma requisição de cada cliente, ou rajada de 5",
    ],
    competence:
      "Apontar o momento em que os 429 começam, separar uma rajada aceitável de um fluxo sustentado e comparar por-IP contra escopo global com o mesmo tráfego.",
    limits: [
      "Sem políticas adaptativas ou de cota — apenas token bucket",
      "Limitadores distribuídos (vários nós compartilhando estado) não são modelados",
    ],
  },
  circuit: {
    phenomenon:
      "O disjuntor abre após falhas repetidas para o chamador falhar rápido em vez de esperar por uma dependência morta.",
    controls: [
      "Limite de falhas (1–5 falhas consecutivas)",
      "Tempo de espera antes de sondar (1–10 s)",
      "Proteção ligada/desligada na mesma sequência de chamadas",
      "Ações: chamar a API, injetar queda, restaurar",
    ],
    competence:
      "Acompanhar cada transição de estado com o gatilho dela, e comparar a mesma sequência de chamadas com e sem proteção.",
    limits: [
      "Um chamador e uma dependência — sem bulkheads nem árvores de fallback",
      "Sondas half-open são uma por vez; concorrência não é modelada",
    ],
  },
  nplusone: {
    phenomenon:
      "Uma consulta por item multiplica as idas e vindas; agrupar em lote ou usar JOIN as reduz para as mesmas entidades.",
    controls: [
      "Itens no conjunto de dados (5–50)",
      "Custo de ida e volta na rede (5–100 ms)",
      "Estratégia: por item, em lote, ou JOIN",
    ],
    competence:
      "Contar consultas, linhas e custo total para as mesmas entidades identificáveis antes e depois de mudar a estratégia.",
    limits: [
      "Sem cache, sem coalescência estilo DataLoader, sem réplicas de leitura",
      "O custo é um modelo didático, não um benchmark",
    ],
  },
  sqli: {
    phenomenon:
      "A concatenação de strings deixa a entrada virar código; uma consulta parametrizada mantém dado como dado.",
    controls: [
      "Campo de usuário (experimente os usuários de demo ou a sua própria string)",
      "Estilo de consulta: concatenada vs parametrizada",
    ],
    competence:
      "Ler a consulta, a entrada, os parâmetros e o resultado no mesmo campo, e dizer por que o ataque curto-circuitou.",
    limits: [
      "Apenas injeção clássica em uma consulta — sem injeção de segunda ordem, sem XSS, sem camada de WAF",
      "A tabela de usuários é um cenário didático, não um banco de dados real",
    ],
  },
  pubsub: {
    phenomenon:
      "Consumidores concorrentes e fan-out são estruturas diferentes: o formato de entrega decide quem recebe cada evento e o que uma falha causa.",
    controls: [
      "Modo: consumidores concorrentes vs fan-out",
      "Workers/assinantes (1–5)",
      "Tipo de falha: nenhuma, transitória, venenosa, consumidor lento",
      "Ações: publicar eventos, avançar a fila, pausar/retomar",
    ],
    competence:
      "Rastrear um evento do publish até o ack ou a dead-letter, e ler a DLQ como consequência da política de re tentativa.",
    limits: [
      "Entrega at-least-once apenas; exactly-once e garantias de ordenação ficam fora do escopo",
      "Falhas em fan-out são por assinante; semânticas de assinatura compartilhada são diferentes",
    ],
  },
  tail: {
    phenomenon:
      "Os percentis expõem a cauda lenta que as médias escondem: a maioria das requisições é rápida e as lentas ainda prejudicam usuários reais.",
    controls: [
      "Tamanho da amostra (100–1000 requisições)",
      "Seed (amostra determinística)",
    ],
    competence:
      "Ler o histograma com unidades e tamanho de amostra, localizar o marcador de p99 e explicar por que um outlier desloca o p99 muito mais que o p50.",
    limits: [
      "As latências vêm de um modelo didático, nunca de um benchmark real",
      "Sem percentis além do p99.9, sem detalhamento por endpoint",
    ],
  },
};
