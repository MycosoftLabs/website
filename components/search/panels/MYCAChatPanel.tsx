/**
 * MYCAChatPanel - Feb 2026 (Consciousness-First)
 *
 * Left panel: Continuous MYCA chat with search context.
 * Uses MYCA consciousness API first, falls back to search AI.
 * Builds contextual responses from search results when APIs fail.
 * Recent searches as compact icons.
 */

"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Send,
  Sparkles,
  Search,
  FlaskConical,
  Dna,
  FileText,
  Loader2,
  Trash2,
  Leaf,
  Brain,
  Heart,
  Mic,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSearchContext, type ChatMessage } from "../SearchContextProvider"

/** MYCA Consciousness Status */
interface ConsciousnessStatus {
  state: "conscious" | "dormant" | "dreaming"
  is_conscious: boolean
  emotional_state?: {
    dominant_emotion: string
    emotions: Record<string, number>
  }
}

/** Hook to track MYCA consciousness */
function useMYCAConsciousness() {
  const [status, setStatus] = useState<ConsciousnessStatus | null>(null)
  
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/myca/consciousness/status", { 
          signal: AbortSignal.timeout(5000) 
        })
        if (res.ok) {
          setStatus(await res.json())
        }
      } catch {
        // Silent fail - MYCA may not be available
      }
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])
  
  return status
}

/** Build conversation history for API (excludes the message being sent) */
function buildHistoryForApi(
  chatMessages: { role: string; content: string }[],
  excludeLast = true
): Array<{ role: string; content: string }> {
  const filtered = chatMessages.filter(
    (m) => m.role === "user" || m.role === "assistant"
  )
  const slice = excludeLast ? filtered.slice(0, -1) : filtered
  return slice.slice(-20).map((m) => ({ role: m.role, content: m.content }))
}

