"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  Code, 
  Play, 
  Copy, 
  Check, 
  Globe, 
  Database, 
  Bot, 
  Network, 
  Settings,
  Zap,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  FileJson,
  Terminal,
  Sparkles,
  Send
} from "lucide-react"

interface APIEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE"
  path: string
  description: string
  category: string
  realtime?: boolean
  mycaIntegrated?: boolean
  params?: { name: string; type: string; required?: boolean }[]
  bodySchema?: string
}

const API_ENDPOINTS: APIEndpoint[] = [
  // MINDEX APIs
  { 
    method: "GET", 
    path: "/api/mindex/species", 
    description: "Search fungal species database (500k+ species)", 
    category: "MINDEX",
    mycaIntegrated: true,
    params: [
      { name: "query", type: "string" },
      { name: "limit", type: "number" },
      { name: "edible", type: "boolean" },
      { name: "medicinal", type: "boolean" }
    ]
  },
  { 
    method: "GET", 
    path: "/api/mindex/observations", 
    description: "Get fungal observations from iNaturalist and GBIF", 
    category: "MINDEX",
    realtime: true,
    params: [
      { name: "limit", type: "number" },
      { name: "species", type: "string" }
    ]
  },
  { 
    method: "GET", 
    path: "/api/mindex/devices", 
    description: "List MycoBrain devices and sensors", 
    category: "MINDEX"
  },
  { 
    method: "GET", 
    path: "/api/mindex/telemetry/latest", 
    description: "Get latest telemetry from all devices", 
    category: "MINDEX",
    realtime: true
  },
  
  // AI APIs
  { 
    method: "POST", 
    path: "/api/ai", 
    description: "Send request to MYCA AI assistant", 
    category: "AI",
    mycaIntegrated: true,
    bodySchema: `{
  "message": "Your question or request",
  "context": "Optional context",
  "systemPrompt": "Optional custom system prompt"
}`
  },
  { 
    method: "POST", 
    path: "/api/myca/training", 
    description: "Submit training data to improve MYCA", 
    category: "AI",
    mycaIntegrated: true,
    bodySchema: `{
  "type": "feedback | correction | example",
  "input": "Original input",
  "output": "Expected output",
  "context": "Training context"
}`
  },
  { 
    method: "GET", 
    path: "/api/myca/conversations", 
    description: "Get MYCA conversation history", 
    category: "AI",
    mycaIntegrated: true
  },
  { 
    method: "GET", 
    path: "/api/myca/workflows", 
    description: "List AI-managed n8n workflows", 
    category: "AI",
    mycaIntegrated: true
  },
  { 
    method: "GET", 
    path: "/api/myca/runs", 
    description: "Get recent agent runs", 
    category: "AI",
    mycaIntegrated: true
  },
  
  // NatureOS APIs
  { 
    method: "GET", 
    path: "/api/natureos/system/metrics", 
    description: "Get system performance metrics", 
    category: "System"
  },
  { 
    method: "GET", 
    path: "/api/natureos/mycelium/network", 
    description: "Get mycelium network topology and status", 
    category: "System",
    realtime: true
  },
  { 
    method: "GET", 
    path: "/api/natureos/activity/recent", 
    description: "Get recent platform activity", 
    category: "System"
  },
  { 
    method: "GET", 
    path: "/api/natureos/n8n", 
    description: "Get n8n workflow connection status", 
    category: "System"
  },
  { 
    method: "GET", 
    path: "/api/health", 
    description: "System health check for all services", 
    category: "System"
  },
  
  // Docker APIs
  { 
    method: "GET", 
    path: "/api/docker/containers", 
    description: "List Docker containers with stats", 
    category: "Infrastructure"
  },
  { 
    method: "POST", 
    path: "/api/docker/containers", 
    description: "Container actions (start, stop, restart)", 
    category: "Infrastructure",
    bodySchema: `{
  "action": "start | stop | restart | clone | backup",
  "containerId": "container-id"
}`
  },
  { 
    method: "GET", 
    path: "/api/docker/containers/logs", 
    description: "Get container logs", 
    category: "Infrastructure",
    params: [
      { name: "id", type: "string", required: true },
      { name: "tail", type: "number" }
    ]
  },
  
  // Storage APIs
  { 
    method: "GET", 
    path: "/api/storage/nas", 
    description: "Get UniFi NAS status and shares", 
    category: "Storage"
  },
  { 
    method: "GET", 
    path: "/api/storage/gdrive", 
    description: "Get Google Drive connection and quota", 
    category: "Storage"
  },
  { 
    method: "GET", 
    path: "/api/storage/files", 
    description: "Browse files across storage locations", 
    category: "Storage",
    params: [
      { name: "path", type: "string" },
      { name: "source", type: "string" }
    ]
  },
  
  // Search & Other
  { 
    method: "GET", 
    path: "/api/search", 
    description: "Universal search across all systems", 
    category: "Search",
    mycaIntegrated: true,
    params: [
      { name: "q", type: "string", required: true },
      { name: "type", type: "string" }
    ]
  },
  { 
    method: "GET", 
    path: "/api/devices", 
    description: "List all connected devices", 
    category: "Devices"
  },
  { 
    method: "GET", 
    path: "/api/weather/current", 
    description: "Get real-time weather data", 
    category: "External",
    realtime: true
  },
  { 
    method: "GET", 
    path: "/api/spores/detections", 
    description: "Get spore detection data", 
    category: "External",
    realtime: true
  },
]

