'use client'

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts'
import type { ChartWidgetConfig } from '@data-peek/shared'
import { useMemo, useCallback } from 'react'

interface WidgetChartProps {
  config: ChartWidgetConfig
  data: Record<string, unknown>[]
}

const DEFAULT_COLORS = [
  'hsl(221, 83%, 53%)',
  'hsl(262, 83%, 58%)',
  'hsl(142, 71%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 84%, 60%)',
  'hsl(199, 89%, 48%)',
  'hsl(339, 90%, 51%)',
  'hsl(24, 95%, 53%)'
]

function detectDataType(values: unknown[]): 'number' | 'date' | 'string' {
  const sample = values.find((v) => v !== null && v !== undefined)
  if (typeof sample === 'number') return 'number'
  if (sample instanceof Date) return 'date'
  if (typeof sample === 'string') {
    if (!isNaN(Date.parse(sample)) && sample.match(/^\d{4}-\d{2}/)) {
      return 'date'
    }
  }
  return 'string'
}

function formatValue(value: unknown, type: 'number' | 'date' | 'string'): string {
  if (value === null || value === undefined) return 'N/A'
  if (type === 'number' && typeof value === 'number') {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }
  if (type === 'date') {
    const date = new Date(value as string | number | Date)
    return date.toLocaleDateString()
  }
  return String(value)
}

export function WidgetChart({ config, data }: WidgetChartProps) {
  const { chartType, xKey, yKeys, colors = DEFAULT_COLORS } = config

  const xDataType = useMemo(() => {
    const xValues = data.map((d) => d[xKey])
    return detectDataType(xValues)
  }, [data, xKey])

  const formatXAxis = useCallback(
    (value: unknown) => {
      if (xDataType === 'date') {
        const date = new Date(value as string)
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      }
      const str = String(value)
      return str.length > 10 ? str.slice(0, 10) + '...' : str
    },
    [xDataType]
  )

  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No data available
      </div>
    )
  }

  const commonProps = {
    data,
    margin: { top: 10, right: 10, left: 0, bottom: 0 }
  }

  return (
    <div className="h-full w-full min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        {chartType === 'bar' ? (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
            <XAxis
              dataKey={xKey}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatXAxis}
              tick={{ fontSize: 10 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => formatValue(v, 'number')}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            {yKeys.length > 1 && <Legend />}
            {yKeys.map((key, index) => (
              <Bar key={key} dataKey={key} fill={colors[index % colors.length]} radius={[2, 2, 0, 0]} />
            ))}
          </BarChart>
        ) : chartType === 'line' ? (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
            <XAxis
              dataKey={xKey}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatXAxis}
              tick={{ fontSize: 10 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => formatValue(v, 'number')}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            {yKeys.length > 1 && <Legend />}
            {yKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        ) : chartType === 'area' ? (
          <AreaChart {...commonProps}>
            <defs>
              {yKeys.map((key, index) => (
                <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors[index % colors.length]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={colors[index % colors.length]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
            <XAxis
              dataKey={xKey}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatXAxis}
              tick={{ fontSize: 10 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => formatValue(v, 'number')}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            {yKeys.length > 1 && <Legend />}
            {yKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                fill={`url(#fill-${key})`}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        ) : (
          <PieChart>
            <Pie
              data={data}
              dataKey={yKeys[0]}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              innerRadius="40%"
              outerRadius="80%"
              paddingAngle={2}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            <Legend />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
