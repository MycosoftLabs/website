// @ts-nocheck
"use client"

/**
 * MYCA Voice Test Suite v9.0.0 - Full Consciousness Integration
 * Updated: February 12, 2026
 * 
 * NEW in v8.0.0:
 * - MYCA True Consciousness integration (8 modules on VM 188)
 * - Real-time consciousness state monitoring (/api/myca/status)
 * - Emotional intelligence display with live emotion tracking
 * - Self-reflections feed (MYCA's self-awareness insights)
 * - Autobiographical memory context (past conversations with Morgan)
 * - Active perception feed (CREP, Earth2, MycoBrain devices)
 * - Personality display (identity card with traits)
 * - Voice-memory bridge integration (6-layer + autobiographical)
 * - Intent classifier with 14 categories
 * - Consciousness polling every 15 seconds
 * 
 * FIXES in v7.1.0 / v9:
 * - Bridge handshake timeout 240s for CUDA graphs (60-180s on first run)
 * - Added CUDA warmup progress indicator
 * - Better error messages for timeout conditions
 * 
 * Architecture:
 * User Voice → PersonaPlex (8998) → Bridge (8999) → MAS Consciousness (188:8001) →
 * [8 Consciousness Modules + Memory Bridge + Intent Classifier] → Response → Voice
 */

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useWebMCPProvider } from "@/hooks/useWebMCPProvider"
import { useVoiceV9Session } from "@/lib/voice-v9/useVoiceV9Session"
import {
  SessionHeader,
  AudioControls,
  LiveTranscriptPane,
  EventPane,
  MASPane,
  LatencyPane,
  PersonaPane,
  SyncPane,
} from "./components"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { 
  Mic, 
  MicOff, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Server,
  Cpu,
  Send,
  Activity,
  BarChart2,
  Wrench,
  Zap,
  Database,
  Bot,
  MessageSquare,
  Brain,
  ArrowRight,
  AlertCircle,
  Clock,
  Users,
  HardDrive,
  Sparkles,
  Heart,
  Eye,
  Lightbulb
} from "lucide-react"
import { cn } from "@/lib/utils"
import { GPU_LEGION_DEFAULTS } from "@/lib/config/api-urls"
import { resolvePersonaplexBridgeWsBaseDefault } from "@/lib/config/resolve-voice-bridge"
import { VoiceSystemAuditPanel } from "@/components/voice/VoiceSystemAuditPanel"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ServiceStatus {
  name: string
  url: string
  status: "checking" | "online" | "offline" | "error"
  latency?: number
  version?: string
  features?: Record<string, boolean>
}

/** Stable defs for diagnostics — do not depend on state to avoid re-run loops */
/** Order must match /api/test-voice/diagnostics `services` array (0–7). */
const SERVICE_DEFS: { name: string; url: string }[] = [
  { name: "Moshi (via Bridge)", url: "/api/test-voice/diagnostics" },
  { name: "PersonaPlex Bridge (8999)", url: "/api/test-voice/bridge/health" },
  { name: "MAS Consciousness", url: "/api/test-voice/mas/myca-status" },
  { name: "Memory Bridge", url: "/api/test-voice/mas/memory-health" },
  { name: "MYCA Brain (voice)", url: "/api/test-voice/diagnostics" },
  { name: "MINDEX API", url: "/api/test-voice/diagnostics" },
  { name: "Ollama (Voice Legion)", url: "/api/test-voice/diagnostics" },
  { name: "Earth-2 (Legion)", url: "/api/test-voice/diagnostics" },
]

interface TestLog {
  timestamp: Date
  level: "info" | "success" | "error" | "warn" | "debug" | "metric" | "tool" | "event" | "injection" | "clone"
  message: string
  details?: string
}

interface MASEvent {
  id: string
  type: "tool_call" | "memory_write" | "memory_read" | "memory" | "agent_invoke" | "system" | "feedback" | "injection"
  source: string
  message: string
  timestamp: string
  data?: Record<string, unknown>
  injectedToMoshi?: boolean
}

interface ToolCall {
  id: string
  tool: string
  query: string
  result?: string
  status: "pending" | "running" | "success" | "error"
  timestamp: Date
  duration?: number
}

interface AgentActivity {
  id: string
  agentId: string
  agentName: string
  action: string
  status: "invoked" | "processing" | "completed" | "failed"
  timestamp: Date
}

interface MemorySession {
  sessionId: string
  conversationId: string
  turnCount: number
  memoryWrites: number
  memoryReads: number
  activeScopes: string[]
}

interface InjectionItem {
  id: string
  type: "tool_result" | "agent_update" | "system_alert" | "memory_insight"
  content: string
  timestamp: Date
  status: "queued" | "injecting" | "injected"
}

