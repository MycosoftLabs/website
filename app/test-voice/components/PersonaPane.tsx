"use client"

/**
 * Voice v9 PersonaPane - March 2, 2026.
 * Displays persona lock state and rewrite count.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { PersonaState } from "@/lib/voice-v9/types"
import { User } from "lucide-react"
import { cn } from "@/lib/utils"

interface PersonaPaneProps {
  state: PersonaState | null
  onRefresh?: () => void
  className?: string
}

export function PersonaPane({
  state,
  onRefresh,
  className,
}: PersonaPaneProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="h-4 w-4" />
          Persona Lock
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {state ? (
          <>
            <div className="text-sm">
              <span className="text-muted-foreground">Rewrites: </span>
              <span className="font-mono">{state.rewrite_count}</span>
            </div>
            {state.last_applied_at && (
              <div className="text-xs text-muted-foreground">
                Last: {new Date(state.last_applied_at).toLocaleTimeString()}
              </div>
            )}
          </>
        ) : (
          <p className="text-muted-foreground text-sm">No persona state</p>
        )}
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh}>
            Refresh
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
