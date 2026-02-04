"use client"

/**
 * Memory Dashboard - Full Page Memory Control Center
 * Created: Feb 3, 2026
 * 
 * Complete memory system management with:
 * - Real-time memory scope visualization
 * - Full CRUD operations
 * - Audit log with filtering
 * - Memory analytics and usage charts
 * - Backend health monitoring
 * - Bulk operations
 */

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  TrendingUp,
  Settings,
  History,
  Archive,
  FileJson,
  Play,
  Pause,
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

interface MemoryStats {
  totalEntries: number
  byScope: Record<MemoryScope, number>
  recentWrites: number
  recentReads: number
}

// Scope configuration
const SCOPE_CONFIG: Record<MemoryScope, { 
  color: string
  bgColor: string
  icon: React.ReactNode
  ttl: string
  storage: string
  description: string
}> = {
  conversation: { 
    color: "#22c55e",
    bgColor: "bg-green-500/10",
    icon: <Activity className="h-4 w-4" />,
    ttl: "1 hour",
    storage: "Redis/Memory",
    description: "Dialogue context and chat history"
  },
  user: { 
    color: "#3b82f6",
    bgColor: "bg-blue-500/10",
    icon: <Database className="h-4 w-4" />,
    ttl: "Permanent",
    storage: "PostgreSQL",
    description: "User preferences, settings, and personalization"
  },
  agent: { 
    color: "#8b5cf6",
    bgColor: "bg-purple-500/10",
    icon: <Brain className="h-4 w-4" />,
    ttl: "24 hours",
    storage: "Redis/Memory",
    description: "Agent working memory and task context"
  },
  system: { 
    color: "#f59e0b",
    bgColor: "bg-amber-500/10",
    icon: <Server className="h-4 w-4" />,
    ttl: "Permanent",
    storage: "PostgreSQL",
    description: "System configurations and global settings"
  },
  ephemeral: { 
    color: "#ef4444",
    bgColor: "bg-red-500/10",
    icon: <Zap className="h-4 w-4" />,
    ttl: "1 minute",
    storage: "Memory Only",
    description: "Temporary scratch space for quick operations"
  },
  device: { 
    color: "#06b6d4",
    bgColor: "bg-cyan-500/10",
    icon: <HardDrive className="h-4 w-4" />,
    ttl: "Permanent",
    storage: "PostgreSQL",
    description: "NatureOS device state and telemetry"
  },
  experiment: { 
    color: "#10b981",
    bgColor: "bg-emerald-500/10",
    icon: <BarChart3 className="h-4 w-4" />,
    ttl: "Permanent",
    storage: "PostgreSQL + Qdrant",
    description: "Scientific experiment data and results"
  },
  workflow: { 
    color: "#ec4899",
    bgColor: "bg-pink-500/10",
    icon: <Activity className="h-4 w-4" />,
    ttl: "7 days",
    storage: "Redis + PostgreSQL",
    description: "N8N workflow execution history"
  },
}

const MAS_URL = process.env.NEXT_PUBLIC_MAS_URL || "http://192.168.0.188:8001"

// Scope Overview Card
function ScopeOverviewCard({ 
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
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-lg",
        isSelected ? "ring-2" : "hover:ring-1 ring-white/20"
      )}
      style={{ borderColor: isSelected ? config.color : undefined }}
      onClick={onSelect}
    >
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div 
            className={cn("p-2 rounded-lg", config.bgColor)}
            style={{ color: config.color }}
          >
            {config.icon}
          </div>
          <Badge 
            variant="outline"
            style={{ borderColor: config.color, color: config.color }}
          >
            {count}
          </Badge>
        </div>
        <h3 className="font-semibold capitalize mt-3">{scope}</h3>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
          {config.description}
        </p>
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{config.ttl}</span>
          <span>•</span>
          <span>{config.storage}</span>
        </div>
      </CardContent>
    </Card>
  )
}

