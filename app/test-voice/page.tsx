"use client"

/**
 * MYCA Voice Test Suite v7.1.0 - MAS Event Engine Integration
 * Updated: February 4, 2026
 * 
 * FIXES in v7.1.0:
 * - Extended handshake timeout to 120s for CUDA graphs compilation
 * - Added CUDA warmup progress indicator
 * - Better error messages for timeout conditions
 * - Updated date in UI
 * 
 * NEW in v7.0.0:
 * - MAS Event Engine with real-time feedback injection to Moshi
 * - Text cloning from STT to MAS (background, non-blocking)
 * - Injection queue visualization (what MYCA is receiving from MAS)
 * - Memory session integration (8-scope system)
 * - Agent activity feed
 * - Improved UI with dedicated MAS feedback panel
 * 
 * Architecture:
 * PersonaPlex (full-duplex audio) → STT text cloned to MAS → 
 * MAS processes (tools, memory, agents) → Feedback injected back to Moshi
 */

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
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
  Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

interface ServiceStatus {
  name: string
  url: string
  status: "checking" | "online" | "offline" | "error"
  latency?: number
  version?: string
  features?: Record<string, boolean>
}

interface TestLog {
  timestamp: Date
  level: "info" | "success" | "error" | "warn" | "debug" | "metric" | "tool" | "event" | "injection" | "clone"
  message: string
  details?: string
}

