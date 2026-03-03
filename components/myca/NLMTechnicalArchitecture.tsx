"use client"

/**
 * NLM Technical Architecture - MDP, MMP, HPL, FCI, CREP, MINDEX foundations.
 * Focused on NLM-specific protocols and systems, not MYCA Palm/Thumb/Fingers.
 * Created: Mar 02, 2026
 */

import { NeuCard, NeuCardContent } from "@/components/ui/neuromorphic"
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
    color: "slate",
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
    color: "blue",
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
    color: "green",
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
    ],
    color: "emerald",
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
    color: "cyan",
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
    ],
    color: "purple",
  },
]

export function NLMTechnicalArchitecture() {
  return (
    <section className="py-16 md:py-24">
      <div className="container max-w-6xl mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-green-600 dark:text-green-500 mb-2">
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

        {/* Flow: Sensing → Transport → Knowledge → Model */}
        <div className="mb-10 rounded-xl border border-border bg-muted/30 p-6 overflow-x-auto">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 min-w-[320px]">
            <div className="flex flex-col items-center gap-2">
              <span className="px-4 py-2 rounded-lg bg-emerald-600/30 border border-emerald-500/50 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                FCI + MDP
              </span>
              <p className="text-xs text-muted-foreground">Sensing &amp; Device Transport</p>
            </div>
            <ArrowDown className="h-5 w-5 text-green-600 dark:text-green-500 md:hidden" />
            <ArrowDown className="h-5 w-5 text-green-600 dark:text-green-500 hidden md:block rotate-[-90deg]" />
            <div className="flex flex-col items-center gap-2">
              <span className="px-4 py-2 rounded-lg bg-blue-600/30 border border-blue-500/50 text-sm font-semibold text-blue-800 dark:text-blue-200">
                MMP + HPL
              </span>
              <p className="text-xs text-muted-foreground">Protocol &amp; Pattern Layer</p>
            </div>
            <ArrowDown className="h-5 w-5 text-green-600 dark:text-green-500 md:hidden" />
            <ArrowDown className="h-5 w-5 text-green-600 dark:text-green-500 hidden md:block rotate-[-90deg]" />
            <div className="flex flex-col items-center gap-2">
              <span className="px-4 py-2 rounded-lg bg-purple-600/30 border border-purple-500/50 text-sm font-semibold text-purple-800 dark:text-purple-200">
                MINDEX + CREP
              </span>
              <p className="text-xs text-muted-foreground">Knowledge &amp; Context</p>
            </div>
            <ArrowDown className="h-5 w-5 text-green-600 dark:text-green-500 md:hidden" />
            <ArrowDown className="h-5 w-5 text-green-600 dark:text-green-500 hidden md:block rotate-[-90deg]" />
            <div className="flex flex-col items-center gap-2">
              <span className="px-4 py-2 rounded-lg bg-amber-600/30 border border-amber-500/50 text-sm font-semibold text-amber-800 dark:text-amber-200">
                NLM-Funga
              </span>
              <p className="text-xs text-muted-foreground">Foundation Model</p>
            </div>
          </div>
        </div>

        {/* Foundation cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {NLM_FOUNDATIONS.map((foundation) => {
            const Icon = foundation.icon
            return (
              <NeuCard
                key={foundation.id}
                className="border border-border hover:border-green-500/30 transition-colors"
              >
                <NeuCardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Icon className="h-5 w-5 text-green-600 dark:text-green-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-green-700 dark:text-green-400">
                        {foundation.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-3">{foundation.subtitle}</p>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {foundation.details.map((d, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-green-600 dark:text-green-500">•</span>
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </NeuCardContent>
              </NeuCard>
            )
          })}
        </div>

        <NeuCard className="mt-10 border-green-500/30 bg-green-500/5 neu-raised">
          <NeuCardContent className="pt-6">
            <h3 className="font-bold mb-2 text-green-700 dark:text-green-400">
              How These Feed NLM
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              FCI captures bioelectric signals from fungi; MDP/MMP transport them with integrity.
              HPL defines patterns and device interfaces for signal processing. CREP provides
              environmental context. MINDEX stores taxonomy, compounds, and provenance. Together
              they form the data pipeline that trains NLM-Funga—nature signals from device to
              model, with full traceability.
            </p>
          </NeuCardContent>
        </NeuCard>
      </div>
    </section>
  )
}
