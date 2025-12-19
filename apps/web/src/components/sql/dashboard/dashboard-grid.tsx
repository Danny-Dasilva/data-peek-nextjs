'use client'

import { useCallback } from 'react'
import { ReactGridLayout } from 'react-grid-layout/legacy'

import { useDashboardStore } from '@/stores/dashboard-store'
import { WidgetCard } from './widget-card'
import type { Dashboard, WidgetLayout, ConnectionConfig } from '@data-peek/shared'

import 'react-grid-layout/css/styles.css'

interface LayoutItem {
  i: string
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
}

interface DashboardGridProps {
  dashboard: Dashboard
  editMode: boolean
  connectionConfig?: ConnectionConfig
}

export function DashboardGrid({ dashboard, editMode, connectionConfig }: DashboardGridProps) {
  const updateWidgetLayouts = useDashboardStore((s) => s.updateWidgetLayouts)

  const layout: LayoutItem[] = dashboard.widgets.map((widget) => ({
    i: widget.id,
    x: widget.layout.x,
    y: widget.layout.y,
    w: widget.layout.w,
    h: widget.layout.h,
    minW: widget.layout.minW || 2,
    minH: widget.layout.minH || 2
  }))

  const handleLayoutChange = useCallback(
    (newLayout: readonly LayoutItem[]) => {
      const layouts: Record<string, WidgetLayout> = {}
      for (const item of newLayout) {
        layouts[item.i] = {
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
          minW: item.minW,
          minH: item.minH
        }
      }
      updateWidgetLayouts(dashboard.id, layouts)
    },
    [dashboard.id, updateWidgetLayouts]
  )

  return (
    <div className="flex-1 overflow-auto p-4">
      <ReactGridLayout
        className="layout"
        layout={layout}
        cols={dashboard.layoutCols}
        rowHeight={100}
        width={1200}
        isDraggable={editMode}
        isResizable={editMode}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".widget-drag-handle"
      >
        {dashboard.widgets.map((widget) => (
          <div key={widget.id}>
            <WidgetCard
              widget={widget}
              dashboardId={dashboard.id}
              editMode={editMode}
              connectionConfig={connectionConfig}
            />
          </div>
        ))}
      </ReactGridLayout>
    </div>
  )
}
