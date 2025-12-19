import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/lib/db/db-adapter'
import type { ConnectionConfig, QueryTelemetry, BenchmarkResult, TimingPhase } from '@data-peek/shared'

interface BenchmarkRequest {
  config: ConnectionConfig
  sql: string
  runCount: number
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const index = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))]
}

/**
 * Calculate standard deviation
 */
function stdDev(values: number[], mean: number): number {
  if (values.length < 2) return 0
  const squareDiffs = values.map((v) => Math.pow(v - mean, 2))
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length
  return Math.sqrt(avgSquareDiff)
}

/**
 * Create telemetry for a single query run
 * Note: In a web context, we can't measure TCP/auth phases directly
 * so we simulate with just execution and parse phases
 */
function createTelemetry(durationMs: number, rowCount: number): QueryTelemetry {
  // Estimate phase breakdown (simplified for web)
  const executionMs = durationMs * 0.7
  const parseMs = durationMs * 0.3

  const phases: TimingPhase[] = [
    { name: 'execution' as const, durationMs: executionMs, startOffset: 0 },
    { name: 'parse' as const, durationMs: parseMs, startOffset: executionMs }
  ]

  return {
    phases,
    totalDurationMs: durationMs,
    rowCount,
    connectionReused: true
  }
}

export async function POST(request: NextRequest) {
  try {
    const { config, sql, runCount }: BenchmarkRequest = await request.json()

    if (!sql || !sql.trim()) {
      return NextResponse.json(
        { success: false, error: 'SQL query is required' },
        { status: 400 }
      )
    }

    if (!runCount || runCount < 1 || runCount > 500) {
      return NextResponse.json(
        { success: false, error: 'Run count must be between 1 and 500' },
        { status: 400 }
      )
    }

    const adapter = getAdapter(config)

    // Run the query multiple times and collect timing
    const durations: number[] = []
    const telemetryRuns: QueryTelemetry[] = []
    let lastRowCount = 0

    for (let i = 0; i < runCount; i++) {
      const startTime = performance.now()
      const result = await adapter.queryMultiple(config, sql)
      const endTime = performance.now()
      const durationMs = endTime - startTime

      durations.push(durationMs)
      lastRowCount = result.results[0]?.rowCount ?? 0

      // Store first 10 telemetry runs for visualization
      if (telemetryRuns.length < 10) {
        telemetryRuns.push(createTelemetry(durationMs, lastRowCount))
      }
    }

    // Sort durations for percentile calculation
    const sortedDurations = [...durations].sort((a, b) => a - b)
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length

    // Calculate phase statistics (simplified for web)
    const phaseStats: Record<string, { avg: number; p90: number; p95: number; p99: number }> = {
      execution: {
        avg: avg * 0.7,
        p90: percentile(sortedDurations, 90) * 0.7,
        p95: percentile(sortedDurations, 95) * 0.7,
        p99: percentile(sortedDurations, 99) * 0.7
      },
      parse: {
        avg: avg * 0.3,
        p90: percentile(sortedDurations, 90) * 0.3,
        p95: percentile(sortedDurations, 95) * 0.3,
        p99: percentile(sortedDurations, 99) * 0.3
      }
    }

    const benchmarkResult: BenchmarkResult = {
      runCount,
      stats: {
        min: sortedDurations[0],
        max: sortedDurations[sortedDurations.length - 1],
        avg,
        p90: percentile(sortedDurations, 90),
        p95: percentile(sortedDurations, 95),
        p99: percentile(sortedDurations, 99),
        stdDev: stdDev(durations, avg)
      },
      phaseStats,
      telemetryRuns
    }

    return NextResponse.json({
      success: true,
      data: benchmarkResult
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Benchmark failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
