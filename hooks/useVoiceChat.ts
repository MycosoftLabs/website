"use client"

import { useState, useEffect, useCallback, useRef } from "react"

// Web Speech API types
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

export type VoiceMode = "web-speech" | "personaplex" | "elevenlabs"

export interface VoiceChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  toolCall?: {
    agent: string
    action: string
    status: "pending" | "success" | "error"
  }
}

export interface UseVoiceChatOptions {
  autoConnect?: boolean
  mode?: VoiceMode
  masApiUrl?: string
  personaplexUrl?: string
  onTranscript?: (text: string) => void
  onResponse?: (response: string) => void
  onError?: (error: string) => void
  handlers?: Record<string, () => void>
}

export interface UseVoiceChatReturn {
  // State
  isListening: boolean
  isSpeaking: boolean
  isConnected: boolean
  isProcessing: boolean
  transcript: string
  interimTranscript: string
  messages: VoiceChatMessage[]
  error: string | null
  
  // Actions
  startListening: () => void
  stopListening: () => void
  toggleListening: () => void
  speak: (text: string) => Promise<void>
  sendMessage: (message: string) => Promise<string>
  clearMessages: () => void
  clearTranscript: () => void
}

export function useVoiceChat(options: UseVoiceChatOptions = {}): UseVoiceChatReturn {
  const {
    autoConnect = false,
    mode = "web-speech",
    masApiUrl = "/api/mas",
    personaplexUrl = "ws://localhost:8999",
    onTranscript,
    onResponse,
    onError,
    handlers = {},
  } = options
  
  // State
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [messages, setMessages] = useState<VoiceChatMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  
  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  
  // Process command through handlers
  const processCommand = useCallback((text: string) => {
    const normalizedText = text.toLowerCase().trim()
    
    for (const [pattern, handler] of Object.entries(handlers)) {
      if (normalizedText.includes(pattern.toLowerCase())) {
        handler()
        return true
      }
    }
    return false
  }, [handlers])
  
  // Initialize Web Speech API
  const initWebSpeech = useCallback(() => {
    if (typeof window === "undefined") return null
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError("Web Speech API not supported")
      onError?.("Web Speech API not supported")
      return null
    }
    
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"
    
    recognition.onstart = () => {
      setIsConnected(true)
    }
    
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
        const trimmedFinal = final.trim()
        setTranscript(prev => (prev + " " + trimmedFinal).trim())
        onTranscript?.(trimmedFinal)
        
        // Add user message
        const userMessage: VoiceChatMessage = {
          id: `user-${Date.now()}`,
          role: "user",
          content: trimmedFinal,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, userMessage])
        
        // Process through handlers first
        if (!processCommand(trimmedFinal)) {
          // If no handler matched, send to MYCA
          sendMessage(trimmedFinal)
        }
      }
      setInterimTranscript(interim)
    }
    
    recognition.onerror = (event) => {
      const errorMsg = `Speech recognition error: ${event.error}`
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setError(errorMsg)
        onError?.(errorMsg)
      }
    }
    
    recognition.onend = () => {
      if (isListening) {
        try {
          recognition.start()
        } catch (e) {
          // Ignore restart errors
        }
      }
    }
    
    return recognition
  }, [isListening, onTranscript, onError, processCommand])
  
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
        } catch (e) {
          // Already started, ignore
        }
      }
    } else if (mode === "personaplex") {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        wsRef.current = new WebSocket(personaplexUrl)
        wsRef.current.onopen = () => {
          setIsConnected(true)
          setIsListening(true)
        }
        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.transcript) {
              setTranscript(prev => (prev + " " + data.transcript).trim())
              onTranscript?.(data.transcript)
            }
            if (data.response) {
              onResponse?.(data.response)
            }
          } catch (e) {
            // Binary audio data, handle differently
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
  }, [mode, initWebSpeech, personaplexUrl, onTranscript, onResponse])
  
  // Stop listening
  const stopListening = useCallback(() => {
    setIsListening(false)
    setInterimTranscript("")
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        // Ignore stop errors
      }
    }
  }, [])
  
  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])
  
  // Speak text using TTS
  const speak = useCallback(async (text: string): Promise<void> => {
    setIsSpeaking(true)
    
    try {
      const response = await fetch(`${masApiUrl}/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: "arabella" }),
      })
      
      if (response.ok) {
        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)
        
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve()
          audio.onerror = () => reject(new Error("Audio playback failed"))
          audio.play().catch(reject)
        })
        
        URL.revokeObjectURL(audioUrl)
      }
    } catch (e) {
      console.error("TTS error:", e)
    } finally {
      setIsSpeaking(false)
    }
  }, [masApiUrl])
  
  // Send message to MYCA
  const sendMessage = useCallback(async (message: string): Promise<string> => {
    setIsProcessing(true)
    
    try {
      const response = await fetch(`${masApiUrl}/voice/orchestrator`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      })
      
      if (response.ok) {
        const data = await response.json()
        const responseText = data.response_text || data.response || "Command processed"
        
        // Add assistant message
        const assistantMessage: VoiceChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: responseText,
          timestamp: new Date(),
          toolCall: data.tool_call,
        }
        setMessages(prev => [...prev, assistantMessage])
        
        onResponse?.(responseText)
        
        // Speak the response
        await speak(responseText)
        
        return responseText
      }
      
      return "Command failed"
    } catch (e) {
      const errorMsg = `Command error: ${e}`
      setError(errorMsg)
      onError?.(errorMsg)
      return errorMsg
    } finally {
      setIsProcessing(false)
    }
  }, [masApiUrl, onResponse, onError, speak])
  
  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([])
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
        try {
          recognitionRef.current.stop()
        } catch (e) {
          // Ignore
        }
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])
  
  return {
    isListening,
    isSpeaking,
    isConnected,
    isProcessing,
    transcript,
    interimTranscript,
    messages,
    error,
    startListening,
    stopListening,
    toggleListening,
    speak,
    sendMessage,
    clearMessages,
    clearTranscript,
  }
}
