import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { properties } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const currentMonth = sql`TO_CHAR(CURRENT_DATE, 'YYYY-MM')`;

    const [fase3, fase5] = await Promise.all([
      // Fase 3: agendamento preenchido + duedate no mês vigente
      db.select().from(properties)
        .where(sql`
          ${properties.metadata}->>'pipe' = '1'
          AND ${properties.metadata}->>'phase' LIKE 'Fase 3%'
          AND (${properties.metadata}->>'data_agendamento_vistoria') IS NOT NULL
          AND (${properties.metadata}->>'data_agendamento_vistoria') != ''
          AND LEFT(${properties.metadata}->>'duedate', 7) = ${currentMonth}
        `)
        .orderBy(sql`${properties.metadata}->>'duedate' ASC NULLS LAST`)
        .limit(10),

      // Fase 5: duedate no mês vigente
      db.select().from(properties)
        .where(sql`
          ${properties.metadata}->>'pipe' = '1'
          AND ${properties.metadata}->>'phase' LIKE 'Fase 5%'
          AND LEFT(${properties.metadata}->>'duedate', 7) = ${currentMonth}
        `)
        .orderBy(sql`${properties.metadata}->>'duedate' ASC NULLS LAST`)
        .limit(10),
    ]);
    return NextResponse.json({ success: true, fase3, fase5 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
