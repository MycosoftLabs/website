"use client"

/**
 * MYCA Identity Card Component
 * Displays MYCA's identity information: name, creator, purpose, beliefs
 * 
 * Created: Feb 10, 2026
 */

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Brain, 
  User,
  Target,
  Heart,
  Lightbulb,
  Loader2,
  Sparkles,
} from "lucide-react"

interface MYCAIdentity {
  name: string
  full_name?: string
  creator?: string
  purpose?: string
  core_beliefs?: string[]
  personality_traits?: string[]
  capabilities?: string[]
  version?: string
  available?: boolean
  error?: string
}

interface MYCAIdentityCardProps {
  className?: string
  variant?: "full" | "compact"
}

export function MYCAIdentityCard({
  className = "",
  variant = "full",
}: MYCAIdentityCardProps) {
  const [identity, setIdentity] = useState<MYCAIdentity | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchIdentity = async () => {
      try {
        const response = await fetch("/api/myca/consciousness/identity")
        if (response.ok) {
          const data = await response.json()
          setIdentity(data)
        }
      } catch (error) {
        setIdentity({ name: "MYCA", error: String(error), available: false })
      } finally {
        setLoading(false)
      }
    }

    fetchIdentity()
  }, [])

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!identity) {
    return null
  }

  // Compact variant
  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <Avatar className="h-10 w-10">
          <AvatarImage src="/images/myca-avatar.png" />
          <AvatarFallback className="bg-purple-500/20 text-purple-400">
            <Brain className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            {identity.name}
            {identity.available && (
              <Sparkles className="h-4 w-4 text-purple-400" />
            )}
          </h3>
          <p className="text-sm text-muted-foreground">
            {identity.full_name || "Mycosoft Cognitive Agent"}
          </p>
        </div>
      </div>
    )
  }

  // Full variant
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src="/images/myca-avatar.png" />
            <AvatarFallback className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-purple-400">
              <Brain className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {identity.name}
              {identity.available && (
                <Badge className="bg-purple-500">Active</Badge>
              )}
            </CardTitle>
            <p className="text-muted-foreground">
              {identity.full_name || "Mycosoft Cognitive Agent"}
            </p>
            {identity.version && (
              <Badge variant="outline" className="mt-1 text-xs">
                v{identity.version}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Creator */}
        {identity.creator && (
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-sm">Creator</h4>
              <p className="text-sm text-muted-foreground">{identity.creator}</p>
            </div>
          </div>
        )}

        {/* Purpose */}
        {identity.purpose && (
          <div className="flex items-start gap-3">
            <Target className="h-5 w-5 text-green-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-sm">Purpose</h4>
              <p className="text-sm text-muted-foreground">{identity.purpose}</p>
            </div>
          </div>
        )}

        {/* Core Beliefs */}
        {identity.core_beliefs && identity.core_beliefs.length > 0 && (
          <div className="flex items-start gap-3">
            <Heart className="h-5 w-5 text-red-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-sm mb-1">Core Beliefs</h4>
              <div className="flex flex-wrap gap-1">
                {identity.core_beliefs.slice(0, 5).map((belief, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {belief}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Personality Traits */}
        {identity.personality_traits && identity.personality_traits.length > 0 && (
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-yellow-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-sm mb-1">Personality</h4>
              <div className="flex flex-wrap gap-1">
                {identity.personality_traits.slice(0, 5).map((trait, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {trait}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {!identity.available && identity.error && (
          <p className="text-xs text-muted-foreground text-center italic">
            Identity data may be incomplete (consciousness unavailable)
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default MYCAIdentityCard
