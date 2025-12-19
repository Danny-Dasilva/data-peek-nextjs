import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/lib/db/db-adapter'
import type { ConnectionConfig } from '@data-peek/shared'

export async function POST(request: NextRequest) {
  try {
    const config: ConnectionConfig = await request.json()

    const adapter = getAdapter(config)
    const types = await adapter.getTypes(config)

    return NextResponse.json({
      success: true,
      data: types
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get types'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
