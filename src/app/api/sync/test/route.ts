import { NextResponse } from 'next/server'

export async function GET() {
  const nektUrl = process.env.NEKT_API_URL
  const nektToken = process.env.NEKT_API_KEY

  if (!nektUrl || !nektToken) {
    return NextResponse.json({ error: 'env vars missing', NEKT_API_URL: !!nektUrl, NEKT_API_KEY: !!nektToken })
  }

  try {
    // Step 1: Initialize MCP session
    const initRes = await fetch(nektUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${nektToken}`,
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0' },
        },
        id: 0,
      }),
    })

    const sessionId = initRes.headers.get('mcp-session-id')
    const initBody = await initRes.text().catch(() => '')

    if (!initRes.ok || !sessionId) {
      return NextResponse.json({
        step: 'init',
        status: initRes.status,
        ok: initRes.ok,
        session_id: sessionId,
        body_preview: initBody.slice(0, 300),
      })
    }

    // Step 2: Execute SQL
    const queryRes = await fetch(nektUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${nektToken}`,
        'Accept': 'application/json, text/event-stream',
        'Mcp-Session-Id': sessionId,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'execute_sql',
          arguments: {
            sql_query: 'SELECT title, current_phase, done, late, overdue FROM nekt_trusted.pipefy_szs_all_cards_303781436 WHERE done = false LIMIT 3',
          },
        },
        id: 1,
      }),
    })

    const queryBody = await queryRes.text().catch(() => '')
    let parsed: unknown = null
    for (const line of queryBody.split('\n')) {
      if (!line.startsWith('data: ')) continue
      try { parsed = JSON.parse(line.slice(6)) } catch { /* skip */ }
    }

    return NextResponse.json({
      step: 'query',
      init_status: initRes.status,
      session_id: sessionId,
      query_status: queryRes.status,
      query_ok: queryRes.ok,
      body_preview: queryBody.slice(0, 500),
      parsed_result: parsed,
    })
  } catch (err) {
    return NextResponse.json({ exception: String(err) }, { status: 500 })
  }
}
