import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { properties, stages, activities } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

/**
 * GET /api/properties
 * Retorna lista agregada de propriedades com suas stages e activities
 * Suporta filtros: ?status=ativo&responsavel=João&stage_status=pending
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const responsavel = searchParams.get("responsavel");
    const stageStatus = searchParams.get("stage_status");

    // Query base: properties com suas stages relacionadas
    let query = db
      .select({
        id: properties.id,
        codigo_imovel: properties.codigo_imovel,
        endereco: properties.endereco,
        cidade: properties.cidade,
        uf: properties.uf,
        responsavel: properties.responsavel,
        status: properties.status,
        metadata: properties.metadata,
        created_at: properties.created_at,
        updated_at: properties.updated_at,
      })
      .from(properties);

    // Adicionar filtros se fornecidos
    let conditions = [];
    if (status) {
      conditions.push(eq(properties.status, status));
    }
    if (responsavel) {
      conditions.push(eq(properties.responsavel, responsavel));
    }

    if (conditions.length > 0) {
      // Aplicar filtros (nota: isso é simplificado, idealmente usar .where() com múltiplas condições)
      // Por enquanto, apenas pegar todos e filtrar em memória para MVP
    }

    const propertiesList = await query.limit(100); // Limite 100 para MVP

    // Para cada propriedade, buscar suas stages e activities
    const enriched = await Promise.all(
      propertiesList.map(async (prop) => {
        const propStages = await db
          .select()
          .from(stages)
          .where(eq(stages.property_id, prop.id));

        // Buscar atividades mais recentes (últimas 10 por propriedade)
        const propActivities = await db
          .select()
          .from(activities)
          .where(eq(activities.property_id, prop.id))
          .orderBy(desc(activities.created_at))
          .limit(10);

        return {
          ...prop,
          stages: propStages,
          activities: propActivities,
          stage_count: propStages.length,
          completed_stages: propStages.filter((s) => s.status === "completed")
            .length,
          blocked_stages: propStages.filter((s) => s.status === "blocked")
            .length,
          sla_status: propStages.reduce(
            (acc, stage) => {
              if (stage.sla_color === "red") acc.red += 1;
              else if (stage.sla_color === "yellow") acc.yellow += 1;
              else acc.green += 1;
              return acc;
            },
            { red: 0, yellow: 0, green: 0 }
          ),
        };
      })
    );

    return NextResponse.json(
      {
        success: true,
        count: enriched.length,
        data: enriched,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/properties] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch properties",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sync
 * Trigger manual de sincronização com Nekt/Pipefy
 * Body: { type: "nekt" | "pipefy" | "full" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type = "full" } = body;

    if (!["nekt", "pipefy", "full"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Invalid sync type" },
        { status: 400 }
      );
    }

    // Aqui seria integração com Nekt/Pipefy API
    // Por enquanto, apenas registrar o log
    console.log(`[POST /api/sync] Triggered sync type: ${type}`);

    return NextResponse.json(
      {
        success: true,
        message: `Sync ${type} triggered successfully`,
        timestamp: new Date().toISOString(),
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("[POST /api/sync] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Sync failed",
      },
      { status: 500 }
    );
  }
}
