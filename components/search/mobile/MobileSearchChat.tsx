"use client"

/**
 * MobileSearchChat - Feb 2026
 * 
 * ChatGPT-like conversational search interface for mobile.
 * Full-height container with scrollable message thread and fixed bottom input.
 * Integrates with MYCA for AI responses and displays rich data cards inline.
 */

import { useEffect, useRef, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useMYCA } from "@/contexts/myca-context"
import { useSearchContext } from "../SearchContextProvider"
import { ChatMessage } from "./ChatMessage"
import { ChatInput } from "./ChatInput"
import { MobileNotepad } from "./MobileNotepad"
import { Brain, StickyNote, Sparkles, ChevronDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface MobileSearchChatProps {
  initialQuery?: string
}

export interface DataCard {
  type: "species" | "chemistry" | "genetics" | "location" | "taxonomy" | "images" | "research" | "news"
  data: Record<string, unknown>
}

export interface MobileChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: string
  dataCards?: DataCard[]
  suggestions?: string[]
  isStreaming?: boolean
}

export function MobileSearchChat({ initialQuery = "" }: MobileSearchChatProps) {
  const { messages, isLoading, sendMessage, consciousness, memoryEnabled, setMemoryEnabled } = useMYCA()
  const { notepadItems, addNotepadItem } = useSearchContext()
  
  const [localMessages, setLocalMessages] = useState<MobileChatMessage[]>([])
  const [notepadOpen, setNotepadOpen] = useState(false)
  const [showScrollDown, setShowScrollDown] = useState(false)
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Sync MYCA messages to local state with data card enrichment
  useEffect(() => {
    const visibleMessages = messages.filter(m => m.role !== "system")
    const converted: MobileChatMessage[] = visibleMessages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
      dataCards: extractDataCards(m.content, m.nlqData),
      suggestions: extractSuggestions(m.content),
    }))
    setLocalMessages(converted)
  }, [messages])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [localMessages])

  // Track scroll position for "scroll to bottom" button
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    setShowScrollDown(!isNearBottom && localMessages.length > 3)
  }, [localMessages.length])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Build context for MYCA from initial query and recent conversation
  const getContextText = useCallback(() => {
    const parts: string[] = []
    if (initialQuery?.trim()) parts.push(`Current search query: ${initialQuery}`)
    const recentUserMessages = messages
      .filter((m) => m.role === "user")
      .slice(-2)
      .map((m) => m.content)
    if (recentUserMessages.length) {
      parts.push(`Recent user messages: ${recentUserMessages.join("; ")}`)
    }
    return parts.length ? parts.join(". ") : undefined
  }, [initialQuery, messages])

  // Handle sending messages
  const handleSend = async (text: string) => {
    if (!text.trim()) return
    await sendMessage(text, { source: "web", contextText: getContextText() })
  }

  // Handle voice input
  const handleVoice = async (transcript: string) => {
    if (!transcript.trim()) return
    await sendMessage(transcript, { source: "web-speech", contextText: getContextText() })
  }

  // Save message to notepad
  const handleSaveToNotes = (message: MobileChatMessage, card?: DataCard) => {
    if (card) {
      addNotepadItem({
        type: card.type as any,
        title: (card.data.name || card.data.title || card.type) as string,
        content: JSON.stringify(card.data, null, 2).slice(0, 200),
        source: "MYCA Chat",
      })
    } else {
      addNotepadItem({
        type: "ai",
        title: message.content.slice(0, 50) + "...",
        content: message.content,
        source: "MYCA Chat",
      })
    }
  }

  // Handle suggestion chip click
  const handleSuggestion = (suggestion: string) => {
    handleSend(suggestion)
  }

  // Handle initial query
  useEffect(() => {
    if (initialQuery && localMessages.length === 0) {
      handleSend(initialQuery)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery])

  return (
    <div className="flex flex-col min-h-dvh bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Brain className="h-5 w-5 text-violet-500" />
            {consciousness?.is_conscious && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            )}
          </div>
          <span className="font-semibold">Answers</span>
          {consciousness?.is_conscious && (
            <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-green-500/10 text-green-500 border-green-500/20">
              conscious
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={memoryEnabled ? "default" : "outline"}
            size="sm"
            className="h-7 px-2 text-[10px]"
            onClick={() => setMemoryEnabled(!memoryEnabled)}
          >
            Memory
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 relative"
            onClick={() => setNotepadOpen(true)}
          >
            <StickyNote className="h-4 w-4 text-yellow-500" />
            {notepadItems.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-yellow-500 text-[10px] text-black flex items-center justify-center font-bold">
                {notepadItems.length > 9 ? "9+" : notepadItems.length}
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* Message Thread */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        onScroll={handleScroll}
      >
        {/* Welcome message if no messages */}
        {localMessages.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-violet-500/10 mb-4">
              <Sparkles className="h-8 w-8 text-violet-500" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Answers</h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Search species, weather, flights, vessels, or ask questions about biodiversity and the world.
            </p>
            
          </motion.div>
        )}

        {/* Messages */}
        <AnimatePresence mode="popLayout">
          {localMessages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onSaveToNotes={handleSaveToNotes}
              onSuggestionClick={handleSuggestion}
            />
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-start gap-3"
          >
            <div className="h-8 w-8 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
              <Brain className="h-4 w-4 text-violet-500" />
            </div>
            <div className="flex items-center gap-1 py-2">
              <span className="h-2 w-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-2 w-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-2 w-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollDown && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={scrollToBottom}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 h-8 px-3 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center gap-1 text-xs"
          >
            <ChevronDown className="h-3 w-3" />
            New messages
          </motion.button>
        )}
      </AnimatePresence>

      {/* Input Bar */}
      <ChatInput
        onSend={handleSend}
        onVoice={handleVoice}
        isLoading={isLoading}
      />

      {/* Notepad Sheet */}
      <MobileNotepad
        open={notepadOpen}
        onOpenChange={setNotepadOpen}
      />
    </div>
  )
}

