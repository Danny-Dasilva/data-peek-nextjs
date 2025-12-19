import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/lib/db/db-adapter'
import type { ConnectionConfig } from '@data-peek/shared'

interface QueryRequest {
  config: ConnectionConfig
  sql: string
}

export async function POST(request: NextRequest) {
  try {
    const { config, sql }: QueryRequest = await request.json()

    if (!sql || !sql.trim()) {
      return NextResponse.json(
        { success: false, error: 'SQL query is required' },
        { status: 400 }
      )
    }

    const adapter = getAdapter(config)
    const result = await adapter.queryMultiple(config, sql)

    // Extract first result for backwards compatibility with AI components
    // that expect { rows, fields } at the top level
    const firstResult = result.results[0]

    return NextResponse.json({
      success: true,
      data: {
        rows: firstResult?.rows || [],
        fields: firstResult?.fields || [],
        rowCount: firstResult?.rowCount || 0,
        durationMs: result.totalDurationMs,
        // Include full results for components that need multi-statement support
        results: result.results,
        totalDurationMs: result.totalDurationMs
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Query failed'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
