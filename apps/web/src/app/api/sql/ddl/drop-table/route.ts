import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/lib/db/db-adapter'
import { buildDropTable } from '@/lib/db/ddl-builder'
import type { ConnectionConfig } from '@data-peek/shared'

interface DropTableRequest {
  config: ConnectionConfig
  schema: string
  table: string
  cascade?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const { config, schema, table, cascade = false }: DropTableRequest = await request.json()

    if (!table) {
      return NextResponse.json(
        { success: false, error: 'Table name is required' },
        { status: 400 }
      )
    }

    const dbType = config.dbType || 'postgresql'
    const { sql } = buildDropTable(schema, table, cascade, dbType)

    const adapter = getAdapter(config)
    await adapter.query(config, sql)

    return NextResponse.json({
      success: true,
      data: { sql }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Drop table failed'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
