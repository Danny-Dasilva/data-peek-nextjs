import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/lib/db/db-adapter'
import { buildBatchQueries } from '@/lib/db/sql-builder'
import type { ConnectionConfig, EditOperation, EditContext } from '@data-peek/shared'

interface ExecuteRequest {
  config: ConnectionConfig
  operations: EditOperation[]
  context: EditContext
}

export async function POST(request: NextRequest) {
  try {
    const { config, operations, context }: ExecuteRequest = await request.json()

    if (!operations || operations.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No operations to execute' },
        { status: 400 }
      )
    }

    const adapter = getAdapter(config)
    const dbType = config.dbType || 'postgresql'
    const queries = buildBatchQueries(operations, context, dbType)

    // Execute all queries in a transaction
    const statements = queries.map((q) => ({ sql: q.sql, params: q.params }))
    const result = await adapter.executeTransaction(config, statements)

    return NextResponse.json({
      success: true,
      data: {
        rowsAffected: result.rowsAffected,
        results: result.results
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Execute failed'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
