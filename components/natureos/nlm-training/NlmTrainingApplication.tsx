"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Activity,
  Bot,
  Brain,
  Database,
  GitBranch,
  LayoutDashboard,
  Settings,
  Share2,
  Zap,
} from "lucide-react"
import { useSupabaseAuth } from "@/lib/nlm/supabase-auth-hooks"
import { Dashboard } from "@/components/natureos/nlm-training/Dashboard"
import { ErrorBoundary } from "@/components/natureos/nlm-training/ErrorBoundary"

interface NlmTrainingApplicationProps {
  embedded?: boolean
}

const TRAINING_TABS = [
  { id: "overview", label: "Models", icon: LayoutDashboard },
  { id: "ingestion", label: "Ingest", icon: Zap },
  { id: "mindex", label: "Mindex", icon: Database },
  { id: "lineage", label: "Merkle", icon: GitBranch },
  { id: "graphs", label: "Graphs", icon: Share2 },
  { id: "training", label: "Train", icon: Activity },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "settings", label: "Settings", icon: Settings },
]

export function NlmTrainingApplication({
  embedded = false,
}: NlmTrainingApplicationProps) {
  const { user, profile, loading } = useSupabaseAuth()
  const [activeTab, setActiveTab] = useState("overview")

  if (loading) {
    return (
      <div
        className={`${embedded ? "min-h-[28rem]" : "min-h-screen"} flex items-center justify-center bg-black`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-800 border-t-white" />
          <p className="animate-pulse font-mono text-sm text-zinc-500">
            INITIALIZING NATUREOS...
          </p>
        </div>
      </div>
    )
  }

  return (
    <main
      aria-label="Nature Learning Model training application"
      className={`relative min-h-full bg-black text-zinc-100 selection:bg-white selection:text-black ${
        embedded ? "rounded-2xl" : ""
      }`}
    >
      <header className="flex flex-col items-center justify-between gap-4 border-b border-zinc-800/50 bg-black/40 px-4 py-4 backdrop-blur-md md:flex-row md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
            <Brain className="h-5 w-5 text-black" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight">NatureOS</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              NLM Training v3.0
            </span>
          </div>
        </div>

        <nav
          aria-label="NLM training sections"
          className="flex w-full max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/50 p-1 md:w-fit"
        >
          {TRAINING_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-label={tab.label}
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-h-[44px] flex-shrink-0 touch-manipulation items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === tab.id
                  ? "bg-white text-black shadow-lg shadow-white/5"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <ErrorBoundary>
          <AnimatePresence mode="wait">
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Dashboard activeTab={activeTab} user={user} profile={profile} />
            </motion.div>
          </AnimatePresence>
        </ErrorBoundary>
      </div>

      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-zinc-900/20 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[600px] w-[600px] rounded-full bg-zinc-900/10 blur-[150px]" />
      </div>
    </main>
  )
}
