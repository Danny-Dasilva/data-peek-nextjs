import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Dashboard,
  Widget,
  WidgetRunResult,
  CreateDashboardInput,
  UpdateDashboardInput,
  CreateWidgetInput,
  UpdateWidgetInput,
  WidgetLayout
} from '@data-peek/shared'

// Helper to generate IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

interface DashboardState {
  dashboards: Dashboard[]
  activeDashboardId: string | null
  widgetData: Map<string, WidgetRunResult>
  widgetLoadingState: Map<string, boolean>
  isLoading: boolean
  isInitialized: boolean
  error: string | null
  editMode: boolean

  initialize: () => Promise<void>
  refresh: () => Promise<void>

  createDashboard: (input: CreateDashboardInput) => Promise<Dashboard | null>
  updateDashboard: (id: string, updates: UpdateDashboardInput) => Promise<void>
  deleteDashboard: (id: string) => Promise<void>
  duplicateDashboard: (id: string) => Promise<Dashboard | null>

  setActiveDashboard: (id: string | null) => void
  setEditMode: (editMode: boolean) => void

  addWidget: (dashboardId: string, widget: CreateWidgetInput) => Promise<Widget | null>
  updateWidget: (
    dashboardId: string,
    widgetId: string,
    updates: UpdateWidgetInput
  ) => Promise<void>
  deleteWidget: (dashboardId: string, widgetId: string) => Promise<void>
  updateWidgetLayouts: (
    dashboardId: string,
    layouts: Record<string, WidgetLayout>
  ) => Promise<void>

  refreshWidget: (widget: Widget, connectionConfig: unknown) => Promise<void>
  refreshAllWidgets: (dashboardId: string, connectionConfig: unknown) => Promise<void>

  getWidgetData: (widgetId: string) => WidgetRunResult | undefined
  isWidgetLoading: (widgetId: string) => boolean

  getDashboardsByTag: (tag: string) => Dashboard[]
  getAllTags: () => string[]
  getActiveDashboard: () => Dashboard | undefined

  updateRefreshSchedule: (
    dashboardId: string,
    schedule: Dashboard['refreshSchedule']
  ) => Promise<void>

  exportDashboard: (dashboardId: string) => string | null
  importDashboard: (jsonData: string) => Promise<Dashboard | null>
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      dashboards: [],
      activeDashboardId: null,
      widgetData: new Map(),
      widgetLoadingState: new Map(),
      isLoading: false,
      isInitialized: false,
      error: null,
      editMode: false,

      initialize: async () => {
        if (get().isInitialized) return
        set({ isLoading: true, error: null, isInitialized: true })
        // Data is loaded from localStorage via persist middleware
        set({ isLoading: false })
      },

      refresh: async () => {
        // Data is in localStorage, nothing to fetch
        set({ isLoading: false })
      },

      createDashboard: async (input) => {
        const now = Date.now()
        const dashboard: Dashboard = {
          id: generateId(),
          name: input.name,
          description: input.description,
          widgets: (input.widgets || []).map((w) => ({
            ...w,
            id: generateId(),
            createdAt: now,
            updatedAt: now
          })),
          tags: input.tags || [],
          layoutCols: input.layoutCols || 12,
          refreshSchedule: input.refreshSchedule,
          createdAt: now,
          updatedAt: now
        }

        set((state) => ({
          dashboards: [...state.dashboards, dashboard]
        }))

        return dashboard
      },

      updateDashboard: async (id, updates) => {
        set((state) => ({
          dashboards: state.dashboards.map((d) =>
            d.id === id
              ? {
                  ...d,
                  ...updates,
                  updatedAt: Date.now()
                }
              : d
          )
        }))
      },

      deleteDashboard: async (id) => {
        set((state) => {
          const newWidgetData = new Map(state.widgetData)
          const dashboard = state.dashboards.find((d) => d.id === id)
          if (dashboard) {
            for (const widget of dashboard.widgets) {
              newWidgetData.delete(widget.id)
            }
          }

          return {
            dashboards: state.dashboards.filter((d) => d.id !== id),
            activeDashboardId: state.activeDashboardId === id ? null : state.activeDashboardId,
            widgetData: newWidgetData
          }
        })
      },

      duplicateDashboard: async (id) => {
        const dashboard = get().dashboards.find((d) => d.id === id)
        if (!dashboard) return null

        const now = Date.now()
        const duplicated: Dashboard = {
          ...dashboard,
          id: generateId(),
          name: `${dashboard.name} (Copy)`,
          widgets: dashboard.widgets.map((w) => ({
            ...w,
            id: generateId(),
            createdAt: now,
            updatedAt: now
          })),
          createdAt: now,
          updatedAt: now
        }

        set((state) => ({
          dashboards: [...state.dashboards, duplicated]
        }))

        return duplicated
      },

      setActiveDashboard: (id) => {
        set({ activeDashboardId: id })
      },

      setEditMode: (editMode) => {
        set({ editMode })
      },

      addWidget: async (dashboardId, widget) => {
        const now = Date.now()
        const newWidget: Widget = {
          ...widget,
          id: generateId(),
          createdAt: now,
          updatedAt: now
        }

        set((state) => ({
          dashboards: state.dashboards.map((d) =>
            d.id === dashboardId
              ? { ...d, widgets: [...d.widgets, newWidget], updatedAt: now }
              : d
          )
        }))

        return newWidget
      },

      updateWidget: async (dashboardId, widgetId, updates) => {
        const now = Date.now()
        set((state) => ({
          dashboards: state.dashboards.map((d) =>
            d.id === dashboardId
              ? {
                  ...d,
                  widgets: d.widgets.map((w) =>
                    w.id === widgetId ? { ...w, ...updates, updatedAt: now } : w
                  ),
                  updatedAt: now
                }
              : d
          )
        }))
      },

