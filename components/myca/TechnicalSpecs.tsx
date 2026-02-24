"use client"

/**
 * TechnicalSpecs - Detailed, interactive MYCA technical specifications
 * Neuromorphic styling, expandable sections, structured data
 * Created: Feb 17, 2026
 */

import { useState } from "react"
import { NeuCard, NeuCardContent, NeuCardHeader, NeuBadge } from "@/components/ui/neuromorphic"
import {
  ChevronDown,
  ChevronRight,
  Brain,
  Database,
  Cpu,
  Wifi,
  Zap,
  Shield,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SpecItem {
  label: string
  value: string | string[]
  detail?: string
  href?: string
}

interface SpecCategory {
  id: string
  icon: React.ElementType
  title: string
  subtitle?: string
  items: SpecItem[]
  subSections?: { title: string; items: SpecItem[] }[]
}

const SPECS: SpecCategory[] = [
  {
    id: "consciousness",
    icon: Brain,
    title: "Consciousness",
    subtitle: "6-state model with attention, deliberation, world model",
    items: [
      {
        label: "States",
        value: ["DORMANT", "AWAKENING", "CONSCIOUS", "FOCUSED", "DREAMING", "HIBERNATING"],
        detail: "State machine with transitions driven by attention load and resource availability",
      },
      {
        label: "Attention Controller",
        value: "Manages saliency, focus allocation, and context window prioritization",
      },
      {
        label: "Deliberation (System 2)",
        value: "Explicit reasoning, chain-of-thought, multi-step planning",
      },
      {
        label: "Intuition (System 1)",
        value: "Fast pattern matching, cached responses, heuristic routing",
      },
      {
        label: "World Model",
        value: "Continuous sensor updates every 5s, biospheric telemetry integration",
      },
    ],
    subSections: [
      {
        title: "Emotional State",
        items: [
          { label: "Valence", value: "Real-time emotional valence from -1 to 1" },
          { label: "Dominant emotions", value: "Curiosity, urgency, calm, focus, etc." },
        ],
      },
    ],
  },
  {
    id: "memory",
    icon: Database,
    title: "Memory",
    subtitle: "6-layer architecture with auto-decay and consolidation",
    items: [
      { label: "Ephemeral", value: "30 min TTL", detail: "Working context, active conversation" },
      { label: "Session", value: "24h TTL", detail: "Current session scope" },
      { label: "Working", value: "7 days", detail: "Recent tasks, agent coordination" },
      { label: "Semantic", value: "Permanent", detail: "Concept embeddings, knowledge graph" },
      { label: "Episodic", value: "Permanent", detail: "Event sequences, narrative memory" },
      { label: "System", value: "Permanent", detail: "Constitutional constraints, procedural knowledge" },
      { label: "Consolidation", value: "MINDEX-backed", detail: "Auto-decay, cross-layer promotion" },
    ],
  },
  {
    id: "agents",
    icon: Cpu,
    title: "Agents",
    subtitle: "117+ specialized agents across 14 categories",
    items: [
      { label: "Core", value: "Orchestrator, AgentManager, ClusterManager" },
      { label: "Corporate", value: "CEOAgent, CFOAgent, CTOAgent, COOAgent, LegalAgent, HRAgent" },
      { label: "Scientific", value: "LabAgent, HypothesisAgent, SimulationAgent, AlphaFoldAgent" },
      { label: "Data", value: "MindexAgent, ETLAgent, SearchAgent, RouteMonitorAgent" },
      { label: "Integration", value: "N8NAgent, SupabaseAgent, NotionAgent, WebsiteAgent, AnthropicAgent" },
      { label: "Infrastructure", value: "ProxmoxAgent, DockerAgent, NetworkAgent, DeploymentAgent, CloudflareAgent" },
      { label: "Earth2", value: "Earth2Orchestrator, WeatherForecast, ClimateSimulation" },
      { label: "Security", value: "SecurityAgent, GuardianAgent, ImmuneSystemAgent" },
    ],
  },
  {
    id: "apis",
    icon: Wifi,
    title: "APIs & Protocols",
    subtitle: "200+ endpoints across MAS",
    items: [
      { label: "A2A (Agent-to-Agent)", value: "Inter-agent communication protocol" },
      { label: "WebMCP", value: "Model Context Protocol for tool discovery" },
      { label: "UCP Commerce", value: "Universal Commerce Protocol" },
      { label: "Consciousness API", value: "/api/myca/status, /api/myca/world" },
      { label: "Brain API", value: "Intention, attention, deliberation endpoints" },
      { label: "NLQ API", value: "Natural language query, search actions" },
      { label: "Voice/Orchestrator", value: "/api/mas/voice/orchestrator" },
    ],
  },
  {
    id: "sensors",
    icon: Zap,
    title: "Sensors & Data Sources",
    subtitle: "Live biospheric telemetry stack",
    items: [
      { label: "MycoBrain", value: "Soil, air, bioelectric, device telemetry, BME688/690, LoRa" },
      { label: "CREP", value: "Aviation (flights), Maritime (ships), Satellites, Weather" },
      { label: "Earth2", value: "Climate predictions, global environmental modeling" },
      { label: "NatureOS", value: "Ecosystem status, device network, MINDEX" },
      { label: "MINDEX", value: "Species, compounds, genetics knowledge graph, GBIF, iNaturalist" },
      { label: "Field devices", value: "Mushroom1, SporeBase, Hyphae1, MycoNode, ALARM" },
    ],
  },
  {
    id: "learning",
    icon: Shield,
    title: "Learning & Safety",
    subtitle: "Drift detection, governance, constitutional constraints",
    items: [
      { label: "Drift detection", value: "Non-stationary stream monitoring, concept drift alerts" },
      { label: "Continuous learning", value: "Incremental updates, rehearsal mechanisms" },
      { label: "Temporal pattern storage", value: "Time-series embeddings, causal hypotheses" },
      { label: "Provenance chain", value: "Data lineage, sensor → model traceability" },
      { label: "Multi-stakeholder governance", value: "Humans, ecosystems, machines as stakeholders" },
      { label: "Constitutional constraints", value: "Deontological rules, ecological protection" },
    ],
  },
]

function SpecValue({ item }: { item: SpecItem }) {
  if (Array.isArray(item.value)) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {item.value.map((v, i) => (
          <span key={i} className="px-2 py-0.5 rounded-md bg-muted/80 text-xs font-mono">
            {v}
          </span>
        ))}
      </div>
    )
  }
  return <span className="text-sm">{item.value}</span>
}

