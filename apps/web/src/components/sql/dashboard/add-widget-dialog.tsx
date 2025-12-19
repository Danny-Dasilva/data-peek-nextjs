'use client'

import { useReducer, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/sql/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/sql/ui/dialog'
import { useDashboardStore } from '@/stores/dashboard-store'
import type {
  CreateWidgetInput,
  ChartWidgetConfig,
  KPIWidgetConfig,
  TableWidgetConfig,
  ConnectionConfig
} from '@data-peek/shared'
import { dialogReducer, initialDialogState, type WidgetSuggestion } from './add-widget-dialog-reducer'
import { TypeStep, SourceStep, ConfigStep } from './add-widget-steps'

interface AddWidgetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dashboardId: string
  connections: ConnectionConfig[]
  connectionConfig?: ConnectionConfig
}

export function AddWidgetDialog({
  open,
  onOpenChange,
  dashboardId,
  connections,
  connectionConfig
}: AddWidgetDialogProps) {
  const addWidget = useDashboardStore((s) => s.addWidget)

  const [state, dispatch] = useReducer(dialogReducer, initialDialogState)

  const {
    step,
    isSubmitting,
    error,
    widgetName,
    widgetType,
    inlineSql,
    connectionId,
    chartType,
    xKey,
    yKeys,
    kpiFormat,
    kpiLabel,
    valueKey,
    prefix,
    suffix,
    maxRows,
    widgetWidth,
    previewData,
    isLoadingPreview
  } = state

  useEffect(() => {
    if (open) {
      const defaultConnectionId = connectionConfig?.id || connections[0]?.id || ''
      dispatch({ type: 'RESET', payload: { defaultConnectionId } })
    }
  }, [open, connections, connectionConfig])

  const canProceed = (): boolean => {
    switch (step) {
      case 'type':
        return true
      case 'source':
        return !!inlineSql.trim() && !!connectionId
      case 'config':
        if (!widgetName.trim()) return false
        if (widgetType === 'chart') {
          return !!xKey && !!yKeys
        }
        if (widgetType === 'kpi') {
          return !!valueKey && !!kpiLabel
        }
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (step === 'type') dispatch({ type: 'SET_STEP', payload: 'source' })
    else if (step === 'source') dispatch({ type: 'SET_STEP', payload: 'config' })
  }

  const handleBack = () => {
    if (step === 'source') dispatch({ type: 'SET_STEP', payload: 'type' })
    else if (step === 'config') dispatch({ type: 'SET_STEP', payload: 'source' })
  }

  const handlePreviewQuery = async () => {
    const connection = connections.find((c) => c.id === connectionId)
    if (!inlineSql || !connection) return

    const sql = inlineSql.trim().replace(/;+$/, '')
    const previewSql = `${sql} LIMIT 100`

    dispatch({ type: 'SET_LOADING_PREVIEW', payload: true })
    try {
      const response = await fetch('/api/sql/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: connection,
          sql: previewSql
        })
      })

      const result = await response.json()
      if (result.success && result.data) {
        dispatch({ type: 'SET_PREVIEW_DATA', payload: result.data.rows || null })
      } else {
        dispatch({ type: 'SET_PREVIEW_DATA', payload: null })
      }
    } catch (err) {
      console.error('Preview query failed:', err)
      dispatch({ type: 'SET_PREVIEW_DATA', payload: null })
    } finally {
      dispatch({ type: 'SET_LOADING_PREVIEW', payload: false })
    }
  }

  const handleSuggestionSelect = (suggestion: WidgetSuggestion) => {
    dispatch({ type: 'APPLY_SUGGESTION', payload: suggestion })
  }

  const handleSubmit = async () => {
    if (!canProceed()) return

    dispatch({ type: 'SET_SUBMITTING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      let config: ChartWidgetConfig | KPIWidgetConfig | TableWidgetConfig

      if (widgetType === 'chart') {
        config = {
          widgetType: 'chart',
          chartType,
          xKey,
          yKeys: yKeys.split(',').map((k) => k.trim()),
          showLegend: true,
          showGrid: true
        }
      } else if (widgetType === 'kpi') {
        config = {
          widgetType: 'kpi',
          format: kpiFormat,
          label: kpiLabel,
          valueKey,
          prefix: prefix || undefined,
          suffix: suffix || undefined
        }
      } else {
        config = {
          widgetType: 'table',
          pageSize: maxRows
        }
      }

      const getWidgetWidth = (): number => {
        if (widgetWidth === 'full') return 12
        if (widgetWidth === 'half') return 6
        return widgetType === 'table' ? 6 : 4
      }

      const input: CreateWidgetInput = {
        title: widgetName.trim(),
        type: widgetType,
        query: inlineSql,
        connectionId,
        config,
        layout: {
          x: 0,
          y: 0,
          w: getWidgetWidth(),
          h: widgetType === 'kpi' ? 2 : widgetWidth === 'full' ? 4 : 3,
          minW: 2,
          minH: 2
        }
      }

      await addWidget(dashboardId, input)
      onOpenChange(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add widget'
      console.error('Failed to add widget:', err)
      dispatch({ type: 'SET_ERROR', payload: message })
    } finally {
      dispatch({ type: 'SET_SUBMITTING', payload: false })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Widget</DialogTitle>
          <DialogDescription>
            {step === 'type' && 'Choose what type of widget you want to add'}
            {step === 'source' && 'Write a SQL query to power your widget'}
            {step === 'config' && 'Configure your widget settings'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === 'type' && <TypeStep widgetType={widgetType} dispatch={dispatch} />}

          {step === 'source' && (
            <SourceStep
              connectionId={connectionId}
              inlineSql={inlineSql}
              connections={connections}
              dispatch={dispatch}
            />
          )}

          {step === 'config' && (
            <ConfigStep
              state={state}
              connections={connections}
              previewData={previewData}
              isLoadingPreview={isLoadingPreview}
              onPreviewQuery={handlePreviewQuery}
              onSuggestionSelect={handleSuggestionSelect}
              dispatch={dispatch}
            />
          )}
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <div>
            {step !== 'type' && (
              <Button variant="ghost" onClick={handleBack}>
                <ChevronLeft className="size-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {step === 'config' ? (
              <Button onClick={handleSubmit} disabled={!canProceed() || isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add Widget'}
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
                <ChevronRight className="size-4 ml-1" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
