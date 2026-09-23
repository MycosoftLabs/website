"use client"

import { useState } from "react"
import {
  Activity,
  Database,
  LayoutDashboard,
  Map,
  Settings,
  Target,
} from "lucide-react"
import { ProductIcon } from "@/components/brand/product-icon"
import { cn } from "@/lib/utils"

const WORKSPACE_TABS = [
  { id: "atlas", label: "Atlas", icon: Map },
  { id: "observations", label: "Observe", icon: Activity },
  { id: "targets", label: "Targets", icon: Target },
  { id: "evidence", label: "Evidence", icon: Database },
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "settings", label: "Settings", icon: Settings },
] as const

type WorkspaceTabId = (typeof WORKSPACE_TABS)[number]["id"]

interface EmptyPaneProps {
  title: string
  detail: string
}

function EmptyPane({ title, detail }: EmptyPaneProps) {
  return (
    <div className="flex min-h-[20rem] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-black/15 bg-black/[0.03] px-6 py-10 text-center dark:border-white/20 dark:bg-white/[0.04]">
      <ProductIcon product="formspace" variant="current" className="h-10 w-10 text-black/50 dark:text-white/50" />
      <h3 className="text-base font-semibold text-black dark:text-white">{title}</h3>
      <p className="max-w-md text-sm leading-relaxed text-black/60 dark:text-white/70">{detail}</p>
      <p className="max-w-lg text-xs leading-relaxed text-black/50 dark:text-white/50">
        No mock atlas, coordinates, or evaluation results are shown. Connect the FormSpace engine
        (MAS <code className="rounded bg-black/5 px-1 dark:bg-white/10">nlm/formspace</code> + live
        observation APIs) to populate this workspace with real data.
      </p>
    </div>
  )
}

const TAB_COPY: Record<WorkspaceTabId, EmptyPaneProps> = {
  atlas: {
    title: "FormSpace atlas unavailable",
    detail:
      "The typed atlas of organized states requires a live FormSpace engine chart version and subject records from MINDEX.",
  },
  observations: {
    title: "No live observations",
    detail:
      "Sensor-derived coordinates arrive from the Nature Learning Model. Until that stream is connected, this panel stays empty.",
  },
  targets: {
    title: "No target hypotheses",
    detail:
      "Candidate target regions and reachability tests need FormSpace + AVANI evaluation on real evidence — not placeholders.",
  },
  evidence: {
    title: "No evidence ledger",
    detail:
      "Intervention history, uncertainty, and counterevidence must come from MINDEX provenance. Nothing is fabricated here.",
  },
  overview: {
    title: "Engine status unknown",
    detail:
      "Overview will summarize live chart version, subject count, and last validated run once the FormSpace backend reports health.",
  },
  settings: {
    title: "Engine configuration pending",
    detail:
      "Chart version, calibration bindings, and authority gates will appear when a real FormSpace session is available.",
  },
}

/**
 * Main FormSpace application workspace — mirrors NLM training tab chrome
 * with honest empty states (no mock computation results).
 */
export function FormSpaceWorkspace() {
  const [activeTab, setActiveTab] = useState<WorkspaceTabId>("atlas")
  const pane = TAB_COPY[activeTab]

  return (
    <section
      aria-label="FormSpace application workspace"
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-black/10 bg-white/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-xl dark:border-white/15 dark:bg-black/30 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
    >
      <header className="flex flex-col gap-3 border-b border-black/10 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black text-white dark:bg-white dark:text-black">
            <ProductIcon product="formspace" variant="current" className="h-5 w-5" title="FormSpace" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-tight text-black dark:text-white">FormSpace</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">
              Application workspace
            </p>
          </div>
        </div>

        <nav
          aria-label="FormSpace workspace sections"
          className="flex w-full max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-black/10 bg-black/[0.03] p-1 dark:border-white/15 dark:bg-white/[0.04] md:w-fit"
        >
          {WORKSPACE_TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                aria-label={tab.label}
                aria-pressed={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex min-h-[44px] flex-shrink-0 touch-manipulation items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all",
                  isActive
                    ? "bg-black text-white shadow-sm dark:bg-white dark:text-black"
                    : "text-black/50 hover:bg-black/5 hover:text-black/80 dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white",
                )}
              >
                <tab.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 md:p-6">
        <EmptyPane title={pane.title} detail={pane.detail} />
      </div>
    </section>
  )
}
