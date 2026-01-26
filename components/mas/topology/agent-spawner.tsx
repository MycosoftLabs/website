"use client"

/**
 * Agent Spawner Component
 * Spawn new agents from templates via the MAS orchestrator
 */

import { useState, useCallback } from "react"
import {
  Plus,
  Rocket,
  X,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ChevronDown,
  Settings,
  Cpu,
  Database,
  Shield,
  Wifi,
  Microscope,
  DollarSign,
  MessageSquare,
  BarChart3,
  Cog,
  Bot,
} from "lucide-react"
import type { NodeCategory, DetectedGap } from "./types"

// Agent templates with category and default config
const AGENT_TEMPLATES = [
  { id: "data-scraper", name: "Data Scraper", category: "data" as NodeCategory, icon: Database, description: "Scrapes and ingests data from external sources" },
  { id: "etl-worker", name: "ETL Worker", category: "data" as NodeCategory, icon: Cog, description: "Extract, Transform, Load data processing" },
  { id: "api-integration", name: "API Integration", category: "integration" as NodeCategory, icon: Wifi, description: "Integrates with external APIs" },
  { id: "security-scanner", name: "Security Scanner", category: "security" as NodeCategory, icon: Shield, description: "Scans for security vulnerabilities" },
  { id: "device-monitor", name: "Device Monitor", category: "device" as NodeCategory, icon: Cpu, description: "Monitors IoT devices and sensors" },
  { id: "research-worker", name: "Research Worker", category: "research" as NodeCategory, icon: Microscope, description: "Performs research and analysis tasks" },
  { id: "financial-worker", name: "Financial Worker", category: "financial" as NodeCategory, icon: DollarSign, description: "Handles financial operations" },
  { id: "communication-handler", name: "Communication Handler", category: "communication" as NodeCategory, icon: MessageSquare, description: "Manages communication channels" },
  { id: "analytics-worker", name: "Analytics Worker", category: "data" as NodeCategory, icon: BarChart3, description: "Performs data analytics" },
  { id: "generic-agent", name: "Generic Agent", category: "core" as NodeCategory, icon: Bot, description: "General-purpose agent" },
]

const CATEGORY_COLORS: Record<NodeCategory, string> = {
  core: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  financial: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  mycology: "bg-green-500/20 text-green-400 border-green-500/30",
  research: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  dao: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  communication: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  data: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  infrastructure: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  simulation: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  security: "bg-red-500/20 text-red-400 border-red-500/30",
  integration: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  device: "bg-lime-500/20 text-lime-400 border-lime-500/30",
  chemistry: "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30",
  nlm: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
}

interface AgentSpawnerProps {
  gaps: DetectedGap[]
  onSpawn: (template: string, config: Record<string, unknown>) => Promise<{ success: boolean; message: string }>
  className?: string
}

