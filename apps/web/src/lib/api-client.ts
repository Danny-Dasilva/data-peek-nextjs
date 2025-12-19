/**
 * API Client - Web Version
 *
 * Replaces window.api from Electron with HTTP fetch calls.
 * Storage (connections, saved queries, AI config) uses localStorage.
 */

import type {
  ConnectionConfig,
  IpcResponse,
  DatabaseSchemaResponse,
  EditBatch,
  EditResult,
  TableDefinition,
  AlterTableBatch,
  DDLResult,
  SequenceInfo,
  CustomTypeInfo,
  SavedQuery,
  SchemaInfo,
  AIProvider,
  AIConfig,
  AIMessage,
  AIChatResponse,
  StoredChatMessage,
  ChatSession,
  AIMultiProviderConfig,
  AIProviderConfig
} from '@data-peek/shared'
import { DEFAULT_MODELS } from '@data-peek/shared'

// Storage keys
const STORAGE_KEYS = {
  CONNECTIONS: 'data-peek-connections',
  SAVED_QUERIES: 'data-peek-saved-queries',
  AI_CONFIG: 'data-peek-ai-config',
  AI_MULTI_PROVIDER_CONFIG: 'data-peek-ai-multi-provider-config',
  CHAT_HISTORY: 'data-peek-chat-history'
}

// Helper to make API calls
async function apiCall<T>(url: string, body: unknown): Promise<IpcResponse<T>> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const data = await response.json()

    if (!data.success) {
      return { success: false, error: data.error || 'Request failed' }
    }

    return { success: true, data: data.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error'
    return { success: false, error: message }
  }
}

// Helper for localStorage
function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch {
    return defaultValue
  }
}

function setToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

// Generate a unique ID with fallback for environments where crypto.randomUUID is unavailable
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Connection management (localStorage)
const connections = {
  list: async (): Promise<IpcResponse<ConnectionConfig[]>> => {
    const conns = getFromStorage<ConnectionConfig[]>(STORAGE_KEYS.CONNECTIONS, [])
    return { success: true, data: conns }
  },

  add: async (connection: ConnectionConfig): Promise<IpcResponse<ConnectionConfig>> => {
    const conns = getFromStorage<ConnectionConfig[]>(STORAGE_KEYS.CONNECTIONS, [])
    const newConn = { ...connection, id: connection.id || generateId() }
    conns.push(newConn)
    setToStorage(STORAGE_KEYS.CONNECTIONS, conns)
    return { success: true, data: newConn }
  },

  update: async (connection: ConnectionConfig): Promise<IpcResponse<ConnectionConfig>> => {
    const conns = getFromStorage<ConnectionConfig[]>(STORAGE_KEYS.CONNECTIONS, [])
    const index = conns.findIndex((c) => c.id === connection.id)
    if (index === -1) {
      return { success: false, error: 'Connection not found' }
    }
    conns[index] = connection
    setToStorage(STORAGE_KEYS.CONNECTIONS, conns)
    return { success: true, data: connection }
  },

  delete: async (id: string): Promise<IpcResponse<void>> => {
    const conns = getFromStorage<ConnectionConfig[]>(STORAGE_KEYS.CONNECTIONS, [])
    const filtered = conns.filter((c) => c.id !== id)
    setToStorage(STORAGE_KEYS.CONNECTIONS, filtered)
    return { success: true, data: undefined }
  }
}

