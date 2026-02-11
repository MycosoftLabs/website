"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Activity, Zap, HardDrive, Cpu, Network } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Voice System Health Dashboard
 * Created: February 11, 2026
 * 
 * Admin page showing PersonaPlex system status:
 * - PersonaPlex Bridge connection
 * - Moshi server status
 * - Active voice sessions
 * - Latency metrics (STT, LLM, TTS)
 * - GPU utilization
 * - Recent errors
 */

interface HealthStatus {
  personaplex: {
    connected: boolean
    latency: number
    url: string
  }
  moshi: {
    online: boolean
    latency: number
    url: string
  }
  mas: {
    online: boolean
    latency: number
    url: string
  }
  gpu?: {
    available: boolean
    usage: number
    vram: number
    vramTotal: number
  }
}

interface VoiceMetrics {
  activeSessions: number
  totalSessions: number
  avgLatency: {
    stt: number // Speech-to-text
    llm: number // LLM response
    tts: number // Text-to-speech
    total: number
  }
  recentQueries: Array<{
    timestamp: string
    query: string
    latency: number
    success: boolean
  }>
  errors: Array<{
    timestamp: string
    error: string
    stack?: string
  }>
}

export default function VoiceHealthDashboard() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [metrics, setMetrics] = useState<VoiceMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  
  const fetchHealth = async () => {
    try {
      setLoading(true)
      
      // Check PersonaPlex Bridge
      const personaplexUrl = process.env.NEXT_PUBLIC_PERSONAPLEX_WS_URL?.replace('ws://', 'http://').replace('wss://', 'https://').replace('/api/chat', '/health') || 'http://localhost:8999/health'
      const personaplexStart = Date.now()
      const personaplexRes = await fetch(personaplexUrl).catch(() => null)
      const personaplexLatency = Date.now() - personaplexStart
      
      // Check Moshi server
      const moshiUrl = 'http://localhost:8998/health'
      const moshiStart = Date.now()
      const moshiRes = await fetch(moshiUrl).catch(() => null)
      const moshiLatency = Date.now() - moshiStart
      
      // Check MAS Orchestrator
      const masUrl = process.env.NEXT_PUBLIC_MAS_URL || 'http://192.168.0.188:8001'
      const masStart = Date.now()
      const masRes = await fetch(`${masUrl}/health`).catch(() => null)
      const masLatency = Date.now() - masStart
      
      setHealth({
        personaplex: {
          connected: personaplexRes?.ok || false,
          latency: personaplexRes?.ok ? personaplexLatency : -1,
          url: personaplexUrl,
        },
        moshi: {
          online: moshiRes?.ok || false,
          latency: moshiRes?.ok ? moshiLatency : -1,
          url: moshiUrl,
        },
        mas: {
          online: masRes?.ok || false,
          latency: masRes?.ok ? masLatency : -1,
          url: masUrl,
        },
        gpu: {
          available: false, // Would need actual GPU metrics API
          usage: 0,
          vram: 0,
          vramTotal: 0,
        },
      })
      
      // Fetch metrics (mock for now - would come from real API)
      setMetrics({
        activeSessions: 0,
        totalSessions: 0,
        avgLatency: {
          stt: 450,
          llm: 1200,
          tts: 650,
          total: 2300,
        },
        recentQueries: [],
        errors: [],
      })
    } catch (error) {
      console.error('[VoiceHealth] Error fetching health:', error)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchHealth()
    
    if (autoRefresh) {
      const interval = setInterval(fetchHealth, 10000) // Refresh every 10s
      return () => clearInterval(interval)
    }
  }, [autoRefresh])
  
  const getStatusColor = (isOnline: boolean) => {
    return isOnline ? 'bg-green-500' : 'bg-red-500'
  }
  
  const getLatencyColor = (latency: number) => {
    if (latency < 0) return 'text-red-500'
    if (latency < 500) return 'text-green-500'
    if (latency < 1500) return 'text-yellow-500'
    return 'text-red-500'
  }
  
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Voice System Health</h1>
          <p className="text-muted-foreground">
            PersonaPlex + MYCA Voice Infrastructure
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className={cn(
              "h-4 w-4 mr-2",
              autoRefresh && "animate-pulse text-green-500"
            )} />
            {autoRefresh ? "Auto-Refresh ON" : "Auto-Refresh OFF"}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={fetchHealth}
            disabled={loading}
          >
            <RefreshCw className={cn(
              "h-4 w-4 mr-2",
              loading && "animate-spin"
            )} />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Service Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* PersonaPlex Bridge */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Network className="h-4 w-4" />
              PersonaPlex Bridge
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge
                variant={health?.personaplex.connected ? "default" : "destructive"}
                className="gap-1"
              >
                <span className={cn(
                  "h-2 w-2 rounded-full",
                  getStatusColor(health?.personaplex.connected || false)
                )} />
                {health?.personaplex.connected ? "Connected" : "Offline"}
              </Badge>
              
              {health?.personaplex.latency && health.personaplex.latency > 0 && (
                <span className={cn(
                  "text-sm font-mono",
                  getLatencyColor(health.personaplex.latency)
                )}>
                  {health.personaplex.latency}ms
                </span>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground mt-2 truncate">
              {health?.personaplex.url || 'Loading...'}
            </p>
          </CardContent>
        </Card>
        
        {/* Moshi Server */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              Moshi STT/TTS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge
                variant={health?.moshi.online ? "default" : "destructive"}
                className="gap-1"
              >
                <span className={cn(
                  "h-2 w-2 rounded-full",
                  getStatusColor(health?.moshi.online || false)
                )} />
                {health?.moshi.online ? "Online" : "Offline"}
              </Badge>
              
              {health?.moshi.latency && health.moshi.latency > 0 && (
                <span className={cn(
                  "text-sm font-mono",
                  getLatencyColor(health.moshi.latency)
                )}>
                  {health.moshi.latency}ms
                </span>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground mt-2 truncate">
              {health?.moshi.url || 'Loading...'}
            </p>
          </CardContent>
        </Card>
        
        {/* MAS Orchestrator */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              MAS Orchestrator
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge
                variant={health?.mas.online ? "default" : "destructive"}
                className="gap-1"
              >
                <span className={cn(
                  "h-2 w-2 rounded-full",
                  getStatusColor(health?.mas.online || false)
                )} />
                {health?.mas.online ? "Online" : "Offline"}
              </Badge>
              
              {health?.mas.latency && health.mas.latency > 0 && (
                <span className={cn(
                  "text-sm font-mono",
                  getLatencyColor(health.mas.latency)
                )}>
                  {health.mas.latency}ms
                </span>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground mt-2 truncate">
              {health?.mas.url || 'Loading...'}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Session Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Active Sessions</CardTitle>
            <CardDescription>Current and total voice sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Now</span>
                <span className="text-2xl font-bold">{metrics?.activeSessions || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Today</span>
                <span className="text-lg font-mono">{metrics?.totalSessions || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Latency Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Average Latency</CardTitle>
            <CardDescription>Voice processing pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Speech-to-Text</span>
                <span className={cn(
                  "text-sm font-mono",
                  getLatencyColor(metrics?.avgLatency.stt || 0)
                )}>
                  {metrics?.avgLatency.stt || 0}ms
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">LLM Response</span>
                <span className={cn(
                  "text-sm font-mono",
                  getLatencyColor(metrics?.avgLatency.llm || 0)
                )}>
                  {metrics?.avgLatency.llm || 0}ms
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Text-to-Speech</span>
                <span className={cn(
                  "text-sm font-mono",
                  getLatencyColor(metrics?.avgLatency.tts || 0)
                )}>
                  {metrics?.avgLatency.tts || 0}ms
                </span>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Total</span>
                <span className={cn(
                  "text-lg font-bold font-mono",
                  getLatencyColor(metrics?.avgLatency.total || 0)
                )}>
                  {metrics?.avgLatency.total || 0}ms
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* GPU Status */}
      {health?.gpu && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              GPU Status
            </CardTitle>
            <CardDescription>CUDA device utilization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-sm text-muted-foreground block mb-1">Available</span>
                <Badge variant={health.gpu.available ? "default" : "destructive"}>
                  {health.gpu.available ? "Yes" : "No"}
                </Badge>
              </div>
              <div>
                <span className="text-sm text-muted-foreground block mb-1">GPU Usage</span>
                <span className="text-2xl font-bold">{health.gpu.usage}%</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground block mb-1">VRAM</span>
                <span className="text-lg font-mono">
                  {health.gpu.vram}GB / {health.gpu.vramTotal}GB
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Recent Queries */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Recent Voice Queries</CardTitle>
          <CardDescription>Last 10 voice search queries</CardDescription>
        </CardHeader>
        <CardContent>
          {metrics?.recentQueries && metrics.recentQueries.length > 0 ? (
            <div className="space-y-2">
              {metrics.recentQueries.map((query, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted">
                  <div className="flex-1">
                    <span className="text-sm font-medium">{query.query}</span>
                    <span className="text-xs text-muted-foreground block">
                      {new Date(query.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs font-mono",
                      getLatencyColor(query.latency)
                    )}>
                      {query.latency}ms
                    </span>
                    <Badge variant={query.success ? "default" : "destructive"} className="text-xs">
                      {query.success ? "✓" : "✗"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No recent queries. Voice system ready for use.
            </p>
          )}
        </CardContent>
      </Card>
      
      {/* Recent Errors */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Errors</CardTitle>
          <CardDescription>Voice system errors and warnings</CardDescription>
        </CardHeader>
        <CardContent>
          {metrics?.errors && metrics.errors.length > 0 ? (
            <div className="space-y-2">
              {metrics.errors.map((error, i) => (
                <div key={i} className="p-3 rounded-lg bg-destructive/10 border border-destructive">
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-sm font-medium text-destructive">{error.error}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(error.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {error.stack && (
                    <pre className="text-xs text-muted-foreground overflow-x-auto mt-2 p-2 bg-muted rounded">
                      {error.stack}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No errors. System operating normally.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