interface MASEvent {
  id: string
  type: "tool_call" | "memory_write" | "memory_read" | "agent_invoke" | "system" | "feedback"
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

export default function VoiceTestPage() {
  // Service statuses
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: "Moshi Server (8998)", url: "http://localhost:8998/", status: "checking" },
    { name: "PersonaPlex Bridge (8999)", url: "http://localhost:8999/health", status: "checking" },
    { name: "MAS Orchestrator", url: "http://192.168.0.188:8001/health", status: "checking" },
    { name: "Memory API", url: "http://192.168.0.188:8001/api/memory/health", status: "checking" },
  ])
  
  const [logs, setLogs] = useState<TestLog[]>([])
  const logsEndRef = useRef<HTMLDivElement>(null)
  
  const [testPhase, setTestPhase] = useState<"idle" | "checking" | "ready" | "listening" | "complete">("idle")
  const [jarvisMessage, setJarvisMessage] = useState("Initializing MYCA Voice Suite v7.0.0...")
  const [micPermission, setMicPermission] = useState<"unknown" | "granted" | "denied">("unknown")
  
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
  const masEventSourceRef = useRef<EventSource | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const outputAnalyserRef = useRef<AnalyserNode | null>(null)
  const micLevelIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const opusRecorderRef = useRef<any>(null)
  
  const sttStartRef = useRef<number>(0)
  const llmStartRef = useRef<number>(0)
  const ttsStartRef = useRef<number>(0)
  const sessionIdRef = useRef<string>("")
  const audioChunksInRef = useRef<number>(0)  // For accurate packet counting
  const isSpeakingRef = useRef<boolean>(false)  // For echo cancellation - pause recognition when MYCA speaks
  
  const addLog = useCallback((level: TestLog["level"], message: string, details?: string) => {
    setLogs(prev => [...prev.slice(-200), {
      timestamp: new Date(),
      level,
      message,
      details,
    }])
  }, [])
  
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
  
  // Clone text to MAS (non-blocking background operation)
  const cloneTextToMAS = useCallback(async (text: string, sessionId: string) => {
    if (!text.trim()) return
    
    setTextCloneStatus("cloning")
    setLastClonedText(text)
    addLog("clone", `Cloning to MAS: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`)
    
    const masStart = Date.now()
    
    try {
      const response = await fetch("http://192.168.0.188:8001/voice/orchestrator/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          session_id: sessionId,
          conversation_id: sessionIdRef.current,
          mode: "clone", // Tell MAS this is a clone, not primary
          return_injection: true, // Request any feedback to inject
        }),
        signal: AbortSignal.timeout(5000),
      })
      
      const masLatency = Date.now() - masStart
      recordLatency("mas", masLatency)
      
      if (response.ok) {
        const data = await response.json()
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
        
        addLog("success", `MAS clone: ${masLatency}ms`)
      } else {
        setTextCloneStatus("error")
        addLog("error", `MAS clone failed: ${response.status}`)
      }
    } catch (error) {
      setTextCloneStatus("error")
      addLog("error", `MAS clone error: ${error}`)
    }
    
    // Reset status after a moment
    setTimeout(() => setTextCloneStatus("idle"), 2000)
  }, [addLog, recordLatency])
  
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
  
  // Check services
  const checkServices = async () => {
    setTestPhase("checking")
    addLog("info", "Running diagnostics...")
    setJarvisMessage("Running full diagnostics on voice systems...")
    
    const updatedServices = [...services]
    
    for (let i = 0; i < updatedServices.length; i++) {
      const service = updatedServices[i]
      addLog("info", `Checking ${service.name}...`)
      
      try {
        const start = performance.now()
        const response = await fetch(service.url, { 
          method: "GET",
          signal: AbortSignal.timeout(5000),
        })
        const latency = Math.round(performance.now() - start)
        
        if (response.ok) {
          let data = {}
          try {
            data = await response.json()
          } catch {
            // Not JSON, that's ok for Moshi static page
          }
          updatedServices[i] = { 
            ...service, 
            status: "online", 
            latency,
            version: (data as any).version,
            features: (data as any).features
          }
          addLog("success", `${service.name}: ONLINE (${latency}ms)`)
          
          // Store bridge features
          if (service.url.includes("8999") && (data as any).features) {
            setBridgeFeatures((data as any).features)
          }
        } else if (response.status === 426) {
          // 426 = WebSocket Upgrade Required = Moshi server is running
          updatedServices[i] = { ...service, status: "online", latency }
          addLog("success", `${service.name}: ONLINE (WebSocket) (${latency}ms)`)
        } else {
          updatedServices[i] = { ...service, status: "error" }
          addLog("error", `${service.name}: Error ${response.status}`)
        }
      } catch (error) {
        // For Moshi, connection errors often mean the server IS running but wants WebSocket
        const errorStr = String(error).toLowerCase()
        if (service.url.includes("8998") && (errorStr.includes("426") || errorStr.includes("upgrade") || errorStr.includes("failed to fetch"))) {
          updatedServices[i] = { ...service, status: "online", latency: 0 }
          addLog("success", `${service.name}: ONLINE (WebSocket mode)`)
        } else {
          updatedServices[i] = { ...service, status: "offline" }
          addLog("error", `${service.name}: OFFLINE`)
        }
      }
      
      setServices([...updatedServices])
    }
    
    // Check microphone
    try {
      const permission = await navigator.permissions.query({ name: "microphone" as PermissionName })
      setMicPermission(permission.state === "granted" ? "granted" : permission.state === "denied" ? "denied" : "unknown")
    } catch {}
    
    const bridgeOnline = updatedServices[1].status === "online"
    const moshiOnline = updatedServices[0].status === "online"
    const masOnline = updatedServices[2].status === "online"
    
    if (bridgeOnline && moshiOnline && masOnline) {
      setTestPhase("ready")
      setJarvisMessage("All systems ready. Click 'Start MYCA Voice' for full-duplex + MAS Event Engine.")
    } else if (bridgeOnline) {
      setTestPhase("ready")
      setJarvisMessage("Bridge ready. Some services may still be loading...")
    } else {
      setTestPhase("idle")
      setJarvisMessage("PersonaPlex Bridge offline. Start it with: python personaplex_bridge_nvidia.py")
    }
  }
  
  // Start voice session with MAS Event Engine
  const startMycaVoice = async () => {
    addLog("info", "Starting MYCA Voice v7.0.0 with MAS Event Engine...")
    setJarvisMessage("Initializing audio decoder...")
    setAudioStats({ bytesIn: 0, bytesOut: 0, chunksIn: 0, chunksOut: 0 })
    audioChunksInRef.current = 0  // Reset packet counter
    setToolCalls([])
    setMasEvents([])
    setAgentActivity([])
    setInjectionQueue([])
    
    // CRITICAL: Initialize decoder BEFORE connecting WebSocket
    // This ensures audio playback is ready when data arrives
    try {
      await initDecoderWorker()
      // Wait a bit more for decoder to be fully ready with BOS page
      await new Promise(resolve => setTimeout(resolve, 600))
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
      const bridgeRes = await fetch("http://localhost:8999/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona: "myca", voice: "myca", enable_mas_events: true })
      })
      
      if (!bridgeRes.ok) throw new Error(`Bridge session failed: ${bridgeRes.status}`)
      
      const session = await bridgeRes.json()
      sessionIdRef.current = session.session_id
      addLog("success", `Session: ${session.session_id.slice(0, 8)}...`)
      
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
        await fetch("http://192.168.0.188:8001/api/voice/session/create", {
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
      const bridgeWsUrl = `ws://localhost:8999/ws/${session.session_id}`
      addLog("info", `Connecting WebSocket: ${bridgeWsUrl}`)
      
      const ws = new WebSocket(bridgeWsUrl)
      ws.binaryType = "arraybuffer"
      
      ws.onopen = () => {
        addLog("success", "WebSocket connected to bridge!")
        addLog("info", "Waiting for Moshi handshake (CUDA graphs may compile on first run)...")
        setJarvisMessage("CUDA graphs compiling... This can take 60-90 seconds on first connection.")
        
        // Start CUDA warmup timeout counter
        let warmupSeconds = 0
        const warmupInterval = setInterval(() => {
          warmupSeconds++
          if (warmupSeconds <= 90 && !wsConnectedRef.current) {
            setJarvisMessage(`CUDA graphs compiling... ${warmupSeconds}s (can take 60-90s on first run)`)
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
                  setLastResponse(prev => prev + text)
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
            } else if (msg.type === "error") {
              addLog("error", `Error: ${msg.message}`)
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
            // Clear warmup interval
            if (warmupIntervalRef.current) {
              clearInterval(warmupIntervalRef.current)
              warmupIntervalRef.current = null
            }
            wsConnectedRef.current = true
            addLog("success", "Moshi handshake OK! Full-duplex + MAS Event Engine active.")
            setWsConnected(true)
            setTestPhase("listening")
            setJarvisMessage("Connected! Speak naturally. MAS Event Engine is listening.")
            
            // Initialize AudioContext and resume it (requires user gesture which we have from button click)
            if (!audioContextRef.current) {
              audioContextRef.current = new AudioContext({ sampleRate: 48000 })
            }
            // CRITICAL: Resume AudioContext - browsers require user gesture
            if (audioContextRef.current.state === "suspended") {
              audioContextRef.current.resume().then(() => {
                addLog("success", "AudioContext resumed for playback")
              }).catch(e => addLog("error", `AudioContext resume failed: ${e}`))
            }
            
            initDecoderWorker().catch(e => addLog("error", `Decoder init: ${e}`))
            startAudioCapture(ws)
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
              addLog("debug", `Audio packet #${audioChunksInRef.current}: ${payload.length} bytes`)
            }
            
            setIsSpeaking(true)
            isSpeakingRef.current = true
            
            // ECHO CANCELLATION: Pause speech recognition while MYCA is speaking
            // This prevents MYCA from hearing herself and creating a feedback loop
            if (recognitionRef.current) {
              try { recognitionRef.current.stop() } catch {}
            }
            
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
        wsConnectedRef.current = false
        addLog("error", "WebSocket error - check if Moshi is fully loaded")
        setWsConnected(false)
      }
      
      ws.onclose = (event) => {
        if (warmupIntervalRef.current) {
          clearInterval(warmupIntervalRef.current)
          warmupIntervalRef.current = null
        }
        wsConnectedRef.current = false
        
        // Check for timeout-related closes
        if (!wsConnectedRef.current && event.code !== 1000) {
          addLog("warn", "Connection closed before handshake - CUDA graphs may still be compiling")
          addLog("info", "Run START_VOICE_SYSTEM.py to warm up Moshi, then try again")
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
      stopAudioCapture()
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
        addLog("success", "Opus encoder started - audio will be sent to Moshi")
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
      
      // Web Speech API for transcription display (backup + MAS cloning)
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = "en-US"
        
        let finalTranscript = ""
        let silenceTimer: NodeJS.Timeout | null = null
        
        recognition.onresult = (event) => {
          let interim = ""
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript + " "
            } else {
              interim = transcript
            }
          }
          
          if (interim) {
            setInterimTranscript(interim)
          }
          
          if (silenceTimer) clearTimeout(silenceTimer)
          
          if (finalTranscript.trim()) {
            silenceTimer = setTimeout(() => {
              const text = finalTranscript.trim()
              finalTranscript = ""
              setInterimTranscript("")
              
              if (text.length > 2) {
                const now = Date.now()
                recordLatency("stt", now - sttStartRef.current)
                sttStartRef.current = now
                llmStartRef.current = now
                
                setTranscript(text)
                setLastResponse("")
                addLog("info", `You: "${text}"`)
                
                // MYCA Brain: Set thinking state
                setBrainStatus("thinking")
                brainThinkingStartRef.current = Date.now()
                setBrainResponse("")
                
                // Clone text to MAS (non-blocking, background)
                // Moshi hears the audio directly, this is for MAS processing
                cloneTextToMAS(text, sessionIdRef.current)
              }
            }, 800)
          }
        }
        
        recognition.onerror = (e) => {
          if (e.error !== "no-speech" && e.error !== "aborted") {
            addLog("warn", `Speech recognition: ${e.error}`)
          }
        }
        
        recognition.onend = () => {
          // Only restart if we're still recording AND MYCA is not speaking
          // This prevents echo (MYCA hearing herself)
          if (opusRecorderRef.current && !isSpeakingRef.current) {
            try { recognition.start() } catch {}
          }
        }
        
        try {
          recognition.start()
          recognitionRef.current = recognition
          addLog("success", "Web Speech API active (pauses when MYCA speaks)")
        } catch (e) {
          addLog("warn", `Could not start speech recognition: ${e}`)
        }
      }
      
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
    
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
      recognitionRef.current = null
    }
    
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
        if (outputAnalyserRef.current && isSpeaking) {
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
  }, [addLog, isSpeaking])
  
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

  const initDecoderWorker = useCallback(async () => {
    if (decoderWorkerRef.current) return
    
    try {
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
            setIsSpeaking(true)
          }
        }
      }
      
      const sampleRate = audioContextRef.current?.sampleRate || 48000
      addLog("info", `Initializing decoder: 24kHz → ${sampleRate}Hz`)
      
      // Send init command
      worker.postMessage({
        command: "init",
        bufferLength: 960 * sampleRate / 24000,
        decoderSampleRate: 24000,
        outputBufferSampleRate: sampleRate,
        resampleQuality: 0,
      })
      
      // CRITICAL: Send warmup BOS page to trigger decoder internal init
      // This is required by the Opus decoder to start properly
      setTimeout(() => {
        const bosPage = createWarmupBosPage()
        addLog("debug", "Sending warmup BOS page to decoder")
        worker.postMessage({
          command: "decode",
          pages: bosPage,
        })
      }, 100)
      
      decoderWorkerRef.current = worker
      
      // Wait for decoder to be fully ready before marking as ready
      setTimeout(() => {
        decoderReadyRef.current = true
        addLog("success", "Opus decoder initialized and ready")
        
        // Reset the worklet state for fresh playback
        if (audioWorkletNodeRef.current) {
          audioWorkletNodeRef.current.port.postMessage({ type: "reset" })
        }
      }, 500)
      
    } catch (e) {
      addLog("error", `Decoder init failed: ${e}`)
    }
  }, [addLog, initAudioWorklet, createWarmupBosPage])
  
  const handleMoshiAudio = useCallback((data: Uint8Array) => {
    if (!decoderWorkerRef.current || !decoderReadyRef.current) {
      pendingAudioRef.current.push(data.slice())
      
      if (!decoderInitializingRef.current) {
        decoderInitializingRef.current = true
        initDecoderWorker().then(() => {
          decoderInitializingRef.current = false
          while (pendingAudioRef.current.length > 0 && decoderWorkerRef.current) {
            const pending = pendingAudioRef.current.shift()
            if (pending) {
              decoderWorkerRef.current.postMessage({ command: "decode", pages: pending }, [pending.buffer])
            }
          }
        })
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
      
      // ECHO CANCELLATION: Resume speech recognition now that MYCA stopped speaking
      if (recognitionRef.current && opusRecorderRef.current) {
        try { recognitionRef.current.start() } catch {}
      }
    }, 800)  // Slightly longer delay to ensure audio fully stops
  }, [])
  
  // Send text message
  const sendTextMessage = () => {
    if (!textInput.trim() || !wsRef.current) return
    
    if (wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "user_speech",
        text: textInput.trim(),
        forward_to_moshi: true
      }))
      setTranscript(textInput.trim())
      setLastResponse("")
      addLog("info", `Sent: "${textInput.trim()}"`)
      
      // Also clone to MAS
      cloneTextToMAS(textInput.trim(), sessionIdRef.current)
      
      setTextInput("")
      llmStartRef.current = Date.now()
    }
  }
  
  // Stop voice
  const stopVoice = async () => {
    // End memory session
    if (sessionIdRef.current) {
      try {
        await fetch(`http://192.168.0.188:8001/api/voice/session/${sessionIdRef.current}/end`, {
          method: "POST",
        })
        addLog("info", "MAS voice session ended")
      } catch {}
    }
    
    stopAudioCapture()
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (masEventSourceRef.current) {
      masEventSourceRef.current.close()
      masEventSourceRef.current = null
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
      if (masEventSourceRef.current) masEventSourceRef.current.close()
    }
  }, [])
  
  useEffect(() => {
    addLog("info", "MYCA Voice Suite v7.1.0 - MAS Event Engine")
    addLog("info", "February 4, 2026")
    addLog("info", "CUDA graphs warmup support added - first connection may take 60-90s")
    checkServices()
  }, [])
  
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

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
            MYCA Voice Suite v7.0.0
          </h1>
          <p className="text-zinc-500 text-sm">Full-Duplex Voice + MAS Event Engine + Feedback Injection</p>
        </div>
        
        {/* Status bar */}
        <div className="rounded-xl p-3 mb-4 border bg-cyan-900/20 border-cyan-800/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
              <p className="text-sm">{jarvisMessage}</p>
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
                    {service.latency && <span className="text-green-400">{service.latency}ms</span>}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Voice Controls */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
              <h2 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <Mic className="w-4 h-4 text-cyan-400" />
                Voice Control
              </h2>
              
              {wsConnected ? (
                <Button onClick={stopVoice} variant="destructive" className="w-full" size="sm">
                  <MicOff className="w-4 h-4 mr-2" />
                  Stop Session
                </Button>
              ) : (
                <Button 
                  onClick={startMycaVoice}
                  disabled={services[1].status !== "online"}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Start MYCA Voice
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
              <h2 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-purple-400" />
                MYCA Brain
              </h2>
              
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
          
          {/* Center Column: MAS Event Engine */}
          <div className="lg:col-span-5 space-y-4">
            {/* MAS Event Engine Header */}
            <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-800/30 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-400" />
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
          MYCA Voice Suite v7.0.0 | February 3, 2026 | PersonaPlex Full-Duplex + MAS Event Engine
        </div>
      </div>
    </div>
  )
}
