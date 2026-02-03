"use client"

/**
 * MYCA Voice Test Suite - Enhanced Debug Version
 * Created: February 3, 2026
 * 
 * ENHANCED with visual debugging for voice speed and talking issues:
 * - Real-time waveform visualization
 * - Duplex timeline (who's talking when)
 * - Latency metrics (STT, LLM, TTS)
 * - Audio buffer status
 * - Speaking rate detection
 * - Overlap detection
 */

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { 
  Mic, 
  MicOff, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Volume2,
  Wifi,
  Server,
  Cpu,
  ExternalLink,
  Maximize2,
  Send,
  Activity,
  Clock,
  Zap,
  BarChart2
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
  error?: string
}

interface TestLog {
  timestamp: Date
  level: "info" | "success" | "error" | "warn" | "debug" | "metric"
  message: string
  details?: string
}

// Timeline event for duplex visualization
interface TimelineEvent {
  id: string
  type: "user_speaking" | "myca_speaking" | "processing" | "silence"
  startTime: number
  endTime?: number
  label?: string
}

// Latency metrics
interface LatencyMetrics {
  sttLatency: number[]
  llmLatency: number[]
  ttsLatency: number[]
  totalLatency: number[]
  audioBufferMs: number
  lastUpdate: number
}

export default function VoiceTestPage() {
  // Service statuses - Note: Moshi check goes through Bridge to avoid CORS
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: "Moshi Server (8998)", url: "_via_bridge_", status: "checking" },
    { name: "PersonaPlex Bridge (8999)", url: "http://localhost:8999/health", status: "checking" },
    { name: "Voice Orchestrator", url: "/api/mas/voice/orchestrator", status: "checking" },
  ])
  
  // Test logs
  const [logs, setLogs] = useState<TestLog[]>([])
  const logsEndRef = useRef<HTMLDivElement>(null)
  
  // Test state
  const [testPhase, setTestPhase] = useState<"idle" | "checking" | "ready" | "listening" | "complete">("idle")
  const [jarvisMessage, setJarvisMessage] = useState("Initializing MYCA systems...")
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
  
  // ===== DEBUG METRICS =====
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [latencyMetrics, setLatencyMetrics] = useState<LatencyMetrics>({
    sttLatency: [],
    llmLatency: [],
    ttsLatency: [],
    totalLatency: [],
    audioBufferMs: 0,
    lastUpdate: Date.now()
  })
  const [audioStats, setAudioStats] = useState({
    bytesIn: 0,
    bytesOut: 0,
    chunksIn: 0,
    chunksOut: 0,
    droppedFrames: 0,
    bufferUnderruns: 0
  })
  const [overlapDetected, setOverlapDetected] = useState(false)
  const [speakingRate, setSpeakingRate] = useState(0) // words per minute
  
  // Waveform data
  const [inputWaveform, setInputWaveform] = useState<number[]>(new Array(64).fill(0))
  const [outputWaveform, setOutputWaveform] = useState<number[]>(new Array(64).fill(0))
  
  const wsRef = useRef<WebSocket | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const outputAnalyserRef = useRef<AnalyserNode | null>(null)
  const micLevelIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const timelineStartRef = useRef<number>(Date.now())
  const currentEventRef = useRef<TimelineEvent | null>(null)
  
  // Timing refs for latency tracking
  const sttStartRef = useRef<number>(0)
  const llmStartRef = useRef<number>(0)
  const ttsStartRef = useRef<number>(0)
  const utteranceStartRef = useRef<number>(0)
  
  // Add log entry
  const addLog = useCallback((level: TestLog["level"], message: string, details?: string) => {
    setLogs(prev => [...prev.slice(-200), {
      timestamp: new Date(),
      level,
      message,
      details,
    }])
  }, [])
  
  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])
  
  // Add timeline event
  const addTimelineEvent = useCallback((type: TimelineEvent["type"], label?: string) => {
    const now = Date.now()
    
    // End previous event
    if (currentEventRef.current) {
      setTimeline(prev => prev.map(e => 
        e.id === currentEventRef.current?.id ? { ...e, endTime: now } : e
      ))
    }
    
    // Check for overlap
    if (type === "myca_speaking" && currentEventRef.current?.type === "user_speaking") {
      setOverlapDetected(true)
      addLog("warn", "OVERLAP DETECTED: MYCA started speaking while user still talking!")
      setTimeout(() => setOverlapDetected(false), 3000)
    }
    
    // Create new event
    const event: TimelineEvent = {
      id: `${now}_${Math.random().toString(36).slice(2)}`,
      type,
      startTime: now,
      label
    }
    currentEventRef.current = event
    setTimeline(prev => [...prev.slice(-50), event])
  }, [addLog])
  
  // Update latency metric
  const recordLatency = useCallback((type: "stt" | "llm" | "tts" | "total", value: number) => {
    setLatencyMetrics(prev => {
      const key = `${type}Latency` as keyof LatencyMetrics
      const arr = prev[key] as number[]
      return {
        ...prev,
        [key]: [...arr.slice(-20), value],
        lastUpdate: Date.now()
      }
    })
    addLog("metric", `${type.toUpperCase()} Latency: ${value}ms`)
  }, [addLog])
  
  // Calculate average latency
  const getAvgLatency = (arr: number[]) => {
    if (arr.length === 0) return 0
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
  }
  
  // Check services
  const checkServices = async () => {
    setTestPhase("checking")
    addLog("info", "Running diagnostics...")
    setJarvisMessage("Running full diagnostics on all voice systems...")
    
    const updatedServices = [...services]
    let bridgeHealth: { moshi_available?: boolean } | null = null
    
    for (let i = 0; i < updatedServices.length; i++) {
      const service = updatedServices[i]
      addLog("info", `Checking ${service.name}...`)
      
      try {
        // Special case: Check Moshi through Bridge to avoid CORS
        if (service.url === "_via_bridge_") {
          if (bridgeHealth?.moshi_available) {
            updatedServices[i] = { ...service, status: "online", latency: 0 }
            addLog("success", `${service.name}: ONLINE (via Bridge)`)
          } else {
            // Bridge not checked yet, skip for now
            updatedServices[i] = { ...service, status: "checking" }
          }
          continue
        }
        
        const start = performance.now()
        const response = await fetch(service.url, { 
          method: "GET",
          signal: AbortSignal.timeout(5000),
        })
        const latency = Math.round(performance.now() - start)
        
        // 426 = WebSocket server, 405/400 = other valid responses
        if (response.ok || response.status === 426 || response.status === 405 || response.status === 400) {
          updatedServices[i] = { ...service, status: "online", latency }
          addLog("success", `${service.name}: ONLINE (${latency}ms)`)
          
          // If this is the bridge, get moshi_available from response
          if (service.url.includes("8999/health")) {
            try {
              bridgeHealth = await response.json()
              // Now update Moshi status
              if (bridgeHealth?.moshi_available) {
                updatedServices[0] = { ...updatedServices[0], status: "online", latency: 0 }
                addLog("success", `Moshi Server (8998): ONLINE (via Bridge)`)
              } else {
                updatedServices[0] = { ...updatedServices[0], status: "offline", error: "Bridge reports Moshi unavailable" }
                addLog("error", `Moshi Server (8998): OFFLINE (Bridge reports unavailable)`)
              }
            } catch {}
          }
        } else {
          updatedServices[i] = { ...service, status: "error", error: `HTTP ${response.status}` }
          addLog("error", `${service.name}: Error ${response.status}`)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error"
        updatedServices[i] = { ...service, status: "offline", error: errorMsg }
        addLog("error", `${service.name}: OFFLINE`)
      }
      
      setServices([...updatedServices])
    }
    
    // Check microphone
    try {
      const permission = await navigator.permissions.query({ name: "microphone" as PermissionName })
      setMicPermission(permission.state === "granted" ? "granted" : permission.state === "denied" ? "denied" : "unknown")
    } catch {}
    
    const bridgeOnline = updatedServices[1].status === "online"
    if (bridgeOnline) {
      setTestPhase("ready")
      setJarvisMessage("Systems ready. Click 'Start Voice Session' to begin.")
    } else {
      setTestPhase("idle")
      setJarvisMessage("PersonaPlex Bridge offline. Start it with: python personaplex_bridge_nvidia.py")
    }
  }
  
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const opusRecorderRef = useRef<any>(null)
  
  // Start voice session
  const startMycaVoice = async () => {
    addLog("info", "Starting MYCA voice session...")
    setJarvisMessage("Connecting to PersonaPlex Bridge...")
    timelineStartRef.current = Date.now()
    setTimeline([])
    setAudioStats({ bytesIn: 0, bytesOut: 0, chunksIn: 0, chunksOut: 0, droppedFrames: 0, bufferUnderruns: 0 })
    
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
      
      // Set up input audio analysis for waveform
      const monitorCtx = new AudioContext()
      const source = monitorCtx.createMediaStreamSource(stream)
      const analyser = monitorCtx.createAnalyser()
      analyser.fftSize = 128
      source.connect(analyser)
      analyserRef.current = analyser
      
      // Monitor input levels and waveform
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
        body: JSON.stringify({ persona: "myca", voice: "myca" })
      })
      
      if (!bridgeRes.ok) throw new Error(`Bridge session failed: ${bridgeRes.status}`)
      
      const session = await bridgeRes.json()
      addLog("success", `Session: ${session.session_id}`)
      
      // Connect WebSocket
      const bridgeWsUrl = `ws://localhost:8999/ws/${session.session_id}`
      addLog("info", `Connecting WebSocket: ${bridgeWsUrl}`)
      
      const ws = new WebSocket(bridgeWsUrl)
      ws.binaryType = "arraybuffer"
      
      ws.onopen = () => {
        addLog("success", "WebSocket connected!")
      }
      
      ws.onmessage = async (event) => {
        try {
          if (typeof event.data === "string") {
            const msg = JSON.parse(event.data)
            
            if (msg.type === "text") {
              // User's speech transcribed
              if (msg.text?.trim()) {
                const now = Date.now()
                if (sttStartRef.current > 0) {
                  recordLatency("stt", now - sttStartRef.current)
                }
                setTranscript(msg.text.trim())
                addLog("info", `You: "${msg.text.trim()}"`)
                addTimelineEvent("processing", "Processing...")
                llmStartRef.current = now
                
                // Calculate speaking rate
                const words = msg.text.trim().split(/\s+/).length
                const duration = (now - utteranceStartRef.current) / 1000 / 60 // minutes
                if (duration > 0) {
                  setSpeakingRate(Math.round(words / duration))
                }
              }
            } else if (msg.type === "orchestrator_response") {
              // MYCA's response
              const now = Date.now()
              if (llmStartRef.current > 0) {
                recordLatency("llm", now - llmStartRef.current)
              }
              ttsStartRef.current = now
              
              if (msg.text?.trim()) {
                setLastResponse(msg.text.trim())
                addLog("success", `MYCA: "${msg.text.trim().slice(0, 100)}..."`)
                addTimelineEvent("myca_speaking", "MYCA")
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
          
          // Handshake
          if (data.length === 1 && kind === 0) {
            addLog("success", "Moshi handshake OK!")
            setWsConnected(true)
            setTestPhase("listening")
            setJarvisMessage("Connected! Speak naturally - watch the debug panels for issues.")
            
            if (!audioContextRef.current) {
              audioContextRef.current = new AudioContext({ sampleRate: 48000 })
            }
            
            initDecoderWorker().catch(e => addLog("error", `Decoder init: ${e}`))
            startAudioCapture(ws)
            addTimelineEvent("silence", "Ready")
            return
          }
          
          // Audio from MYCA
          if (kind === 1 && payload.length > 0) {
            const now = Date.now()
            if (ttsStartRef.current > 0 && !isSpeaking) {
              recordLatency("tts", now - ttsStartRef.current)
              ttsStartRef.current = 0
            }
            
            setAudioStats(prev => ({
              ...prev,
              bytesIn: prev.bytesIn + payload.length,
              chunksIn: prev.chunksIn + 1
            }))
            setIsSpeaking(true)
            handleMoshiAudio(payload)
            scheduleSpeakingEnd()
          }
        } catch (err) {
          addLog("debug", `Message error: ${err}`)
        }
      }
      
      ws.onerror = () => {
        addLog("error", "WebSocket error")
        setWsConnected(false)
      }
      
      ws.onclose = () => {
        addLog("info", "Disconnected")
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
      }
      
      const recorder = new RecorderClass(recorderOptions)
      
      recorder.ondataavailable = (data: Uint8Array) => {
        if (data && data.length > 0 && ws.readyState === WebSocket.OPEN) {
          setAudioStats(prev => ({
            ...prev,
            bytesOut: prev.bytesOut + data.length,
            chunksOut: prev.chunksOut + 1
          }))
          
          const message = new Uint8Array(1 + data.length)
          message[0] = 0x01
          message.set(data, 1)
          ws.send(message)
        }
      }
      
      recorder.onstart = () => {
        setIsRecognizing(true)
        addLog("info", "Audio capture started - speak now!")
        utteranceStartRef.current = Date.now()
        sttStartRef.current = Date.now()
        addTimelineEvent("user_speaking", "You")
      }
      
      recorder.onstop = () => {
        setIsRecognizing(false)
        addLog("info", "Audio capture stopped")
      }
      
      recorder.start(mediaStreamRef.current)
      opusRecorderRef.current = recorder
      
      // Moshi handles all STT - text is cloned to MAS for memory (async, non-blocking)
      addLog("success", "Moshi full-duplex active - MAS memory cloning enabled")
      
    } catch (e) {
      addLog("error", `Audio capture failed: ${e}`)
    }
  }
  
  // Stop audio capture
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
      
      // Create output analyser for waveform
      const outputAnalyser = ctx.createAnalyser()
      outputAnalyser.fftSize = 128
      workletNode.connect(outputAnalyser)
      outputAnalyserRef.current = outputAnalyser
      
      // Monitor output levels
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
      
      workletNode.port.onmessage = (e) => {
        if (e.data?.bufferUnderrun) {
          setAudioStats(prev => ({ ...prev, bufferUnderruns: prev.bufferUnderruns + 1 }))
          addLog("warn", "Audio buffer underrun - may cause choppy audio")
        }
      }
      
      audioWorkletNodeRef.current = workletNode
      workletReadyRef.current = true
      addLog("debug", "AudioWorklet ready")
    } catch (e) {
      addLog("error", `AudioWorklet init failed: ${e}`)
    }
  }, [addLog, isSpeaking])
  
  const initDecoderWorker = useCallback(async () => {
    if (decoderWorkerRef.current) return
    
    try {
      await initAudioWorklet()
      
      const worker = new Worker("/assets/decoderWorker.min.js")
      
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
      worker.postMessage({
        command: "init",
        bufferLength: 960 * sampleRate / 24000,
        decoderSampleRate: 24000,
        outputBufferSampleRate: sampleRate,
        resampleQuality: 0,
      })
      
      decoderWorkerRef.current = worker
      decoderReadyRef.current = true
      addLog("debug", "Opus decoder ready")
    } catch (e) {
      addLog("error", `Decoder init failed: ${e}`)
    }
  }, [addLog, initAudioWorklet])
  
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
      setOutputLevel(0)
      addTimelineEvent("silence", "")
    }, 500)
  }, [addTimelineEvent])
  
  // Send text message
  const sendTextMessage = () => {
    if (!textInput.trim() || !wsRef.current) return
    
    if (wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "text_input",
        text: textInput.trim(),
        source: "keyboard"
      }))
      setTranscript(textInput.trim())
      addLog("info", `Sent: "${textInput.trim()}"`)
      setTextInput("")
      llmStartRef.current = Date.now()
      addTimelineEvent("processing", "Processing...")
    }
  }
  
  // Stop voice
  const stopVoice = () => {
    stopAudioCapture()
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setWsConnected(false)
    setTestPhase("ready")
    setLastResponse("")
    setJarvisMessage("Voice session ended.")
    addLog("info", "Session stopped")
  }
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (decoderWorkerRef.current) decoderWorkerRef.current.terminate()
      if (audioWorkletNodeRef.current) audioWorkletNodeRef.current.disconnect()
      if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current)
    }
  }, [])
  
  // Run on mount
  useEffect(() => {
    addLog("info", "MYCA Voice Debug Suite initialized")
    addLog("info", "Enhanced debug version - February 3, 2026")
    checkServices()
  }, [])
  
  // Waveform component
  const Waveform = ({ data, color, label }: { data: number[], color: string, label: string }) => (
    <div className="bg-zinc-900 rounded-lg p-3">
      <div className="text-xs text-zinc-500 mb-2">{label}</div>
      <div className="flex items-end gap-px h-16">
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
  
  // Timeline visualization
  const TimelineViz = () => {
    const now = Date.now()
    const windowMs = 30000 // 30 seconds
    const startTime = now - windowMs
    
    return (
      <div className="bg-zinc-900 rounded-lg p-3">
        <div className="text-xs text-zinc-500 mb-2">Duplex Timeline (last 30s)</div>
        <div className="relative h-12 bg-zinc-800 rounded overflow-hidden">
          {timeline.filter(e => (e.endTime || now) > startTime).map(event => {
            const left = Math.max(0, ((event.startTime - startTime) / windowMs) * 100)
            const right = Math.min(100, (((event.endTime || now) - startTime) / windowMs) * 100)
            const width = right - left
            
            const colors = {
              user_speaking: "bg-green-500",
              myca_speaking: "bg-blue-500",
              processing: "bg-yellow-500",
              silence: "bg-zinc-700"
            }
            
            return (
              <div
                key={event.id}
                className={cn("absolute h-full", colors[event.type])}
                style={{ left: `${left}%`, width: `${width}%` }}
                title={event.label}
              />
            )
          })}
          
          {/* Labels */}
          <div className="absolute top-0 left-2 text-xs text-white/70 leading-6">You</div>
          <div className="absolute bottom-0 left-2 text-xs text-white/70 leading-6">MYCA</div>
          
          {/* Now indicator */}
          <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-red-500" />
        </div>
        
        {/* Legend */}
        <div className="flex gap-4 mt-2 text-xs">
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded" /> You Speaking</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded" /> MYCA Speaking</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-500 rounded" /> Processing</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
            MYCA Voice Debug Suite
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Enhanced visual debugging for voice speed and talking issues</p>
        </div>
        
        {/* Status bar */}
        <div className={cn(
          "rounded-xl p-4 mb-6 border",
          overlapDetected ? "bg-red-900/30 border-red-500" : "bg-cyan-900/20 border-cyan-800/30"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn("w-3 h-3 rounded-full", overlapDetected ? "bg-red-500 animate-pulse" : "bg-cyan-400 animate-pulse")} />
            <p className="text-lg">{overlapDetected ? "âš ï¸ OVERLAP DETECTED - MYCA speaking over you!" : jarvisMessage}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Controls */}
          <div className="space-y-4">
            {/* Services */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold flex items-center gap-2">
                  <Server className="w-4 h-4 text-cyan-400" />
                  Services
                </h2>
                <Button variant="outline" size="sm" onClick={checkServices} disabled={testPhase === "checking"}>
                  <RefreshCw className={cn("w-3 h-3", testPhase === "checking" && "animate-spin")} />
                </Button>
              </div>
              
              {services.map((service, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                  <div className="flex items-center gap-2">
                    {service.status === "online" ? <CheckCircle2 className="w-4 h-4 text-green-500" /> :
                     service.status === "offline" ? <XCircle className="w-4 h-4 text-red-500" /> :
                     <RefreshCw className="w-4 h-4 text-zinc-400 animate-spin" />}
                    <span className="text-sm">{service.name}</span>
                  </div>
                  {service.latency && <span className="text-xs text-green-400">{service.latency}ms</span>}
                </div>
              ))}
            </div>
            
            {/* Voice Controls */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <h2 className="font-semibold flex items-center gap-2 mb-4">
                <Mic className="w-4 h-4 text-cyan-400" />
                Voice Control
              </h2>
              
              {wsConnected ? (
                <Button onClick={stopVoice} variant="destructive" className="w-full">
                  <MicOff className="w-4 h-4 mr-2" />
                  Stop Voice Session
                </Button>
              ) : (
                <Button 
                  onClick={startMycaVoice}
                  disabled={services[1].status !== "online"}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Start Voice Session
                </Button>
              )}
              
              {/* Connection status */}
              {wsConnected && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className={cn("w-2 h-2 rounded-full", isRecognizing ? "bg-green-500 animate-pulse" : "bg-gray-500")} />
                    <span>{isRecognizing ? "ðŸŽ¤ Listening" : "Ready"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className={cn("w-2 h-2 rounded-full", isSpeaking ? "bg-blue-500 animate-pulse" : "bg-gray-500")} />
                    <span>{isSpeaking ? "ðŸ”Š MYCA Speaking" : "Silent"}</span>
                  </div>
                </div>
              )}
              
              {/* Text input */}
              {wsConnected && (
                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendTextMessage()}
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                  />
                  <Button onClick={sendTextMessage} disabled={!textInput.trim()} size="icon">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            
            {/* Conversation */}
            {(transcript || lastResponse) && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                {transcript && (
                  <div className="p-2 bg-green-900/30 rounded-lg">
                    <div className="text-xs text-green-400 mb-1">You:</div>
                    <div className="text-sm">{transcript}</div>
                  </div>
                )}
                {lastResponse && (
                  <div className="p-2 bg-blue-900/30 rounded-lg">
                    <div className="text-xs text-blue-400 mb-1">MYCA:</div>
                    <div className="text-sm">{lastResponse}</div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Center: Debug Visualizations */}
          <div className="space-y-4">
            {/* Waveforms */}
            <Waveform data={inputWaveform} color="#22c55e" label="ðŸŽ¤ Your Voice Input" />
            <Waveform data={outputWaveform} color="#3b82f6" label="ðŸ”Š MYCA Voice Output" />
            
            {/* Timeline */}
            <TimelineViz />
            
            {/* Level meters */}
            <div className="bg-zinc-900 rounded-lg p-3 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-zinc-500 mb-1">Input Level</div>
                <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all", 
                      micLevel > 60 ? "bg-green-500" : micLevel > 30 ? "bg-yellow-500" : "bg-red-500"
                    )}
                    style={{ width: `${micLevel}%` }}
                  />
                </div>
                <div className="text-xs text-center mt-1">{micLevel}%</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 mb-1">Output Level</div>
                <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${outputLevel}%` }}
                  />
                </div>
                <div className="text-xs text-center mt-1">{outputLevel}%</div>
              </div>
            </div>
            
            {/* Metrics */}
            <div className="bg-zinc-900 rounded-lg p-3">
              <div className="text-xs text-zinc-500 mb-2 flex items-center gap-1">
                <BarChart2 className="w-3 h-3" /> Latency Metrics
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-zinc-800 rounded">
                  <div className="text-lg font-bold text-green-400">{getAvgLatency(latencyMetrics.sttLatency)}</div>
                  <div className="text-xs text-zinc-500">STT ms</div>
                </div>
                <div className="p-2 bg-zinc-800 rounded">
                  <div className="text-lg font-bold text-yellow-400">{getAvgLatency(latencyMetrics.llmLatency)}</div>
                  <div className="text-xs text-zinc-500">LLM ms</div>
                </div>
                <div className="p-2 bg-zinc-800 rounded">
                  <div className="text-lg font-bold text-blue-400">{getAvgLatency(latencyMetrics.ttsLatency)}</div>
                  <div className="text-xs text-zinc-500">TTS ms</div>
                </div>
                <div className="p-2 bg-zinc-800 rounded">
                  <div className="text-lg font-bold text-purple-400">{speakingRate}</div>
                  <div className="text-xs text-zinc-500">WPM</div>
                </div>
              </div>
            </div>
            
            {/* Audio Stats */}
            <div className="bg-zinc-900 rounded-lg p-3">
              <div className="text-xs text-zinc-500 mb-2 flex items-center gap-1">
                <Activity className="w-3 h-3" /> Audio Stats
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2 bg-zinc-800 rounded text-center">
                  <div className="font-mono">{(audioStats.bytesOut / 1024).toFixed(1)}KB</div>
                  <div className="text-zinc-500">Sent</div>
                </div>
                <div className="p-2 bg-zinc-800 rounded text-center">
                  <div className="font-mono">{(audioStats.bytesIn / 1024).toFixed(1)}KB</div>
                  <div className="text-zinc-500">Received</div>
                </div>
                <div className={cn("p-2 rounded text-center", 
                  audioStats.bufferUnderruns > 0 ? "bg-red-900" : "bg-zinc-800"
                )}>
                  <div className="font-mono">{audioStats.bufferUnderruns}</div>
                  <div className="text-zinc-500">Underruns</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right: Logs */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h2 className="font-semibold flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Debug Logs
            </h2>
            
            <div className="bg-zinc-950 rounded-lg p-3 h-[600px] overflow-y-auto font-mono text-xs">
              {logs.map((log, idx) => (
                <div key={idx} className="mb-1">
                  <span className="text-zinc-600">[{log.timestamp.toLocaleTimeString()}]</span>{" "}
                  <span className={cn(
                    log.level === "success" ? "text-green-400" :
                    log.level === "error" ? "text-red-400" :
                    log.level === "warn" ? "text-yellow-400" :
                    log.level === "metric" ? "text-purple-400" :
                    log.level === "debug" ? "text-zinc-500" : "text-blue-400"
                  )}>[{log.level.toUpperCase()}]</span>{" "}
                  <span className="text-zinc-300">{log.message}</span>
                  {log.details && <div className="ml-16 text-zinc-500">{log.details}</div>}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
            
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setLogs([])}>Clear</Button>
              <Button variant="outline" size="sm" onClick={() => {
                const logText = logs.map(l => 
                  `[${l.timestamp.toISOString()}] [${l.level}] ${l.message}`
                ).join("\n")
                navigator.clipboard.writeText(logText)
                addLog("info", "Logs copied")
              }}>Copy</Button>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-6 text-center text-zinc-600 text-sm">
          MYCA Voice Debug Suite | February 3, 2026 | PersonaPlex + Moshi Full-Duplex
        </div>
      </div>
    </div>
  )
}

