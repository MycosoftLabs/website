"use client"

import { useState } from "react"
import { Mic, MicOff } from "lucide-react"
import { VesselBadge } from "./VesselBadge"

interface VoiceInteractionProps {
  sessionId: string
  vesselStage: string
  enabled?: boolean
}

/**
 * Voice input placeholder. Full voice integration requires PersonaPlex/Moshi.
 * Shows UI and falls back to text-only messaging instruction.
 * Created: March 4, 2026
 */
export function VoiceInteraction({
  sessionId,
  vesselStage,
  enabled = false,
}: VoiceInteractionProps) {
  const [recording, setRecording] = useState(false)

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <VesselBadge stage={vesselStage} />
        <span className="text-sm text-gray-400">Voice interaction</span>
      </div>
      {enabled ? (
        <button
          type="button"
          onClick={() => setRecording(!recording)}
          className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 min-h-[44px] transition-colors"
        >
          {recording ? (
            <>
              <MicOff className="h-5 w-5" />
              Stop recording
            </>
          ) : (
            <>
              <Mic className="h-5 w-5" />
              Start voice input
            </>
          )}
        </button>
      ) : (
        <p className="text-sm text-gray-500">
          Voice input requires PersonaPlex/Moshi to be running. Use the chat below for text-based
          training.
        </p>
      )}
    </div>
  )
}
