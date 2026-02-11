"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Volume2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useVoice } from "./UnifiedVoiceProvider"

export type VoiceButtonSize = "sm" | "md" | "lg"
export type VoiceButtonVariant = "default" | "floating" | "minimal" | "pill"

interface VoiceButtonProps {
  size?: VoiceButtonSize
  variant?: VoiceButtonVariant
  showStatus?: boolean
  showTranscript?: boolean
  className?: string
  onTranscript?: (text: string) => void
  onResponse?: (response: string) => void
}

const sizeClasses: Record<VoiceButtonSize, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
}

const iconSizes: Record<VoiceButtonSize, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
}

export function VoiceButton({
  size = "md",
  variant = "default",
  showStatus = true,
  showTranscript = false,
  className,
  onTranscript,
  onResponse,
}: VoiceButtonProps) {
  const voice = useVoice()
  const [pulseAnimation, setPulseAnimation] = useState(false)
  
  // Pulse animation when listening
  useEffect(() => {
    if (voice.isListening) {
      setPulseAnimation(true)
    } else {
      setPulseAnimation(false)
    }
  }, [voice.isListening])
  
  // Forward callbacks
  useEffect(() => {
    if (onTranscript && voice.transcript) {
      onTranscript(voice.transcript)
    }
  }, [voice.transcript, onTranscript])
  
  const handleClick = () => {
    if (voice.isListening) {
      voice.stopListening()
    } else {
      voice.startListening()
    }
  }
  
  const getIcon = () => {
    if (voice.isSpeaking) {
      return <Volume2 className={cn(iconSizes[size], "animate-pulse")} />
    }
    if (voice.isListening) {
      return <Mic className={cn(iconSizes[size], "text-red-500")} />
    }
    return <MicOff className={iconSizes[size]} />
  }
  
  const getButtonClasses = () => {
    const base = cn(
      "relative rounded-full transition-all duration-200",
      sizeClasses[size],
      className
    )
    
    switch (variant) {
      case "floating":
        return cn(
          base,
          "fixed z-50 shadow-2xl",
          // Responsive positioning - avoid mobile bottom nav
          "bottom-6 right-6 md:bottom-6 md:right-6",
          "sm:bottom-20 sm:right-4",
          // Touch-friendly size on mobile
          "h-14 w-14 md:h-16 md:w-16",
          // Smooth transitions
          "transition-all duration-300 ease-out",
          // Hover effects
          "hover:scale-110 active:scale-95",
          voice.isListening
            ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/50"
            : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/30"
        )
      case "minimal":
        return cn(
          base,
          "bg-transparent hover:bg-muted",
          voice.isListening && "text-red-500"
        )
      case "pill":
        return cn(
          "relative rounded-full px-4 py-2 flex items-center gap-2 transition-all duration-200",
          voice.isListening
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-muted hover:bg-muted/80"
        )
      default:
        return cn(
          base,
          voice.isListening
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-muted hover:bg-muted/80"
        )
    }
  }
  
  if (variant === "pill") {
    return (
      <Button
        onClick={handleClick}
        className={getButtonClasses()}
        disabled={voice.isSpeaking}
      >
        {pulseAnimation && (
          <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-25" />
        )}
        {getIcon()}
        <span className="text-sm">
          {voice.isListening ? "Listening..." : "Voice"}
        </span>
        {showStatus && voice.isConnected && (
          <span className="h-2 w-2 rounded-full bg-green-500" />
        )}
      </Button>
    )
  }
  
  return (
    <div className="relative inline-flex flex-col items-center gap-2">
      <Button
        onClick={handleClick}
        className={getButtonClasses()}
        disabled={voice.isSpeaking}
        size="icon"
      >
        {pulseAnimation && (
          <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-25" />
        )}
        {getIcon()}
      </Button>
      
      {showStatus && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className={cn(
            "h-1.5 w-1.5 rounded-full",
            voice.isConnected ? "bg-green-500" : "bg-gray-400"
          )} />
          {voice.isListening ? "Listening" : voice.isSpeaking ? "Speaking" : "Ready"}
        </div>
      )}
      
      {showTranscript && voice.interimTranscript && (
        <div className="absolute top-full mt-2 px-3 py-1.5 bg-muted rounded-lg text-sm max-w-xs truncate">
          {voice.interimTranscript}
        </div>
      )}
    </div>
  )
}

// Floating voice button for global use
export function FloatingVoiceButton(props: Omit<VoiceButtonProps, "variant">) {
  return (
    <VoiceButton 
      {...props} 
      variant="floating" 
      size="lg"
      showStatus={true}
      aria-label="MYCA Voice Assistant"
    />
  )
}

// Minimal voice button for inline use
export function InlineVoiceButton(props: Omit<VoiceButtonProps, "variant">) {
  return <VoiceButton {...props} variant="minimal" size="sm" showStatus={false} />
}
