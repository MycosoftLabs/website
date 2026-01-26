"use client"

/**
 * Connection Legend Component
 * Visual guide explaining all connection types, colors, and dot meanings
 * 
 * Created: Jan 26, 2026
 * 
 * Features:
 * - Color key for all connection types
 * - Dot type explanations
 * - Line style meanings
 * - Interactive: hover to highlight matching connections
 * - Toggle filters: show/hide connection types
 */

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Info,
  ChevronDown,
  ChevronUp,
  Circle,
  Minus,
  ArrowRight,
  ArrowLeftRight,
  Zap,
  MessageSquare,
  Database,
  Radio,
  Repeat,
  Heart,
  Megaphone,
  Bell,
  Code,
  X,
  Filter,
} from "lucide-react"
import {
  CONNECTION_COLORS,
  PACKET_COLORS,
  type ConnectionType,
  type PacketType,
  type LineStyle,
} from "./types"

interface ConnectionLegendProps {
  isOpen: boolean
  onClose: () => void
  visibleTypes?: Set<ConnectionType>
  onToggleType?: (type: ConnectionType) => void
  onHoverType?: (type: ConnectionType | null) => void
}

interface LegendItem {
  type: ConnectionType
  icon: React.ReactNode
  label: string
  description: string
  color: string
}

interface PacketLegendItem {
  type: PacketType
  label: string
  description: string
  color: string
}

interface LineStyleItem {
  style: LineStyle
  label: string
  description: string
  visual: React.ReactNode
}

const CONNECTION_LEGEND_ITEMS: LegendItem[] = [
  {
    type: "data",
    icon: <Database className="h-3.5 w-3.5" />,
    label: "Data",
    description: "Data transfer between agents/services",
    color: CONNECTION_COLORS.data,
  },
  {
    type: "message",
    icon: <MessageSquare className="h-3.5 w-3.5" />,
    label: "Message",
    description: "Event and message passing",
    color: CONNECTION_COLORS.message,
  },
  {
    type: "command",
    icon: <Zap className="h-3.5 w-3.5" />,
    label: "Command",
    description: "Control commands and instructions",
    color: CONNECTION_COLORS.command,
  },
  {
    type: "query",
    icon: <Database className="h-3.5 w-3.5" />,
    label: "Query",
    description: "Database queries and responses",
    color: CONNECTION_COLORS.query,
  },
  {
    type: "stream",
    icon: <Radio className="h-3.5 w-3.5" />,
    label: "Stream",
    description: "Real-time data streaming",
    color: CONNECTION_COLORS.stream,
  },
  {
    type: "sync",
    icon: <Repeat className="h-3.5 w-3.5" />,
    label: "Sync",
    description: "State synchronization",
    color: CONNECTION_COLORS.sync,
  },
  {
    type: "heartbeat",
    icon: <Heart className="h-3.5 w-3.5" />,
    label: "Heartbeat",
    description: "Health check and keepalive pings",
    color: CONNECTION_COLORS.heartbeat,
  },
  {
    type: "broadcast",
    icon: <Megaphone className="h-3.5 w-3.5" />,
    label: "Broadcast",
    description: "One-to-many message broadcast",
    color: CONNECTION_COLORS.broadcast,
  },
  {
    type: "subscribe",
    icon: <Bell className="h-3.5 w-3.5" />,
    label: "Subscribe",
    description: "Pub/sub topic subscription",
    color: CONNECTION_COLORS.subscribe,
  },
  {
    type: "rpc",
    icon: <Code className="h-3.5 w-3.5" />,
    label: "RPC",
    description: "Remote procedure call",
    color: CONNECTION_COLORS.rpc,
  },
]

const PACKET_LEGEND_ITEMS: PacketLegendItem[] = [
  {
    type: "request",
    label: "Request",
    description: "Outgoing request packet",
    color: PACKET_COLORS.request,
  },
  {
    type: "response",
    label: "Response",
    description: "Incoming response packet",
    color: PACKET_COLORS.response,
  },
  {
    type: "event",
    label: "Event",
    description: "Event notification",
    color: PACKET_COLORS.event,
  },
  {
    type: "error",
    label: "Error",
    description: "Error or failure packet",
    color: PACKET_COLORS.error,
  },
  {
    type: "heartbeat",
    label: "Heartbeat",
    description: "Health ping packet",
    color: PACKET_COLORS.heartbeat,
  },
  {
    type: "broadcast",
    label: "Broadcast",
    description: "Broadcast message packet",
    color: PACKET_COLORS.broadcast,
  },
]

