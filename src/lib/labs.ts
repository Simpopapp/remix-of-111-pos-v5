import { percentile, simulateLatencies, type SandboxId } from "@/lib/simulators";
import type { RequestFlowData, StateMachineData, HistogramData } from "@/components/instruments";

/**
 * Bancada completa dos 6 laboratórios focados (PRD project2 F3 / s4-bancadas).
 * Estrutura por bancada: cenário → controles → representação → evidência →
 * interpretação → desafio. Dados dos instrumentos seguem os contratos D6
 * (seção 15 do PRD); são material de ilustração inicial, rotulado como tal.
 */
export interface LabBench {
  id: SandboxId;
  title: string;
  scenario: { system: string; data: string; symptom: string; baseline: string };
  instrument: {
    kind: "request-flow" | "state-machine" | "latency-histogram";
    data: RequestFlowData | StateMachineData | HistogramData;
    caption: string;
    textEquivalent: string;
  };
  /** O que o aluno deve conseguir apontar antes de ler a resposta. */
  evidence: string[];
  interpretation: string;
  challenge: string;
}

const tailSample = [...simulateLatencies(100, 42)].sort((a, b) => a - b);

function binsFor(sample: number[]): HistogramData["bins"] {
  const edges = [400, 800, 1200, 2000, 4000, 11000];
  const bins: HistogramData["bins"] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    bins.push({
      from: edges[i]!,
      to: edges[i + 1]!,
      count: sample.filter((v) => v >= edges[i]! && v < edges[i + 1]!).length,
    });
  }
  return bins;
}