export default function VoiceTestPageClient() {
  const router = useRouter()
  useWebMCPProvider({ onNavigate: (path) => router.push(path) })

  // WebSocket base must be reachable from the *browser* (client-side).
  // When local voice env is set, use localhost; else Voice Legion (default 192.168.0.241:8999).
  const bridgeWsBaseUrl = resolvePersonaplexBridgeWsBaseDefault().replace(/\/$/, "")

  // Service statuses — names match /api/test-voice/diagnostics response order
  const [services, setServices] = useState<ServiceStatus[]>(() =>
    SERVICE_DEFS.map((d) => ({ ...d, status: "checking" as const }))
  )
  
  // MYCA Consciousness State
  const [consciousnessState, setConsciousnessState] = useState<{
    state: "dormant" | "awake" | "processing" | "reflecting"
    emotionalState: {dominant: string, valence: number, emotions: {emotion: string, intensity: number}[]}
    selfReflections: {content: string, category: string, timestamp: string}[]
    autobiographicalContext: string
    activePerception: {crep: any, earth2: any, devices: any}
    personality: {name: string, role: string, traits: any}
  } | null>(null)
  
  const [isPollingConsciousness, setIsPollingConsciousness] = useState(false)
  const consciousnessIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const [logs, setLogs] = useState<TestLog[]>([])
  const logsEndRef = useRef<HTMLDivElement>(null)
  
  const [testPhase, setTestPhase] = useState<"idle" | "checking" | "ready" | "listening" | "complete">("idle")
  const [voiceReady, setVoiceReady] = useState(false)
  const [voiceStackReady, setVoiceStackReady] = useState(false)
  const [isStartingVoice, setIsStartingVoice] = useState(false)
  const startingVoiceRef = useRef(false)
  const [uiReady, setUiReady] = useState(false)
  const [jarvisMessage, setJarvisMessage] = useState("Initializing MYCA Voice Suite v9.0.0 - Consciousness Active...")
  const [micPermission, setMicPermission] = useState<"unknown" | "granted" | "denied">("unknown")
  
  // Poll consciousness state
  const pollConsciousness = useCallback(async () => {
    if (!isPollingConsciousness) return
    
    try {
      const response = await fetch("/api/test-voice/mas/myca-status", { cache: "no-store" })
      if (response.ok) {
        const data = await response.json()
        setConsciousnessState(data)
        addLog("info", "Consciousness state updated", data.state)
      }
    } catch (error) {
      addLog("warn", "Consciousness polling error", String(error))
    }
  }, [isPollingConsciousness])
  
  useEffect(() => {
    if (isPollingConsciousness) {
      pollConsciousness()
      consciousnessIntervalRef.current = setInterval(pollConsciousness, 60000)
      return () => {
        if (consciousnessIntervalRef.current) {
          clearInterval(consciousnessIntervalRef.current)
        }
      }
    }
  }, [isPollingConsciousness, pollConsciousness])
  
  // Voice state
  const [wsConnected, setWsConnected] = useState(false)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState("")
  const [transcript, setTranscript] = useState("")
  const [lastResponse, setLastResponse] = useState<string>("")
  const [textInput, setTextInput] = useState("")
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [micLevel, setMicLevel] = useState(0)
  const [outputLevel, setOutputLevel] = useState(0)
  
  // MAS Event Engine
  const [masEvents, setMasEvents] = useState<MASEvent[]>([])
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([])
  const [agentActivity, setAgentActivity] = useState<AgentActivity[]>([])
  const [injectionQueue, setInjectionQueue] = useState<InjectionItem[]>([])
  const [textCloneStatus, setTextCloneStatus] = useState<"idle" | "cloning" | "success" | "error">("idle")
  const [lastClonedText, setLastClonedText] = useState("")
  const [bridgeFeatures, setBridgeFeatures] = useState<Record<string, boolean>>({})
  
  // Protocol mode: legacy (voice/orchestrator) vs a2a (A2A gateway)
  const [protocolMode, setProtocolMode] = useState<"legacy" | "a2a">("legacy")
  const [lastProtocolMode, setLastProtocolMode] = useState<string | null>(null)
  /** PersonaPlex / Moshi voice id for Bridge `POST /session` (see MAS `SessionCreate.voice`). */
  const [bridgeVoiceId, setBridgeVoiceId] = useState<"myca" | "moshika">("moshika")
  const [moshiPending, setMoshiPending] = useState(false)
  
  // v9 Diagnostics - unified session rail for voice v9 architecture
  const [useV9Diagnostics, setUseV9Diagnostics] = useState(false)
  const useV9DiagnosticsRef = useRef(false)
  useV9DiagnosticsRef.current = useV9Diagnostics
  
  // Memory Session
  const [memorySession, setMemorySession] = useState<MemorySession | null>(null)
  
  // MYCA Brain State
  const [brainStatus, setBrainStatus] = useState<"idle" | "thinking" | "responding">("idle")
  const [brainResponse, setBrainResponse] = useState("")
  const [brainProvider, setBrainProvider] = useState<string>("")
  const brainThinkingStartRef = useRef<number>(0)
  
  // Debug metrics
  const [latencyMetrics, setLatencyMetrics] = useState({
    sttLatency: [] as number[],
    llmLatency: [] as number[],
    ttsLatency: [] as number[],
    masLatency: [] as number[],
  })
  const [audioStats, setAudioStats] = useState({
    bytesIn: 0,
    bytesOut: 0,
    chunksIn: 0,
    chunksOut: 0,
  })
  
  const [inputWaveform, setInputWaveform] = useState<number[]>(new Array(64).fill(0))
  const [outputWaveform, setOutputWaveform] = useState<number[]>(new Array(64).fill(0))
  
  const wsRef = useRef<WebSocket | null>(null)
  const wsConnectedRef = useRef<boolean>(false)
  const warmupIntervalRef = useRef<NodeJS.Timeout | null>(null)
  /** Abort for optional POST /api/myca/brain/stream (SSE) probe — not GET EventSource. */
  const brainStreamAbortRef = useRef<AbortController | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const outputAnalyserRef = useRef<AnalyserNode | null>(null)
  const micLevelIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const opusRecorderRef = useRef<any>(null)
  
  const sttStartRef = useRef<number>(0)
  const llmStartRef = useRef<number>(0)
  const ttsStartRef = useRef<number>(0)
  const sessionIdRef = useRef<string>("")
  const audioChunksInRef = useRef<number>(0)  // For accurate packet counting
  const pcmFramesOutRef = useRef<number>(0)
  const isSpeakingRef = useRef<boolean>(false)  // MYCA TTS playing — used for UI state
  
  const addLog = useCallback((level: TestLog["level"], message: string, details?: string) => {
    setLogs(prev => [...prev.slice(-200), {
      timestamp: new Date(),
      level,
      message,
      details,
    }])
  }, [])
  
  const v9 = useVoiceV9Session({
    userId: "morgan",
    enabled: useV9Diagnostics,
    onError: (err) => addLog("error", `V9: ${err}`),
  })
  const v9SendTranscriptRef = useRef(v9.sendTranscript)
  v9SendTranscriptRef.current = v9.sendTranscript
  
  // DISABLED: Auto-scroll was causing annoying UX - user can scroll manually
  // useEffect(() => {
  //   logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  // }, [logs])
  
  const recordLatency = useCallback((type: "stt" | "llm" | "tts" | "mas", value: number) => {
    setLatencyMetrics(prev => ({
      ...prev,
      [`${type}Latency`]: [...(prev[`${type}Latency` as keyof typeof prev] as number[]).slice(-20), value],
    }))
    if (type !== "mas") { // Don't log MAS latency as metric, it's in the events
      addLog("metric", `${type.toUpperCase()}: ${value}ms`)
    }
  }, [addLog])
  
  const getAvgLatency = (arr: number[]) => {
    if (arr.length === 0) return 0
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
  }

  /**
   * Optional: consume MAS `POST /voice/brain/stream` (proxied) via fetch + ReadableStream.
   * Verifies the SSE path alongside Bridge → /voice/brain/chat; uses current voice session id when set.
   */
  const runBrainSseProbe = useCallback(async () => {
    brainStreamAbortRef.current?.abort()
    const ac = new AbortController()
    brainStreamAbortRef.current = ac
    setBrainStatus("thinking")
    setBrainResponse("")
    setBrainProvider("stream")
    addLog("info", "Brain SSE: connecting to /api/myca/brain/stream…")
    try {
      const sid = sessionIdRef.current || `sse_probe_${Date.now()}`
      const res = await fetch("/api/myca/brain/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Reply in one short sentence: confirm the MYCA brain stream is working.",
          user_id: "morgan",
          session_id: sid,
          conversation_id: sid,
          provider: "auto",
        }),
        signal: ac.signal,
      })
      if (!res.ok || !res.body) {
        const t = await res.text().catch(() => "")
        addLog("error", `Brain SSE failed: ${res.status} ${t.slice(0, 120)}`)
        setBrainStatus("idle")
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let acc = ""
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const blocks = buffer.split("\n\n")
        buffer = blocks.pop() || ""
        for (const block of blocks) {
          for (const line of block.split("\n")) {
            if (!line.startsWith("data: ")) continue
            try {
              const payload = JSON.parse(line.slice(6)) as {
                token?: string
                done?: boolean
                error?: string
                session_id?: string
              }
              if (payload.error) {
                addLog("error", `Brain SSE: ${payload.error}`)
              }
              if (typeof payload.token === "string") {
                acc += payload.token
                setBrainResponse(acc)
                setBrainStatus("responding")
              }
              if (payload.done) {
                addLog("success", "Brain SSE stream complete")
                setBrainStatus("idle")
              }
            } catch {
              // ignore bad chunk
            }
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        addLog("error", `Brain SSE: ${e}`)
      }
    } finally {
      setBrainStatus("idle")
      brainStreamAbortRef.current = null
    }
  }, [addLog])
  
  // Clone text to MAS (non-blocking background operation)
  const cloneTextToMAS = useCallback(async (text: string, sessionId: string) => {
    if (!text.trim()) return
    
    setTextCloneStatus("cloning")
    setLastClonedText(text)
    addLog("clone", `Cloning to MAS: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`)
    
    const masStart = Date.now()
    
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (protocolMode === "a2a") {
        headers["X-Protocol-Mode"] = "a2a"
      }
      const response = await fetch("/api/test-voice/mas/brain-chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: text,
          session_id: sessionId,
          conversation_id: sessionIdRef.current,
        }),
        signal: AbortSignal.timeout(10000),
      })
      const masLatency = Date.now() - masStart
      recordLatency("mas", masLatency)
      
      if (response.ok) {
        const data = await response.json()
        const respProtocol = response.headers.get("X-Protocol-Mode") ?? (data as { protocol_mode?: string }).protocol_mode
        if (respProtocol) setLastProtocolMode(respProtocol)
        setTextCloneStatus("success")
        
        // Update memory session stats
        if (data.memory_stats) {
          setMemorySession(prev => prev ? {
            ...prev,
            turnCount: prev.turnCount + 1,
            memoryWrites: prev.memoryWrites + (data.memory_stats.writes || 0),
            memoryReads: prev.memoryReads + (data.memory_stats.reads || 0),
          } : null)
        }
        
        // Handle tool calls
        if (data.tool_calls) {
          for (const tc of data.tool_calls) {
            const toolCall: ToolCall = {
              id: `tc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              tool: tc.tool,
              query: tc.query || text,
              status: tc.status || "success",
              result: tc.result,
              timestamp: new Date(),
              duration: tc.duration,
            }
            setToolCalls(prev => [...prev.slice(-10), toolCall])
            addLog("tool", `Tool: ${tc.tool} → ${tc.result?.slice(0, 50) || 'completed'}`)
            
            // Add to injection queue if there's a result to inject
            if (tc.result && tc.inject_to_moshi) {
              addInjection("tool_result", tc.result)
            }
          }
        }
        
        // Handle agent invocations
        if (data.agents_invoked) {
          for (const agent of data.agents_invoked) {
            const activity: AgentActivity = {
              id: `ag_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              agentId: agent.id,
              agentName: agent.name,
              action: agent.action,
              status: agent.status || "completed",
              timestamp: new Date(),
            }
            setAgentActivity(prev => [...prev.slice(-10), activity])
            addLog("event", `Agent: ${agent.name} - ${agent.action}`)
            
            // Add to injection queue if agent has feedback
            if (agent.feedback && agent.inject_to_moshi) {
              addInjection("agent_update", agent.feedback)
            }
          }
        }
        
        // Handle direct feedback injection
        if (data.injection) {
          addInjection(data.injection.type || "system_alert", data.injection.content)
        }

        const replyText = String(
          data.response_text || data.response || data.message || ""
        ).trim()
        if (replyText) {
          setLastResponse(replyText)
          addLog("success", `MYCA harness reply (${replyText.length} chars)`)
        }
        
        addLog("success", `MAS clone: ${masLatency}ms`)
      } else {
        setTextCloneStatus("error")
        const errBody = await response.text().catch(() => "")
        addLog("error", `MAS brain-chat failed: ${response.status} ${errBody.slice(0, 120)}`)
      }
    } catch (error) {
      setTextCloneStatus("error")
      addLog("error", `MAS clone error: ${error}`)
      // Brain/harness on MAS VM may be slow — speak locally via bridge inject so user is not left silent
      const q = text.trim().toLowerCase().replace(/[^\w\s]/g, " ").trim()
      const isGreeting = /^(hello|hi|hey)\b/.test(q) || q.startsWith("good ")
      if (isGreeting) {
        const fallback = "Hello! I'm MYCA. Good to hear from you — what would you like to work on?"
        setLastResponse(fallback)
        addInjection("brain_response", fallback)
        addLog("warn", "MAS slow/offline — queued local greeting TTS via bridge")
      }
    }
    
    // Reset status after a moment
    setTimeout(() => setTextCloneStatus("idle"), 2000)
  }, [addLog, recordLatency, protocolMode])
  
  // Add item to injection queue
  const addInjection = useCallback((type: InjectionItem["type"], content: string) => {
    const item: InjectionItem = {
      id: `inj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      content,
      timestamp: new Date(),
      status: "queued",
    }
    setInjectionQueue(prev => [...prev.slice(-10), item])
    addLog("injection", `Queued: [${type}] ${content.slice(0, 40)}...`)
    
    // Send to bridge for injection into Moshi
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "inject_feedback",
        injection: item,
      }))
      setInjectionQueue(prev => prev.map(i => 
        i.id === item.id ? { ...i, status: "injecting" } : i
      ))
    }
  }, [addLog])
  
  // Check services — retry on HMR/compile timeout; fall back to fast ping
  const checkServices = useCallback(async () => {
    setTestPhase("checking")
    addLog("info", "Running diagnostics...")
    setJarvisMessage("Running voice diagnostics...")

    const fallbackOffline: ServiceStatus[] = SERVICE_DEFS.map((d) => ({ ...d, status: "offline" as const }))
    let finalServices = fallbackOffline
    let diagVoiceReady = false

    try {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const diagRes = await fetch("/api/test-voice/diagnostics", {
          method: "GET",
          cache: "no-store",
          signal: AbortSignal.timeout(12000),
        })
        if (!diagRes.ok) throw new Error(`Diagnostics failed: ${diagRes.status}`)
        const diag = await diagRes.json()
        diagVoiceReady = Boolean(diag?.voiceReady)
        const serviceResults = (diag?.services || []) as {
          ok?: boolean
          latencyMs?: number
          sloOk?: boolean
          data?: { version?: string; features?: Record<string, boolean> }
        }[]

        const updatedServices: ServiceStatus[] = SERVICE_DEFS.map((def, i) => {
          const result = serviceResults[i]
          const latency = typeof result?.latencyMs === "number" ? result.latencyMs : undefined
          const rateLimited = result?.status === 429
          const isOnline = Boolean(result?.ok) || rateLimited
          return {
            ...def,
            status: isOnline ? (rateLimited ? "online" : "online") : "offline",
            latency,
            version: result?.data?.version,
            features: result?.data?.features,
          }
        })

        for (let i = 0; i < updatedServices.length; i++) {
          const s = updatedServices[i]
          const result = serviceResults[i]
          if (attempt === 1) {
            addLog(
              s.status === "online" ? "success" : "error",
              `${s.name}: ${s.status === "online" ? "ONLINE" : "OFFLINE"}${s.latency ? ` (${s.latency}ms${result?.sloOk === false ? " SLOW" : ""})` : ""}`
            )
          }
          if (i === 1 && result?.data?.features) setBridgeFeatures(result.data.features)
        }

        finalServices = updatedServices
        setServices(updatedServices)
        break
      } catch (error) {
        if (attempt < 3) {
          addLog("warn", `Diagnostics attempt ${attempt} failed, retrying...`)
          await new Promise((r) => setTimeout(r, 1500))
          continue
        }
        addLog("error", `Diagnostics error: ${error}`)
        try {
          const pingRes = await fetch("/api/test-voice/ping", { cache: "no-store", signal: AbortSignal.timeout(8000) })
          if (pingRes.ok) {
            const ping = await pingRes.json()
            diagVoiceReady = Boolean(ping?.voiceReady)
            setVoiceStackReady(Boolean(ping?.voiceStackReady ?? diagVoiceReady))
            if (diagVoiceReady) {
              addLog("success", "Fast ping fallback: voice stack ready")
              finalServices = SERVICE_DEFS.map((d, i) => ({
                ...d,
                status: i <= 2 ? ("online" as const) : ("offline" as const),
              }))
              setServices(finalServices)
            } else {
              setServices(fallbackOffline)
            }
          } else {
            setServices(fallbackOffline)
          }
        } catch {
          setServices(fallbackOffline)
        }
      }
    }

    try {
      const permission = await navigator.permissions.query({ name: "microphone" as PermissionName })
      setMicPermission(permission.state === "granted" ? "granted" : permission.state === "denied" ? "denied" : "unknown")
    } catch {}

    const bridgeOnline = finalServices[1].status === "online"
    const moshiOnline = finalServices[0].status === "online"
    const masOnline = finalServices[2].status === "online"
    const stackReady = bridgeOnline && moshiOnline
    setVoiceStackReady(stackReady)
    const ready = diagVoiceReady || stackReady
    setVoiceReady(ready)

    if (ready) {
      setTestPhase("ready")
      setJarvisMessage("All systems ready. Click Start MYCA Voice to talk with Moshika!")
      setIsPollingConsciousness(true)
    } else if (bridgeOnline) {
      setTestPhase("ready")
      setJarvisMessage("Bridge ready. Waiting for MAS/Moshi...")
      setVoiceReady(true)
    } else {
      setTestPhase("idle")
      setJarvisMessage("Voice stack offline — click Start Stack in the probe panel.")
    }
    } finally {
      setTestPhase((phase) => (phase === "checking" ? "ready" : phase))
    }
  }, [addLog])
  
  const releaseStartingVoice = () => {
    startingVoiceRef.current = false
    setIsStartingVoice(false)
  }

  // Start voice session with MAS Event Engine
  const startMycaVoice = async () => {
    if (startingVoiceRef.current) {
      addLog("warn", "Voice session is already starting — wait for handshake or cancel")
      return
    }
    if (wsConnectedRef.current && testPhase === "listening") {
      addLog("warn", "Voice session already active — use Stop first")
      return
    }
    if (wsRef.current) {
      try { wsRef.current.close() } catch {}
      wsRef.current = null
      wsConnectedRef.current = false
      setWsConnected(false)
    }
    startingVoiceRef.current = true
    setIsStartingVoice(true)
    addLog("info", "Starting MYCA Voice v9.0.0 with MAS Event Engine...")
    setJarvisMessage("Initializing audio decoder...")
    setAudioStats({ bytesIn: 0, bytesOut: 0, chunksIn: 0, chunksOut: 0 })
    audioChunksInRef.current = 0
    pcmFramesOutRef.current = 0
    
    // Fresh decoder/worklet per session (avoids stale WASM state after HMR or reconnect)
    if (decoderWorkerRef.current) {
      decoderWorkerRef.current.terminate()
      decoderWorkerRef.current = null
    }
    decoderReadyRef.current = false
    decoderInitializingRef.current = false
    pendingAudioRef.current = []
    if (audioWorkletNodeRef.current) {
      try { audioWorkletNodeRef.current.disconnect() } catch {}
      audioWorkletNodeRef.current = null
    }
    workletReadyRef.current = false
    setToolCalls([])
    setMasEvents([])
    setAgentActivity([])
    setInjectionQueue([])
    
    // CRITICAL: Initialize decoder BEFORE connecting WebSocket (NVIDIA uses 1000ms WASM warmup)
    try {
      await initDecoderWorker()
      addLog("success", "Audio decoder pre-initialized")
    } catch (e) {
      addLog("warn", `Decoder pre-init warning: ${e}`)
    }
    
    setJarvisMessage("Connecting to PersonaPlex + MAS Event Engine...")
    
    try {
      // Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        } 
      })
      mediaStreamRef.current = stream
      setMicPermission("granted")
      
      // Set up input audio analysis
      const monitorCtx = new AudioContext()
      const source = monitorCtx.createMediaStreamSource(stream)
      const analyser = monitorCtx.createAnalyser()
      analyser.fftSize = 128
      source.connect(analyser)
      analyserRef.current = analyser
      
      // Monitor input levels
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      micLevelIntervalRef.current = setInterval(() => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray)
          const sum = dataArray.reduce((a, b) => a + b, 0)
          const avg = sum / dataArray.length
          setMicLevel(Math.min(100, Math.round(avg * 1.5)))
          setInputWaveform(Array.from(dataArray.slice(0, 64)))
        }
      }, 50)
      
      // Create session on bridge
      addLog("info", "Creating session on PersonaPlex Bridge...")
      const bridgeRes = await fetch("/api/test-voice/bridge/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona: "myca",
          voice: bridgeVoiceId,
          enable_mas_events: true,
        })
      })
      
      if (!bridgeRes.ok) {
        const errText = await bridgeRes.text().catch(() => "")
        const bridgeHttp = bridgeWsBaseUrl.replace(/^ws/i, "http")
        const voiceLegion = `ws://${GPU_LEGION_DEFAULTS.VOICE}:8999`
        throw new Error(
          `Bridge session failed (${bridgeRes.status}). Ensure PersonaPlex Bridge is running at ${bridgeHttp}. ` +
          `Voice Legion: ${voiceLegion} | local: ws://localhost:8999. Set NEXT_PUBLIC_PERSONAPLEX_BRIDGE_WS_URL or NEXT_PUBLIC_PERSONAPLEX_BRIDGE_URL in .env.local. ${errText ? errText.slice(0, 80) : ""}`
        )
      }
      
      const session = await bridgeRes.json()
      sessionIdRef.current = session.session_id
      addLog("success", `Session: ${session.session_id.slice(0, 8)}...`)
      
      if (useV9DiagnosticsRef.current) {
        v9.createSession(session.session_id)
      }
      
      // Initialize memory session
      setMemorySession({
        sessionId: session.session_id,
        conversationId: session.conversation_id || session.session_id,
        turnCount: 0,
        memoryWrites: 0,
        memoryReads: 0,
        activeScopes: ["conversation", "user"],
      })
      
      // Create voice session in MAS memory
      try {
        await fetch("/api/test-voice/mas/voice-session/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: session.session_id,
            conversation_id: session.conversation_id || session.session_id,
            mode: "personaplex",
            persona: "myca",
          }),
        })
        addLog("success", "MAS voice session created")
      } catch (e) {
        addLog("warn", `MAS voice session create: ${e}`)
      }
      
      // Connect WebSocket to bridge
      const bridgeWsUrl = `${bridgeWsBaseUrl}/ws/${session.session_id}`
      addLog("info", `Connecting WebSocket: ${bridgeWsUrl}`)
      
      const ws = new WebSocket(bridgeWsUrl)
      ws.binaryType = "arraybuffer"

      const completeMoshiHandshake = () => {
        if (wsConnectedRef.current) return
        if (warmupIntervalRef.current) {
          clearInterval(warmupIntervalRef.current)
          warmupIntervalRef.current = null
        }
        releaseStartingVoice()
        wsConnectedRef.current = true
        addLog("success", "Moshi CUDA handshake OK — full-duplex + MAS Event Engine active.")
        setMoshiPending(false)
        setWsConnected(true)
        setTestPhase("listening")
        setJarvisMessage("Connected! Speak naturally. MAS Event Engine is listening.")

        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext({ sampleRate: 48000 })
        }
        if (audioContextRef.current.state === "suspended") {
          audioContextRef.current.resume().then(() => {
            addLog("success", "AudioContext resumed for playback")
          }).catch(e => addLog("error", `AudioContext resume failed: ${e}`))
        }

        if (audioWorkletNodeRef.current) {
          audioWorkletNodeRef.current.port.postMessage({ type: "reset" })
          addLog("debug", "AudioWorklet reset for new Moshi session")
        }

        initDecoderWorker().catch(e => addLog("error", `Decoder init: ${e}`))
        startAudioCapture(ws)
      }
      
      ws.onopen = () => {
        addLog("success", "WebSocket connected to bridge!")
        addLog("info", "Waiting for Moshi handshake (CUDA graphs may compile on first run)...")
        setJarvisMessage("CUDA graphs compiling... This can take 60–180 seconds on first connection.")
        
        // Start CUDA warmup counter (Bridge timeout is 240s by default)
        let warmupSeconds = 0
        const warmupInterval = setInterval(() => {
          warmupSeconds++
          if (warmupSeconds <= 240 && !wsConnectedRef.current) {
            setJarvisMessage(`CUDA graphs compiling... ${warmupSeconds}s (can take 60–180s on first run)`)
          } else {
            clearInterval(warmupInterval)
          }
        }, 1000)
        
        // Store for cleanup
        warmupIntervalRef.current = warmupInterval
      }
      
      ws.onmessage = async (event) => {
        try {
          if (typeof event.data === "string") {
            const msg = JSON.parse(event.data)
            
            if (msg.type === "bridge_ready") {
              addLog("success", `Bridge ready — voice=${msg.voice}, prompt=${msg.voice_prompt}`)
              setMoshiPending(true)
              setJarvisMessage("Bridge connected. Waiting for Moshi CUDA graphs — do not speak until handshake completes.")
              return
            }
            if (msg.type === "moshi_ready") {
              addLog("success", `Moshi CUDA ready — ${msg.voice_prompt}`)
              completeMoshiHandshake()
              return
            }
            if (msg.type === "text") {
              // Text from Moshi (MYCA speaking)
              const text = msg.text?.trim()
              if (text) {
                // Check if this is injected content
                if (text.includes("[TOOL]") || text.includes("[AGENT]") || text.includes("[SYSTEM]")) {
                  addLog("injection", `MYCA injected: ${text}`)
                  // Update injection queue status
                  setInjectionQueue(prev => {
                    const updated = [...prev]
                    const pending = updated.find(i => i.status === "injecting")
                    if (pending) pending.status = "injected"
                    return updated
                  })
                } else {
                  // Add space between text tokens for proper word separation
                  // Check if we need a space (don't add before punctuation, add after words)
                  setLastResponse(prev => {
                    if (!prev) return text
                    const lastChar = prev.slice(-1)
                    const firstChar = text.charAt(0)
                    // Don't add space if: previous ends with space, current starts with punctuation, or current starts with space
                    const needsSpace = lastChar !== ' ' && 
                                       lastChar !== '\n' &&
                                       !['.',',','!','?',';',':','\'','"',')'].includes(firstChar) &&
                                       firstChar !== ' '
                    return prev + (needsSpace ? ' ' : '') + text
                  })
                  addLog("info", `MYCA: ${text}`)
                }
                
                const now = Date.now()
                if (llmStartRef.current > 0) {
                  recordLatency("llm", now - llmStartRef.current)
                  llmStartRef.current = 0
                }
              }
            } else if (msg.type === "mas_event") {
              // MAS event from bridge
              const masEvent = msg.event as MASEvent
              setMasEvents(prev => [...prev.slice(-20), masEvent])
              addLog("event", `MAS: [${masEvent.type}] ${masEvent.message}`)
              const injContent = (masEvent.data as { content?: string })?.content
              if (masEvent.type === "injection" && injContent && typeof injContent === "string") {
                setLastResponse(injContent)
                addLog("success", `MYCA: ${injContent.slice(0, 100)}${injContent.length > 100 ? "..." : ""}`)
              }
            } else if (msg.type === "injection_ack") {
              // Injection acknowledged by Moshi
              setInjectionQueue(prev => prev.map(i => 
                i.id === msg.injection_id ? { ...i, status: "injected" } : i
              ))
              addLog("success", `Injection delivered: ${msg.injection_id}`)
            } else if (msg.type === "brain_response") {
              // MYCA Brain response from frontier LLM
              const brainText = msg.text?.trim()
              if (brainText) {
                setBrainStatus("responding")
                setBrainResponse(brainText)
                if (msg.source) {
                  setBrainProvider(msg.source)
                }
                addLog("success", `[BRAIN] ${brainText.substring(0, 100)}...`)
                
                // Record brain latency
                if (brainThinkingStartRef.current > 0) {
                  const latency = Date.now() - brainThinkingStartRef.current
                  recordLatency("llm", latency)
                  brainThinkingStartRef.current = 0
                }
                
                // Clear brain status after a delay
                setTimeout(() => setBrainStatus("idle"), 2000)
              }
            } else if (msg.type === "user_transcript") {
              const text = msg.text?.trim()
              if (text) {
                setTranscript(text)
                addLog("info", `You: "${text}"`)
              }
            } else if (msg.type === "error") {
              addLog("error", `Error: ${msg.message}`)
              releaseStartingVoice()
              wsConnectedRef.current = false
              setWsConnected(false)
              setTestPhase("ready")
              setJarvisMessage("Handshake failed. Run python START_VOICE_SYSTEM.py, wait for warmup, then click Start again.")
            }
            return
          }
          
          // Binary audio from Moshi
          const data = new Uint8Array(event.data as ArrayBuffer)
          if (data.length === 0) return
          
          const kind = data[0]
          const payload = data.slice(1)
          
          // Handshake (0x00)
          if (data.length === 1 && kind === 0) {
            completeMoshiHandshake()
            return
          }
          
          // Audio from MYCA (kind=1)
          if (kind === 1 && payload.length > 0) {
            const now = Date.now()
            if (ttsStartRef.current > 0 && !isSpeaking) {
              recordLatency("tts", now - ttsStartRef.current)
              ttsStartRef.current = 0
            }
            
            // Use ref for accurate counting (React state batching causes issues)
            audioChunksInRef.current++
            
            setAudioStats(prev => ({
              ...prev,
              bytesIn: prev.bytesIn + payload.length,
              chunksIn: audioChunksInRef.current
            }))
            
            // Log first few audio packets for debugging
            if (audioChunksInRef.current <= 5) {
              const hasOggS = payload.length >= 4 &&
                payload[0] === 0x4F && payload[1] === 0x67 && payload[2] === 0x67 && payload[3] === 0x53
              addLog("debug", `Audio packet #${audioChunksInRef.current}: ${payload.length} bytes${hasOggS ? " (Ogg)" : " (raw Opus)"}`)
            }
            if (audioChunksInRef.current === 1) {
              addLog("success", "MYCA audio incoming — decoding for speakers")
            }
            
            setIsSpeaking(true)
            isSpeakingRef.current = true
            
            handleMoshiAudio(payload)
            scheduleSpeakingEnd()
          }
          
          // Control/ACK (kind=3)
          if (kind === 3) {
            const ack = payload.length > 0 ? new TextDecoder().decode(payload) : ""
            addLog("debug", `Control: ${ack}`)
          }
        } catch (err) {
          addLog("debug", `Message error: ${err}`)
        }
      }
      
      ws.onerror = () => {
        if (warmupIntervalRef.current) {
          clearInterval(warmupIntervalRef.current)
          warmupIntervalRef.current = null
        }
        releaseStartingVoice()
        wsConnectedRef.current = false
        addLog("error", `WebSocket failed to ${bridgeWsUrl}. Is the bridge running? Set NEXT_PUBLIC_PERSONAPLEX_BRIDGE_WS_URL in .env.local (e.g. ws://${GPU_LEGION_DEFAULTS.VOICE}:8999 or ws://localhost:8999)`)
        setWsConnected(false)
        setTestPhase("ready")
      }
      
      ws.onclose = (event) => {
        if (warmupIntervalRef.current) {
          clearInterval(warmupIntervalRef.current)
          warmupIntervalRef.current = null
        }
        const hadHandshake = wsConnectedRef.current
        releaseStartingVoice()
        wsConnectedRef.current = false
        
        // Check for timeout-related closes
        if (!hadHandshake && event.code !== 1000) {
          addLog("warn", "Connection closed before handshake - CUDA graphs may still be compiling")
          addLog("info", "Run python START_VOICE_SYSTEM.py from MAS repo to warm up Moshi, then click Start again.")
          setTestPhase("ready")
          setJarvisMessage("Handshake failed. Warm up with START_VOICE_SYSTEM.py, then try again.")
        } else {
          addLog("info", "Disconnected from bridge")
        }
        setWsConnected(false)
        stopAudioCapture()
      }
      
      wsRef.current = ws
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      addLog("error", `Failed: ${errorMsg}`)
      setJarvisMessage(`Connection failed: ${errorMsg}`)
      setTestPhase("ready")
      stopAudioCapture()
      releaseStartingVoice()
    }
  }
  
  // Start audio capture with opus-recorder
  const startAudioCapture = async (ws: WebSocket) => {
    if (!mediaStreamRef.current) return
    
    try {
      await new Promise<void>((resolve, reject) => {
        if ((window as any).Recorder) { resolve(); return }
        const script = document.createElement("script")
        script.src = "/assets/recorder.min.js"
        script.onload = () => resolve()
        script.onerror = () => reject(new Error("Failed to load opus-recorder"))
        document.head.appendChild(script)
      })
      
      const RecorderClass = (window as any).Recorder
      if (!RecorderClass) throw new Error("Recorder not loaded")
      
      // CRITICAL: Create AudioContext and sourceNode for the recorder
      // opus-recorder doesn't accept a stream in start() - it needs a sourceNode in config
      const recorderAudioContext = new AudioContext({ sampleRate: 48000 })
      await recorderAudioContext.resume()
      const sourceNode = recorderAudioContext.createMediaStreamSource(mediaStreamRef.current)
      
      const recorderOptions = {
        encoderPath: "/assets/encoderWorker.min.js",
        encoderSampleRate: 24000,
        encoderFrameSize: 20,
        maxFramesPerPage: 2,
        numberOfChannels: 1,
        streamPages: true,
        encoderApplication: 2049,
        encoderComplexity: 0,
        resampleQuality: 3,
        recordingGain: 1.5,
        bufferLength: Math.round(960 * 48000 / 24000),
        // CRITICAL: Provide sourceNode so recorder uses our existing mic stream
        sourceNode: sourceNode,
      }
      
      addLog("debug", `Recorder config: sourceNode provided, ctx sampleRate=${recorderAudioContext.sampleRate}`)
      
      const recorder = new RecorderClass(recorderOptions)
      
      let audioSentCount = 0
      recorder.ondataavailable = (data: Uint8Array) => {
        if (data && data.length > 0 && ws.readyState === WebSocket.OPEN) {
          audioSentCount++
          setAudioStats(prev => ({
            ...prev,
            bytesOut: prev.bytesOut + data.length,
            chunksOut: audioSentCount
          }))
          
          // Log first few outgoing audio packets for debugging
          if (audioSentCount <= 5 || audioSentCount % 100 === 0) {
            addLog("debug", `Sending audio #${audioSentCount}: ${data.length} bytes`)
          }
          
          const message = new Uint8Array(1 + data.length)
          message[0] = 0x01
          message.set(data, 1)
          ws.send(message)
        }
      }
      
      recorder.onstart = () => {
        setIsRecognizing(true)
        addLog("success", "Local Moshi STT active — Opus mic → Bridge → Moshi (127.0.0.1:8998). No cloud STT.")
        sttStartRef.current = Date.now()
      }
      
      recorder.onstop = () => {
        setIsRecognizing(false)
        addLog("info", "Audio capture stopped")
      }
      
      recorder.onerror = (err: any) => {
        addLog("error", `Opus encoder error: ${err?.message || err}`)
      }
      
      addLog("info", "Starting Opus recorder (sourceNode mode)...")
      await recorder.start()  // No parameter needed - uses sourceNode from config
      opusRecorderRef.current = recorder
      
    } catch (e) {
      addLog("error", `Audio capture failed: ${e}`)
    }
  }
  
  const stopAudioCapture = () => {
    if (micLevelIntervalRef.current) {
      clearInterval(micLevelIntervalRef.current)
      micLevelIntervalRef.current = null
    }
    setMicLevel(0)
    
    if (opusRecorderRef.current) {
      try { opusRecorderRef.current.stop() } catch {}
      opusRecorderRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop())
      mediaStreamRef.current = null
    }
    setIsRecognizing(false)
  }
  
  // Opus decoder
  const decoderWorkerRef = useRef<Worker | null>(null)
  const decoderReadyRef = useRef(false)
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null)
  const workletReadyRef = useRef(false)
  const pendingAudioRef = useRef<Uint8Array[]>([])
  const decoderInitializingRef = useRef(false)
  
  const initAudioWorklet = useCallback(async () => {
    if (workletReadyRef.current) return
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 48000 })
      }
      
      const ctx = audioContextRef.current
      if (ctx.state === "suspended") await ctx.resume()
      
      await ctx.audioWorklet.addModule("/assets/audio-processor.js")
      
      const workletNode = new AudioWorkletNode(ctx, "moshi-processor")
      workletNode.connect(ctx.destination)
      
      const outputAnalyser = ctx.createAnalyser()
      outputAnalyser.fftSize = 128
      workletNode.connect(outputAnalyser)
      outputAnalyserRef.current = outputAnalyser
      
      setInterval(() => {
        if (outputAnalyserRef.current && isSpeakingRef.current) {
          const dataArray = new Uint8Array(outputAnalyserRef.current.frequencyBinCount)
          outputAnalyserRef.current.getByteFrequencyData(dataArray)
          const sum = dataArray.reduce((a, b) => a + b, 0)
          setOutputLevel(Math.min(100, Math.round(sum / dataArray.length * 1.5)))
          setOutputWaveform(Array.from(dataArray.slice(0, 64)))
        } else {
          setOutputLevel(0)
        }
      }, 50)
      
      audioWorkletNodeRef.current = workletNode
      workletReadyRef.current = true
    } catch (e) {
      addLog("error", `AudioWorklet init failed: ${e}`)
    }
  }, [addLog])
  
  // Create warmup BOS page for Opus decoder (from NVIDIA PersonaPlex client)
  const createWarmupBosPage = useCallback(() => {
    // OpusHead: "OpusHead" + version + channels + preskip + samplerate + gain + mapping
    const opusHead = new Uint8Array([
      0x4F, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64, // "OpusHead"
      0x01,       // Version 1
      0x01,       // 1 channel (mono)
      0x38, 0x01, // Pre-skip: 312 samples (little-endian)
      0x80, 0xBB, 0x00, 0x00, // Sample rate: 48000 Hz (little-endian)
      0x00, 0x00, // Output gain: 0
      0x00,       // Channel mapping: 0 (mono/stereo)
    ])
    
    // Ogg page header
    const pageHeader = new Uint8Array([
      0x4F, 0x67, 0x67, 0x53, // "OggS" magic
      0x00,       // Version 0
      0x02,       // BOS flag (Beginning of Stream)
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // Granule position: 0
      0x01, 0x00, 0x00, 0x00, // Stream serial: 1
      0x00, 0x00, 0x00, 0x00, // Page sequence: 0
      0x00, 0x00, 0x00, 0x00, // CRC (decoder doesn't check)
      0x01,       // 1 segment
      0x13,       // Segment size: 19 bytes (OpusHead)
    ])
    
    const bosPage = new Uint8Array(pageHeader.length + opusHead.length)
    bosPage.set(pageHeader, 0)
    bosPage.set(opusHead, pageHeader.length)
    return bosPage
  }, [])

  const initDecoderWorker = useCallback(async (): Promise<void> => {
    const ensurePlaybackContext = async () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 48000 })
      }
      const ctx = audioContextRef.current
      if (ctx.state === "suspended") {
        await ctx.resume()
        addLog("success", "AudioContext resumed for playback")
      }
    }

    if (decoderReadyRef.current) {
      await ensurePlaybackContext()
      return
    }

    if (decoderWorkerRef.current) {
      await new Promise<void>((resolve) => {
        if (decoderReadyRef.current) {
          resolve()
          return
        }
        const started = Date.now()
        const tick = setInterval(() => {
          if (decoderReadyRef.current || Date.now() - started > 2500) {
            clearInterval(tick)
            resolve()
          }
        }, 50)
      })
      await ensurePlaybackContext()
      return
    }
    
    try {
      await ensurePlaybackContext()
      await initAudioWorklet()
      
      const worker = new Worker("/assets/decoderWorker.min.js")
      
      worker.onerror = (event) => {
        addLog("error", `Decoder worker error: ${event.message}`)
      }
      
      worker.onmessage = (e: MessageEvent) => {
        if (!e.data) return
        
        const pcmData = e.data[0] as Float32Array
        if (pcmData?.length > 0) {
          if (audioWorkletNodeRef.current && workletReadyRef.current) {
            audioWorkletNodeRef.current.port.postMessage({
              frame: pcmData,
              type: "audio",
              micDuration: 0
            })
            pcmFramesOutRef.current++
            if (pcmFramesOutRef.current <= 5) {
              addLog("success", `PCM → speakers #${pcmFramesOutRef.current}: ${pcmData.length} samples`)
            }
            setIsSpeaking(true)
          } else {
            addLog("error", "PCM decoded but AudioWorklet not ready — audio dropped")
          }
        }
      }
      
      const sampleRate = audioContextRef.current?.sampleRate || 48000
      addLog("info", `Initializing decoder: 24kHz → ${sampleRate}Hz`)
      
      worker.postMessage({
        command: "init",
        bufferLength: 960 * sampleRate / 24000,
        decoderSampleRate: 24000,
        outputBufferSampleRate: sampleRate,
        resampleQuality: 0,
      })
      
      setTimeout(() => {
        const bosPage = createWarmupBosPage()
        addLog("debug", "Sending warmup BOS page to decoder")
        worker.postMessage({
          command: "decode",
          pages: bosPage,
        })
      }, 100)
      
      decoderWorkerRef.current = worker
      
      // NVIDIA PersonaPlex client waits 1000ms for WASM + BOS init
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          decoderReadyRef.current = true
          addLog("success", "Opus decoder initialized and ready")
          if (audioWorkletNodeRef.current) {
            audioWorkletNodeRef.current.port.postMessage({ type: "reset" })
          }
          resolve()
        }, 1000)
      })
      
    } catch (e) {
      addLog("error", `Decoder init failed: ${e}`)
    }
  }, [addLog, initAudioWorklet, createWarmupBosPage])
  
  const handleMoshiAudio = useCallback(async (data: Uint8Array) => {
    if (audioContextRef.current?.state === "suspended") {
      try {
        await audioContextRef.current.resume()
      } catch {
        // resume may fail without gesture; Start click already provided one
      }
    }

    if (!decoderWorkerRef.current || !decoderReadyRef.current) {
      pendingAudioRef.current.push(data.slice())
      
      if (!decoderInitializingRef.current) {
        decoderInitializingRef.current = true
        await initDecoderWorker()
        decoderInitializingRef.current = false
        while (pendingAudioRef.current.length > 0 && decoderWorkerRef.current && decoderReadyRef.current) {
          const pending = pendingAudioRef.current.shift()
          if (pending) {
            decoderWorkerRef.current.postMessage({ command: "decode", pages: pending }, [pending.buffer])
          }
        }
      }
      return
    }
    
    while (pendingAudioRef.current.length > 0) {
      const pending = pendingAudioRef.current.shift()
      if (pending) {
        decoderWorkerRef.current.postMessage({ command: "decode", pages: pending }, [pending.buffer])
      }
    }
    
    const dataCopy = data.slice()
    decoderWorkerRef.current.postMessage({ command: "decode", pages: dataCopy }, [dataCopy.buffer])
  }, [initDecoderWorker])
  
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const scheduleSpeakingEnd = useCallback(() => {
    if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current)
    speakingTimeoutRef.current = setTimeout(() => {
      setIsSpeaking(false)
      isSpeakingRef.current = false
      setOutputLevel(0)
    }, 800)
  }, [])
  
  // Send text message
  const sendTextMessage = () => {
    if (!textInput.trim() || !wsRef.current) return
    
    if (wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "user_speech",
        text: textInput.trim(),
        forward_to_moshi: false,
      }))
      setTranscript(textInput.trim())
      setLastResponse("")
      addLog("info", `Sent: "${textInput.trim()}"`)
      addLog("info", "Bridge edge-tts queued — expect MYCA text + Audio packet #1 within ~2s")
      
      // MAS memory/harness enrichment (background; TTS is bridge edge-tts, not brain-chat)
      cloneTextToMAS(textInput.trim(), sessionIdRef.current)
      
      setTextInput("")
      llmStartRef.current = Date.now()
    }
  }
  
  // Stop voice
  const stopVoice = async () => {
    // v9 diagnostics: end unified session
    if (useV9DiagnosticsRef.current) {
      v9.endSession()
    }
    // End memory session
    if (sessionIdRef.current) {
      try {
        await fetch(`/api/test-voice/mas/voice-session/${encodeURIComponent(sessionIdRef.current)}/end`, {
          method: "POST",
        })
        addLog("info", "MAS voice session ended")
      } catch {}
    }
    
    stopAudioCapture()
    wsConnectedRef.current = false
    releaseStartingVoice()
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (brainStreamAbortRef.current) {
      brainStreamAbortRef.current.abort()
      brainStreamAbortRef.current = null
    }
    setWsConnected(false)
    setTestPhase("ready")
    setLastResponse("")
    setMemorySession(null)
    setJarvisMessage("Voice session ended.")
    addLog("info", "Session stopped")
  }
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (decoderWorkerRef.current) decoderWorkerRef.current.terminate()
      if (audioWorkletNodeRef.current) audioWorkletNodeRef.current.disconnect()
      if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current)
      if (warmupIntervalRef.current) clearInterval(warmupIntervalRef.current)
      if (brainStreamAbortRef.current) brainStreamAbortRef.current.abort()
    }
  }, [])
  
  // Warm LAN TCP connections so probes stay in double-digit ms
  useEffect(() => {
    const warm = () => {
      fetch("/api/test-voice/ping", { cache: "no-store" }).catch(() => {})
    }
    warm()
    const id = setInterval(warm, 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    setUiReady(true)
    addLog("info", "MYCA Voice Suite v9.0.0 - Full Consciousness Integration")
    addLog("info", "February 12, 2026")
    addLog("info", "CUDA graphs warmup support + Consciousness modules + Memory bridge")
    addLog("info", "Default voice: Moshika / NATF2 (PersonaPlex female) — ElevenLabs not used")
    const t = window.setTimeout(() => {
      void checkServices()
    }, 250)
    return () => window.clearTimeout(t)
  }, [addLog, checkServices])

  const logsRef = useRef(logs)
  logsRef.current = logs
  const testPhaseRef = useRef(testPhase)
  testPhaseRef.current = testPhase

  // Persist debug logs for agent review (production only — route skips disk in dev)
  useEffect(() => {
    const syncLogs = () => {
      const current = logsRef.current
      if (current.length === 0) return
      fetch("/api/test-voice/debug-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logs: current.slice(-40).map((l) => ({
            level: l.level,
            message: l.message,
            details: l.details,
            timestamp: l.timestamp.toISOString(),
          })),
          meta: {
            sessionId: sessionIdRef.current,
            phase: testPhaseRef.current,
            wsConnected: wsConnectedRef.current,
            moshiPending,
            bridgeVoiceId,
          },
        }),
      }).catch(() => {})
    }
    const id = setInterval(syncLogs, 60000)
    return () => clearInterval(id)
  }, [bridgeVoiceId, moshiPending])
  
  // Waveform component
  const Waveform = ({ data, color, label }: { data: number[], color: string, label: string }) => (
    <div className="bg-zinc-900 rounded-lg p-3">
      <div className="text-xs text-zinc-500 mb-2">{label}</div>
      <div className="flex items-end gap-px h-12">
        {data.map((value, i) => (
          <div 
            key={i}
            className="flex-1 rounded-t transition-all duration-75"
            style={{ 
              height: `${Math.max(2, value / 4)}%`,
              backgroundColor: color
            }}
          />
        ))}
      </div>
    </div>
  )

  if (!uiReady) {
    return (
      <div className="min-h-dvh bg-zinc-950 text-white p-4 flex items-center justify-center">
        <p className="text-zinc-400 text-sm">Loading MYCA Voice Test…</p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-zinc-950 text-white p-4" suppressHydrationWarning>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent animate-pulse">
            MYCA Voice Suite v9.0.0 🧠
          </h1>
          <p className="text-zinc-500 text-sm">Full Consciousness | Memory Bridge | Emotional Intelligence | Intent Classifier</p>
          <p className="text-zinc-600 text-xs mt-1">
            Dev server: <code className="text-cyan-500">cd website && npm run dev:next-only</code> or <code className="text-cyan-500">.\scripts\start-dev.ps1</code>
          </p>
        </div>
        
        {/* Status bar */}
        <div className="rounded-xl p-3 mb-4 border bg-cyan-900/20 border-cyan-800/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-3 h-3 rounded-full",
                wsConnected ? "bg-green-400" : moshiPending ? "bg-amber-400 animate-pulse" : "bg-cyan-400 animate-pulse"
              )} />
              <p className="text-sm">{jarvisMessage}</p>
              {moshiPending && !wsConnected && (
                <Badge variant="outline" className="text-amber-400 border-amber-700 text-[10px]">Moshi warmup</Badge>
              )}
            </div>
            {/* Text Clone Status */}
            {textCloneStatus !== "idle" && (
              <div className={cn(
                "flex items-center gap-2 px-3 py-1 rounded-full text-xs",
                textCloneStatus === "cloning" && "bg-yellow-900/50 text-yellow-400",
                textCloneStatus === "success" && "bg-green-900/50 text-green-400",
                textCloneStatus === "error" && "bg-red-900/50 text-red-400",
              )}>
                <ArrowRight className="w-3 h-3" />
                <span>MAS: {textCloneStatus}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Controls + Conversation */}
          <div className="lg:col-span-3 space-y-4">
            <VoiceSystemAuditPanel
              onLog={(level, message, details) => addLog(level, message, details)}
              onVoiceReadyChange={setVoiceReady}
              onVoiceStackReadyChange={setVoiceStackReady}
              pollMs={20000}
              autoStartWhenOffline={false}
            />
            {/* Services */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <Server className="w-4 h-4 text-cyan-400" />
                  Services
                </h2>
                <Button variant="outline" size="sm" onClick={checkServices} disabled={testPhase === "checking"}>
                  <RefreshCw className={cn("w-3 h-3", testPhase === "checking" && "animate-spin")} />
                </Button>
              </div>
              
              <div className="space-y-1">
                {services.map((service, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 text-xs">
                    <div className="flex items-center gap-2">
                      {service.status === "online" ? <CheckCircle2 className="w-3 h-3 text-green-500" /> :
                       service.status === "offline" ? <XCircle className="w-3 h-3 text-red-500" /> :
                       <RefreshCw className="w-3 h-3 text-zinc-400 animate-spin" />}
                      <span className="truncate">{service.name}</span>
                    </div>
                    {service.latency && (
                      <span className={cn(
                        service.latency <= 50 ? "text-emerald-400" :
                        service.latency <= 100 ? "text-yellow-400" : "text-orange-400"
                      )}>{service.latency}ms</span>
                    )}
                  </div>
                ))}
                <p className="text-[10px] text-zinc-500 mt-2 pt-2 border-t border-zinc-800 truncate" title={bridgeWsBaseUrl}>
                  Bridge WS: {bridgeWsBaseUrl}
                </p>
                {services[1]?.status === "offline" && (
                  <div className="mt-2 p-2 bg-amber-900/30 border border-amber-700/40 rounded text-[10px] text-amber-200">
                    <strong>Bridge offline.</strong> Start PersonaPlex Bridge on the Voice Legion <code className="text-amber-400">{GPU_LEGION_DEFAULTS.VOICE}:8999</code> or locally <code className="text-amber-400">python services/personaplex-local/personaplex_bridge_nvidia.py</code> (MAS repo). Set <code className="text-amber-400">NEXT_PUBLIC_PERSONAPLEX_BRIDGE_WS_URL</code> in website .env.local.
                  </div>
                )}
              </div>
            </div>
            
            {/* Protocol Mode Diagnostics - A2A vs legacy for agent validation */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
              <h2 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <span className="text-cyan-400">🔗</span>
                Protocol Mode
              </h2>
              <div className="flex items-center gap-2 mb-2">
                <Button
                  variant={protocolMode === "legacy" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 text-xs h-8"
                  onClick={() => setProtocolMode("legacy")}
                >
                  Legacy
                </Button>
                <Button
                  variant={protocolMode === "a2a" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 text-xs h-8"
                  onClick={() => setProtocolMode("a2a")}
                >
                  A2A
                </Button>
              </div>
              <p className="text-[10px] text-zinc-500">
                Selected: <code className="text-cyan-400">{protocolMode}</code>
                {lastProtocolMode && (
                  <span> • Last response: <code className="text-emerald-400">{lastProtocolMode}</code></span>
                )}
              </p>
              <p className="text-[10px] text-zinc-600 mt-1">
                Text clone uses persona harness (brain-chat). Bridge handles TTS via edge-tts locally.
              </p>
            </div>

            {/* v9 Diagnostics Toggle */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="v9-diagnostics" className="font-semibold text-sm flex items-center gap-2 cursor-pointer">
                  <span className="text-cyan-400">v9</span>
                  Diagnostics
                </Label>
                <Switch
                  id="v9-diagnostics"
                  checked={useV9Diagnostics}
                  onCheckedChange={setUseV9Diagnostics}
                  aria-label="Enable v9 unified diagnostics"
                />
              </div>
              <p className="text-[10px] text-zinc-500 mt-2">
                Unified session rail: transcript, events, latency, persona, sync.
              </p>
            </div>
            
            {/* Prerequisites - visible before first use */}
            <div className="bg-amber-950/40 border border-amber-700/50 rounded-xl p-3 text-xs">
              <h3 className="font-semibold text-amber-400 mb-1">Voice stack</h3>
              <p className="text-amber-200/90">
                Moshi + Bridge run locally on <code className="px-1 py-0.5 bg-zinc-800 rounded">127.0.0.1:8998/8999</code>.
                Use <strong>Start Stack</strong> above if ports are closed. Voice: <strong>Moshika / NATF2</strong>.
              </p>
            </div>
            
            {/* Voice Controls */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
              <h2 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <Mic className="w-4 h-4 text-cyan-400" />
                Voice Control
              </h2>
              <div className="mb-3 space-y-1">
                <Label htmlFor="bridge-voice" className="text-xs text-zinc-400">
                  PersonaPlex voice (Moshi)
                </Label>
                <Select
                  value={bridgeVoiceId}
                  onValueChange={(v) => setBridgeVoiceId(v as "myca" | "moshika")}
                >
                  <SelectTrigger id="bridge-voice" className="h-9 text-xs w-full min-h-[44px] text-base sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="moshika" className="min-h-[44px]">Moshika / NATF2 (female, recommended)</SelectItem>
                    <SelectItem value="myca" className="min-h-[44px]">MYCA alias</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-zinc-500">
                  Sent to Bridge <code className="text-cyan-600/90">POST /session</code> as <code>voice</code> before you start.
                </p>
              </div>
              
              {wsConnected ? (
                <Button onClick={stopVoice} variant="destructive" className="w-full" size="sm">
                  <MicOff className="w-4 h-4 mr-2" />
                  Stop Session
                </Button>
              ) : (
                <Button 
                  onClick={() => void startMycaVoice()}
                  disabled={isStartingVoice}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  size="sm"
                >
                  <Mic className={cn("w-4 h-4 mr-2", isStartingVoice && "animate-pulse")} />
                  {isStartingVoice ? "Starting MYCA Voice…" : "Start MYCA Voice"}
                </Button>
              )}
              
              {wsConnected && (
                <>
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <div className={cn("w-2 h-2 rounded-full", isRecognizing ? "bg-green-500 animate-pulse" : "bg-gray-500")} />
                      <span>{isRecognizing ? "Listening" : "Ready"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className={cn("w-2 h-2 rounded-full", isSpeaking ? "bg-blue-500 animate-pulse" : "bg-gray-500")} />
                      <span>{isSpeaking ? "MYCA Speaking" : "Silent"}</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      placeholder="Type..."
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendTextMessage()}
                      className="flex-1 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs"
                    />
                    <Button onClick={sendTextMessage} disabled={!textInput.trim()} size="sm">
                      <Send className="w-3 h-3" />
                    </Button>
                  </div>
                </>
              )}
            </div>
            
            {/* MYCA Brain Status */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-400" />
                  MYCA Brain
                </h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs min-h-[44px]"
                  onClick={runBrainSseProbe}
                >
                  Test SSE
                </Button>
              </div>
              <p className="text-[10px] text-zinc-500 mb-2">
                Probes <code className="text-zinc-400">POST /api/myca/brain/stream</code> (MAS <code className="text-zinc-400">/voice/brain/stream</code>). Live voice still uses Bridge → <code className="text-zinc-400">/voice/brain/chat</code>.
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    brainStatus === "idle" ? "bg-gray-500" :
                    brainStatus === "thinking" ? "bg-yellow-500 animate-pulse" :
                    "bg-green-500 animate-pulse"
                  )} />
                  <span>
                    {brainStatus === "idle" ? "Ready" :
                     brainStatus === "thinking" ? "Thinking..." :
                     "Responding"}
                  </span>
                  {brainProvider && <span className="text-purple-400 ml-auto">{brainProvider}</span>}
                </div>
                
                {brainResponse && (
                  <div className="mt-2 p-2 bg-purple-900/20 border border-purple-700/30 rounded text-xs overflow-hidden">
                    <p className="text-purple-200 break-words whitespace-pre-wrap" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                      {brainResponse.length > 200 ? brainResponse.substring(0, 200) + "..." : brainResponse}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Memory Session */}
            {memorySession && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <h2 className="font-semibold text-sm flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-purple-400" />
                  Memory Session
                </h2>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center p-2 bg-zinc-800 rounded">
                    <div className="text-lg font-bold text-purple-400">{memorySession.turnCount}</div>
                    <div className="text-zinc-500">Turns</div>
                  </div>
                  <div className="text-center p-2 bg-zinc-800 rounded">
                    <div className="text-lg font-bold text-green-400">{memorySession.memoryWrites}</div>
                    <div className="text-zinc-500">Writes</div>
                  </div>
                  <div className="text-center p-2 bg-zinc-800 rounded">
                    <div className="text-lg font-bold text-blue-400">{memorySession.memoryReads}</div>
                    <div className="text-zinc-500">Reads</div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {memorySession.activeScopes.map(scope => (
                    <span key={scope} className="text-[10px] bg-purple-900/50 text-purple-400 px-1.5 py-0.5 rounded">
                      {scope}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Conversation */}
            {(transcript || lastResponse || interimTranscript) && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-2 overflow-hidden">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  Conversation
                </h2>
                {interimTranscript && (
                  <div className="p-2 bg-yellow-900/30 rounded border border-yellow-800/30 text-xs break-all whitespace-pre-wrap" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    <span className="text-yellow-400">Speaking: </span>
                    <span className="italic text-yellow-200/70">{interimTranscript}</span>
                  </div>
                )}
                {transcript && (
                  <div className="p-2 bg-green-900/30 rounded text-xs break-all whitespace-pre-wrap" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    <span className="text-green-400">You: </span>
                    <span>{transcript}</span>
                  </div>
                )}
                {lastResponse && (
                  <div className="p-2 bg-blue-900/30 rounded text-xs break-all whitespace-pre-wrap" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    <span className="text-blue-400">MYCA: </span>
                    <span>{lastResponse}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Center Column: MYCA Consciousness + MAS Event Engine (or v9 Diagnostics) */}
          <div className="lg:col-span-5 space-y-4">
            {/* v9 Diagnostics Console - when useV9Diagnostics is on */}
            {useV9Diagnostics && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <SessionHeader
                    connected={v9.connected}
                    sessionId={v9.sessionId}
                    mode="v9"
                  />
                  <AudioControls
                    micActive={isRecognizing}
                    outputActive={isSpeaking}
                    onMicToggle={() => {
                      if (isRecognizing) stopAudioCapture()
                      else if (testPhase === "listening" && wsRef.current) startAudioCapture(wsRef.current)
                    }}
                    onOutputToggle={() => {}}
                    disabled={testPhase !== "listening"}
                  />
                </div>
                <LiveTranscriptPane
                  transcripts={v9.transcripts}
                  interimText={interimTranscript}
                  maxHeight="180px"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <EventPane events={v9.events} maxHeight="160px" />
                  <MASPane
                    updates={v9.events.map((e) => ({
                      id: e.event_id,
                      type: (e.source === "tool_completion" ? "tool" : e.source === "mas_task" ? "task" : "agent") as "tool" | "agent" | "task",
                      message: e.summary ?? "",
                      timestamp: e.created_at,
                      status: e.speech_worthy ? "spoken" : "pending",
                    }))}
                    maxHeight="160px"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <LatencyPane traces={v9.latencyTraces} maxHeight="120px" />
                  <PersonaPane state={v9.personaState} onRefresh={v9.refreshPersona} />
                  <SyncPane
                    interruptState={v9.interruptState}
                    lastSyncAt={v9.transcripts.length > 0 ? v9.transcripts[v9.transcripts.length - 1]?.created_at ?? null : null}
                    inSync={v9.connected}
                  />
                </div>
              </div>
            )}

            {/* MYCA Consciousness Status - hidden when v9 diagnostics on */}
            {!useV9Diagnostics && consciousnessState && (
              <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-800/30 rounded-xl p-4">
                <h2 className="font-semibold flex items-center gap-2 mb-3">
                  <Brain className="w-5 h-5 text-purple-400 animate-pulse" />
                  MYCA Consciousness - v9.0.0
                  <Badge className="ml-auto">{consciousnessState.state.toUpperCase()}</Badge>
                </h2>
                
                {/* Emotional State */}
                {consciousnessState.emotionalState?.emotions && (
                  <div className="mb-3">
                    <div className="text-xs text-zinc-400 mb-2 flex items-center gap-2">
                      <Heart className="w-3 h-3 text-pink-400" />
                      Emotional State
                    </div>
                    <div className="space-y-1.5">
                      {consciousnessState.emotionalState.emotions.slice(0, 3).map((emotion, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-xs text-zinc-300 w-20">{emotion.emotion}</span>
                          <Progress value={emotion.intensity * 100} className="flex-1 h-2" />
                          <span className="text-xs text-zinc-400">{Math.round(emotion.intensity * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Self-Reflections */}
                {consciousnessState.selfReflections?.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs text-zinc-400 mb-2 flex items-center gap-2">
                      <Lightbulb className="w-3 h-3 text-yellow-400" />
                      Latest Self-Reflection
                    </div>
                    <div className="text-xs text-zinc-300 italic bg-zinc-800/50 rounded p-2">
                      "{consciousnessState.selfReflections[0].content}"
                    </div>
                  </div>
                )}
                
                {/* Autobiographical Context */}
                {consciousnessState.autobiographicalContext && (
                  <div className="mb-3">
                    <div className="text-xs text-zinc-400 mb-2 flex items-center gap-2">
                      <Eye className="w-3 h-3 text-blue-400" />
                      Memory of You
                    </div>
                    <div className="text-xs text-zinc-300 bg-zinc-800/50 rounded p-2">
                      {consciousnessState.autobiographicalContext.substring(0, 150)}...
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Legacy center content - hidden when v9 diagnostics on */}
            {!useV9Diagnostics && (
            <>
            {/* MAS Event Engine Header */}
            <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-800/30 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-400" />
                  MAS Event Engine
                </h2>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    wsConnected ? "bg-green-500 animate-pulse" : "bg-gray-500"
                  )} />
                  <span className="text-xs text-zinc-400">{wsConnected ? "Active" : "Inactive"}</span>
                </div>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Real-time processing of your speech → MAS tools/agents → Feedback injection to MYCA
              </p>
            </div>
            
            {/* Text Clone Display */}
            {lastClonedText && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowRight className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-zinc-400">Last cloned to MAS:</span>
                </div>
                <div className="p-2 bg-yellow-900/20 border border-yellow-800/30 rounded text-xs">
                  "{lastClonedText}"
                </div>
              </div>
            )}
            
            {/* Waveforms */}
            <div className="grid grid-cols-2 gap-2">
              <Waveform data={inputWaveform} color="#22c55e" label="Your Voice" />
              <Waveform data={outputWaveform} color="#3b82f6" label="MYCA Voice" />
            </div>
            
            {/* Injection Queue */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-pink-400" />
                Feedback Injection Queue
                <span className="text-xs text-zinc-500">({injectionQueue.length})</span>
              </h3>
              {injectionQueue.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">No pending injections</p>
              ) : (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {injectionQueue.slice(-5).map((item) => (
                    <div key={item.id} className="p-2 bg-zinc-800 rounded text-xs flex items-start gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full mt-1 flex-shrink-0",
                        item.status === "queued" && "bg-yellow-500",
                        item.status === "injecting" && "bg-blue-500 animate-pulse",
                        item.status === "injected" && "bg-green-500",
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] px-1 rounded",
                            item.type === "tool_result" && "bg-yellow-900 text-yellow-400",
                            item.type === "agent_update" && "bg-purple-900 text-purple-400",
                            item.type === "system_alert" && "bg-red-900 text-red-400",
                            item.type === "memory_insight" && "bg-blue-900 text-blue-400",
                          )}>{item.type}</span>
                          <span className="text-zinc-500">{item.status}</span>
                        </div>
                        <div className="text-zinc-300 truncate">{item.content}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Tool Calls */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <Wrench className="w-4 h-4 text-yellow-400" />
                Tool Calls
                <span className="text-xs text-zinc-500">({toolCalls.length})</span>
              </h3>
              {toolCalls.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">No tool calls yet</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {toolCalls.slice(-5).map((call) => (
                    <div key={call.id} className="p-2 bg-zinc-800 rounded text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="w-3 h-3 text-yellow-400" />
                          <span className="font-mono text-yellow-400">{call.tool}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {call.duration && <span className="text-zinc-500">{call.duration}ms</span>}
                          <span className={cn(
                            "px-1.5 rounded text-[10px]",
                            call.status === "pending" && "bg-yellow-900 text-yellow-400",
                            call.status === "running" && "bg-blue-900 text-blue-400",
                            call.status === "success" && "bg-green-900 text-green-400",
                            call.status === "error" && "bg-red-900 text-red-400",
                          )}>{call.status}</span>
                        </div>
                      </div>
                      {call.result && (
                        <div className="mt-1 text-zinc-400 truncate">{call.result}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Agent Activity */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-purple-400" />
                Agent Activity
                <span className="text-xs text-zinc-500">({agentActivity.length})</span>
              </h3>
              {agentActivity.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">No agents invoked yet</p>
              ) : (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {agentActivity.slice(-5).map((agent) => (
                    <div key={agent.id} className="p-2 bg-zinc-800 rounded text-xs flex items-center gap-2">
                      <Bot className="w-3 h-3 text-purple-400" />
                      <span className="font-medium text-purple-400">{agent.agentName}</span>
                      <ArrowRight className="w-3 h-3 text-zinc-500" />
                      <span className="text-zinc-300 flex-1 truncate">{agent.action}</span>
                      <span className={cn(
                        "px-1.5 rounded text-[10px]",
                        agent.status === "invoked" && "bg-yellow-900 text-yellow-400",
                        agent.status === "processing" && "bg-blue-900 text-blue-400",
                        agent.status === "completed" && "bg-green-900 text-green-400",
                        agent.status === "failed" && "bg-red-900 text-red-400",
                      )}>{agent.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </>
            )}
          </div>
          
          {/* Right Column: Metrics + Logs */}
          <div className="lg:col-span-4 space-y-4">
            {/* Latency Metrics */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <BarChart2 className="w-4 h-4 text-cyan-400" />
                Latency Metrics
              </h3>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 bg-zinc-800 rounded">
                  <div className="text-lg font-bold text-green-400">{getAvgLatency(latencyMetrics.sttLatency)}</div>
                  <div className="text-zinc-500">STT</div>
                </div>
                <div className="p-2 bg-zinc-800 rounded">
                  <div className="text-lg font-bold text-yellow-400">{getAvgLatency(latencyMetrics.llmLatency)}</div>
                  <div className="text-zinc-500">LLM</div>
                </div>
                <div className="p-2 bg-zinc-800 rounded">
                  <div className="text-lg font-bold text-blue-400">{getAvgLatency(latencyMetrics.ttsLatency)}</div>
                  <div className="text-zinc-500">TTS</div>
                </div>
                <div className="p-2 bg-zinc-800 rounded">
                  <div className="text-lg font-bold text-purple-400">{getAvgLatency(latencyMetrics.masLatency)}</div>
                  <div className="text-zinc-500">MAS</div>
                </div>
              </div>
            </div>
            
            {/* Audio Stats */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Audio Stats
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-zinc-800 rounded">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Sent</span>
                    <span className="font-mono">{(audioStats.bytesOut / 1024).toFixed(1)}KB ({audioStats.chunksOut})</span>
                  </div>
                </div>
                <div className="p-2 bg-zinc-800 rounded">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Received</span>
                    <span className="font-mono">{(audioStats.bytesIn / 1024).toFixed(1)}KB ({audioStats.chunksIn})</span>
                  </div>
                </div>
              </div>
              {/* Level Meters */}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Input</div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full transition-all", 
                        micLevel > 60 ? "bg-green-500" : micLevel > 30 ? "bg-yellow-500" : "bg-red-500"
                      )}
                      style={{ width: `${micLevel}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Output</div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all" style={{ width: `${outputLevel}%` }} />
                  </div>
                </div>
              </div>
            </div>
            
            {/* MAS Events */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <HardDrive className="w-4 h-4 text-pink-400" />
                MAS Events
                <span className="text-xs text-zinc-500">({masEvents.length})</span>
              </h3>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {masEvents.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No MAS events yet</p>
                ) : (
                  masEvents.slice(-5).map((event, i) => (
                    <div key={i} className="p-1.5 bg-zinc-800 rounded text-xs">
                      <span className={cn(
                        "text-[10px] px-1 rounded mr-1",
                        event.type === "tool_call" && "bg-yellow-900 text-yellow-400",
                        event.type === "memory_write" && "bg-green-900 text-green-400",
                        event.type === "memory_read" && "bg-blue-900 text-blue-400",
                        event.type === "agent_invoke" && "bg-purple-900 text-purple-400",
                        event.type === "system" && "bg-gray-900 text-gray-400",
                        event.type === "feedback" && "bg-pink-900 text-pink-400",
                      )}>{event.type}</span>
                      <span className="text-zinc-300">{event.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* Debug Logs */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  Debug Logs
                </h3>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => setLogs([])} className="h-6 text-xs px-2">
                    Clear
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    const logText = logs.map(l => 
                      `[${l.timestamp.toISOString()}] [${l.level}] ${l.message}`
                    ).join("\n")
                    navigator.clipboard.writeText(logText)
                    addLog("info", "Logs copied")
                  }} className="h-6 text-xs px-2">
                    Copy
                  </Button>
                </div>
              </div>
              
              <div className="bg-zinc-950 rounded p-2 h-[200px] overflow-y-auto overflow-x-hidden font-mono text-[10px]">
                {logs.map((log, idx) => (
                  <div key={idx} className="mb-0.5 break-all" style={{ wordBreak: 'break-word' }}>
                    <span className="text-zinc-600">[{log.timestamp.toLocaleTimeString()}]</span>{" "}
                    <span className={cn(
                      log.level === "success" ? "text-green-400" :
                      log.level === "error" ? "text-red-400" :
                      log.level === "warn" ? "text-yellow-400" :
                      log.level === "metric" ? "text-purple-400" :
                      log.level === "tool" ? "text-orange-400" :
                      log.level === "event" ? "text-pink-400" :
                      log.level === "injection" ? "text-cyan-400" :
                      log.level === "clone" ? "text-yellow-400" :
                      log.level === "debug" ? "text-zinc-500" : "text-blue-400"
                    )}>[{log.level.toUpperCase()}]</span>{" "}
                    <span className="text-zinc-300">{log.message}</span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-4 text-center text-zinc-600 text-xs">
          MYCA Voice Suite v9.0.0 | March 11, 2026 | PersonaPlex Full-Duplex + MAS Event Engine + v9 Session Rail
        </div>
      </div>
    </div>
  )
}
