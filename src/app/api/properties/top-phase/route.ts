import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { properties } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const [fase3, fase5] = await Promise.all([
      db.select().from(properties)
        .where(sql`${properties.metadata}->>'pipe' = '1' AND ${properties.metadata}->>'phase' LIKE 'Fase 3%'`)
        .orderBy(sql`${properties.metadata}->>'phase_started_at' ASC NULLS LAST`)
        .limit(5),
      db.select().from(properties)
        .where(sql`${properties.metadata}->>'pipe' = '1' AND ${properties.metadata}->>'phase' LIKE 'Fase 5%'`)
        .orderBy(sql`${properties.metadata}->>'phase_started_at' ASC NULLS LAST`)
        .limit(5),
    ]);
    return NextResponse.json({ success: true, fase3, fase5 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
