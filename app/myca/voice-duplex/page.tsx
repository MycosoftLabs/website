"use client"

/**
 * MYCA Voice Duplex Page - January 29, 2026
 * Full-duplex voice interface with PersonaPlex and ElevenLabs fallback
 * 
 * Features:
 * - Browser-based speech recognition (Web Speech API)
 * - WebSocket connection to PersonaPlex/Moshi TTS
 * - Real-time transcript with interim results
 */

import { useState, useEffect, useRef, useCallback } from "react"

// Web Speech API type declarations
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff, Settings, Zap, Activity, Send, ExternalLink, Maximize2 } from "lucide-react"

interface VoiceTurn {
  id: string
  speaker: "user" | "myca"
  text: string
  timestamp: Date
  toolCall?: {
    agent: string
    action: string
    status: "pending" | "success" | "error"
  }
}

interface SessionInfo {
  session_id: string
  mode: "personaplex" | "elevenlabs"
  personaplex_available: boolean
  transport: {
    type: string
    url?: string
  }
}

export default function VoiceDuplexPage() {
  const [isConnected, setIsConnected] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [useDuplex, setUseDuplex] = useState(true)
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [turns, setTurns] = useState<VoiceTurn[]>([])
  const [error, setError] = useState<string | null>(null)
  const [latency, setLatency] = useState<number>(0)
  const [textInput, setTextInput] = useState("")
  const [wsConnected, setWsConnected] = useState(false)
  const [useNativeUI, setUseNativeUI] = useState(false)
  const [nativeMoshiAvailable, setNativeMoshiAvailable] = useState(false)
  const [voiceMode, setVoiceMode] = useState<"native-duplex" | "myca-connected">("native-duplex")
  const [mycaServerAvailable, setMycaServerAvailable] = useState(false)
  
  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState("")

  // Check PersonaPlex and native Moshi availability on mount
  useEffect(() => {
    checkAvailability()
    checkNativeMoshi()
  }, [])

  const checkNativeMoshi = async () => {
    // Check native Moshi (port 8998) - full-duplex, not MYCA-connected
    try {
      const res = await fetch("http://localhost:8998", { 
        method: "HEAD",
        mode: "no-cors" 
      })
      setNativeMoshiAvailable(true)
    } catch {
      setNativeMoshiAvailable(false)
    }
    
    // Check MYCA-connected server (port 8997) - MYCA-connected, not full-duplex
    checkMycaServer()
  }
  
  const checkMycaServer = async (): Promise<boolean> => {
    try {
      const res = await fetch("http://localhost:8999/health", { 
        method: "GET",
        headers: { "Accept": "application/json" }
      })
      if (res.ok) {
        const data = await res.json()
        setMycaServerAvailable(data.moshi_available === true)
        return data.moshi_available === true
      }
    } catch (e) {
      console.error("MYCA server check failed:", e)
    }
    setMycaServerAvailable(false)
    return false
  }

  const openNativeMoshi = () => {
    window.open("http://localhost:8998", "_blank", "noopener,noreferrer")
  }

  // Auto-scroll transcript
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [turns])

  const checkAvailability = async () => {
    try {
      const res = await fetch("/api/mas/voice/duplex/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ check_only: true }),
      })
      if (res.ok) {
        const data = await res.json()
        setSession(data)
      }
    } catch (e) {
      console.error("Failed to check availability:", e)
    }
  }

  const startSession = async () => {
    try {
      setError(null)
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      
      // Create audio context
      audioContextRef.current = new AudioContext({ sampleRate: 24000 })
      
      // Handle MYCA-connected mode (PersonaPlex Bridge)
      if (voiceMode === "myca-connected" && mycaServerAvailable) {
        // Create session on bridge first
        const bridgeRes = await fetch("http://localhost:8999/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ persona: "myca", voice: "myca" })
        })
        if (bridgeRes.ok) {
          const bridgeSession = await bridgeRes.json()
          const wsUrl = bridgeSession.ws_url || `ws://localhost:8999/ws/${bridgeSession.session_id}`
          connectWebSocket(wsUrl)
          setSession({
            session_id: bridgeSession.session_id,
            mode: bridgeSession.moshi_available ? "personaplex" : "elevenlabs",
            personaplex_available: bridgeSession.moshi_available,
            transport: { type: "websocket", url: wsUrl }
          })
          setIsConnected(true)
          setIsListening(true)
          addTurn("myca", "Hello! I'm MYCA, connected to your internal systems. How can I help?")
          return
        }
      }
      
      // Create session via API (for other modes)
      const res = await fetch("/api/mas/voice/duplex/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: useDuplex ? "personaplex" : "elevenlabs",
          persona: "myca",
        }),
      })
      
      if (!res.ok) {
        throw new Error("Failed to create session")
      }
      
      const sessionData = await res.json()
      setSession(sessionData)
      
      if (sessionData.mode === "personaplex" && sessionData.transport.url) {
        // Connect to PersonaPlex WebSocket
        connectWebSocket(sessionData.transport.url)
      }
      
      setIsConnected(true)
      setIsListening(true)
      
      // Add greeting
      addTurn("myca", "Hello! I'm MYCA, ready to help. What can I do for you?")
      
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Failed to start session"
      setError(errorMessage)
      console.error("Session start error:", e)
    }
  }

  const endSession = () => {
    // Stop speech recognition first
    stopSpeechRecognition()
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    setIsConnected(false)
    setIsListening(false)
    setIsSpeaking(false)
    setWsConnected(false)
    setInterimTranscript("")
    addTurn("myca", "Session ended. Talk to you soon!")
  }

  const connectWebSocket = (url: string) => {
    try {
      console.log("Connecting to PersonaPlex:", url)
      const ws = new WebSocket(url)
      
      ws.onopen = () => {
        console.log("PersonaPlex connected")
        setWsConnected(true)
        
        // Start speech recognition once connected
        startSpeechRecognition(ws)
      }
      
      ws.onmessage = async (event) => {
        try {
          if (typeof event.data === "string") {
            const data = JSON.parse(event.data)
            handlePersonaPlexMessage(data)
          } else if (event.data instanceof Blob) {
            // Binary audio data from WebSocket - play it
            const arrayBuffer = await event.data.arrayBuffer()
            playRawAudio(arrayBuffer)
          }
        } catch (err) {
          console.log("Message handling error:", err)
        }
      }
      
      ws.onerror = (e) => {
        console.error("WebSocket error:", e)
        setWsConnected(false)
        stopSpeechRecognition()
        setError("WebSocket connection failed - falling back to classic mode")
        setUseDuplex(false)
      }
      
      ws.onclose = () => {
        console.log("PersonaPlex disconnected")
        setWsConnected(false)
        stopSpeechRecognition()
      }
      
      wsRef.current = ws
    } catch (e) {
      console.error("WebSocket connection failed:", e)
      setError("Failed to connect to PersonaPlex")
    }
  }

  // Start speech recognition (browser-based STT)
  const startSpeechRecognition = (ws: WebSocket) => {
    // Check for browser support
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionAPI) {
      console.warn("Speech recognition not supported - use text input")
      setError("Voice input not supported in this browser. Please use Chrome or Edge.")
      return
    }
    
    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"
    
    recognition.onstart = () => {
      console.log("Speech recognition started")
      setIsRecognizing(true)
      setIsListening(true)
    }
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ""
      let final = ""
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += transcript
        } else {
          interim += transcript
        }
      }
      
      setInterimTranscript(interim)
      
      // Send final transcription to server
      if (final.trim() && ws.readyState === WebSocket.OPEN) {
        console.log("Sending voice input:", final.trim())
        ws.send(JSON.stringify({
          type: "text_input",
          text: final.trim(),
          source: "voice"
        }))
        addTurn("user", final.trim())
        setInterimTranscript("")
      }
    }
    
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error)
      if (event.error === "not-allowed") {
        setError("Microphone access denied. Please allow microphone access.")
      } else if (event.error !== "aborted") {
        // Restart recognition on non-fatal errors
        setTimeout(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            try {
              recognition.start()
            } catch {
              // Already started or stopped
            }
          }
        }, 1000)
      }
    }
    
    recognition.onend = () => {
      console.log("Speech recognition ended")
      setIsRecognizing(false)
      
      // Restart if still connected
      if (wsRef.current?.readyState === WebSocket.OPEN && !isMuted) {
        try {
          recognition.start()
        } catch {
          // Already started
        }
      }
    }
    
    recognitionRef.current = recognition
    
    try {
      recognition.start()
      console.log("Speech recognition initialized")
    } catch (e) {
      console.error("Failed to start speech recognition:", e)
    }
  }

  // Stop speech recognition
  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // Already stopped
      }
      recognitionRef.current = null
    }
    setIsRecognizing(false)
    setInterimTranscript("")
  }

  // Send text message via WebSocket
  const sendTextMessage = () => {
    if (!textInput.trim()) return
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Send via PersonaPlex WebSocket
      wsRef.current.send(JSON.stringify({
        type: "text_input",
        text: textInput.trim()
      }))
      addTurn("user", textInput.trim())
      setTextInput("")
    } else if (session?.mode === "elevenlabs" || !wsConnected) {
      // Fallback to classic mode
      sendClassicMessage(textInput.trim())
      setTextInput("")
    } else {
      setError("Not connected - please start a session first")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendTextMessage()
    }
  }

  const handlePersonaPlexMessage = (data: Record<string, unknown>) => {
    if (data.type === "agent_text") {
      addTurn("myca", data.text as string)
      
      if (data.tool_call) {
        // Tool was invoked
        const lastTurn = turns[turns.length - 1]
        if (lastTurn) {
          lastTurn.toolCall = data.tool_call as VoiceTurn["toolCall"]
          setTurns([...turns])
        }
      }
    } else if (data.type === "user_text") {
      addTurn("user", data.text as string)
    } else if (data.type === "latency") {
      setLatency(data.ms as number)
    } else if (data.type === "speaking") {
      setIsSpeaking(data.value as boolean)
    }
  }

  const addTurn = useCallback((speaker: "user" | "myca", text: string) => {
    const turn: VoiceTurn = {
      id: Date.now().toString(),
      speaker,
      text,
      timestamp: new Date(),
    }
    setTurns(prev => [...prev, turn])
  }, [])

  const toggleMute = () => {
    const newMuted = !isMuted
    setIsMuted(newMuted)
    
    // Pause/resume speech recognition
    if (recognitionRef.current) {
      if (newMuted) {
        try {
          recognitionRef.current.stop()
        } catch {
          // Already stopped
        }
      } else if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          recognitionRef.current.start()
        } catch {
          // Already started
        }
      }
    }
    
    // Also mute the media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !newMuted
      })
    }
  }

  // Fallback: use classic voice orchestrator
  const sendClassicMessage = async (text: string) => {
    try {
      addTurn("user", text)
      
      const res = await fetch("/api/mas/voice/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          want_audio: true,
        }),
      })
      
      if (res.ok) {
        const data = await res.json()
        addTurn("myca", data.response_text)
        
        // Play audio if available
        if (data.audio_base64) {
          playAudio(data.audio_base64)
        }
      }
    } catch (e) {
      console.error("Classic message error:", e)
    }
  }

  const playAudio = (base64: string) => {
    try {
      const audio = new Audio(`data:audio/mpeg;base64,${base64}`)
      setIsSpeaking(true)
      audio.onended = () => setIsSpeaking(false)
      audio.play()
    } catch (e) {
      console.error("Audio playback error:", e)
    }
  }

  // Play audio from WebSocket (handles WAV, MP3, and raw PCM)
  const playRawAudio = async (arrayBuffer: ArrayBuffer) => {
    try {
      const header = new Uint8Array(arrayBuffer.slice(0, 4))
      
      // Check audio format by magic bytes
      const isRIFF = header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 // "RIFF"
      const isMP3 = (header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33) || // ID3
                    (header[0] === 0xFF && (header[1] & 0xE0) === 0xE0) // MPEG sync
      
      if (isRIFF || isMP3) {
        // Play WAV or MP3 using Audio element
        const mimeType = isRIFF ? "audio/wav" : "audio/mpeg"
        const blob = new Blob([arrayBuffer], { type: mimeType })
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        
        setIsSpeaking(true)
        audio.onended = () => {
          setIsSpeaking(false)
          URL.revokeObjectURL(url)
        }
        audio.onerror = (e) => {
          console.error("Audio error:", e)
          setIsSpeaking(false)
          URL.revokeObjectURL(url)
        }
        
        await audio.play()
        console.log(`Playing ${isRIFF ? "WAV" : "MP3"} audio:`, arrayBuffer.byteLength, "bytes")
      } else {
        // Play raw float32 PCM
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext({ sampleRate: 24000 })
        }
        
        const ctx = audioContextRef.current
        const float32Array = new Float32Array(arrayBuffer)
        const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000)
        audioBuffer.getChannelData(0).set(float32Array)
        
        const source = ctx.createBufferSource()
        source.buffer = audioBuffer
        source.connect(ctx.destination)
        
        setIsSpeaking(true)
        source.onended = () => setIsSpeaking(false)
        source.start()
        
        console.log("Playing PCM audio:", float32Array.length, "samples")
      }
    } catch (e) {
      console.error("Audio playback error:", e)
      setIsSpeaking(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">MYCA Voice</h1>
          <p className="text-muted-foreground">
            Full-duplex voice conversation with MYCA
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={session?.personaplex_available ? "default" : "secondary"}>
            {session?.personaplex_available ? "PersonaPlex Ready" : "Classic Mode"}
          </Badge>
          {latency > 0 && (
            <Badge variant="outline" className="gap-1">
              <Activity className="h-3 w-3" />
              {latency}ms
            </Badge>
          )}
        </div>
      </div>

      {error && (
        <Card className="mb-4 border-destructive">
          <CardContent className="pt-4">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Native Moshi Full-Duplex UI Mode */}
      {useNativeUI ? (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Native Moshi Full-Duplex Voice
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={openNativeMoshi} className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Open in New Tab
                </Button>
                <Button variant="outline" size="sm" onClick={() => setUseNativeUI(false)} className="gap-2">
                  <Maximize2 className="h-4 w-4" />
                  Switch to Custom UI
                </Button>
              </div>
            </div>
            <CardDescription>
              This is the native Kyutai Moshi interface running locally on your GPU (RTX 5090)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg overflow-hidden border bg-black">
              <iframe 
                src="http://localhost:8998" 
                className="w-full h-[600px] border-0"
                allow="microphone"
                title="Moshi Full-Duplex Voice"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Click the microphone button in the interface above to start speaking
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Voice Mode Selection (when not in iframe mode) */}
      {!useNativeUI && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option 1: Native Full-Duplex */}
          <Card 
            className={`cursor-pointer transition-all ${voiceMode === "native-duplex" ? "border-yellow-500 bg-yellow-500/10" : "border-muted hover:border-yellow-500/50"}`}
            onClick={() => setVoiceMode("native-duplex")}
          >
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full ${voiceMode === "native-duplex" ? "bg-yellow-500" : "bg-yellow-500/20"}`}>
                  <Zap className={`h-5 w-5 ${voiceMode === "native-duplex" ? "text-black" : "text-yellow-500"}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">Full-Duplex Voice</p>
                    {nativeMoshiAvailable && <Badge variant="outline" className="text-xs">Available</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    True full-duplex on RTX 5090 (~40ms latency)
                  </p>
                  <p className="text-xs text-orange-500 mt-1">
                    ⚠️ NOT connected to MYCA/internal systems
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={(e) => { e.stopPropagation(); setUseNativeUI(true); }} className="gap-1">
                      <Maximize2 className="h-3 w-3" />
                      Embed
                    </Button>
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openNativeMoshi(); }} className="gap-1">
                      <ExternalLink className="h-3 w-3" />
                      New Tab
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Option 2: MYCA-Connected Voice */}
          <Card 
            className={`cursor-pointer transition-all ${voiceMode === "myca-connected" ? "border-green-500 bg-green-500/10" : "border-muted hover:border-green-500/50"}`}
            onClick={() => setVoiceMode("myca-connected")}
          >
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full ${voiceMode === "myca-connected" ? "bg-green-500" : "bg-green-500/20"}`}>
                  <Activity className={`h-5 w-5 ${voiceMode === "myca-connected" ? "text-black" : "text-green-500"}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">MYCA-Connected Voice</p>
                    {mycaServerAvailable && <Badge variant="outline" className="text-xs text-green-500">Connected</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Routes through MYCA orchestrator for tools/data
                  </p>
                  <p className="text-xs text-green-500 mt-1">
                    ✓ Connected to MAS, agents, and internal data
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant={mycaServerAvailable ? "default" : "secondary"} 
                      disabled={!mycaServerAvailable}
                      onClick={(e) => { e.stopPropagation(); setVoiceMode("myca-connected"); }}
                      className="gap-1"
                    >
                      <Phone className="h-3 w-3" />
                      Use This Mode
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Voice Interface */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Voice Session
            </CardTitle>
            <CardDescription>
              {isConnected ? "Session active - speak naturally" : "Start a voice session to talk with MYCA"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Transcript */}
            <ScrollArea className="h-[400px] rounded-md border p-4 mb-4" ref={scrollRef}>
              {turns.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Start a session to begin the conversation
                </p>
              ) : (
                <div className="space-y-4">
                  {turns.map((turn) => (
                    <div
                      key={turn.id}
                      className={`flex ${turn.speaker === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          turn.speaker === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">{turn.text}</p>
                        {turn.toolCall && (
                          <Badge
                            variant={turn.toolCall.status === "success" ? "default" : "secondary"}
                            className="mt-2 gap-1"
                          >
                            <Zap className="h-3 w-3" />
                            {turn.toolCall.agent}: {turn.toolCall.action}
                          </Badge>
                        )}
                        <p className="text-xs opacity-60 mt-1">
                          {turn.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Interim transcript (what you're saying) */}
            {isConnected && interimTranscript && (
              <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2 text-sm">
                  <Mic className="h-4 w-4 text-primary animate-pulse" />
                  <span className="text-muted-foreground italic">{interimTranscript}</span>
                </div>
              </div>
            )}

            {/* Text Input (alternative to voice) */}
            {isConnected && (
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Type a message or speak..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="flex-1"
                />
                <Button onClick={sendTextMessage} size="icon" disabled={!textInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Voice Controls */}
            <div className="flex items-center justify-center gap-4">
              {!isConnected ? (
                <Button size="lg" onClick={startSession} className="gap-2">
                  <Phone className="h-5 w-5" />
                  Start Session
                </Button>
              ) : (
                <>
                  <Button
                    variant={isMuted ? "destructive" : "outline"}
                    size="icon"
                    onClick={toggleMute}
                  >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>
                  
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={endSession}
                    className="gap-2"
                  >
                    <PhoneOff className="h-5 w-5" />
                    End Session
                  </Button>
                  
                  <Button
                    variant={isSpeaking ? "default" : "outline"}
                    size="icon"
                    disabled
                  >
                    {isSpeaking ? <Volume2 className="h-5 w-5 animate-pulse" /> : <VolumeX className="h-5 w-5" />}
                  </Button>
                </>
              )}
            </div>

            {/* Status Indicators */}
            {isConnected && (
              <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${wsConnected ? "bg-green-500" : "bg-yellow-500"}`} />
                  <span className="text-muted-foreground">
                    {wsConnected ? "PersonaPlex" : "ElevenLabs (Fallback)"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isRecognizing && !isMuted ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
                  <span className="text-muted-foreground">
                    {isRecognizing && !isMuted ? "Listening" : isMuted ? "Muted" : "Starting..."}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isSpeaking ? "bg-blue-500 animate-pulse" : "bg-gray-400"}`} />
                  <span className="text-muted-foreground">Speaking</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settings Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Native Moshi Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="native-mode">Native Moshi Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Use embedded Moshi interface (best experience)
                </p>
              </div>
              <Switch
                id="native-mode"
                checked={useNativeUI}
                onCheckedChange={setUseNativeUI}
                disabled={isConnected}
              />
            </div>

            {/* Duplex Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="duplex-mode">Full Duplex Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Use PersonaPlex for real-time conversation
                </p>
              </div>
              <Switch
                id="duplex-mode"
                checked={useDuplex}
                onCheckedChange={setUseDuplex}
                disabled={isConnected || !session?.personaplex_available || useNativeUI}
              />
            </div>

            {/* Mode Info */}
            <div className="rounded-lg border p-4 space-y-2">
              <h4 className="font-medium">
                {useNativeUI ? "Native Moshi (Local GPU)" : 
                 voiceMode === "myca-connected" ? "MYCA-Connected Voice" :
                 useDuplex ? "PersonaPlex (NATF2)" : "ElevenLabs (Arabella)"}
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                {useNativeUI ? (
                  <>
                    <li>✓ True full-duplex conversation</li>
                    <li>✓ Runs on RTX 5090 locally</li>
                    <li>✓ Natural interruptions</li>
                    <li>✓ ~40ms frame latency</li>
                    <li className="text-orange-500">⚠ NOT connected to MYCA</li>
                  </>
                ) : voiceMode === "myca-connected" ? (
                  <>
                    <li className="text-green-500">✓ Connected to MAS orchestrator</li>
                    <li className="text-green-500">✓ Access to internal data</li>
                    <li className="text-green-500">✓ Can invoke agents & tools</li>
                    <li>- Turn-based (request/response)</li>
                    <li>- Uses PersonaPlex TTS</li>
                  </>
                ) : useDuplex ? (
                  <>
                    <li>- Full duplex (speak while listening)</li>
                    <li>- Natural interruptions</li>
                    <li>- Backchannels ("mm-hmm")</li>
                    <li>- ~170ms latency</li>
                  </>
                ) : (
                  <>
                    <li>- Half duplex (turn-based)</li>
                    <li>- Premium voice quality</li>
                    <li>- Reliable cloud service</li>
                    <li>- ~300-500ms latency</li>
                  </>
                )}
              </ul>
            </div>

            {/* Session Info */}
            {session && (
              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="font-medium">Session</h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Mode: {session.mode || "checking..."}</p>
                  {session.transport && <p>Transport: {session.transport.type}</p>}
                  <p>Turns: {turns.length}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



