'use client'

import type { TableWidgetConfig } from '@data-peek/shared'
import { ScrollArea } from '@/components/sql/ui/scroll-area'

interface WidgetTableProps {
  config: TableWidgetConfig
  data: Record<string, unknown>[]
}

function formatCellValue(value: unknown): string {
  if (value === null) return 'NULL'
  if (value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function WidgetTable({ config, data }: WidgetTableProps) {
  const { columns: configColumns, pageSize = 10 } = config

  // Use config columns or extract from data
  const columns =
    configColumns && configColumns.length > 0
      ? configColumns
      : data.length > 0
        ? Object.keys(data[0])
        : []

  const displayData = data.slice(0, pageSize)

  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No data available
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 sticky top-0">
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayData.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-muted/30 border-b border-border/50">
              {columns.map((col) => (
                <td key={col} className="px-3 py-2 font-mono text-xs truncate max-w-[200px]">
                  {formatCellValue(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > pageSize && (
        <div className="px-3 py-2 text-xs text-muted-foreground text-center border-t">
          Showing {pageSize} of {data.length} rows
        </div>
      )}
    </ScrollArea>
  )
}
