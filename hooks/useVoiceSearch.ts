"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect } from "react"
import { useVoice } from "@/components/voice/UnifiedVoiceProvider"

/**
 * Voice Search Hook - February 11, 2026
 * 
 * Connects voice transcript to search functionality.
 * Detects search intent and automatically navigates to search page.
 */

export interface VoiceSearchOptions {
  autoSearch?: boolean // Automatically search when transcript received
  onSearchTriggered?: (query: string) => void
  minQueryLength?: number
}

export function useVoiceSearch(options: VoiceSearchOptions = {}) {
  const {
    autoSearch = true,
    onSearchTriggered,
    minQueryLength = 2,
  } = options
  
  const router = useRouter()
  const voice = useVoice()
  
  /**
   * Extract search query from natural language voice input
   */
  const extractSearchQuery = useCallback((transcript: string): string | null => {
    const text = transcript.toLowerCase().trim()
    
    // Pattern 1: "search for X"
    let match = text.match(/search\s+(?:for\s+)?(.+)/i)
    if (match) return match[1]
    
    // Pattern 2: "find X"
    match = text.match(/find\s+(?:me\s+)?(.+)/i)
    if (match) return match[1]
    
    // Pattern 3: "show me X"
    match = text.match(/show\s+(?:me\s+)?(.+)/i)
    if (match) return match[1]
    
    // Pattern 4: "look up X"
    match = text.match(/look\s+up\s+(.+)/i)
    if (match) return match[1]
    
    // Pattern 5: "what is X" or "what are X"
    match = text.match(/what\s+(?:is|are)\s+(.+)/i)
    if (match) return match[1]
    
    // Pattern 6: Direct search (if short phrase without search intent keywords)
    // This handles cases like just saying "mushrooms" or "fungi species"
    const hasConversationWords = /\b(hello|hi|hey|thanks|please|can you|could you|would you|tell me|explain)\b/i.test(text)
    if (!hasConversationWords && text.length >= minQueryLength && text.length < 50) {
      return text
    }
    
    return null
  }, [minQueryLength])
  
  /**
   * Trigger search with voice query
   */
  const searchByVoice = useCallback((transcript: string) => {
    const query = extractSearchQuery(transcript)
    
    if (query && query.length >= minQueryLength) {
      console.log("[VoiceSearch] Triggering search:", query)
      
      // Navigate to search page with query
      router.push(`/search?q=${encodeURIComponent(query)}`)
      
      // Callback
      onSearchTriggered?.(query)
      
      // Analytics
      if (typeof window !== "undefined" && (window as any).gtag) {
        (window as any).gtag("event", "voice_search", {
          query,
          query_length: query.length,
        })
      }
      
      return query
    }
    
    return null
  }, [router, extractSearchQuery, minQueryLength, onSearchTriggered])
  
  /**
   * Auto-search when transcript updates
   */
  useEffect(() => {
    if (autoSearch && voice.transcript && !voice.isListening) {
      // Only search after user stopped speaking
      const timer = setTimeout(() => {
        searchByVoice(voice.transcript)
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [voice.transcript, voice.isListening, autoSearch, searchByVoice])
  
  return {
    searchByVoice,
    extractSearchQuery,
    isListening: voice.isListening,
    isSpeaking: voice.isSpeaking,
    transcript: voice.transcript,
    interimTranscript: voice.interimTranscript,
    isConnected: voice.isConnected,
  }
}
