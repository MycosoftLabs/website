"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { 
  PersonaPlexClient, 
  createMYCAClient, 
  AudioStats, 
  ConnectionStatus,
  MYCA_PERSONAPLEX_PROMPT 
} from "@/lib/voice/personaplex-client"

/**
 * PersonaPlex Hook v2.0 - Separation of Concerns Refactor
 * 
 * ARCHITECTURE PRINCIPLE: This hook handles I/O ONLY.
 * All business logic (memory, n8n, agent routing) is delegated to the Voice Orchestrator.
 * 
 * The hook is responsible for:
 * - WebSocket connection management to PersonaPlex
 * - Audio level monitoring (mic/agent visualization)
 * - Transcript state management
 * - Sending transcripts to the orchestrator (single entry point)
 * - Stats aggregation
 * - UI state (status, console messages)
 * 
 * The hook does NOT:
 * - Call memory APIs directly
 * - Trigger n8n workflows directly
 * - Make routing decisions
 * - Call MAS agents directly
 * 
 * All decisions are made by: /api/mas/voice/orchestrator
 */

interface ConsoleMessage {
  timestamp: Date
  type: "info" | "warn" | "error" | "debug"
  message: string
}

/**
 * Response from the Voice Orchestrator API
 * Contains the response text plus transparency about what actions were taken
 */
export interface OrchestratorResponse {
  conversation_id: string
  response_text: string
  audio_base64?: string
  audio_mime?: string
  agent?: string
  routed_to?: string
  requires_confirmation?: boolean
  confirmation_prompt?: string
  
  // Action transparency - what the orchestrator did
  actions?: {
    memory_saved?: boolean
    workflow_executed?: string
    agent_routed?: string
    confirmation_required?: boolean
  }
  
  // Telemetry
  latency_ms?: number
  rtf?: number
  
  // NLQ data
  nlq_data?: unknown
  nlq_actions?: unknown
  nlq_sources?: unknown
}

export interface UsePersonaPlexOptions {
  serverUrl?: string
  voicePrompt?: string              // Voice prompt name (validated server-side)
  voicePromptHash?: string          // Optional: SHA-256 hash for security validation
  textPrompt?: string
  autoConnect?: boolean
  conversationId?: string           // Session tracking
  
  // Orchestrator endpoint (single point of entry for all business logic)
  orchestratorUrl?: string
  
  // Callbacks
  onTranscript?: (text: string) => void
  onResponse?: (response: OrchestratorResponse) => void
  onError?: (error: string) => void
}

export interface UsePersonaPlexReturn {
  // Connection
  connect: () => Promise<void>
  disconnect: () => void
  isConnected: boolean
  status: ConnectionStatus
  
  // Audio
  micLevel: number
  agentLevel: number
  stats: AudioStats
  
  // Text
  transcript: string
  lastResponse: OrchestratorResponse | null
  
  // Console
  consoleMessages: ConsoleMessage[]
  clearConsole: () => void
  
  // Single entry point for sending to orchestrator
  // This is the ONLY way to interact with the backend from this hook
  sendToOrchestrator: (message: string) => Promise<OrchestratorResponse>
  
  // Conversation tracking
  conversationId: string
}

