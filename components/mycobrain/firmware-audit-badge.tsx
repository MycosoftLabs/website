"use client"

import { Badge } from "@/components/ui/badge"
import {
  tierBadgeClass,
  tierLabel,
  type CompatibilityTier,
} from "@/lib/devices/firmware-compatibility"
import { cn } from "@/lib/utils"

interface FirmwareAuditBadgeProps {
  tier?: CompatibilityTier | string | null
  firmwareVersion?: string | null
  className?: string
}

export function FirmwareAuditBadge({
  tier,
  firmwareVersion,
  className,
}: FirmwareAuditBadgeProps) {
  const resolved = (tier || "unknown") as CompatibilityTier
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Badge variant="outline" className={cn("text-xs", tierBadgeClass(resolved))}>
        {tierLabel(resolved)}
      </Badge>
      {firmwareVersion ? (
        <span className="text-xs text-muted-foreground">{firmwareVersion}</span>
      ) : null}
    </div>
  )
}