const LINE_STYLE_ITEMS: LineStyleItem[] = [
  {
    style: "solid",
    label: "Solid",
    description: "Active, flowing connection",
    visual: (
      <div className="w-12 h-0.5 bg-current" />
    ),
  },
  {
    style: "dashed",
    label: "Dashed",
    description: "Idle or low-traffic connection",
    visual: (
      <div className="w-12 h-0.5 border-t-2 border-dashed border-current" />
    ),
  },
  {
    style: "dotted",
    label: "Dotted",
    description: "Inactive or pending connection",
    visual: (
      <div className="w-12 h-0.5 border-t-2 border-dotted border-current" />
    ),
  },
]

export function ConnectionLegend({
  isOpen,
  onClose,
  visibleTypes,
  onToggleType,
  onHoverType,
}: ConnectionLegendProps) {
  const [expandedSection, setExpandedSection] = useState<"connections" | "packets" | "lines" | null>("connections")
  const [showAll, setShowAll] = useState(true)
  
  if (!isOpen) return null
  
  const toggleSection = (section: typeof expandedSection) => {
    setExpandedSection(expandedSection === section ? null : section)
  }
  
  const allVisible = !visibleTypes || visibleTypes.size === CONNECTION_LEGEND_ITEMS.length
  
  const handleToggleAll = () => {
    if (!onToggleType) return
    
    if (allVisible) {
      // Hide all
      CONNECTION_LEGEND_ITEMS.forEach(item => onToggleType(item.type))
    } else {
      // Show all - toggle any that are hidden
      CONNECTION_LEGEND_ITEMS.forEach(item => {
        if (visibleTypes && !visibleTypes.has(item.type)) {
          onToggleType(item.type)
        }
      })
    }
    setShowAll(!allVisible)
  }
  
  return (
    <div className="absolute bottom-20 left-4 z-40 w-96 bg-black/90 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-semibold text-white">Connection Legend</span>
        </div>
        <div className="flex items-center gap-2">
          {onToggleType && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={handleToggleAll}
            >
              <Filter className="h-3 w-3 mr-1" />
              {allVisible ? "Hide All" : "Show All"}
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      <ScrollArea className="h-[400px]">
        <div className="p-3 space-y-3">
          {/* Connection Types Section */}
          <div className="space-y-1">
            <button
              className="flex items-center justify-between w-full py-1 text-sm font-medium text-white/80 hover:text-white"
              onClick={() => toggleSection("connections")}
            >
              <span>Connection Types</span>
              {expandedSection === "connections" ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            
            {expandedSection === "connections" && (
              <div className="space-y-1.5 pt-1">
                {CONNECTION_LEGEND_ITEMS.map(item => {
                  const isVisible = !visibleTypes || visibleTypes.has(item.type)
                  
                  return (
                    <div
                      key={item.type}
                      className={`p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer ${
                        !isVisible ? "opacity-40" : ""
                      }`}
                      onMouseEnter={() => onHoverType?.(item.type)}
                      onMouseLeave={() => onHoverType?.(null)}
                      onClick={() => onToggleType?.(item.type)}
                    >
                      <div className="flex items-center gap-2">
                        {/* Color indicator */}
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        
                        {/* Icon & Label */}
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <span style={{ color: item.color }}>{item.icon}</span>
                          <span className="text-xs font-medium text-white">{item.label}</span>
                        </div>
                        
                        {/* Visibility toggle */}
                        {onToggleType && (
                          <Switch
                            checked={isVisible}
                            onCheckedChange={() => onToggleType(item.type)}
                            className="h-4 w-7 data-[state=checked]:bg-purple-500"
                          />
                        )}
                      </div>
                      {/* Description on separate line */}
                      <div className="text-[10px] text-white/50 mt-1 ml-5">{item.description}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          
          {/* Packet Types Section */}
          <div className="space-y-1 border-t border-white/10 pt-3">
            <button
              className="flex items-center justify-between w-full py-1 text-sm font-medium text-white/80 hover:text-white"
              onClick={() => toggleSection("packets")}
            >
              <span>Packet Types (Dots)</span>
              {expandedSection === "packets" ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            
            {expandedSection === "packets" && (
              <div className="space-y-1.5 pt-1">
                {PACKET_LEGEND_ITEMS.map(item => (
                  <div
                    key={item.type}
                    className="flex items-center gap-2 p-2 rounded-lg"
                  >
                    {/* Dot indicator */}
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ 
                        backgroundColor: item.color,
                        boxShadow: `0 0 6px ${item.color}`,
                      }}
                    />
                    
                    {/* Label */}
                    <span className="text-xs font-medium text-white">{item.label}</span>
                    
                    {/* Description */}
                    <span className="text-[10px] text-white/50 flex-1">{item.description}</span>
                  </div>
                ))}
                
                {/* Size legend */}
                <div className="flex items-center gap-3 p-2 mt-2 bg-white/5 rounded-lg">
                  <span className="text-[10px] text-white/50">Size:</span>
                  <div className="flex items-center gap-2">
                    <Circle className="h-2 w-2 text-white/70" fill="currentColor" />
                    <span className="text-[10px] text-white/50">Small</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Circle className="h-3 w-3 text-white/70" fill="currentColor" />
                    <span className="text-[10px] text-white/50">Medium</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Circle className="h-4 w-4 text-white/70" fill="currentColor" />
                    <span className="text-[10px] text-white/50">Large</span>
                  </div>
                </div>
                
                {/* Speed legend */}
                <div className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                  <span className="text-[10px] text-white/50">Speed:</span>
                  <div className="text-[10px] text-green-400">Fast = Low latency</div>
                  <div className="text-[10px] text-yellow-400">Normal</div>
                  <div className="text-[10px] text-red-400">Slow = High latency</div>
                </div>
              </div>
            )}
          </div>
          
          {/* Line Styles Section */}
          <div className="space-y-1 border-t border-white/10 pt-3">
            <button
              className="flex items-center justify-between w-full py-1 text-sm font-medium text-white/80 hover:text-white"
              onClick={() => toggleSection("lines")}
            >
              <span>Line Styles</span>
              {expandedSection === "lines" ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            
            {expandedSection === "lines" && (
              <div className="space-y-1.5 pt-1">
                {LINE_STYLE_ITEMS.map(item => (
                  <div
                    key={item.style}
                    className="flex items-center gap-3 p-2 rounded-lg"
                  >
                    {/* Visual */}
                    <div className="text-white/70 flex-shrink-0">{item.visual}</div>
                    
                    {/* Label */}
                    <span className="text-xs font-medium text-white">{item.label}</span>
                    
                    {/* Description */}
                    <span className="text-[10px] text-white/50 flex-1">{item.description}</span>
                  </div>
                ))}
                
                {/* Direction indicators */}
                <div className="p-2 mt-2 bg-white/5 rounded-lg space-y-1.5">
                  <div className="flex items-center gap-3">
                    <ArrowRight className="h-4 w-4 text-white/70" />
                    <span className="text-xs text-white">Unidirectional</span>
                    <span className="text-[10px] text-white/50">One-way data flow</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <ArrowLeftRight className="h-4 w-4 text-white/70" />
                    <span className="text-xs text-white">Bidirectional</span>
                    <span className="text-[10px] text-white/50">Two-way communication</span>
                  </div>
                </div>
                
                {/* Thickness info */}
                <div className="p-2 bg-white/5 rounded-lg">
                  <span className="text-[10px] text-white/50">
                    Line thickness indicates traffic volume. Thicker = higher throughput.
                  </span>
                </div>
              </div>
            )}
          </div>
          
          {/* Multi-stream info */}
          <div className="p-3 mt-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <p className="text-[10px] text-purple-300 font-medium mb-1">Multi-Stream Connections</p>
            <p className="text-[10px] text-white/50">
              When multiple connection types exist between two nodes, they are displayed as parallel offset lines.
              Each line maintains its own color and particle stream.
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

export default ConnectionLegend
