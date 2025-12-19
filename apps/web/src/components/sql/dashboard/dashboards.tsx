'use client'

import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  ChevronRight,
  MoreHorizontal,
  Trash2,
  Pencil,
  Copy,
  Plus,
  ExternalLink
} from 'lucide-react'

import { Badge } from '@/components/sql/ui/badge'
import { Button } from '@/components/sql/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/sql/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/sql/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/sql/ui/tooltip'
import { useDashboardStore } from '@/stores/dashboard-store'
import { DashboardFormDialog } from './dashboard-form-dialog'
import type { Dashboard } from '@data-peek/shared'

interface DashboardsProps {
  onSelectDashboard?: (dashboard: Dashboard) => void
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - timestamp
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString()
}

export function Dashboards({ onSelectDashboard }: DashboardsProps) {
  const dashboards = useDashboardStore((s) => s.dashboards)
  const isInitialized = useDashboardStore((s) => s.isInitialized)
  const initialize = useDashboardStore((s) => s.initialize)
  const deleteDashboard = useDashboardStore((s) => s.deleteDashboard)
  const duplicateDashboard = useDashboardStore((s) => s.duplicateDashboard)
  const setActiveDashboard = useDashboardStore((s) => s.setActiveDashboard)

  const [editingDashboard, setEditingDashboard] = useState<Dashboard | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)

  useEffect(() => {
    if (!isInitialized) {
      initialize()
    }
  }, [isInitialized, initialize])

  const sortedDashboards = [...dashboards].sort((a, b) => b.updatedAt - a.updatedAt)

  const handleOpenDashboard = (dashboard: Dashboard) => {
    setActiveDashboard(dashboard.id)
    onSelectDashboard?.(dashboard)
  }

  const handleEditDashboard = (dashboard: Dashboard) => {
    setEditingDashboard(dashboard)
    setIsEditDialogOpen(true)
  }

  const handleDuplicateDashboard = async (dashboard: Dashboard) => {
    await duplicateDashboard(dashboard.id)
  }

  const handleDeleteDashboard = async (id: string) => {
    if (confirm('Are you sure you want to delete this dashboard?')) {
      await deleteDashboard(id)
    }
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="space-y-2">
      <div className="flex items-center justify-between px-2">
        <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronRight
            className={`size-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
          <span>Dashboards</span>
          {sortedDashboards.length > 0 && (
            <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0">
              {sortedDashboards.length}
            </Badge>
          )}
        </CollapsibleTrigger>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={() => setIsFormDialogOpen(true)}
        >
          <Plus className="size-3" />
        </Button>
      </div>

      <CollapsibleContent className="space-y-1">
        {sortedDashboards.length === 0 ? (
          <div className="px-2 py-4 text-center">
            <p className="text-xs text-muted-foreground mb-2">No dashboards yet</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFormDialogOpen(true)}
            >
              <Plus className="size-4 mr-1" />
              New Dashboard
            </Button>
          </div>
        ) : (
          sortedDashboards.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="group flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted/50"
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleOpenDashboard(item)}
                      className="flex flex-col items-start gap-0.5 flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-1.5 w-full">
                        <LayoutDashboard className="size-3 text-muted-foreground shrink-0" />
                        <span className="text-xs truncate font-medium">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pl-4">
                        <span>
                          {item.widgets.length} widget{item.widgets.length !== 1 ? 's' : ''}
                        </span>
                        <span>·</span>
                        <span>{formatDate(item.updatedAt)}</span>
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-sm">
                    <div className="space-y-1">
                      <p className="font-medium">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      )}
                      <p className="text-xs">
                        {item.widgets.length} widget{item.widgets.length !== 1 ? 's' : ''}
                      </p>
                      {item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px]">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 opacity-0 group-hover:opacity-100"
                  >
                    <MoreHorizontal className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => handleOpenDashboard(item)}>
                    <ExternalLink className="size-4 mr-2 text-muted-foreground" />
                    Open
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleEditDashboard(item)}>
                    <Pencil className="size-4 mr-2 text-muted-foreground" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicateDashboard(item)}>
                    <Copy className="size-4 mr-2 text-muted-foreground" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-400"
                    onClick={() => handleDeleteDashboard(item.id)}
                  >
                    <Trash2 className="size-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        )}

        {sortedDashboards.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={() => setIsFormDialogOpen(true)}
          >
            <LayoutDashboard className="size-3 mr-1" />
            View all ({sortedDashboards.length})
          </Button>
        )}
      </CollapsibleContent>

      <DashboardFormDialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) setEditingDashboard(null)
        }}
        editingDashboard={editingDashboard}
      />

      <DashboardFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        editingDashboard={null}
      />
    </Collapsible>
  )
}
