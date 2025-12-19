import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/lib/db/db-adapter'
import type { ConnectionConfig } from '@data-peek/shared'

export async function POST(request: NextRequest) {
  try {
    const config: ConnectionConfig = await request.json()

    const adapter = getAdapter(config)
    await adapter.connect(config)

    return NextResponse.json({
      success: true,
      data: { connected: true }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
