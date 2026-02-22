import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface DeviceStatusBadgeProps {
  status?: string
}

const STATUS_STYLES: Record<string, string> = {
  online: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  stale: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  offline: "bg-rose-500/15 text-rose-500 border-rose-500/30",
}

export function DeviceStatusBadge({ status }: DeviceStatusBadgeProps) {
  const normalized = status?.toLowerCase() || "offline"
  const style = STATUS_STYLES[normalized] || STATUS_STYLES.offline

  return (
    <Badge
      variant="outline"
      className={cn("capitalize", style)}
    >
      {normalized}
    </Badge>
  )
}
