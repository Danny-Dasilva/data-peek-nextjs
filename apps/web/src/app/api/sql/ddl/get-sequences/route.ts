import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/lib/db/db-adapter'
import type { ConnectionConfig } from '@data-peek/shared'

export async function POST(request: NextRequest) {
  try {
    const config: ConnectionConfig = await request.json()

    const adapter = getAdapter(config)
    const sequences = await adapter.getSequences(config)

    return NextResponse.json({
      success: true,
      data: sequences
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get sequences'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
