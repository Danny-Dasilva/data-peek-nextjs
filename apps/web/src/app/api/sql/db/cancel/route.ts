import { NextRequest, NextResponse } from 'next/server'
import { cancelQuery, isQueryActive } from '@/lib/db/query-tracker'

interface CancelRequest {
  executionId: string
}

export async function POST(request: NextRequest) {
  try {
    const { executionId }: CancelRequest = await request.json()

    if (!executionId) {
      return NextResponse.json(
        { success: false, error: 'Execution ID is required' },
        { status: 400 }
      )
    }

    // Check if query exists
    if (!isQueryActive(executionId)) {
      return NextResponse.json({
        success: true,
        data: { cancelled: false, message: 'Query not found or already completed' }
      })
    }

    // Attempt to cancel
    const result = await cancelQuery(executionId)

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel query'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
