import { NextRequest, NextResponse } from 'next/server'
import { generateChatResponse } from '@/lib/ai/ai-service'
import type { AIConfig, AIMessage, SchemaInfo } from '@data-peek/shared'

interface ChatRequest {
  config: AIConfig
  messages: AIMessage[]
  schemas: SchemaInfo[]
  dbType: string
}

export async function POST(request: NextRequest) {
  try {
    const { config, messages, schemas, dbType }: ChatRequest = await request.json()

    if (!config || (!config.apiKey && config.provider !== 'ollama')) {
      return NextResponse.json(
        { success: false, error: 'AI configuration is required' },
        { status: 400 }
      )
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Messages are required' },
        { status: 400 }
      )
    }

    const result = await generateChatResponse(config, messages, schemas, dbType)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Chat request failed'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