// Database operations (API calls)
const db = {
  connect: async (config: ConnectionConfig): Promise<IpcResponse<void>> => {
    return apiCall('/api/sql/db/connect', config)
  },

  query: async (
    config: ConnectionConfig,
    query: string,
    _executionId?: string
  ): Promise<IpcResponse<unknown>> => {
    return apiCall('/api/sql/db/query', { config, sql: query })
  },

  cancelQuery: async (_executionId: string): Promise<IpcResponse<{ cancelled: boolean }>> => {
    // Query cancellation not supported in web version yet
    return { success: true, data: { cancelled: false } }
  },

  schemas: async (
    config: ConnectionConfig,
    _forceRefresh?: boolean
  ): Promise<IpcResponse<DatabaseSchemaResponse>> => {
    const result = await apiCall<SchemaInfo[]>('/api/sql/db/schemas', config)
    if (!result.success) {
      return { success: false, error: result.error }
    }
    return { success: true, data: { schemas: result.data!, fetchedAt: Date.now() } }
  },

  invalidateSchemaCache: async (_config: ConnectionConfig): Promise<IpcResponse<void>> => {
    // No server-side cache in web version
    return { success: true, data: undefined }
  },

  execute: async (config: ConnectionConfig, batch: EditBatch): Promise<IpcResponse<EditResult>> => {
    return apiCall('/api/sql/db/execute', {
      config,
      operations: batch.operations,
      context: batch.context
    })
  },

  previewSql: async (
    batch: EditBatch,
    dbType?: string
  ): Promise<IpcResponse<Array<{ operationId: string; sql: string }>>> => {
    const result = await apiCall<string[]>('/api/sql/db/preview-sql', {
      operations: batch.operations,
      context: batch.context,
      dbType: dbType || 'postgresql'
    })

    if (!result.success) {
      return { success: false, error: result.error }
    }

    // Map to format expected by frontend
    const previews = batch.operations.map((op, i) => ({
      operationId: op.id,
      sql: result.data![i]
    }))

    return { success: true, data: previews }
  },

  explain: async (
    config: ConnectionConfig,
    query: string,
    analyze: boolean
  ): Promise<IpcResponse<{ plan: unknown; durationMs: number }>> => {
    return apiCall('/api/sql/db/explain', { config, sql: query, analyze })
  }
}

// DDL operations (API calls)
const ddl = {
  createTable: async (
    config: ConnectionConfig,
    definition: TableDefinition
  ): Promise<IpcResponse<DDLResult>> => {
    return apiCall('/api/sql/ddl/create-table', { config, definition })
  },

  alterTable: async (
    config: ConnectionConfig,
    batch: AlterTableBatch
  ): Promise<IpcResponse<DDLResult>> => {
    return apiCall('/api/sql/ddl/alter-table', { config, batch })
  },

  dropTable: async (
    config: ConnectionConfig,
    schema: string,
    table: string,
    cascade?: boolean
  ): Promise<IpcResponse<DDLResult>> => {
    return apiCall('/api/sql/ddl/drop-table', { config, schema, table, cascade })
  },

  getTableDDL: async (
    config: ConnectionConfig,
    schema: string,
    table: string
  ): Promise<IpcResponse<TableDefinition>> => {
    return apiCall('/api/sql/ddl/get-table-ddl', { config, schema, table })
  },

  getSequences: async (config: ConnectionConfig): Promise<IpcResponse<SequenceInfo[]>> => {
    return apiCall('/api/sql/ddl/get-sequences', config)
  },

  getTypes: async (config: ConnectionConfig): Promise<IpcResponse<CustomTypeInfo[]>> => {
    return apiCall('/api/sql/ddl/get-types', config)
  },

  previewDDL: async (definition: TableDefinition): Promise<IpcResponse<string>> => {
    const result = await apiCall<{ sql: string }>('/api/sql/ddl/preview-ddl', {
      type: 'create',
      definition,
      dbType: 'postgresql' // Default to PostgreSQL
    })
    if (!result.success) {
      return { success: false, error: result.error }
    }
    return { success: true, data: result.data!.sql }
  }
}

// Menu events - using keyboard shortcuts
type MenuCallback = () => void
const menuListeners = new Map<string, Set<MenuCallback>>()

