"use client"

/**
 * HeroSearch - Revolutionary Homepage Search Component
 * Created: February 5, 2026
 *
 * Features:
 * - Glass morphism design with animated gradient borders
 * - Working voice search via PersonaPlex
 * - AI-powered suggestions
 * - Smooth 60fps animations
 * - Session memory integration
 */

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion"
import { useTheme } from "next-themes"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { usePersonaPlexContext } from "@/components/voice/PersonaPlexProvider"
import { useTypingPlaceholder } from "@/hooks/use-typing-placeholder"
import { useDebounce } from "@/hooks/use-debounce"
import { getRotatedSuggestions, DEFAULT_TRY_SUGGESTIONS } from "@/lib/search/world-view-suggestions"
import { AutoplayVideo } from "@/components/ui/autoplay-video"
import { homeHeroVideoSources } from "@/lib/asset-video-sources"
import {
  Search,
  Mic,
  MicOff,
  ArrowRight,
  Loader2,
  X,
  Command,
  Brain,
} from "lucide-react"

/**
 * Homepage hero video only. Keep this on the canonical homepage media path so the
 * hero behaves like the rest of the site's background videos.
 */
const HOME_HERO_SOURCES = homeHeroVideoSources()

interface HeroSuggestion {
  id: string
  title: string
  type: string
  scientificName?: string
  url: string
}

