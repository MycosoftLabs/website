"use client"

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react"

// Web Speech API types
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

export type VoiceMode = "whisper" | "web-speech" | "personaplex" | "elevenlabs"

export interface VoiceContextValue {
  // State
  isListening: boolean
  isSpeaking: boolean
  isConnected: boolean
  transcript: string
  interimTranscript: string
  error: string | null
  mode: VoiceMode
  
  // Actions
  startListening: () => void
  stopListening: () => void
  speak: (text: string) => Promise<void>
  sendCommand: (command: string) => Promise<string>
  setMode: (mode: VoiceMode) => void
  clearTranscript: () => void
  
  // Command handlers
  registerHandler: (pattern: string | RegExp, handler: (match: RegExpMatchArray) => void) => void
  unregisterHandler: (pattern: string | RegExp) => void
}

const VoiceContext = createContext<VoiceContextValue | null>(null)

export function useVoice() {
  const context = useContext(VoiceContext)
  if (!context) {
    throw new Error("useVoice must be used within UnifiedVoiceProvider")
  }
  return context
}

interface CommandHandler {
  pattern: RegExp
  handler: (match: RegExpMatchArray) => void
}

interface UnifiedVoiceProviderProps {
  children: React.ReactNode
  defaultMode?: VoiceMode
  autoConnect?: boolean
  masApiUrl?: string
  personaplexUrl?: string
  onTranscript?: (text: string) => void
  onResponse?: (response: string) => void
  onError?: (error: string) => void
}

