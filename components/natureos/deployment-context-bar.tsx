"use client"

/**
 * DeploymentContextBar
 *
 * Compact "live context" strip for every NatureOS device page. Pulls the
 * same fleet-health + MINDEX stats as the dashboard overview so operators
 * see the actual state of the deployment network at a glance — without
 * jumping between tabs.
 *
 * Added Apr 23, 2026 to close the gap between CREP (live globe) and the
 * NatureOS device dashboards (fleet ops). Uses theme-aware colors so it
 * reads the same in light and dark mode (Morgan: "all the devices pages
 * are fucked in light mode missing data" — first rev had hardcoded
 * cyan-100 text that vanished on white bg).
 */

import Link from "next/link"
import useSWR from "swr"
import { Activity, Cpu, Globe2, MapPin, Radio, Wind } from "lucide-react"

interface FleetHealthResponse {
  total_devices?: number
  online_devices?: number
  offline_devices?: number
  stale_devices?: number
  uptime_pct?: number
}

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error("network")
  return res.json()
}

const DEPLOYMENT_SITES = [
  { code: "YOS", name: "Yosemite" },
  { code: "ZION", name: "Zion" },
  { code: "YELL", name: "Yellowstone" },
  { code: "MENDO", name: "Mendocino" },
  { code: "BASE", name: "Starbase TX" },
  { code: "HOME", name: "Chula Vista Lab" },
]

export function DeploymentContextBar() {
  const { data: fleet } = useSWR<FleetHealthResponse>(
    "/api/iot/insights/fleet-health",
    fetcher,
    { refreshInterval: 30000, revalidateOnFocus: false }
  )

  const online = fleet?.online_devices ?? 0
  const total = fleet?.total_devices ?? 0
  const uptime =
    fleet?.uptime_pct != null ? `${fleet.uptime_pct}%` : "—"

  return (
    <div className="mb-4 overflow-hidden rounded-lg border bg-card p-3 text-xs text-card-foreground">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Live
          </span>
          <span>
            <b className="text-emerald-600 dark:text-emerald-400">
              {online.toLocaleString()}
            </b>
            <span className="text-muted-foreground">
              {" "}
              / {total.toLocaleString()}
            </span>{" "}
            devices online
          </span>
        </span>

        <span className="flex items-center gap-2">
          <Cpu className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
          <span>
            Uptime{" "}
            <b className="text-amber-600 dark:text-amber-300">{uptime}</b>
          </span>
        </span>

        <span className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />
          <span>
            <b className="text-rose-600 dark:text-rose-300">
              {DEPLOYMENT_SITES.length}
            </b>{" "}
            deployment sites
          </span>
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            ({DEPLOYMENT_SITES.map((s) => s.code).join(" · ")})
          </span>
        </span>

        <span className="flex items-center gap-2">
          <Radio className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400" />
          <span className="text-muted-foreground">
            MQTT · LoRa · Meshtastic (planned)
          </span>
        </span>

        <span className="flex items-center gap-2">
          <Wind className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />
          <span className="text-muted-foreground">
            AQI · VOC · CO₂e · spore
          </span>
        </span>

        <Link
          href="/natureos/tools/earth-simulator"
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 font-medium hover:bg-accent hover:text-accent-foreground"
        >
          <Globe2 className="h-3.5 w-3.5" />
          Earth Simulator
        </Link>
      </div>
    </div>
  )
}