export function HeroSearch() {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [query, setQuery] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [suggestions, setSuggestions] = useState<HeroSuggestion[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [trySuggestions, setTrySuggestions] = useState<{ term: string; phoneVisible?: boolean }[]>(DEFAULT_TRY_SUGGESTIONS)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebounce(query, 250)
  
  // PersonaPlex voice context (gracefully handles null)
  const personaplex = usePersonaPlexContext()
  const isConnected = personaplex?.isConnected ?? false
  const lastTranscript = personaplex?.lastTranscript ?? ""
  const connectionState = personaplex?.connectionState ?? "disconnected"

  // Web Speech API fallback for STT when PersonaPlex is unavailable
  const [webSpeechListening, setWebSpeechListening] = useState(false)
  const [webSpeechTranscript, setWebSpeechTranscript] = useState("")
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Unified listening state: PersonaPlex OR Web Speech API
  const isListening = (personaplex?.isListening ?? false) || webSpeechListening
  /** Must not depend on `window` during SSR — same value on server and first client paint to avoid hydration mismatch. */
  const [hasWebSpeech, setHasWebSpeech] = useState(false)
  useEffect(() => {
    setHasWebSpeech(
      typeof window !== "undefined" &&
        ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    )
  }, [])
  
  // Animated typing placeholder
  const { placeholder: animatedPlaceholder, pause, resume } = useTypingPlaceholder({
    enabled: !query && !isFocused, // Only animate when input is empty and not focused
  })
  
  // Mouse position for gradient effect
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  
  // Gradient position transforms
  const gradientX = useTransform(mouseX, [0, 1], ["0%", "100%"])
  const gradientY = useTransform(mouseY, [0, 1], ["0%", "100%"])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Rotate Try: suggestions on mount and every 30s for variety
  useEffect(() => {
    const refresh = () => setTrySuggestions(getRotatedSuggestions(6, 3))
    refresh()
    const id = setInterval(refresh, 30000)
    return () => clearInterval(id)
  }, [])

  // Handle mouse move for gradient effect
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    mouseX.set(x)
    mouseY.set(y)
  }, [mouseX, mouseY])

  // Handle voice transcript - auto-fill search from PersonaPlex
  useEffect(() => {
    if (lastTranscript && (personaplex?.isListening ?? false)) {
      setQuery(lastTranscript)
    }
  }, [lastTranscript, personaplex?.isListening])

  // Handle Web Speech API transcript
  useEffect(() => {
    if (webSpeechTranscript && webSpeechListening) {
      setQuery(webSpeechTranscript)
    }
  }, [webSpeechTranscript, webSpeechListening])

  // Initialize Web Speech API recognition
  useEffect(() => {
    if (typeof window === "undefined") return
    const SpeechRecognitionAPI = (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition
    if (!SpeechRecognitionAPI) return

    const recognition = new (SpeechRecognitionAPI as new () => SpeechRecognition)()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = "en-US"

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ""
      let interimTranscript = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interimTranscript += result[0].transcript
        }
      }
      const transcript = finalTranscript || interimTranscript
      if (transcript) {
        setWebSpeechTranscript(transcript)
        setQuery(transcript)
      }
      // Auto-submit on final result
      if (finalTranscript) {
        setWebSpeechListening(false)
        // Auto-navigate to search after a brief pause
        setTimeout(() => {
          if (finalTranscript.trim()) {
            router.push(`/search?q=${encodeURIComponent(finalTranscript.trim())}`)
          }
        }, 500)
      }
    }

    recognition.onend = () => {
      setWebSpeechListening(false)
    }

    recognition.onerror = () => {
      setWebSpeechListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      recognition.abort()
    }
  }, [router])

  // Click outside handler - use `click` instead of `mousedown` so first-click
  // navigation on page links is not interrupted by an early state update.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false)
      }
    }
    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [])

  useEffect(() => {
    const safeQuery = debouncedQuery.trim()
    if (safeQuery.length < 2) {
      setSuggestions([])
      setSuggestionsLoading(false)
      return
    }

    const controller = new AbortController()
    setSuggestionsLoading(true)

    fetch(`/api/search/suggestions?q=${encodeURIComponent(safeQuery)}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) return { suggestions: [] }
        return response.json()
      })
      .then((data) => {
        setSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : [])
      })
      .catch(() => {
        setSuggestions([])
      })
      .finally(() => {
        setSuggestionsLoading(false)
      })

    return () => controller.abort()
  }, [debouncedQuery])

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const submittedQuery = String(formData.get("q") || query).trim()
    if (submittedQuery) {
      setIsSearching(true)
      window.location.assign(`/search?q=${encodeURIComponent(submittedQuery)}`)
    }
  }

  const navigateToSearch = (rawQuery: string) => {
    const submittedQuery = rawQuery.trim()
    if (!submittedQuery) return
    setIsSearching(true)
    window.location.assign(`/search?q=${encodeURIComponent(submittedQuery)}`)
  }

  const toggleVoice = () => {
    // If currently listening (either source), stop
    if (isListening) {
      if (personaplex?.isListening) personaplex.stopListening()
      if (webSpeechListening && recognitionRef.current) {
        recognitionRef.current.abort()
        setWebSpeechListening(false)
      }
      return
    }

    // Try PersonaPlex first
    if (personaplex && isConnected) {
      personaplex.startListening()
      return
    }

    // Fall back to Web Speech API
    if (hasWebSpeech && recognitionRef.current) {
      try {
        recognitionRef.current.start()
        setWebSpeechListening(true)
        setWebSpeechTranscript("")
      } catch {
        // Recognition may already be running
        setWebSpeechListening(false)
      }
      return
    }
  }

  const logoSrc = mounted && (resolvedTheme ?? "dark") === "dark"
    ? "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Mycosoft%20Logo%20(1)-lArPx4fwtqahyHVlnRLWWSfqWLIJpv.png"
    : "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/MycosoftLogo2%20(1)-5jx3SObDwKV9c6QmbxJ2NWopjhfLmZ.png"

  return (
    <section className="relative min-h-[100dvh] pt-4 pb-8 sm:pt-6 sm:pb-12 md:pt-8 md:pb-24 px-3 sm:px-4 md:px-6 flex flex-col items-center justify-center gap-4 sm:gap-6 md:gap-8">
      {/* Full-screen video — pointer-events-none so header/footer/page links receive the first click (not blocked by this layer). */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <AutoplayVideo
          src={HOME_HERO_SOURCES[0]}
          sources={HOME_HERO_SOURCES}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "brightness(0.95) saturate(1.05)" }}
          encodeSrc
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/10 via-background/5 to-background/10"
          aria-hidden
        />
      </div>

      <div 
        ref={containerRef}
        className="w-full max-w-3xl relative z-10 pointer-events-auto"
        onMouseMove={handleMouseMove}
      >
        {/* Hero Container with Glass Morphism — no video inside; sits on top of page video */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={cn(
            "relative rounded-3xl overflow-hidden",
            "backdrop-blur-xl bg-background/20 dark:bg-background/30",
            isFocused && "ring-2 ring-primary/50"
          )}
        >
          {/* Animated Gradient Border */}
          <div className="absolute inset-0 rounded-3xl p-[2px] bg-gradient-to-r from-primary/40 via-purple-500/40 to-cyan-500/40 animate-gradient-x" />
          <div className="absolute inset-[2px] rounded-[22px] bg-background/10 dark:bg-background/20" />

          {/* Content */}
          <div className="relative z-10 px-3 py-6 sm:px-6 sm:py-10 md:px-12 md:py-16">
            {/* Logo & Title */}
            <div className="flex flex-col items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              <motion.div 
                className="flex items-center gap-2 sm:gap-3"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-20 md:h-20 relative shrink-0">
                  <Image
                    src={logoSrc}
                    alt="Mycosoft Logo"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold bg-gradient-to-r from-foreground via-foreground/90 to-foreground/80 bg-clip-text text-transparent">
                  Mycosoft
                </h1>
              </motion.div>
              
              <motion.p 
                className="text-base sm:text-lg md:text-xl text-foreground/80 text-center flex items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                <span>The AI That Sees the World — All of It</span>
              </motion.p>
              <motion.p
                className="text-xs sm:text-sm italic text-foreground/60 text-center max-w-2xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.5 }}
              >
                All species, all signals, all machines, all environments
                <br />
                — indexed and searchable in real time
              </motion.p>
            </div>

            {/* Search Bar */}
            <motion.form
              onSubmit={handleSearch}
              action="/search"
              method="GET"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="relative"
            >
              <div 
                className={cn(
                  "relative flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-4 md:py-5 rounded-xl sm:rounded-2xl",
                  "bg-background/60 dark:bg-white/10 backdrop-blur-md border border-border dark:border-white/20",
                  "shadow-2xl shadow-black/10 dark:shadow-black/20",
                  "transition-all duration-300",
                  isFocused && "bg-background/80 dark:bg-white/15 border-primary/30 dark:border-white/30 shadow-primary/20"
                )}
              >
                {/* Search Icon */}
                <Search className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-muted-foreground shrink-0" />
                
                {/* Input */}
                <input
                  ref={inputRef}
                  name="q"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      navigateToSearch((e.currentTarget as HTMLInputElement).value)
                    }
                  }}
                  onFocus={() => {
                    setIsFocused(true)
                    pause()
                  }}
                  onBlur={() => {
                    setTimeout(() => setIsFocused(false), 150)
                    if (!query) resume()
                  }}
                  placeholder={animatedPlaceholder || "Search nature, environment, live data..."}
                  className={cn(
                    "flex-1 bg-transparent text-base sm:text-lg md:text-xl",
                    "text-foreground placeholder:text-muted-foreground placeholder:text-sm sm:placeholder:text-base",
                    "focus:outline-none",
                    "min-w-0"
                  )}
                  aria-label="Search"
                />
                
                {/* Clear Button */}
                <AnimatePresence>
                  {query && (
                    <motion.button
                      type="button"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={() => setQuery("")}
                      className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </motion.button>
                  )}
                </AnimatePresence>
                
                {/* Voice Button */}
                <motion.button
                  type="button"
                  onClick={toggleVoice}
                  disabled={connectionState === "connecting" && !hasWebSpeech}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "relative p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all duration-300",
                    isListening
                      ? "bg-red-500/20 text-red-400 ring-2 ring-red-500/50"
                      : (isConnected || hasWebSpeech)
                        ? "bg-white/10 hover:bg-white/20 dark:bg-white/10 dark:hover:bg-white/20 text-foreground/90"
                        : "bg-white/5 dark:bg-white/5 text-muted-foreground",
                    connectionState === "connecting" && !hasWebSpeech && "animate-pulse"
                  )}
                  title={
                    isListening
                      ? "Stop listening"
                      : (isConnected || hasWebSpeech)
                        ? "Start voice search"
                        : connectionState === "connecting"
                          ? "Connecting to MYCA..."
                          : "Voice search unavailable"
                  }
                >
                  {isListening ? (
                    <>
                      <MicOff className="h-4 w-4 sm:h-5 sm:w-5" />
                      {/* Pulse animation */}
                      <span className="absolute inset-0 rounded-lg sm:rounded-xl bg-red-500/30 animate-ping" />
                    </>
                  ) : (
                    <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </motion.button>
                
                {/* Submit Button */}
                <motion.button
                  type="submit"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    navigateToSearch(query)
                  }}
                  disabled={isSearching}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all duration-300",
                    query.trim()
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                      : "bg-background/40 dark:bg-white/10 text-muted-foreground"
                  )}
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </motion.button>
              </div>
              
              {/* Voice Feedback */}
              <AnimatePresence>
                {isListening && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute -bottom-12 left-0 right-0 flex items-center justify-center gap-2 text-sm"
                  >
                    <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                      <Mic className="h-4 w-4 animate-pulse" />
                      Listening... speak now
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.form>

            <AnimatePresence>
              {query.trim().length >= 2 && (suggestionsLoading || suggestions.length > 0) ? (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-border bg-background/95 shadow-2xl backdrop-blur-md"
                >
                  {suggestionsLoading ? (
                    <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading suggestions...
                    </div>
                  ) : (
                    <ul className="max-h-80 overflow-auto py-2">
                      {suggestions.map((suggestion) => (
                        <li key={suggestion.id}>
                          <button
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              window.location.assign(suggestion.url)
                            }}
                            className="flex w-full flex-col px-4 py-3 text-left hover:bg-muted/70"
                          >
                            <span className="text-sm font-medium text-foreground">{suggestion.title}</span>
                            {suggestion.scientificName ? (
                              <span className="text-xs italic text-muted-foreground">{suggestion.scientificName}</span>
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Try: suggestions — outside card so never clipped; single line, scales, horizontal scroll if needed */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="w-full flex flex-nowrap items-center gap-2 sm:gap-3 mt-3 sm:mt-4 min-h-[44px] overflow-x-auto overflow-y-visible scrollbar-hide py-1 px-1"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">Try:</span>
          {trySuggestions.map(({ term, phoneVisible }) => (
            <button
              key={term}
              type="button"
              onClick={() => {
                setQuery(term)
                window.location.assign(`/search?q=${encodeURIComponent(term)}`)
              }}
              className={cn(
                "px-3 py-2 rounded-full text-xs sm:text-sm flex-shrink-0 whitespace-nowrap",
                "bg-background/50 hover:bg-background/70 dark:bg-white/10 dark:hover:bg-white/20 dark:active:bg-white/30 text-foreground",
                "border border-border dark:border-white/10 dark:hover:border-white/25",
                "transition-all duration-200 cursor-pointer select-none min-h-[36px]",
                !phoneVisible && "hidden sm:inline-flex"
              )}
            >
              {term}
            </button>
          ))}
          <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground ml-2 flex-shrink-0 whitespace-nowrap">
            <Command className="h-3 w-3" />
            <span>K for commands</span>
          </div>
        </motion.div>

      </div>
    </section>
  )
}

export default HeroSearch