      deleteWidget: async (dashboardId, widgetId) => {
        set((state) => {
          const newWidgetData = new Map(state.widgetData)
          newWidgetData.delete(widgetId)

          return {
            dashboards: state.dashboards.map((d) =>
              d.id === dashboardId
                ? { ...d, widgets: d.widgets.filter((w) => w.id !== widgetId) }
                : d
            ),
            widgetData: newWidgetData
          }
        })
      },

      updateWidgetLayouts: async (dashboardId, layouts) => {
        const now = Date.now()
        set((state) => ({
          dashboards: state.dashboards.map((d) =>
            d.id === dashboardId
              ? {
                  ...d,
                  widgets: d.widgets.map((w) =>
                    layouts[w.id] ? { ...w, layout: layouts[w.id], updatedAt: now } : w
                  ),
                  updatedAt: now
                }
              : d
          )
        }))
      },

      refreshWidget: async (widget, connectionConfig) => {
        set((state) => {
          const newLoadingState = new Map(state.widgetLoadingState)
          newLoadingState.set(widget.id, true)
          return { widgetLoadingState: newLoadingState }
        })

        const startTime = Date.now()

        try {
          const response = await fetch('/api/sql/db/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              config: connectionConfig,
              sql: widget.query
            })
          })

          const result = await response.json()
          const durationMs = Date.now() - startTime

          set((state) => {
            const newWidgetData = new Map(state.widgetData)
            const newLoadingState = new Map(state.widgetLoadingState)

            if (result.success) {
              newWidgetData.set(widget.id, {
                widgetId: widget.id,
                success: true,
                data: result.data.rows,
                durationMs,
                rowCount: result.data.rowCount,
                executedAt: Date.now()
              })
            } else {
              newWidgetData.set(widget.id, {
                widgetId: widget.id,
                success: false,
                error: result.error,
                durationMs,
                rowCount: 0,
                executedAt: Date.now()
              })
            }

            newLoadingState.set(widget.id, false)
            return { widgetData: newWidgetData, widgetLoadingState: newLoadingState }
          })
        } catch (error) {
          set((state) => {
            const newWidgetData = new Map(state.widgetData)
            const newLoadingState = new Map(state.widgetLoadingState)

            newWidgetData.set(widget.id, {
              widgetId: widget.id,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              durationMs: Date.now() - startTime,
              rowCount: 0,
              executedAt: Date.now()
            })

            newLoadingState.set(widget.id, false)
            return { widgetData: newWidgetData, widgetLoadingState: newLoadingState }
          })
        }
      },

      refreshAllWidgets: async (dashboardId, connectionConfig) => {
        const dashboard = get().dashboards.find((d) => d.id === dashboardId)
        if (!dashboard) return

        // Set all widgets to loading
        set((state) => {
          const newLoadingState = new Map(state.widgetLoadingState)
          for (const widget of dashboard.widgets) {
            newLoadingState.set(widget.id, true)
          }
          return { widgetLoadingState: newLoadingState }
        })

        // Refresh all widgets in parallel
        await Promise.all(
          dashboard.widgets.map((widget) => get().refreshWidget(widget, connectionConfig))
        )
      },

      getWidgetData: (widgetId) => {
        return get().widgetData.get(widgetId)
      },

      isWidgetLoading: (widgetId) => {
        return get().widgetLoadingState.get(widgetId) || false
      },

      getDashboardsByTag: (tag) => {
        return get().dashboards.filter((d) => d.tags.includes(tag))
      },

      getAllTags: () => {
        const tags = new Set<string>()
        for (const dashboard of get().dashboards) {
          for (const tag of dashboard.tags) {
            tags.add(tag)
          }
        }
        return Array.from(tags).sort()
      },

      getActiveDashboard: () => {
        const { dashboards, activeDashboardId } = get()
        return dashboards.find((d) => d.id === activeDashboardId)
      },

      updateRefreshSchedule: async (dashboardId, schedule) => {
        set((state) => ({
          dashboards: state.dashboards.map((d) =>
            d.id === dashboardId
              ? { ...d, refreshSchedule: schedule, updatedAt: Date.now() }
              : d
          )
        }))
      },

      exportDashboard: (dashboardId) => {
        const dashboard = get().dashboards.find((d) => d.id === dashboardId)
        if (!dashboard) return null

        const exportData = {
          version: 1,
          exportedAt: Date.now(),
          dashboard: {
            ...dashboard,
            id: undefined,
            createdAt: undefined,
            updatedAt: undefined,
            widgets: dashboard.widgets.map((w) => ({
              ...w,
              id: undefined,
              createdAt: undefined,
              updatedAt: undefined
            }))
          }
        }

        return JSON.stringify(exportData, null, 2)
      },

      importDashboard: async (jsonData) => {
        try {
          const parsed = JSON.parse(jsonData)
          if (!parsed.dashboard || !parsed.dashboard.name) {
            console.error('Invalid dashboard export format')
            return null
          }

          const input: CreateDashboardInput = {
            name: `${parsed.dashboard.name} (Imported)`,
            description: parsed.dashboard.description,
            tags: parsed.dashboard.tags || [],
            widgets: parsed.dashboard.widgets || [],
            layoutCols: parsed.dashboard.layoutCols || 12,
            refreshSchedule: parsed.dashboard.refreshSchedule
          }

          return get().createDashboard(input)
        } catch (error) {
          console.error('Failed to import dashboard:', error)
          return null
        }
      }
    }),
    {
      name: 'dashboard-storage',
      partialize: (state) => ({
        dashboards: state.dashboards,
        activeDashboardId: state.activeDashboardId
      })
    }
  )
)
