"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface TelemetryChartProps {
  title: string
  data: Array<Record<string, any>>
  dataKey: string
}

export function TelemetryChart({ title, data, dataKey }: TelemetryChartProps) {
  if (!data.length) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        {title}: no historical data available yet.
      </div>
    )
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 text-sm font-semibold">{title}</div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey={dataKey} stroke="#4f46e5" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
