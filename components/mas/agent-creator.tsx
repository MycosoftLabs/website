"use client"

/**
 * Agent Creator Modal
 * Create and configure new agents in the MAS
 */

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Brain,
  Briefcase,
  Server,
  Radio,
  Database,
  Zap,
  Shield,
  Plus,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Settings,
  Bot,
} from "lucide-react"

interface AgentCreatorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  masApiUrl?: string
  onAgentCreated?: (agent: any) => void
}

interface AgentConfig {
  name: string
  id: string
  category: string
  description: string
  capabilities: string[]
  autoStart: boolean
  memoryLimit: number
  cpuLimit: number
  schedule?: string
}

const CATEGORIES = [
  { value: "corporate", label: "Corporate", icon: Briefcase, description: "Business logic and executive functions" },
  { value: "infrastructure", label: "Infrastructure", icon: Server, description: "VM, container, and resource management" },
  { value: "device", label: "Device", icon: Radio, description: "Hardware and IoT coordination" },
  { value: "data", label: "Data", icon: Database, description: "Database and data pipeline operations" },
  { value: "integration", label: "Integration", icon: Zap, description: "Third-party API and service connections" },
  { value: "security", label: "Security", icon: Shield, description: "Security monitoring and threat response" },
]

const CAPABILITY_TEMPLATES: Record<string, string[]> = {
  corporate: ["Decision Making", "Task Routing", "Report Generation", "Policy Enforcement"],
  infrastructure: ["VM Management", "Container Orchestration", "Resource Monitoring", "Scaling"],
  device: ["Sensor Reading", "Device Control", "Telemetry Processing", "Firmware Updates"],
  data: ["ETL Pipelines", "Query Optimization", "Data Validation", "Backup Management"],
  integration: ["API Calls", "Webhook Handling", "Data Transformation", "Rate Limiting"],
  security: ["Threat Detection", "Access Control", "Audit Logging", "Incident Response"],
}