export const LABS: Record<SandboxId, LabBench> = {
  ratelimit: {
    id: "ratelimit",
    title: "Rate Limiting",
    scenario: {
      system: "API pública atrás de um gateway de borda, uma instância do limitador por IP.",
      data: "Token bucket: capacidade 5, reabastece 1 token a cada 1,5 s, escopo por IP.",
      symptom: "Uma rajada de cliques passa; um loop sustentado de retentativas leva a 429.",
      baseline: "Com tokens disponíveis, toda requisição é aceita e encaminhada.",
    },
    instrument: {
      kind: "request-flow",
      caption:
        "Observe para onde cada requisição foi: consumiu um token e chegou ao serviço, ou foi rejeitada na borda com um 429.",
      data: {
        nodes: [
          { id: "client", label: "Cliente", kind: "client" },
          { id: "edge", label: "Rate limiter (borda)", kind: "edge" },
          { id: "service", label: "Serviço da API", kind: "service" },
          { id: "store", label: "Banco de dados", kind: "store" },
        ],
        edges: [
          { from: "client", to: "edge", label: "GET /api/v1/data" },
          { from: "edge", to: "service", label: "encaminha — 1 token consumido" },
          { from: "edge", to: "client", label: "429 Too Many Requests" },
        ],
        window: [
          { ts: "12:00:00.000", accepted: 1, rejected: 0, destination: "serviço" },
          { ts: "12:00:00.120", accepted: 1, rejected: 0, destination: "service" },
          { ts: "12:00:00.260", accepted: 1, rejected: 1, destination: "cliente" },
          { ts: "12:00:00.400", accepted: 0, rejected: 2, destination: "client" },
        ],
        limits: [{ kind: "token-bucket", capacity: 5, refillMs: 1500, scope: "ip" }],
      },
      textEquivalent:
        "4 requisições em 400 ms: 3 aceitas e encaminhadas ao serviço, 2 rejeitadas com 429 na borda. Limite: token bucket, capacidade 5, reabastecimento 1/1,5 s, escopo por IP.",
    },
    evidence: [
      "Aponte o momento em que os 429 começam e nomeie o que se esgotou (tokens, não requisições).",
      "Separe uma rajada aceitável (os tokens cobrem) de um fluxo sustentado que o balde não consegue reabastecer.",
    ],
    interpretation:
      "O limitador não conta requisições — conta tokens. Uma rajada dentro da capacidade passa; um fluxo mais rápido que o reabastecimento esvazia o balde e leva 429. O escopo decide quem está sendo limitado: por-IP significa aqui que um cliente barulhento não mata os outros.",
    challenge:
      "A mesma taxa de tráfego movida para um limite global (compartilhado): quem é limitado agora, e por que isso muda quem é prejudicado?",
  },
  circuit: {
    id: "circuit",
    title: "Circuit Breaker",
    scenario: {
      system: "Serviço de checkout chamando um provedor de pagamento lento e indisponível.",
      data: "Disjuntor: abre após 3 falhas consecutivas, cooldown de 5 s, 1 sonda half-open.",
      symptom: "Toda chamada espera o timeout completo enquanto o provedor está fora.",
      baseline: "Em CLOSED o disjuntor é invisível; as requisições fluem normalmente.",
    },
    instrument: {
      kind: "state-machine",
      caption:
        "Acompanhe os estados e nomeie o gatilho de cada transição — nada muda de estado sem uma causa explícita.",
      data: {
        states: [
          { id: "closed", label: "CLOSED — chamadas normais", tone: "ok" },
          { id: "open", label: "OPEN — falhando rápido", tone: "down" },
          { id: "half-open", label: "HALF-OPEN — sondando", tone: "warn" },
        ],
        transitions: [
          { from: "closed", to: "open", trigger: "3 falhas consecutivas" },
          { from: "open", to: "half-open", trigger: "cooldown esgotado (5 s)" },
          { from: "half-open", to: "closed", trigger: "sonda funciona" },
          { from: "half-open", to: "open", trigger: "sonda falha" },
        ],
        now: "closed",
        history: [
          { ts: 0, event: "chamada OK", from: "closed" },
          { ts: 1, event: "falha 1/3", from: "closed" },
          { ts: 2, event: "falha 2/3", from: "closed" },
          { ts: 3, event: "falha 3/3 → OPEN", from: "closed", to: "open" },
        ],
        budget: { label: "cooldown", ms: 5000 },
      },
      textEquivalent:
        "Estados: CLOSED (normal), OPEN (falhando rápido), HALF-OPEN (sondando). Transições: 3 falhas consecutivas → OPEN; cooldown de 5 s esgotado → HALF-OPEN; sonda funciona → CLOSED; sonda falha → OPEN de novo.",
    },
    evidence: [
      "Nomeie o gatilho de cada transição na bancada (3 falhas, cooldown, resultado da sonda).",
      "Explique o que o chamador sente em OPEN versus CLOSED.",
    ],
    interpretation:
      "O disjuntor troca a espera por uma falha rápida e conhecida. Em OPEN o chamador recebe um erro imediato em vez de um timeout de 10 s — isso protege as threads do chamador e dá tempo ao serviço de baixo para se recuperar. HALF-OPEN é o experimento controlado: exatamente uma sonda decide se volta a fechar.",
    challenge:
      "Por que uma única sonda bem-sucedida fecha o disjuntor em vez de, digamos, cinco? O que essa escolha assume sobre o serviço de baixo?",
  },
  nplusone: {
    id: "nplusone",
    title: "N+1 Visualizer",
    scenario: {
      system: "Página de lista de usuários que carrega endereços um item por vez.",
      data: "Usuários configuráveis (10/25/50), cardinalidade 1/2/5 endereços por usuário, custo por ida e volta configurável.",
      symptom: "A página fica mais lenta conforme a lista cresce — a latência escala com as linhas, não com as páginas.",
      baseline: "Um JOIN: 1 ida e volta, independentemente do tamanho da lista.",
    },
    instrument: {
      kind: "request-flow",
      caption:
        "Conte as idas e voltas ao banco em cada estratégia. Os mesmos dados, formas de consulta diferentes.",
      data: {
        nodes: [
          { id: "client", label: "Navegador", kind: "client" },
          { id: "app", label: "Servidor da aplicação", kind: "service" },
          { id: "db", label: "Banco de dados", kind: "store" },
        ],
        edges: [
          { from: "client", to: "app", label: "GET /users" },
          { from: "app", to: "db", label: "1 consulta por item (N+1)" },
          { from: "app", to: "db", label: "ou 1 JOIN para tudo" },
        ],
        window: [
          { ts: "12:00:01.000", accepted: 1, rejected: 0, destination: "banco — usuários" },
          { ts: "12:00:01.010", accepted: 25, rejected: 0, destination: "banco — um por usuário" },
        ],
      },
      textEquivalent:
        "Por item: 1 + N consultas ao banco. Lote: consultas agrupadas por IN (...). JOIN: uma única consulta devolve usuários com seus endereços. A latência segue idas e voltas × custo, rotulada como modelo didático.",
    },
    evidence: [
      "Mostre que por item executa usuários+1 consultas para toda cardinalidade.",
      "Mostre que lote e JOIN cortam a contagem sem tocar nos dados.",
    ],
    interpretation:
      "O custo dominante são as idas e voltas, não as linhas — por isso menos consultas vence. Mas 'menos consultas' não é automaticamente 'mais rápido': um JOIN numa página que a UI descarta, ou uma lista IN () tão grande que vence os índices, pode ser pior. Separe as duas afirmações.",
    challenge:
      "Com cardinalidade 5 e 50 usuários, qual estratégia vence se cada ida e volta custar 2 ms em vez de 12 ms? Quando a resposta inverte?",
  },
  sqli: {
    id: "sqli",
    title: "SQL Injection",
    scenario: {
      system: "Formulário de login que monta SQL a partir da entrada bruta do usuário.",
      data: "Tabela de demo fixa: alice, O'Brien, bob, carol — verificação de senha inline.",
      symptom: "Um usuário especialmente construído devolve todos os usuários, sem a senha.",
      baseline: "O modo parametrizado trata a entrada como um valor opaco único.",
    },
    instrument: {
      kind: "request-flow",
      caption:
        "Observe a entrada mudar de papel: dado no modo parametrizado, código no modo concatenação.",
      data: {
        nodes: [
          { id: "client", label: "Formulário de login", kind: "client" },
          { id: "app", label: "App server", kind: "service" },
          { id: "db", label: "Database", kind: "store" },
        ],
        edges: [
          { from: "client", to: "app", label: "campo de usuário" },
          { from: "app", to: "db", label: "SQL concatenado (código)" },
          { from: "app", to: "db", label: "parâmetro vinculado (dado)" },
        ],
        window: [
          { ts: "12:00:01.000", accepted: 1, rejected: 0, destination: "banco — busca literal" },
          { ts: "12:00:01.050", accepted: 1, rejected: 0, destination: "banco — bypass" },
        ],
      },
      textEquivalent:
        "Dois caminhos até o banco: a concatenação põe o texto do usuário dentro do texto SQL (código) e deixa as aspas reescreverem a cláusula; a parametrização envia o mesmo texto como valor (dado). Entradas fora do modelo recebem 'fora do modelo', não um veredito falso.",
    },
    evidence: [
      "Explique a leitura de precedência de user='x' OR '1'='1' AND pass='secret' (o AND tem precedência).",
      "Mostre que o modo parametrizado ainda pode devolver linhas — quando o valor está literalmente correto.",
    ],
    interpretation:
      "Injeção é um bug de aspas: a fronteira entre código e dado desaparece. Consultas parametrizadas a restauram — o valor é transmitido como dado, nunca interpretado como SQL. Note a semântica honesta: uma consulta parametrizada correta PODE logar você (é o trabalho dela); ela apenas não pode ser enganada para mudar a consulta.",
    challenge:
      "Por que a variante com comentário '--' é o bypass confiável, enquanto o payload OR solto depende de como o resto da cláusula foi escrito?",
  },
  pubsub: {
    id: "pubsub",
    title: "Pub/Sub + Queue",
    scenario: {
      system: "Eventos de pedidos publicados numa fila consumida por N workers (ou distribuídos por fan-out a assinantes).",
      data: "Consumidores concorrentes dividem uma fila; fan-out dá a cada assinante a sua própria entrega. Tipos de falha: transitória, venenosa, lenta.",
      symptom: "Confundir 'um worker pegou' com 'todo mundo pegou' — e culpar a mensagem por um worker instável.",
      baseline: "Workers saudáveis confirmam cada entrega; DLQ só depois de esgotar as retentativas.",
    },
    instrument: {
      kind: "request-flow",
      caption:
        "No modo concorrente um worker leva cada evento; no fan-out cada assinante recebe a sua própria cópia e a sua própria falha.",
      data: {
        nodes: [
          { id: "pub", label: "Publisher", kind: "service" },
          { id: "queue", label: "Fila / exchange", kind: "edge" },
          { id: "w0", label: "Worker A", kind: "service" },
          { id: "w1", label: "Worker B", kind: "service" },
          { id: "w2", label: "Worker C", kind: "service" },
          { id: "dlq", label: "Dead Letter Queue", kind: "store" },
        ],
        edges: [
          { from: "pub", to: "queue", label: "publish" },
          { from: "queue", to: "w0", label: "concorrentes: um leva" },
          { from: "queue", to: "w1", label: "fan-out: cada assinante" },
          { from: "w0", to: "dlq", label: "3 tentativas falhadas" },
        ],
        window: [
          { ts: "12:00:01.000", accepted: 1, rejected: 0, destination: "worker A" },
          { ts: "12:00:01.200", accepted: 0, rejected: 1, destination: "DLQ — venenosa" },
        ],
      },
      textEquivalent:
        "Consumidores concorrentes: N workers dividem uma fila, cada evento é processado uma vez. Fan-out: cada assinante recebe todos os eventos, falhas são por assinante. Causas de falha: transitória (retry ajuda), venenosa (retry não ajuda → DLQ), consumidor lento (a fila acumula, sem DLQ).",
    },
    evidence: [
      "Troque o modo e diga quem recebe cada evento (um worker vs cada assinante).",
      "Classifique uma falha: transitória, venenosa ou lenta — e o que o retry faz em cada uma.",
    ],
    interpretation:
      "O modelo de entrega decide a semântica: consumidores concorrentes dão distribuição de trabalho, fan-out dá cópias independentes. 'Venenosa' é uma propriedade da mensagem, nunca de um worker instável — uma falha aleatória que funciona na retentativa era transitória, e re tentar é o correto. Um consumidor lento acumula backlog; isso é backpressure, não dead letters.",
    challenge:
      "Um evento falha 3 vezes seguidas e vai parar na DLQ. Que experimento você faria para decidir se era venenoso ou uma sequência infeliz de falhas transitórias?",
  },
  tail: {
    id: "tail",
    title: "P99 & Tail Latency",
    scenario: {
      system: "Serviço que devolve 100 tempos de requisição por execução.",
      data: "Modelo didático com exatamente uma observação de cauda garantida a cada 100 requisições.",
      symptom: "A média parece boa; os 1% mais lentos esperam 10× mais.",
      baseline: "A distribuição, não um número único, descreve a latência.",
    },
    instrument: {
      kind: "latency-histogram",
      caption:
        "Leia a distribuição: onde a maioria das requisições cai, e onde os marcadores de percentil ficam.",
      data: {
        unit: "ms",
        bins: binsFor(tailSample),
        sample: tailSample,
        markers: [
          { label: "P50", value: percentile(tailSample, 50), convention: "nearest-rank" },
          { label: "P99", value: percentile(tailSample, 99), convention: "nearest-rank" },
        ],
        note: "Modelo didático, não benchmark: exatamente 1 observação de cauda a cada 100 é garantida. Com 100 amostras, o P99.9 é frágil para inferir a população.",
      },
      textEquivalent:
        "Histograma de 100 tempos de requisição em ms: a maioria abaixo de ~1,1 s, algumas entre 1,8–3,3 s, exatamente uma cauda de 7–10,5 s. Marcadores: P50 e P99 por nearest rank. O modelo garante exatamente uma observação de cauda a cada 100 amostras.",
    },
    evidence: [
      "Leia o P99 no histograma e diga qual observação o determina (nearest rank).",
      "Explique o exemplo 99×100 ms + 1×10.000 ms → P99 = 100 ms enquanto o máximo = 10.000 ms.",
    ],
    interpretation:
      "Os percentis são calculados sobre a distribuição: o P99 é o 99º valor da amostra ordenada (nearest rank). O exemplo clássico mostra por que as médias enganam — média de 199 ms, mas a requisição azarada esperou 10.000 ms. E com apenas 100 amostras, o próprio P99 é uma observação: frágil para afirmar propriedades da população.",
    challenge:
      "Sua correção melhora a média em 30% mas o P99 não muda. Qual métrica responde à reclamação do usuário 'a página às vezes trava por 10 segundos'?",
  },
};
