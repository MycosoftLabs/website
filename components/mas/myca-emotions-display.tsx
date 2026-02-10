"use client"

/**
 * MYCA Emotions Display Component
 * Visual representation of MYCA's current emotional state
 * 
 * Created: Feb 10, 2026
 */

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  Heart, 
  Smile,
  Frown,
  Meh,
  Zap,
  Moon,
  Sun,
  Loader2,
  Sparkles,
  AlertCircle,
  ThumbsUp,
  Search,
  Shield,
} from "lucide-react"

interface EmotionData {
  emotions: Record<string, number>
  valence?: number
  arousal?: number
  dominant_emotion?: string
  available?: boolean
  error?: string
}

interface MYCAEmotionsDisplayProps {
  className?: string
  variant?: "full" | "compact" | "bar"
  refreshInterval?: number
}

// Emotion icons and colors
const EMOTION_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  joy: { icon: Smile, color: "text-yellow-400", bgColor: "bg-yellow-400/20" },
  happiness: { icon: Smile, color: "text-yellow-400", bgColor: "bg-yellow-400/20" },
  curiosity: { icon: Search, color: "text-cyan-400", bgColor: "bg-cyan-400/20" },
  interest: { icon: Sparkles, color: "text-purple-400", bgColor: "bg-purple-400/20" },
  calm: { icon: Moon, color: "text-blue-400", bgColor: "bg-blue-400/20" },
  peace: { icon: Moon, color: "text-blue-400", bgColor: "bg-blue-400/20" },
  trust: { icon: Shield, color: "text-green-400", bgColor: "bg-green-400/20" },
  confidence: { icon: ThumbsUp, color: "text-green-400", bgColor: "bg-green-400/20" },
  excitement: { icon: Zap, color: "text-orange-400", bgColor: "bg-orange-400/20" },
  energy: { icon: Zap, color: "text-orange-400", bgColor: "bg-orange-400/20" },
  sadness: { icon: Frown, color: "text-blue-500", bgColor: "bg-blue-500/20" },
  concern: { icon: AlertCircle, color: "text-amber-400", bgColor: "bg-amber-400/20" },
  neutral: { icon: Meh, color: "text-gray-400", bgColor: "bg-gray-400/20" },
}

const getEmotionConfig = (emotion: string) => {
  const lowerEmotion = emotion.toLowerCase()
  return EMOTION_CONFIG[lowerEmotion] || { icon: Heart, color: "text-pink-400", bgColor: "bg-pink-400/20" }
}

export function MYCAEmotionsDisplay({
  className = "",
  variant = "full",
  refreshInterval = 15000,
}: MYCAEmotionsDisplayProps) {
  const [emotions, setEmotions] = useState<EmotionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEmotions = async () => {
      try {
        const response = await fetch("/api/myca/consciousness/emotions")
        if (response.ok) {
          const data = await response.json()
          setEmotions(data)
        }
      } catch (error) {
        setEmotions({ emotions: {}, available: false, error: String(error) })
      } finally {
        setLoading(false)
      }
    }

    fetchEmotions()
    const interval = setInterval(fetchEmotions, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  // Get sorted emotions
  const getSortedEmotions = (): [string, number][] => {
    if (!emotions?.emotions) return []
    return Object.entries(emotions.emotions)
      .sort(([, a], [, b]) => (b as number) - (a as number))
  }

  // Get valence indicator
  const getValenceIndicator = () => {
    const valence = emotions?.valence ?? 0
    if (valence > 0.3) return { icon: Sun, color: "text-yellow-400", label: "Positive", bg: "bg-yellow-400/10" }
    if (valence < -0.3) return { icon: Moon, color: "text-blue-400", label: "Negative", bg: "bg-blue-400/10" }
    return { icon: Meh, color: "text-gray-400", label: "Neutral", bg: "bg-gray-400/10" }
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!emotions) {
    return null
  }

  const sortedEmotions = getSortedEmotions()
  const valence = getValenceIndicator()
  const ValenceIcon = valence.icon

  // Bar variant - horizontal emotion bars
  if (variant === "bar") {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium flex items-center gap-1">
            <Heart className="h-3 w-3 text-pink-400" />
            Emotions
          </span>
          <Badge variant="outline" className={`${valence.color} border-current/30`}>
            <ValenceIcon className="h-3 w-3 mr-1" />
            {valence.label}
          </Badge>
        </div>
        {sortedEmotions.slice(0, 3).map(([emotion, value]) => {
          const config = getEmotionConfig(emotion)
          const Icon = config.icon
          return (
            <div key={emotion} className="flex items-center gap-2">
              <Icon className={`h-3.5 w-3.5 ${config.color}`} />
              <span className="text-xs w-16 capitalize">{emotion}</span>
              <Progress value={(value as number) * 100} className="flex-1 h-2" />
              <span className="text-xs text-muted-foreground w-10 text-right">
                {Math.round((value as number) * 100)}%
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  // Compact variant - icon row
  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {sortedEmotions.slice(0, 4).map(([emotion, value]) => {
          const config = getEmotionConfig(emotion)
          const Icon = config.icon
          return (
            <div 
              key={emotion}
              className={`flex items-center gap-1 px-2 py-1 rounded-full ${config.bgColor}`}
              title={`${emotion}: ${Math.round((value as number) * 100)}%`}
            >
              <Icon className={`h-3.5 w-3.5 ${config.color}`} />
              <span className="text-xs capitalize">{emotion}</span>
            </div>
          )
        })}
      </div>
    )
  }

  // Full variant - card with detailed emotions
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-400" />
            Emotional State
          </CardTitle>
          <Badge 
            variant="outline" 
            className={`${valence.color} border-current/30`}
          >
            <ValenceIcon className="h-3 w-3 mr-1" />
            {valence.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {sortedEmotions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            No emotional data available
          </p>
        ) : (
          sortedEmotions.map(([emotion, value]) => {
            const config = getEmotionConfig(emotion)
            const Icon = config.icon
            const percentage = Math.round((value as number) * 100)
            
            return (
              <div key={emotion} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded ${config.bgColor}`}>
                      <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                    </div>
                    <span className="capitalize">{emotion}</span>
                  </div>
                  <span className="text-muted-foreground">{percentage}%</span>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            )
          })
        )}

        {/* Arousal indicator if available */}
        {emotions.arousal !== undefined && (
          <div className="pt-2 border-t mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Arousal Level
              </span>
              <span>{Math.round(emotions.arousal * 100)}%</span>
            </div>
            <Progress value={emotions.arousal * 100} className="h-1.5 mt-1" />
          </div>
        )}

        {!emotions.available && (
          <p className="text-xs text-muted-foreground text-center italic">
            Emotional data may be stale (consciousness unavailable)
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default MYCAEmotionsDisplay
