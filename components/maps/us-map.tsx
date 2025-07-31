"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface StateData {
  id: string
  name: string
  path: string
  devices?: number
}

interface USMapProps {
  className?: string
  onStateClick?: (stateId: string) => void
  stateData?: Record<string, { devices: number }>
}

// This is a simplified version of state paths - you can add more states as needed
const states: StateData[] = [
  {
    id: "CA",
    name: "California",
    path: "M144.5 382.5l-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8-0.3-0.8-0.8-1.8z",
  },
  {
    id: "NY",
    name: "New York",
    path: "M843.4 200.9l-0.5-0.7-1.3 0.3-0.4-0.3-0.6-0.4-0.7-0.3-0.6-0.4-0.7-0.3-0.6-0.4-0.7-0.3-0.6-0.4-0.7-0.3-0.6-0.4-0.7-0.3-0.6-0.4-0.7-0.3-0.6-0.4-0.7-0.3-0.6-0.4-0.7-0.3-0.6-0.4-0.7-0.3-0.6-0.4-0.7-0.3-0.6-0.4-0.7-0.3-0.6-0.4-0.7-0.3-0.6-0.4-0.7-0.3z",
  },
  {
    id: "TX",
    name: "Texas",
    path: "M462.3 427.5l-0.7-0.9-0.9-0.7-0.7-0.9-0.9-0.7-0.7-0.9-0.9-0.7-0.7-0.9-0.9-0.7-0.7-0.9-0.9-0.7-0.7-0.9-0.9-0.7-0.7-0.9-0.9-0.7-0.7-0.9-0.9-0.7-0.7-0.9-0.9-0.7-0.7-0.9-0.9-0.7-0.7-0.9-0.9-0.7-0.7-0.9-0.9-0.7z",
  },
  // Add more states as needed
]

export function USMap({ className, onStateClick, stateData = {} }: USMapProps) {
  const [activeState, setActiveState] = useState<string | null>(null)

  const handleStateClick = (stateId: string) => {
    setActiveState(stateId)
    onStateClick?.(stateId)
  }

  return (
    <Card className={className}>
      <div className="relative w-full aspect-[1.67/1] bg-background p-4">
        <TooltipProvider>
          <svg
            viewBox="0 0 959 593"
            className="w-full h-full"
            role="img"
            aria-label="Interactive map of the United States"
          >
            <g>
              {states.map((state) => (
                <Tooltip key={state.id}>
                  <TooltipTrigger asChild>
                    <path
                      id={state.id}
                      d={state.path}
                      className={`
                        transition-colors duration-200
                        ${
                          activeState === state.id
                            ? "fill-primary/70"
                            : stateData[state.id]?.devices
                              ? "fill-primary/40 hover:fill-primary/60"
                              : "fill-muted hover:fill-muted-foreground/20"
                        }
                        cursor-pointer
                      `}
                      onClick={() => handleStateClick(state.id)}
                      role="button"
                      aria-label={state.name}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <p className="font-medium">{state.name}</p>
                      {stateData[state.id]?.devices && (
                        <p className="text-xs text-muted-foreground">{stateData[state.id].devices} active devices</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </g>
          </svg>
        </TooltipProvider>
      </div>
    </Card>
  )
}
