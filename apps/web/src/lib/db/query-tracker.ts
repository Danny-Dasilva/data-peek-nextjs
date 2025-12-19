/**
 * Query Tracker - tracks active queries and provides cancellation support
 *
 * Note: In a serverless environment, this tracker only works within the same
 * process. For true query cancellation across serverless invocations, you would
 * need external state (Redis, database, etc.)
 */

import type { Client } from 'pg'
import type { Connection } from 'mysql2/promise'
import type { Request as MSSQLRequest } from 'mssql'

/** Supported cancellable handle types */
export type CancellableHandle =
  | { type: 'postgresql'; client: Client }
  | { type: 'mysql'; connection: Connection }
  | { type: 'mssql'; request: MSSQLRequest }
  | { type: 'sqlite' } // SQLite is synchronous and cannot be cancelled

interface ActiveQuery {
  executionId: string
  handle: CancellableHandle
  startedAt: number
}

/** Map of execution ID to active query handles */
const activeQueries = new Map<string, ActiveQuery>()

/**
 * Register an active query for potential cancellation
 */
export function registerQuery(executionId: string, handle: CancellableHandle): void {
  activeQueries.set(executionId, {
    executionId,
    handle,
    startedAt: Date.now()
  })
  console.log(`[QueryTracker] Registered query ${executionId}`)
}

/**
 * Unregister a query (called when query completes)
 */
export function unregisterQuery(executionId: string): void {
  if (activeQueries.delete(executionId)) {
    console.log(`[QueryTracker] Unregistered query ${executionId}`)
  }
}

/**
 * Cancel an active query by execution ID
 * Returns true if cancelled, false if query not found
 */
export async function cancelQuery(
  executionId: string
): Promise<{ cancelled: boolean; error?: string }> {
  const query = activeQueries.get(executionId)
  if (!query) {
    return { cancelled: false, error: 'Query not found or already completed' }
  }

  console.log(`[QueryTracker] Cancelling query ${executionId}`)

  try {
    switch (query.handle.type) {
      case 'postgresql': {
        // PostgreSQL: end the client connection to abort the query
        await query.handle.client.end()
        break
      }
      case 'mysql': {
        // MySQL: destroy the connection to abort the query
        query.handle.connection.destroy()
        break
      }
      case 'mssql': {
        // MSSQL: cancel the specific request
        query.handle.request.cancel()
        break
      }
      case 'sqlite': {
        // SQLite with better-sqlite3 is synchronous - cannot cancel mid-query
        console.log(`[QueryTracker] SQLite query ${executionId} cannot be cancelled`)
        break
      }
    }

    activeQueries.delete(executionId)
    return { cancelled: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[QueryTracker] Error cancelling query ${executionId}:`, errorMessage)
    // Still remove from active queries even if cancellation had an error
    activeQueries.delete(executionId)
    return { cancelled: false, error: errorMessage }
  }
}

/**
 * Check if a query is currently active
 */
export function isQueryActive(executionId: string): boolean {
  return activeQueries.has(executionId)
}

/**
 * Get count of active queries
 */
export function getActiveQueryCount(): number {
  return activeQueries.size
}

/**
 * Generate a unique execution ID
 */
export function generateExecutionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}
