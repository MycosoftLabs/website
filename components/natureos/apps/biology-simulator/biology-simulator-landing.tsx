import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BiologySimulatorUnrealPanel } from "@/components/natureos/apps/biology-simulator/biology-simulator-unreal-panel"

export interface BiologyModuleProbe {
  label: string
  path: string
  ok: boolean
  status: number
}

export interface BiologySimulatorLandingProps {
  modules: BiologyModuleProbe[]
}

export function BiologySimulatorLanding({ modules }: BiologySimulatorLandingProps) {
  return (
    <div className="space-y-8 max-w-4xl mx-auto px-4 py-6 md:py-10">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">NatureOS App</p>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Biology Simulator</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Vision: simulate life across scales — insects, viruses, fungi, plants, animals, organs, proteins, and small
          molecules — with coupled physics, chemistry, and math, rendered for exploration (eventually via Unreal and
          agent-driven scenes). This page is the landing + roadmap; deep simulation ships incrementally.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">What replaces Mushroom Simulator?</CardTitle>
          <CardDescription className="text-base">
            The old{" "}
            <code className="text-xs bg-muted px-1 rounded">/natureos/tools/mushroom-sim</code> route redirects here.
            Mushroom-focused UI is folded into this broader program while existing specialized simulators remain linked
            below.
          </CardDescription>
        </CardHeader>
      </Card>

      <BiologySimulatorUnrealPanel />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">MINDEX modules (live probes)</h2>
        <p className="text-sm text-muted-foreground">
          Server-checked reachability only — no invented counts. Failed rows mean MINDEX unreachable or endpoint returned
          an error.
        </p>
        <ul className="space-y-2">
          {modules.map((m) => (
            <li
              key={m.path}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-border/60 p-3"
            >
              <span className="font-medium">{m.label}</span>
              <div className="flex flex-wrap items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded max-w-full break-all">{m.path}</code>
                <Badge variant={m.ok ? "default" : "destructive"}>HTTP {m.status}</Badge>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Shipped simulators (deep links)</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <li>
            <Link
              href="/natureos/virtual-petri-dish"
              className="block rounded-lg border border-border p-4 min-h-[44px] hover:bg-muted/50 touch-manipulation"
            >
              Virtual Petri Dish — culture growth
            </Link>
          </li>
          <li>
            <Link
              href="/natureos/compound-analyser"
              className="block rounded-lg border border-border p-4 min-h-[44px] hover:bg-muted/50 touch-manipulation"
            >
              Compound Analyser — chemistry workspace
            </Link>
          </li>
          <li>
            <Link
              href="/natureos/tools/lifecycle-sim"
              className="block rounded-lg border border-border p-4 min-h-[44px] hover:bg-muted/50 touch-manipulation"
            >
              Lifecycle Simulator
            </Link>
          </li>
          <li>
            <Link
              href="/natureos/tools/symbiosis"
              className="block rounded-lg border border-border p-4 min-h-[44px] hover:bg-muted/50 touch-manipulation"
            >
              Symbiosis network tool
            </Link>
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Roadmap</h2>
        <Card>
          <CardContent className="pt-6 space-y-4 text-sm sm:text-base">
            <div>
              <p className="font-medium">Phase A — Catalog</p>
              <p className="text-muted-foreground">
                Inventory every biology-capable model already in Mycosoft (MINDEX genetics/compounds, lab tools,
                NatureOS .NET surfaces) with explicit data contracts.
              </p>
            </div>
            <div>
              <p className="font-medium">Phase B — Unreal bridge spike</p>
              <p className="text-muted-foreground">
                See follow-up plan <em>BIOLOGY_SIMULATOR_UNREAL_INTEGRATION_PLAN_MAY*_2026.md</em> (shell in MAS docs).
              </p>
            </div>
            <div>
              <p className="font-medium">Phase C — Agent-driven scenes</p>
              <p className="text-muted-foreground">
                MAS-orchestrated setup of multi-organism worlds using real telemetry and literature-grounded parameters.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
