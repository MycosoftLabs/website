"use client"

/**
 * ChatMessage - Feb 2026
 * 
 * Individual message bubble for mobile chat interface.
 * Supports markdown rendering and embedded data cards.
 */

import { memo, useState } from "react"
import { motion } from "framer-motion"
import { Brain, User, Bookmark, Copy, Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { DataCardRenderer } from "./DataCardRenderer"
import type { MobileChatMessage, DataCard } from "./MobileSearchChat"

interface ChatMessageProps {
  message: MobileChatMessage
  onSaveToNotes?: (message: MobileChatMessage, card?: DataCard) => void
  onSuggestionClick?: (suggestion: string) => void
}

export const ChatMessage = memo(function ChatMessage({
  message,
  onSaveToNotes,
  onSuggestionClick,
}: ChatMessageProps) {
  const isUser = message.role === "user"
  const isSystem = message.role === "system"
  const [copied, setCopied] = useState(false)
  const [cardsExpanded, setCardsExpanded] = useState(true)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // System messages are compact
  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center text-xs text-muted-foreground py-1"
      >
        {message.content}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div className={cn(
        "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
        isUser ? "bg-primary/10" : "bg-violet-500/10"
      )}>
        {isUser ? (
          <User className="h-4 w-4 text-primary" />
        ) : (
          <Brain className="h-4 w-4 text-violet-500" />
        )}
      </div>

      {/* Message content */}
      <div className={cn(
        "flex-1 min-w-0 space-y-2",
        isUser ? "items-end" : "items-start"
      )}>
        {/* Text bubble */}
        <div className={cn(
          "rounded-2xl px-4 py-3 max-w-[85%]",
          isUser 
            ? "bg-primary text-primary-foreground ml-auto rounded-tr-sm" 
            : "bg-muted rounded-tl-sm"
        )}>
          <MessageContent content={message.content} isUser={isUser} />
        </div>

        {/* Data cards */}
        {message.dataCards && message.dataCards.length > 0 && (
          <div className="space-y-2 w-full">
            <button
              onClick={() => setCardsExpanded(!cardsExpanded)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className={cn(
                "h-3 w-3 transition-transform",
                !cardsExpanded && "-rotate-90"
              )} />
              {message.dataCards.length} {message.dataCards.length === 1 ? "result" : "results"}
            </button>
            
            {cardsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="space-y-2"
              >
                {message.dataCards.map((card, idx) => (
                  <DataCardRenderer
                    key={`${card.type}-${idx}`}
                    card={card}
                    onSave={() => onSaveToNotes?.(message, card)}
                  />
                ))}
              </motion.div>
            )}
          </div>
        )}

        {/* Suggestions */}
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {message.suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => onSuggestionClick?.(suggestion)}
                className="px-3 py-1 text-xs rounded-full border bg-card hover:bg-muted transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Message actions */}
        {!isUser && (
          <div className="flex items-center gap-1 pt-1">
            <span className="text-[10px] text-muted-foreground">
              {formatTime(message.timestamp)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onSaveToNotes?.(message)}
            >
              <Bookmark className="h-3 w-3" />
            </Button>
          </div>
        )}

        {isUser && (
          <span className="text-[10px] text-muted-foreground ml-auto">
            {formatTime(message.timestamp)}
          </span>
        )}
      </div>
    </motion.div>
  )
})

function MessageContent({ content, isUser }: { content: string; isUser: boolean }) {
  // Simple markdown rendering for mobile
  const lines = content.split("\n")
  
  return (
    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
      {lines.map((line, idx) => {
        // Headers
        if (line.startsWith("### ")) {
          return <h3 key={idx} className="font-semibold text-base mt-2 mb-1">{line.slice(4)}</h3>
        }
        if (line.startsWith("## ")) {
          return <h2 key={idx} className="font-semibold text-lg mt-3 mb-1">{line.slice(3)}</h2>
        }
        if (line.startsWith("# ")) {
          return <h1 key={idx} className="font-bold text-xl mt-3 mb-2">{line.slice(2)}</h1>
        }
        
        // Bullet points
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return (
            <div key={idx} className="flex gap-2">
              <span className="shrink-0">•</span>
              <span>{formatInlineMarkdown(line.slice(2))}</span>
            </div>
          )
        }
        
        // Numbered lists
        const numberedMatch = line.match(/^(\d+)\.\s/)
        if (numberedMatch) {
          return (
            <div key={idx} className="flex gap-2">
              <span className="shrink-0 text-muted-foreground">{numberedMatch[1]}.</span>
              <span>{formatInlineMarkdown(line.slice(numberedMatch[0].length))}</span>
            </div>
          )
        }
        
        // Code blocks (inline)
        if (line.startsWith("```")) {
          return null // Skip code fence markers
        }
        
        // Regular line
        if (line.trim()) {
          return <p key={idx}>{formatInlineMarkdown(line)}</p>
        }
        
        // Empty line
        return <br key={idx} />
      })}
    </div>
  )
}

function formatInlineMarkdown(text: string): React.ReactNode {
  // Handle bold **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>
    }
    // Handle inline code `code`
    const codeParts = part.split(/(`[^`]+`)/g)
    return codeParts.map((codePart, codeIdx) => {
      if (codePart.startsWith("`") && codePart.endsWith("`")) {
        return (
          <code key={`${idx}-${codeIdx}`} className="px-1 py-0.5 rounded bg-muted text-xs font-mono">
            {codePart.slice(1, -1)}
          </code>
        )
      }
      return codePart
    })
  })
}

function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  } catch {
    return ""
  }
}
