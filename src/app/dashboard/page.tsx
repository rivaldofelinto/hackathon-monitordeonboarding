import { StitchLayout } from '@/components/stitch/StitchLayout'
import { Dashboard } from '@/components/stitch/Dashboard'

async function getProperties() {
  try {
    const res = await fetch('http://localhost:3000/api/properties', {
      cache: 'no-store',
    })
    if (!res.ok) throw new Error('Failed to fetch properties')
    const data = await res.json()
    return data.data || []
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
