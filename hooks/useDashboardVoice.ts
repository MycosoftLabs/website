"use client"

import { useEffect, useCallback } from "react"
import { useVoiceChat } from "./useVoiceChat"
import { parseCommand } from "@/lib/voice/command-parser"

export type DashboardType = "ai-studio" | "earth-sim" | "topology" | "natureos" | "crep" | "mindex"

export interface DashboardVoiceHandlers {
  // Navigation
  onNavigateTo?: (view: string) => void
  onSelectTab?: (tab: string) => void
  
  // Actions
  onRefresh?: () => void
  onCreateAgent?: () => void
  onSpawnAgent?: (type: string) => void
  onToggleFullscreen?: () => void
  
  // Data
  onSearch?: (query: string) => void
  onFilter?: (filter: string, value?: string) => void
  onClearFilters?: () => void
  
  // Specific dashboard actions
  onShowTopology?: () => void
  onShowAgents?: () => void
  onShowWorkflows?: () => void
  onShowSystem?: () => void
  
  // Earth Sim specific
  onPlaySimulation?: () => void
  onPauseSimulation?: () => void
  onSetTimeScale?: (scale: number) => void
  
  // Voice feedback
  onSpeakResponse?: (text: string) => void
}

export interface UseDashboardVoiceOptions {
  dashboard: DashboardType
  handlers?: DashboardVoiceHandlers
  autoStart?: boolean
}

export interface UseDashboardVoiceReturn {
  isListening: boolean
  isSpeaking: boolean
  transcript: string
  startListening: () => void
  stopListening: () => void
  toggleListening: () => void
}

// Dashboard-specific command patterns
const DASHBOARD_COMMANDS: Record<DashboardType, Record<string, string>> = {
  "ai-studio": {
    "show command": "command",
    "show agents": "agents",
    "show topology": "topology",
    "show activity": "activity",
    "show workflows": "workflows",
    "show system": "system",
    "create agent": "createAgent",
    "spawn agent": "spawnAgent",
    "refresh": "refresh",
    "refresh data": "refresh",
    "fullscreen": "fullscreen",
  },
  "earth-sim": {
    "play": "play",
    "start simulation": "play",
    "pause": "pause",
    "stop simulation": "pause",
    "speed up": "speedUp",
    "slow down": "slowDown",
    "reset time": "resetTime",
    "show weather": "showWeather",
    "hide weather": "hideWeather",
    "fullscreen": "fullscreen",
  },
  "topology": {
    "show all": "showAll",
    "hide inactive": "hideInactive",
    "show connections": "showConnections",
    "hide connections": "hideConnections",
    "show labels": "showLabels",
    "hide labels": "hideLabels",
    "reset layout": "resetLayout",
    "spawn agent": "spawnAgent",
    "fullscreen": "fullscreen",
  },
  "natureos": {
    "go to apps": "apps",
    "go to ai": "ai",
    "go to development": "development",
    "go to infrastructure": "infrastructure",
    "go to platform": "platform",
    "open mindex": "mindex",
    "open devices": "devices",
    "open storage": "storage",
    "refresh": "refresh",
  },
  "crep": {
    "show map": "showMap",
    "hide map": "hideMap",
    "show globe": "showGlobe",
    "2d view": "2dView",
    "3d view": "3dView",
    "track mode": "trackMode",
    "overview mode": "overviewMode",
  },
  "mindex": {
    "show species": "species",
    "show observations": "observations",
    "show devices": "devices",
    "show telemetry": "telemetry",
    "search": "search",
    "filter": "filter",
    "clear filters": "clearFilters",
  },
}

export function useDashboardVoice(options: UseDashboardVoiceOptions): UseDashboardVoiceReturn {
  const { dashboard, handlers, autoStart = false } = options
  
  // Build command handlers from dashboard-specific patterns
  const commandHandlers: Record<string, () => void> = {}
  const patterns = DASHBOARD_COMMANDS[dashboard] || {}
  
  for (const [phrase, action] of Object.entries(patterns)) {
    commandHandlers[phrase] = () => {
      switch (action) {
        case "refresh":
          handlers?.onRefresh?.()
          break
        case "createAgent":
          handlers?.onCreateAgent?.()
          break
        case "spawnAgent":
          handlers?.onSpawnAgent?.("default")
          break
        case "fullscreen":
          handlers?.onToggleFullscreen?.()
          break
        case "play":
          handlers?.onPlaySimulation?.()
          break
        case "pause":
          handlers?.onPauseSimulation?.()
          break
        case "clearFilters":
          handlers?.onClearFilters?.()
          break
        default:
          // Check if it's a tab/view navigation
          if (["command", "agents", "topology", "activity", "workflows", "system",
               "apps", "ai", "development", "infrastructure", "platform",
               "species", "observations", "devices", "telemetry"].includes(action)) {
            handlers?.onSelectTab?.(action)
          } else {
            handlers?.onNavigateTo?.(action)
          }
      }
    }
  }
  
  const voice = useVoiceChat({
    autoConnect: autoStart,
    handlers: commandHandlers,
    onResponse: (response) => {
      handlers?.onSpeakResponse?.(response)
    },
  })
  
  // Process transcript for commands not in the static handlers
  useEffect(() => {
    if (voice.transcript) {
      const command = parseCommand(voice.transcript)
      
      if (command.type === "query") {
        // Forward to MYCA
        voice.sendMessage(voice.transcript)
      } else if (command.type === "action") {
        switch (command.action) {
          case "spawnAgent":
            handlers?.onSpawnAgent?.(command.params.type as string)
            break
          case "refresh":
            handlers?.onRefresh?.()
            break
        }
      }
    }
  }, [voice.transcript])
  
  return {
    isListening: voice.isListening,
    isSpeaking: voice.isSpeaking,
    transcript: voice.transcript,
    startListening: voice.startListening,
    stopListening: voice.stopListening,
    toggleListening: voice.toggleListening,
  }
}