export function UnifiedVoiceProvider({
  children,
  defaultMode = "web-speech",
  autoConnect = false,
  masApiUrl = "/api/mas",
  personaplexUrl = "ws://localhost:8999",
  onTranscript,
  onResponse,
  onError,
}: UnifiedVoiceProviderProps) {
  // State
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<VoiceMode>(defaultMode)
  
  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const handlersRef = useRef<CommandHandler[]>([])
  
  // Initialize Web Speech API
  const initWebSpeech = useCallback(() => {
    if (typeof window === "undefined") return null
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError("Web Speech API not supported")
      return null
    }
    
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"
    
    recognition.onresult = (event) => {
      let interim = ""
      let final = ""
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }
      
      if (final) {
        setTranscript(prev => prev + " " + final)
        onTranscript?.(final)
        processCommand(final)
      }
      setInterimTranscript(interim)
    }
    
    recognition.onerror = (event) => {
      const errorMsg = `Speech recognition error: ${event.error}`
      setError(errorMsg)
      onError?.(errorMsg)
      if (event.error !== "no-speech") {
        setIsListening(false)
      }
    }
    
    recognition.onend = () => {
      if (isListening) {
        // Restart if still listening
        recognition.start()
      }
    }
    
    return recognition
  }, [isListening, onTranscript, onError])
  
  // Process command through handlers
  const processCommand = useCallback((text: string) => {
    const normalizedText = text.toLowerCase().trim()
    
    for (const { pattern, handler } of handlersRef.current) {
      const match = normalizedText.match(pattern)
      if (match) {
        handler(match)
        return
      }
    }
  }, [])
  
  // Start listening
  const startListening = useCallback(() => {
    setError(null)
    
    if (mode === "web-speech") {
      if (!recognitionRef.current) {
        recognitionRef.current = initWebSpeech()
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start()
          setIsListening(true)
          setIsConnected(true)
        } catch (e) {
          console.error("Failed to start recognition:", e)
        }
      }
    } else if (mode === "personaplex") {
      // Connect to PersonaPlex WebSocket
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        wsRef.current = new WebSocket(personaplexUrl)
        wsRef.current.onopen = () => {
          setIsConnected(true)
          setIsListening(true)
        }
        wsRef.current.onmessage = (event) => {
          const data = JSON.parse(event.data)
          if (data.transcript) {
            setTranscript(prev => prev + " " + data.transcript)
            onTranscript?.(data.transcript)
            processCommand(data.transcript)
          }
        }
        wsRef.current.onerror = () => {
          setError("PersonaPlex connection failed")
          setIsConnected(false)
        }
        wsRef.current.onclose = () => {
          setIsConnected(false)
          setIsListening(false)
        }
      } else {
        setIsListening(true)
      }
    }
  }, [mode, initWebSpeech, personaplexUrl, onTranscript, processCommand])
  
  // Stop listening
  const stopListening = useCallback(() => {
    setIsListening(false)
    setInterimTranscript("")
    
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [])
  
  // Speak text using TTS
  const speak = useCallback(async (text: string): Promise<void> => {
    setIsSpeaking(true)
    
    try {
      if (mode === "elevenlabs" || mode === "web-speech") {
        // Use ElevenLabs via MAS API
        const response = await fetch(`${masApiUrl}/voice`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice: "arabella" }),
        })
        
        if (response.ok) {
          const audioBlob = await response.blob()
          const audioUrl = URL.createObjectURL(audioBlob)
          const audio = new Audio(audioUrl)
          
          await new Promise<void>((resolve) => {
            audio.onended = () => resolve()
            audio.play()
          })
          
          URL.revokeObjectURL(audioUrl)
        }
      } else if (mode === "personaplex" && wsRef.current) {
        // Send to PersonaPlex for TTS
        wsRef.current.send(JSON.stringify({ type: "speak", text }))
      }
      
      onResponse?.(text)
    } catch (e) {
      console.error("TTS error:", e)
    } finally {
      setIsSpeaking(false)
    }
  }, [mode, masApiUrl, onResponse])
  
  // Send command to MYCA - consciousness first, then voice orchestrator
  const sendCommand = useCallback(async (command: string): Promise<string> => {
    try {
      // Step 1: Try MYCA consciousness chat first
      try {
        const consciousnessResponse = await fetch("/api/myca/consciousness/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: command }),
          signal: AbortSignal.timeout(35000),
        })
        
        if (consciousnessResponse.ok) {
          const data = await consciousnessResponse.json()
          if (data.message) {
            onResponse?.(data.message)
            return data.message
          }
        }
      } catch {
        // Consciousness API not available, fall back to voice orchestrator
      }
      
      // Step 2: Fall back to voice orchestrator
      const response = await fetch(`${masApiUrl}/voice/orchestrator`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: command }),
      })
      
      if (response.ok) {
        const data = await response.json()
        const responseText = data.response_text || data.response || "Command processed"
        onResponse?.(responseText)
        return responseText
      }
      
      return "Command failed"
    } catch (e) {
      const errorMsg = `Command error: ${e}`
      setError(errorMsg)
      return errorMsg
    }
  }, [masApiUrl, onResponse])
  
  // Register command handler
  const registerHandler = useCallback((pattern: string | RegExp, handler: (match: RegExpMatchArray) => void) => {
    const regex = typeof pattern === "string" ? new RegExp(pattern, "i") : pattern
    handlersRef.current.push({ pattern: regex, handler })
  }, [])
  
  // Unregister command handler
  const unregisterHandler = useCallback((pattern: string | RegExp) => {
    const patternStr = pattern.toString()
    handlersRef.current = handlersRef.current.filter(
      h => h.pattern.toString() !== patternStr
    )
  }, [])
  
  // Clear transcript
  const clearTranscript = useCallback(() => {
    setTranscript("")
    setInterimTranscript("")
  }, [])
  
  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      startListening()
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [autoConnect])
  
  const value: VoiceContextValue = {
    isListening,
    isSpeaking,
    isConnected,
    transcript,
    interimTranscript,
    error,
    mode,
    startListening,
    stopListening,
    speak,
    sendCommand,
    setMode,
    clearTranscript,
    registerHandler,
    unregisterHandler,
  }
  
  return (
    <VoiceContext.Provider value={value}>
      {children}
    </VoiceContext.Provider>
  )
}
