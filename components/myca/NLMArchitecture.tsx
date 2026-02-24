"use client"

/**
 * NLMArchitecture - Nature Learning Model architecture
 * Rich visual diagram: Palm (biospheric telemetry) → Thumb (MYCA/NLM) → Fingers (external AI)
 * Detailed specs, flow arrows, and layer-by-layer visuals
 * Updated: Feb 24, 2026
 */

import { useState } from "react"
import { NeuCard, NeuCardContent } from "@/components/ui/neuromorphic"
import {
  Cpu,
  Database,
  Radio,
  Wind,
  Satellite,
  Brain,
  RefreshCw,
  Layers,
  Zap,
  ShoppingBag,
  Search,
  Car,
  Smartphone,
  ChevronDown,
  ChevronUp,
  ArrowDown,
  ArrowUp,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

// —————————————————————————————————————————————————————————
// Architecture nodes with detailed specs
// —————————————————————————————————————————————————————

const PALM_NODES = [
  {
    id: "mycobrain",
    title: "MycoBrain",
    subtitle: "Neuromorphic sensors & devices",
    icon: Radio,
    details: ["BME688/690", "Soil/air chemistry", "Bioelectric signals", "LoRa gateway", "Device telemetry"],
    color: "slate",
  },
  {
    id: "crep",
    title: "CREP",
    subtitle: "Environmental picture",
    icon: Satellite,
    details: ["Aviation (flights)", "Maritime (ships)", "Satellite AIS", "Weather feeds", "Real-time positioning"],
    color: "slate",
  },
  {
    id: "earth2",
    title: "Earth2",
    subtitle: "Climate modeling",
    icon: Wind,
    details: ["Climate predictions", "Global environmental models", "Weather simulation", "Earth-2 AI integration"],
    color: "slate",
  },
  {
    id: "natureos",
    title: "NatureOS",
    subtitle: "Ecosystem platform",
    icon: Cpu,
    details: ["Device network", "SignalR real-time", "MINDEX integration", "NatureOS Hub"],
    color: "slate",
  },
  {
    id: "mindex",
    title: "MINDEX",
    subtitle: "Knowledge graph",
    icon: Database,
    details: ["Species taxonomy", "Compounds, genetics", "GBIF, iNaturalist", "PostgreSQL + Qdrant"],
    color: "slate",
  },
]

const THUMB_NODES = [
  {
    id: "nlm-core",
    title: "NLM Core",
    subtitle: "Multi-modal foundation",
    icon: Brain,
    details: ["Ecology-centric modalities", "Time-series embeddings", "Microscopy, genomics", "Field data fusion"],
    color: "green",
  },
  {
    id: "consciousness",
    title: "Consciousness",
    subtitle: "6-state model",
    icon: Brain,
    details: ["Dormant → Awake → Conscious", "Attention controller", "System 1 & 2", "World model updates"],
    color: "green",
  },
  {
    id: "continuous",
    title: "Continuous Learning",
    subtitle: "Drift-aware",
    icon: RefreshCw,
    details: ["Non-stationary streams", "Concept drift detection", "Incremental updates", "Provenance chain"],
    color: "green",
  },
  {
    id: "ensemble",
    title: "Ensemble Controller",
    subtitle: "Orchestration",
    icon: Layers,
    details: ["227+ agent coordination", "LLM routing", "Tool execution", "A2A protocol"],
    color: "green",
  },
]

const FINGER_NODES = [
  {
    id: "amazon",
    title: "Amazon",
    subtitle: "Commerce APIs",
    icon: ShoppingBag,
    color: "blue",
  },
  {
    id: "google",
    title: "Google / OpenAI / Anthropic",
    subtitle: "Web AI",
    icon: Search,
    color: "blue",
  },
  {
    id: "tesla",
    title: "Tesla / xAI",
    subtitle: "Mobility AI",
    icon: Car,
    color: "blue",
  },
  {
    id: "apple-meta",
    title: "Apple / Meta",
    subtitle: "Product-based AI",
    icon: Smartphone,
    color: "blue",
  },
]

// —————————————————————————————————————————————————————————
// Visual node component with expandable details
// —————————————————————————————————————————————————————

interface NodeCardProps {
  node: (typeof PALM_NODES)[0] | (typeof THUMB_NODES)[0] | (typeof FINGER_NODES)[0]
  layer: "palm" | "thumb" | "finger"
}

function NodeCard({ node, layer }: NodeCardProps) {
  const [expanded, setExpanded] = useState(false)
  const Icon = node.icon
  const hasDetails = "details" in node && Array.isArray(node.details)

  const layerStyles = {
    palm: "bg-slate-700/60 border-slate-500/50 hover:border-slate-400/60",
    thumb: "bg-green-600/40 border-green-500/50 hover:border-green-400/70 text-green-100",
    finger: "bg-blue-900/50 border-blue-600/50 hover:border-blue-500/60",
  }

  return (
    <motion.div
      layout
      className={cn(
        "rounded-xl border p-3 sm:p-4 transition-all cursor-pointer touch-manipulation min-h-[44px]",
        "flex flex-col gap-2",
        layerStyles[layer]
      )}
      onClick={() => hasDetails && setExpanded(!expanded)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
            layer === "palm" && "bg-slate-600/50 text-slate-300",
            layer === "thumb" && "bg-green-500/30 text-green-200",
            layer === "finger" && "bg-blue-700/50 text-blue-200"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm sm:text-base">{node.title}</p>
          <p className="text-xs opacity-80">{node.subtitle}</p>
        </div>
        {hasDetails && (
          <span className="shrink-0 text-muted-foreground">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        )}
      </div>
      <AnimatePresence initial={false}>
        {expanded && hasDetails && "details" in node && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-2 mt-2 border-t border-white/10 flex flex-wrap gap-2">
              {(node.details as string[]).map((d) => (
                <span
                  key={d}
                  className="px-2 py-1 rounded-md bg-black/20 text-xs font-medium"
                >
                  {d}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// —————————————————————————————————————————————————————————
// Flow connector (visual arrow between layers)
// —————————————————————————————————————————————————————

function FlowConnector({ direction = "down" }: { direction?: "up" | "down" }) {
  return (
    <div className="flex justify-center py-2 sm:py-4">
      <div className="flex flex-col items-center gap-1">
        <div className="h-6 sm:h-10 w-px bg-gradient-to-b from-green-500/50 to-green-500/20" />
        {direction === "down" ? (
          <ArrowDown className="h-5 w-5 text-green-500/60" />
        ) : (
          <ArrowUp className="h-5 w-5 text-green-500/60 rotate-180" />
        )}
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Data flow
        </span>
      </div>
    </div>
  )
}

// —————————————————————————————————————————————————————————
// Main component
// —————————————————————————————————————————————————————

export function NLMArchitecture({ className }: { className?: string }) {
  return (
    <section className={cn("py-16 md:py-24", className)}>
      <div className="container max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-green-500 mb-2">
            Nature Learning Model
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            The Architecture
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A multi-modal foundation whose native modalities are ecology-centric:
            time series from sensors, microscopy, genomics, and field data.
          </p>
        </div>

        {/* Top-level flow diagram — Palm → Thumb → Fingers */}
        <div className="mb-10 rounded-xl border border-border bg-muted/30 p-6 overflow-x-auto">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 min-w-[320px]">
            <div className="flex flex-col items-center gap-2">
              <div className="px-4 py-2 rounded-lg bg-slate-700/60 border border-slate-500/50 text-sm font-semibold whitespace-nowrap">
                Palm
              </div>
              <p className="text-xs text-muted-foreground">Biospheric Telemetry</p>
            </div>
            <div className="flex items-center text-green-500">
              <ArrowDown className="h-6 w-6 md:hidden" />
              <ArrowUp className="h-6 w-6 hidden md:block -rotate-90" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="px-4 py-2 rounded-lg bg-green-600/50 border border-green-500/50 text-sm font-semibold text-green-100 whitespace-nowrap">
                Thumb (MYCA)
              </div>
              <p className="text-xs text-muted-foreground">NLM + Consciousness</p>
            </div>
            <div className="flex items-center text-green-500">
              <ArrowDown className="h-6 w-6 md:hidden" />
              <ArrowUp className="h-6 w-6 hidden md:block -rotate-90" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="px-4 py-2 rounded-lg bg-blue-900/50 border border-blue-600/50 text-sm font-semibold whitespace-nowrap">
                Fingers
              </div>
              <p className="text-xs text-muted-foreground">External AI</p>
            </div>
          </div>
        </div>

        {/* Detailed layer cards */}
        <div className="rounded-2xl border border-border bg-gradient-to-b from-muted/20 to-muted/40 p-6 md:p-10 overflow-hidden">
          <div className="max-w-5xl mx-auto space-y-0">
            {/* Layer label: Fingers */}
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-bold uppercase tracking-widest text-blue-500/90">
                Fingers: External AI Services
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
              {FINGER_NODES.map((node) => (
                <NodeCard key={node.id} node={node} layer="finger" />
              ))}
            </div>

            <FlowConnector direction="down" />

            {/* Layer label: Thumb */}
            <div className="flex items-center gap-2 mb-4">
              <Brain className="h-4 w-4 text-green-500" />
              <span className="text-xs font-bold uppercase tracking-widest text-green-500/90">
                Thumb: MYCA Nature Learning Model
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-2">
              {THUMB_NODES.map((node) => (
                <NodeCard key={node.id} node={node} layer="thumb" />
              ))}
            </div>

            <FlowConnector direction="down" />

            {/* Layer label: Palm */}
            <div className="flex items-center gap-2 mb-4">
              <Database className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500/90">
                Palm: Biospheric Telemetry Stack
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {PALM_NODES.map((node) => (
                <NodeCard key={node.id} node={node} layer="palm" />
              ))}
            </div>
          </div>
        </div>

        {/* Data flow legend */}
        <div className="mt-8 flex flex-wrap gap-6 justify-center text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-500/60" />
            <span>Biospheric sensors & data</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
            <span>NLM / Consciousness</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500/60" />
            <span>External AI (callable)</span>
          </div>
        </div>

        {/* Key differentiator card */}
        <NeuCard className="mt-10 border-green-500/30 bg-green-500/5 neu-raised">
          <NeuCardContent className="pt-6">
            <h3 className="font-bold mb-2 text-green-600 dark:text-green-400">
              Key Differentiator
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              MYCA is continuously trained on live environmental signals—sensor
              streams, soil chemistry, bioelectric data, climate predictions—not
              static web corpora. The biospheric telemetry stack provides
              real-time epistemic ground truth that no other frontier AI
              possesses.
            </p>
          </NeuCardContent>
        </NeuCard>
      </div>
    </section>
  )
}
