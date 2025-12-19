'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Moon, Sun, Monitor, Sparkles, Command } from 'lucide-react'
import { ThemeProvider, useTheme } from '@/components/sql/theme-provider'
import {
  CommandPalette,
  type CommandItem,
  Database,
  Settings,
  Plus,
  Bookmark,
  RefreshCw,
  Keyboard
} from '@/components/sql/command-palette'
import { SavedQueriesDialog } from '@/components/sql/saved-queries-dialog'
import { DatabaseIcon } from '@/components/sql/database-icons'
import { AppSidebar } from '@/components/sql/app-sidebar'
import { DashboardView } from '@/components/sql/dashboard'
import type { Dashboard } from '@data-peek/shared'
import { NavActions } from '@/components/sql/nav-actions'
import { Separator } from '@/components/sql/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from '@/components/sql/ui/sidebar'
import { TabContainer } from '@/components/sql/tab-container'
import { ConnectionPicker } from '@/components/sql/connection-picker'
import { AIChatPanel, AISettingsModal } from '@/components/sql/ai'
import { SettingsModal } from '@/components/sql/settings-modal'
import { Notifications } from '@/components/sql/notifications'
import { useAIStore } from '@/stores/ai-store'
import { useConnectionStore, useSettingsStore, useTabStore } from '@/stores'
import { cn } from '@/lib/utils'
import { useKeys } from '@/hooks/use-keys'
import { Button } from '@/components/sql/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/sql/ui/tooltip'
import { api } from '@/lib/api-client'

