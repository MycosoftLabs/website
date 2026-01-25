"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Terminal, Play, Pause, Trash2, Download, Filter } from "lucide-react"

interface LogEntry {
  timestamp: string
  level: "info" | "warn" | "error" | "debug"
  agent_id: string
  action: string
  message: string
  duration_ms?: number
}

interface AgentTerminalProps {
  masApiUrl?: string
  agentId?: string
}

const levelColors: Record<string, string> = {
  info: "text-blue-400",
  warn: "text-yellow-400",
  error: "text-red-400",
  debug: "text-gray-400",
}

const levelBadgeVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  info: "default",
  warn: "outline",
  error: "destructive",
  debug: "secondary",
}

export function AgentTerminal({ masApiUrl = "/api/mas", agentId }: AgentTerminalProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [paused, setPaused] = useState(false)
  const [filter, setFilter] = useState<string>("all")
  const [selectedAgent, setSelectedAgent] = useState<string>(agentId || "all")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Simulate real-time logs
    const generateLog = (): LogEntry => {
      const agents = [
        "myca-core", "ceo-agent", "cfo-agent", "cto-agent",
        "proxmox-agent", "docker-agent", "network-agent",
        "mycobrain-coordinator", "mindex-agent", "n8n-agent",
        "soc-agent", "openai-agent"
      ]
      const actions = [
        "task_started", "task_completed", "message_sent", "message_received",
        "health_check", "snapshot_created", "data_processed", "api_called",
        "error_handled", "metric_logged", "cache_updated"
      ]
      const levels: ("info" | "warn" | "error" | "debug")[] = ["info", "info", "info", "warn", "error", "debug"]
      
      const agent = agents[Math.floor(Math.random() * agents.length)]
      const action = actions[Math.floor(Math.random() * actions.length)]
      const level = levels[Math.floor(Math.random() * levels.length)]
      
      const messages: Record<string, string[]> = {
        task_started: ["Processing incoming request", "Starting batch job", "Initializing workflow"],
        task_completed: ["Task finished successfully", "Job completed in expected time", "Workflow execution complete"],
        message_sent: ["Sent request to orchestrator", "Published event to broker", "Forwarded data to pipeline"],
        message_received: ["Received task from orchestrator", "Got response from agent", "Incoming event processed"],
        health_check: ["Health status: OK", "All systems operational", "Connectivity verified"],
        snapshot_created: ["State snapshot saved", "Backup checkpoint created", "Memory state persisted"],
        data_processed: ["Processed 1500 records", "Data transformation complete", "ETL job finished"],
        api_called: ["External API request succeeded", "Integration endpoint called", "Webhook delivered"],
        error_handled: ["Recovered from connection timeout", "Retried failed request", "Fallback activated"],
        metric_logged: ["Performance metrics recorded", "Resource usage logged", "Latency data captured"],
        cache_updated: ["Cache refreshed", "Memory cache invalidated", "State synchronized"],
      }
      
      return {
        timestamp: new Date().toISOString(),
        level,
        agent_id: agent,
        action,
        message: messages[action][Math.floor(Math.random() * messages[action].length)],
        duration_ms: Math.floor(Math.random() * 500) + 10,
      }
    }

    // Add initial logs
    const initialLogs = Array.from({ length: 20 }, generateLog)
    setLogs(initialLogs)

    // Simulate streaming logs
    const interval = setInterval(() => {
      if (!paused) {
        setLogs(prev => [...prev.slice(-100), generateLog()])
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [paused])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current && !paused) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, paused])

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const filteredLogs = logs.filter(log => {
    if (filter !== "all" && log.level !== filter) return false
    if (selectedAgent !== "all" && log.agent_id !== selectedAgent) return false
    return true
  })

  const agents = [...new Set(logs.map(l => l.agent_id))].sort()

  const handleClear = () => setLogs([])

  const handleDownload = () => {
    const content = filteredLogs.map(l => 
      `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.agent_id}] ${l.action}: ${l.message}`
    ).join("\n")
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `mas-logs-${new Date().toISOString().split("T")[0]}.txt`
    a.click()
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-green-500" />
            <CardTitle className="text-base">Agent Activity Stream</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-[160px] h-8">
                <SelectValue placeholder="All agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {agents.map(a => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[100px] h-8">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warn</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaused(!paused)}
            >
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea ref={scrollRef} className="h-[400px] bg-black/90 font-mono text-xs">
          <div className="p-4 space-y-1">
            {filteredLogs.map((log, i) => (
              <div key={i} className="flex items-start gap-2 hover:bg-white/5 px-1 rounded">
                <span className="text-gray-500 shrink-0">{formatTime(log.timestamp)}</span>
                <Badge variant={levelBadgeVariants[log.level]} className="h-5 shrink-0">
                  {log.level.toUpperCase()}
                </Badge>
                <span className="text-cyan-400 shrink-0">[{log.agent_id}]</span>
                <span className="text-purple-400 shrink-0">{log.action}:</span>
                <span className={levelColors[log.level]}>{log.message}</span>
                {log.duration_ms && (
                  <span className="text-gray-600 shrink-0 ml-auto">{log.duration_ms}ms</span>
                )}
              </div>
            ))}
            {paused && (
              <div className="text-center text-yellow-500 py-2">
                ⏸ Stream paused
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
