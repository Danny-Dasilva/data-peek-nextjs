import { NextRequest, NextResponse } from 'next/server'
import { buildPreviewDDL, buildAlterPreviewDDL, validateTableDefinition } from '@/lib/db/ddl-builder'
import type { TableDefinition, AlterTableBatch, DatabaseType } from '@data-peek/shared'

interface PreviewCreateRequest {
  type: 'create'
  definition: TableDefinition
  dbType: DatabaseType
}

interface PreviewAlterRequest {
  type: 'alter'
  batch: AlterTableBatch
  dbType: DatabaseType
}

type PreviewDDLRequest = PreviewCreateRequest | PreviewAlterRequest

export async function POST(request: NextRequest) {
  try {
    const body: PreviewDDLRequest = await request.json()

    if (body.type === 'create') {
      // Validate the table definition
      const validation = validateTableDefinition(body.definition)
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: validation.errors.join(', ') },
          { status: 400 }
        )
      }

      const sql = buildPreviewDDL(body.definition, body.dbType)
      return NextResponse.json({
        success: true,
        data: { sql }
      })
    } else if (body.type === 'alter') {
      const statements = buildAlterPreviewDDL(body.batch, body.dbType)
      return NextResponse.json({
        success: true,
        data: { statements }
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid preview type' },
        { status: 400 }
      )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Preview failed'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
