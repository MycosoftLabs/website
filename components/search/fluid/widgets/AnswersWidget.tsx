/**
 * AnswersWidget - Feb 2026
 *
 * Unified Answers widget replacing AI and MYCA chat.
 * Uses MYCA orchestrator (Intention Engine + Brain + consciousness) for all queries.
 * Integrates suggestions and search context. Named "Answers" not MYCA or AI.
 */

"use client"

import { useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useMYCA } from "@/contexts/myca-context"
import { AnswerMessageContent } from "@/components/answers/AnswerMessageContent"
import { MessageCircle, Loader2, Play, Send, Trash2, Search } from "lucide-react"

export interface AnswersSearchContext {
  species?: string[]
  compounds?: string[]
  genetics?: string[]
  research?: string[]
}

export interface AnswersSuggestions {
  widgets: string[]
  queries: string[]
}

interface AnswersWidgetProps {
  isFocused: boolean
  getContextText?: () => string
  searchContext?: AnswersSearchContext
  suggestions?: AnswersSuggestions
  onSelectWidget?: (widgetType: string) => void
  onSelectQuery?: (query: string) => void
  onAddToNotepad?: (item: { type: string; title: string; content: string; source?: string }) => void
  onFocusWidget?: (target: { type: string; id?: string }) => void
  className?: string
}

export function AnswersWidget({
  isFocused,
  getContextText,
  suggestions = { widgets: [], queries: [] },
  onSelectWidget,
  onSelectQuery,
  onAddToNotepad,
  onFocusWidget,
  className,
}: AnswersWidgetProps) {
  const {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    memoryEnabled,
    setMemoryEnabled,
    pendingConfirmationId,
    confirmAction,
    consciousness,
  } = useMYCA()

  const [input, setInput] = useState("")
  const [confirmationInput, setConfirmationInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  const visibleMessages = useMemo(
    () => messages.filter((m) => m.role !== "system"),
    [messages]
  )

  const handleSend = async () => {
    const message = input.trim()
    if (!message) return
    setInput("")
    await sendMessage(message, {
      contextText: getContextText?.(),
      source: "web",
      wantAudio: false,
    })
  }

  const handleConfirm = async (transcript?: string) => {
    const value = transcript || confirmationInput.trim()
    if (!value) return
    setConfirmationInput("")
    await confirmAction(value)
  }

  const playAudio = (audioBase64: string) => {
    try {
      const audio = new Audio(`data:audio/wav;base64,${audioBase64}`)
      audio.play().catch(() => {})
    } catch {
      // Audio playback is best-effort
    }
  }

  const widgets = suggestions.widgets || []
  const queries = suggestions.queries || []
  const hasSuggestions = widgets.length > 0 || queries.length > 0

  return (
    <div className={cn("flex flex-col h-full min-h-0", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-2 sm:px-3 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-md shrink-0">
            <MessageCircle className="h-4 w-4 text-violet-500" />
          </div>
          <span className="font-semibold text-sm">Answers</span>
          {consciousness?.is_conscious && (
            <Badge variant="outline" className="text-[9px] h-4 px-1 bg-green-500/10 text-green-500 border-green-500/20">
              conscious
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={memoryEnabled ? "default" : "outline"}
            size="sm"
            className="h-7 px-2 text-[10px]"
            onClick={() => setMemoryEnabled(!memoryEnabled)}
          >
            Memory
          </Button>
          {visibleMessages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={clearMessages}
              title="Clear chat"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 px-2 sm:px-3 py-2" ref={scrollRef}>
        <div className="space-y-3">
          {visibleMessages.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-6">
              Ask a question. Answers uses MYCA to converse and show related search results.
            </div>
          )}
          {visibleMessages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex flex-col gap-1",
                message.role === "user" ? "items-end" : "items-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[90%] rounded-xl px-3 py-2 text-sm leading-relaxed",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {message.role === "user" ? (
                  message.content
                ) : (
                  <AnswerMessageContent
                    content={message.content || ""}
                    className="text-foreground"
                    onFocusWidget={(widgetType) => onFocusWidget?.({ type: widgetType })}
                  />
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                {message.agent && <span className="uppercase">{message.agent}</span>}
                {message.audio_base64 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => playAudio(message.audio_base64!)}
                    title="Play audio"
                  >
                    <Play className="h-3.5 w-3.5" />
                  </Button>
                )}
                {message.role === "assistant" && onAddToNotepad && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() =>
                      onAddToNotepad({
                        type: "ai",
                        title: "Answer",
                        content: message.content?.slice(0, 200) || "",
                        source: "Answers",
                      })
                    }
                  >
                    Save
                  </Button>
                )}
              </div>
            </div>
          ))}

          {pendingConfirmationId && (
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 space-y-2">
              <div className="text-xs font-semibold text-orange-500">Confirmation required</div>
              <Input
                value={confirmationInput}
                onChange={(event) => setConfirmationInput(event.target.value)}
                placeholder='Type "confirm and proceed" or "cancel"'
                className="h-10 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="h-9 px-3" onClick={() => handleConfirm()}>
                  Confirm
                </Button>
                <Button size="sm" variant="outline" className="h-9 px-3" onClick={() => handleConfirm("cancel")}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Suggestions - integrated from MycaSuggestionsWidget */}
          {isFocused && hasSuggestions && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2 pt-2 border-t border-border/50"
            >
              {widgets.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Suggested widgets</p>
                  <div className="flex flex-wrap gap-1.5">
                    {widgets.slice(0, 6).map((w) => (
                      <Button
                        key={w}
                        variant="secondary"
                        size="sm"
                        className="h-6 px-2 text-[11px] rounded-full"
                        onClick={() => {
                          onSelectWidget?.(w)
                          onFocusWidget?.({ type: w })
                        }}
                      >
                        {w}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {queries.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Suggested queries</p>
                  <div className="space-y-1">
                    {queries.slice(0, 5).map((q) => (
                      <Button
                        key={q}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-2 h-8 text-xs rounded-lg"
                        onClick={() => onSelectQuery?.(q)}
                      >
                        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{q}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border/50 p-2 sm:p-3 shrink-0">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask a question..."
            className="h-10 sm:h-11 text-sm flex-1"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                handleSend()
              }
            }}
            disabled={isLoading}
          />
          <Button
            type="button"
            className="h-10 w-10 sm:h-11 sm:w-11 shrink-0"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            aria-label="Send message"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AnswersWidget
