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

/** Build a useful response from current search context when AI API fails */
function buildContextResponse(
  query: string,
  species: any[],
  compounds: any[],
  research: any[]
): string {
  const parts: string[] = []

  if (species.length > 0) {
    const sp = species[0]
    const name = sp.commonName || sp.scientificName || "Unknown"
    const sci = sp.scientificName || ""
    parts.push(`Based on the search for "${query}", the top result is **${name}**${sci ? ` (${sci})` : ""}.`)
    if (sp.taxonomy?.family) parts.push(`It belongs to the family ${sp.taxonomy.family}.`)
    if (sp.description) parts.push(sp.description.slice(0, 250) + (sp.description.length > 250 ? "..." : ""))
    if (sp.observationCount > 0) parts.push(`There are ${sp.observationCount.toLocaleString()} observations recorded.`)
  }

  if (compounds.length > 0) {
    const names = compounds.slice(0, 3).map((c: any) => c.name).join(", ")
    parts.push(`Related compounds include: ${names}.`)
  }

  if (research.length > 0) {
    parts.push(`Found ${research.length} related research paper${research.length > 1 ? "s" : ""}.`)
  }

  if (parts.length === 0) {
    return `I found results for "${query}" but need more data to give a detailed answer. Try clicking on a species or compound widget for specifics.`
  }

  return parts.join(" ")
}

export function MYCAChatPanel() {
  const ctx = useSearchContext()
  const { chatMessages, addChatMessage, clearChat, setQuery, species, compounds, research } = ctx
  const [input, setInput] = useState("")
  const [isAsking, setIsAsking] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const consciousness = useMYCAConsciousness()

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [chatMessages])

  /** Try MYCA consciousness chat first, then fall back to search AI */
  const askMYCA = async (message: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/myca/consciousness/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
        signal: AbortSignal.timeout(35000), // 35s timeout (server has 30s)
      })
      if (res.ok) {
        const data = await res.json()
        return data.message || data.response || null
      }
    } catch {
      // Silent fail, will try search API
    }
    return null
  }

  const handleSend = async () => {
    const q = input.trim()
    if (!q) return
    setInput("")
    addChatMessage("user", q)
    setIsAsking(true)

    try {
      // Step 1: Try MYCA consciousness chat first
      const mycaResponse = await askMYCA(q)
      if (mycaResponse) {
        addChatMessage("assistant", mycaResponse)
        return
      }

      // Step 2: Fall back to search AI for search-related queries
      const res = await fetch(`/api/search/ai?q=${encodeURIComponent(q)}`, {
        signal: AbortSignal.timeout(15000),
      })
      if (res.ok) {
        const data = await res.json()
        const answer = data.result?.answer || ""
        // Check if it's a real answer or a fallback
        if (answer && !answer.includes("No AI results") && data.result?.source !== "fallback") {
          addChatMessage("assistant", answer)
        } else {
          // Build contextual response from search results
          const contextResponse = buildContextResponse(q, species, compounds, research)
          addChatMessage("assistant", contextResponse)
        }
      } else {
        const contextResponse = buildContextResponse(q, species, compounds, research)
        addChatMessage("assistant", contextResponse)
      }
    } catch {
      const contextResponse = buildContextResponse(q, species, compounds, research)
      addChatMessage("assistant", contextResponse || "Request timed out. Please try again.")
    } finally {
      setIsAsking(false)
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
            <div className="flex items-center gap-2 text-xs text-muted-foreground pl-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Thinking...
            </div>
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
          <Button size="icon" className="h-7 w-7 shrink-0 rounded-lg" onClick={handleSend} disabled={!input.trim() || isAsking}>
            <Send className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}
