"use client"

import { useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useMYCA } from "@/contexts/myca-context"
import { Brain, Loader2, Play, Send, Trash2 } from "lucide-react"

interface MYCAChatWidgetProps {
  className?: string
  title?: string
  getContextText?: () => string
  showHeader?: boolean
}

export function MYCAChatWidget({
  className,
  title = "MYCA",
  getContextText,
  showHeader = true,
}: MYCAChatWidgetProps) {
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

  return (
    <Card className={cn("flex h-full flex-col bg-card/80 backdrop-blur-sm", className)}>
      {showHeader && (
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Brain className="h-4 w-4 text-violet-500" />
              {consciousness?.is_conscious && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              )}
            </div>
            <span className="text-sm font-semibold">{title}</span>
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
      )}

      <ScrollArea className="flex-1 px-3 py-2" ref={scrollRef}>
        <div className="space-y-3">
          {visibleMessages.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-8">
              Start a conversation with MYCA.
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
                  "max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {message.content}
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
                className="h-10 text-base"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="h-9 px-3"
                  onClick={() => handleConfirm()}
                >
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 px-3"
                  onClick={() => handleConfirm("cancel")}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask MYCA..."
            className="h-11 text-base"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                handleSend()
              }
            }}
          />
          <Button
            type="button"
            className="h-11 w-11"
            onClick={handleSend}
            disabled={isLoading}
            aria-label="Send message"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </Card>
  )
}
