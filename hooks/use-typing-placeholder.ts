/**
 * useTypingPlaceholder - Animated typing placeholder hook
 * Created: February 11, 2026
 * 
 * Cycles through suggestions with a typewriter effect for search inputs.
 */

"use client"

import { useState, useEffect, useCallback } from "react"

// Default search suggestions showcasing Mycosoft capabilities
const DEFAULT_SUGGESTIONS = [
  "Search fungi species and taxonomy...",
  "Ask about medicinal compounds...",
  "Find genetic sequences...",
  "Explore mycelium networks...",
  "Analyze chemical structures...",
  "Discover research papers...",
  "Query Earth2 climate data...",
  "Check device telemetry...",
  "What is the most poisonous mushroom?",
  "Psilocybin research papers...",
  "Amanita muscaria properties...",
]

interface UseTypingPlaceholderOptions {
  /** Custom suggestions array */
  suggestions?: string[]
  /** Speed of typing in ms per character */
  typingSpeed?: number
  /** Speed of deleting in ms per character */
  deletingSpeed?: number
  /** Pause before starting to delete */
  pauseBeforeDelete?: number
  /** Pause after deleting before typing next */
  pauseAfterDelete?: number
  /** Whether to shuffle suggestions */
  shuffle?: boolean
  /** Whether the animation is enabled */
  enabled?: boolean
}

interface UseTypingPlaceholderReturn {
  /** Current placeholder text to display */
  placeholder: string
  /** Whether currently typing (vs deleting) */
  isTyping: boolean
  /** Current suggestion index */
  currentIndex: number
  /** Restart the animation */
  restart: () => void
  /** Pause the animation */
  pause: () => void
  /** Resume the animation */
  resume: () => void
  /** Whether animation is paused */
  isPaused: boolean
}

export function useTypingPlaceholder(
  options: UseTypingPlaceholderOptions = {}
): UseTypingPlaceholderReturn {
  const {
    suggestions = DEFAULT_SUGGESTIONS,
    typingSpeed = 50,
    deletingSpeed = 30,
    pauseBeforeDelete = 2000,
    pauseAfterDelete = 500,
    shuffle = false,
    enabled = true,
  } = options

  // Optionally shuffle suggestions on mount
  const [orderedSuggestions] = useState(() => {
    if (shuffle) {
      return [...suggestions].sort(() => Math.random() - 0.5)
    }
    return suggestions
  })

  const [currentIndex, setCurrentIndex] = useState(0)
  const [displayText, setDisplayText] = useState("")
  const [isTyping, setIsTyping] = useState(true)
  const [isPaused, setIsPaused] = useState(false)

  const currentSuggestion = orderedSuggestions[currentIndex] || ""

  useEffect(() => {
    if (!enabled || isPaused) return

    let timeout: NodeJS.Timeout

    if (isTyping) {
      // Typing phase
      if (displayText.length < currentSuggestion.length) {
        timeout = setTimeout(() => {
          setDisplayText(currentSuggestion.slice(0, displayText.length + 1))
        }, typingSpeed)
      } else {
        // Finished typing, pause then start deleting
        timeout = setTimeout(() => {
          setIsTyping(false)
        }, pauseBeforeDelete)
      }
    } else {
      // Deleting phase
      if (displayText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1))
        }, deletingSpeed)
      } else {
        // Finished deleting, pause then move to next suggestion
        timeout = setTimeout(() => {
          setCurrentIndex((prev) => (prev + 1) % orderedSuggestions.length)
          setIsTyping(true)
        }, pauseAfterDelete)
      }
    }

    return () => clearTimeout(timeout)
  }, [
    displayText,
    isTyping,
    currentSuggestion,
    typingSpeed,
    deletingSpeed,
    pauseBeforeDelete,
    pauseAfterDelete,
    orderedSuggestions.length,
    enabled,
    isPaused,
  ])

  const restart = useCallback(() => {
    setCurrentIndex(0)
    setDisplayText("")
    setIsTyping(true)
    setIsPaused(false)
  }, [])

  const pause = useCallback(() => {
    setIsPaused(true)
  }, [])

  const resume = useCallback(() => {
    setIsPaused(false)
  }, [])

  return {
    placeholder: displayText,
    isTyping,
    currentIndex,
    restart,
    pause,
    resume,
    isPaused,
  }
}

export default useTypingPlaceholder
export { DEFAULT_SUGGESTIONS }
