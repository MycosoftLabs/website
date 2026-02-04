"use client"

/**
 * Memory Monitor Widget - Full Control Memory Visualization
 * Created: Feb 3, 2026
 * 
 * Features:
 * - Real-time memory scope monitoring
 * - CRUD operations on memory entries
 * - Audit log visualization
 * - Backend status monitoring (Redis, PostgreSQL, Qdrant)
 * - Memory usage analytics
 */

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Brain,
  Database,
  HardDrive,
  Clock,
  Trash2,
  Plus,
  RefreshCw,
  Search,
  Eye,
  Edit,
  X,
  ChevronDown,
  ChevronUp,
  Activity,
  Shield,
  Zap,
  Server,
  Circle,
  AlertTriangle,
  CheckCircle,
  Info,
  Copy,
  Download,
  Filter,
  BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Memory scope types
type MemoryScope = 
  | "conversation" 
  | "user" 
  | "agent" 
  | "system" 
  | "ephemeral" 
  | "device" 
  | "experiment" 
  | "workflow"

interface MemoryEntry {
  key: string
  value: unknown
  scope: MemoryScope
  namespace: string
  created_at: string
  metadata?: Record<string, unknown>
}

interface AuditEntry {
  id: string
  timestamp: string
  user_id: string
  action: string
  resource: string
  success: boolean
  severity: "info" | "warning" | "error" | "critical"
  details?: Record<string, unknown>
}

interface BackendStatus {
  connected: boolean
  type: string
  note?: string
}

interface MemoryHealth {
  status: string
  redis: string
  scopes: MemoryScope[]
  backends?: {
    redis: BackendStatus
    postgres: BackendStatus
    qdrant: BackendStatus
  }
}

// Scope configuration
const SCOPE_CONFIG: Record<MemoryScope, { 
  color: string
  icon: React.ReactNode
  ttl: string
  storage: string
  description: string
}> = {
  conversation: { 
    color: "#22c55e", 
    icon: <Activity className="h-3 w-3" />,
    ttl: "1 hour",
    storage: "Redis",
    description: "Dialogue context and chat history"
  },
  user: { 
    color: "#3b82f6", 
    icon: <Database className="h-3 w-3" />,
    ttl: "Permanent",
    storage: "PostgreSQL",
    description: "User preferences and settings"
  },
  agent: { 
    color: "#8b5cf6", 
    icon: <Brain className="h-3 w-3" />,
    ttl: "24 hours",
    storage: "Redis",
    description: "Agent working memory"
  },
  system: { 
    color: "#f59e0b", 
    icon: <Server className="h-3 w-3" />,
    ttl: "Permanent",
    storage: "PostgreSQL",
    description: "System configurations"
  },
  ephemeral: { 
    color: "#ef4444", 
    icon: <Zap className="h-3 w-3" />,
    ttl: "1 minute",
    storage: "Memory",
    description: "Temporary scratch space"
  },
  device: { 
    color: "#06b6d4", 
    icon: <HardDrive className="h-3 w-3" />,
    ttl: "Permanent",
    storage: "PostgreSQL",
    description: "NatureOS device state"
  },
  experiment: { 
    color: "#10b981", 
    icon: <BarChart3 className="h-3 w-3" />,
    ttl: "Permanent",
    storage: "PostgreSQL + Qdrant",
    description: "Scientific experiment data"
  },
  workflow: { 
    color: "#ec4899", 
    icon: <Activity className="h-3 w-3" />,
    ttl: "7 days",
    storage: "Redis + PostgreSQL",
    description: "N8N workflow executions"
  },
}

const MAS_URL = process.env.NEXT_PUBLIC_MAS_URL || "http://192.168.0.188:8001"

// Backend status indicator
function BackendIndicator({ 
  name, 
  status, 
  type 
}: { 
  name: string
  status: boolean | string
  type: string 
}) {
  const isConnected = status === true || status === "connected"
  
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
      <div 
        className={cn(
          "w-2.5 h-2.5 rounded-full",
          isConnected ? "bg-green-500 animate-pulse" : "bg-gray-500"
        )}
      />
      <div className="flex-1">
        <p className="text-xs font-medium text-white">{name}</p>
        <p className="text-[10px] text-gray-400">{type}</p>
      </div>
      <Badge 
        variant="outline" 
        className={cn(
          "text-[9px]",
          isConnected ? "border-green-500 text-green-400" : "border-gray-500 text-gray-400"
        )}
      >
        {isConnected ? "Connected" : "Fallback"}
      </Badge>
    </div>
  )
}