function setupKeyboardShortcuts(): void {
  if (typeof window === 'undefined') return

  window.addEventListener('keydown', (e) => {
    const isMod = e.metaKey || e.ctrlKey

    // Cmd/Ctrl+T - New tab
    if (isMod && e.key === 't') {
      e.preventDefault()
      menuListeners.get('new-tab')?.forEach((cb) => cb())
    }

    // Cmd/Ctrl+W - Close tab
    if (isMod && e.key === 'w') {
      e.preventDefault()
      menuListeners.get('close-tab')?.forEach((cb) => cb())
    }

    // Cmd/Ctrl+Enter - Execute query
    if (isMod && e.key === 'Enter') {
      menuListeners.get('execute-query')?.forEach((cb) => cb())
    }

    // Shift+Alt+F - Format SQL
    if (e.shiftKey && e.altKey && e.key === 'f') {
      e.preventDefault()
      menuListeners.get('format-sql')?.forEach((cb) => cb())
    }

    // Cmd/Ctrl+K - Clear results
    if (isMod && e.key === 'k') {
      e.preventDefault()
      menuListeners.get('clear-results')?.forEach((cb) => cb())
    }

    // Cmd/Ctrl+B - Toggle sidebar
    if (isMod && e.key === 'b') {
      e.preventDefault()
      menuListeners.get('toggle-sidebar')?.forEach((cb) => cb())
    }
  })
}

// Initialize keyboard shortcuts
if (typeof window !== 'undefined') {
  setupKeyboardShortcuts()
}

function addMenuListener(event: string, callback: MenuCallback): () => void {
  if (!menuListeners.has(event)) {
    menuListeners.set(event, new Set())
  }
  menuListeners.get(event)!.add(callback)

  return () => {
    menuListeners.get(event)?.delete(callback)
  }
}

const menu = {
  onNewTab: (callback: MenuCallback) => addMenuListener('new-tab', callback),
  onCloseTab: (callback: MenuCallback) => addMenuListener('close-tab', callback),
  onExecuteQuery: (callback: MenuCallback) => addMenuListener('execute-query', callback),
  onFormatSql: (callback: MenuCallback) => addMenuListener('format-sql', callback),
  onClearResults: (callback: MenuCallback) => addMenuListener('clear-results', callback),
  onToggleSidebar: (callback: MenuCallback) => addMenuListener('toggle-sidebar', callback)
}

// License - always valid for web version
const license = {
  check: async (): Promise<IpcResponse<{ isValid: boolean; type: string }>> => {
    return { success: true, data: { isValid: true, type: 'pro' } }
  },
  activate: async (): Promise<IpcResponse<{ isValid: boolean; type: string }>> => {
    return { success: true, data: { isValid: true, type: 'pro' } }
  },
  deactivate: async (): Promise<IpcResponse<void>> => {
    return { success: true, data: undefined }
  },
  activateOffline: async (): Promise<IpcResponse<{ isValid: boolean; type: string }>> => {
    return { success: true, data: { isValid: true, type: 'pro' } }
  },
  openCustomerPortal: async (): Promise<IpcResponse<void>> => {
    return { success: true, data: undefined }
  }
}

// Saved queries (localStorage)
const savedQueries = {
  list: async (): Promise<IpcResponse<SavedQuery[]>> => {
    const queries = getFromStorage<SavedQuery[]>(STORAGE_KEYS.SAVED_QUERIES, [])
    return { success: true, data: queries }
  },

  add: async (query: SavedQuery): Promise<IpcResponse<SavedQuery>> => {
    const queries = getFromStorage<SavedQuery[]>(STORAGE_KEYS.SAVED_QUERIES, [])
    const newQuery = { ...query, id: query.id || generateId(), createdAt: Date.now(), updatedAt: Date.now() }
    queries.push(newQuery)
    setToStorage(STORAGE_KEYS.SAVED_QUERIES, queries)
    return { success: true, data: newQuery }
  },

  update: async (id: string, updates: Partial<SavedQuery>): Promise<IpcResponse<SavedQuery>> => {
    const queries = getFromStorage<SavedQuery[]>(STORAGE_KEYS.SAVED_QUERIES, [])
    const index = queries.findIndex((q) => q.id === id)
    if (index === -1) {
      return { success: false, error: 'Query not found' }
    }
    queries[index] = { ...queries[index], ...updates }
    setToStorage(STORAGE_KEYS.SAVED_QUERIES, queries)
    return { success: true, data: queries[index] }
  },

  delete: async (id: string): Promise<IpcResponse<void>> => {
    const queries = getFromStorage<SavedQuery[]>(STORAGE_KEYS.SAVED_QUERIES, [])
    const filtered = queries.filter((q) => q.id !== id)
    setToStorage(STORAGE_KEYS.SAVED_QUERIES, filtered)
    return { success: true, data: undefined }
  },

  incrementUsage: async (id: string): Promise<IpcResponse<SavedQuery>> => {
    const queries = getFromStorage<SavedQuery[]>(STORAGE_KEYS.SAVED_QUERIES, [])
    const index = queries.findIndex((q) => q.id === id)
    if (index === -1) {
      return { success: false, error: 'Query not found' }
    }
    queries[index].usageCount = (queries[index].usageCount || 0) + 1
    queries[index].lastUsedAt = Date.now()
    setToStorage(STORAGE_KEYS.SAVED_QUERIES, queries)
    return { success: true, data: queries[index] }
  },

  onOpenDialog: (_callback: MenuCallback): (() => void) => {
    // Not applicable for web
    return () => {}
  }
}

