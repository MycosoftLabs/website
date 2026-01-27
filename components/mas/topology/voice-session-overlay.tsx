"use client"

/**
 * Voice Session Overlay for Topology Dashboard - January 27, 2026
 * Shows active voice sessions and their connections to agents
 */

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Mic, MicOff, Activity, Clock, Zap, Phone, PhoneOff, Volume2 } from "lucide-react"

interface VoiceSession {
  session_id: string
  conversation_id: string
  mode: "personaplex" | "elevenlabs"
  persona: string
  voice_prompt?: string
  started_at: string
  last_activity: string
  turn_count: number
  tool_count: number
  is_active: boolean
}

interface VoiceStats {
  active_sessions: number
  total_sessions: number
  total_turns: number
  total_tool_invocations: number
}

interface VoiceSessionOverlayProps {
  onHighlightAgent?: (agentId: string) => void
  className?: string
}

export function VoiceSessionOverlay({ onHighlightAgent, className }: VoiceSessionOverlayProps) {
  const [sessions, setSessions] = useState<VoiceSession[]>([])
  const [stats, setStats] = useState<VoiceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetchSessions()
    const interval = setInterval(fetchSessions, 5000) // Poll every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/mas/voice/sessions")
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
        setStats(data.stats || null)
      }
      setLoading(false)
    } catch (e) {
      console.error("Failed to fetch voice sessions:", e)
      setError("Failed to load sessions")
      setLoading(false)
    }
  }

  const endSession = async (sessionId: string) => {
    try {
      await fetch(`/api/mas/voice/sessions?session_id=${sessionId}`, {
        method: "DELETE",
      })
      fetchSessions()
    } catch (e) {
      console.error("Failed to end session:", e)
    }
  }

  const activeSessions = sessions.filter(s => s.is_active)

  if (loading) {
    return (
      <Card className={`${className} opacity-75`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-muted animate-pulse" />
            <span className="text-sm text-muted-foreground">Loading voice sessions...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`${className} transition-all duration-300`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            Voice Sessions
            {activeSessions.length > 0 && (
              <Badge variant="default" className="ml-2 animate-pulse">
                {activeSessions.length} Active
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Collapse" : "Expand"}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="text-center p-2 rounded bg-muted/50">
              <div className="text-lg font-bold">{stats.active_sessions}</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
            <div className="text-center p-2 rounded bg-muted/50">
              <div className="text-lg font-bold">{stats.total_sessions}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center p-2 rounded bg-muted/50">
              <div className="text-lg font-bold">{stats.total_turns}</div>
              <div className="text-xs text-muted-foreground">Turns</div>
            </div>
            <div className="text-center p-2 rounded bg-muted/50">
              <div className="text-lg font-bold">{stats.total_tool_invocations}</div>
              <div className="text-xs text-muted-foreground">Tools</div>
            </div>
          </div>
        )}

        {/* No Sessions */}
        {activeSessions.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            <MicOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No active voice sessions
          </div>
        )}

        {/* Active Sessions List */}
        {expanded && activeSessions.length > 0 && (
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {activeSessions.map((session) => (
                <div
                  key={session.session_id}
                  className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="font-medium text-sm">
                        {session.mode === "personaplex" ? "PersonaPlex" : "ElevenLabs"}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {session.persona}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => endSession(session.session_id)}
                    >
                      <PhoneOff className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      {session.turn_count} turns
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      {session.tool_count} tools
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {getElapsedTime(session.started_at)}
                    </div>
                  </div>

                  {/* Voice prompt indicator for PersonaPlex */}
                  {session.voice_prompt && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Voice: {session.voice_prompt}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Compact Active Sessions */}
        {!expanded && activeSessions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeSessions.slice(0, 3).map((session) => (
              <Badge
                key={session.session_id}
                variant="outline"
                className="gap-1 cursor-pointer hover:bg-accent"
                onClick={() => onHighlightAgent?.("myca-orchestrator")}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                {session.mode === "personaplex" ? "PP" : "EL"}
                <span className="text-muted-foreground">|</span>
                {session.turn_count}t
              </Badge>
            ))}
            {activeSessions.length > 3 && (
              <Badge variant="secondary">+{activeSessions.length - 3} more</Badge>
            )}
          </div>
        )}

        {/* Link to Voice Duplex Page */}
        <div className="mt-3 pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => window.open("/myca/voice-duplex", "_blank")}
          >
            <Phone className="h-4 w-4" />
            Open Voice Interface
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function getElapsedTime(startedAt: string): string {
  const start = new Date(startedAt)
  const now = new Date()
  const diffMs = now.getTime() - start.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return "<1m"
  if (diffMins < 60) return `${diffMins}m`
  const hours = Math.floor(diffMins / 60)
  return `${hours}h ${diffMins % 60}m`
}

export default VoiceSessionOverlay
