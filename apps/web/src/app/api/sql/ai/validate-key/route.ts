import { NextRequest, NextResponse } from 'next/server'
import { validateAPIKey } from '@/lib/ai/ai-service'
import type { AIConfig } from '@data-peek/shared'

export async function POST(request: NextRequest) {
  try {
    const config: AIConfig = await request.json()

    if (!config || (!config.apiKey && config.provider !== 'ollama')) {
      return NextResponse.json(
        { success: false, error: 'API key is required' },
        { status: 400 }
      )
    }

    const result = await validateAPIKey(config)

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Validation failed'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
