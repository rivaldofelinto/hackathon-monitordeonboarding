import { StitchLayout } from '@/components/stitch/StitchLayout'
import { Calendario } from '@/components/stitch/Calendario'

async function getProperties() {
  try {
    const res = await fetch('/api/properties', {
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

export default async function CalendarioPage() {
  const properties = await getProperties()

  return (
    <StitchLayout>
      <Calendario properties={properties} />
    </StitchLayout>
  )
}
