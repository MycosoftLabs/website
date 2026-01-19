"use client"

import { useState } from "react"
import { X, Shield, Droplets, Thermometer, Radar, CheckCircle2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"

interface MissionModalProps {
  isOpen: boolean
  onClose: () => void
  mission: {
    title: string
    icon: typeof Shield
    problem: string
    scenario: string
    outcome: string
    solutions: {
      name: string
      description: string
    }[]
    tools: string[]
  }
}

export function MissionModal({ isOpen, onClose, mission }: MissionModalProps) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-4xl md:w-full bg-background border rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <mission.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{mission.title}</h2>
                  <Badge variant="outline">Mission-Critical Application</Badge>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Left: Problem */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-destructive">The Problem</h3>
                    <p className="text-muted-foreground">{mission.problem}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Scenario</h3>
                    <div className="p-4 bg-muted/50 rounded-lg border">
                      <p className="text-sm">{mission.scenario}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Outcome Without OEI</h3>
                    <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                      <p className="text-sm text-destructive">{mission.outcome}</p>
                    </div>
                  </div>
                </div>

                {/* Right: Solution */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-primary">Mycosoft Solution</h3>
                    <div className="space-y-3">
                      {mission.solutions.map((solution) => (
                        <div key={solution.name} className="flex gap-3">
                          <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium">{solution.name}</p>
                            <p className="text-sm text-muted-foreground">{solution.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Tools Available</h3>
                    <div className="flex flex-wrap gap-2">
                      {mission.tools.map((tool) => (
                        <Badge key={tool} variant="secondary">{tool}</Badge>
                      ))}
                    </div>
                  </div>
                  
                  <Button className="w-full mt-4" asChild>
                    <a href="/defense/request-briefing">
                      Request Briefing
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Pre-defined mission data
export const missionData = {
  installation: {
    title: "Installation Threat Detection",
    icon: Shield,
    problem: "DoD installations face invisible threats from soil contamination, infrastructure degradation, and biological hazards that current monitoring systems cannot detect until significant damage has occurred.",
    scenario: "A military base discovers fuel contamination in groundwater only after it reaches drinking water wells, requiring evacuation of 5,000 personnel and $50M in remediation costs.",
    outcome: "Late detection leads to personnel health risks, operational disruption, costly emergency response, and potential long-term environmental liability.",
    solutions: [
      { name: "MycoNode Network", description: "Continuous subsurface monitoring detects contamination at source before spread" },
      { name: "Predictive Analytics", description: "ML models identify contamination patterns weeks before conventional detection" },
      { name: "Automated Alerting", description: "Real-time notifications to installation command when thresholds exceeded" }
    ],
    tools: ["MycoNode", "MINDEX", "NatureOS", "ETA Reports", "ESI Scoring"]
  },
  contamination: {
    title: "Contamination Dynamics",
    icon: Droplets,
    problem: "PFAS, fuels, solvents, and other contaminants spread through groundwater in complex, unpredictable patterns that current point-sampling methods cannot characterize.",
    scenario: "A training range discovers PFAS contamination has spread beyond installation boundaries, affecting civilian water supplies and triggering regulatory action and community concerns.",
    outcome: "Reactive response leads to expanded cleanup scope, regulatory penalties, community relations damage, and prolonged remediation timeline.",
    solutions: [
      { name: "Distributed Sensing", description: "Dense sensor networks map contamination plume movement in real-time" },
      { name: "Bioelectric Tracking", description: "Microbial responses indicate contamination presence before chemical detection" },
      { name: "Remediation Monitoring", description: "Track cleanup effectiveness with continuous measurement vs periodic sampling" }
    ],
    tools: ["MycoNode", "SporeBase", "RER Reports", "Bioremediation Analytics"]
  },
  climate: {
    title: "Climate Monitoring",
    icon: Thermometer,
    problem: "Long-term environmental changes affect installation operations, infrastructure integrity, and mission readiness in ways that seasonal weather monitoring cannot predict.",
    scenario: "A coastal installation experiences accelerated erosion and flooding events that exceed historical planning parameters, threatening critical infrastructure.",
    outcome: "Reactive infrastructure investments, operational disruptions during weather events, and potential mission capability degradation.",
    solutions: [
      { name: "Environmental Baseline", description: "Establish comprehensive environmental baselines for trend detection" },
      { name: "Ecosystem Indicators", description: "Biological responses provide early warning of environmental regime shifts" },
      { name: "Infrastructure Risk Assessment", description: "Correlate environmental data with infrastructure condition monitoring" }
    ],
    tools: ["Mushroom1", "SporeBase", "ESI Scoring", "Long-term Analytics"]
  },
  mobile: {
    title: "Mobile Operations",
    icon: Radar,
    problem: "Expeditionary forces lack environmental awareness in unfamiliar terrain, leading to health risks, equipment degradation, and missed opportunities for tactical advantage.",
    scenario: "A deployed unit establishes a forward operating base in an area with high mold risk, leading to equipment failures and respiratory issues among personnel.",
    outcome: "Reduced operational effectiveness, medical evacuations, equipment replacement costs, and potential mission compromise.",
    solutions: [
      { name: "Rapid Deployment Sensors", description: "Quickly establish environmental awareness in new operational areas" },
      { name: "Mobile Environmental Assessment", description: "Mushroom1 platform provides terrain and environmental characterization" },
      { name: "Field-Ready Intelligence", description: "Environmental threat assessments formatted for tactical decision-making" }
    ],
    tools: ["Mushroom1", "ALARM", "Portable MycoNode", "Tactical ETA"]
  }
}
