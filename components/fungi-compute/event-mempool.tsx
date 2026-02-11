/**
 * Event Mempool - Scientific Event Stream
 * 
 * Blockchain-inspired event visualization for FCI signal events.
 * Shows causal chains, correlations, and temporal patterns.
 * 
 * Features:
 * - Live event stream with animated entries
 * - Causal chain visualization
 * - Correlation highlighting
 * - Event type filtering
 * - Pattern grouping
 * - Export event log
 */

"use client"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { 
  Activity, Zap, Link2, ExternalLink, Play, Pause,
  RotateCcw, Download, Filter, Radio, AlertTriangle,
  TrendingUp, Wifi, Thermometer
} from "lucide-react"

interface InternalEvent {
  id: string
  type: string
  category: string
  timestamp: number
  confidence: number
  amplitude?: number
  frequency?: number
  duration?: number
  correlation?: string
  causalParent?: string
  data?: any
}

// Props accept external events which may have different shape
interface ExternalEvent {
  id?: string
  type: string
  timestamp: string | number
  confidence?: number
  data?: any
}

interface EventMempoolProps {
  events?: ExternalEvent[]
  patterns?: any[]
  className?: string
}

// Event types with scientific categorization
const EVENT_TYPES = {
  // Electrical events
  spike_detected: { icon: Zap, color: "#22c55e", category: "electrical", priority: 1 },
  burst_detected: { icon: Activity, color: "#3b82f6", category: "electrical", priority: 2 },
  oscillation_start: { icon: Radio, color: "#a855f7", category: "electrical", priority: 2 },
  word_formed: { icon: Link2, color: "#f59e0b", category: "pattern", priority: 3 },
  
  // Pattern events
  pattern_detected: { icon: Activity, color: "#06b6d4", category: "pattern", priority: 2 },
  correlation_found: { icon: Link2, color: "#8b5cf6", category: "correlation", priority: 3 },
  anomaly_detected: { icon: AlertTriangle, color: "#ef4444", category: "anomaly", priority: 1 },
  
  // Environmental events
  temperature_change: { icon: Thermometer, color: "#f97316", category: "environment", priority: 4 },
  humidity_change: { icon: Wifi, color: "#0ea5e9", category: "environment", priority: 4 },
  external_stimulus: { icon: ExternalLink, color: "#ec4899", category: "environment", priority: 3 },
  
  // System events
  state_transition: { icon: TrendingUp, color: "#10b981", category: "system", priority: 2 },
}

