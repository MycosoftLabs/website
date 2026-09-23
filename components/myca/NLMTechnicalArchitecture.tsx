"use client"

/**
 * NLM Technical Architecture - MDP, MMP, HPL, FCI, CREP, MINDEX foundations.
 * Focused on NLM-specific protocols and systems, not MYCA Palm/Thumb/Fingers.
 * Cards: monochrome glass matching NLM training app.
 * Created: Mar 02, 2026 | Glass restyle: Sep 22, 2026
 */

import { Card, CardContent } from "@/components/ui/card"
import {
  NLM_GLASS_CARD,
  NLM_GLASS_ICON_WELL,
  NLM_GLASS_INSET,
} from "@/components/myca/nlm-glass"
import { cn } from "@/lib/utils"
import {
  Radio,
  Database,
  Code2,
  Cpu,
  Satellite,
  Network,
  ArrowDown,
} from "lucide-react"

const NLM_FOUNDATIONS = [
  {
    id: "mdp",
    title: "MDP (MycoBrain Device Protocol)",
    subtitle: "Binary device transport",
    icon: Radio,
    details: [
      "COBS framing + CRC16",
      "Inter-ESP32 communication",
      "Telemetry, commands, heartbeat, events",
      "JSON payload in MDP_TELEMETRY",
      "UART / BLE transport",
    ],
  },
  {
    id: "mmp",
    title: "MMP (Mycosoft Mycorrhizae Protocol)",
    subtitle: "Evolved from MDP",
    icon: Network,
    details: [
      "32-byte header, SHA-256 + CRC-8",
      "Device types: MYCOBRAIN, SPOREBASE, FCI, GATEWAY",
      "Payload types: TELEMETRY, COMMAND, ACK, EVENT",
      "Integrity verification for NLM data provenance",
    ],
  },
  {
    id: "hpl",
    title: "HPL (Hypha Programming Language)",
    subtitle: "Nature signal scripting",
    icon: Code2,
    details: [
      "DSL for fungal/nature signal patterns",
      "Device interfaces (connect, read, buffer)",
      "Pattern matching over bioelectric streams",
      "Bridge between FCI hardware and NLM ingestion",
    ],
  },
  {
    id: "fci",
    title: "FCI (Fungal Computer Interface)",
    subtitle: "Bioelectric sensing",
    icon: Cpu,
    details: [
      "Electrodes + fungal probes",
      "Multi-channel electrophysiology",
      "MycoBrain FCI firmware",
      "Signal acquisition for NLM training",
      "FCI v2: 16-channel simultaneous recording",
      "Substrate-agnostic electrode arrays",
      "Real-time impedance monitoring",
    ],
  },
  {
    id: "crep",
    title: "CREP (Common Relevant Environmental Picture)",
    subtitle: "Environmental context",
    icon: Satellite,
    details: [
      "Aviation, maritime, satellite feeds",
      "Weather, AIS, positioning",
      "Environmental context for NLM",
      "Real-time world state",
    ],
  },
  {
    id: "mindex",
    title: "MINDEX",
    subtitle: "Knowledge graph & provenance",
    icon: Database,
    details: [
      "Species taxonomy, compounds, genetics",
      "GBIF, iNaturalist, scientific ontologies",
      "PostgreSQL + Qdrant vector store",
      "Provenance chain for NLM datasets",
      "NMF v0.2 native ingestion",
      "Cross-species linkage graph",
    ],
  },
]

const FLOW_STEPS = [
  { label: "FCI + MDP", caption: "Sensing & Device Transport" },
  { label: "MMP + HPL", caption: "Protocol & Pattern Layer" },
  { label: "MINDEX + CREP", caption: "Knowledge & Context" },
  { label: "NLM-Funga", caption: "Foundation Model" },
]

export function NLMTechnicalArchitecture() {
  return (
    <section className="py-16 md:py-24">
      <div className="container max-w-6xl mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
            Nature Learning Model
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            NLM Technical Architecture
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Protocols and systems that form the foundation for NLM learning, signal acquisition,
            transport, and knowledge integration—MDP, MMP, HPL, FCI, CREP, and MINDEX.
          </p>
        </div>

        <div className={cn(NLM_GLASS_CARD, "mb-10 p-6 overflow-x-auto")}>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 min-w-[320px]">
            {FLOW_STEPS.map((step, i) => (
              <div key={step.label} className="contents">
                <div className="flex flex-col items-center gap-2">
                  <span className={cn(NLM_GLASS_INSET, "px-4 py-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200")}>
                    {step.label}
                  </span>
                  <p className="text-xs text-muted-foreground">{step.caption}</p>
                </div>
                {i < FLOW_STEPS.length - 1 ? (
                  <>
                    <ArrowDown className="h-5 w-5 text-zinc-500 md:hidden" />
                    <ArrowDown className="h-5 w-5 text-zinc-500 hidden md:block rotate-[-90deg]" />
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {NLM_FOUNDATIONS.map((foundation) => {
            const Icon = foundation.icon
            return (
              <Card
                key={foundation.id}
                className={cn(NLM_GLASS_CARD, "hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors")}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className={cn(NLM_GLASS_ICON_WELL, "shrink-0 w-10 h-10 flex items-center justify-center")}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-900 dark:text-zinc-50">
                        {foundation.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-3">{foundation.subtitle}</p>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {foundation.details.map((d, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-zinc-500">•</span>
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Card className={cn(NLM_GLASS_CARD, "mt-10")}>
          <CardContent className="pt-6">
            <h3 className="font-bold mb-2 text-zinc-900 dark:text-zinc-50">
              How These Feed NLM
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              FCI captures bioelectric signals from fungi; MDP/MMP transport them with integrity.
              HPL defines patterns and device interfaces for signal processing. CREP provides
              environmental context. MINDEX stores taxonomy, compounds, and provenance. Together
              they form the data pipeline that trains NLM-Funga—nature signals from device to
              model, with full traceability.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
