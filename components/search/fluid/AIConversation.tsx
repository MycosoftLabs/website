/**
 * AIConversation - Feb 2026
 * 
 * Full AI conversation panel with:
 * - MYCA Brain integration via Frontier LLM Router
 * - Message history with context
 * - Streaming responses
 * - Source citations
 * - Voice input support
 */

"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useConversationMemory } from "@/hooks/use-session-memory"
import { useVoiceSearch } from "@/hooks/use-voice-search"
import { 
  Sparkles, 
  Send, 
  Mic, 
  MicOff,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  User,
  Bot,
  ExternalLink,
  Loader2,
  Copy,
  Check,
  History,
} from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  sources?: string[]
  confidence?: number
  model?: string
  isStreaming?: boolean
}

interface AIConversationProps {
  initialContext?: string
  searchQuery?: string
  searchResults?: any
  onQueryChange?: (query: string) => void
  className?: string
}

export function AIConversation({
  initialContext = "",
  searchQuery = "",
  searchResults,
  onQueryChange,
  className,
}: AIConversationProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showSources, setShowSources] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Session memory for conversation persistence
  const {
    conversationHistory,
    addUserMessage,
    addAssistantMessage,
    getConversationContext,
    contextSummary,
  } = useConversationMemory()

  // Voice search integration
  const {
    isListening,
    isConnected: isVoiceConnected,
    lastTranscript,
    startListening,
    stopListening,
  } = useVoiceSearch({
    onAIQuestion: (question) => {
      // Automatically send voice questions to AI
      sendMessage(question)
    },
  })

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Load conversation history from session on mount
  useEffect(() => {
    if (conversationHistory.length > 0 && messages.length === 0) {
      const loadedMessages: Message[] = conversationHistory.map((entry) => ({
        id: entry.id,
        role: entry.role,
        content: entry.content,
        timestamp: entry.timestamp,
        sources: [],
      }))
      setMessages(loadedMessages)
    }
  }, [conversationHistory, messages.length])

  // Send message to MYCA Brain
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    }

    // Save user message to session memory
    addUserMessage(content.trim())

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // Create placeholder for assistant response
    const assistantId = `assistant-${Date.now()}`
    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    }
    setMessages((prev) => [...prev, assistantMessage])

    try {
      // Build context from search results, previous messages, and session context
      const searchContext = buildContext(searchResults, messages)
      const sessionContext = contextSummary || ""
      const fullContext = [searchContext, sessionContext].filter(Boolean).join("\n\n")
      
      // Get conversation history from session for better context
      const sessionHistory = getConversationContext()
      
      let responseContent = ""
      let responseData: any = {}
      
      // Step 1: Try MYCA consciousness chat first (primary)
      try {
        const consciousnessResponse = await fetch("/api/myca/consciousness/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            message: content,
            context: { search: fullContext },
          }),
          signal: AbortSignal.timeout(35000),
        })
        
        if (consciousnessResponse.ok) {
          const data = await consciousnessResponse.json()
          if (data.message) {
            responseContent = data.message
            responseData = {
              sources: [],
              confidence: 0.85,
              model: "MYCA Consciousness",
              emotional_state: data.emotional_state,
            }
          }
        }
      } catch {
        // Consciousness API not available, fall back to brain API
      }
      
      // Step 2: Fall back to MYCA Brain API if consciousness didn't respond
      if (!responseContent) {
        const response = await fetch("/api/mas/brain/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: content,
            context: fullContext,
            history: sessionHistory.length > 0 
              ? sessionHistory 
              : messages.slice(-10).map((m) => ({
                  role: m.role,
                  content: m.content,
                })),
            mode: "conversational",
            stream: false,
          }),
        })

        if (!response.ok) {
          throw new Error(`Brain API error: ${response.status}`)
        }

        const data = await response.json()
        responseContent = data.response || data.answer || "I couldn't generate a response."
        responseData = data
      }

      // Save assistant message to session memory
      addAssistantMessage(responseContent, fullContext)

      // Update assistant message with response
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: responseContent,
                sources: responseData.sources || [],
                confidence: responseData.confidence || 0.7,
                model: responseData.model || "MYCA",
                isStreaming: false,
              }
            : m
        )
      )

      // If the AI suggests a search refinement, notify parent
      if (data.suggestedQuery && onQueryChange) {
        onQueryChange(data.suggestedQuery)
      }
    } catch (error) {
      console.error("AI conversation error:", error)
      const errorMessage = "I encountered an error processing your request. Please try again."
      addAssistantMessage(errorMessage)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: errorMessage,
                isStreaming: false,
                confidence: 0,
              }
            : m
        )
      )
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, messages, searchResults, onQueryChange, addUserMessage, addAssistantMessage, contextSummary, getConversationContext])

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  // Copy message to clipboard
  const copyMessage = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Toggle voice input
  const toggleVoice = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  return (
    <div className={cn("flex flex-col h-full bg-card rounded-xl border", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10">
        <div className="p-2 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-lg">
          <Sparkles className="h-5 w-5 text-violet-500" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">MYCA AI Assistant</h3>
          <p className="text-xs text-muted-foreground">
            Powered by Frontier LLM Router
          </p>
        </div>
        <div className="flex items-center gap-2">
          {conversationHistory.length > 0 && (
            <Badge variant="outline" className="text-xs">
              <History className="h-3 w-3 mr-1" />
              {conversationHistory.length} messages
            </Badge>
          )}
          {searchQuery && (
            <Badge variant="secondary" className="text-xs">
              Context: "{searchQuery}"
            </Badge>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea 
        ref={scrollAreaRef}
        className="flex-1 p-4"
      >
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h4 className="font-medium text-lg">Start a Conversation</h4>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Ask me anything about fungi, compounds, research, or the data you're exploring.
              </p>
              
              {/* Suggested prompts */}
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {[
                  "What are the medicinal properties?",
                  "Tell me about the chemistry",
                  "How can I identify this species?",
                  "What research exists on this topic?",
                ].map((prompt) => (
                  <Button
                    key={prompt}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => sendMessage(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="p-2 bg-violet-500/10 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-violet-500" />
                  </div>
                )}

                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {/* Content */}
                  <p className="text-sm whitespace-pre-wrap">
                    {message.content || (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Thinking...
                      </span>
                    )}
                  </p>

                  {/* Assistant metadata */}
                  {message.role === "assistant" && !message.isStreaming && (
                    <div className="mt-2 pt-2 border-t border-border/50 space-y-2">
                      {/* Confidence and model */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {message.confidence !== undefined && (
                          <span className={cn(
                            message.confidence >= 0.8 ? "text-green-500" :
                            message.confidence >= 0.5 ? "text-yellow-500" :
                            "text-red-500"
                          )}>
                            {Math.round(message.confidence * 100)}% confident
                          </span>
                        )}
                        {message.model && (
                          <>
                            <span>•</span>
                            <span>{message.model}</span>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 ml-auto"
                          onClick={() => copyMessage(message.content, message.id)}
                        >
                          {copiedId === message.id ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>

                      {/* Sources */}
                      {message.sources && message.sources.length > 0 && (
                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => setShowSources(
                              showSources === message.id ? null : message.id
                            )}
                          >
                            {showSources === message.id ? (
                              <ChevronUp className="h-3 w-3 mr-1" />
                            ) : (
                              <ChevronDown className="h-3 w-3 mr-1" />
                            )}
                            {message.sources.length} sources
                          </Button>

                          <AnimatePresence>
                            {showSources === message.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-1 pl-2 border-l-2 border-violet-500/30 space-y-1"
                              >
                                {message.sources.map((source, i) => (
                                  <p key={i} className="text-xs text-muted-foreground">
                                    {source}
                                  </p>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {message.role === "user" && (
                  <div className="p-2 bg-primary/10 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="p-4 border-t">
        {/* Voice transcript feedback */}
        <AnimatePresence>
          {isListening && lastTranscript && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2"
            >
              <Mic className="h-4 w-4 text-red-500 animate-pulse" />
              <span className="text-sm text-red-600 dark:text-red-400">
                "{lastTranscript}"
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "Listening..." : "Ask a question..."}
              className="pr-12"
              disabled={isLoading}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7",
                isListening && "text-red-500",
                !isVoiceConnected && "opacity-50"
              )}
              onClick={toggleVoice}
              disabled={!isVoiceConnected}
              title={isVoiceConnected ? (isListening ? "Stop listening" : "Voice input") : "Voice not available"}
            >
              {isListening ? (
                <MicOff className="h-4 w-4 animate-pulse" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          </div>
          <Button type="submit" disabled={!input.trim() || isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}

// Helper to build context from search results
function buildContext(searchResults: any, messages: Message[]): string {
  const parts: string[] = []

  if (searchResults?.species?.length > 0) {
    const speciesInfo = searchResults.species.slice(0, 3).map((s: any) =>
      `Species: ${s.commonName} (${s.scientificName}) - ${s.description?.slice(0, 100) || ""}`
    ).join("\n")
    parts.push(`SPECIES DATA:\n${speciesInfo}`)
  }

  if (searchResults?.compounds?.length > 0) {
    const compoundInfo = searchResults.compounds.slice(0, 3).map((c: any) =>
      `Compound: ${c.name} (${c.formula}) - ${c.chemicalClass}`
    ).join("\n")
    parts.push(`COMPOUNDS:\n${compoundInfo}`)
  }

  if (searchResults?.research?.length > 0) {
    const researchInfo = searchResults.research.slice(0, 2).map((r: any) =>
      `Research: "${r.title}" (${r.year})`
    ).join("\n")
    parts.push(`RESEARCH:\n${researchInfo}`)
  }

  return parts.join("\n\n") || "No specific context available."
}

export default AIConversation
