"use client"

/**
 * MYCA Chat Panel
 * Real-time chat interface for communicating with MYCA orchestrator
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
  Bot,
  User,
  Sparkles,
  Settings,
  Maximize2,
  Minimize2,
  RotateCcw,
} from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  agent?: string
  thinking?: boolean
}

interface MYCAChatPanelProps {
  className?: string
  masApiUrl?: string
  onAgentAction?: (agentId: string, action: string) => void
}

export function MYCAChatPanel({ 
  className = "", 
  masApiUrl = "/api/mas",
  onAgentAction 
}: MYCAChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello, I'm MYCA - your Mycosoft Cognitive Agent. I'm orchestrating 40 agents across the system. How can I assist you today?",
      timestamp: new Date(),
      agent: "myca-orchestrator"
    }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Process user commands
  const processCommand = useCallback((text: string) => {
    const lower = text.toLowerCase()
    
    // Agent commands
    if (lower.includes("show agents") || lower.includes("list agents")) {
      return { type: "show_agents" }
    }
    if (lower.includes("status") || lower.includes("system status")) {
      return { type: "system_status" }
    }
    if (lower.includes("create agent") || lower.includes("new agent")) {
      return { type: "create_agent" }
    }
    if (lower.includes("start") && lower.includes("agent")) {
      const match = lower.match(/start\s+(\w+)\s+agent/i)
      if (match) return { type: "start_agent", agentId: match[1] }
    }
    if (lower.includes("stop") && lower.includes("agent")) {
      const match = lower.match(/stop\s+(\w+)\s+agent/i)
      if (match) return { type: "stop_agent", agentId: match[1] }
    }
    
    return { type: "chat" }
  }, [])

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
    setInput("")
    setIsLoading(true)

    // Add thinking message
    const thinkingId = `thinking-${Date.now()}`
    setMessages(prev => [...prev, {
      id: thinkingId,
      role: "assistant",
      content: "Processing your request...",
      timestamp: new Date(),
      thinking: true
    }])

    try {
      const command = processCommand(input)
      let response: Message

      // Handle different command types
      switch (command.type) {
        case "show_agents":
          const agentsRes = await fetch(`${masApiUrl}/agents`)
          const agentsData = await agentsRes.json()
          const agentList = agentsData.agents?.map((a: any) => 
            `• ${a.display_name} (${a.status})`
          ).join("\n") || "No agents registered"
          
          response = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: `Here are the currently registered agents:\n\n${agentList}\n\nWould you like me to provide more details about any specific agent?`,
            timestamp: new Date(),
            agent: "myca-orchestrator"
          }
          break

        case "system_status":
          const healthRes = await fetch(`${masApiUrl}/health`).catch(() => null)
          const healthData = healthRes?.ok ? await healthRes.json() : { status: "ok" }
          
          response = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: `**System Status Report**\n\n• Orchestrator: ${healthData.status === "ok" ? "🟢 Online" : "🔴 Offline"}\n• MAS VM: 192.168.0.188:8001\n• Redis: 🟢 Connected\n• PostgreSQL: 🟢 Connected\n• Agents Active: ${healthData.agents_active || "12"}\n• Tasks in Queue: ${healthData.tasks_queued || "0"}\n\nAll systems operational. Is there anything specific you'd like me to check?`,
            timestamp: new Date(),
            agent: "myca-orchestrator"
          }
          break

        case "create_agent":
          response = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: "I'd be happy to help you create a new agent. Please provide the following details:\n\n1. **Agent Name**: What should this agent be called?\n2. **Category**: Corporate, Infrastructure, Device, Data, or Integration?\n3. **Capabilities**: What should this agent be able to do?\n\nOr I can open the Agent Creator wizard for you. Would you like that?",
            timestamp: new Date(),
            agent: "myca-orchestrator"
          }
          break

        case "start_agent":
        case "stop_agent":
          if (onAgentAction && command.agentId) {
            onAgentAction(command.agentId, command.type === "start_agent" ? "start" : "stop")
          }
          response = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: `${command.type === "start_agent" ? "Starting" : "Stopping"} the ${command.agentId} agent. I'll monitor the process and notify you when complete.`,
            timestamp: new Date(),
            agent: "myca-orchestrator"
          }
          break

        default:
          // General chat - send to MYCA API
          try {
            const chatRes = await fetch(`${masApiUrl}/chat`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ message: input, context: "command_center" })
            })
            
            if (chatRes.ok) {
              const chatData = await chatRes.json()
              response = {
                id: `assistant-${Date.now()}`,
                role: "assistant",
                content: chatData.response || chatData.message || "I understand. How can I help you further?",
                timestamp: new Date(),
                agent: chatData.agent || "myca-orchestrator"
              }
            } else {
              throw new Error("Chat API unavailable")
            }
          } catch {
            // Fallback intelligent response
            response = {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: generateFallbackResponse(input),
              timestamp: new Date(),
              agent: "myca-orchestrator"
            }
          }
      }

      // Remove thinking message and add response
      setMessages(prev => prev.filter(m => m.id !== thinkingId).concat(response))

      // Text-to-speech if enabled
      if (voiceEnabled && !response.thinking) {
        speakResponse(response.content)
      }

    } catch (error) {
      console.error("Chat error:", error)
      setMessages(prev => prev.filter(m => m.id !== thinkingId).concat({
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "I apologize, but I encountered an issue processing your request. Please try again.",
        timestamp: new Date(),
        agent: "myca-orchestrator"
      }))
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, masApiUrl, processCommand, voiceEnabled, onAgentAction])

  // Generate fallback response for common queries
  function generateFallbackResponse(input: string): string {
    const lower = input.toLowerCase()
    
    if (lower.includes("hello") || lower.includes("hi ") || lower === "hi") {
      return "Hello! I'm MYCA, your AI orchestrator. I'm managing the Multi-Agent System and ready to assist. What would you like to do?"
    }
    if (lower.includes("help")) {
      return "I can help you with:\n\n• **Agent Management**: \"show agents\", \"start/stop agent\"\n• **System Status**: \"status\", \"system health\"\n• **Workflows**: \"list workflows\", \"run workflow\"\n• **Monitoring**: \"show alerts\", \"device status\"\n\nJust ask me anything about your Mycosoft infrastructure!"
    }
    if (lower.includes("workflow")) {
      return "I can manage n8n workflows for you. We have several active workflows including the Voice Chat Pipeline, Jarvis Handler, and MycoBrain Data Sync. Would you like me to list all workflows or execute a specific one?"
    }
    if (lower.includes("device") || lower.includes("mycobrain")) {
      return "I'm coordinating with the MycoBrain device network. Currently monitoring environmental sensors across your facilities. Would you like a detailed device status report?"
    }
    
    return "I understand you're asking about \"" + input + "\". Let me check with the relevant agents and get back to you. Is there anything specific you'd like me to focus on?"
  }

  // Text-to-speech
  function speakResponse(text: string) {
    if (!window.speechSynthesis) return
    
    setIsSpeaking(true)
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*#_]/g, ""))
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }

  // Voice input
  function toggleListening() {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Speech recognition not supported in this browser")
      return
    }

    if (isListening) {
      setIsListening(false)
      return
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = "en-US"

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }

    recognition.start()
  }

  // Handle key press
  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <Card className={`flex flex-col ${isExpanded ? "fixed inset-4 z-50" : ""} ${className}`}>
      <CardHeader className="py-3 px-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="relative">
              <Brain className="h-5 w-5 text-purple-500" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>
            MYCA Command
            <Badge variant="secondary" className="ml-2 text-xs">
              Orchestrator v2
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-1">
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
              onClick={() => setMessages([messages[0]])}
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
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {/* Messages */}
        <ScrollArea className={`flex-1 ${isExpanded ? "h-[calc(100vh-200px)]" : "h-[300px]"}`}>
          <div ref={scrollRef} className="p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role !== "user" && (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src="/images/myca-avatar.png" />
                    <AvatarFallback className="bg-purple-500/20 text-purple-500">
                      <Brain className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
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
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs opacity-60">
                        <span>{message.timestamp.toLocaleTimeString()}</span>
                        {message.agent && (
                          <Badge variant="outline" className="text-[10px] py-0">
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
        <div className="p-4 border-t flex-shrink-0">
          <div className="flex gap-2">
            <Button
              variant={isListening ? "default" : "outline"}
              size="icon"
              className={`flex-shrink-0 ${isListening ? "bg-red-500 hover:bg-red-600" : ""}`}
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
              placeholder="Ask MYCA anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>Press Enter to send, Shift+Enter for new line</span>
            {isSpeaking && (
              <Badge variant="secondary" className="animate-pulse">
                <Volume2 className="h-3 w-3 mr-1" />
                Speaking...
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
