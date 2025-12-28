"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { 
  Bot, 
  Plus, 
  Search, 
  Settings, 
  Activity, 
  Zap, 
  Brain, 
  MessageSquare, 
  ExternalLink, 
  Loader2,
  Network,
  Cpu,
  Database,
  Shield,
  Volume2,
  Eye,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Clock,
  User,
  Play,
  Pause,
  Edit,
  X,
  CheckCircle,
  AlertCircle,
  Cloud,
  Server,
  RotateCw
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Agent {
  id: string
  name: string
  type: string
  status: "active" | "idle" | "offline"
  description: string
  capabilities: string[]
  lastActive: string
  tasksCompleted: number
  successRate: number
}

interface Conversation {
  id: string
  userId: string
  agentId: string
  agentName: string
  topic: string
  startedAt: string
  lastMessageAt: string
  messageCount: number
  status: "active" | "completed" | "archived"
  preview?: string
  timeAgo: string
}

interface Workflow {
  id: string
  name: string
  active: boolean
  description?: string
  createdAt: string
  updatedAt: string
  executionCount?: number
  lastExecution?: string
  lastStatus?: "success" | "error" | "running"
  lastRunAgo?: string
  updatedAgo?: string
  tags?: string[]
  nodes?: number
  source: "local" | "cloud"
  editorUrl?: string
}

const MYCA_AGENTS: Agent[] = [
  {
    id: "myca-core",
    name: "MYCA Core",
    type: "orchestrator",
    status: "active",
    description: "Central AI orchestrator managing all sub-agents and workflows",
    capabilities: ["Task Routing", "Agent Coordination", "Natural Language", "Decision Making"],
    lastActive: "Just now",
    tasksCompleted: 145892,
    successRate: 99.2,
  },
  {
    id: "myca-researcher",
    name: "Research Agent",
    type: "research",
    status: "active",
    description: "Autonomous research agent for mycological studies and data analysis",
    capabilities: ["Literature Review", "Data Analysis", "Hypothesis Generation", "Citation Management"],
    lastActive: "2 min ago",
    tasksCompleted: 34521,
    successRate: 97.8,
  },
  {
    id: "myca-vision",
    name: "Vision Agent",
    type: "vision",
    status: "active",
    description: "Computer vision for species identification and morphology analysis",
    capabilities: ["Species ID", "Morphology Analysis", "Image Processing", "Pattern Recognition"],
    lastActive: "1 min ago",
    tasksCompleted: 89234,
    successRate: 94.5,
  },
  {
    id: "myca-voice",
    name: "Voice Agent",
    type: "voice",
    status: "idle",
    description: "Voice interaction using ElevenLabs for natural conversation",
    capabilities: ["Speech Recognition", "Voice Synthesis", "Conversation", "Commands"],
    lastActive: "5 min ago",
    tasksCompleted: 12453,
    successRate: 96.3,
  },
  {
    id: "myca-data",
    name: "Data Agent",
    type: "data",
    status: "active",
    description: "MINDEX database management and data pipeline orchestration",
    capabilities: ["Data Ingestion", "ETL Pipelines", "Query Optimization", "Cache Management"],
    lastActive: "Just now",
    tasksCompleted: 567890,
    successRate: 99.8,
  },
  {
    id: "myca-network",
    name: "Network Agent",
    type: "network",
    status: "active",
    description: "Manages device network, sensors, and IoT infrastructure",
    capabilities: ["Device Management", "Sensor Monitoring", "Network Optimization", "Edge Computing"],
    lastActive: "Just now",
    tasksCompleted: 234567,
    successRate: 98.9,
  },
  {
    id: "myca-security",
    name: "Security Agent",
    type: "security",
    status: "active",
    description: "Monitors security, authentication, and threat detection",
    capabilities: ["Auth Management", "Threat Detection", "Encryption", "Audit Logging"],
    lastActive: "Just now",
    tasksCompleted: 45678,
    successRate: 99.9,
  },
  {
    id: "myca-workflow",
    name: "Workflow Agent",
    type: "workflow",
    status: "active",
    description: "n8n workflow automation and integration management",
    capabilities: ["Workflow Execution", "API Integration", "Scheduling", "Event Triggers"],
    lastActive: "1 min ago",
    tasksCompleted: 78901,
    successRate: 97.5,
  },
]