// Scope card component
function ScopeCard({ 
  scope, 
  count, 
  onSelect,
  isSelected 
}: { 
  scope: MemoryScope
  count: number
  onSelect: () => void
  isSelected: boolean
}) {
  const config = SCOPE_CONFIG[scope]
  
  return (
    <button
      onClick={onSelect}
      className={cn(
        "p-3 rounded-lg border transition-all text-left w-full",
        isSelected 
          ? "bg-white/10 border-white/30" 
          : "bg-white/5 border-white/10 hover:bg-white/10"
      )}
      style={{ borderColor: isSelected ? config.color : undefined }}
    >
      <div className="flex items-center gap-2 mb-1">
        <div 
          className="p-1 rounded"
          style={{ backgroundColor: `${config.color}20` }}
        >
          {React.cloneElement(config.icon as React.ReactElement, { 
            style: { color: config.color } 
          })}
        </div>
        <span className="text-sm font-medium text-white capitalize">{scope}</span>
        <Badge 
          variant="outline" 
          className="ml-auto text-[10px]"
          style={{ borderColor: config.color, color: config.color }}
        >
          {count}
        </Badge>
      </div>
      <p className="text-[10px] text-gray-400">{config.description}</p>
      <div className="flex items-center gap-2 mt-2 text-[9px] text-gray-500">
        <Clock className="h-2.5 w-2.5" />
        <span>{config.ttl}</span>
        <span>•</span>
        <span>{config.storage}</span>
      </div>
    </button>
  )
}

