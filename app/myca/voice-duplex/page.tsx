"use client"

/**
 * MYCA Voice Duplex Page - January 27, 2026
 * Full-duplex voice interface with PersonaPlex and ElevenLabs fallback
 */

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff, Settings, Zap, Activity } from "lucide-react"

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
  
  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Check PersonaPlex availability on mount
  useEffect(() => {
    checkAvailability()
  }, [])

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
      
      // Create session
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
    addTurn("myca", "Session ended. Talk to you soon!")
  }

  const connectWebSocket = (url: string) => {
    try {
      const ws = new WebSocket(url)
      
      ws.onopen = () => {
        console.log("PersonaPlex connected")
      }
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handlePersonaPlexMessage(data)
        } catch {
          console.log("Non-JSON message:", event.data)
        }
      }
      
      ws.onerror = (e) => {
        console.error("WebSocket error:", e)
        // Fall back to classic mode
        setUseDuplex(false)
      }
      
      ws.onclose = () => {
        console.log("PersonaPlex disconnected")
      }
      
      wsRef.current = ws
    } catch (e) {
      console.error("WebSocket connection failed:", e)
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
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted
      })
      setIsMuted(!isMuted)
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
                  <div className={`w-2 h-2 rounded-full ${isListening ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
                  <span className="text-muted-foreground">Listening</span>
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
                disabled={isConnected || !session?.personaplex_available}
              />
            </div>

            {/* Mode Info */}
            <div className="rounded-lg border p-4 space-y-2">
              <h4 className="font-medium">
                {useDuplex ? "PersonaPlex (NATF2)" : "ElevenLabs (Arabella)"}
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                {useDuplex ? (
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
                  <p>Mode: {session.mode}</p>
                  <p>Transport: {session.transport.type}</p>
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
