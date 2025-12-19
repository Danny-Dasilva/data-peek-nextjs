'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  LayoutDashboard,
  Plus,
  RefreshCw,
  Settings,
  Pencil,
  ArrowLeft,
  Clock,
  Timer
} from 'lucide-react'

import { Button } from '@/components/sql/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/sql/ui/tooltip'
import { useDashboardStore } from '@/stores/dashboard-store'
import { AddWidgetDialog } from './add-widget-dialog'
import { DashboardFormDialog } from './dashboard-form-dialog'
import { DashboardGrid } from './dashboard-grid'
import { RefreshScheduleDialog } from './refresh-schedule-dialog'
import type { ConnectionConfig, Dashboard } from '@data-peek/shared'

interface DashboardViewProps {
  dashboardId: string
  connectionConfig?: ConnectionConfig
  connections: ConnectionConfig[]
  onBack?: () => void
}

export function DashboardView({
  dashboardId,
  connectionConfig,
  connections,
  onBack
}: DashboardViewProps) {
  const dashboards = useDashboardStore((s) => s.dashboards)
  const isInitialized = useDashboardStore((s) => s.isInitialized)
  const initialize = useDashboardStore((s) => s.initialize)
  const setActiveDashboard = useDashboardStore((s) => s.setActiveDashboard)
  const refreshAllWidgets = useDashboardStore((s) => s.refreshAllWidgets)
  const editMode = useDashboardStore((s) => s.editMode)
  const setEditMode = useDashboardStore((s) => s.setEditMode)

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false)
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false)

  const dashboard = dashboards.find((d) => d.id === dashboardId)

  useEffect(() => {
    if (!isInitialized) {
      initialize()
    }
  }, [isInitialized, initialize])

  useEffect(() => {
    if (dashboardId) {
      setActiveDashboard(dashboardId)
    }
    return () => {
      setActiveDashboard(null)
      setEditMode(false)
    }
  }, [dashboardId, setActiveDashboard, setEditMode])

  useEffect(() => {
    if (dashboard && dashboard.widgets.length > 0 && connectionConfig) {
      refreshAllWidgets(dashboard.id, connectionConfig)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard?.id, connectionConfig])

  // Auto-refresh effect
  useEffect(() => {
    if (!dashboard?.refreshSchedule?.enabled || !connectionConfig) return

    const intervalMs = dashboard.refreshSchedule.intervalMs
    const interval = setInterval(() => {
      refreshAllWidgets(dashboard.id, connectionConfig)
    }, intervalMs)

    return () => clearInterval(interval)
  }, [dashboard, connectionConfig, refreshAllWidgets])

  const handleRefresh = useCallback(async () => {
    if (!dashboard || !connectionConfig) return
    setIsRefreshing(true)
    try {
      await refreshAllWidgets(dashboard.id, connectionConfig)
    } finally {
      setIsRefreshing(false)
    }
  }, [dashboard, connectionConfig, refreshAllWidgets])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.key === 'r' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        if (dashboard && dashboard.widgets.length > 0 && !isRefreshing && connectionConfig) {
          handleRefresh()
        }
      }

      if (e.key === 'e' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setEditMode(!editMode)
      }

      if ((e.key === 'n' || e.key === 'a') && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setIsAddWidgetOpen(true)
      }

      if (e.key === 'Escape' && editMode) {
        e.preventDefault()
        setEditMode(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dashboard, editMode, isRefreshing, setEditMode, handleRefresh, connectionConfig])

  if (!dashboard) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <LayoutDashboard className="size-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Dashboard not found</h2>
        <p className="text-muted-foreground mb-4">
          The dashboard you&apos;re looking for doesn&apos;t exist or has been deleted.
        </p>
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="size-4 mr-2" />
            Back to Query Editor
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="size-4" />
            </Button>
          )}
          <div>
            <h1 className="text-lg font-semibold">{dashboard.name}</h1>
            {dashboard.description && (
              <p className="text-sm text-muted-foreground">{dashboard.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dashboard.refreshSchedule?.enabled && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                    <Timer className="size-3" />
                    <span>Auto</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Auto-refresh is enabled</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Button variant="outline" size="sm" onClick={() => setIsAddWidgetOpen(true)}>
            <Plus className="size-4 mr-2" />
            Add Widget
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || dashboard.widgets.length === 0 || !connectionConfig}
          >
            <RefreshCw className={`size-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={dashboard.refreshSchedule?.enabled ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIsScheduleDialogOpen(true)}
                >
                  <Clock className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Configure auto-refresh</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            variant={editMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? (
              <>
                <Settings className="size-4 mr-2" />
                Done Editing
              </>
            ) : (
              <>
                <Pencil className="size-4 mr-2" />
                Edit Layout
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
            <Settings className="size-4" />
          </Button>
        </div>
      </div>

      {dashboard.widgets.length === 0 ? (
        <EmptyDashboard onAddWidget={() => setIsAddWidgetOpen(true)} />
      ) : (
        <DashboardGrid
          dashboard={dashboard}
          editMode={editMode}
          connectionConfig={connectionConfig}
        />
      )}

      <DashboardFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        editingDashboard={dashboard}
      />

      <AddWidgetDialog
        open={isAddWidgetOpen}
        onOpenChange={setIsAddWidgetOpen}
        dashboardId={dashboard.id}
        connections={connections}
        connectionConfig={connectionConfig}
      />

      <RefreshScheduleDialog
        open={isScheduleDialogOpen}
        onOpenChange={setIsScheduleDialogOpen}
        dashboard={dashboard}
      />
    </div>
  )
}

interface EmptyDashboardProps {
  onAddWidget: () => void
}

function EmptyDashboard({ onAddWidget }: EmptyDashboardProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center max-w-md text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted mb-4">
          <LayoutDashboard className="size-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">No widgets yet</h2>
        <p className="text-muted-foreground mb-6">
          Add widgets to visualize your data. You can add charts, KPI metrics, or data tables
          powered by SQL queries.
        </p>
        <Button onClick={onAddWidget}>
          <Plus className="size-4 mr-2" />
          Add Widget
        </Button>
      </div>
    </div>
  )
}