export function TechnicalSpecs({ className }: { className?: string }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["consciousness"]))

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section className={cn("py-16 md:py-24 neuromorphic-section", className)}>
      <div className="container max-w-6xl mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <NeuBadge variant="default" className="mb-4 border border-green-500/30">
            Technical
          </NeuBadge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Technical Specifications
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Detailed architecture, APIs, agents, sensors, and safety. Expand for
            full specifications.
          </p>
        </div>

        <div className="space-y-3">
          {SPECS.map((spec) => {
            const Icon = spec.icon
            const isOpen = expanded.has(spec.id)
            return (
              <NeuCard
                key={spec.id}
                className="overflow-hidden neu-raised cursor-pointer min-h-[44px] touch-manipulation"
                onClick={() => toggle(spec.id)}
              >
                <div className="flex items-center gap-3 p-4">
                  <button
                    className="p-2 rounded-lg neu-inset hover:opacity-80 transition-opacity min-h-[44px] min-w-[44px] flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggle(spec.id)
                    }}
                    aria-expanded={isOpen}
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Icon className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base">{spec.title}</h3>
                    {spec.subtitle && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {spec.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <NeuCardContent className="pt-0 px-4 pb-4 pl-14 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                      {spec.items.map((item, i) => (
                        <div
                          key={i}
                          className="flex flex-col gap-1 p-3 rounded-lg bg-muted/30"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              {item.label}
                            </span>
                            {item.href && (
                              <a
                                href={item.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-500 hover:text-green-400"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                          <SpecValue item={item} />
                          {item.detail && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.detail}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {spec.subSections?.map((sub, si) => (
                      <div key={si} className="mt-4 pt-4 border-t border-border/50">
                        <h4 className="text-sm font-semibold mb-3">{sub.title}</h4>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {sub.items.map((item, ii) => (
                            <div
                              key={ii}
                              className="flex justify-between items-start gap-2 p-2 rounded bg-muted/20 text-sm"
                            >
                              <span className="text-muted-foreground">{item.label}</span>
                              <SpecValue item={item} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </NeuCardContent>
                )}
              </NeuCard>
            )
          })}
        </div>
      </div>
    </section>
  )
}