export function usePersonaPlex(options: UsePersonaPlexOptions = {}): UsePersonaPlexReturn {
  const {
    serverUrl = "ws://localhost:8998/api/chat",
    voicePrompt = "NATURAL_F2.pt",
    voicePromptHash,
    textPrompt = MYCA_PERSONAPLEX_PROMPT,
    autoConnect = false,
    conversationId: initialConversationId,
    orchestratorUrl = "/api/mas/voice/orchestrator",
    onTranscript,
    onResponse,
    onError,
  } = options
  
  // State
  const [status, setStatus] = useState<ConnectionStatus>("disconnected")
  const [micLevel, setMicLevel] = useState(0)
  const [agentLevel, setAgentLevel] = useState(0)
  const [stats, setStats] = useState<AudioStats>({
    playedAudioDuration: 0,
    missedAudioDuration: 0,
    totalAudioMessages: 0,
    latency: 0,
    minPlaybackDelay: Infinity,
    maxPlaybackDelay: 0,
    packetsReceived: 0,
    packetsSent: 0,
  })
  const [transcript, setTranscript] = useState("")
  const [lastResponse, setLastResponse] = useState<OrchestratorResponse | null>(null)
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([])
  const [conversationId, setConversationId] = useState(
    initialConversationId || `conv-${Date.now()}`
  )
  
  // Refs
  const clientRef = useRef<PersonaPlexClient | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number | null>(null)
  
  // Add console message
  const addConsoleMessage = useCallback((type: ConsoleMessage["type"], message: string) => {
    setConsoleMessages(prev => [...prev.slice(-99), {
      timestamp: new Date(),
      type,
      message,
    }])
  }, [])
  
  // Clear console
  const clearConsole = useCallback(() => {
    setConsoleMessages([])
  }, [])
  
  /**
   * SINGLE ENTRY POINT: Send transcript to Voice Orchestrator
   * 
   * This is the ONLY function that communicates with the backend.
   * The orchestrator handles ALL business logic:
   * - Memory persistence
   * - n8n workflow execution
   * - Agent routing
   * - Safety confirmation
   * 
   * The response includes transparency about what actions were taken.
   */
  const sendToOrchestrator = useCallback(async (message: string): Promise<OrchestratorResponse> => {
    const startTime = Date.now()
    
    try {
      addConsoleMessage("info", `→ Orchestrator: "${message.substring(0, 50)}${message.length > 50 ? "..." : ""}"`)
      
      const response = await fetch(orchestratorUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          conversation_id: conversationId,
          session_id: `session-${Date.now()}`,
          source: "personaplex",
          context: {
            voice_prompt: voicePrompt,
            voice_prompt_hash: voicePromptHash,
            timestamp: new Date().toISOString(),
          },
          want_audio: true,
        }),
      })
      
      const latencyMs = Date.now() - startTime
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Orchestrator error ${response.status}: ${errorText}`)
      }
      
      const data: OrchestratorResponse = await response.json()
      
      // Add latency if not included
      if (!data.latency_ms) {
        data.latency_ms = latencyMs
      }
      
      // Log what the orchestrator did
      const responsePreview = data.response_text?.substring(0, 50) || "No response"
      addConsoleMessage("info", `← Response (${latencyMs}ms): "${responsePreview}..."`)
      
      if (data.actions) {
        if (data.actions.memory_saved) {
          addConsoleMessage("debug", "✓ Memory saved by orchestrator")
        }
        if (data.actions.workflow_executed) {
          addConsoleMessage("debug", `✓ Workflow executed: ${data.actions.workflow_executed}`)
        }
        if (data.actions.agent_routed) {
          addConsoleMessage("debug", `✓ Routed to agent: ${data.actions.agent_routed}`)
        }
      }
      
      // Update state
      setLastResponse(data)
      onResponse?.(data)
      
      return data
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      addConsoleMessage("error", `Orchestrator failed: ${errorMessage}`)
      onError?.(errorMessage)
      throw error
    }
  }, [orchestratorUrl, conversationId, voicePrompt, voicePromptHash, addConsoleMessage, onResponse, onError])
  
  // Connect to PersonaPlex
  const connect = useCallback(async () => {
    if (clientRef.current) {
      clientRef.current.disconnect()
    }
    
    addConsoleMessage("info", "Initializing PersonaPlex connection...")
    addConsoleMessage("debug", `Conversation ID: ${conversationId}`)
    
    clientRef.current = new PersonaPlexClient({
      serverUrl,
      voicePrompt,
      textPrompt,
      
      onStatusChange: (newStatus) => {
        setStatus(newStatus)
        addConsoleMessage("info", `Status: ${newStatus}`)
      },
      
      onAudioReceived: (audioData) => {
        // Update agent level based on audio data size
        const level = Math.min(1, audioData.byteLength / 1000)
        setAgentLevel(level)
        setTimeout(() => setAgentLevel(0), 100)
      },
      
      onTextReceived: async (text) => {
        setTranscript(prev => prev + " " + text)
        onTranscript?.(text)
        
        // Send to orchestrator if it looks like meaningful input
        // The orchestrator handles ALL business logic (memory, routing, workflows)
        if (text.trim().length > 3) {
          try {
            await sendToOrchestrator(text)
          } catch {
            // Error already logged in sendToOrchestrator
          }
        }
      },
      
      onStatsUpdate: (newStats) => {
        setStats(newStats)
      },
      
      onError: (error) => {
        addConsoleMessage("error", error)
        onError?.(error)
      },
      
      onConsoleLog: addConsoleMessage,
    })
    
    try {
      await clientRef.current.connect()
      
      // Start mic level monitoring
      startMicLevelMonitoring()
      
    } catch (error) {
      addConsoleMessage("error", `Connection failed: ${error}`)
      throw error
    }
  }, [serverUrl, voicePrompt, textPrompt, conversationId, addConsoleMessage, onTranscript, onError, sendToOrchestrator])
  
  // Start microphone level monitoring
  const startMicLevelMonitoring = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
      
      const updateLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray)
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
          setMicLevel(avg / 255)
        }
        animationRef.current = requestAnimationFrame(updateLevel)
      }
      
      updateLevel()
    } catch (error) {
      addConsoleMessage("error", `Mic monitoring failed: ${error}`)
    }
  }, [addConsoleMessage])
  
  // Disconnect
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect()
      clientRef.current = null
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    setStatus("disconnected")
    setMicLevel(0)
    setAgentLevel(0)
    addConsoleMessage("info", "Disconnected")
  }, [addConsoleMessage])
  
  // Auto-connect
  useEffect(() => {
    if (autoConnect) {
      connect()
    }
    
    return () => {
      disconnect()
    }
  }, [])
  
  return {
    // Connection
    connect,
    disconnect,
    isConnected: status === "connected",
    status,
    
    // Audio
    micLevel,
    agentLevel,
    stats,
    
    // Text
    transcript,
    lastResponse,
    
    // Console
    consoleMessages,
    clearConsole,
    
    // Single entry point for orchestrator communication
    sendToOrchestrator,
    
    // Conversation tracking
    conversationId,
  }
}

export default usePersonaPlex
