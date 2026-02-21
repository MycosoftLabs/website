"use client"

import React from "react"
import { useNatureOSTool } from "@/components/natureos/tool-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export interface ToolViewportProps {
  toolId: string
  title: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
}

export function ToolViewport({ toolId, title, description, actions, children }: ToolViewportProps) {
  const { setActiveTool } = useNatureOSTool()

  React.useEffect(() => {
    setActiveTool({ id: toolId, name: title, description })
  }, [description, setActiveTool, title, toolId])

  return (
    <section className="flex min-h-dvh flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground md:text-3xl">{title}</h1>
          {description ? (
            <p className="text-sm text-muted-foreground sm:text-base">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </header>

      <Card className="flex-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Tool Workspace</CardTitle>
          <CardDescription>Connected to NatureOS, MAS, MINDEX, and MycoBrain telemetry.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">{children}</CardContent>
      </Card>
    </section>
  )
}