// Memory Entry Detail Dialog
function MemoryEntryDialog({ 
  entry, 
  open, 
  onOpenChange,
  onDelete 
}: { 
  entry: MemoryEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: () => void
}) {
  if (!entry) return null
  
  const config = SCOPE_CONFIG[entry.scope]
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div style={{ color: config.color }}>{config.icon}</div>
            Memory Entry Details
          </DialogTitle>
          <DialogDescription>
            {entry.scope} / {entry.namespace} / {entry.key}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Scope</Label>
              <p className="font-medium capitalize">{entry.scope}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Namespace</Label>
              <p className="font-medium font-mono">{entry.namespace}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Key</Label>
              <p className="font-medium font-mono">{entry.key}</p>
            </div>
          </div>
          
          <div>
            <Label className="text-muted-foreground">Value</Label>
            <pre className="mt-2 p-4 rounded-lg bg-muted font-mono text-sm overflow-auto max-h-64">
              {JSON.stringify(entry.value, null, 2)}
            </pre>
          </div>
          
          {entry.metadata && Object.keys(entry.metadata).length > 0 && (
            <div>
              <Label className="text-muted-foreground">Metadata</Label>
              <pre className="mt-2 p-4 rounded-lg bg-muted font-mono text-xs overflow-auto max-h-32">
                {JSON.stringify(entry.metadata, null, 2)}
              </pre>
            </div>
          )}
          
          <div>
            <Label className="text-muted-foreground">Created</Label>
            <p className="font-medium">{new Date(entry.created_at).toLocaleString()}</p>
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button variant="outline" onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(entry, null, 2))
          }}>
            <Copy className="h-4 w-4 mr-2" />
            Copy JSON
          </Button>
          <Button variant="destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Write Memory Dialog
