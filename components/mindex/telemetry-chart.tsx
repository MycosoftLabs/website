"use client"

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface MINDEXTelemetryPoint {
  timestamp: string
  value: number
}

interface MINDEXTelemetryChartProps {
  title: string
  data: MINDEXTelemetryPoint[]
}

export function MINDEXTelemetryChart({ title, data }: MINDEXTelemetryChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="timestamp" hide />
            <YAxis width={40} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

