import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { properties, stages } from "@/db/schema";
import { eq, count, and, sql } from "drizzle-orm";

// Pipe Mãe = pipe '1' (Pipe 1 - Implantação/Mãe, table 303781436)
const PIPE_MAE = sql`${properties.metadata}->>'pipe' = '1'`

export async function GET() {
  try {
    const [totalRes, activeRes, doneRes, slaRedRes] = await Promise.all([
      db.select({ count: count() }).from(properties).where(PIPE_MAE),
      // Em Onboarding = active status in Pipe Mãe
      db.select({ count: count() }).from(properties).where(and(PIPE_MAE, eq(properties.status, "active"))),
      // Concluídos = Fase 11 only (excludes Churn/Excluídos which are also done=true)
      db.select({ count: count() }).from(properties).where(
        and(PIPE_MAE, sql`${properties.metadata}->>'phase' LIKE '%Fase 11%'`)
      ),
      // SLA Atrasado = late=true in Pipe Mãe
      db.select({ count: count() }).from(properties).where(
        and(PIPE_MAE, sql`(${properties.metadata}->>'late')::boolean = true`)
      ),
    ])

    const total = Number(totalRes[0]?.count ?? 0)
    const active = Number(activeRes[0]?.count ?? 0)
    const done = Number(doneRes[0]?.count ?? 0)
    const slaRed = Number(slaRedRes[0]?.count ?? 0)

    return NextResponse.json({
      success: true,
      total,
      active,
      done,
      blocked: 0,
      sla_red: slaRed,
      sla_ok: total - slaRed,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
