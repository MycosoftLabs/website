"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { 
  Code, 
  Play, 
  Pause, 
  Plus, 
  RefreshCw, 
  Terminal, 
  Clock, 
  Zap, 
  Activity, 
  FileCode, 
  Trash2,
  Bot,
  Settings,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Edit,
  Copy,
  Sparkles
} from "lucide-react"

interface ServerlessFunction {
  id: string
  name: string
  description: string
  runtime: string
  status: "active" | "paused" | "error" | "deploying"
  invocations: number
  avgDuration: number
  lastRun: string
  memory: number
  timeout: number
  code?: string
  endpoint?: string
  source: "n8n" | "custom" | "system"
  mycaManaged?: boolean
}

const FUNCTIONS: ServerlessFunction[] = [
  { 
    id: "fn-001", 
    name: "species-lookup", 
    description: "Look up species data from MINDEX",
    runtime: "Node.js 20", 
    status: "active", 
    invocations: 12450, 
    avgDuration: 45, 
    lastRun: "2 min ago",
    memory: 256,
    timeout: 30,
    endpoint: "/api/mindex/species",
    source: "system",
    mycaManaged: true
  },
  { 
    id: "fn-002", 
    name: "spore-analysis", 
    description: "Analyze spore detection data",
    runtime: "Python 3.11", 
    status: "active", 
    invocations: 8320, 
    avgDuration: 120, 
    lastRun: "5 min ago",
    memory: 512,
    timeout: 60,
    source: "n8n",
    mycaManaged: true
  },
  { 
    id: "fn-003", 
    name: "mycelium-network-sync", 
    description: "Sync mycelium network data",
    runtime: "Node.js 20", 
    status: "active", 
    invocations: 45000, 
    avgDuration: 30, 
    lastRun: "1 min ago",
    memory: 256,
    timeout: 30,
    endpoint: "/api/natureos/mycelium/network",
    source: "system",
    mycaManaged: true
  },
  { 
    id: "fn-004", 
    name: "compound-identifier", 
    description: "Identify bioactive compounds",
    runtime: "Python 3.11", 
    status: "paused", 
    invocations: 3200, 
    avgDuration: 250, 
    lastRun: "1 hour ago",
    memory: 1024,
    timeout: 120,
    source: "custom",
    mycaManaged: false
  },
  { 
    id: "fn-005", 
    name: "image-classifier", 
    description: "Classify fungal images using ML",
    runtime: "Python 3.11", 
    status: "active", 
    invocations: 6780, 
    avgDuration: 180, 
    lastRun: "3 min ago",
    memory: 2048,
    timeout: 60,
    source: "custom",
    mycaManaged: true
  },
  { 
    id: "fn-006", 
    name: "dna-sequence-matcher", 
    description: "Match DNA sequences against database",
    runtime: "Python 3.11", 
    status: "active", 
    invocations: 1890, 
    avgDuration: 500, 
    lastRun: "10 min ago",
    memory: 2048,
    timeout: 300,
    source: "custom",
    mycaManaged: false
  },
  { 
    id: "fn-007", 
    name: "weather-data-fetcher", 
    description: "Fetch real-time weather data",
    runtime: "Node.js 20", 
    status: "active", 
    invocations: 28000, 
    avgDuration: 25, 
    lastRun: "30 sec ago",
    memory: 128,
    timeout: 10,
    endpoint: "/api/weather/current",
    source: "system",
    mycaManaged: true
  },
  { 
    id: "fn-008", 
    name: "alert-dispatcher", 
    description: "Dispatch alerts to users",
    runtime: "Node.js 20", 
    status: "active", 
    invocations: 890, 
    avgDuration: 15, 
    lastRun: "15 min ago",
    memory: 128,
    timeout: 30,
    source: "n8n",
    mycaManaged: true
  },
  { 
    id: "fn-009", 
    name: "ai-response-handler", 
    description: "Handle AI/MYCA responses",
    runtime: "Node.js 20", 
    status: "active", 
    invocations: 15600, 
    avgDuration: 200, 
    lastRun: "1 min ago",
    memory: 512,
    timeout: 60,
    endpoint: "/api/ai",
    source: "system",
    mycaManaged: true
  },
  { 
    id: "fn-010", 
    name: "training-data-logger", 
    description: "Log training data for MYCA",
    runtime: "Node.js 20", 
    status: "active", 
    invocations: 45000, 
    avgDuration: 5, 
    lastRun: "Just now",
    memory: 128,
    timeout: 10,
    endpoint: "/api/myca/training",
    source: "system",
    mycaManaged: true
  },
]

