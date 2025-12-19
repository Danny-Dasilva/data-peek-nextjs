import { NextRequest, NextResponse } from 'next/server'
import { buildPreviewSql } from '@/lib/db/sql-builder'
import type { EditOperation, EditContext, DatabaseType } from '@data-peek/shared'

interface PreviewRequest {
  operations: EditOperation[]
  context: EditContext
  dbType: DatabaseType
}

export async function POST(request: NextRequest) {
  try {
    const { operations, context, dbType }: PreviewRequest = await request.json()

    if (!operations || operations.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No operations to preview' },
        { status: 400 }
      )
    }

    const previews = operations.map((op) => buildPreviewSql(op, context, dbType))

    return NextResponse.json({
      success: true,
      data: previews
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Preview failed'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
