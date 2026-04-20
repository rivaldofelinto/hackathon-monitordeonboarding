/**
 * Parser para 7 pipelines Pipefy paralelos
 * Normaliza dados dos 7 Pipefy para schema unificado
 * Validação FK: codigo_imovel deve existir em properties
 */

export interface PipefyCard {
  id: string;
  title: string;
  current_phase: {
    name: string;
  };
  custom_fields: Array<{
    name: string;
    value: string | null;
  }>;
  due_date?: string;
  created_at: string;
  updated_at: string;
  comments_count?: number;
  attachments_count?: number;
}

export interface NormalizedStage {
  property_id?: number; // FK para properties.id (será resolvido via codigo_imovel)
  codigo_imovel: string; // FK validation
  stage_number: number;
  stage_name: string;
  status: "pending" | "in_progress" | "completed" | "blocked";
  sla_color: "green" | "yellow" | "red";
  due_date?: string; // usado no computeSlaColor
  started_at: string;
  completed_at?: string;
  blocked_reason?: string;
  metadata: {
    pipefy_card_id: string;
    pipeline_name: string;
    comments: number;
    attachments: number;
  };
}

/**
 * Mapeamento dos 7 Pipefy para stage_number (1-23)
 * Exemplo: Pipeline "Documentação" com 4 fases mapeia para stages 1-4
 */
const PIPELINE_STAGE_MAP: Record<string, { start: number; name: string }> = {
  "PIPE 0 - Onboarding proprietário": { start: 1, name: "Onboarding Proprietário" },
  "PIPE 1 - Implantação": { start: 4, name: "Implantação" },
  "PIPE 2 - Adequação": { start: 7, name: "Adequação" },
  "PIPE 3 - Vistorias": { start: 10, name: "Vistorias" },
  "PIPE 4 - Fotos Profissionais": { start: 13, name: "Fotos Profissionais" },
  "PIPE 5 - Criação de Anúncios": { start: 16, name: "Criação de Anúncios" },
  "PIPE 5.1 - Atualização de Anúncios": { start: 20, name: "Atualização de Anúncios" },
};

/**
 * Extrai codigo_imovel do card do Pipefy
 * Procura em custom_fields por "Código Imóvel" ou campo similar
 */
export function extractCodigoImovel(card: PipefyCard): string | null {
  const field = card.custom_fields.find(
    (f) =>
      f.name.toLowerCase().includes("codigo") &&
      f.name.toLowerCase().includes("imovel")
  );
  return field?.value || null;
}

/**
 * Mapeia status Pipefy para status normalizado
 */
export function mapPipefyStatus(
  phaseName: string
): "pending" | "in_progress" | "completed" | "blocked" {
  const lower = phaseName.toLowerCase();
  if (lower.includes("done") || lower.includes("completo")) return "completed";
  if (lower.includes("blocked") || lower.includes("bloqueado")) return "blocked";
  if (lower.includes("in progress") || lower.includes("em andamento"))
    return "in_progress";
  return "pending";
}

/**
 * Computes sla_color for a property record.
 * Used by both the parser (stages table) and nekt-polling (properties metadata).
 * Priority: due_date > started_at
 * - completed → green
 * - due_date: overdue → red | ≤1 dia → yellow | >1 dia → green
 * - sem due_date (fallback): <2 dias → green | 2-5 → yellow | >5 → red
 */
export function computeSlaColor(
  status: string,
  dueDate?: string,
  startedAt?: string
): "green" | "yellow" | "red" {
  if (status === "completed" || status === "done") return "green";

  if (dueDate) {
    const now = new Date();
    const due = new Date(dueDate);
    const daysUntil = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (daysUntil < 0) return "red";
    if (daysUntil <= 1) return "yellow";
    return "green";
  }

  if (startedAt) {
    const now = new Date();
    const started = new Date(startedAt);
    const days = (now.getTime() - started.getTime()) / (1000 * 60 * 60 * 24);
    if (days < 2) return "green";
    if (days < 5) return "yellow";
    return "red";
  }

  return "green";
}