const agentIcons: Record<string, React.ReactNode> = {
  orchestrator: <Brain className="h-5 w-5" />,
  research: <Sparkles className="h-5 w-5" />,
  vision: <Eye className="h-5 w-5" />,
  voice: <Volume2 className="h-5 w-5" />,
  data: <Database className="h-5 w-5" />,
  network: <Network className="h-5 w-5" />,
  security: <Shield className="h-5 w-5" />,
  workflow: <Zap className="h-5 w-5" />,
}

export default function AIStudioPage() {
  const [agents, setAgents] = useState<Agent[]>(MYCA_AGENTS)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [showDashboard, setShowDashboard] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationsLoading, setConversationsLoading] = useState(false)
  const [hasRealConversations, setHasRealConversations] = useState(false)
  
  // Workflows state
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [workflowsLoading, setWorkflowsLoading] = useState(false)
  const [hasRealWorkflows, setHasRealWorkflows] = useState(false)
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false)
  const [workflowAction, setWorkflowAction] = useState<{ action: string; workflow: Workflow } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [mycaAnalysis, setMycaAnalysis] = useState<string | null>(null)

  // Fetch real conversations from API
  const fetchConversations = async () => {
    setConversationsLoading(true)
    try {
      const response = await fetch("/api/myca/conversations?limit=50")
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
        setHasRealConversations(data.hasRealData || false)
      }
    } catch (error) {
      console.error("Error fetching conversations:", error)
    } finally {
      setConversationsLoading(false)
    }
  }

  // Fetch real workflows from API
  const fetchWorkflows = async () => {
    setWorkflowsLoading(true)
    try {
      const response = await fetch("/api/myca/workflows?executions=true")
      if (response.ok) {
        const data = await response.json()
        setWorkflows(data.workflows || [])
        setHasRealWorkflows(data.hasRealData || false)
      }
    } catch (error) {
      console.error("Error fetching workflows:", error)
    } finally {
      setWorkflowsLoading(false)
    }
  }

  // Handle workflow action with MYCA oversight
  const handleWorkflowAction = async (action: string, workflow: Workflow) => {
    setActionLoading(true)
    setMycaAnalysis(null)
    
    try {
      const response = await fetch("/api/myca/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          workflowId: workflow.id,
          source: workflow.source,
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setMycaAnalysis(data.mycaAnalysis)
        // Refresh workflows after action
        await fetchWorkflows()
        setTimeout(() => {
          setWorkflowAction(null)
          setMycaAnalysis(null)
        }, 3000)
      } else {
        setMycaAnalysis(`Action blocked: ${data.reason || data.error}`)
      }
    } catch (error) {
      console.error("Error performing workflow action:", error)
      setMycaAnalysis("Error: Failed to communicate with MYCA")
    } finally {
      setActionLoading(false)
    }
  }

  const openWorkflowEditor = (workflow: Workflow) => {
    setSelectedWorkflow(workflow)
    setWorkflowModalOpen(true)
  }

  const confirmWorkflowAction = (action: string, workflow: Workflow) => {
    setWorkflowAction({ action, workflow })
  }

  // Fetch conversations and workflows on mount
  useEffect(() => {
    fetchConversations()
    fetchWorkflows()
  }, [])

  const filteredAgents = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeAgents = agents.filter((a) => a.status === "active").length
  const totalTasks = agents.reduce((sum, a) => sum + a.tasksCompleted, 0)
  const avgSuccess = agents.reduce((sum, a) => sum + a.successRate, 0) / agents.length

  const openMYCADashboard = () => {
    setShowDashboard(true)
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Badge variant="secondary" className="bg-purple-500/20 text-purple-400">
              <Bot className="h-3 w-3 mr-1" />
              Multi-Agent System
            </Badge>
          </div>
          <h1 className="text-3xl font-bold">MYCA AI Studio</h1>
          <p className="text-muted-foreground">Manage and monitor your AI agents and workflows</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openMYCADashboard}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Full Dashboard
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Agent
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Bot className="h-4 w-4" />
              <span className="text-sm">Active Agents</span>
            </div>
            <div className="text-2xl font-bold">{activeAgents}/{agents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Activity className="h-4 w-4" />
              <span className="text-sm">Tasks Completed</span>
            </div>
            <div className="text-2xl font-bold">{(totalTasks / 1000000).toFixed(1)}M</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Zap className="h-4 w-4" />
              <span className="text-sm">Avg Success Rate</span>
            </div>
            <div className="text-2xl font-bold text-green-500">{avgSuccess.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Cpu className="h-4 w-4" />
              <span className="text-sm">System Status</span>
            </div>
            <div className="text-2xl font-bold flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Healthy
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="dashboard">MYCA Dashboard</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          {/* Search */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Agents Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAgents.map((agent) => (
              <Card
                key={agent.id}
                className={`cursor-pointer transition-all hover:border-primary ${
                  selectedAgent?.id === agent.id ? "border-primary" : ""
                }`}
                onClick={() => setSelectedAgent(agent)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        agent.status === "active" ? "bg-green-500/20 text-green-500" :
                        agent.status === "idle" ? "bg-yellow-500/20 text-yellow-500" :
                        "bg-gray-500/20 text-gray-500"
                      }`}>
                        {agentIcons[agent.type] || <Bot className="h-5 w-5" />}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                        <CardDescription className="text-xs capitalize">{agent.type}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={agent.status === "active" ? "default" : agent.status === "idle" ? "secondary" : "outline"}>
                      {agent.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">{agent.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {agent.capabilities.slice(0, 3).map((cap) => (
                      <Badge key={cap} variant="outline" className="text-xs">{cap}</Badge>
                    ))}
                    {agent.capabilities.length > 3 && (
                      <Badge variant="outline" className="text-xs">+{agent.capabilities.length - 3}</Badge>
                    )}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span>{agent.tasksCompleted.toLocaleString()} tasks</span>
                    <span className="text-green-500">{agent.successRate}% success</span>
                    <span>{agent.lastActive}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-500" />
                    MYCA UniFi Dashboard
                  </CardTitle>
                  <CardDescription>Full access to the Multi-Agent Control System</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href="http://localhost:3003" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in New Tab
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="http://localhost:3100" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open UniFi Portal
                    </a>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative w-full h-[700px] rounded-lg overflow-hidden border bg-background">
                <iframe
                  src="http://localhost:3003"
                  className="w-full h-full border-0"
                  title="MYCA Dashboard"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Recent Conversations
                    {hasRealConversations && (
                      <Badge variant="secondary" className="ml-2 bg-green-500/20 text-green-400">
                        Live Data
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>View and manage AI conversation history from all MYCA interactions</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchConversations} disabled={conversationsLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${conversationsLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {conversationsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading conversations...</span>
                </div>
              ) : conversations.length > 0 ? (
                <div className="space-y-3">
                  {conversations.map((conv) => (
                    <div 
                      key={conv.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${
                          conv.status === "active" ? "bg-green-500/20" : 
                          conv.status === "completed" ? "bg-blue-500/20" : 
                          "bg-gray-500/20"
                        }`}>
                          <MessageSquare className={`h-5 w-5 ${
                            conv.status === "active" ? "text-green-500" : 
                            conv.status === "completed" ? "text-blue-500" : 
                            "text-gray-500"
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{conv.topic}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Bot className="h-3 w-3" />
                            <span>{conv.agentName}</span>
                            <span>•</span>
                            <span>{conv.messageCount} messages</span>
                            {conv.userId && conv.userId !== "system" && conv.userId !== "anonymous" && (
                              <>
                                <span>•</span>
                                <User className="h-3 w-3" />
                                <span className="truncate max-w-[100px]">{conv.userId}</span>
                              </>
                            )}
                          </div>
                          {conv.preview && (
                            <p className="text-xs text-muted-foreground mt-1 truncate max-w-md">{conv.preview}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <Badge variant={
                          conv.status === "active" ? "default" : 
                          conv.status === "completed" ? "secondary" : 
                          "outline"
                        }>
                          {conv.status}
                        </Badge>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{conv.timeAgo}</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Conversations Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start a conversation with MYCA to see your interaction history here.
                  </p>
                  <Button asChild>
                    <a href="/myca-ai">
                      <Bot className="h-4 w-4 mr-2" />
                      Chat with MYCA
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Conversation Stats */}
          {conversations.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{conversations.length}</div>
                  <p className="text-sm text-muted-foreground">Total Conversations</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-green-500">
                    {conversations.filter(c => c.status === "active").length}
                  </div>
                  <p className="text-sm text-muted-foreground">Active Now</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">
                    {conversations.reduce((sum, c) => sum + c.messageCount, 0)}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Messages</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">
                    {new Set(conversations.map(c => c.agentName)).size}
                  </div>
                  <p className="text-sm text-muted-foreground">Agents Involved</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    n8n Workflows
                    {hasRealWorkflows && (
                      <Badge variant="secondary" className="ml-2 bg-green-500/20 text-green-400">
                        Live Data
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    AI-powered automation workflows with MYCA oversight
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchWorkflows} disabled={workflowsLoading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${workflowsLoading ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="http://localhost:5678" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open n8n
                    </a>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {workflowsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading workflows...</span>
                </div>
              ) : workflows.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {workflows.map((wf) => (
                    <Card 
                      key={`${wf.id}-${wf.source}`} 
                      className="cursor-pointer hover:border-primary transition-all"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              wf.active ? "bg-green-500/20" : "bg-gray-500/20"
                            }`}>
                              <Zap className={`h-4 w-4 ${wf.active ? "text-green-500" : "text-gray-500"}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base truncate">{wf.name}</CardTitle>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {wf.source === "cloud" ? (
                                  <Cloud className="h-3 w-3" />
                                ) : (
                                  <Server className="h-3 w-3" />
                                )}
                                <span>{wf.source}</span>
                                {wf.nodes && (
                                  <>
                                    <span>•</span>
                                    <span>{wf.nodes} nodes</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <Badge variant={wf.active ? "default" : "secondary"}>
                            {wf.active ? "active" : "inactive"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {wf.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{wf.description}</p>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            <span>{wf.executionCount?.toLocaleString() || 0} runs</span>
                          </div>
                          {wf.lastStatus && (
                            <div className="flex items-center gap-1">
                              {wf.lastStatus === "success" ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : wf.lastStatus === "error" ? (
                                <AlertCircle className="h-3 w-3 text-red-500" />
                              ) : (
                                <RotateCw className="h-3 w-3 text-blue-500 animate-spin" />
                              )}
                              <span>{wf.lastStatus}</span>
                            </div>
                          )}
                          <span>{wf.lastRunAgo || "Never run"}</span>
                        </div>
                        
                        <div className="flex gap-2 pt-2 border-t">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => openWorkflowEditor(wf)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          {wf.active ? (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => confirmWorkflowAction("deactivate", wf)}
                            >
                              <Pause className="h-3 w-3 mr-1" />
                              Stop
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => confirmWorkflowAction("activate", wf)}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Start
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => confirmWorkflowAction("execute", wf)}
                          >
                            <Zap className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Workflows Found</h3>
                  <p className="text-muted-foreground mb-4">
                    Connect to n8n or create your first workflow to see them here.
                  </p>
                  <Button asChild>
                    <a href="http://localhost:5678" target="_blank" rel="noopener noreferrer">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Workflow in n8n
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Workflow Stats */}
          {workflows.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{workflows.length}</div>
                  <p className="text-sm text-muted-foreground">Total Workflows</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-green-500">
                    {workflows.filter(w => w.active).length}
                  </div>
                  <p className="text-sm text-muted-foreground">Active</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">
                    {workflows.reduce((sum, w) => sum + (w.executionCount || 0), 0).toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Executions</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-500" />
                    <span className="text-lg font-bold">MYCA</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Overseeing Changes</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Selected Agent Detail Modal */}
      {selectedAgent && (
        <Card className="fixed bottom-4 right-4 w-96 z-50 shadow-2xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                {agentIcons[selectedAgent.type]}
                {selectedAgent.name}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedAgent(null)}>×</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{selectedAgent.description}</p>
            
            <div>
              <Label className="text-xs text-muted-foreground">Capabilities</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedAgent.capabilities.map((cap) => (
                  <Badge key={cap} variant="outline" className="text-xs">{cap}</Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">Tasks Completed</Label>
                <p className="font-medium">{selectedAgent.tasksCompleted.toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Success Rate</Label>
                <p className="font-medium text-green-500">{selectedAgent.successRate}%</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" size="sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workflow Editor Modal with embedded n8n */}
      <Dialog open={workflowModalOpen} onOpenChange={setWorkflowModalOpen}>
        <DialogContent className="max-w-6xl h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              {selectedWorkflow?.name || "Workflow Editor"}
              <Badge variant={selectedWorkflow?.active ? "default" : "secondary"} className="ml-2">
                {selectedWorkflow?.active ? "Active" : "Inactive"}
              </Badge>
              <Badge variant="outline" className="ml-2">
                {selectedWorkflow?.source === "cloud" ? (
                  <><Cloud className="h-3 w-3 mr-1" /> Cloud</>
                ) : (
                  <><Server className="h-3 w-3 mr-1" /> Local</>
                )}
              </Badge>
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" />
              MYCA is monitoring this workflow for safety and best practices
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 relative rounded-lg overflow-hidden border bg-background">
            {selectedWorkflow && (
              <iframe
                src={selectedWorkflow.editorUrl}
                className="w-full h-full border-0 min-h-[600px]"
                title={`Edit ${selectedWorkflow.name}`}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
              />
            )}
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Brain className="h-4 w-4 text-purple-500" />
              <span>Changes will be validated by MYCA before applying</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setWorkflowModalOpen(false)}>
                Close
              </Button>
              <Button variant="outline" asChild>
                <a href={selectedWorkflow?.editorUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </a>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MYCA Action Confirmation Dialog */}
      <AlertDialog open={!!workflowAction} onOpenChange={() => !actionLoading && setWorkflowAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              MYCA Workflow Action
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  {workflowAction?.action === "activate" && `Activate workflow "${workflowAction?.workflow.name}"?`}
                  {workflowAction?.action === "deactivate" && `Deactivate workflow "${workflowAction?.workflow.name}"?`}
                  {workflowAction?.action === "execute" && `Execute workflow "${workflowAction?.workflow.name}" manually?`}
                </p>
                
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <div className="flex items-center gap-2 text-purple-400 text-sm font-medium mb-2">
                    <Brain className="h-4 w-4" />
                    MYCA Analysis
                  </div>
                  {actionLoading ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing workflow action...
                    </div>
                  ) : mycaAnalysis ? (
                    <p className="text-sm text-muted-foreground">{mycaAnalysis}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      MYCA will validate this action to ensure system stability and prevent unintended consequences.
                    </p>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => workflowAction && handleWorkflowAction(workflowAction.action, workflowAction.workflow)}
              disabled={actionLoading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm with MYCA
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
