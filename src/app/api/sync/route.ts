import { NextResponse } from 'next/server'
import { syncNekt } from '@/lib/nekt-polling'

export async function GET() {
  const result = await syncNekt()
  return NextResponse.json(result, { status: result.success ? 200 : 500 })
}
