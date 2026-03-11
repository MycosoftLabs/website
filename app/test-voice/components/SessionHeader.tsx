"use client"

/**
 * Voice v9 SessionHeader - March 2, 2026.
 * Shows session ID, connection status, and v9 mode indicator.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Server } from "lucide-react"
import { cn } from "@/lib/utils"

interface SessionHeaderProps {
  connected: boolean
  sessionId: string | null
  mode?: "v9" | "bridge"
  onRefresh?: () => void
  className?: string
}

export function SessionHeader({
  connected,
  sessionId,
  mode = "v9",
  onRefresh,
  className,
}: SessionHeaderProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Server className="h-4 w-4" />
          Session
          <Badge variant={mode === "v9" ? "default" : "secondary"} className="text-xs">
            {mode}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          <Activity
            className={cn(
              "h-4 w-4",
              connected ? "text-green-500" : "text-muted-foreground"
            )}
          />
          <span className="text-sm font-medium">
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
        {sessionId && (
          <div className="text-xs text-muted-foreground font-mono truncate">
            {sessionId.slice(0, 8)}...
          </div>
        )}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="text-xs text-primary hover:underline"
          >
            Refresh
          </button>
        )}
      </CardContent>
    </Card>
  )
}