// Inner layout component that has access to sidebar context
function LayoutContent() {
  const { toggleSidebar } = useSidebar()
  const { setTheme } = useTheme()
  const keys = useKeys()

  const activeConnection = useConnectionStore((s) => s.getActiveConnection())
  const connections = useConnectionStore((s) => s.connections)
  const setActiveConnection = useConnectionStore((s) => s.setActiveConnection)
  const setConnectionStatus = useConnectionStore((s) => s.setConnectionStatus)
  const fetchSchemas = useConnectionStore((s) => s.fetchSchemas)
  const [isConnectionPickerOpen, setIsConnectionPickerOpen] = useState(false)

  // Command palette state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  // Saved queries dialog state
  const [isSavedQueriesOpen, setIsSavedQueriesOpen] = useState(false)

  // Settings modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Dashboard view state
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null)

  // AI states from store
  const isAIPanelOpen = useAIStore((s) => s.isPanelOpen)
  const toggleAIPanel = useAIStore((s) => s.togglePanel)
  const openAIPanel = useAIStore((s) => s.openPanel)
  const closeAIPanel = useAIStore((s) => s.closePanel)
  const isAISettingsOpen = useAIStore((s) => s.isSettingsOpen)
  const openAISettings = useAIStore((s) => s.openSettings)
  const closeAISettings = useAIStore((s) => s.closeSettings)
  const multiProviderConfig = useAIStore((s) => s.multiProviderConfig)
  const isAIConfigured = useAIStore((s) => s.isConfigured)
  const setProviderConfig = useAIStore((s) => s.setProviderConfig)
  const removeProviderConfig = useAIStore((s) => s.removeProviderConfig)
  const setActiveProvider = useAIStore((s) => s.setActiveProvider)
  const setActiveModel = useAIStore((s) => s.setActiveModel)
  const loadConfigFromMain = useAIStore((s) => s.loadConfigFromMain)

  // Get schemas for AI context
  const schemas = useConnectionStore((s) => s.schemas)

  // Tab store for opening SQL in new tab
  const createQueryTab = useTabStore((s) => s.createQueryTab)
  const setActiveTab = useTabStore((s) => s.setActiveTab)

  // Handle opening SQL in a new tab (without execution)
  const handleAIOpenInTab = useCallback(
    (sql: string) => {
      const tabId = createQueryTab(activeConnection?.id || null, sql)
      setActiveTab(tabId)
    },
    [activeConnection, createQueryTab, setActiveTab]
  )

  // Load AI config on mount
  useEffect(() => {
    loadConfigFromMain()
  }, [loadConfigFromMain])

  // Handle connection switching
  const handleSelectConnection = useCallback(
    (connectionId: string) => {
      setConnectionStatus(connectionId, { isConnecting: true, error: undefined })
      setTimeout(() => {
        setConnectionStatus(connectionId, { isConnecting: false, isConnected: true })
        setActiveConnection(connectionId)
      }, 500)
    },
    [setConnectionStatus, setActiveConnection]
  )

  // Command palette commands
  const commands = useMemo<CommandItem[]>(() => {
    const cmds: CommandItem[] = [
      // AI Commands
      {
        id: 'ai-open',
        label: 'Open AI Assistant',
        description: 'Chat with AI to generate SQL queries',
        icon: <Sparkles className="size-4 text-blue-400" />,
        shortcut: [keys.mod, 'I'],
        category: 'AI',
        action: () => openAIPanel(),
        keywords: ['chat', 'assistant', 'generate', 'sql']
      },
      {
        id: 'ai-settings',
        label: 'AI Settings',
        description: 'Configure AI provider and API key',
        icon: <Sparkles className="size-4 text-blue-400" />,
        category: 'AI',
        action: () => openAISettings(),
        keywords: ['api', 'key', 'provider', 'openai', 'anthropic']
      },

      // Connection Commands
      {
        id: 'connection-picker',
        label: 'Switch Connection',
        description: 'Open connection picker',
        icon: <Database className="size-4 text-emerald-400" />,
        shortcut: [keys.mod, 'P'],
        category: 'Connections',
        action: () => setIsConnectionPickerOpen(true),
        keywords: ['database', 'connect', 'switch']
      },
      {
        id: 'connection-refresh',
        label: 'Refresh Schema',
        description: 'Reload database schema',
        icon: <RefreshCw className="size-4 text-emerald-400" />,
        category: 'Connections',
        action: () => {
          if (activeConnection) {
            fetchSchemas(activeConnection.id)
          }
        },
        keywords: ['reload', 'schema', 'tables']
      },

      // Query Commands
      {
        id: 'query-new',
        label: 'New Query Tab',
        description: 'Create a new query tab',
        icon: <Plus className="size-4 text-amber-400" />,
        shortcut: [keys.mod, 'T'],
        category: 'Queries',
        action: () => {
          const tabId = createQueryTab(activeConnection?.id || null)
          setActiveTab(tabId)
        },
        keywords: ['tab', 'editor', 'sql']
      },
      {
        id: 'query-saved',
        label: 'Saved Queries',
        description: 'Browse and load saved queries',
        icon: <Bookmark className="size-4 text-amber-400" />,
        category: 'Queries',
        action: () => setIsSavedQueriesOpen(true),
        keywords: ['bookmark', 'favorites', 'history']
      },

      // Navigation Commands
      {
        id: 'nav-sidebar',
        label: 'Toggle Sidebar',
        description: 'Show or hide the sidebar',
        icon: <Command className="size-4 text-purple-400" />,
        shortcut: [keys.mod, 'B'],
        category: 'Navigation',
        action: () => toggleSidebar(),
        keywords: ['panel', 'hide', 'show']
      },
      {
        id: 'nav-settings',
        label: 'Settings',
        description: 'Open application settings',
        icon: <Settings className="size-4 text-purple-400" />,
        category: 'Navigation',
        action: () => setIsSettingsOpen(true),
        keywords: ['preferences', 'options', 'configure']
      },

      // Appearance Commands
      {
        id: 'theme-light',
        label: 'Light Theme',
        description: 'Switch to light mode',
        icon: <Sun className="size-4 text-pink-400" />,
        category: 'Appearance',
        action: () => setTheme('light'),
        keywords: ['mode', 'bright']
      },
      {
        id: 'theme-dark',
        label: 'Dark Theme',
        description: 'Switch to dark mode',
        icon: <Moon className="size-4 text-pink-400" />,
        category: 'Appearance',
        action: () => setTheme('dark'),
        keywords: ['mode', 'night']
      },
      {
        id: 'theme-system',
        label: 'System Theme',
        description: 'Follow system preference',
        icon: <Monitor className="size-4 text-pink-400" />,
        category: 'Appearance',
        action: () => setTheme('system'),
        keywords: ['mode', 'auto']
      }
    ]

    // Add connection quick-switch commands
    connections.slice(0, 9).forEach((conn, index) => {
      cmds.push({
        id: `connection-${conn.id}`,
        label: conn.name,
        description: `Switch to ${conn.dbType} connection`,
        icon: <Database className="size-4 text-emerald-400" />,
        shortcut: [keys.mod, 'Shift', String(index + 1)],
        category: 'Connections',
        action: () => handleSelectConnection(conn.id),
        keywords: [conn.dbType, conn.host || '']
      })
    })

    return cmds
  }, [
    activeConnection,
    connections,
    createQueryTab,
    fetchSchemas,
    handleSelectConnection,
    openAIPanel,
    openAISettings,
    setActiveTab,
    setTheme,
    toggleSidebar
  ])

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey

      // Cmd+K: Open command palette
      if (isMeta && e.key === 'k' && !e.shiftKey) {
        e.preventDefault()
        setIsCommandPaletteOpen(true)
        return
      }

      // Cmd+P: Open connection picker
      if (isMeta && e.key === 'p' && !e.shiftKey) {
        e.preventDefault()
        setIsConnectionPickerOpen(true)
        return
      }

      // Cmd+I: Toggle AI panel
      if (isMeta && e.key === 'i' && !e.shiftKey) {
        e.preventDefault()
        toggleAIPanel()
        return
      }

      // Cmd+Shift+1-9: Switch to connection N
      if (isMeta && e.shiftKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault()
        const connectionIndex = parseInt(e.key) - 1
        if (connections[connectionIndex]) {
          handleSelectConnection(connections[connectionIndex].id)
        }
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [connections, handleSelectConnection, toggleAIPanel])

  return (
    <>
      <AppSidebar
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSelectDashboard={setSelectedDashboard}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/40 bg-background/80 backdrop-blur-xl">
          <div className="flex flex-1 items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <span className="text-sm font-medium text-muted-foreground">data-peek</span>
            {activeConnection && (
              <>
                <Separator
                  orientation="vertical"
                  className="mx-2 data-[orientation=vertical]:h-4"
                />
                <div className="flex items-center gap-1.5">
                  <span
                    className={`size-1.5 rounded-full ${activeConnection.isConnected ? 'bg-green-500' : 'bg-yellow-500'}`}
                  />
                  <DatabaseIcon dbType={activeConnection.dbType} className="size-4" />
                  <span className="text-sm text-foreground">{activeConnection.name}</span>
                </div>
              </>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2 px-3">
            {/* Command Palette Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsCommandPaletteOpen(true)}
                >
                  <Command className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Command Palette ({keys.mod}+K)</TooltipContent>
            </Tooltip>
            {/* AI Assistant Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'size-8',
                    isAIConfigured ? 'text-blue-400 hover:text-blue-300' : 'text-muted-foreground'
                  )}
                  onClick={toggleAIPanel}
                >
                  <Sparkles className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">AI Assistant ({keys.mod}+I)</TooltipContent>
            </Tooltip>
            <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />
            <NavActions />
          </div>
        </header>

        {selectedDashboard ? (
          <DashboardView
            dashboardId={selectedDashboard.id}
            connectionConfig={activeConnection || undefined}
            connections={connections}
            onBack={() => setSelectedDashboard(null)}
          />
        ) : (
          <TabContainer />
        )}
      </SidebarInset>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        commands={commands}
      />

      {/* Global Connection Picker */}
      <ConnectionPicker open={isConnectionPickerOpen} onOpenChange={setIsConnectionPickerOpen} />

      {/* Saved Queries Dialog */}
      <SavedQueriesDialog open={isSavedQueriesOpen} onOpenChange={setIsSavedQueriesOpen} />

      {/* AI Assistant Panel */}
      <AIChatPanel
        isOpen={isAIPanelOpen}
        onClose={closeAIPanel}
        onOpenSettings={openAISettings}
        connection={activeConnection || null}
        schemas={schemas}
        isConfigured={isAIConfigured}
        onOpenInTab={handleAIOpenInTab}
      />

      {/* AI Settings Modal */}
      <AISettingsModal
        isOpen={isAISettingsOpen}
        onClose={closeAISettings}
        multiProviderConfig={multiProviderConfig}
        onSaveProviderConfig={async (provider, config) => {
          setProviderConfig(provider, config)
          await api.ai.setProviderConfig(provider, config)
        }}
        onRemoveProviderConfig={async (provider) => {
          removeProviderConfig(provider)
          await api.ai.removeProviderConfig(provider)
        }}
        onSetActiveProvider={async (provider) => {
          setActiveProvider(provider)
          await api.ai.setActiveProvider(provider)
        }}
        onSetActiveModel={async (provider, model) => {
          setActiveModel(provider, model)
          await api.ai.setActiveModel(provider, model)
        }}
      />

      {/* General Settings Modal */}
      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </>
  )
}

// Root Layout wrapper that provides context
function RootLayout() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="data-peek-theme">
      <SidebarProvider>
        <LayoutContent />
        <Notifications />
      </SidebarProvider>
    </ThemeProvider>
  )
}

export default function Home() {
  return <RootLayout />
}