// Memory entry row
function MemoryEntryRow({ 
  entry, 
  onView, 
  onEdit, 
  onDelete 
}: { 
  entry: MemoryEntry
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const config = SCOPE_CONFIG[entry.scope]
  const valuePreview = typeof entry.value === "object" 
    ? JSON.stringify(entry.value).slice(0, 50) + "..." 
    : String(entry.value).slice(0, 50)
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
      <div 
        className="w-1 h-8 rounded-full"
        style={{ backgroundColor: config.color }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">{entry.key}</span>
          <Badge variant="outline" className="text-[9px]">{entry.namespace}</Badge>
        </div>
        <p className="text-[11px] text-gray-400 truncate font-mono">{valuePreview}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onView}>
          <Eye className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
          <Edit className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-400" onClick={onDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

// Audit log entry
function AuditLogRow({ entry }: { entry: AuditEntry }) {
  const severityColors = {
    info: "text-blue-400",
    warning: "text-yellow-400",
    error: "text-red-400",
    critical: "text-red-500",
  }
  
  const severityIcons = {
    info: <Info className="h-3 w-3" />,
    warning: <AlertTriangle className="h-3 w-3" />,
    error: <X className="h-3 w-3" />,
    critical: <AlertTriangle className="h-3 w-3" />,
  }
  
  return (
    <div className="flex items-start gap-3 p-2 rounded bg-white/5">
      <div className={cn("p-1 rounded", severityColors[entry.severity])}>
        {severityIcons[entry.severity]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-white">{entry.action}</span>
          {entry.success ? (
            <CheckCircle className="h-3 w-3 text-green-400" />
          ) : (
            <X className="h-3 w-3 text-red-400" />
          )}
        </div>
        <p className="text-[10px] text-gray-400">
          {entry.resource} • User: {entry.user_id.slice(0, 8)}...
        </p>
        <p className="text-[9px] text-gray-500">
          {new Date(entry.timestamp).toLocaleString()}
        </p>
      </div>
    </div>
  )
}

// Write memory dialog
function WriteMemoryDialog({ 
  onWrite,
  selectedScope 
}: { 
  onWrite: (data: { scope: MemoryScope; namespace: string; key: string; value: string }) => void
  selectedScope?: MemoryScope
}) {
  const [open, setOpen] = useState(false)
  const [scope, setScope] = useState<MemoryScope>(selectedScope || "user")
  const [namespace, setNamespace] = useState("")
  const [key, setKey] = useState("")
  const [value, setValue] = useState("")
  
  const handleSubmit = () => {
    onWrite({ scope, namespace, key, value })
    setOpen(false)
    setNamespace("")
    setKey("")
    setValue("")
  }
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-3 w-3" />
          Write Memory
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Write Memory Entry</DialogTitle>
          <DialogDescription className="text-gray-400">
            Create or update a memory entry in the unified memory system.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as MemoryScope)}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  {Object.keys(SCOPE_CONFIG).map((s) => (
                    <SelectItem key={s} value={s} className="text-white">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Namespace</Label>
              <Input 
                value={namespace}
                onChange={(e) => setNamespace(e.target.value)}
                placeholder="e.g., user_123"
                className="bg-white/5 border-white/10"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Key</Label>
            <Input 
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="e.g., preferences"
              className="bg-white/5 border-white/10"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Value (JSON)</Label>
            <Textarea 
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder='{"theme": "dark", "language": "en"}'
              className="bg-white/5 border-white/10 font-mono text-sm h-32"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!namespace || !key || !value}>
            Write
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Main Memory Monitor Component
export function MemoryMonitor({ className }: { className?: string }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isVisible, setIsVisible] = useState(true)
  const [activeTab, setActiveTab] = useState("scopes")
  const [selectedScope, setSelectedScope] = useState<MemoryScope | null>(null)
  const [health, setHealth] = useState<MemoryHealth | null>(null)
  const [entries, setEntries] = useState<MemoryEntry[]>([])
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [scopeCounts, setScopeCounts] = useState<Record<MemoryScope, number>>({
    conversation: 0,
    user: 0,
    agent: 0,
    system: 0,
    ephemeral: 0,
    device: 0,
    experiment: 0,
    workflow: 0,
  })
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  
  // Fetch memory health
  const fetchHealth = useCallback(async () => {
    try {
      const response = await fetch(`${MAS_URL}/api/memory/health`)
      if (response.ok) {
        const data = await response.json()
        setHealth(data)
      }
    } catch (error) {
      console.error("Failed to fetch memory health:", error)
    }
  }, [])
  
  // Fetch audit log
  const fetchAuditLog = useCallback(async () => {
    try {
      const response = await fetch(`${MAS_URL}/api/security/audit/query?limit=20`)
      if (response.ok) {
        const data = await response.json()
        setAuditLog(data.entries || [])
      }
    } catch (error) {
      console.error("Failed to fetch audit log:", error)
    }
  }, [])
  
  // Fetch entries for a scope
  const fetchScopeEntries = useCallback(async (scope: MemoryScope) => {
    setLoading(true)
    try {
      const response = await fetch(`${MAS_URL}/api/memory/list/${scope}/all`)
      if (response.ok) {
        const data = await response.json()
        // Transform keys into entries
        const entriesData: MemoryEntry[] = (data.keys || []).map((key: string) => ({
          key,
          scope,
          namespace: "all",
          value: "...",
          created_at: new Date().toISOString(),
        }))
        setEntries(entriesData)
        setScopeCounts(prev => ({ ...prev, [scope]: data.count || 0 }))
      }
    } catch (error) {
      console.error("Failed to fetch scope entries:", error)
    } finally {
      setLoading(false)
    }
  }, [])
  
  // Write memory
  const handleWriteMemory = useCallback(async (data: { 
    scope: MemoryScope
    namespace: string
    key: string
    value: string 
  }) => {
    try {
      let parsedValue
      try {
        parsedValue = JSON.parse(data.value)
      } catch {
        parsedValue = data.value
      }
      
      const response = await fetch(`${MAS_URL}/api/memory/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: data.scope,
          namespace: data.namespace,
          key: data.key,
          value: parsedValue,
          source: "ai-studio-dashboard",
        }),
      })
      
      if (response.ok) {
        // Refresh the entries
        if (selectedScope) {
          fetchScopeEntries(selectedScope)
        }
        fetchHealth()
      }
    } catch (error) {
      console.error("Failed to write memory:", error)
    }
  }, [selectedScope, fetchScopeEntries, fetchHealth])
  
  // Delete memory
  const handleDeleteMemory = useCallback(async (entry: MemoryEntry) => {
    try {
      const response = await fetch(`${MAS_URL}/api/memory/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: entry.scope,
          namespace: entry.namespace,
          key: entry.key,
        }),
      })
      
      if (response.ok) {
        // Refresh
        if (selectedScope) {
          fetchScopeEntries(selectedScope)
        }
      }
    } catch (error) {
      console.error("Failed to delete memory:", error)
    }
  }, [selectedScope, fetchScopeEntries])
  
  // Initial fetch
  useEffect(() => {
    fetchHealth()
    fetchAuditLog()
    
    const interval = setInterval(() => {
      fetchHealth()
      fetchAuditLog()
    }, 10000)
    
    return () => clearInterval(interval)
  }, [fetchHealth, fetchAuditLog])
  
  // Fetch entries when scope changes
  useEffect(() => {
    if (selectedScope) {
      fetchScopeEntries(selectedScope)
    }
  }, [selectedScope, fetchScopeEntries])
  
  // Filter entries by search
  const filteredEntries = useMemo(() => {
    if (!searchQuery) return entries
    return entries.filter(e => 
      e.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.namespace.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [entries, searchQuery])
  
  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="absolute top-4 right-4 z-20 bg-black/80 border-white/10 text-white hover:bg-black/90"
        onClick={() => setIsVisible(true)}
      >
        <Brain className="h-4 w-4 mr-2" />
        Memory
      </Button>
    )
  }
  
  return (
    <div className={cn("absolute top-4 right-4 z-20", className)}>
      <Card className="w-96 bg-black/90 backdrop-blur-md border-white/10 text-white overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-400" />
              Memory Monitor
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px]",
                  health?.status === "healthy" ? "border-green-500 text-green-400" : 
                  health?.status === "degraded" ? "border-yellow-500 text-yellow-400" : 
                  "border-red-500 text-red-400"
                )}
              >
                {health?.status || "..."}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={fetchHealth}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:text-red-400"
                onClick={() => setIsVisible(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {isExpanded && (
          <CardContent className="space-y-4">
            {/* Backend Status */}
            <div className="space-y-2">
              <p className="text-xs text-gray-400 uppercase font-medium">Backends</p>
              <div className="grid grid-cols-3 gap-2">
                <BackendIndicator 
                  name="Redis" 
                  status={health?.redis || "disconnected"} 
                  type="Short-term" 
                />
                <BackendIndicator 
                  name="PostgreSQL" 
                  status={health?.backends?.postgres?.connected || true} 
                  type="Long-term" 
                />
                <BackendIndicator 
                  name="Qdrant" 
                  status={health?.backends?.qdrant?.connected || false} 
                  type="Vector" 
                />
              </div>
            </div>
            
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full bg-white/5">
                <TabsTrigger value="scopes" className="flex-1 text-xs">Scopes</TabsTrigger>
                <TabsTrigger value="entries" className="flex-1 text-xs">Entries</TabsTrigger>
                <TabsTrigger value="audit" className="flex-1 text-xs">Audit</TabsTrigger>
              </TabsList>
              
              {/* Scopes Tab */}
              <TabsContent value="scopes" className="mt-3">
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(SCOPE_CONFIG) as MemoryScope[]).map((scope) => (
                    <ScopeCard
                      key={scope}
                      scope={scope}
                      count={scopeCounts[scope]}
                      onSelect={() => {
                        setSelectedScope(scope)
                        setActiveTab("entries")
                      }}
                      isSelected={selectedScope === scope}
                    />
                  ))}
                </div>
              </TabsContent>
              
              {/* Entries Tab */}
              <TabsContent value="entries" className="mt-3">
                <div className="space-y-3">
                  {/* Toolbar */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                      <Input
                        placeholder="Search entries..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 pl-7 bg-white/5 border-white/10 text-sm"
                      />
                    </div>
                    <WriteMemoryDialog 
                      onWrite={handleWriteMemory}
                      selectedScope={selectedScope || undefined}
                    />
                  </div>
                  
                  {/* Scope filter */}
                  {selectedScope && (
                    <div className="flex items-center gap-2">
                      <Badge style={{ backgroundColor: `${SCOPE_CONFIG[selectedScope].color}20`, color: SCOPE_CONFIG[selectedScope].color }}>
                        {selectedScope}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-xs"
                        onClick={() => setSelectedScope(null)}
                      >
                        Clear filter
                      </Button>
                    </div>
                  )}
                  
                  {/* Entries list */}
                  <ScrollArea className="h-60">
                    {loading ? (
                      <div className="flex items-center justify-center h-40">
                        <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
                      </div>
                    ) : filteredEntries.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                        <Database className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">No entries found</p>
                        <p className="text-xs">Select a scope to view entries</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredEntries.map((entry, i) => (
                          <MemoryEntryRow
                            key={`${entry.scope}-${entry.namespace}-${entry.key}-${i}`}
                            entry={entry}
                            onView={() => console.log("View", entry)}
                            onEdit={() => console.log("Edit", entry)}
                            onDelete={() => handleDeleteMemory(entry)}
                          />
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </TabsContent>
              
              {/* Audit Tab */}
              <TabsContent value="audit" className="mt-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-400">Recent Security Events</p>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={fetchAuditLog}>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh
                  </Button>
                </div>
                <ScrollArea className="h-60">
                  {auditLog.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                      <Shield className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-sm">No audit entries</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {auditLog.map((entry) => (
                        <AuditLogRow key={entry.id} entry={entry} />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

export default MemoryMonitor
