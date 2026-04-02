/**
 * Seed script para popular Neon com dados de teste
 * Uso: npx tsx src/lib/seed.ts
 */

import { db } from "@/db/client";
import { properties, stages, activities } from "@/db/schema";

async function seedDatabase() {
  console.log("🌱 Starting seed...");

  try {
    // 1. Inserir 5 propriedades de teste
    const testProperties = [
      {
        codigo_imovel: "PROP-001",
        endereco: "Av. Paulista, 1000",
        cidade: "São Paulo",
        uf: "SP",
        responsavel: "João Silva",
        status: "onboarding",
        metadata: { tipo: "comercial" },
      },
      {
        codigo_imovel: "PROP-002",
        endereco: "Rua Augusta, 500",
        cidade: "São Paulo",
        uf: "SP",
        responsavel: "Maria Santos",
        status: "vistoria",
        metadata: { tipo: "residencial" },
      },
      {
        codigo_imovel: "PROP-003",
        endereco: "Av. Brasil, 2000",
        cidade: "Rio de Janeiro",
        uf: "RJ",
        responsavel: "Pedro Costa",
        status: "adequacoes",
        metadata: { tipo: "comercial" },
      },
      {
        codigo_imovel: "PROP-004",
        endereco: "Rua Oscar Freire, 300",
        cidade: "São Paulo",
        uf: "SP",
        responsavel: "Ana Oliveira",
        status: "prontoparativar",
        metadata: { tipo: "residencial" },
      },
      {
        codigo_imovel: "PROP-005",
        endereco: "Av. Imigrantes, 1500",
        cidade: "São Paulo",
        uf: "SP",
        responsavel: "Carlos Mendes",
        status: "ativado",
        metadata: { tipo: "comercial" },
      },
    ];

    const insertedProps = await db
      .insert(properties)
      .values(testProperties)
      .returning();

    console.log(`✅ Inserted ${insertedProps.length} properties`);

    // 2. Inserir stages para cada propriedade
    const stageNames = [
      "Onboarding",
      "Vistoria",
      "Adequações",
      "Pronto p/ Ativar",
      "Ativado",
    ];

    const stagesList = [];
    for (const prop of insertedProps) {
      for (let i = 0; i < stageNames.length; i++) {
        stagesList.push({
          property_id: prop.id,
          stage_number: i + 1,
          stage_name: stageNames[i],
          status:
            i < 2
              ? "completed"
              : i === 2
                ? "in_progress"
                : i === 3
                  ? "pending"
                  : "completed",
          sla_color: i < 2 ? "green" : i === 2 ? "yellow" : "red",
          started_at: new Date(
            Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
          completed_at:
            i < 2
              ? new Date(
                  Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000
                ).toISOString()
              : undefined,
          metadata: {
            pipefy_card_id: `card-${prop.codigo_imovel}-${i}`,
            pipeline_name: "Test Pipeline",
            comments: Math.floor(Math.random() * 10),
            attachments: Math.floor(Math.random() * 5),
          },
        });
      }
    }

    const insertedStages = await db
      .insert(stages)
      .values(stagesList)
      .returning();

    console.log(`✅ Inserted ${insertedStages.length} stages`);

    // 3. Inserir algumas atividades
    const activitiesList = [];
    for (const stage of insertedStages.slice(0, 10)) {
      activitiesList.push({
        property_id: stage.property_id,
        stage_id: stage.id,
        activity_type: "status_change",
        description: `Status changed to ${stage.status}`,
        created_at: new Date(
          Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
        metadata: { previous_status: "pending" },
      });
    }

    const insertedActivities = await db
      .insert(activities)
      .values(activitiesList)
      .returning();

    console.log(`✅ Inserted ${insertedActivities.length} activities`);

    console.log("\n✨ Seed complete!");
    console.log(`
📊 Summary:
- Properties: ${insertedProps.length}
- Stages: ${insertedStages.length}
- Activities: ${insertedActivities.length}

🔗 Test now at: http://localhost:3000
    `);

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seedDatabase();
