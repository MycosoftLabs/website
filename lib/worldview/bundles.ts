/**
 * Worldview v1 bundles — Apr 23, 2026
 *
 * Morgan: "bundled and organized for users mostly agents".
 *
 * A bundle is a declarative composition of N registry datasets that
 * are typically consumed together. Agents call
 *   GET /api/worldview/v1/bundle/{bundle_id}
 * and get a single merged response containing all member datasets.
 *
 * Cost is set manually per-bundle (usually discounted vs the sum of
 * member costs) to encourage bundled access over N round-trips.
 */

import type { WorldviewScope } from "./registry"

export interface Bundle {
  id: string
  name: string
  description: string
  datasets: string[]           // registry ids
  default_params?: Record<string, string | number | (number | string)[]>
  scope: WorldviewScope
  cost_per_request: number
  rate_weight: number
  cache_ttl_ms: number
}

export const BUNDLES: Bundle[] = [
  {
    id: "situational.tijuana",
    name: "Tijuana Situational Awareness",
    description: "Cross-border oyster plume + H2S + cameras + weather + AQI for TJ estuary.",
    datasets: [
      "crep.projects.oyster.plume",
      "crep.sensors.airquality.sdapcd-h2s",
      "crep.cameras.eagle-sources",
      "crep.infra.power.tx-lines-sub",
      "crep.sensors.airquality.airnow-bbox",
    ],
    default_params: { bbox: "-117.35,32.40,-116.85,32.72" },
    scope: "agent",
    cost_per_request: 12,
    rate_weight: 20,
    cache_ttl_ms: 5 * 60_000,
  },
  {
    id: "situational.san-diego-county",
    name: "San Diego County situational",
    description: "Sub-transmission + cell towers + hospitals + military + live movers + AQI + weather for SD/TJ bbox.",
    datasets: [
      "crep.infra.power.tx-lines-sub",
      "crep.infra.power.substations",
      "crep.infra.comms.cell-towers-global",
      "crep.live.aviation.flightradar24",
      "crep.live.maritime.aisstream",
      "crep.cameras.eagle-sources",
      "crep.sensors.airquality.airnow-bbox",
    ],
    default_params: { bbox: "-117.9,32.3,-116.8,33.6" },
    scope: "agent",
    cost_per_request: 15,
    rate_weight: 25,
    cache_ttl_ms: 3 * 60_000,
  },
  {
    id: "situational.goffs-mojave",
    name: "Goffs / Mojave Preserve situational",
    description: "NPS MOJA boundary + wilderness POIs + climate stations + iNat biodiversity for Mojave Preserve.",
    datasets: [
      "crep.projects.goffs.overview",
      "crep.sensors.airquality.airnow-current",
    ],
    default_params: {},
    scope: "agent",
    cost_per_request: 10,
    rate_weight: 15,
    cache_ttl_ms: 15 * 60_000,
  },
  {
    id: "infrastructure.power-grid-us",
    name: "US Power Grid (full stack)",
    description: "HIFLD major + full + OSM sub-transmission + substations + plants. Complete picture of US electric infrastructure.",
    datasets: [
      "crep.infra.power.tx-lines-major",
      "crep.infra.power.tx-lines-full",
      "crep.infra.power.tx-lines-sub",
      "crep.infra.power.substations",
      "crep.infra.power.power-plants-global",
    ],
    scope: "agent",
    cost_per_request: 18,
    rate_weight: 30,
    cache_ttl_ms: 24 * 60 * 60_000,
  },
  {
    id: "live.world-movers",
    name: "Live world movers (aircraft + vessels + satellites)",
    description: "Snapshot of every live mover Worldview tracks. Use bbox to keep the result bounded.",
    datasets: [
      "crep.live.aviation.flightradar24",
      "crep.live.maritime.aisstream",
      "crep.live.space.satellites",
    ],
    scope: "agent",
    cost_per_request: 20,
    rate_weight: 30,
    cache_ttl_ms: 20_000,
  },
  {
    id: "environmental.wildfire-watch",
    name: "Wildfire watch (US+CA)",
    description: "NASA FIRMS active fires + HPWREN / ALERTCalifornia cameras + NWS alerts.",
    datasets: [
      "crep.live.environmental.wildfires-firms",
      "crep.cameras.eagle-sources",
    ],
    scope: "agent",
    cost_per_request: 15,
    rate_weight: 20,
    cache_ttl_ms: 10 * 60_000,
  },
  {
    id: "intel.myca-verified",
    name: "MYCA verified entities (recent)",
    description: "Recent entities the MYCA waypoint-verify pipeline has confirmed. Prefer the SSE stream for live updates.",
    datasets: [
      "crep.infra.defense.myca-verified",
      "natureos.global-events",
    ],
    scope: "agent",
    cost_per_request: 5,
    rate_weight: 5,
    cache_ttl_ms: 60_000,
  },
  {
    id: "security.critical-infrastructure",
    name: "Critical-Infrastructure Security (Fusarium)",
    description: "Shodan exposure + HIFLD substations + data centers + CVE match for a bbox. Fusarium-tier only — requires SHODAN_API_KEY + scope=fusarium on the API key.",
    datasets: [
      "crep.security.shodan.search",
      "crep.infra.power.substations",
      "crep.infra.power.data-centers-global",
    ],
    default_params: { q: "tag:ics country:US" },
    scope: "fusarium",
    cost_per_request: 50,
    rate_weight: 30,
    cache_ttl_ms: 12 * 60 * 60_000,
  },
  {
    id: "situational.border-crossings",
    name: "US/MX Border Crossings",
    description: "CBP wait-time POE + Caltrans D11 cameras + SD+TJ coverage + NWS alerts for the border zone.",
    datasets: [
      "crep.cameras.eagle-sources",
      "crep.infra.defense.sdtj-coverage",
      "crep.live.environmental.nws-alerts",
    ],
    default_params: { bbox: "-117.25,32.45,-116.60,32.75" },
    scope: "agent",
    cost_per_request: 10,
    rate_weight: 15,
    cache_ttl_ms: 5 * 60_000,
  },
  {
    id: "environmental.space-weather",
    name: "Space Weather + Aurora",
    description: "NOAA SWPC + DONKI + aurora oval — one poll for solar/geomagnetic events.",
    datasets: [
      "crep.live.environmental.space-weather",
      "crep.live.space.satellites",
      "crep.live.space.orbital-objects",
    ],
    scope: "agent",
    cost_per_request: 8,
    rate_weight: 10,
    cache_ttl_ms: 5 * 60_000,
  },
  {
    id: "mindex.biology-knowledge",
    name: "MINDEX Biology Knowledge",
    description: "Species + compounds + taxa + phylogeny + genomes joined on a query string. Agent-friendly biology lookup bundle.",
    datasets: [
      "mindex.knowledge.species",
      "mindex.knowledge.compounds",
      "mindex.knowledge.taxa",
      "mindex.knowledge.phylogeny",
      "mindex.knowledge.genomes",
    ],
    scope: "agent",
    cost_per_request: 10,
    rate_weight: 12,
    cache_ttl_ms: 60 * 60_000,
  },
  {
    id: "mindex.telemetry-all",
    name: "MINDEX Telemetry (latest + samples + devices)",
    description: "Everything MINDEX knows about currently-reporting devices.",
    datasets: [
      "mindex.telemetry.latest",
      "mindex.telemetry.samples",
      "mindex.telemetry.devices",
    ],
    scope: "agent",
    cost_per_request: 6,
    rate_weight: 8,
    cache_ttl_ms: 30_000,
  },
]

const BY_ID = new Map<string, Bundle>(BUNDLES.map((b) => [b.id, b]))

export function getBundle(id: string): Bundle | undefined {
  return BY_ID.get(id)
}

export function listBundles(scope?: WorldviewScope): Bundle[] {
  if (!scope) return BUNDLES
  return BUNDLES.filter((b) => {
    const tier = (s: WorldviewScope) => ({ public: 0, agent: 1, company: 2, fusarium: 3, ops: 4 }[s] ?? 0)
    return tier(scope) >= tier(b.scope)
  })
}
