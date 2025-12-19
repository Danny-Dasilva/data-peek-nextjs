'use client'

import { cn } from '@/lib/utils'
import type { KPIWidgetConfig } from '@data-peek/shared'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface WidgetKPIProps {
  config: KPIWidgetConfig
  data: Record<string, unknown>[]
}

function formatMetricValue(
  value: unknown,
  format: KPIWidgetConfig['format'] = 'number'
): string {
  if (value === null || value === undefined) return 'N/A'

  const num = typeof value === 'number' ? value : parseFloat(String(value))
  if (isNaN(num)) return String(value)

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: num >= 1000000 ? 'compact' : 'standard',
        maximumFractionDigits: num >= 1000000 ? 1 : 2
      }).format(num)
    case 'percentage':
      return new Intl.NumberFormat('en-US', {
        style: 'percent',
        maximumFractionDigits: 1
      }).format(num / 100)
    case 'duration':
      if (num < 60) return `${num.toFixed(0)}s`
      if (num < 3600) return `${Math.floor(num / 60)}m ${Math.floor(num % 60)}s`
      return `${Math.floor(num / 3600)}h ${Math.floor((num % 3600) / 60)}m`
    default:
      return new Intl.NumberFormat('en-US', {
        notation: num >= 1000000 ? 'compact' : 'standard',
        maximumFractionDigits: num >= 1000000 ? 1 : 2
      }).format(num)
  }
}

export function WidgetKPI({ config, data }: WidgetKPIProps) {
  const { valueKey, format = 'number', trend } = config

  // Get the first row's value for the KPI
  const value = data.length > 0 ? data[0][valueKey] : null
  const formattedValue = formatMetricValue(value, format)

  const TrendIcon =
    trend?.direction === 'up'
      ? TrendingUp
      : trend?.direction === 'down'
        ? TrendingDown
        : Minus

  const trendColor =
    trend?.direction === 'up'
      ? 'text-emerald-500'
      : trend?.direction === 'down'
        ? 'text-red-500'
        : 'text-muted-foreground'

  return (
    <div className="flex h-full flex-col items-center justify-center p-4">
      <div className="text-3xl font-bold tracking-tight">{formattedValue}</div>

      {trend && (
        <div className={cn('mt-2 flex items-center gap-1 text-sm', trendColor)}>
          <TrendIcon className="size-4" />
          {trend.previousValue !== undefined && (
            <span className="font-medium">
              {formatMetricValue(
                Math.abs(
                  ((Number(value) - trend.previousValue) / trend.previousValue) * 100
                ),
                'number'
              )}
              %
            </span>
          )}
        </div>
      )}
    </div>
  )
}
