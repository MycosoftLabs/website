"use client"

/**
 * Voice v9 SyncPane - March 2, 2026.
 * Displays truth mirror / UI sync status.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface InterruptState {
  is_speaking: boolean
  has_interrupted_draft: boolean
  barge_in_count: number
  state: string
}

interface SyncPaneProps {
  interruptState?: InterruptState | null
  lastSyncAt?: Date | string | null
  inSync?: boolean
  className?: string
}

export function SyncPane({
  interruptState,
  lastSyncAt,
  inSync = true,
  className,
}: SyncPaneProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <RefreshCw className="h-4 w-4" />
          Sync
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant={inSync ? "default" : "secondary"}>
            {inSync ? "In sync" : "Stale"}
          </Badge>
        </div>
        {lastSyncAt && (
          <div className="text-xs text-muted-foreground">
            {new Date(lastSyncAt).toLocaleTimeString()}
          </div>
        )}
        {interruptState && (
          <div className="space-y-1 text-xs">
            <div>
              <span className="text-muted-foreground">Speaking: </span>
              {interruptState.is_speaking ? "Yes" : "No"}
            </div>
            <div>
              <span className="text-muted-foreground">Barge-ins: </span>
              {interruptState.barge_in_count}
            </div>
            {interruptState.has_interrupted_draft && (
              <Badge variant="outline">Interrupted draft</Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
