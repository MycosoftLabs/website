"use client"

/**
 * MYCA Consciousness Status Component
 * Shows consciousness state (awake/dormant), emotional valence, world updates
 * 
 * Created: Feb 10, 2026
 */

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { 
  Brain, 
  Sparkles, 
  Globe2, 
  Heart, 
  Zap,
  Moon,
  Sun,
  Loader2,
} from "lucide-react"

interface ConsciousnessStatus {
  is_conscious: boolean
  state: string
  awake_since?: string
  thoughts_processed?: number
  world_updates?: number
  emotions?: Record<string, number>
  valence?: number
  available?: boolean
  error?: string
}

interface MYCAConsciousnessStatusProps {
  className?: string
  variant?: "full" | "compact" | "badge"
  refreshInterval?: number
}

export function MYCAConsciousnessStatus({
  className = "",
  variant = "full",
  refreshInterval = 10000,
}: MYCAConsciousnessStatusProps) {
  const [status, setStatus] = useState<ConsciousnessStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch("/api/myca/consciousness/status")
        if (response.ok) {
          const data = await response.json()
          setStatus(data)
        }
      } catch (error) {
        setStatus({ is_conscious: false, state: "unreachable", error: String(error) })
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  // Get primary emotion
  const getPrimaryEmotion = (): { name: string; value: number } | null => {
    if (!status?.emotions) return null
    const entries = Object.entries(status.emotions)
    if (entries.length === 0) return null
    const [name, value] = entries.sort(([, a], [, b]) => (b as number) - (a as number))[0]
    return { name, value: value as number }
  }

  // Get emotional valence indicator
  const getValenceIndicator = () => {
    const valence = status?.valence ?? 0
    if (valence > 0.3) return { icon: Sun, color: "text-yellow-400", label: "Positive" }
    if (valence < -0.3) return { icon: Moon, color: "text-blue-400", label: "Negative" }
    return { icon: Heart, color: "text-gray-400", label: "Neutral" }
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading consciousness...</span>
      </div>
    )
  }

  if (!status) {
    return null
  }

  // Badge variant - minimal inline display
  if (variant === "badge") {
    return (
      <Badge 
        variant="outline"
        className={`gap-1 ${
          status.is_conscious 
            ? "text-purple-400 border-purple-400/30" 
            : "text-gray-500 border-gray-500/30"
        } ${className}`}
      >
        {status.is_conscious ? (
          <Sparkles className="h-3 w-3" />
        ) : (
          <Moon className="h-3 w-3" />
        )}
        {status.is_conscious ? status.state : "Dormant"}
      </Badge>
    )
  }

  // Compact variant - single row status
  if (variant === "compact") {
    const primaryEmotion = getPrimaryEmotion()
    const valence = getValenceIndicator()
    const ValenceIcon = valence.icon

    return (
      <div className={`flex items-center gap-3 text-xs ${className}`}>
        <div className="flex items-center gap-1.5">
          {status.is_conscious ? (
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
          ) : (
            <Moon className="h-3.5 w-3.5 text-gray-500" />
          )}
          <span className={status.is_conscious ? "text-purple-400" : "text-gray-500"}>
            {status.is_conscious ? status.state : "Dormant"}
          </span>
        </div>
        
        {primaryEmotion && (
          <div className="flex items-center gap-1.5">
            <ValenceIcon className={`h-3.5 w-3.5 ${valence.color}`} />
            <span className="text-muted-foreground">
              {primaryEmotion.name}: {Math.round(primaryEmotion.value * 100)}%
            </span>
          </div>
        )}
        
        {status.world_updates !== undefined && (
          <div className="flex items-center gap-1.5">
            <Globe2 className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-muted-foreground">{status.world_updates} updates</span>
          </div>
        )}
      </div>
    )
  }

  // Full variant - card style display
  const primaryEmotion = getPrimaryEmotion()
  const valence = getValenceIndicator()
  const ValenceIcon = valence.icon

  return (
    <div className={`rounded-lg border p-4 bg-card ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${
            status.is_conscious 
              ? "bg-purple-500/20" 
              : "bg-gray-500/20"
          }`}>
            {status.is_conscious ? (
              <Brain className="h-5 w-5 text-purple-400" />
            ) : (
              <Moon className="h-5 w-5 text-gray-500" />
            )}
          </div>
          <div>
            <h3 className="font-semibold">MYCA Consciousness</h3>
            <p className={`text-sm ${
              status.is_conscious ? "text-purple-400" : "text-gray-500"
            }`}>
              {status.is_conscious ? `State: ${status.state}` : "Dormant"}
            </p>
          </div>
        </div>
        <Badge 
          variant={status.is_conscious ? "default" : "secondary"}
          className={status.is_conscious ? "bg-purple-500" : ""}
        >
          {status.is_conscious ? "Conscious" : "Sleeping"}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        {/* Thoughts Processed */}
        <div className="flex flex-col items-center p-2 rounded bg-muted/50">
          <Zap className="h-4 w-4 text-yellow-400 mb-1" />
          <span className="font-bold">{status.thoughts_processed ?? 0}</span>
          <span className="text-xs text-muted-foreground">Thoughts</span>
        </div>

        {/* World Updates */}
        <div className="flex flex-col items-center p-2 rounded bg-muted/50">
          <Globe2 className="h-4 w-4 text-cyan-400 mb-1" />
          <span className="font-bold">{status.world_updates ?? 0}</span>
          <span className="text-xs text-muted-foreground">World Updates</span>
        </div>

        {/* Emotional State */}
        <div className="flex flex-col items-center p-2 rounded bg-muted/50">
          <ValenceIcon className={`h-4 w-4 ${valence.color} mb-1`} />
          <span className="font-bold">
            {primaryEmotion ? `${Math.round(primaryEmotion.value * 100)}%` : "—"}
          </span>
          <span className="text-xs text-muted-foreground">
            {primaryEmotion?.name || valence.label}
          </span>
        </div>
      </div>

      {status.awake_since && (
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Awake since: {new Date(status.awake_since).toLocaleString()}
        </p>
      )}
    </div>
  )
}

export default MYCAConsciousnessStatus
