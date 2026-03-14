"use client"

/**
 * AvaniStatusBadge - Shows Avani governance status in the MYCA chat widget.
 * Displays whether Avani is active, the last verdict, and backend connectivity.
 *
 * Yin to MYCA's Yang — governance always visible alongside intelligence.
 */

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Shield, ShieldCheck, ShieldAlert, ShieldOff } from "lucide-react"
import { useOptionalAvani } from "@/contexts/avani-context"

interface AvaniStatusBadgeProps {
  className?: string
}

export function AvaniStatusBadge({ className }: AvaniStatusBadgeProps) {
  const avani = useOptionalAvani()

  // If no Avani provider, show nothing
  if (!avani) return null

  let label = "AVANI"
  let icon = <Shield className="h-3 w-3" />
  let badgeClass = "text-amber-500 border-amber-500/30 bg-amber-500/10"
  let title = "Avani governance active"

  if (!avani.active) {
    label = "AVANI off"
    icon = <ShieldOff className="h-3 w-3" />
    badgeClass = "text-muted-foreground/70 border-muted"
    title = "Avani governance inactive"
  } else if (avani.lastVerdict === "deny") {
    label = "AVANI alert"
    icon = <ShieldAlert className="h-3 w-3" />
    badgeClass = "text-red-500 border-red-500/30 bg-red-500/10"
    title = "Avani flagged last interaction"
  } else if (avani.lastVerdict === "allow_with_audit") {
    label = "AVANI audit"
    icon = <ShieldCheck className="h-3 w-3" />
    badgeClass = "text-yellow-500 border-yellow-500/30 bg-yellow-500/10"
    title = "Avani auditing last interaction"
  } else if (avani.backendConnected) {
    label = "AVANI"
    icon = <ShieldCheck className="h-3 w-3" />
    badgeClass = "text-amber-500 border-amber-500/30 bg-amber-500/10"
    title = "Avani governance active (backend connected)"
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[9px] h-5 px-1.5 min-h-[28px] flex items-center justify-center touch-manipulation",
        badgeClass,
        className
      )}
      title={title}
    >
      {icon}
      <span className="ml-1 truncate max-w-[60px]">{label}</span>
    </Badge>
  )
}
