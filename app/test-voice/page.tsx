"use client"

/**
 * MYCA Voice Test Suite - Iron Man Style
 * "Good morning, Morgan. I've prepared the diagnostic suite."
 * 
 * Created: February 3, 2026
 * 
 * Uses the WORKING approach from voice-duplex:
 * 1. Web Speech API for speech-to-text (browser-native)
 * 2. PersonaPlex Bridge (8999) for MYCA integration
 * 3. Native Moshi UI (8998) embedded for full-duplex
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
  Send
} from "lucide-react"
import { cn } from "@/lib/utils"

// Web Speech API type declarations
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
  level: "info" | "success" | "error" | "warn" | "debug"
  message: string
  details?: string
}

export default function VoiceTestPage() {
  // Service statuses
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: "Native Moshi (Full-Duplex)", url: "http://localhost:8998", status: "checking" },
    { name: "PersonaPlex Bridge (MYCA)", url: "http://localhost:8999/health", status: "checking" },
    { name: "Voice Orchestrator", url: "/api/mas/voice/orchestrator", status: "checking" },
    { name: "Memory API", url: "/api/memory", status: "checking" },
  ])
  
  // Test logs
  const [logs, setLogs] = useState<TestLog[]>([])
  const logsEndRef = useRef<HTMLDivElement>(null)
  
  // Test state
  const [testPhase, setTestPhase] = useState<"idle" | "checking" | "ready" | "listening" | "complete">("idle")
  const [jarvisMessage, setJarvisMessage] = useState("Initializing MYCA systems, Morgan...")
  const [micPermission, setMicPermission] = useState<"unknown" | "granted" | "denied">("unknown")
  
  // Voice mode
  const [voiceMode, setVoiceMode] = useState<"native-duplex" | "myca-connected">("native-duplex")
  const [showNativeEmbed, setShowNativeEmbed] = useState(false)
  
  // MYCA-connected mode state
  const [wsConnected, setWsConnected] = useState(false)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState("")
  const [transcript, setTranscript] = useState("")
  const [lastResponse, setLastResponse] = useState<string>("")
  const [textInput, setTextInput] = useState("")
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [micLevel, setMicLevel] = useState(0)  // 0-100 for visual indicator
  
  const wsRef = useRef<WebSocket | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const micLevelIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  
  // Add log entry
  const addLog = useCallback((level: TestLog["level"], message: string, details?: string) => {
    setLogs(prev => [...prev.slice(-100), {
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
  
  // Check services
  const checkServices = async () => {
    setTestPhase("checking")
    addLog("info", "Running diagnostics, Morgan...")
    setJarvisMessage("Running full diagnostics on all voice systems...")
    
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
        
        if (response.ok || response.status === 405 || response.status === 400) {
          updatedServices[i] = { ...service, status: "online", latency }
          addLog("success", `${service.name}: ONLINE (${latency}ms)`)
        } else {
          updatedServices[i] = { ...service, status: "error", error: `HTTP ${response.status}` }
          addLog("error", `${service.name}: Error ${response.status}`)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error"
        if (errorMsg.includes("Failed to fetch") || errorMsg.includes("NetworkError")) {
          updatedServices[i] = { ...service, status: "offline", error: "Connection refused" }
          addLog("error", `${service.name}: OFFLINE - Connection refused`)
        } else {
          updatedServices[i] = { ...service, status: "error", error: errorMsg }
          addLog("error", `${service.name}: ${errorMsg}`)
        }
      }
      
      setServices([...updatedServices])
    }
    
    // Check microphone permission
    addLog("info", "Checking microphone permission...")
    try {
      const permission = await navigator.permissions.query({ name: "microphone" as PermissionName })
      setMicPermission(permission.state === "granted" ? "granted" : permission.state === "denied" ? "denied" : "unknown")
      addLog(permission.state === "granted" ? "success" : "warn", 
        `Microphone permission: ${permission.state}`)
    } catch {
      addLog("warn", "Could not check microphone permission (will prompt when needed)")
    }
    
    // Determine readiness
    const nativeOnline = updatedServices[0].status === "online"
    const bridgeOnline = updatedServices[1].status === "online"
    
    if (nativeOnline || bridgeOnline) {
      setTestPhase("ready")
      if (nativeOnline && bridgeOnline) {
        setJarvisMessage("All systems operational, Morgan. Choose your voice mode and click the microphone.")
        addLog("success", "Both Native Moshi and MYCA Bridge are online!")
      } else if (nativeOnline) {
        setJarvisMessage("Native Moshi is online. Use Full-Duplex mode for the best experience.")
        addLog("success", "Native Moshi online. MYCA Bridge offline - use Native mode.")
        setVoiceMode("native-duplex")
      } else {
        setJarvisMessage("MYCA Bridge is online. Use MYCA-Connected mode.")
        addLog("success", "MYCA Bridge online. Native Moshi offline - use MYCA mode.")
        setVoiceMode("myca-connected")
      }
    } else {
      setTestPhase("idle")
      setJarvisMessage("Both voice services are offline. Start the Moshi server or PersonaPlex Bridge.")
      addLog("error", "No voice services available!")
    }
  }
  
  // Media recorder for Opus audio
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  
  // Start MYCA-connected voice
  const startMycaVoice = async () => {
    addLog("info", "Starting MYCA-connected voice...")
    setJarvisMessage("Connecting to MYCA systems...")
    
    try {
      // Request microphone with constraints matching native PersonaPlex client
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,  // CRITICAL: Boosts quiet audio automatically
          channelCount: 1,
        } 
      })
      mediaStreamRef.current = stream
      setMicPermission("granted")
      
      // Set up audio level monitoring for visual feedback
      try {
        const monitorCtx = new AudioContext()
        const source = monitorCtx.createMediaStreamSource(stream)
        const analyser = monitorCtx.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)
        analyserRef.current = analyser
        
        // Start monitoring mic level
        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        micLevelIntervalRef.current = setInterval(() => {
          if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray)
            // Get average volume level
            const sum = dataArray.reduce((a, b) => a + b, 0)
            const avg = sum / dataArray.length
            const level = Math.min(100, Math.round(avg * 1.5))  // Scale to 0-100
            setMicLevel(level)
          }
        }, 100)
        addLog("debug", "Microphone level monitoring started")
      } catch (e) {
        addLog("warn", "Could not set up mic level monitoring")
      }
      
      // Create session on bridge
      addLog("info", "Creating session on PersonaPlex Bridge...")
      const bridgeRes = await fetch("http://localhost:8999/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona: "myca", voice: "myca" })
      })
      
      if (!bridgeRes.ok) {
        throw new Error(`Bridge session failed: ${bridgeRes.status}`)
      }
      
      const session = await bridgeRes.json()
      addLog("success", `Session created: ${session.session_id}`)
      
      // Connect directly to Moshi for audio, bridge for text
      // Build Moshi URL with MYCA persona
      // Note: Keep text_prompt short for Moshi - it's not a system prompt, just a persona hint
      const moshiParams = new URLSearchParams({
        text_prompt: "You are MYCA, a friendly AI assistant for Mycosoft created by Morgan. You coordinate 40+ specialized agents and help manage infrastructure. Be warm, professional, and speak naturally. Listen carefully and respond helpfully.",
        voice_prompt: "NATF2.pt",
        audio_temperature: "0.7",  // Slightly lower for more consistent output
        text_temperature: "0.7",
        text_topk: "25",
        audio_topk: "250",
        pad_mult: "0",  // Reduce padding for faster response
      })
      
      const moshiUrl = `ws://localhost:8998/api/chat?${moshiParams.toString()}`
      addLog("info", "Connecting to Moshi for full-duplex audio...")
      
      const ws = new WebSocket(moshiUrl)
      ws.binaryType = "arraybuffer"
      
      ws.onopen = () => {
        addLog("success", "Connected to Moshi!")
        addLog("info", "Waiting for handshake...")
      }
      
      // Track audio bytes for debugging
      let totalAudioIn = 0
      let totalAudioOut = 0
      
      ws.onmessage = async (event) => {
        try {
          const data = new Uint8Array(event.data as ArrayBuffer)
          if (data.length === 0) return
          
          const kind = data[0]
          const payload = data.slice(1)
          
          // Handle handshake (0x00)
          if (data.length === 1 && kind === 0) {
            addLog("success", "Handshake received! Starting audio...")
            setWsConnected(true)
            setTestPhase("listening")
            setJarvisMessage("I'm listening, Morgan. Speak naturally - this is full-duplex!")
            
            // Initialize audio context FIRST, then decoder
            if (!audioContextRef.current) {
              audioContextRef.current = new AudioContext({ sampleRate: 48000 })
            }
            
            // Initialize decoder (async) and start audio capture
            // Don't await - let audio capture start immediately while decoder initializes
            initDecoderWorker().catch(e => addLog("error", `Decoder init failed: ${e}`))
            startAudioCapture(ws)
            return
          }
          
          // Handle audio (kind 1)
          if (kind === 1 && payload.length > 0) {
            totalAudioIn += payload.length
            // Log first few and every 10KB
            if (totalAudioIn < 5000 || totalAudioIn % 10000 < payload.length) {
              addLog("debug", `Audio IN: ${payload.length}B (total: ${totalAudioIn}B)`)
            }
            handleMoshiAudio(payload)
          }
          
          // Handle text (kind 2)
          if (kind === 2 && payload.length > 0) {
            const text = new TextDecoder().decode(payload)
            setLastResponse(prev => prev + text)
            if (text.length > 2) {
              addLog("info", `MYCA: "${text.slice(0, 60)}..."`)
            }
          }
        } catch (err) {
          addLog("debug", `Message error: ${err}`)
        }
      }
      
      ws.onerror = (e) => {
        addLog("error", "WebSocket error - check if Moshi is running")
        setWsConnected(false)
      }
      
      ws.onclose = () => {
        addLog("info", "Disconnected from Moshi")
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
  
  // Start speech recognition (Web Speech API)
  const startSpeechRecognition = (ws: WebSocket) => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionAPI) {
      addLog("warn", "Speech recognition not supported - use text input")
      return
    }
    
    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"
    
    recognition.onstart = () => {
      setIsRecognizing(true)
      addLog("info", "Speech recognition started")
    }
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ""
      let final = ""
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += text
        } else {
          interim += text
        }
      }
      
      setInterimTranscript(interim)
      
      if (final.trim() && ws.readyState === WebSocket.OPEN) {
        setTranscript(final.trim())
        addLog("info", `You said: "${final.trim()}"`)
        ws.send(JSON.stringify({
          type: "text_input",
          text: final.trim(),
          source: "voice"
        }))
        setInterimTranscript("")
      }
    }
    
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "aborted") {
        addLog("error", `Speech error: ${event.error}`)
        setTimeout(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            try { recognition.start() } catch {}
          }
        }, 1000)
      }
    }
    
    recognition.onend = () => {
      setIsRecognizing(false)
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try { recognition.start() } catch {}
      }
    }
    
    recognitionRef.current = recognition
    try { recognition.start() } catch {}
  }
  
  // Stop speech recognition
  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
      recognitionRef.current = null
    }
    setIsRecognizing(false)
    setInterimTranscript("")
  }
  
  // Start audio capture with opus-recorder for proper Ogg/Opus output
  const startAudioCapture = async (ws: WebSocket) => {
    if (!mediaStreamRef.current) {
      addLog("error", "No microphone stream available")
      return
    }
    
    try {
      // Dynamically load opus-recorder
      const Recorder = (window as any).Recorder
      if (!Recorder) {
        // Load the script first
        await new Promise<void>((resolve, reject) => {
          if ((window as any).Recorder) {
            resolve()
            return
          }
          const script = document.createElement("script")
          script.src = "/assets/recorder.min.js"
          script.onload = () => resolve()
          script.onerror = () => reject(new Error("Failed to load opus-recorder"))
          document.head.appendChild(script)
        })
      }
      
      const RecorderClass = (window as any).Recorder
      if (!RecorderClass) {
        throw new Error("Recorder not loaded")
      }
      
      addLog("debug", "Using opus-recorder for Ogg/Opus encoding")
      
      // Configure recorder to EXACTLY match native PersonaPlex client
      // See: personaplex-repo/client/src/pages/Conversation/hooks/useUserAudio.ts
      const recorderOptions = {
        encoderPath: "/assets/encoderWorker.min.js",
        encoderSampleRate: 24000,
        encoderFrameSize: 20,  // 20ms frames
        maxFramesPerPage: 2,
        numberOfChannels: 1,
        streamPages: true,  // Stream Ogg pages as they're ready
        encoderApplication: 2049,  // Voice application (OPUS_APPLICATION_VOIP)
        encoderComplexity: 0,  // From native client
        resampleQuality: 3,
        recordingGain: 1.5,  // Boost gain for better voice pickup (was 1)
        bufferLength: Math.round(960 * 48000 / 24000),  // From native client: 960 * sampleRate / 24000
      }
      
      const recorder = new RecorderClass(recorderOptions)
      
      // Track audio output
      let audioChunks = 0
      let totalAudioOut = 0
      
      // Handle Ogg pages as they come
      recorder.ondataavailable = (data: Uint8Array) => {
        if (data && data.length > 0 && ws.readyState === WebSocket.OPEN) {
          audioChunks++
          totalAudioOut += data.length
          
          // Log first few and every 10KB
          if (audioChunks <= 5 || totalAudioOut % 10000 < data.length) {
            addLog("debug", `Audio OUT: ${data.length}B (chunks: ${audioChunks}, total: ${totalAudioOut}B)`)
          }
          
          // Send as audio message (kind 1)
          const message = new Uint8Array(1 + data.length)
          message[0] = 0x01  // Audio kind
          message.set(data, 1)
          ws.send(message)
        }
      }
      
      recorder.onstart = () => {
        setIsRecognizing(true)
        addLog("info", "Audio capture started (Ogg/Opus) - speak now!")
      }
      
      recorder.onstop = () => {
        setIsRecognizing(false)
        addLog("info", "Audio capture stopped")
      }
      
      recorder.onerror = (error: Error) => {
        addLog("error", `Opus recorder error: ${error.message}`)
      }
      
      // Start recording
      recorder.start(mediaStreamRef.current)
      opusRecorderRef.current = recorder
      
    } catch (e) {
      addLog("error", `Failed to start audio capture: ${e}`)
    }
  }
  
  // Reference to opus-recorder instance
  const opusRecorderRef = useRef<any>(null)
  
  // Stop audio capture
  const stopAudioCapture = () => {
    // Stop mic level monitoring
    if (micLevelIntervalRef.current) {
      clearInterval(micLevelIntervalRef.current)
      micLevelIntervalRef.current = null
    }
    analyserRef.current = null
    setMicLevel(0)
    
    // Stop opus-recorder
    if (opusRecorderRef.current) {
      try { opusRecorderRef.current.stop() } catch {}
      opusRecorderRef.current = null
    }
    // Stop MediaRecorder (fallback)
    if (mediaRecorderRef.current) {
      try { mediaRecorderRef.current.stop() } catch {}
      mediaRecorderRef.current = null
    }
    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop())
      mediaStreamRef.current = null
    }
    setIsRecognizing(false)
  }
  
  // Opus decoder worker for Moshi audio
  const decoderWorkerRef = useRef<Worker | null>(null)
  const decoderReadyRef = useRef(false)
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null)
  const workletReadyRef = useRef(false)
  
  // Track playback for logging
  const playbackCountRef = useRef(0)
  
  // Initialize AudioWorklet for smooth playback (like native PersonaPlex client)
  const initAudioWorklet = useCallback(async () => {
    if (workletReadyRef.current || audioWorkletNodeRef.current) return
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 48000 })
      }
      
      const ctx = audioContextRef.current
      if (ctx.state === "suspended") {
        await ctx.resume()
        addLog("debug", "AudioContext resumed")
      }
      
      // Load the AudioWorklet module
      await ctx.audioWorklet.addModule("/assets/audio-processor.js")
      
      // Create the worklet node
      const workletNode = new AudioWorkletNode(ctx, "moshi-processor")
      workletNode.connect(ctx.destination)
      
      // Handle messages from worklet (stats)
      workletNode.port.onmessage = (e) => {
        if (e.data && e.data.actualAudioPlayed > 0) {
          setIsSpeaking(true)
        }
        // Could add delay stats here if needed
      }
      
      audioWorkletNodeRef.current = workletNode
      workletReadyRef.current = true
      addLog("debug", "AudioWorklet initialized for smooth playback")
    } catch (e) {
      addLog("error", `Failed to init AudioWorklet: ${e}`)
      workletReadyRef.current = false
    }
  }, [addLog])
  
  // Initialize Opus decoder worker
  const initDecoderWorker = useCallback(async () => {
    if (decoderWorkerRef.current) return
    
    try {
      // Ensure AudioWorklet is ready first
      await initAudioWorklet()
      
      const worker = new Worker("/assets/decoderWorker.min.js")
      
      worker.onmessage = (e: MessageEvent) => {
        if (!e.data) return
        
        // Decoded PCM audio (Float32Array)
        const pcmData = e.data[0] as Float32Array
        if (pcmData && pcmData.length > 0) {
          playbackCountRef.current++
          if (playbackCountRef.current <= 5) {
            addLog("debug", `Decoded PCM: ${pcmData.length} samples`)
          }
          
          // Send to AudioWorklet for smooth playback
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
      
      worker.onerror = (e) => {
        addLog("error", `Decoder worker error: ${e.message}`)
      }
      
      // Initialize the decoder
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
      addLog("debug", "Opus decoder initialized")
    } catch (e) {
      addLog("error", `Failed to init decoder: ${e}`)
    }
  }, [addLog, initAudioWorklet])
  
  // Pending audio data if decoder not ready
  const pendingAudioRef = useRef<Uint8Array[]>([])
  
  // Flag to prevent multiple async init calls
  const decoderInitializingRef = useRef(false)
  
  // Handle Moshi audio (Opus/Ogg)
  const handleMoshiAudio = useCallback((data: Uint8Array) => {
    // Queue if decoder not ready
    if (!decoderWorkerRef.current || !decoderReadyRef.current) {
      pendingAudioRef.current.push(data.slice()) // Copy the data
      
      // Start initialization if not already in progress
      if (!decoderInitializingRef.current) {
        decoderInitializingRef.current = true
        initDecoderWorker().then(() => {
          decoderInitializingRef.current = false
          // Process pending queue
          while (pendingAudioRef.current.length > 0 && decoderWorkerRef.current) {
            const pending = pendingAudioRef.current.shift()
            if (pending) {
              decoderWorkerRef.current.postMessage({
                command: "decode",
                pages: pending,
              }, [pending.buffer])
            }
          }
        })
      }
      return
    }
    
    // Process any pending audio first
    while (pendingAudioRef.current.length > 0) {
      const pending = pendingAudioRef.current.shift()
      if (pending) {
        decoderWorkerRef.current.postMessage({
          command: "decode",
          pages: pending,
        }, [pending.buffer])
      }
    }
    
    // Send current data to decoder worker
    // Need to copy because the buffer might be transferred
    const dataCopy = data.slice()
    decoderWorkerRef.current.postMessage({
      command: "decode",
      pages: dataCopy,
    }, [dataCopy.buffer])
  }, [initDecoderWorker])
  
  // Speaking timeout - set to false after no audio for a while
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Reset speaking state after audio stops
  const scheduleSpeakingEnd = useCallback(() => {
    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current)
    }
    speakingTimeoutRef.current = setTimeout(() => {
      setIsSpeaking(false)
    }, 500) // 500ms after last audio
  }, [])
  
  // Cleanup decoder and worklet on unmount
  useEffect(() => {
    return () => {
      if (decoderWorkerRef.current) {
        decoderWorkerRef.current.terminate()
        decoderWorkerRef.current = null
      }
      if (audioWorkletNodeRef.current) {
        audioWorkletNodeRef.current.disconnect()
        audioWorkletNodeRef.current = null
      }
      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current)
      }
      workletReadyRef.current = false
      decoderReadyRef.current = false
    }
  }, [])
  
  
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
    }
  }
  
  // Stop voice session
  const stopVoice = () => {
    stopAudioCapture()
    stopSpeechRecognition()
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setWsConnected(false)
    setTestPhase("ready")
    setLastResponse("")
    setJarvisMessage("Voice session ended. Ready for another test.")
    addLog("info", "Voice session stopped")
  }
  
  // Open native Moshi
  const openNativeMoshi = () => {
    window.open("http://localhost:8998", "_blank", "noopener,noreferrer")
    addLog("info", "Opened native Moshi in new tab")
  }
  
  // Run on mount
  useEffect(() => {
    addLog("info", "MYCA Voice Test Suite initialized")
    addLog("info", "Created: February 3, 2026")
    addLog("info", "Using PersonaPlex Bridge with Moshi audio")
    checkServices()
  }, [])
  
  // Status icon
  const StatusIcon = ({ status }: { status: ServiceStatus["status"] }) => {
    switch (status) {
      case "online": return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case "offline": return <XCircle className="w-5 h-5 text-red-500" />
      case "error": return <AlertCircle className="w-5 h-5 text-yellow-500" />
      default: return <RefreshCw className="w-5 h-5 text-zinc-400 animate-spin" />
    }
  }
  
  // Log color
  const getLogColor = (level: TestLog["level"]) => {
    switch (level) {
      case "success": return "text-green-400"
      case "error": return "text-red-400"
      case "warn": return "text-yellow-400"
      case "debug": return "text-zinc-500"
      default: return "text-blue-400"
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
            MYCA Voice Diagnostic Suite
          </h1>
          <p className="text-zinc-400 mt-2">
            "Just like JARVIS, but with better mycology knowledge"
          </p>
        </div>
        
        {/* JARVIS-style message */}
        <div className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-800/30 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
            <p className="text-lg text-cyan-100 font-light">{jarvisMessage}</p>
          </div>
        </div>
        
        {/* Native Moshi Embed */}
        {showNativeEmbed && (
          <div className="mb-6 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="font-semibold">Native Moshi Full-Duplex Voice</h2>
              <Button variant="outline" size="sm" onClick={() => setShowNativeEmbed(false)}>
                Close Embed
              </Button>
            </div>
            <iframe 
              src="http://localhost:8998" 
              className="w-full h-[500px] border-0"
              allow="microphone"
              title="Moshi Full-Duplex Voice"
            />
            <p className="text-xs text-zinc-500 p-2 text-center">
              Click the microphone in the interface above to start speaking
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Service Status */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Server className="w-5 h-5 text-cyan-400" />
                  System Status
                </h2>
                <Button variant="outline" size="sm" onClick={checkServices} disabled={testPhase === "checking"}>
                  <RefreshCw className={cn("w-4 h-4 mr-2", testPhase === "checking" && "animate-spin")} />
                  Recheck
                </Button>
              </div>
              
              <div className="space-y-3">
                {services.map((service, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <StatusIcon status={service.status} />
                      <div>
                        <div className="font-medium">{service.name}</div>
                        <div className="text-xs text-zinc-500">{service.url}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      {service.latency && <div className="text-sm text-green-400">{service.latency}ms</div>}
                      {service.error && <div className="text-xs text-red-400">{service.error}</div>}
                    </div>
                  </div>
                ))}
                
                {/* Mic permission */}
                <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {micPermission === "granted" ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : 
                     micPermission === "denied" ? <XCircle className="w-5 h-5 text-red-500" /> :
                     <AlertCircle className="w-5 h-5 text-yellow-500" />}
                    <div>
                      <div className="font-medium">Microphone Permission</div>
                      <div className="text-xs text-zinc-500">Browser audio access</div>
                    </div>
                  </div>
                  <span className={micPermission === "granted" ? "text-green-400" : 
                                   micPermission === "denied" ? "text-red-400" : "text-yellow-400"}>
                    {micPermission === "granted" ? "Granted" : micPermission === "denied" ? "Denied" : "Pending"}
                  </span>
                </div>
                
                {/* WebSocket status */}
                <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {wsConnected ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : 
                     <Wifi className="w-5 h-5 text-zinc-500" />}
                    <div>
                      <div className="font-medium">WebSocket Connection</div>
                      <div className="text-xs text-zinc-500">Real-time communication</div>
                    </div>
                  </div>
                  <span className={wsConnected ? "text-green-400" : "text-zinc-500"}>
                    {wsConnected ? "Connected" : "Disconnected"}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Voice Mode Selection */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                <Mic className="w-5 h-5 text-cyan-400" />
                Voice Mode
              </h2>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Native Duplex */}
                <div 
                  className={cn(
                    "p-4 rounded-lg border-2 cursor-pointer transition-all",
                    voiceMode === "native-duplex" ? "border-yellow-500 bg-yellow-500/10" : "border-zinc-700 hover:border-yellow-500/50"
                  )}
                  onClick={() => setVoiceMode("native-duplex")}
                >
                  <div className="font-medium text-yellow-400">Full-Duplex</div>
                  <div className="text-xs text-zinc-400 mt-1">Native Moshi @ 8998</div>
                  <div className="text-xs text-zinc-500 mt-2">Best experience, ~40ms latency</div>
                  <div className="text-xs text-orange-400 mt-1">âš ï¸ Not MYCA-connected</div>
                </div>
                
                {/* MYCA Connected */}
                <div 
                  className={cn(
                    "p-4 rounded-lg border-2 cursor-pointer transition-all",
                    voiceMode === "myca-connected" ? "border-green-500 bg-green-500/10" : "border-zinc-700 hover:border-green-500/50"
                  )}
                  onClick={() => setVoiceMode("myca-connected")}
                >
                  <div className="font-medium text-green-400">MYCA-Connected</div>
                  <div className="text-xs text-zinc-400 mt-1">Bridge @ 8999</div>
                  <div className="text-xs text-zinc-500 mt-2">Access to MAS, agents, data</div>
                  <div className="text-xs text-green-400 mt-1">âœ“ Full integration</div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                {voiceMode === "native-duplex" ? (
                  <>
                    <Button 
                      onClick={() => setShowNativeEmbed(true)}
                      disabled={services[0].status !== "online"}
                      className="w-full bg-yellow-600 hover:bg-yellow-700"
                    >
                      <Maximize2 className="w-4 h-4 mr-2" />
                      Embed Native Moshi Here
                    </Button>
                    <Button 
                      onClick={openNativeMoshi}
                      disabled={services[0].status !== "online"}
                      variant="outline"
                      className="w-full"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open in New Tab
                    </Button>
                  </>
                ) : (
                  <>
                    {wsConnected ? (
                      <Button onClick={stopVoice} variant="destructive" className="w-full">
                        <MicOff className="w-4 h-4 mr-2" />
                        Stop Voice Session
                      </Button>
                    ) : (
                      <Button 
                        onClick={startMycaVoice}
                        disabled={services[1].status !== "online" || testPhase === "checking"}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <Mic className="w-4 h-4 mr-2" />
                        Start MYCA Voice Session
                      </Button>
                    )}
                  </>
                )}
              </div>
              
              {/* Status Indicators */}
              {wsConnected && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", isRecognizing ? "bg-green-500 animate-pulse" : "bg-gray-500")} />
                      <span className="text-zinc-400">{isRecognizing ? "Listening..." : "Ready"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", isSpeaking ? "bg-blue-500 animate-pulse" : "bg-gray-500")} />
                      <span className="text-zinc-400">{isSpeaking ? "Speaking..." : "Silent"}</span>
                    </div>
                  </div>
                  
                  {/* Microphone Level Indicator */}
                  {isRecognizing && (
                    <div className="flex items-center gap-3">
                      <Mic className={cn("w-4 h-4", micLevel > 20 ? "text-green-400" : "text-zinc-500")} />
                      <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-100 rounded-full",
                            micLevel > 60 ? "bg-green-500" : micLevel > 30 ? "bg-yellow-500" : micLevel > 10 ? "bg-orange-500" : "bg-red-500"
                          )}
                          style={{ width: `${micLevel}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-500 w-8">{micLevel}%</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Interim transcript */}
              {interimTranscript && (
                <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Mic className="w-4 h-4 text-green-400 animate-pulse" />
                    <span className="text-zinc-300 italic">{interimTranscript}</span>
                  </div>
                </div>
              )}
              
              {/* Text Input */}
              {wsConnected && (
                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    placeholder="Or type a message..."
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
              
              {/* Last transcript/response */}
              {transcript && (
                <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg">
                  <div className="text-xs text-zinc-400 mb-1">You said:</div>
                  <div className="text-sm">{transcript}</div>
                </div>
              )}
              {lastResponse && (
                <div className="mt-2 p-3 bg-green-900/30 border border-green-800/50 rounded-lg">
                  <div className="text-xs text-green-400 mb-1">MYCA:</div>
                  <div className="text-sm text-green-100">{lastResponse}</div>
                </div>
              )}
            </div>
          </div>
          
          {/* Right Column - Logs */}
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                <Cpu className="w-5 h-5 text-cyan-400" />
                Diagnostic Logs
              </h2>
              
              <div className="bg-zinc-950 rounded-lg p-4 h-[500px] overflow-y-auto font-mono text-xs">
                {logs.map((log, idx) => (
                  <div key={idx} className="mb-1">
                    <span className="text-zinc-600">[{log.timestamp.toLocaleTimeString()}]</span>{" "}
                    <span className={getLogColor(log.level)}>[{log.level.toUpperCase()}]</span>{" "}
                    <span className="text-zinc-300">{log.message}</span>
                    {log.details && <div className="ml-6 text-zinc-500">{log.details}</div>}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
              
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setLogs([])}>
                  Clear Logs
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const logText = logs.map(l => 
                      `[${l.timestamp.toISOString()}] [${l.level}] ${l.message}${l.details ? ` - ${l.details}` : ""}`
                    ).join("\n")
                    navigator.clipboard.writeText(logText)
                    addLog("info", "Logs copied to clipboard")
                  }}
                >
                  Copy Logs
                </Button>
              </div>
            </div>
            
            {/* Quick Commands */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Try Saying...</h2>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="p-2 bg-zinc-800/50 rounded-lg">"MYCA, what's the system status?"</div>
                <div className="p-2 bg-zinc-800/50 rounded-lg">"Show me the agent topology"</div>
                <div className="p-2 bg-zinc-800/50 rounded-lg">"How many agents are running?"</div>
                <div className="p-2 bg-zinc-800/50 rounded-lg">"What can you help me with?"</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-center text-zinc-600 text-sm">
          MYCA Voice Test Suite | February 3, 2026 | Web Speech API + PersonaPlex Bridge
        </div>
      </div>
    </div>
  )
}
