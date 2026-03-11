"use client"

/**
 * Voice v9 AudioControls - March 2, 2026.
 * Minimal audio controls for v9 mode. Bridge handles primary audio path.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Volume2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface AudioControlsProps {
  micActive?: boolean
  outputActive?: boolean
  onMicToggle?: () => void
  onOutputToggle?: () => void
  disabled?: boolean
  className?: string
}

export function AudioControls({
  micActive = false,
  outputActive = true,
  onMicToggle,
  onOutputToggle,
  disabled = false,
  className,
}: AudioControlsProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Audio</CardTitle>
      </CardHeader>
      <CardContent className="flex gap-2">
        {onMicToggle && (
          <Button
            variant={micActive ? "default" : "outline"}
            size="sm"
            onClick={onMicToggle}
            disabled={disabled}
          >
            {micActive ? (
              <Mic className="h-4 w-4 mr-1" />
            ) : (
              <MicOff className="h-4 w-4 mr-1" />
            )}
            Mic
          </Button>
        )}
        {onOutputToggle && (
          <Button
            variant={outputActive ? "default" : "outline"}
            size="sm"
            onClick={onOutputToggle}
            disabled={disabled}
          >
            <Volume2 className="h-4 w-4 mr-1" />
            Output
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