// Updater - not applicable for web
const updater = {
  onUpdateAvailable: (_callback: (version: string) => void) => () => {},
  onUpdateDownloaded: (_callback: (version: string) => void) => () => {},
  onDownloadProgress: (_callback: (percent: number) => void) => () => {},
  onError: (_callback: (message: string) => void) => () => {},
  quitAndInstall: () => {}
}

// AI Assistant
type ChatHistoryStore = Record<string, ChatSession[]>

const ai = {
  getConfig: async (): Promise<IpcResponse<AIConfig | null>> => {
    const multiConfig = getFromStorage<AIMultiProviderConfig | null>(
      STORAGE_KEYS.AI_MULTI_PROVIDER_CONFIG,
      null
    )
    if (!multiConfig) return { success: true, data: null }

    const provider = multiConfig.activeProvider
    const providerConfig = multiConfig.providers[provider]

    if (provider !== 'ollama' && !providerConfig?.apiKey) {
      return { success: true, data: null }
    }

    return {
      success: true,
      data: {
        provider,
        apiKey: providerConfig?.apiKey,
        model: multiConfig.activeModels[provider] || DEFAULT_MODELS[provider],
        baseUrl: providerConfig?.baseUrl
      }
    }
  },

  setConfig: async (config: AIConfig): Promise<IpcResponse<void>> => {
    const multiConfig = getFromStorage<AIMultiProviderConfig>(
      STORAGE_KEYS.AI_MULTI_PROVIDER_CONFIG,
      { providers: {}, activeProvider: config.provider, activeModels: {} }
    )

    multiConfig.providers[config.provider] = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl
    }
    multiConfig.activeProvider = config.provider
    multiConfig.activeModels[config.provider] = config.model

    setToStorage(STORAGE_KEYS.AI_MULTI_PROVIDER_CONFIG, multiConfig)
    return { success: true, data: undefined }
  },

  clearConfig: async (): Promise<IpcResponse<void>> => {
    localStorage.removeItem(STORAGE_KEYS.AI_MULTI_PROVIDER_CONFIG)
    return { success: true, data: undefined }
  },

  validateKey: async (
    config: AIConfig
  ): Promise<IpcResponse<{ valid: boolean; error?: string }>> => {
    return apiCall('/api/sql/ai/validate-key', config)
  },

  chat: async (
    messages: AIMessage[],
    schemas: SchemaInfo[],
    dbType: string
  ): Promise<IpcResponse<AIChatResponse>> => {
    // Get current AI config
    const configResult = await ai.getConfig()
    if (!configResult.success || !configResult.data) {
      return { success: false, error: 'AI not configured' }
    }

    return apiCall('/api/sql/ai/chat', {
      config: configResult.data,
      messages,
      schemas,
      dbType
    })
  },

  // Chat history (localStorage)
  getChatHistory: async (connectionId: string): Promise<IpcResponse<StoredChatMessage[]>> => {
    const sessions = ai.getSessionsSync(connectionId)
    if (sessions.length === 0) return { success: true, data: [] }
    return { success: true, data: sessions[0]?.messages || [] }
  },

  saveChatHistory: async (
    connectionId: string,
    messages: StoredChatMessage[]
  ): Promise<IpcResponse<void>> => {
    const sessions = ai.getSessionsSync(connectionId)
    if (sessions.length === 0) {
      const session = ai.createSessionSync(connectionId)
      ai.updateSessionSync(connectionId, session.id, { messages })
    } else {
      ai.updateSessionSync(connectionId, sessions[0].id, { messages })
    }
    return { success: true, data: undefined }
  },

  clearChatHistory: async (connectionId: string): Promise<IpcResponse<void>> => {
    const history = getFromStorage<ChatHistoryStore>(STORAGE_KEYS.CHAT_HISTORY, {})
    delete history[connectionId]
    setToStorage(STORAGE_KEYS.CHAT_HISTORY, history)
    return { success: true, data: undefined }
  },

  // Session-based API
  getSessions: async (connectionId: string): Promise<IpcResponse<ChatSession[]>> => {
    return { success: true, data: ai.getSessionsSync(connectionId) }
  },

  getSession: async (
    connectionId: string,
    sessionId: string
  ): Promise<IpcResponse<ChatSession | null>> => {
    const sessions = ai.getSessionsSync(connectionId)
    const session = sessions.find((s) => s.id === sessionId) || null
    return { success: true, data: session }
  },

  createSession: async (connectionId: string, title?: string): Promise<IpcResponse<ChatSession>> => {
    const session = ai.createSessionSync(connectionId, title)
    return { success: true, data: session }
  },

  updateSession: async (
    connectionId: string,
    sessionId: string,
    updates: { messages?: StoredChatMessage[]; title?: string }
  ): Promise<IpcResponse<ChatSession | null>> => {
    const session = ai.updateSessionSync(connectionId, sessionId, updates)
    return { success: true, data: session }
  },

  deleteSession: async (connectionId: string, sessionId: string): Promise<IpcResponse<boolean>> => {
    const history = getFromStorage<ChatHistoryStore>(STORAGE_KEYS.CHAT_HISTORY, {})
    const sessions = history[connectionId] || []
    const filtered = sessions.filter((s) => s.id !== sessionId)
    history[connectionId] = filtered
    setToStorage(STORAGE_KEYS.CHAT_HISTORY, history)
    return { success: true, data: true }
  },

  // Multi-provider configuration
  getMultiProviderConfig: async (): Promise<IpcResponse<AIMultiProviderConfig | null>> => {
    const config = getFromStorage<AIMultiProviderConfig | null>(
      STORAGE_KEYS.AI_MULTI_PROVIDER_CONFIG,
      null
    )
    return { success: true, data: config }
  },

  setMultiProviderConfig: async (
    config: AIMultiProviderConfig | null
  ): Promise<IpcResponse<void>> => {
    if (config) {
      setToStorage(STORAGE_KEYS.AI_MULTI_PROVIDER_CONFIG, config)
    } else {
      localStorage.removeItem(STORAGE_KEYS.AI_MULTI_PROVIDER_CONFIG)
    }
    return { success: true, data: undefined }
  },

  getProviderConfig: async (provider: AIProvider): Promise<IpcResponse<AIProviderConfig | null>> => {
    const config = getFromStorage<AIMultiProviderConfig | null>(
      STORAGE_KEYS.AI_MULTI_PROVIDER_CONFIG,
      null
    )
    return { success: true, data: config?.providers[provider] || null }
  },

  setProviderConfig: async (
    provider: AIProvider,
    providerConfig: AIProviderConfig
  ): Promise<IpcResponse<void>> => {
    const config = getFromStorage<AIMultiProviderConfig>(STORAGE_KEYS.AI_MULTI_PROVIDER_CONFIG, {
      providers: {},
      activeProvider: provider,
      activeModels: {}
    })
    config.providers[provider] = providerConfig
    setToStorage(STORAGE_KEYS.AI_MULTI_PROVIDER_CONFIG, config)
    return { success: true, data: undefined }
  },

  removeProviderConfig: async (provider: AIProvider): Promise<IpcResponse<void>> => {
    const config = getFromStorage<AIMultiProviderConfig | null>(
      STORAGE_KEYS.AI_MULTI_PROVIDER_CONFIG,
      null
    )
    if (config) {
      delete config.providers[provider]
      delete config.activeModels[provider]
      if (config.activeProvider === provider) {
        const remaining = Object.keys(config.providers) as AIProvider[]
        config.activeProvider = remaining[0] || 'openai'
      }
      setToStorage(STORAGE_KEYS.AI_MULTI_PROVIDER_CONFIG, config)
    }
    return { success: true, data: undefined }
  },

  setActiveProvider: async (provider: AIProvider): Promise<IpcResponse<void>> => {
    const config = getFromStorage<AIMultiProviderConfig | null>(
      STORAGE_KEYS.AI_MULTI_PROVIDER_CONFIG,
      null
    )
    if (config) {
      config.activeProvider = provider
      setToStorage(STORAGE_KEYS.AI_MULTI_PROVIDER_CONFIG, config)
    }
    return { success: true, data: undefined }
  },

  setActiveModel: async (provider: AIProvider, model: string): Promise<IpcResponse<void>> => {
    const config = getFromStorage<AIMultiProviderConfig | null>(
      STORAGE_KEYS.AI_MULTI_PROVIDER_CONFIG,
      null
    )
    if (config) {
      config.activeModels[provider] = model
      setToStorage(STORAGE_KEYS.AI_MULTI_PROVIDER_CONFIG, config)
    }
    return { success: true, data: undefined }
  },

  // Sync helpers for internal use
  getSessionsSync: (connectionId: string): ChatSession[] => {
    const history = getFromStorage<ChatHistoryStore>(STORAGE_KEYS.CHAT_HISTORY, {})
    return history[connectionId] || []
  },

  createSessionSync: (connectionId: string, title?: string): ChatSession => {
    const history = getFromStorage<ChatHistoryStore>(STORAGE_KEYS.CHAT_HISTORY, {})
    const now = new Date().toISOString()
    const session: ChatSession = {
      id: generateId(),
      title: title || 'New Chat',
      messages: [],
      createdAt: now,
      updatedAt: now
    }
    const sessions = history[connectionId] || []
    sessions.unshift(session)
    history[connectionId] = sessions
    setToStorage(STORAGE_KEYS.CHAT_HISTORY, history)
    return session
  },

  updateSessionSync: (
    connectionId: string,
    sessionId: string,
    updates: { messages?: StoredChatMessage[]; title?: string }
  ): ChatSession | null => {
    const history = getFromStorage<ChatHistoryStore>(STORAGE_KEYS.CHAT_HISTORY, {})
    const sessions = history[connectionId] || []
    const index = sessions.findIndex((s) => s.id === sessionId)
    if (index === -1) return null

    const session = sessions[index]
    if (updates.messages !== undefined) {
      session.messages = updates.messages
      if (session.title === 'New Chat' && updates.messages.length > 0) {
        const firstUser = updates.messages.find((m) => m.role === 'user')
        if (firstUser) {
          const content = firstUser.content.trim()
          session.title = content.length > 40 ? content.substring(0, 40) + '...' : content
        }
      }
    }
    if (updates.title !== undefined) {
      session.title = updates.title
    }
    session.updatedAt = new Date().toISOString()

    sessions[index] = session
    history[connectionId] = sessions
    setToStorage(STORAGE_KEYS.CHAT_HISTORY, history)
    return session
  }
}

// Export the API object
export const api = {
  connections,
  db,
  ddl,
  menu,
  license,
  savedQueries,
  updater,
  ai
}

export type Api = typeof api
