"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ExternalLink, Grid3x3, Radar } from "lucide-react"

export type AnswerEmbedType = "crep" | "earth2" | "telemetry"

export interface AnswerEmbedPayload {
  type: AnswerEmbedType
  title?: string
  description?: string
  widgetType?: string
  href?: string
}

interface AnswerEmbedBlockProps {
  embed: AnswerEmbedPayload
  onFocusWidget?: (widgetType: string) => void
}

const DEFAULT_EMBEDS: Record<AnswerEmbedType, Required<Pick<AnswerEmbedPayload, "title" | "description" | "href">>> = {
  crep: {
    title: "CREP Live Layer",
    description: "Open live Common Relevant Environmental Picture data.",
    href: "/dashboard/crep",
  },
  earth2: {
    title: "Earth2 Simulation",
    description: "Open Earth2 prediction and simulation surfaces.",
    href: "/earth2",
  },
  telemetry: {
    title: "Device Telemetry",
    description: "Open live MycoBrain and device telemetry streams.",
    href: "/devices/mycobrain",
  },
}

export function AnswerEmbedBlock({ embed, onFocusWidget }: AnswerEmbedBlockProps) {
  const fallback = DEFAULT_EMBEDS[embed.type]
  const title = embed.title || fallback.title
  const description = embed.description || fallback.description
  const href = embed.href || fallback.href

  return (
    <div className="my-2 rounded-lg border border-border/60 bg-card/60 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Radar className="h-4 w-4 text-violet-400" />
        <Badge variant="outline" className="h-5 text-[10px] uppercase tracking-wide">
          Live Embed
        </Badge>
      </div>

      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {embed.widgetType && onFocusWidget ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className={cn("h-7 text-xs")}
            onClick={() => onFocusWidget(embed.widgetType!)}
          >
            <Grid3x3 className="mr-1 h-3 w-3" />
            Open Widget
          </Button>
        ) : null}

        <Button asChild type="button" size="sm" variant="outline" className="h-7 text-xs">
          <a href={href}>
            <ExternalLink className="mr-1 h-3 w-3" />
            Open Live Page
          </a>
        </Button>
      </div>
    </div>
  )
}