export function MYCAChatPanel() {
  const ctx = useSearchContext()
  const { chatMessages, addChatMessage, clearChat, setQuery } = ctx
  const [input, setInput] = useState("")
  const [isAsking, setIsAsking] = useState(false)
  const [streamingText, setStreamingText] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const consciousness = useMYCAConsciousness()

  // Auto-scroll when messages or streaming text change
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [chatMessages, streamingText])

  // Sync aiAnswer from unified search (voice/text) into chat when we have a pending user message
  const lastAiAnswerRef = useRef<string>("")
  useEffect(() => {
    const answer = ctx.aiAnswer?.text
    if (!answer || answer === lastAiAnswerRef.current) return
    const visible = chatMessages.filter((m) => m.role !== "system")
    const last = visible[visible.length - 1]
    if (last?.role === "user" && ctx.query && last.content === ctx.query) {
      lastAiAnswerRef.current = answer
      addChatMessage("assistant", answer, "search_ai")
    }
  }, [ctx.aiAnswer, ctx.query, chatMessages, addChatMessage])

  /** Try MAS Brain stream first, then fall back to ai-v2 */
  const tryBrainStream = async (message: string): Promise<string | null> => {
    const history = buildHistoryForApi(chatMessages)
    const contextParts: string[] = []
    if (ctx.query) contextParts.push(`current search: ${ctx.query}`)
    if (ctx.species.length) {
      contextParts.push(
        `species in view: ${ctx.species.slice(0, 3).map((s) => s.scientificName).join(", ")}`
      )
    }
    if (ctx.compounds.length) {
      contextParts.push(
        `compounds in view: ${ctx.compounds.slice(0, 3).map((c) => c.name).join(", ")}`
      )
    }
    const contextBlock =
      contextParts.length > 0
        ? `[Search context: ${contextParts.join("; ")}]\n\n`
        : ""

    const res = await fetch("/api/myca/brain/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: contextBlock + message,
        user_id: "search_user",
        session_id: typeof crypto !== "undefined" ? crypto.randomUUID() : undefined,
        history: history.length ? history : undefined,
      }),
      signal: AbortSignal.timeout(55000),
    })

    if (!res.ok) return null
    const contentType = res.headers.get("content-type")
    if (!contentType?.includes("text/event-stream")) {
      const data = await res.json().catch(() => ({}))
      return data.response || data.message || null
    }

    const reader = res.body?.getReader()
    if (!reader) return null
    const decoder = new TextDecoder()
    let full = ""
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              const json = JSON.parse(line.slice(6))
              if (json.error) return null
              if (json.token) {
                full += json.token
                setStreamingText(full)
              }
            } catch {
              // skip malformed lines
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
    return full.trim() || null
  }

  /** Fallback: unified /api/search/ai (MYCA Consciousness → Brain → OpenAI → local KB) */
  const trySearchAI = async (message: string): Promise<string | null> => {
    const res = await fetch("/api/search/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: message,
        context: {
          species: ctx.species.slice(0, 5).map((s) => s.scientificName),
          compounds: ctx.compounds.slice(0, 5).map((c) => c.name),
          previousSearches: chatMessages
            .filter((m) => m.role === "user")
            .slice(-5)
            .map((m) => m.content),
        },
      }),
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.result?.answer || data.answer || null
  }

  const handleSend = async () => {
    const q = input.trim()
    if (!q) return
    setInput("")
    addChatMessage("user", q)
    setIsAsking(true)
    setStreamingText("")

    try {
      let answer: string | null = await tryBrainStream(q)
      if (!answer) answer = await trySearchAI(q)
      if (answer) {
        addChatMessage("assistant", answer)
      } else {
        addChatMessage(
          "assistant",
          "I couldn't reach MYCA right now. Please check that MAS is running and try again."
        )
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error && err.name === "AbortError"
          ? "Request timed out. Please try again with a simpler question."
          : "An error occurred. Please try again."
      addChatMessage("assistant", errorMsg)
    } finally {
      setIsAsking(false)
      setStreamingText("")
    }
  }

  // Recent searches
  const searchSummaries = chatMessages
    .filter((m) => m.role === "system" && m.content.startsWith('Searched "'))
    .slice(-10).reverse()

  const getSearchQuery = (msg: ChatMessage) => msg.content.match(/Searched "(.+?)"/)?.[1] || ""

  const getSearchIcon = (msg: ChatMessage) => {
    if (msg.content.includes("species")) return <Leaf className="h-3 w-3" />
    if (msg.content.includes("compounds")) return <FlaskConical className="h-3 w-3" />
    if (msg.content.includes("sequences")) return <Dna className="h-3 w-3" />
    if (msg.content.includes("papers")) return <FileText className="h-3 w-3" />
    return <Search className="h-3 w-3" />
  }

  const visibleMessages = chatMessages.filter((m) => m.role !== "system")

  return (
    <div className="flex flex-col h-full">
      {/* Header with consciousness status */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Brain className="h-4 w-4 text-violet-500" />
            {consciousness?.is_conscious && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
          <span className="text-sm font-medium">MYCA</span>
          {consciousness?.is_conscious && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-green-500/10 text-green-500 border-green-500/20">
              conscious
            </Badge>
          )}
          {consciousness?.emotional_state?.dominant_emotion && (
            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
              <Heart className="h-2.5 w-2.5" />
              {consciousness.emotional_state.dominant_emotion}
            </span>
          )}
        </div>
        {chatMessages.length > 0 && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearChat} title="Clear">
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Recent searches */}
      {searchSummaries.length > 0 && (
        <div className="px-3 py-1.5 border-b border-white/5 shrink-0">
          <div className="flex flex-wrap gap-1">
            {searchSummaries.map((msg) => (
              <Button
                key={msg.id}
                variant="outline"
                size="sm"
                className="h-5 px-1.5 text-[9px] gap-0.5 rounded-full"
                onClick={() => setQuery(getSearchQuery(msg))}
                title={msg.content}
              >
                {getSearchIcon(msg)}
                <span className="truncate max-w-[50px]">{getSearchQuery(msg)}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Messages -- chat scrolls internally */}
      <div className="flex-1 overflow-y-auto px-3 py-2" ref={scrollRef}>
        <div className="space-y-2">
          {visibleMessages.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <Sparkles className="h-6 w-6 mx-auto mb-2 opacity-20" />
              <p className="text-[10px]">Ask MYCA anything about fungi</p>
            </div>
          )}
          {visibleMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "text-xs leading-relaxed rounded-xl p-2",
                msg.role === "user"
                  ? "bg-primary/10 ml-6"
                  : "bg-card/60 backdrop-blur-sm border border-white/5 mr-3"
              )}
            >
              {msg.role === "assistant" && (
                <div className="flex items-center gap-1 mb-1 text-[9px] text-violet-500 font-medium">
                  <Sparkles className="h-2 w-2" /> MYCA
                </div>
              )}
              {msg.content}
            </motion.div>
          ))}
          {isAsking && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "text-xs leading-relaxed rounded-xl p-2",
                "bg-card/60 backdrop-blur-sm border border-white/5 mr-3"
              )}
            >
              <div className="flex items-center gap-1 mb-1 text-[9px] text-violet-500 font-medium">
                <Sparkles className="h-2 w-2" /> MYCA
              </div>
              {streamingText ? (
                streamingText
              ) : (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Thinking...
                </span>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="p-2 border-t border-white/5 shrink-0">
        <div className="flex gap-1.5">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask MYCA..."
            className="text-xs h-7 rounded-lg bg-card/50"
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={isAsking}
          />
          <Button
            size="icon"
            variant={ctx.voiceListening ? "default" : "outline"}
            className={cn(
              "h-7 w-7 shrink-0 rounded-lg",
              ctx.voiceListening && "bg-red-500/80 hover:bg-red-500 animate-pulse"
            )}
            onClick={() => ctx.emit("voice:toggle")}
            title={ctx.voiceListening ? "Stop listening" : "Voice input"}
            disabled={isAsking}
          >
            <Mic className="h-3 w-3" />
          </Button>
          <Button size="icon" className="h-7 w-7 shrink-0 rounded-lg" onClick={handleSend} disabled={!input.trim() || isAsking}>
            <Send className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}
