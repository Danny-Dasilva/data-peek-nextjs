import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/lib/db/db-adapter'
import { buildAlterTable } from '@/lib/db/ddl-builder'
import type { ConnectionConfig, AlterTableBatch } from '@data-peek/shared'

interface AlterTableRequest {
  config: ConnectionConfig
  batch: AlterTableBatch
}

export async function POST(request: NextRequest) {
  try {
    const { config, batch }: AlterTableRequest = await request.json()

    const dbType = config.dbType || 'postgresql'
    const queries = buildAlterTable(batch, dbType)

    if (queries.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No operations to perform' },
        { status: 400 }
      )
    }

    const adapter = getAdapter(config)

    // Execute each DDL statement
    const results: string[] = []
    for (const query of queries) {
      await adapter.query(config, query.sql)
      results.push(query.sql)
    }

    return NextResponse.json({
      success: true,
      data: { statements: results }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Alter table failed'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
