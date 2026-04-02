import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { properties, stages } from "@/db/schema";
import { eq, count } from "drizzle-orm";

export async function GET() {
  try {
    const totalRes = await db.select({ count: count() }).from(properties);
    const activeRes = await db.select({ count: count() }).from(properties).where(eq(properties.status, "active"));
    const doneRes = await db.select({ count: count() }).from(properties).where(eq(properties.status, "done"));
    const blockedRes = await db.select({ count: count() }).from(properties).where(eq(properties.status, "blocked"));
    const redSlaRes = await db.select({ count: count() }).from(stages).where(eq(stages.sla_color, "red"));

    const total = Number(totalRes[0]?.count ?? 0);
    const active = Number(activeRes[0]?.count ?? 0);
    const done = Number(doneRes[0]?.count ?? 0);
    const blocked = Number(blockedRes[0]?.count ?? 0);
    const slaRed = Number(redSlaRes[0]?.count ?? 0);

    return NextResponse.json({
      success: true,
      total,
      active,
      done,
      blocked,
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
