import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/lib/db/db-adapter'
import type { ConnectionConfig } from '@data-peek/shared'

interface ExplainRequest {
  config: ConnectionConfig
  sql: string
  analyze?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const { config, sql, analyze = false }: ExplainRequest = await request.json()

    if (!sql || !sql.trim()) {
      return NextResponse.json(
        { success: false, error: 'SQL query is required' },
        { status: 400 }
      )
    }

    const adapter = getAdapter(config)
    const result = await adapter.explain(config, sql, analyze)

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Explain failed'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
