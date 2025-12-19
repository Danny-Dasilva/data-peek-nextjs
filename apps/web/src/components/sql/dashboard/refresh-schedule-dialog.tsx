'use client'

import { useState, useEffect } from 'react'
import { Clock, Info } from 'lucide-react'

import { Button } from '@/components/sql/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/sql/ui/dialog'
import { Label } from '@/components/sql/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/sql/ui/select'
import { Switch } from '@/components/sql/ui/switch'
import { useDashboardStore } from '@/stores/dashboard-store'
import type { Dashboard } from '@data-peek/shared'

interface RefreshScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dashboard: Dashboard
}

const INTERVAL_OPTIONS = [
  { value: '30000', label: '30 seconds' },
  { value: '60000', label: '1 minute' },
  { value: '300000', label: '5 minutes' },
  { value: '900000', label: '15 minutes' },
  { value: '1800000', label: '30 minutes' },
  { value: '3600000', label: '1 hour' }
]

export function RefreshScheduleDialog({
  open,
  onOpenChange,
  dashboard
}: RefreshScheduleDialogProps) {
  const updateRefreshSchedule = useDashboardStore((s) => s.updateRefreshSchedule)

  const [enabled, setEnabled] = useState(dashboard.refreshSchedule?.enabled ?? false)
  const [intervalMs, setIntervalMs] = useState(
    String(dashboard.refreshSchedule?.intervalMs ?? 300000)
  )
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setEnabled(dashboard.refreshSchedule?.enabled ?? false)
      setIntervalMs(String(dashboard.refreshSchedule?.intervalMs ?? 300000))
    }
  }, [open, dashboard.refreshSchedule])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateRefreshSchedule(dashboard.id, {
        enabled,
        intervalMs: parseInt(intervalMs, 10)
      })
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="size-5" />
            Auto-Refresh
          </DialogTitle>
          <DialogDescription>
            Configure automatic data refresh for this dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enabled">Enable auto-refresh</Label>
              <p className="text-xs text-muted-foreground">
                Automatically refresh all widgets on a schedule
              </p>
            </div>
            <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="interval">Refresh interval</Label>
                <Select value={intervalMs} onValueChange={setIntervalMs}>
                  <SelectTrigger id="interval">
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVAL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/30 p-3">
                <Info className="size-4 mt-0.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Auto-refresh runs while the dashboard is open. Widget data will update
                  automatically without manual refresh.
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
