import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DeviceStatusBadge } from "@/components/iot/device-status-badge"

interface TelemetryCardProps {
  deviceId: string
  deviceName?: string
  status?: string
  telemetry?: Record<string, any>
  lastUpdated?: string
}

const METRIC_LABELS = [
  { key: "temperature", label: "Temp", unit: "°C" },
  { key: "humidity", label: "Humidity", unit: "%" },
  { key: "pressure", label: "Pressure", unit: "hPa" },
  { key: "iaq", label: "IAQ", unit: "" },
]

function formatValue(value: unknown) {
  if (typeof value === "number") return value.toFixed(2)
  if (typeof value === "string" && value.trim()) return value
  return "—"
}

export function TelemetryCard({
  deviceId,
  deviceName,
  status,
  telemetry,
  lastUpdated,
}: TelemetryCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">
              {deviceName || deviceId}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{deviceId}</p>
          </div>
          <DeviceStatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 text-sm">
        {METRIC_LABELS.map((metric) => (
          <div key={metric.key} className="rounded-md border px-3 py-2">
            <div className="text-xs text-muted-foreground">{metric.label}</div>
            <div className="text-base font-semibold">
              {formatValue(telemetry?.[metric.key])}
              {metric.unit ? (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  {metric.unit}
                </span>
              ) : null}
            </div>
          </div>
        ))}
        <div className="col-span-2 text-xs text-muted-foreground">
          {lastUpdated ? `Updated ${lastUpdated}` : "No telemetry available yet."}
        </div>
      </CardContent>
    </Card>
  )
}
