"use client"

/**
 * Voice v9 MASPane - March 2, 2026.
 * Displays MAS task updates, tool calls, agent activity for the v9 session.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Bot, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"

interface MASUpdate {
  id: string
  type: "tool" | "agent" | "task"
  name?: string
  message: string
  status?: string
  timestamp?: Date | string
}

interface MASPaneProps {
  updates: MASUpdate[]
  maxHeight?: string
  className?: string
}

export function MASPane({
  updates,
  maxHeight = "200px",
  className,
}: MASPaneProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-4 w-4" />
          MAS
          {updates.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {updates.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea style={{ maxHeight }} className="rounded border p-2">
          <div className="space-y-2 text-sm">
            {updates.map((u) => (
              <div
                key={u.id}
                className="flex items-start gap-2 rounded px-2 py-1 bg-muted/50"
              >
                {u.type === "tool" ? (
                  <Wrench className="h-3 w-3 mt-0.5 shrink-0" />
                ) : (
                  <Bot className="h-3 w-3 mt-0.5 shrink-0" />
                )}
                <div>
                  {u.name && (
                    <span className="text-xs font-medium">{u.name} </span>
                  )}
                  <span className="text-muted-foreground">{u.message}</span>
                  {u.status && (
                    <Badge variant="outline" className="ml-1 text-[10px]">
                      {u.status}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            {updates.length === 0 && (
              <p className="text-muted-foreground text-xs">No MAS updates yet</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