export default function FunctionsPage() {
  const [functions, setFunctions] = useState<ServerlessFunction[]>(FUNCTIONS)
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFunction, setSelectedFunction] = useState<ServerlessFunction | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [aiPrompt, setAIPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedCode, setGeneratedCode] = useState("")

  const filteredFunctions = functions.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.description.toLowerCase().includes(search.toLowerCase())
  )
  
  const activeCount = functions.filter(f => f.status === "active").length
  const totalInvocations = functions.reduce((sum, f) => sum + f.invocations, 0)
  const mycaManagedCount = functions.filter(f => f.mycaManaged).length

  const toggleFunction = async (id: string) => {
    setFunctions(functions.map(f => 
      f.id === id 
        ? { ...f, status: f.status === "active" ? "paused" : "active" } 
        : f
    ))
    
    // Log to MYCA training
    const fn = functions.find(f => f.id === id)
    if (fn) {
      try {
        await fetch("/api/myca/training", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "function_toggle",
            input: fn.name,
            output: fn.status === "active" ? "paused" : "active",
            context: "functions-management",
            source: "functions",
            timestamp: new Date().toISOString(),
          }),
        })
      } catch {
        // Silently fail
      }
    }
  }

  const invokeFunction = async (fn: ServerlessFunction) => {
    if (fn.endpoint) {
      try {
        const res = await fetch(fn.endpoint)
        const data = await res.json()
        alert(`Function invoked successfully!\n\nResponse preview:\n${JSON.stringify(data).slice(0, 200)}...`)
      } catch (e) {
        alert(`Error invoking function: ${e}`)
      }
    } else {
      alert("Function endpoint not available for direct invocation")
    }
  }

  const generateFunctionWithAI = async () => {
    if (!aiPrompt) return
    
    setIsGenerating(true)
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Generate a serverless function for NatureOS based on this description: ${aiPrompt}

Generate TypeScript/Node.js code that:
1. Exports a default async function
2. Handles errors gracefully
3. Returns JSON response
4. Includes proper typing
5. Has documentation comments`,
          context: "function-generation",
        }),
      })
      
      if (res.ok) {
        const data = await res.json()
        setGeneratedCode(data.response || data.message || "// Generated code will appear here")
        
        // Log to training
        await fetch("/api/myca/training", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "code_generation",
            input: aiPrompt,
            output: data.response || "",
            context: "function-generation",
            source: "functions",
            timestamp: new Date().toISOString(),
          }),
        })
      }
    } catch (e) {
      setGeneratedCode(`// Error generating function
// MYCA AI backend may be unavailable

// Template function:
export default async function handler(req: Request) {
  try {
    // Your logic here based on: ${aiPrompt}
    
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: 'Function error' }, { status: 500 })
  }
}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <CheckCircle className="h-4 w-4 text-green-500" />
      case "paused": return <Pause className="h-4 w-4 text-yellow-500" />
      case "error": return <XCircle className="h-4 w-4 text-red-500" />
      case "deploying": return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "system": return <Badge variant="outline" className="bg-blue-500/20 text-blue-400">System</Badge>
      case "n8n": return <Badge variant="outline" className="bg-orange-500/20 text-orange-400">n8n</Badge>
      case "custom": return <Badge variant="outline" className="bg-purple-500/20 text-purple-400">Custom</Badge>
      default: return null
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileCode className="h-8 w-8 text-primary" />
            Serverless Functions
          </h1>
          <p className="text-muted-foreground">
            Manage serverless functions • MYCA oversees {mycaManagedCount} functions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="http://localhost:5678" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              n8n Workflows
            </a>
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Function
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Functions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{functions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" /> Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <Zap className="h-4 w-4" /> Invocations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totalInvocations / 1000).toFixed(1)}k</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <Clock className="h-4 w-4" /> Avg Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(functions.reduce((s, f) => s + f.avgDuration, 0) / functions.length)}ms
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <Bot className="h-4 w-4 text-purple-500" /> MYCA Managed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">{mycaManagedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <Input 
          placeholder="Search functions..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          className="max-w-sm" 
        />
        <Button variant="outline" onClick={() => setIsLoading(!isLoading)}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Functions List */}
      <div className="grid gap-4">
        {filteredFunctions.map(fn => (
          <Card key={fn.id} className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getStatusIcon(fn.status)}
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileCode className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{fn.name}</h3>
                      {getSourceBadge(fn.source)}
                      {fn.mycaManaged && (
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-400 text-xs">
                          <Bot className="h-3 w-3 mr-1" />
                          MYCA
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{fn.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{fn.runtime} • {fn.memory}MB • {fn.timeout}s timeout</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm">
                      <Zap className="h-3 w-3" />
                      {fn.invocations.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">invocations</div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-3 w-3" />
                      {fn.avgDuration}ms
                    </div>
                    <div className="text-xs text-muted-foreground">avg duration</div>
                  </div>
                  
                  <div className="text-right min-w-[80px]">
                    <div className="text-sm">{fn.lastRun}</div>
                    <div className="text-xs text-muted-foreground">last run</div>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toggleFunction(fn.id)}
                      title={fn.status === "active" ? "Pause" : "Activate"}
                    >
                      {fn.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    {fn.endpoint && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => invokeFunction(fn)}
                        title="Invoke"
                      >
                        <Zap className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => { setSelectedFunction(fn); setShowDetails(true) }}
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" title="Edit">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Function Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              {selectedFunction?.name}
            </DialogTitle>
            <DialogDescription>{selectedFunction?.description}</DialogDescription>
          </DialogHeader>
          
          {selectedFunction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Runtime</div>
                  <div className="font-medium">{selectedFunction.runtime}</div>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="font-medium flex items-center gap-1">
                    {getStatusIcon(selectedFunction.status)}
                    {selectedFunction.status}
                  </div>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Memory</div>
                  <div className="font-medium">{selectedFunction.memory}MB</div>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Timeout</div>
                  <div className="font-medium">{selectedFunction.timeout}s</div>
                </div>
              </div>
              
              {selectedFunction.endpoint && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Endpoint</div>
                  <div className="font-mono text-sm">{selectedFunction.endpoint}</div>
                </div>
              )}
              
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground mb-2">Performance (Last 24h)</div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{selectedFunction.invocations.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Invocations</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{selectedFunction.avgDuration}ms</div>
                    <div className="text-xs text-muted-foreground">Avg Duration</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-500">99.9%</div>
                    <div className="text-xs text-muted-foreground">Success Rate</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetails(false)}>Close</Button>
            {selectedFunction?.endpoint && (
              <Button onClick={() => selectedFunction && invokeFunction(selectedFunction)}>
                <Zap className="h-4 w-4 mr-2" />
                Invoke
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Function Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Create Function with MYCA AI
            </DialogTitle>
            <DialogDescription>
              Describe what you want your function to do, and MYCA will generate the code
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Describe your function</label>
              <Textarea 
                placeholder="e.g., A function that fetches species data from iNaturalist and returns the top 10 results with images..."
                value={aiPrompt}
                onChange={(e) => setAIPrompt(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
            
            <Button 
              onClick={generateFunctionWithAI} 
              disabled={!aiPrompt || isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  MYCA is generating...
                </>
              ) : (
                <>
                  <Bot className="h-4 w-4 mr-2" />
                  Generate with MYCA AI
                </>
              )}
            </Button>
            
            {generatedCode && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Generated Code</label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(generatedCode)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <pre className="bg-slate-950 text-green-400 p-4 rounded-lg overflow-auto max-h-[300px] text-sm font-mono">
                  {generatedCode}
                </pre>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setGeneratedCode(""); setAIPrompt("") }}>
              Cancel
            </Button>
            <Button disabled={!generatedCode}>
              <Plus className="h-4 w-4 mr-2" />
              Deploy Function
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
