import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/lib/db/db-adapter'
import { buildCreateTable, validateTableDefinition } from '@/lib/db/ddl-builder'
import type { ConnectionConfig, TableDefinition } from '@data-peek/shared'

interface CreateTableRequest {
  config: ConnectionConfig
  definition: TableDefinition
}

export async function POST(request: NextRequest) {
  try {
    const { config, definition }: CreateTableRequest = await request.json()

    // Validate the table definition
    const validation = validateTableDefinition(definition)
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.errors.join(', ') },
        { status: 400 }
      )
    }

    const dbType = config.dbType || 'postgresql'
    const { sql } = buildCreateTable(definition, dbType)

    const adapter = getAdapter(config)
    await adapter.query(config, sql)

    return NextResponse.json({
      success: true,
      data: { sql }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Create table failed'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
