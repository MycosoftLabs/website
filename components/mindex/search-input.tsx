"use client"

import { useMemo, useState, useEffect } from "react"
import useSWR from "swr"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Mic, MicOff } from "lucide-react"
import { usePersonaPlexContext } from "@/components/voice/PersonaPlexProvider"

interface MINDEXSearchInputProps {
  className?: string
  placeholder?: string
  onSelectTaxonId?: (taxonId: string) => void
}

function fetcher(url: string) {
  return fetch(url).then(async (r) => {
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  })
}

export function MINDEXSearchInput({ className, placeholder, onSelectTaxonId }: MINDEXSearchInputProps) {
  const [query, setQuery] = useState("")
  const enabled = query.trim().length >= 2
  
  // PersonaPlex voice context
  const personaplex = usePersonaPlexContext()
  const { isListening, lastTranscript, startListening, stopListening, isConnected, connectionState } = personaplex || {
    isListening: false,
    lastTranscript: "",
    startListening: () => {},
    stopListening: () => {},
    isConnected: false,
    connectionState: "disconnected",
  }
  
  // Handle voice transcript to populate search
  useEffect(() => {
    if (lastTranscript) {
      setQuery(lastTranscript)
    }
  }, [lastTranscript])

  const url = useMemo(() => {
    if (!enabled) return null
    return `/api/natureos/mindex/search?q=${encodeURIComponent(query)}&limit=8`
  }, [enabled, query])

  const { data, error, isLoading } = useSWR(url, fetcher)
  const taxa = (data?.results?.taxa || []) as Array<{ id: string; canonical_name: string; common_name?: string }>

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder || "Search MINDEX…"}
          className="pr-10"
        />
        {/* Voice Input Button */}
        <button
          type="button"
          onClick={() => isListening ? stopListening() : startListening()}
          disabled={!isConnected && connectionState !== "connecting"}
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-full transition-colors",
            isListening && "bg-red-500/10 text-red-500",
            !isConnected && "opacity-50 cursor-not-allowed",
            isConnected && !isListening && "hover:bg-muted text-muted-foreground"
          )}
          title={isListening ? "Stop listening" : isConnected ? "Voice search" : "Voice offline"}
        >
          {isListening ? (
            <MicOff className="w-4 h-4 animate-pulse" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </button>
      </div>
      {enabled ? (
        <div className="rounded-md border bg-background p-2">
          {isLoading ? (
            <div className="text-xs text-muted-foreground">Searching…</div>
          ) : error ? (
            <div className="text-xs text-muted-foreground">Search unavailable (requires live MINDEX).</div>
          ) : taxa.length ? (
            <div className="space-y-1">
              {taxa.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelectTaxonId?.(t.id)}
                  className="w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
                >
                  <div className="font-medium">{t.canonical_name}</div>
                  {t.common_name ? <div className="text-xs text-muted-foreground">{t.common_name}</div> : null}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">No results.</div>
          )}
        </div>
      ) : null}
    </div>
  )
}

