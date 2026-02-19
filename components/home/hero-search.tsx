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
import { cn } from "@/lib/utils"
import { usePersonaPlexContext } from "@/components/voice/PersonaPlexProvider"
import { useTypingPlaceholder } from "@/hooks/use-typing-placeholder"
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

export function HeroSearch() {
  const router = useRouter()
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [query, setQuery] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // PersonaPlex voice context (gracefully handles null)
  const personaplex = usePersonaPlexContext()
  const isConnected = personaplex?.isConnected ?? false
  const isListening = personaplex?.isListening ?? false
  const lastTranscript = personaplex?.lastTranscript ?? ""
  const connectionState = personaplex?.connectionState ?? "disconnected"
  
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

  // Handle mouse move for gradient effect
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    mouseX.set(x)
    mouseY.set(y)
  }, [mouseX, mouseY])

  // Handle voice transcript - auto-fill search when voice input received
  useEffect(() => {
    if (lastTranscript && isListening) {
      setQuery(lastTranscript)
    }
  }, [lastTranscript, isListening])

  // Click outside handler - just unfocus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      setIsSearching(true)
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
    <section className="pt-4 pb-8 sm:pt-6 sm:pb-12 md:pt-8 md:pb-24 px-3 sm:px-4 md:px-6 flex flex-col items-center gap-4 sm:gap-6 md:gap-8">
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
          
          {/* Background Video — hidden on phone to save bandwidth */}
          <div className="absolute inset-[2px] rounded-[22px] overflow-hidden">
            <video
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover hidden sm:block"
              style={{ filter: "brightness(0.4) saturate(1.2)" }}
            >
              <source src="https://mycosoft.org/videos/mycelium-bg.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/50 to-background/90" />
          </div>

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
                <span>Building The Earth Intelligence</span>
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
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => {
                    setIsFocused(true)
                    pause()
                  }}
                  onBlur={() => {
                    if (!query) resume()
                  }}
                  placeholder={animatedPlaceholder || "Search fungi, compounds..."}
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
                  disabled={connectionState === "connecting"}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "relative p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all duration-300",
                    isListening 
                      ? "bg-red-500/20 text-red-400 ring-2 ring-red-500/50" 
                      : isConnected 
                        ? "bg-white/10 hover:bg-white/20 dark:bg-white/10 dark:hover:bg-white/20 text-foreground/90"
                        : "bg-white/5 dark:bg-white/5 text-muted-foreground",
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
                  disabled={!query.trim() || isSearching}
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

            {/* Quick Actions — type="button" is REQUIRED so these don't submit the form */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="flex flex-wrap items-center justify-center gap-2 mt-4 sm:mt-6 sm:gap-3 sm:mt-8"
            >
              <span className="text-xs text-muted-foreground hidden sm:inline">Try:</span>
              {[
                { term: "Amanita", phoneVisible: true },
                { term: "Psilocybin", phoneVisible: true },
                { term: "Mycelium", phoneVisible: true },
                { term: "ITS Sequence", phoneVisible: false },
                { term: "Reishi", phoneVisible: false },
                { term: "Muscarine", phoneVisible: false },
              ].map(({ term, phoneVisible }) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => {
                    setQuery(term)
                    router.push(`/search?q=${encodeURIComponent(term)}`)
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs sm:text-sm",
                    "bg-background/50 hover:bg-background/70 dark:bg-white/10 dark:hover:bg-white/20 dark:active:bg-white/30 text-foreground",
                    "border border-border dark:border-white/10 dark:hover:border-white/25",
                    "transition-all duration-200 cursor-pointer select-none",
                    !phoneVisible && "hidden sm:inline-flex"
                  )}
                >
                  {term}
                </button>
              ))}
              <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground ml-2">
                <Command className="h-3 w-3" />
                <span>K for commands</span>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Old suggestions dropdown removed - search results now shown on /search page with fluid widgets */}
      </div>
    </section>
  )
}

export default HeroSearch