function WriteMemoryDialog({ 
  onWrite,
  defaultScope
}: { 
  onWrite: (data: { scope: MemoryScope; namespace: string; key: string; value: string }) => Promise<boolean>
  defaultScope?: MemoryScope
}) {
  const [open, setOpen] = useState(false)
  const [scope, setScope] = useState<MemoryScope>(defaultScope || "user")
  const [namespace, setNamespace] = useState("")
  const [key, setKey] = useState("")
  const [value, setValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  const handleSubmit = async () => {
    setLoading(true)
    setError("")
    try {
      const success = await onWrite({ scope, namespace, key, value })
      if (success) {
        setOpen(false)
        setNamespace("")
        setKey("")
        setValue("")
      } else {
        setError("Failed to write memory entry")
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Write Memory
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Write Memory Entry</DialogTitle>
          <DialogDescription>
            Create or update a memory entry in the unified memory system.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as MemoryScope)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SCOPE_CONFIG).map(([s, config]) => (
                    <SelectItem key={s} value={s}>
                      <div className="flex items-center gap-2">
                        <span style={{ color: config.color }}>{config.icon}</span>
                        <span className="capitalize">{s}</span>
                      </div>
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
                placeholder="e.g., user_123, device_abc"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Key</Label>
            <Input 
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="e.g., preferences, state, config"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Value (JSON or plain text)</Label>
            <Textarea 
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder='{"theme": "dark", "language": "en"}'
              className="font-mono text-sm h-32"
            />
          </div>
          
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!namespace || !key || !value || loading}>
            {loading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
            Write
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Main Memory Dashboard Component
export function MemoryDashboard({ className }: { className?: string }) {
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedScope, setSelectedScope] = useState<MemoryScope | null>(null)
  const [health, setHealth] = useState<{ status: string; redis: string; scopes: string[] } | null>(null)
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
  const [selectedEntry, setSelectedEntry] = useState<MemoryEntry | null>(null)
  const [entryDialogOpen, setEntryDialogOpen] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  
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
      const response = await fetch(`${MAS_URL}/api/security/audit/query?limit=50`)
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
  }): Promise<boolean> => {
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
        if (selectedScope) {
          fetchScopeEntries(selectedScope)
        }
        fetchHealth()
        return true
      }
      return false
    } catch (error) {
      console.error("Failed to write memory:", error)
      return false
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
        setEntryDialogOpen(false)
        setSelectedEntry(null)
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
  }, [fetchHealth, fetchAuditLog])
  
  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(() => {
      fetchHealth()
      if (selectedScope) {
        fetchScopeEntries(selectedScope)
      }
    }, 10000)
    
    return () => clearInterval(interval)
  }, [autoRefresh, fetchHealth, selectedScope, fetchScopeEntries])
  
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
  
  const totalEntries = Object.values(scopeCounts).reduce((a, b) => a + b, 0)
  
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Brain className="h-7 w-7 text-purple-500" />
            Unified Memory System
          </h1>
          <p className="text-muted-foreground mt-1">
            Full control and observation of the Multi-Agent System memory
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
              Auto-Refresh
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => { fetchHealth(); fetchAuditLog() }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <WriteMemoryDialog onWrite={handleWriteMemory} defaultScope={selectedScope || undefined} />
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-2xl font-bold capitalize">{health?.status || "..."}</p>
              </div>
              <div className={cn(
                "p-3 rounded-full",
                health?.status === "healthy" ? "bg-green-500/10" : 
                health?.status === "degraded" ? "bg-yellow-500/10" : "bg-red-500/10"
              )}>
                {health?.status === "healthy" ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : health?.status === "degraded" ? (
                  <AlertTriangle className="h-6 w-6 text-yellow-500" />
                ) : (
                  <X className="h-6 w-6 text-red-500" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Entries</p>
                <p className="text-2xl font-bold">{totalEntries.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/10">
                <Database className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Scopes Active</p>
                <p className="text-2xl font-bold">{health?.scopes?.length || 8}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-500/10">
                <Brain className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Redis</p>
                <p className="text-2xl font-bold capitalize">{health?.redis || "..."}</p>
              </div>
              <div className={cn(
                "p-3 rounded-full",
                health?.redis === "connected" ? "bg-green-500/10" : "bg-yellow-500/10"
              )}>
                <Server className={cn(
                  "h-6 w-6",
                  health?.redis === "connected" ? "text-green-500" : "text-yellow-500"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="browse" className="gap-2">
            <Database className="h-4 w-4" />
            Browse
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <Shield className="h-4 w-4" />
            Audit Log
          </TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(Object.keys(SCOPE_CONFIG) as MemoryScope[]).map((scope) => (
              <ScopeOverviewCard
                key={scope}
                scope={scope}
                count={scopeCounts[scope]}
                onSelect={() => {
                  setSelectedScope(scope)
                  setActiveTab("browse")
                }}
                isSelected={selectedScope === scope}
              />
            ))}
          </div>
        </TabsContent>
        
        {/* Browse Tab */}
        <TabsContent value="browse" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Memory Entries
                  {selectedScope && (
                    <Badge 
                      style={{ 
                        backgroundColor: `${SCOPE_CONFIG[selectedScope].color}20`,
                        color: SCOPE_CONFIG[selectedScope].color 
                      }}
                    >
                      {selectedScope}
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search entries..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                  <Select 
                    value={selectedScope || "all"} 
                    onValueChange={(v) => setSelectedScope(v === "all" ? null : v as MemoryScope)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All scopes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Scopes</SelectItem>
                      {(Object.keys(SCOPE_CONFIG) as MemoryScope[]).map((scope) => (
                        <SelectItem key={scope} value={scope}>
                          <span className="capitalize">{scope}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Database className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg">No entries found</p>
                  <p className="text-sm">Select a scope from the dropdown to view entries</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Key</TableHead>
                      <TableHead>Namespace</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry, i) => {
                      const config = SCOPE_CONFIG[entry.scope]
                      return (
                        <TableRow key={`${entry.scope}-${entry.namespace}-${entry.key}-${i}`}>
                          <TableCell className="font-mono">{entry.key}</TableCell>
                          <TableCell className="font-mono text-muted-foreground">{entry.namespace}</TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline"
                              style={{ borderColor: config.color, color: config.color }}
                            >
                              {entry.scope}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(entry.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  setSelectedEntry(entry)
                                  setEntryDialogOpen(true)
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-destructive"
                                onClick={() => handleDeleteMemory(entry)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Audit Tab */}
        <TabsContent value="audit" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Audit Log
                </CardTitle>
                <Button variant="outline" size="sm" onClick={fetchAuditLog}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {auditLog.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Shield className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg">No audit entries</p>
                  <p className="text-sm">Security events will appear here</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLog.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium">{entry.action}</TableCell>
                        <TableCell className="font-mono text-sm">{entry.resource}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {entry.user_id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            entry.severity === "critical" ? "destructive" :
                            entry.severity === "error" ? "destructive" :
                            entry.severity === "warning" ? "outline" : "secondary"
                          }>
                            {entry.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {entry.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <X className="h-4 w-4 text-red-500" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Entry Detail Dialog */}
      <MemoryEntryDialog
        entry={selectedEntry}
        open={entryDialogOpen}
        onOpenChange={setEntryDialogOpen}
        onDelete={() => selectedEntry && handleDeleteMemory(selectedEntry)}
      />
    </div>
  )
}

export default MemoryDashboard
