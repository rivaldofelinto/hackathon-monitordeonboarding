import { NextResponse } from 'next/server'

export async function GET() {
  const nektUrl = process.env.NEKT_API_URL
  const nektToken = process.env.NEKT_API_KEY

  if (!nektUrl || !nektToken) {
    return NextResponse.json({ error: 'env vars missing', NEKT_API_URL: !!nektUrl, NEKT_API_KEY: !!nektToken })
  }

  try {
    const response = await fetch(`${nektUrl}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${nektToken}` },
      body: JSON.stringify({ query: 'SELECT title, done, late FROM nekt_trusted.pipefy_szs_all_cards_303781436 LIMIT 3' }),
    })

    const text = await response.text()
    let parsed: unknown = null
    try { parsed = JSON.parse(text) } catch { /* not json */ }

    return NextResponse.json({
      status: response.status,
      ok: response.ok,
      body_preview: text.slice(0, 500),
      parsed_keys: parsed && typeof parsed === 'object' ? Object.keys(parsed as object) : null,
    })
  } catch (err) {
    return NextResponse.json({ exception: String(err) }, { status: 500 })
  }
}
