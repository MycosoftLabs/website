"use client"

/**
 * MYCA Chat Panel v2.2
 * Real-time chat with MYCA using ElevenLabs voice (Arabella)
 * Full n8n workflow integration + NLQ Engine
 * Features: Voice I/O, Memory, Full system access, Safety confirmations, NLQ queries
 * 
 * Updated: Jan 26, 2026
 */

import { useState, useRef, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Brain,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Loader2,
  User,
  Sparkles,
  Maximize2,
  Minimize2,
  RotateCcw,
  Database,
  History,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Bot,
  Play,
  Network,
  FileText,
  Cpu,
} from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  agent?: string
  thinking?: boolean
  audio_base64?: string
  requires_confirmation?: boolean
  confirmation_id?: string
  // NLQ data
  nlqData?: Array<{ id: string; type: string; title: string; subtitle?: string }>
  nlqActions?: Array<{ id: string; label: string; endpoint: string; method: string }>
  nlqSources?: Array<{ name: string; type: string }>
}

interface MYCAChatPanelProps {
  className?: string
  masApiUrl?: string
  onAgentAction?: (agentId: string, action: string) => void
}

// Session ID generator
function generateSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function MYCAChatPanel({ 
  className = "", 
  masApiUrl = "/api/mas",
  onAgentAction 
}: MYCAChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [sessionId] = useState(generateSessionId)
  const [memoryEnabled, setMemoryEnabled] = useState(true)
  const [voiceConfigured, setVoiceConfigured] = useState(false)
  const [agentStats, setAgentStats] = useState({ total: 223, active: 180 })
  const [pendingConfirmation, setPendingConfirmation] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "offline" | "checking">("checking")
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recognitionRef = useRef<any>(null)

  // Check orchestrator connection and voice config
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const [healthRes, voiceRes, agentsRes] = await Promise.all([
          fetch(`${masApiUrl}/health`),
          fetch(`${masApiUrl}/voice`),
          fetch(`${masApiUrl}/agents`),
        ])

        if (healthRes.ok) {
          const health = await healthRes.json()
          setConnectionStatus(health.status === "offline" ? "offline" : "connected")
        }

        if (voiceRes.ok) {
          const voice = await voiceRes.json()
          setVoiceConfigured(voice.elevenlabs_configured)
        }

        if (agentsRes.ok) {
          const agents = await agentsRes.json()
          setAgentStats({
            total: agents.total_agents || 223,
            active: agents.active_agents || 180,
          })
        }
      } catch {
        setConnectionStatus("offline")
      }
    }

    checkConnection()
    const interval = setInterval(checkConnection, 30000)
    return () => clearInterval(interval)
  }, [masApiUrl])

  // Add welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: `Hello, I'm MYCA - your Mycosoft Cognitive Agent. I'm currently orchestrating ${agentStats.total} agents across 14 categories. I speak with the Arabella voice.

