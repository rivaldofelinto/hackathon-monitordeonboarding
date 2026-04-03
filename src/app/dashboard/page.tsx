import { StitchLayout } from '@/components/stitch/StitchLayout'
import { Dashboard } from '@/components/stitch/Dashboard'
import { db } from '@/db/client'
import { properties, stages, activities } from '@/db/schema'
import { eq, desc, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

const PIPE_MAE = sql`${properties.metadata}->>'pipe' = '1'`

async function getProperties() {
  try {
    const propertiesList = await db.select().from(properties)
      .where(PIPE_MAE)
      .limit(100)

    const enriched = await Promise.all(
      propertiesList.map(async (prop) => {
        const propStages = await db.select().from(stages).where(eq(stages.property_id, prop.id))
        const propActivities = await db
          .select()
          .from(activities)
          .where(eq(activities.property_id, prop.id))
          .orderBy(desc(activities.created_at))
          .limit(10)

        return {
          ...prop,
          stages: propStages,
          activities: propActivities,
          stage_count: propStages.length,
          completed_stages: propStages.filter((s) => s.status === 'completed').length,
          blocked_stages: propStages.filter((s) => s.status === 'blocked').length,
          sla_status: propStages.reduce(
            (acc, stage) => {
              if (stage.sla_color === 'red') acc.red += 1
              else if (stage.sla_color === 'yellow') acc.yellow += 1
              else acc.green += 1
              return acc
            },
            { red: 0, yellow: 0, green: 0 }
          ),
        }
      })
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return enriched as any[]
  } catch (error) {
    console.error('Error fetching properties:', error)
    return []
  }
}

export default async function DashboardPage() {
  const properties = await getProperties()

  return (
    <StitchLayout>
      <Dashboard initialData={properties} />
    </StitchLayout>
  )
}