// Extract data cards from message content and NLQ data
function extractDataCards(content: string, nlqData?: Array<{ id: string; type: string; title: string; subtitle?: string }>): DataCard[] {
  const cards: DataCard[] = []
  
  if (nlqData) {
    for (const item of nlqData) {
      const type = mapNlqTypeToCardType(item.type)
      if (type) {
        cards.push({
          type,
          data: {
            id: item.id,
            name: item.title,
            subtitle: item.subtitle,
          },
        })
      }
    }
  }
  
  return cards
}

function mapNlqTypeToCardType(nlqType: string): DataCard["type"] | null {
  const mapping: Record<string, DataCard["type"]> = {
    species: "species",
    compound: "chemistry",
    genetics: "genetics",
    location: "location",
    research: "research",
    news: "news",
    paper: "research",
  }
  return mapping[nlqType.toLowerCase()] || null
}

// Extract suggestions from message content (look for patterns like "You might also ask:")
function extractSuggestions(content: any): string[] {
  const suggestions: string[] = []
  
  if (typeof content !== 'string') return suggestions
  
  const suggestionPatterns = [
    /you (?:might|could|can) (?:also )?(?:ask|try|search)[:\s]+(.+?)(?:\n|$)/gi,
    /related (?:questions|searches)[:\s]+(.+?)(?:\n|$)/gi,
  ]
  
  for (const pattern of suggestionPatterns) {
    const matches = content.matchAll(pattern)
    for (const match of matches) {
      const suggestionText = match[1]
      const items = suggestionText.split(/[,\n•\-]/).map(s => s.trim()).filter(Boolean)
      suggestions.push(...items.slice(0, 3))
    }
  }
  
  return suggestions.slice(0, 4)
}
