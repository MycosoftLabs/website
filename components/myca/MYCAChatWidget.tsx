"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useMYCA, type MYCASendOptions } from "@/contexts/myca-context"
import { Brain, Loader2, Mic, MicOff, Play, Send } from "lucide-react"

type MYCALocalCommandResult = {
  handled: boolean
  response: string
  agent?: string
  metadata?: Record<string, unknown>
}

interface MYCAChatWidgetProps {
  active?: boolean
  className?: string
  title?: string
  getContextText?: () => string
  context?: Record<string, unknown> | (() => Record<string, unknown> | undefined)
  showHeader?: boolean
  actor?: string
  source?: MYCASendOptions["source"]
  wantAudio?: boolean
  enableFastIntent?: boolean
  localOnly?: boolean
  placeholder?: string
  emptyMessage?: string
  onLocalCommand?: (message: string) => MYCALocalCommandResult | null | Promise<MYCALocalCommandResult | null>
}

export function MYCAChatWidget({
  active = true,
  className,
  title = "MYCA",
  getContextText,
  context,
  showHeader = true,
  actor = "user",
  source = "web",
  wantAudio = false,
  enableFastIntent = true,
  localOnly = false,
  placeholder = "Ask MYCA...",
  emptyMessage = "Start a conversation with MYCA.",
  onLocalCommand,
}: MYCAChatWidgetProps) {
  const {
    messages,
    isLoading,
    appendLocalExchange,
    sendMessage,
    pendingConfirmationId,
    confirmAction,
    consciousness,
    setIsActive,
    setDraftActivity,
  } = useMYCA()
  const [input, setInput] = useState("")
  const [confirmationInput, setConfirmationInput] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  const visibleMessages = useMemo(
    () => messages.filter((m) => m.role !== "system"),
    [messages]
  )

  // Apr 22, 2026 — Morgan: "when i search or type in myca box on right
  // panel it took 20 seconds to say this and did nothign that needs to
  // be instant and move the map and show filters". Intent-first fast lane:
  // parse "show me / fly to / go to / zoom to / take me to <place>" BEFORE
  // waiting on the LLM and dispatch a map event immediately. LLM response
  // still produces the chat text; the map moves first.
  const tryFastIntent = useCallback(async (message: string): Promise<boolean> => {
    const m = message.match(
      /^\s*(?:show|fly|go|take|zoom|navigate|send|move)(?:\s+me|\s+us)?\s+(?:to|into|on|at|over)?\s+(.+?)\s*$/i,
    )
    const place = m?.[1]?.trim()
    if (!place || place.length < 2) return false
    try {
      // Best-effort geocode via /api/search/location if present,
      // Nominatim fallback. Returns lat/lng/zoom for map.flyTo.
      let res: Response | null = null
      try {
        res = await fetch(`/api/search/location?q=${encodeURIComponent(place)}`, { signal: AbortSignal.timeout(4_000) })
      } catch { res = null }
      let lat: number | null = null
      let lng: number | null = null
      let name = place
      if (res && res.ok) {
        const j = await res.json()
        const hit = Array.isArray(j?.results) ? j.results[0] : (j?.lat && j?.lng ? j : null)
        if (hit) {
          lat = Number(hit.lat ?? hit.latitude ?? hit.geometry?.coordinates?.[1])
          lng = Number(hit.lng ?? hit.lon ?? hit.longitude ?? hit.geometry?.coordinates?.[0])
          name = hit.name ?? hit.display_name ?? place
        }
      }
      if (lat == null || lng == null) {
        // Nominatim public fallback
        const nr = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(place)}`,
          { headers: { "Accept": "application/json", "User-Agent": "Mycosoft-CREP/1.0" }, signal: AbortSignal.timeout(4_000) },
        )
        if (nr.ok) {
          const rows = await nr.json()
          if (Array.isArray(rows) && rows[0]) {
            lat = Number(rows[0].lat)
            lng = Number(rows[0].lon)
            name = rows[0].display_name ?? place
          }
        }
      }
      if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return false
      // Fire the map-control event — CREP overlay listens for this and
      // flies the camera. Also update `myca-search-action` so the fungal
      // handler can pick it up if the place happens to match an observation.
      window.dispatchEvent(
        new CustomEvent("crep:flyto", {
          detail: { lat, lng, zoom: 11, name, source: "myca-fast-intent" },
        }),
      )
      window.dispatchEvent(
        new CustomEvent("myca-search-action", {
          detail: { type: "flyto", query: place, lat, lng, name },
        }),
      )
      return true
    } catch {
      return false
    }
  }, [])

  const handleSend = useCallback(async (overrideMessage?: string) => {
    if (isLoading) return
    const message = (overrideMessage || inputRef.current?.value || input).trim()
    if (!message) return
    setInput("")
    if (inputRef.current) inputRef.current.value = ""
    setDraftActivity(0)
    if (onLocalCommand) {
      try {
        const local = await onLocalCommand(message)
        if (local?.handled && local.response) {
          appendLocalExchange(message, local.response, {
            agent: local.agent,
            metadata: local.metadata,
          })
          return
        }
      } catch (error) {
        console.error("MYCA local command error:", error)
      }
    }
    if (localOnly) {
      appendLocalExchange(
        message,
        "I am in Earth Simulator map mode. Ask me to fly to a place, show an event layer, or focus a visible map asset.",
        {
          agent: "myca-earth-simulator",
          metadata: {
            command: "earth-simulator-map-control",
            routed_to: "local-only-fallback",
            original_text: message,
          },
        },
      )
      return
    }
    // Fire-and-forget intent parse — don't block the LLM send.
    if (enableFastIntent) void tryFastIntent(message)
    const resolvedContext =
      typeof context === "function" ? context() : context
    await sendMessage(message, {
      contextText: getContextText?.(),
      context: resolvedContext,
      actor,
      source,
      wantAudio,
    })
  }, [
    actor,
    appendLocalExchange,
    context,
    enableFastIntent,
    getContextText,
    input,
    isLoading,
    localOnly,
    onLocalCommand,
    sendMessage,
    setDraftActivity,
    source,
    tryFastIntent,
    wantAudio,
  ])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void handleSend()
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

  useEffect(() => {
    if (typeof window === "undefined") return
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    setSpeechSupported(Boolean(SpeechRecognition))
  }, [])

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop?.()
    } catch {
      // Speech recognition stop is best-effort.
    }
    recognitionRef.current = null
    setIsListening(false)
  }, [])

  const startListening = useCallback(() => {
    if (typeof window === "undefined" || isLoading) return
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return
    stopListening()
    const recognition = new SpeechRecognition()
    let finalTranscript = ""
    recognitionRef.current = recognition
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = "en-US"
    recognition.onstart = () => setIsListening(true)
    recognition.onresult = (event: any) => {
      let interimTranscript = ""
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = String(event.results[i]?.[0]?.transcript || "").trim()
        if (!transcript) continue
        if (event.results[i].isFinal) finalTranscript = `${finalTranscript} ${transcript}`.trim()
        else interimTranscript = `${interimTranscript} ${transcript}`.trim()
      }
      const next = (finalTranscript || interimTranscript).trim()
      setInput(next)
      if (inputRef.current) inputRef.current.value = next
      setDraftActivity(next.length)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => {
      recognitionRef.current = null
      setIsListening(false)
      const spoken = finalTranscript.trim()
      if (spoken) void handleSend(spoken)
    }
    try {
      recognition.start()
    } catch {
      setIsListening(false)
    }
  }, [handleSend, isLoading, setDraftActivity, stopListening])

  useEffect(() => {
    return () => stopListening()
  }, [stopListening])

  useEffect(() => {
    setIsActive(active)
    if (!active) setDraftActivity(0)
    return () => {
      setIsActive(false)
      setDraftActivity(0)
    }
  }, [active, setDraftActivity, setIsActive])

  // Auto-scroll within the widget only (never scroll the page)
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [visibleMessages.length, isLoading])

  return (
    <Card className={cn("myca-chat-shell flex h-full min-h-[260px] flex-col bg-card/80 backdrop-blur-sm", className)}>
      {showHeader && (
        <div className="myca-chat-header flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Brain className="h-4 w-4 text-violet-500" />
              {consciousness?.is_conscious && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              )}
            </div>
            <span className="text-sm font-semibold">{title}</span>
            {consciousness?.is_conscious && (
              <Badge variant="outline" className="text-xs h-4 px-1 bg-green-500/10 text-green-500 border-green-500/20">
                conscious
              </Badge>
            )}
          </div>
          <div className="h-7" aria-hidden="true" />
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-2"
      >
        <div className="space-y-3">
          {visibleMessages.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">
              {emptyMessage}
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
                  "myca-message-bubble max-w-[85%] rounded-xl px-4 py-2.5 text-base leading-relaxed",
                  message.role === "user"
                    ? "myca-message-user bg-primary text-primary-foreground"
                    : "myca-message-myca bg-muted text-foreground"
                )}
              >
                {message.content}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                {message.agent && (
                  <span className="uppercase">
                    {message.agent === "myca-local-fallback"
                      ? "MYCA"
                      : message.agent}
                  </span>
                )}
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
            <div className="myca-confirmation-panel rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 space-y-2">
              <div className="text-xs font-semibold text-orange-500">Confirmation required</div>
              <Input
                value={confirmationInput}
                onChange={(event) => setConfirmationInput(event.target.value)}
                placeholder='Type "confirm and proceed" or "cancel"'
                className="myca-chat-input h-10 text-base"
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
      </div>

      <form className="myca-chat-input-bar border-t border-border p-3" onSubmit={handleSubmit}>
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(event) => {
              const value = event.target.value
              setInput(value)
              setDraftActivity(value.trim().length)
            }}
            placeholder={placeholder}
            className="myca-chat-input h-11 text-base"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                void handleSend()
              }
            }}
            onKeyUp={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                void handleSend()
              }
            }}
          />
          <Button
            type="button"
            variant={isListening ? "secondary" : "outline"}
            className="h-11 w-11"
            onClick={isListening ? stopListening : startListening}
            disabled={isLoading || !speechSupported}
            aria-label={isListening ? "Stop voice input" : "Start voice input"}
            title={speechSupported ? (isListening ? "Stop voice input" : "Speak a MYCA map command") : "Voice input is not available in this browser"}
          >
            {isListening ? <MicOff className="h-4 w-4 text-red-400" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button
            type="submit"
            className="h-11 w-11"
            onPointerDown={(event) => {
              event.preventDefault()
              if (!isLoading) void handleSend()
            }}
            disabled={isLoading}
            aria-label="Send message"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </Card>
  )
}
