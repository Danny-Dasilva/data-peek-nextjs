import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/lib/db/db-adapter'
import type { ConnectionConfig } from '@data-peek/shared'

interface GetTableDDLRequest {
  config: ConnectionConfig
  schema: string
  table: string
}

export async function POST(request: NextRequest) {
  try {
    const { config, schema, table }: GetTableDDLRequest = await request.json()

    if (!table) {
      return NextResponse.json(
        { success: false, error: 'Table name is required' },
        { status: 400 }
      )
    }

    const adapter = getAdapter(config)
    const definition = await adapter.getTableDDL(config, schema, table)

    return NextResponse.json({
      success: true,
      data: definition
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get table DDL'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
