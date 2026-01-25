"use client"

/**
 * MYCA Chat Panel v2
 * Real-time chat with MYCA using ElevenLabs voice (Arabella)
 * Features: Voice I/O, Memory (short/long-term), Full system access
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
} from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  agent?: string
  thinking?: boolean
  audio_url?: string
}

interface MYCAChatPanelProps {
  className?: string
  masApiUrl?: string
  onAgentAction?: (agentId: string, action: string) => void
}

// Generate session ID
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
  const [agentStats, setAgentStats] = useState({ total: 0, active: 0 })
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recognitionRef = useRef<any>(null)

  // Check voice configuration
  useEffect(() => {
    fetch(`${masApiUrl}/voice`)
      .then(res => res.json())
      .then(data => {
        setVoiceConfigured(data.elevenlabs_configured)
      })
      .catch(() => setVoiceConfigured(false))
  }, [masApiUrl])

  // Fetch agent stats
  useEffect(() => {
    fetch(`${masApiUrl}/agents`)
      .then(res => res.json())
      .then(data => {
        setAgentStats({
          total: data.total_agents || 0,
          active: data.active_agents || 0,
        })
      })
      .catch(() => {})
  }, [masApiUrl])

  // Load conversation history
  useEffect(() => {
    if (memoryEnabled) {
      fetch(`${masApiUrl}/memory?session_id=${sessionId}&limit=20`)
        .then(res => res.json())
        .then(data => {
          if (data.conversations && data.conversations.length > 0) {
            // Restore previous messages
          }
        })
        .catch(() => {})
    }

    // Add welcome message
    if (messages.length === 0) {
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: `Hello, I'm MYCA - your Mycosoft Cognitive Agent. I'm currently orchestrating ${agentStats.total || "223+"} agents across the system. How can I assist you today?`,
        timestamp: new Date(),
        agent: "myca-orchestrator"
      }])
    }
  }, [masApiUrl, sessionId, memoryEnabled, agentStats.total])

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

  // Synthesize speech using ElevenLabs
  const speakResponse = useCallback(async (text: string) => {
    if (!voiceEnabled) return

    try {
      setIsSpeaking(true)

      // Call ElevenLabs via our API
      const response = await fetch(`${masApiUrl}/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })

      if (response.ok) {
        const audioBlob = await response.blob()
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
          fallbackTTS(text)
        }
        
        await audio.play()
      } else {
        // Fallback to browser TTS
        fallbackTTS(text)
      }
    } catch (error) {
      console.error("Voice synthesis error:", error)
      fallbackTTS(text)
    }
  }, [masApiUrl, voiceEnabled])

  // Browser TTS fallback (still uses female voice if available)
  function fallbackTTS(text: string) {
    if (!window.speechSynthesis) {
      setIsSpeaking(false)
      return
    }

    const utterance = new SpeechSynthesisUtterance(text.replace(/[*#_]/g, ""))
    utterance.rate = 1.0
    utterance.pitch = 1.0
    
    // Try to find a female voice
    const voices = window.speechSynthesis.getVoices()
    const femaleVoice = voices.find(v => 
      v.name.toLowerCase().includes("female") || 
      v.name.toLowerCase().includes("samantha") ||
      v.name.toLowerCase().includes("victoria") ||
      v.name.toLowerCase().includes("karen")
    )
    if (femaleVoice) {
      utterance.voice = femaleVoice
    }
    
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }

  // Send message to MYCA
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
      // Send to MYCA chat API
      const response = await fetch(`${masApiUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          session_id: sessionId,
          context: "command_center",
        }),
      })

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.response || data.message || "I understand. How can I help you further?",
        timestamp: new Date(),
        agent: data.agent || "myca-orchestrator"
      }

      // Remove thinking message and add response
      setMessages(prev => prev.filter(m => m.id !== thinkingId).concat(assistantMessage))
      storeToMemory(assistantMessage.content, "assistant", assistantMessage.agent)

      // Speak the response
      if (voiceEnabled) {
        speakResponse(assistantMessage.content)
      }

    } catch (error) {
      console.error("Chat error:", error)
      setMessages(prev => prev.filter(m => m.id !== thinkingId).concat({
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "I apologize, but I encountered an issue. Please try again.",
        timestamp: new Date(),
        agent: "myca-orchestrator"
      }))
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, masApiUrl, sessionId, voiceEnabled, speakResponse, storeToMemory])

  // Voice input using Web Speech API
  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    if (!SpeechRecognition) {
      alert("Speech recognition not supported")
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
        setTimeout(() => {
          inputRef.current?.focus()
        }, 100)
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [isListening])

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
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: `Chat cleared. I'm MYCA, ready to assist. I'm orchestrating ${agentStats.total || "223+"} agents.`,
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

  return (
    <Card className={`flex flex-col bg-gradient-to-b from-card to-card/95 ${isExpanded ? "fixed inset-4 z-50" : ""} ${className}`}>
      <CardHeader className="py-3 px-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="relative">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                <Brain className="h-5 w-5 text-purple-500" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
            </div>
            <div>
              <span className="font-bold">MYCA</span>
              <Badge variant="secondary" className="ml-2 text-[10px] py-0">
                v2 • Arabella
              </Badge>
            </div>
          </CardTitle>
          <div className="flex items-center gap-1">
            {/* Voice Status */}
            {voiceConfigured ? (
              <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/30">
                <Volume2 className="h-3 w-3 mr-1" />
                ElevenLabs
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-yellow-500 border-yellow-500/30">
                <AlertCircle className="h-3 w-3 mr-1" />
                Browser TTS
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
            <span className="text-green-500 font-bold">{agentStats.active || 180}</span>
            /{agentStats.total || 223} agents active
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <History className="h-3 w-3" />
            Session: {sessionId.slice(-8)}
          </span>
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
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] opacity-60">
                        <span>{message.timestamp.toLocaleTimeString()}</span>
                        {message.agent && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1">
                            {message.agent}
                          </Badge>
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
              placeholder="Talk to MYCA..."
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
              Try: "status", "list agents", "show workflows"
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
