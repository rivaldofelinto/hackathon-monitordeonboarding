import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { properties, stages, activities } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);

    if (isNaN(numericId)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    const [prop] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, numericId))
      .limit(1);

    if (!prop) {
      return NextResponse.json({ success: false, error: "Property not found" }, { status: 404 });
    }

    const propStages = await db
      .select()
      .from(stages)
      .where(eq(stages.property_id, numericId))
      .orderBy(stages.stage_number);

    const propActivities = await db
      .select()
      .from(activities)
      .where(eq(activities.property_id, numericId))
      .orderBy(desc(activities.created_at))
      .limit(20);

    const completedCount = propStages.filter((s) => s.status === "completed").length;
    const blockedCount = propStages.filter((s) => s.status === "blocked").length;
    const inProgressCount = propStages.filter((s) => s.status === "in_progress").length;

    const slaCounts = propStages.reduce(
      (acc, stage) => {
        if (stage.sla_color === "red") acc.red += 1;
        else if (stage.sla_color === "yellow") acc.yellow += 1;
        else acc.green += 1;
        return acc;
      },
      { red: 0, yellow: 0, green: 0 }
    );

    return NextResponse.json({
      success: true,
      data: {
        ...prop,
        stages: propStages,
        activities: propActivities,
        completed_count: completedCount,
        blocked_count: blockedCount,
        in_progress_count: inProgressCount,
        sla_counts: slaCounts,
      },
    });
  } catch (error) {
    console.error("[GET /api/properties/[id]] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch property" },
      { status: 500 }
    );
  }
}