export function AgentSpawner({ gaps, onSpawn, className = "" }: AgentSpawnerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<typeof AGENT_TEMPLATES[0] | null>(null)
  const [customName, setCustomName] = useState("")
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [config, setConfig] = useState<Record<string, string>>({})
  const [isSpawning, setIsSpawning] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  // Reset form
  const resetForm = useCallback(() => {
    setSelectedTemplate(null)
    setCustomName("")
    setConfig({})
    setShowAdvanced(false)
    setResult(null)
  }, [])

  // Handle spawn
  const handleSpawn = useCallback(async () => {
    if (!selectedTemplate) return

    setIsSpawning(true)
    setResult(null)

    try {
      const spawnResult = await onSpawn(selectedTemplate.id, {
        name: customName || `${selectedTemplate.name}-${Date.now()}`,
        category: selectedTemplate.category,
        ...config,
      })
      setResult(spawnResult)
      if (spawnResult.success) {
        setTimeout(() => {
          resetForm()
        }, 2000)
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Spawn failed",
      })
    } finally {
      setIsSpawning(false)
    }
  }, [selectedTemplate, customName, config, onSpawn, resetForm])

  // Handle gap quick-spawn
  const handleGapSpawn = useCallback(
    async (gap: DetectedGap) => {
      setIsSpawning(true)
      try {
        const spawnResult = await onSpawn(gap.suggestedAgentType, {
          name: `${gap.suggestedAgentType}-${Date.now()}`,
          category: gap.suggestedCategory,
          gapId: gap.id,
        })
        setResult(spawnResult)
      } catch (error) {
        setResult({
          success: false,
          message: error instanceof Error ? error.message : "Spawn failed",
        })
      } finally {
        setIsSpawning(false)
      }
    },
    [onSpawn]
  )

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`
          fixed bottom-20 left-4 z-40 flex items-center gap-2
          px-4 py-2 bg-green-600/90 backdrop-blur-sm rounded-lg
          border border-green-500/50 hover:border-green-400
          text-white text-sm font-medium
          transition-all hover:shadow-lg hover:shadow-green-500/20
          ${gaps.length > 0 ? "animate-pulse" : ""}
          ${className}
        `}
      >
        <Plus className="h-4 w-4" />
        <span>Spawn Agent</span>
        {gaps.length > 0 && (
          <span className="px-1.5 py-0.5 bg-yellow-500 text-black text-[10px] rounded-full font-bold">
            {gaps.length}
          </span>
        )}
      </button>
    )
  }

  return (
    <div
      className={`
        fixed bottom-20 left-4 z-40 w-96
        bg-slate-900/95 backdrop-blur-md rounded-lg
        border border-white/10 shadow-2xl
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-green-400" />
          <h3 className="text-white font-semibold">Spawn New Agent</h3>
        </div>
        <button
          onClick={() => {
            setIsOpen(false)
            resetForm()
          }}
          className="p-1 hover:bg-white/10 rounded transition-colors"
        >
          <X className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
        {/* Detected Gaps */}
        {gaps.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-yellow-400">
              <AlertTriangle className="h-4 w-4" />
              <span>Detected Gaps ({gaps.length})</span>
            </div>
            <div className="space-y-2">
              {gaps.slice(0, 3).map((gap) => (
                <div
                  key={gap.id}
                  className="p-3 bg-yellow-950/30 border border-yellow-500/30 rounded-lg"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium">{gap.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Suggested: {gap.suggestedAgentType}
                      </p>
                    </div>
                    {gap.autoSpawnRecommended && (
                      <button
                        onClick={() => handleGapSpawn(gap)}
                        disabled={isSpawning}
                        className="px-2 py-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white text-xs rounded transition-colors flex items-center gap-1"
                      >
                        {isSpawning ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Plus className="h-3 w-3" />
                            Auto-Spawn
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Template Selection */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Select Template</label>
          <div className="grid grid-cols-2 gap-2">
            {AGENT_TEMPLATES.map((template) => {
              const Icon = template.icon
              const isSelected = selectedTemplate?.id === template.id
              return (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`
                    p-3 rounded-lg border text-left transition-all
                    ${isSelected
                      ? "bg-green-500/20 border-green-500"
                      : "bg-slate-800 border-white/10 hover:border-white/30"
                    }
                  `}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-4 w-4 ${isSelected ? "text-green-400" : "text-gray-400"}`} />
                    <span className={`text-sm font-medium ${isSelected ? "text-white" : "text-gray-300"}`}>
                      {template.name}
                    </span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${CATEGORY_COLORS[template.category]}`}>
                    {template.category}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Configuration */}
        {selectedTemplate && (
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Agent Name (optional)</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={`${selectedTemplate.name}-${Date.now()}`}
                className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded text-white text-sm placeholder-gray-500 focus:border-green-500 focus:outline-none"
              />
            </div>

            <p className="text-xs text-gray-500">{selectedTemplate.description}</p>

            {/* Advanced Settings */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span>Advanced Settings</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
            </button>

            {showAdvanced && (
              <div className="space-y-3 p-3 bg-slate-800/50 rounded-lg">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Memory Limit (MB)</label>
                  <input
                    type="number"
                    value={config.memoryLimit || "512"}
                    onChange={(e) => setConfig({ ...config, memoryLimit: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-700 border border-white/10 rounded text-white text-sm focus:border-green-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">CPU Limit</label>
                  <input
                    type="text"
                    value={config.cpuLimit || "1.0"}
                    onChange={(e) => setConfig({ ...config, cpuLimit: e.target.value })}
                    placeholder="1.0"
                    className="w-full px-3 py-1.5 bg-slate-700 border border-white/10 rounded text-white text-sm focus:border-green-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Environment Variables</label>
                  <textarea
                    value={config.envVars || ""}
                    onChange={(e) => setConfig({ ...config, envVars: e.target.value })}
                    placeholder="KEY=value&#10;ANOTHER_KEY=value"
                    rows={3}
                    className="w-full px-3 py-1.5 bg-slate-700 border border-white/10 rounded text-white text-sm font-mono focus:border-green-500 focus:outline-none resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Result Message */}
        {result && (
          <div
            className={`
              p-3 rounded-lg flex items-start gap-2
              ${result.success
                ? "bg-green-950/50 border border-green-500/30"
                : "bg-red-950/50 border border-red-500/30"
              }
            `}
          >
            {result.success ? (
              <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
            )}
            <p className={`text-sm ${result.success ? "text-green-300" : "text-red-300"}`}>
              {result.message}
            </p>
          </div>
        )}

        {/* Spawn Button */}
        <button
          onClick={handleSpawn}
          disabled={!selectedTemplate || isSpawning}
          className={`
            w-full py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2
            ${selectedTemplate && !isSpawning
              ? "bg-green-600 hover:bg-green-500 text-white"
              : "bg-slate-700 text-gray-500 cursor-not-allowed"
            }
            transition-colors
          `}
        >
          {isSpawning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Spawning...</span>
            </>
          ) : (
            <>
              <Rocket className="h-4 w-4" />
              <span>Spawn Agent</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