const METHOD_COLORS = {
  GET: "bg-green-500/20 text-green-500 border-green-500/50",
  POST: "bg-blue-500/20 text-blue-500 border-blue-500/50",
  PUT: "bg-yellow-500/20 text-yellow-500 border-yellow-500/50",
  DELETE: "bg-red-500/20 text-red-500 border-red-500/50",
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  MINDEX: <Database className="h-4 w-4" />,
  AI: <Bot className="h-4 w-4" />,
  System: <Settings className="h-4 w-4" />,
  Infrastructure: <Network className="h-4 w-4" />,
  Storage: <Database className="h-4 w-4" />,
  Search: <Globe className="h-4 w-4" />,
  Devices: <Activity className="h-4 w-4" />,
  External: <Globe className="h-4 w-4" />,
}

export default function APIPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null)
  const [response, setResponse] = useState<string>("")
  const [responseStatus, setResponseStatus] = useState<number | null>(null)
  const [responseTime, setResponseTime] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [queryParams, setQueryParams] = useState("")
  const [requestBody, setRequestBody] = useState("")
  const [activeCategory, setActiveCategory] = useState("MINDEX")

  const categories = [...new Set(API_ENDPOINTS.map((e) => e.category))]
  const filteredEndpoints = API_ENDPOINTS.filter(e => e.category === activeCategory)

  useEffect(() => {
    // Log API explorer usage for MYCA training
    fetch("/api/myca/training", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "api_explore",
        input: "API Explorer viewed",
        output: "",
        context: "api-gateway",
        source: "api-explorer",
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {})
  }, [])

  const testEndpoint = async (endpoint: APIEndpoint) => {
    setLoading(true)
    setResponse("")
    setResponseStatus(null)
    setResponseTime(null)
    
    const startTime = Date.now()
    
    try {
      let url = endpoint.path
      if (queryParams && endpoint.method === "GET") {
        url = `${endpoint.path}?${queryParams}`
      }
      
      const options: RequestInit = {
        method: endpoint.method,
        headers: { "Content-Type": "application/json" },
      }
      
      if (endpoint.method === "POST" && requestBody) {
        try {
          options.body = requestBody
        } catch {
          // Keep as-is if not valid JSON
        }
      }
      
      const res = await fetch(url, options)
      const endTime = Date.now()
      setResponseTime(endTime - startTime)
      setResponseStatus(res.status)
      
      const data = await res.json()
      setResponse(JSON.stringify(data, null, 2))
      
      // Log API test for MYCA training
      await fetch("/api/myca/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "api_test",
          input: `${endpoint.method} ${url}`,
          output: res.status.toString(),
          context: "api-testing",
          source: "api-explorer",
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {})
      
    } catch (error) {
      setResponse(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
      setResponseStatus(500)
    } finally {
      setLoading(false)
    }
  }

  const copyResponse = () => {
    navigator.clipboard.writeText(response)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyCurl = () => {
    if (!selectedEndpoint) return
    let curl = `curl -X ${selectedEndpoint.method} "http://localhost${selectedEndpoint.path}`
    if (queryParams) curl += `?${queryParams}`
    curl += `"`
    if (selectedEndpoint.method === "POST" && requestBody) {
      curl += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${requestBody}'`
    }
    navigator.clipboard.writeText(curl)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Code className="h-8 w-8 text-primary" />
            API Gateway
          </h1>
          <p className="text-muted-foreground">
            Explore and test NatureOS APIs • {API_ENDPOINTS.length} endpoints available
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/natureos/sdk">
              <FileJson className="h-4 w-4 mr-2" />
              SDK Docs
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/natureos/shell">
              <Terminal className="h-4 w-4 mr-2" />
              Shell
            </a>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{API_ENDPOINTS.length}</div>
                <div className="text-sm text-muted-foreground">Total Endpoints</div>
              </div>
              <Globe className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-500">
                  {API_ENDPOINTS.filter(e => e.mycaIntegrated).length}
                </div>
                <div className="text-sm text-muted-foreground">MYCA Integrated</div>
              </div>
              <Bot className="h-8 w-8 text-purple-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-500">
                  {API_ENDPOINTS.filter(e => e.realtime).length}
                </div>
                <div className="text-sm text-muted-foreground">Real-time</div>
              </div>
              <Zap className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{categories.length}</div>
                <div className="text-sm text-muted-foreground">Categories</div>
              </div>
              <Settings className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Endpoints List */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Available Endpoints
            </CardTitle>
            <CardDescription>Click an endpoint to test it</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeCategory} onValueChange={setActiveCategory}>
              <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
                {categories.map((category) => (
                  <TabsTrigger key={category} value={category} className="flex items-center gap-1">
                    {CATEGORY_ICONS[category]}
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>

              {categories.map((category) => (
                <TabsContent key={category} value={category} className="space-y-2 max-h-[500px] overflow-auto">
                  {API_ENDPOINTS.filter((e) => e.category === category).map((endpoint) => (
                    <div
                      key={endpoint.path}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedEndpoint?.path === endpoint.path
                          ? "bg-accent border-primary"
                          : "hover:bg-accent/50"
                      }`}
                      onClick={() => {
                        setSelectedEndpoint(endpoint)
                        setResponse("")
                        setResponseStatus(null)
                        setResponseTime(null)
                        setQueryParams("")
                        setRequestBody(endpoint.bodySchema || "")
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={METHOD_COLORS[endpoint.method]}>
                          {endpoint.method}
                        </Badge>
                        <code className="text-sm font-mono flex-1 truncate">{endpoint.path}</code>
                        {endpoint.mycaIntegrated && (
                          <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400">
                            <Bot className="h-3 w-3" />
                          </Badge>
                        )}
                        {endpoint.realtime && (
                          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400">
                            <Zap className="h-3 w-3" />
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{endpoint.description}</p>
                    </div>
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* API Tester */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              API Tester
            </CardTitle>
            <CardDescription>
              {selectedEndpoint ? `Testing ${selectedEndpoint.path}` : "Select an endpoint to test"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedEndpoint ? (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={METHOD_COLORS[selectedEndpoint.method]}>
                    {selectedEndpoint.method}
                  </Badge>
                  <code className="flex-1 text-sm font-mono bg-muted p-2 rounded overflow-x-auto">
                    {selectedEndpoint.path}
                  </code>
                </div>

                {/* Parameters */}
                {selectedEndpoint.params && selectedEndpoint.params.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Parameters</label>
                    <div className="grid gap-2">
                      {selectedEndpoint.params.map((param) => (
                        <div key={param.name} className="flex items-center gap-2 text-sm">
                          <code className="bg-muted px-2 py-1 rounded">{param.name}</code>
                          <span className="text-muted-foreground">({param.type})</span>
                          {param.required && <Badge variant="outline" className="text-xs">required</Badge>}
                        </div>
                      ))}
                    </div>
                    <Input
                      placeholder="e.g., query=agaricus&limit=10"
                      value={queryParams}
                      onChange={(e) => setQueryParams(e.target.value)}
                    />
                  </div>
                )}

                {/* Request Body */}
                {selectedEndpoint.method === "POST" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Request Body (JSON)</label>
                    <Textarea
                      value={requestBody}
                      onChange={(e) => setRequestBody(e.target.value)}
                      className="font-mono text-sm min-h-[120px]"
                      placeholder={selectedEndpoint.bodySchema || '{"key": "value"}'}
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={() => testEndpoint(selectedEndpoint)} 
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Request
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={copyCurl}>
                    <Terminal className="h-4 w-4 mr-2" />
                    Copy cURL
                  </Button>
                </div>

                {/* Response */}
                {(response || loading) && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Response</span>
                        {responseStatus && (
                          <Badge variant={responseStatus >= 200 && responseStatus < 300 ? "default" : "destructive"}>
                            {responseStatus >= 200 && responseStatus < 300 ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1" />
                            )}
                            {responseStatus}
                          </Badge>
                        )}
                        {responseTime && (
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            {responseTime}ms
                          </Badge>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" onClick={copyResponse}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <pre className="bg-slate-950 text-gray-300 p-4 rounded-lg overflow-auto max-h-[350px] text-xs font-mono">
                      {response || "Loading..."}
                    </pre>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select an endpoint from the list to test it</p>
                <p className="text-sm mt-2">All API interactions are logged to improve MYCA</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* MYCA Integration Notice */}
      <Card className="border-purple-500/50 bg-purple-500/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-purple-500/20">
              <Sparkles className="h-6 w-6 text-purple-500" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">MYCA Learning Mode</h4>
              <p className="text-sm text-muted-foreground">
                All API interactions are logged to improve MYCA's understanding of developer needs. 
                Your usage helps make the AI better for everyone!
              </p>
            </div>
            <Button variant="outline" asChild>
              <a href="/natureos/model-training">
                Learn More
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
