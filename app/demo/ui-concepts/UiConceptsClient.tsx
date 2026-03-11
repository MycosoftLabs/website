"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Leaf, Radar, Search, Check, X } from "lucide-react"

const tabs = [
  { id: "natureos", label: "NatureOS", icon: Leaf },
  { id: "crep", label: "CREP", icon: Radar },
  { id: "search", label: "Search", icon: Search },
] as const

type TabId = (typeof tabs)[number]["id"]

export default function UiConceptsClient() {
  const [activeTab, setActiveTab] = useState<TabId>("natureos")

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="mb-6 border-b border-border pb-4">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            UI Concepts — Uncodixfy for NatureOS, CREP, Search
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Human-like design experiments. Compare generic AI patterns vs Linear /
            Raycast / Stripe / GitHub aesthetic.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
          <TabsList className="h-auto p-1 mb-6 w-full sm:w-auto flex flex-wrap gap-1 bg-muted/50 rounded-lg border border-border">
            {tabs.map(({ id, label, icon: Icon }) => (
              <TabsTrigger
                key={id}
                value={id}
                className="flex items-center gap-2 rounded-md px-3 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border"
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="natureos" className="mt-0">
            <NatureOSConcepts />
          </TabsContent>
          <TabsContent value="crep" className="mt-0">
            <CREPConcepts />
          </TabsContent>
          <TabsContent value="search" className="mt-0">
            <SearchConcepts />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function NatureOSConcepts() {
  return (
    <div className="space-y-8">
      <ConceptSection
        title="NatureOS — Dashboard Cards"
        avoid={
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {["Total Devices", "Online", "Uptime %", "Last Update"].map(
                (label, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-4 shadow-xl backdrop-blur-sm"
                  >
                    <p className="text-xs uppercase tracking-wider text-slate-400">
                      {label}
                    </p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {i === 0 ? "42" : i === 1 ? "38" : i === 2 ? "94" : "—"}
                    </p>
                  </div>
                )
              )}
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-2 flex items-center gap-1">
              <X className="h-3 w-3" /> Glassmorphism, 32px radius, gradient,
              status dots
            </p>
          </>
        }
        use={
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Devices", value: "42" },
                { label: "Online", value: "38", accent: true },
                { label: "Uptime", value: "94%" },
                { label: "Updated", value: "2m ago" },
              ].map(({ label, value, accent }) => (
                <div
                  key={label}
                  className="rounded-lg border border-border bg-background p-3"
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    {label}
                  </p>
                  <p
                    className={`text-lg font-semibold mt-1 ${
                      accent ? "text-emerald-600 dark:text-emerald-500" : ""
                    }`}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-2 flex items-center gap-1">
              <Check className="h-3 w-3" /> Solid bg, 8–10px radius, simple
              border
            </p>
          </>
        }
      />

      <ConceptSection
        title="NatureOS — Sidebar"
        avoid={
          <div className="flex gap-4">
            <div className="w-64 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-white/5 p-4">
              <p className="text-sm text-slate-400">Devices</p>
              <p className="text-sm text-slate-400">Workflows</p>
              <p className="text-sm text-slate-400">Storage</p>
              <p className="text-sm text-slate-400">Lab Tools</p>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-500 self-center flex items-center gap-1">
              <X className="h-3 w-3" /> Blur, 32px corners
            </p>
          </div>
        }
        use={
          <div className="flex gap-4">
            <div className="w-[260px] rounded-none border-r border-border bg-background p-4">
              <nav className="space-y-1 text-sm">
                {["Devices", "Workflows", "Storage", "Lab Tools"].map((item) => (
                  <a
                    key={item}
                    href="#"
                    className="block py-1.5 px-2 rounded hover:bg-muted"
                  >
                    {item}
                  </a>
                ))}
              </nav>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-500 self-center flex items-center gap-1">
              <Check className="h-3 w-3" /> 240–260px, solid, simple border-right
            </p>
          </div>
        }
      />
    </div>
  )
}

function CREPConcepts() {
  return (
    <div className="space-y-8">
      <ConceptSection
        title="CREP — Map Overlay Panels"
        avoid={
          <>
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 backdrop-blur-md p-4 shadow-2xl">
              <p className="text-sm font-medium text-white">Filter: Satellites</p>
              <p className="text-xs text-slate-400 mt-1">
                Glass panel with heavy shadow
              </p>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-2 flex items-center gap-1">
              <X className="h-3 w-3" /> Blur, 32px radius, dramatic shadow
            </p>
          </>
        }
        use={
          <>
            <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
              <p className="text-sm font-medium">Filter: Satellites</p>
              <p className="text-xs text-muted-foreground mt-1">
                Solid panel, subtle shadow &lt;8px
              </p>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-2 flex items-center gap-1">
              <Check className="h-3 w-3" /> Solid bg, 8–10px radius
            </p>
          </>
        }
      />

      <ConceptSection
        title="CREP — Filter Tabs"
        avoid={
          <div className="flex flex-wrap gap-2">
            {["Aviation", "Maritime", "Satellites", "Weather"].map((t) => (
              <button
                key={t}
                className="rounded-full bg-slate-700/80 px-4 py-2 text-sm text-white"
              >
                {t}
              </button>
            ))}
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-2 w-full flex items-center gap-1">
              <X className="h-3 w-3" /> Pill buttons
            </p>
          </div>
        }
        use={
          <div className="flex flex-wrap gap-1 border-b border-border">
            {["Aviation", "Maritime", "Satellites", "Weather"].map((t, i) => (
              <button
                key={t}
                className={`px-3 py-2 text-sm rounded-t-lg border border-b-0 border-transparent -mb-px ${
                  i === 2
                    ? "border-border bg-background font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
            <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-2 w-full flex items-center gap-1">
              <Check className="h-3 w-3" /> Underline or border tabs, 8–10px
              radius
            </p>
          </div>
        }
      />
    </div>
  )
}

function SearchConcepts() {
  return (
    <div className="space-y-8">
      <ConceptSection
        title="Search — Input & Results"
        avoid={
          <>
            <div className="rounded-2xl border-2 border-violet-500/30 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 p-4">
              <p className="text-sm text-slate-400">Search species...</p>
            </div>
            <div className="rounded-2xl bg-slate-800/60 p-4 mt-3">
              <p className="text-sm text-white">Result 1</p>
              <p className="text-xs text-slate-400">Result 2</p>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-2 flex items-center gap-1">
              <X className="h-3 w-3" /> 32px radius, gradient border, soft bg
            </p>
          </>
        }
        use={
          <>
            <div className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
              Search species...
            </div>
            <div className="rounded-lg border border-border bg-background p-3 mt-3 divide-y divide-border">
              <p className="text-sm font-medium py-2">Result 1</p>
              <p className="text-sm font-medium py-2 text-muted-foreground">
                Result 2
              </p>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-2 flex items-center gap-1">
              <Check className="h-3 w-3" /> 8–10px radius, solid border
            </p>
          </>
        }
      />

      <ConceptSection
        title="Search — Widget Cards"
        avoid={
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-4 shadow-xl">
              <p className="text-xs text-slate-400">Species</p>
              <p className="text-lg font-bold text-white">12</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-4 shadow-xl">
              <p className="text-xs text-slate-400">Observations</p>
              <p className="text-lg font-bold text-white">847</p>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-2 col-span-2 flex items-center gap-1">
              <X className="h-3 w-3" /> Gradient cards, heavy shadow
            </p>
          </div>
        }
        use={
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs font-medium text-muted-foreground">Species</p>
              <p className="text-lg font-semibold mt-1">12</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Observations
              </p>
              <p className="text-lg font-semibold mt-1">847</p>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-2 col-span-2 flex items-center gap-1">
              <Check className="h-3 w-3" /> Flat cards, simple border
            </p>
          </div>
        }
      />
    </div>
  )
}

function ConceptSection({
  title,
  avoid,
  use,
}: {
  title: string
  avoid: React.ReactNode
  use: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-500 flex items-center gap-1">
            <X className="h-3.5 w-3.5" /> Avoid — Generic AI
          </p>
          <div className="rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-4">
            {avoid}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-500 flex items-center gap-1">
            <Check className="h-3.5 w-3.5" /> Use — Uncodixfy (Linear / Raycast)
          </p>
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20 p-4">
            {use}
          </div>
        </div>
      </div>
    </section>
  )
}