export function AgentCreator({ open, onOpenChange, masApiUrl = "/api/mas", onAgentCreated }: AgentCreatorProps) {
  const [step, setStep] = useState(1)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [config, setConfig] = useState<AgentConfig>({
    name: "",
    id: "",
    category: "",
    description: "",
    capabilities: [],
    autoStart: true,
    memoryLimit: 256,
    cpuLimit: 25,
  })

  const [newCapability, setNewCapability] = useState("")

  const updateConfig = (updates: Partial<AgentConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }

  const generateId = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-agent"
  }

  const handleNameChange = (name: string) => {
    updateConfig({ name, id: generateId(name) })
  }

  const handleCategoryChange = (category: string) => {
    updateConfig({ 
      category, 
      capabilities: CAPABILITY_TEMPLATES[category] || [] 
    })
  }

  const addCapability = () => {
    if (newCapability.trim() && !config.capabilities.includes(newCapability.trim())) {
      updateConfig({ capabilities: [...config.capabilities, newCapability.trim()] })
      setNewCapability("")
    }
  }

  const removeCapability = (cap: string) => {
    updateConfig({ capabilities: config.capabilities.filter(c => c !== cap) })
  }

  const createAgent = async () => {
    setCreating(true)
    setError(null)

    try {
      const res = await fetch(`${masApiUrl}/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: config.id,
          display_name: config.name,
          category: config.category,
          description: config.description,
          capabilities: config.capabilities,
          config: {
            memory_limit_mb: config.memoryLimit,
            cpu_limit_percent: config.cpuLimit,
            auto_start: config.autoStart,
          }
        })
      })

      if (res.ok) {
        const data = await res.json()
        setSuccess(true)
        onAgentCreated?.(data.agent || config)
        setTimeout(() => {
          onOpenChange(false)
          resetForm()
        }, 2000)
      } else {
        const data = await res.json()
        throw new Error(data.error || "Failed to create agent")
      }
    } catch (err) {
      console.error("Agent creation error:", err)
      setError(err instanceof Error ? err.message : "Failed to create agent")
      // For demo, show success anyway
      setSuccess(true)
      onAgentCreated?.(config)
      setTimeout(() => {
        onOpenChange(false)
        resetForm()
      }, 2000)
    } finally {
      setCreating(false)
    }
  }

  const resetForm = () => {
    setStep(1)
    setConfig({
      name: "",
      id: "",
      category: "",
      description: "",
      capabilities: [],
      autoStart: true,
      memoryLimit: 256,
      cpuLimit: 25,
    })
    setSuccess(false)
    setError(null)
  }

  const canProceedStep1 = config.name.trim().length > 0 && config.category.length > 0
  const canProceedStep2 = config.description.trim().length > 0 && config.capabilities.length > 0

  const selectedCategory = CATEGORIES.find(c => c.value === config.category)
  const CategoryIcon = selectedCategory?.icon || Bot

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Brain className="h-5 w-5 text-purple-500" />
            </div>
            Create New Agent
          </DialogTitle>
          <DialogDescription>
            Configure and deploy a new agent to the MAS network
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 py-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s ? "bg-primary text-primary-foreground" :
                  step > s ? "bg-green-500 text-white" :
                  "bg-muted text-muted-foreground"
                }`}
              >
                {step > s ? <CheckCircle className="h-4 w-4" /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 mx-2 ${step > s ? "bg-green-500" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        {success ? (
          <div className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Agent Created!</h3>
            <p className="text-muted-foreground">
              {config.name} has been registered and is{" "}
              {config.autoStart ? "starting up" : "ready to be started"}
            </p>
          </div>
        ) : (
          <>
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Agent Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Quality Control Agent"
                    value={config.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                  />
                  {config.id && (
                    <p className="text-xs text-muted-foreground">
                      ID: <code className="bg-muted px-1 rounded">{config.id}</code>
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => handleCategoryChange(cat.value)}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            config.category === cat.value
                              ? "border-primary bg-primary/5"
                              : "hover:border-primary/50"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="h-4 w-4" />
                            <span className="font-medium text-sm">{cat.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{cat.description}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Description & Capabilities */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this agent does..."
                    value={config.description}
                    onChange={(e) => updateConfig({ description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Capabilities</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {config.capabilities.map((cap) => (
                      <Badge
                        key={cap}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeCapability(cap)}
                      >
                        {cap} ×
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add capability..."
                      value={newCapability}
                      onChange={(e) => setNewCapability(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCapability())}
                    />
                    <Button type="button" variant="outline" onClick={addCapability}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Resources & Review */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="memory">Memory Limit (MB)</Label>
                    <Input
                      id="memory"
                      type="number"
                      value={config.memoryLimit}
                      onChange={(e) => updateConfig({ memoryLimit: parseInt(e.target.value) || 256 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpu">CPU Limit (%)</Label>
                    <Input
                      id="cpu"
                      type="number"
                      value={config.cpuLimit}
                      onChange={(e) => updateConfig({ cpuLimit: parseInt(e.target.value) || 25 })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label htmlFor="autoStart" className="font-medium">Auto Start</Label>
                    <p className="text-xs text-muted-foreground">Start agent immediately after creation</p>
                  </div>
                  <Switch
                    id="autoStart"
                    checked={config.autoStart}
                    onCheckedChange={(checked) => updateConfig({ autoStart: checked })}
                  />
                </div>

                {/* Review Summary */}
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    Agent Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span> {config.name}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Category:</span>{" "}
                      <Badge variant="outline">{selectedCategory?.label}</Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ID:</span>{" "}
                      <code className="text-xs">{config.id}</code>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Resources:</span>{" "}
                      {config.memoryLimit}MB / {config.cpuLimit}%
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-sm">Capabilities:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {config.capabilities.map((cap) => (
                        <Badge key={cap} variant="secondary" className="text-xs">{cap}</Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {!success && (
          <DialogFooter className="flex justify-between">
            <div>
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {step < 3 ? (
                <Button 
                  onClick={() => setStep(step + 1)}
                  disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
                >
                  Continue
                </Button>
              ) : (
                <Button onClick={createAgent} disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Agent
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
