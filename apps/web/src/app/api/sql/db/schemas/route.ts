import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/lib/db/db-adapter'
import type { ConnectionConfig } from '@data-peek/shared'

export async function POST(request: NextRequest) {
  try {
    const config: ConnectionConfig = await request.json()

    const adapter = getAdapter(config)
    const schemas = await adapter.getSchemas(config)

    return NextResponse.json({
      success: true,
      data: schemas
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch schemas'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