How can I assist you today? You can ask me about:
• System status and health
• Agent management
• n8n workflows
• Infrastructure (Proxmox, UniFi, NAS)
• Security operations
• And much more!`,
        timestamp: new Date(),
        agent: "myca-orchestrator"
      }])
    }
  }, [agentStats.total])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Store message to memory
  const storeToMemory = useCallback(async (message: string, role: "user" | "assistant", agent?: string) => {
    if (!memoryEnabled) return

    try {
      await fetch(`${masApiUrl}/memory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          message,
          role,
          agent,
        }),
      })
    } catch (error) {
      console.error("Failed to store memory:", error)
    }
  }, [masApiUrl, sessionId, memoryEnabled])

  // Play audio from base64
  const playAudio = useCallback((base64Audio: string) => {
    if (!voiceEnabled) return

    try {
      setIsSpeaking(true)
      
      // Convert base64 to audio
      const audioData = atob(base64Audio)
      const audioArray = new Uint8Array(audioData.length)
      for (let i = 0; i < audioData.length; i++) {
        audioArray[i] = audioData.charCodeAt(i)
      }
      const audioBlob = new Blob([audioArray], { type: "audio/mpeg" })
      const audioUrl = URL.createObjectURL(audioBlob)
      
      if (audioRef.current) {
        audioRef.current.pause()
      }
      
      const audio = new Audio(audioUrl)
      audioRef.current = audio
      
      audio.onended = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
      }
      audio.onerror = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
      }
      
      audio.play()
    } catch (error) {
      console.error("Audio playback error:", error)
      setIsSpeaking(false)
    }
  }, [voiceEnabled])

  // Fallback TTS using browser
  const fallbackSpeak = useCallback((text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return

    const utterance = new SpeechSynthesisUtterance(text.replace(/[*#_`]/g, ""))
    utterance.rate = 1.0
    utterance.pitch = 1.0
    
    // Try to find a female voice
    const voices = window.speechSynthesis.getVoices()
    const femaleVoice = voices.find(v => 
      v.name.toLowerCase().includes("female") || 
      v.name.toLowerCase().includes("samantha") ||
      v.name.toLowerCase().includes("victoria") ||
      v.name.toLowerCase().includes("karen") ||
      v.name.toLowerCase().includes("zira")
    )
    if (femaleVoice) {
      utterance.voice = femaleVoice
    }
    
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }, [voiceEnabled])

  // Send message to MYCA via voice orchestrator
  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    storeToMemory(input, "user")
    const messageText = input
    setInput("")
    setIsLoading(true)

    // Add thinking message
    const thinkingId = `thinking-${Date.now()}`
    setMessages(prev => [...prev, {
      id: thinkingId,
      role: "assistant",
      content: "Processing...",
      timestamp: new Date(),
      thinking: true
    }])

    try {
      // Check if this is a confirmation response
      if (pendingConfirmation) {
        const confirmRes = await fetch(`${masApiUrl}/voice/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            request_id: pendingConfirmation,
            actor: "user",
            transcript: messageText,
          }),
        })

        if (confirmRes.ok) {
          const confirmData = await confirmRes.json()
          setPendingConfirmation(null)

          const assistantMessage: Message = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: confirmData.message,
            timestamp: new Date(),
            agent: "myca-orchestrator",
          }

          setMessages(prev => prev.filter(m => m.id !== thinkingId).concat(assistantMessage))
          storeToMemory(assistantMessage.content, "assistant", "myca-orchestrator")

          if (voiceEnabled && confirmData.message) {
            fallbackSpeak(confirmData.message)
          }

          setIsLoading(false)
          return
        }
      }

      // Try NLQ API first for enhanced responses
      let nlqResponse = null
      try {
        const nlqRes = await fetch("/api/myca/nlq", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: messageText,
            context: {
              sessionId,
              currentPage: window.location.pathname,
            },
            options: {
              wantAudio: voiceEnabled && voiceConfigured,
              maxResults: 5,
              includeActions: true,
            },
          }),
        })
        if (nlqRes.ok) {
          nlqResponse = await nlqRes.json()
        }
      } catch {
        // Fall through to voice orchestrator
      }

      // Use NLQ response if available, otherwise fall back to voice orchestrator
      let responseText = ""
      let audioBase64 = ""
      let nlqData = undefined
      let nlqActions = undefined
      let nlqSources = undefined
      let agentName = "myca-orchestrator"
      let requiresConfirmation = false

      if (nlqResponse && nlqResponse.text) {
        responseText = nlqResponse.text
        audioBase64 = nlqResponse.audio_base64 || ""
        nlqData = nlqResponse.data?.slice(0, 5)
        nlqActions = nlqResponse.actions
        nlqSources = nlqResponse.sources
        agentName = nlqResponse.metadata?.intent?.type?.includes("agent") ? "agent-router" : "myca-nlq"
        requiresConfirmation = nlqResponse.type === "action" && nlqResponse.actions?.some((a: { requiresConfirmation?: boolean }) => a.requiresConfirmation)
      } else {
        // Fallback to voice orchestrator endpoint
        const response = await fetch(`${masApiUrl}/voice/orchestrator`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: messageText,
            conversation_id: sessionId,
            want_audio: voiceEnabled && voiceConfigured,
            actor: "user",
          }),
        })

        const data = await response.json()
        responseText = data.response_text || data.response || "I understand. How can I help you further?"
        audioBase64 = data.audio_base64 || ""
        agentName = data.agent || "myca-orchestrator"
        requiresConfirmation = data.requires_confirmation || false
        
        if (data.requires_confirmation) {
          setPendingConfirmation(data.conversation_id)
        }
      }
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: responseText,
        timestamp: new Date(),
        agent: agentName,
        audio_base64: audioBase64 || undefined,
        requires_confirmation: requiresConfirmation,
        confirmation_id: requiresConfirmation ? sessionId : undefined,
        nlqData,
        nlqActions,
        nlqSources,
      }

      // Handle confirmation requirement
      if (requiresConfirmation && !nlqResponse) {
        setPendingConfirmation(sessionId)
      }

      // Remove thinking message and add response
      setMessages(prev => prev.filter(m => m.id !== thinkingId).concat(assistantMessage))
      storeToMemory(assistantMessage.content, "assistant", assistantMessage.agent)

      // Play audio if available
      if (audioBase64 && voiceEnabled) {
        playAudio(audioBase64)
      } else if (voiceEnabled && assistantMessage.content) {
        // Fallback to browser TTS
        fallbackSpeak(assistantMessage.content)
      }

    } catch (error) {
      console.error("Chat error:", error)
      setMessages(prev => prev.filter(m => m.id !== thinkingId).concat({
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "I apologize, but I encountered an issue connecting to the orchestrator. Please try again.",
        timestamp: new Date(),
        agent: "myca-orchestrator"
      }))
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, masApiUrl, sessionId, voiceEnabled, voiceConfigured, pendingConfirmation, storeToMemory, playAudio, fallbackSpeak])

  // Voice input using Web Speech API
  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = "en-US"

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join("")
      
      setInput(transcript)
      
      if (event.results[0].isFinal) {
        // Auto-send after final result
        setTimeout(() => {
          if (transcript.trim()) {
            sendMessage()
          }
        }, 500)
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [isListening, sendMessage])

  // Stop audio
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
  }, [])

  // Clear chat
  const clearChat = useCallback(() => {
    stopAudio()
    setPendingConfirmation(null)
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: `Chat cleared. I'm MYCA, ready to assist. I'm orchestrating ${agentStats.total} agents.`,
      timestamp: new Date(),
      agent: "myca-orchestrator"
    }])
  }, [stopAudio, agentStats.total])

  // Handle key press
  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return <CheckCircle2 className="h-3 w-3 text-green-500" />
      case "offline":
        return <XCircle className="h-3 w-3 text-red-500" />
      default:
        return <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />
    }
  }

  return (
    <Card className={`flex flex-col bg-gradient-to-b from-card to-card/95 ${isExpanded ? "fixed inset-4 z-50" : ""} ${className}`}>
      <CardHeader className="py-3 px-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="relative">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                <Brain className="h-5 w-5 text-purple-500" />
              </div>
              <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${connectionStatus === "connected" ? "bg-green-500 animate-pulse" : connectionStatus === "offline" ? "bg-red-500" : "bg-yellow-500 animate-pulse"}`} />
            </div>
            <div>
              <span className="font-bold">MYCA</span>
              <Badge variant="secondary" className="ml-2 text-[10px] py-0">
                v2.1 • Arabella
              </Badge>
            </div>
          </CardTitle>
          <div className="flex items-center gap-1">
            {/* Connection Status */}
            <Badge variant="outline" className="text-[10px] gap-1">
              {getStatusIcon()}
              {connectionStatus === "connected" ? "Online" : connectionStatus === "offline" ? "Fallback" : "Checking"}
            </Badge>
            
            {/* Voice Status */}
            {voiceConfigured ? (
              <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/30">
                <Volume2 className="h-3 w-3 mr-1" />
                ElevenLabs
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-yellow-500 border-yellow-500/30">
                <AlertCircle className="h-3 w-3 mr-1" />
                Browser
              </Badge>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              title={voiceEnabled ? "Disable voice" : "Enable voice"}
            >
              {voiceEnabled ? (
                <Volume2 className="h-4 w-4 text-green-500" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMemoryEnabled(!memoryEnabled)}
              title={memoryEnabled ? "Disable memory" : "Enable memory"}
            >
              {memoryEnabled ? (
                <Database className="h-4 w-4 text-blue-500" />
              ) : (
                <Database className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={clearChat}
              title="Clear chat"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Agent Stats Bar */}
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span>
            <span className="text-green-500 font-bold">{agentStats.active}</span>
            /{agentStats.total} agents active
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <History className="h-3 w-3" />
            Session: {sessionId.slice(-8)}
          </span>
          {pendingConfirmation && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1 text-yellow-500">
                <AlertTriangle className="h-3 w-3" />
                Awaiting confirmation
              </span>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {/* Messages */}
        <ScrollArea className={`flex-1 ${isExpanded ? "h-[calc(100vh-200px)]" : "h-[350px]"}`}>
          <div ref={scrollRef} className="p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role !== "user" && (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src="/images/myca-avatar.png" />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-purple-500">
                      <Brain className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : message.thinking
                        ? "bg-muted/50 animate-pulse"
                        : message.requires_confirmation
                          ? "bg-yellow-500/10 border border-yellow-500/30"
                          : "bg-muted"
                  }`}
                >
                  {message.thinking ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  ) : (
                    <>
                      {message.requires_confirmation && (
                        <div className="flex items-center gap-2 mb-2 text-yellow-500">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-xs font-medium">Confirmation Required</span>
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      
                      {/* NLQ Data Results */}
                      {message.nlqData && message.nlqData.length > 0 && (
                        <div className="mt-3 space-y-1">
                          <div className="text-[10px] text-muted-foreground mb-1">Results ({message.nlqData.length})</div>
                          {message.nlqData.map((item) => (
                            <div 
                              key={item.id}
                              className="flex items-center gap-2 p-1.5 rounded bg-black/10 dark:bg-white/5"
                            >
                              {item.type === "agent" && <Bot className="h-3 w-3 text-purple-500" />}
                              {item.type === "document" && <FileText className="h-3 w-3 text-blue-500" />}
                              {item.type === "telemetry" && <Cpu className="h-3 w-3 text-green-500" />}
                              {!["agent", "document", "telemetry"].includes(item.type) && <Database className="h-3 w-3 text-gray-500" />}
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium truncate">{item.title}</div>
                                {item.subtitle && <div className="text-[10px] opacity-60 truncate">{item.subtitle}</div>}
                              </div>
                              <Badge variant="outline" className="text-[8px]">{item.type}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* NLQ Actions */}
                      {message.nlqActions && message.nlqActions.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {message.nlqActions.map((action) => (
                            <Button
                              key={action.id}
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] px-2"
                              onClick={() => {
                                // Execute action
                                fetch(action.endpoint, {
                                  method: action.method,
                                  headers: { "Content-Type": "application/json" },
                                })
                              }}
                            >
                              <Play className="h-2 w-2 mr-1" />
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] opacity-60">
                        <span>{message.timestamp.toLocaleTimeString()}</span>
                        {message.agent && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1">
                            {message.agent}
                          </Badge>
                        )}
                        {message.audio_base64 && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1 text-green-500">
                            <Volume2 className="h-2 w-2 mr-1" />
                            Audio
                          </Badge>
                        )}
                        {message.nlqSources && message.nlqSources.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Network className="h-2 w-2" />
                            {message.nlqSources.map(s => s.name).join(", ")}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
                {message.role === "user" && (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-blue-500/20 text-blue-500">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t flex-shrink-0 bg-card/50">
          {pendingConfirmation && (
            <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span>Say &quot;Confirm and proceed&quot; or &quot;Cancel&quot;</span>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant={isListening ? "destructive" : "outline"}
              size="icon"
              className="flex-shrink-0"
              onClick={toggleListening}
              disabled={isSpeaking}
            >
              {isListening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            <Input
              ref={inputRef}
              placeholder={pendingConfirmation ? "Confirm or cancel..." : "Talk to MYCA..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-2">
              {isListening && (
                <span className="flex items-center gap-1 text-red-500">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  Listening...
                </span>
              )}
              {isSpeaking && (
                <Button variant="ghost" size="sm" className="h-5 px-2 text-[10px]" onClick={stopAudio}>
                  <Volume2 className="h-3 w-3 mr-1 animate-pulse" />
                  Stop Speaking
                </Button>
              )}
            </div>
            <span>
              Try: &quot;status&quot;, &quot;list agents&quot;, &quot;show workflows&quot;
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
