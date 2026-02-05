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

"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion"
import { useTheme } from "next-themes"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useDebounce } from "@/hooks/use-debounce"
import { useSearch } from "@/components/search/use-search"
import { usePersonaPlexContext } from "@/components/voice/PersonaPlexProvider"
import {
  Search,
  Mic,
  MicOff,
  Sparkles,
  ArrowRight,
  Loader2,
  X,
  Command,
  MouseIcon as Mushroom,
  FileText,
  FlaskRoundIcon as Flask,
  Microscope,
  Wand2,
  Brain,
} from "lucide-react"

export function HeroSearch() {
  const router = useRouter()
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [query, setQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const debouncedQuery = useDebounce(query || "", 300)
  const safeQuery = (debouncedQuery || "").trim()
  
  // Search hook
  const { suggestions, isLoading, error, fetchSuggestions } = useSearch()
  
  // PersonaPlex voice context (gracefully handles null)
  const personaplex = usePersonaPlexContext()
  const isConnected = personaplex?.isConnected ?? false
  const isListening = personaplex?.isListening ?? false
  const lastTranscript = personaplex?.lastTranscript ?? ""
  const connectionState = personaplex?.connectionState ?? "disconnected"
  
  // Mouse position for gradient effect
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  
  // Gradient position transforms
  const gradientX = useTransform(mouseX, [0, 1], ["0%", "100%"])
  const gradientY = useTransform(mouseY, [0, 1], ["0%", "100%"])

  useEffect(() => {
    setMounted(true)
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

  // Handle voice transcript
  useEffect(() => {
    if (lastTranscript && isListening) {
      setQuery(lastTranscript)
      setShowSuggestions(true)
    }
  }, [lastTranscript, isListening])

  // Fetch suggestions on query change
  useEffect(() => {
    if (!safeQuery) return
    const controller = new AbortController()
    fetchSuggestions(safeQuery, controller)
    return () => controller.abort()
  }, [safeQuery, fetchSuggestions])

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
        setIsFocused(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      setShowSuggestions(false)
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  const toggleVoice = () => {
    if (!personaplex) return
    if (isListening) {
      personaplex.stopListening()
    } else {
      personaplex.startListening()
    }
  }

  const logoSrc = mounted && theme === "dark"
    ? "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Mycosoft%20Logo%20(1)-lArPx4fwtqahyHVlnRLWWSfqWLIJpv.png"
    : "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/MycosoftLogo2%20(1)-5jx3SObDwKV9c6QmbxJ2NWopjhfLmZ.png"

  return (
    <section className="pt-8 pb-16 md:pb-24 flex flex-col items-center gap-8">
      <div 
        ref={containerRef}
        className="w-full max-w-3xl relative"
        onMouseMove={handleMouseMove}
      >
        {/* Hero Container with Glass Morphism */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={cn(
            "relative rounded-3xl overflow-hidden",
            "backdrop-blur-xl",
            isFocused && "ring-2 ring-primary/50"
          )}
        >
          {/* Animated Gradient Border */}
          <div className="absolute inset-0 rounded-3xl p-[2px] bg-gradient-to-r from-primary/40 via-purple-500/40 to-cyan-500/40 animate-gradient-x" />
          
          {/* Background Video */}
          <div className="absolute inset-[2px] rounded-[22px] overflow-hidden">
            <video
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: "brightness(0.4) saturate(1.2)" }}
            >
              <source src="https://mycosoft.org/videos/mycelium-bg.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background/80" />
          </div>

          {/* Content */}
          <div className="relative z-10 px-6 py-12 md:px-12 md:py-16">
            {/* Logo & Title */}
            <div className="flex flex-col items-center gap-4 mb-8">
              <motion.div 
                className="flex items-center gap-3"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
              >
                <div className="w-14 h-14 md:w-20 md:h-20 relative">
                  <Image
                    src={logoSrc}
                    alt="Mycosoft Logo"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                  Mycosoft
                </h1>
              </motion.div>
              
              <motion.p 
                className="text-lg md:text-xl text-gray-300 text-center flex items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <Brain className="h-5 w-5 text-primary" />
                The Fungal Intelligence Platform
              </motion.p>
            </div>

            {/* Search Bar */}
            <motion.form
              onSubmit={handleSearch}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="relative"
            >
              <div 
                className={cn(
                  "relative flex items-center gap-3 px-5 py-4 md:py-5 rounded-2xl",
                  "bg-white/10 backdrop-blur-md border border-white/20",
                  "shadow-2xl shadow-black/20",
                  "transition-all duration-300",
                  isFocused && "bg-white/15 border-white/30 shadow-primary/20"
                )}
              >
                {/* Search Icon */}
                <Search className="h-5 w-5 md:h-6 md:w-6 text-gray-400 shrink-0" />
                
                {/* Input */}
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setShowSuggestions(true)
                  }}
                  onFocus={() => {
                    setIsFocused(true)
                    setShowSuggestions(true)
                  }}
                  placeholder="Search fungi, compounds, genetics, research..."
                  className={cn(
                    "flex-1 bg-transparent text-lg md:text-xl",
                    "text-white placeholder:text-gray-400",
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
                      <X className="h-4 w-4 text-gray-400" />
                    </motion.button>
                  )}
                </AnimatePresence>
                
                {/* Voice Button */}
                <motion.button
                  type="button"
                  onClick={toggleVoice}
                  disabled={connectionState === "connecting"}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "relative p-3 rounded-xl transition-all duration-300",
                    isListening 
                      ? "bg-red-500/20 text-red-400 ring-2 ring-red-500/50" 
                      : isConnected 
                        ? "bg-white/10 hover:bg-white/20 text-gray-300"
                        : "bg-white/5 text-gray-500",
                    connectionState === "connecting" && "animate-pulse"
                  )}
                  title={
                    isListening 
                      ? "Stop listening" 
                      : isConnected 
                        ? "Start voice search" 
                        : connectionState === "connecting"
                          ? "Connecting to MYCA..."
                          : "Voice search (connect to enable)"
                  }
                >
                  {isListening ? (
                    <>
                      <MicOff className="h-5 w-5" />
                      {/* Pulse animation */}
                      <span className="absolute inset-0 rounded-xl bg-red-500/30 animate-ping" />
                    </>
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </motion.button>
                
                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={!query.trim()}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "p-3 rounded-xl transition-all duration-300",
                    query.trim()
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                      : "bg-white/10 text-gray-500"
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ArrowRight className="h-5 w-5" />
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

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="flex flex-wrap items-center justify-center gap-3 mt-8"
            >
              <span className="text-xs text-gray-500 hidden md:inline">Try:</span>
              {["Amanita muscaria", "Psilocybin research", "Mycelium networks"].map((term) => (
                <button
                  key={term}
                  onClick={() => {
                    setQuery(term)
                    setShowSuggestions(true)
                    inputRef.current?.focus()
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm",
                    "bg-white/10 hover:bg-white/20 text-gray-300",
                    "border border-white/10 hover:border-white/20",
                    "transition-all duration-200"
                  )}
                >
                  {term}
                </button>
              ))}
              <div className="hidden md:flex items-center gap-1 text-xs text-gray-500 ml-2">
                <Command className="h-3 w-3" />
                <span>K for commands</span>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Suggestions Dropdown */}
        <AnimatePresence>
          {showSuggestions && (safeQuery || suggestions.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "absolute left-0 right-0 mt-3 z-50",
                "rounded-2xl overflow-hidden",
                "bg-card/95 backdrop-blur-xl border border-border",
                "shadow-2xl shadow-black/20"
              )}
            >
              {/* AI Feature Banner */}
              <div className="px-4 py-2 bg-gradient-to-r from-primary/10 to-purple-500/10 border-b border-border flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">AI-powered search with MYCA Brain</span>
              </div>
              
              <div className="max-h-[400px] overflow-auto p-2">
                {error ? (
                  <div className="p-6 text-center">
                    <p className="text-sm text-destructive">{error}</p>
                    <button 
                      onClick={() => fetchSuggestions(safeQuery)}
                      className="mt-2 text-xs text-primary hover:underline"
                    >
                      Try again
                    </button>
                  </div>
                ) : isLoading ? (
                  <div className="p-6 flex items-center justify-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Searching...</span>
                  </div>
                ) : suggestions.length > 0 ? (
                  <div className="space-y-1">
                    {suggestions.map((suggestion, index) => (
                      <motion.div
                        key={suggestion.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Link
                          href={suggestion.url}
                          onClick={() => setShowSuggestions(false)}
                          className={cn(
                            "flex items-center gap-4 p-3 rounded-xl",
                            "hover:bg-muted/80 transition-colors",
                            "group"
                          )}
                        >
                          <div className={cn(
                            "shrink-0 p-2 rounded-lg",
                            suggestion.type === "fungi" && "bg-green-500/10 text-green-500",
                            suggestion.type === "article" && "bg-blue-500/10 text-blue-500",
                            suggestion.type === "compound" && "bg-purple-500/10 text-purple-500",
                            suggestion.type === "research" && "bg-orange-500/10 text-orange-500"
                          )}>
                            {suggestion.type === "fungi" && <Mushroom className="h-5 w-5" />}
                            {suggestion.type === "article" && <FileText className="h-5 w-5" />}
                            {suggestion.type === "compound" && <Flask className="h-5 w-5" />}
                            {suggestion.type === "research" && <Microscope className="h-5 w-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate group-hover:text-primary transition-colors">
                              {suggestion.title}
                            </p>
                            {suggestion.scientificName && (
                              <p className="text-sm text-muted-foreground italic truncate">
                                {suggestion.scientificName}
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <span className="capitalize">{suggestion.type}</span>
                              {suggestion.date && (
                                <>
                                  <span>•</span>
                                  <span>{suggestion.date}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                ) : safeQuery ? (
                  <div className="p-6 text-center">
                    <Wand2 className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No results for "{safeQuery}"</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Try a different search term</p>
                  </div>
                ) : null}
              </div>
              
              {/* Footer */}
              <div className="px-4 py-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Command className="h-3 w-3" />K for commands
                </span>
                <span>ESC to close</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}

export default HeroSearch
