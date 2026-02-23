"use client"

/**
 * ChatInput - Feb 2026
 * 
 * Mobile-optimized input bar with auto-expanding textarea,
 * send button, and voice input microphone.
 */

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Mic, MicOff, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  onSend: (text: string) => void
  onVoice?: (transcript: string) => void
  isLoading?: boolean
  placeholder?: string
}

export function ChatInput({
  onSend,
  onVoice,
  isLoading = false,
  placeholder = "Ask MYCA...",
}: ChatInputProps) {
  const [input, setInput] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [interimTranscript, setInterimTranscript] = useState("")
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      const scrollHeight = textareaRef.current.scrollHeight
      textareaRef.current.style.height = Math.min(scrollHeight, 120) + "px"
    }
  }, [input])

  // Handle send
  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text || isLoading) return
    onSend(text)
    setInput("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }, [input, isLoading, onSend])

  // Handle keyboard submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === "undefined") return
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setVoiceError("Voice input not supported in this browser")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = "en-US"

    recognition.onresult = (event) => {
      let interim = ""
      let final = ""
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += transcript
        } else {
          interim += transcript
        }
      }

      setInterimTranscript(interim)
      
      if (final) {
        setInput((prev) => prev + final)
        setInterimTranscript("")
      }
    }

    recognition.onend = () => {
      setIsListening(false)
      setInterimTranscript("")
      // Auto-send if we have content
      if (input.trim() || interimTranscript.trim()) {
        const text = (input + interimTranscript).trim()
        if (text && onVoice) {
          onVoice(text)
          setInput("")
        }
      }
    }

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error)
      setIsListening(false)
      if (event.error === "not-allowed") {
        setVoiceError("Microphone access denied")
      }
    }

    recognitionRef.current = recognition

    return () => {
      recognition.abort()
    }
  }, [input, interimTranscript, onVoice])

  // Toggle voice listening
  const toggleVoice = () => {
    if (!recognitionRef.current) {
      setVoiceError("Voice input not available")
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      setVoiceError(null)
      setInterimTranscript("")
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch (err) {
        console.error("Failed to start recognition:", err)
        setVoiceError("Failed to start voice input")
      }
    }
  }

  // Cancel voice input
  const cancelVoice = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.abort()
      setIsListening(false)
      setInterimTranscript("")
    }
  }

  const hasContent = input.trim().length > 0 || interimTranscript.length > 0

  return (
    <div className="sticky bottom-0 border-t bg-background pb-safe">
      {/* Voice error message */}
      <AnimatePresence>
        {voiceError && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 bg-destructive/10 text-destructive text-xs"
          >
            {voiceError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice listening indicator */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-3 bg-violet-500/10 border-b flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <Mic className="h-5 w-5 text-violet-500" />
                <span className="absolute inset-0 animate-ping rounded-full bg-violet-500/30" />
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Listening...</span>
                {interimTranscript && (
                  <span className="ml-2 text-foreground">{interimTranscript}</span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={cancelVoice}
            >
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="flex items-end gap-2 p-3">
        {/* Voice button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-10 shrink-0 rounded-full",
            isListening && "bg-violet-500 text-white hover:bg-violet-600"
          )}
          onClick={toggleVoice}
          disabled={isLoading}
        >
          {isListening ? (
            <MicOff className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Speaking..." : placeholder}
            disabled={isLoading || isListening}
            rows={1}
            className={cn(
              "w-full resize-none rounded-2xl border bg-muted/50 px-4 py-2.5 text-base",
              "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50",
              "min-h-[44px] max-h-[120px]",
              isListening && "opacity-50"
            )}
          />
        </div>

        {/* Send button */}
        <Button
          variant="default"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-full"
          onClick={handleSend}
          disabled={!hasContent || isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  )
}

// Add TypeScript declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}
