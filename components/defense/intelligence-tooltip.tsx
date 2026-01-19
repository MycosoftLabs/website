"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, FileText, AlertTriangle, RefreshCw, Zap } from "lucide-react"

interface IntelligenceProduct {
  acronym: string
  name: string
  description: string
  importance: string
  codeExample: string
  liveCount?: number
  icon: typeof Activity
}

const intelligenceProducts: IntelligenceProduct[] = [
  {
    acronym: "ETA",
    name: "Environmental Threat Assessment",
    description: "Standardized format for communicating environmental hazard intelligence to decision-makers.",
    importance: "Without ETA, environmental threats remain invisible until physical damage occurs. ETA provides early warning and risk quantification.",
    codeExample: `{
  "type": "ETA",
  "threat_class": "contamination",
  "severity": "HIGH",
  "confidence": 0.87,
  "location": {"lat": 38.8977, "lon": -77.0365},
  "timestamp": "2026-01-18T22:15:00Z",
  "source": "MycoNode-Alpha-7"
}`,
    liveCount: 247,
    icon: AlertTriangle
  },
  {
    acronym: "ESI",
    name: "Environmental Stability Index",
    description: "Quantitative measure of environmental condition and risk level on a 0-100 scale.",
    importance: "ESI enables comparative risk assessment across installations and tracks environmental health trends over time.",
    codeExample: `{
  "type": "ESI",
  "score": 78.4,
  "trend": "declining",
  "factors": {
    "soil_health": 82,
    "air_quality": 91,
    "water_quality": 65,
    "biome_stability": 75
  }
}`,
    liveCount: 156,
    icon: Activity
  },
  {
    acronym: "BAR",
    name: "Biological Anomaly Report",
    description: "Alert format for detected biological deviations from established baselines.",
    importance: "BAR catches biological changes that precede visible environmental damage, enabling proactive response.",
    codeExample: `{
  "type": "BAR",
  "anomaly_class": "microbial_shift",
  "deviation": 2.4,
  "baseline_period": "90d",
  "affected_zone": "sector-7-alpha",
  "recommended_action": "investigate"
}`,
    liveCount: 42,
    icon: FileText
  },
  {
    acronym: "RER",
    name: "Remediation Effectiveness Report",
    description: "Assessment of cleanup and mitigation operation success using continuous monitoring data.",
    importance: "RER replaces periodic sampling with continuous verification, reducing remediation costs by 30-50%.",
    codeExample: `{
  "type": "RER",
  "project_id": "PFAS-2024-007",
  "effectiveness": 0.73,
  "contaminant_reduction": "67%",
  "timeline_status": "on_track",
  "next_milestone": "2026-03-15"
}`,
    liveCount: 18,
    icon: RefreshCw
  },
  {
    acronym: "EEW",
    name: "Environmental Early Warning",
    description: "Predictive alert for emerging environmental threats based on pattern recognition and trend analysis.",
    importance: "EEW provides 1-4 weeks advance warning of environmental issues, enabling prevention vs reaction.",
    codeExample: `{
  "type": "EEW",
  "warning_class": "mold_risk",
  "probability": 0.82,
  "lead_time_hours": 168,
  "affected_facilities": ["bldg-7", "bldg-12"],
  "mitigation_cost_if_acted": "$2,400",
  "damage_cost_if_ignored": "$180,000"
}`,
    liveCount: 8,
    icon: Zap
  }
]

interface IntelligenceTooltipProps {
  acronym: string
  children: React.ReactNode
}

export function IntelligenceTooltip({ acronym, children }: IntelligenceTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const product = intelligenceProducts.find(p => p.acronym === acronym)

  if (!product) return <>{children}</>

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <span className="cursor-help border-b border-dashed border-primary/50 hover:border-primary transition-colors">
        {children}
      </span>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 md:w-96"
          >
            <Card className="shadow-xl border-primary/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <product.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{product.name}</CardTitle>
                      <Badge variant="outline" className="mt-1 font-mono text-xs">{product.acronym}</Badge>
                    </div>
                  </div>
                  {product.liveCount && (
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">{product.liveCount}</div>
                      <div className="text-[10px] text-muted-foreground">active today</div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">{product.description}</p>
                
                <div className="p-2 bg-muted/50 rounded text-[10px]">
                  <div className="font-semibold text-primary mb-1">Why it matters:</div>
                  <p className="text-muted-foreground">{product.importance}</p>
                </div>
                
                <div>
                  <div className="text-[10px] font-semibold text-muted-foreground mb-1">Example Format:</div>
                  <pre className="text-[9px] bg-background p-2 rounded border overflow-x-auto">
                    <code>{product.codeExample}</code>
                  </pre>
                </div>
              </CardContent>
            </Card>
            
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-background" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Export the data for use elsewhere
export { intelligenceProducts }