/**
 * Backward-compatible alias for existing callers (tests, etc.).
 * Green: < 2 dias | Yellow: 2-5 dias | Red: > 5 dias
 */
export function calculateSLAColor(
  startedAt: string,
  status: string
): "green" | "yellow" | "red" {
  return computeSlaColor(status, undefined, startedAt);
}

/**
 * Parser principal: converte card Pipefy para stage normalizado
 * Validação FK: retorna null se codigo_imovel não está presente
 */
export function parseCard(
  card: PipefyCard,
  pipelineName: string
): NormalizedStage | null {
  const codigo_imovel = extractCodigoImovel(card);

  // FK Validation: codigo_imovel obrigatório
  if (!codigo_imovel) {
    console.warn(
      `[Parser] Card ${card.id} missing codigo_imovel in custom_fields`
    );
    return null;
  }

  const pipelineConfig = PIPELINE_STAGE_MAP[pipelineName];
  if (!pipelineConfig) {
    console.warn(`[Parser] Unknown pipeline: ${pipelineName}`);
    return null;
  }

  const status = mapPipefyStatus(card.current_phase.name);
  const sla_color = computeSlaColor(status, card.due_date, card.created_at);

  return {
    codigo_imovel,
    stage_number: pipelineConfig.start,
    stage_name: `${pipelineConfig.name} - ${card.current_phase.name}`,
    status,
    sla_color,
    due_date: card.due_date,
    started_at: card.created_at,
    completed_at: status === "completed" ? card.updated_at : undefined,
    blocked_reason:
      status === "blocked" ? `Card blocked: ${card.title}` : undefined,
    metadata: {
      pipefy_card_id: card.id,
      pipeline_name: pipelineName,
      comments: card.comments_count || 0,
      attachments: card.attachments_count || 0,
    },
  };
}

/**
 * Parse múltiplos cards de um pipeline
 * Retorna apenas cards com codigo_imovel válido (FK validation)
 */
export function parseCards(
  cards: PipefyCard[],
  pipelineName: string
): NormalizedStage[] {
  const parsed = cards
    .map((card) => parseCard(card, pipelineName))
    .filter((stage) => stage !== null) as NormalizedStage[];

  console.log(
    `[Parser] Processed ${cards.length} cards from ${pipelineName}, valid: ${parsed.length}`
  );

  return parsed;
}

/**
 * Agregação: processa 7 pipelines em paralelo
 */
export async function parseAllPipelines(
  pipelines: Record<string, PipefyCard[]>
): Promise<NormalizedStage[]> {
  const allStages: NormalizedStage[] = [];

  for (const [pipelineName, cards] of Object.entries(pipelines)) {
    const stages = parseCards(cards, pipelineName);
    allStages.push(...stages);
  }

  console.log(
    `[Parser] Total: ${allStages.length} stages from all ${Object.keys(pipelines).length} pipelines`
  );

  // Validação: todos os stages devem ter codigo_imovel válido
  const missingFK = allStages.filter((s) => !s.codigo_imovel);
  if (missingFK.length > 0) {
    console.error(
      `[Parser] ${missingFK.length} stages missing FK codigo_imovel`
    );
  }

  return allStages;
}

/**
 * Batch insert para banco de dados
 * Resolve codigo_imovel → property_id antes de inserir
 */
export function prepareBatchInsert(
  stages: NormalizedStage[],
  propertyMap: Record<string, number>
): (NormalizedStage & { property_id: number })[] {
  return stages
    .map((stage) => {
      const property_id = propertyMap[stage.codigo_imovel];
      if (!property_id) {
        console.warn(
          `[Parser] codigo_imovel ${stage.codigo_imovel} not found in properties`
        );
        return null;
      }
      return { ...stage, property_id };
    })
    .filter((stage) => stage !== null) as (NormalizedStage & {
    property_id: number;
  })[];
}
