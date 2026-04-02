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
  "Documentação": { start: 1, name: "Documentação" },
  "Aprovação Legal": { start: 5, name: "Aprovação Legal" },
  "Validação Financeira": { start: 9, name: "Validação Financeira" },
  "Integração Sistema": { start: 13, name: "Integração Sistema" },
  "Testes Unitários": { start: 16, name: "Testes Unitários" },
  "QA & Validação": { start: 19, name: "QA & Validação" },
  "Go-Live": { start: 22, name: "Go-Live" },
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
 * Mapeia status para cor SLA
 * Green: < 2 dias | Yellow: 2-5 dias | Red: > 5 dias
 */
export function calculateSLAColor(
  startedAt: string,
  status: string
): "green" | "yellow" | "red" {
  if (status === "completed") return "green";

  const now = new Date();
  const started = new Date(startedAt);
  const days = (now.getTime() - started.getTime()) / (1000 * 60 * 60 * 24);

  if (days < 2) return "green";
  if (days < 5) return "yellow";
  return "red";
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
  const sla_color = calculateSLAColor(card.created_at, status);

  return {
    codigo_imovel,
    stage_number: pipelineConfig.start,
    stage_name: `${pipelineConfig.name} - ${card.current_phase.name}`,
    status,
    sla_color,
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
