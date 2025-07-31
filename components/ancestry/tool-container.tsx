"use client"

import type React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ToolContainerProps {
  title: string
  description: string
  children: React.ReactNode
}

export function ToolContainer({ title, description, children }: ToolContainerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="mt-4">{children}</div>
      </CardContent>
    </Card>
  )
}