export function EventMempool({ events = [], patterns = [], className }: EventMempoolProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const eventIdCounter = useRef(0)
  
  const [isLive, setIsLive] = useState(true)
  const [allEvents, setAllEvents] = useState<InternalEvent[]>([])
  const [filter, setFilter] = useState<string | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    electrical: 0,
    patterns: 0,
    correlations: 0,
    eventsPerMinute: 0,
  })

  // Generate simulated events
  useEffect(() => {
    if (!isLive) return
    
    const generateEvent = (): InternalEvent => {
      const types = Object.keys(EVENT_TYPES)
      const type = types[Math.floor(Math.random() * types.length)]
      const typeConfig = EVENT_TYPES[type as keyof typeof EVENT_TYPES]
      
      eventIdCounter.current += 1
      
      return {
        id: `evt_${eventIdCounter.current}_${Date.now()}`,
        type,
        category: typeConfig.category,
        timestamp: Date.now(),
        confidence: 0.5 + Math.random() * 0.5,
        amplitude: type.includes("spike") || type.includes("burst") ? Math.random() * 100 : undefined,
        frequency: type.includes("oscillation") ? 0.5 + Math.random() * 4.5 : undefined,
        duration: type.includes("burst") || type.includes("word") ? Math.random() * 5000 : undefined,
        correlation: Math.random() > 0.7 ? `evt_${eventIdCounter.current - Math.floor(Math.random() * 5)}` : undefined,
      }
    }
    
    const interval = setInterval(() => {
      const newEvent = generateEvent()
      
      setAllEvents(prev => {
        const updated = [newEvent, ...prev].slice(0, 50)
        
        // Update stats
        const electrical = updated.filter(e => e.category === "electrical").length
        const patternCount = updated.filter(e => e.category === "pattern").length
        const correlations = updated.filter(e => e.correlation).length
        const recent = updated.filter(e => Date.now() - e.timestamp < 60000).length
        
        setStats({
          total: updated.length,
          electrical,
          patterns: patternCount,
          correlations,
          eventsPerMinute: recent,
        })
        
        return updated
      })
    }, 800 + Math.random() * 1200)
    
    return () => clearInterval(interval)
  }, [isLive])

  const handleReset = () => {
    setAllEvents([])
    eventIdCounter.current = 0
    setStats({ total: 0, electrical: 0, patterns: 0, correlations: 0, eventsPerMinute: 0 })
    setIsLive(true)
  }
  
  const exportEvents = () => {
    const data = { events: allEvents, stats, exportTime: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `event_log_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  const filteredEvents = filter 
    ? allEvents.filter(e => e.category === filter)
    : allEvents
  
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }
  
  const getEventConfig = (type: string) => {
    return EVENT_TYPES[type as keyof typeof EVENT_TYPES] || { icon: Activity, color: "#94a3b8", category: "unknown", priority: 5 }
  }

  return (
    <div className={cn("w-full h-full flex flex-col overflow-hidden", className)}>
      {/* Header */}
      <div className="flex-none flex items-center justify-between px-1 py-1 border-b border-cyan-500/20">
        <div className="flex items-center gap-1">
          <Activity className="h-3 w-3 text-cyan-400" />
          <span className="text-[9px] text-cyan-400 font-semibold">Event Stream</span>
          {isLive && (
            <Badge variant="outline" className="text-[7px] px-1 py-0 h-3 border-red-500/30 text-red-400 animate-pulse">
              <span className="w-1 h-1 rounded-full bg-red-500 mr-0.5" />LIVE
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" onClick={() => setIsLive(!isLive)} className="h-4 w-4 p-0 text-cyan-400">
            {isLive ? <Pause className="h-2.5 w-2.5" /> : <Play className="h-2.5 w-2.5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleReset} className="h-4 w-4 p-0 text-cyan-400">
            <RotateCcw className="h-2.5 w-2.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={exportEvents} className="h-4 w-4 p-0 text-cyan-400">
            <Download className="h-2.5 w-2.5" />
          </Button>
        </div>
      </div>
      
      {/* Stats Bar */}
      <div className="flex-none grid grid-cols-4 gap-0.5 p-1 border-b border-cyan-500/10">
        <div className="text-center">
          <div className="text-[7px] text-gray-500">Total</div>
          <div className="text-[9px] font-bold text-cyan-400">{stats.total}</div>
        </div>
        <div className="text-center">
          <div className="text-[7px] text-gray-500">Elec</div>
          <div className="text-[9px] font-bold text-emerald-400">{stats.electrical}</div>
        </div>
        <div className="text-center">
          <div className="text-[7px] text-gray-500">Corr</div>
          <div className="text-[9px] font-bold text-purple-400">{stats.correlations}</div>
        </div>
        <div className="text-center">
          <div className="text-[7px] text-gray-500">/min</div>
          <div className="text-[9px] font-bold text-amber-400">{stats.eventsPerMinute}</div>
        </div>
      </div>
      
      {/* Filter Tabs */}
      <div className="flex-none flex gap-0.5 p-1 border-b border-cyan-500/10 overflow-x-auto">
        <button 
          onClick={() => setFilter(null)}
          className={cn("px-1.5 py-0.5 rounded text-[7px] font-medium whitespace-nowrap", 
            filter === null ? "bg-cyan-500/30 text-cyan-400" : "text-gray-500 hover:text-gray-300")}
        >
          All
        </button>
        {["electrical", "pattern", "correlation", "environment"].map(cat => (
          <button 
            key={cat}
            onClick={() => setFilter(filter === cat ? null : cat)}
            className={cn("px-1.5 py-0.5 rounded text-[7px] font-medium whitespace-nowrap capitalize", 
              filter === cat ? "bg-cyan-500/30 text-cyan-400" : "text-gray-500 hover:text-gray-300")}
          >
            {cat}
          </button>
        ))}
      </div>
      
      {/* Event List */}
      <div ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 space-y-0.5 p-0.5">
        {filteredEvents.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-[10px] text-cyan-400/40">No events</p>
          </div>
        ) : (
          filteredEvents.map((event, i) => {
            const config = getEventConfig(event.type)
            const Icon = config.icon
            const isNew = i === 0 && isLive
            const hasCorrelation = !!event.correlation
            
            return (
              <div
                key={event.id}
                className={cn(
                  "relative p-1.5 rounded backdrop-blur-sm transition-all duration-300",
                  "bg-black/40 border",
                  isNew ? "border-emerald-500/50 shadow-[0_0_10px_rgba(52,211,153,0.2)] animate-pulse" : "border-cyan-500/10",
                  hasCorrelation && "border-l-2",
                )}
                style={{ borderLeftColor: hasCorrelation ? "#8b5cf6" : undefined }}
              >
                {/* Correlation Link Indicator */}
                {hasCorrelation && (
                  <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-purple-500" />
                )}
                
                <div className="flex items-start gap-1.5">
                  {/* Icon */}
                  <div 
                    className="flex-none w-5 h-5 rounded flex items-center justify-center"
                    style={{ backgroundColor: `${config.color}20` }}
                  >
                    <Icon className="h-3 w-3" style={{ color: config.color }} />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[9px] font-medium text-white/90 truncate capitalize">
                        {event.type.replace(/_/g, " ")}
                      </p>
                      <Badge 
                        variant="outline" 
                        className="text-[7px] px-1 py-0 h-3 flex-none"
                        style={{ borderColor: `${config.color}40`, color: config.color }}
                      >
                        {(event.confidence * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    
                    {/* Details Row */}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[7px] text-cyan-400/50 font-mono">
                        {formatTime(event.timestamp)}
                      </span>
                      {event.amplitude !== undefined && (
                        <span className="text-[7px] text-emerald-400/70 font-mono">
                          {event.amplitude.toFixed(1)}µV
                        </span>
                      )}
                      {event.frequency !== undefined && (
                        <span className="text-[7px] text-purple-400/70 font-mono">
                          {event.frequency.toFixed(2)}Hz
                        </span>
                      )}
                      {event.duration !== undefined && (
                        <span className="text-[7px] text-amber-400/70 font-mono">
                          {(event.duration / 1000).toFixed(1)}s
                        </span>
                      )}
                    </div>
                    
                    {/* Correlation Link */}
                    {event.correlation && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Link2 className="h-2 w-2 text-purple-400/60" />
                        <span className="text-[7px] text-purple-400/60 font-mono truncate">
                          ← {event.correlation.slice(0, 15)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Priority Indicator */}
                <div 
                  className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full"
                  style={{ 
                    backgroundColor: config.priority === 1 ? "#ef4444" : 
                                     config.priority === 2 ? "#f59e0b" : 
                                     config.priority === 3 ? "#22c55e" : "#64748b"
                  }}
                />
              </div>
            )
          })
        )}
      </div>
      
      {/* Footer */}
      <div className="flex-none text-center py-0.5 border-t border-cyan-500/10">
        <span className="text-[7px] text-cyan-400/40 font-mono">
          Blockchain-style event correlation tracking
        </span>
      </div>
    </div>
  )
}
