import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  buildNatureStatisticsSnapshot,
  createInitialNatureStatisticsSnapshot,
  NATURE_STATISTICS_SOURCES,
  REQUIRED_NATURE_STATISTICS_ADAPTERS,
} from "../operational-contract.ts"

const here = dirname(fileURLToPath(import.meta.url))
const hostRoot = join(here, "..", "..", "..", "..", "..")
const mountPath = join(
  hostRoot,
  "components",
  "fusarium",
  "twins",
  "nature-statistics",
  "nature-statistics-mount.tsx",
)
const natureosViewPath = join(hostRoot, "components", "natureos", "nature-statistics-view.tsx")
const contractPath = join(here, "..", "operational-contract.ts")
const operationalViewPath = join(hostRoot, "components", "fusarium", "twins", "nature-statistics", "nature-statistics-operational-view.tsx")

const NOW = "2026-09-01T20:00:00.000Z"

function result(id, data, options = {}) {
  const source = NATURE_STATISTICS_SOURCES.find((item) => item.id === id)
  assert.ok(source, id)
  return {
    id,
    endpoint: source.endpoint,
    ok: options.ok ?? true,
    status: options.status ?? 200,
    receivedAt: options.receivedAt ?? NOW,
    data,
    error: options.error ?? null,
  }
}

test("source catalog uses passive local evidence routes only", () => {
  assert.deepEqual(
    NATURE_STATISTICS_SOURCES.map((source) => source.id),
    [
      "mindex-stats",
      "kingdom-stats",
      "air-quality",
      "ocean-conditions",
      "land-transit",
      "aircraft",
      "vessels",
      "drones",
      "agent-runs",
    ],
  )
  for (const source of NATURE_STATISTICS_SOURCES) {
    assert.match(source.endpoint, /^\/api\//)
    assert.doesNotMatch(source.endpoint, /^https?:\/\//)
  }
  assert.equal(NATURE_STATISTICS_SOURCES.find((source) => source.id === "aircraft").emptyIsVerified, false)
  assert.equal(NATURE_STATISTICS_SOURCES.find((source) => source.id === "vessels").emptyIsVerified, false)
})

test("missing authoritative sources start unbound with exact adapters", () => {
  const snapshot = createInitialNatureStatisticsSnapshot(NOW)
  const adapterIds = snapshot.requiredAdapters.map((adapter) => adapter.id)
  assert.deepEqual(adapterIds, [
    "world-population",
    "births",
    "deaths",
    "ai-usage",
    "openclaw-activity",
    "x402-transactions",
    "soil-quality",
    "water-quality",
    "impact-summary",
  ])
  assert.equal(snapshot.headline.find((item) => item.id === "world-population").state, "unbound")
  assert.equal(snapshot.agents.find((item) => item.id === "openclaw-activity").state, "unbound")
  assert.equal(snapshot.agents.find((item) => item.id === "x402-transactions").value, null)
  assert.equal(snapshot.ground[0].endpoint, "/api/mindex/environment/soil-quality")
  assert.equal(snapshot.water[0].endpoint, "/api/mindex/environment/water-quality")
  assert.equal(snapshot.impact[0].endpoint, "/api/mindex/impact/summary")
})

test("normalizer preserves source values, units, timestamps, and domain details", () => {
  const snapshot = buildNatureStatisticsSnapshot(
    [
      result("mindex-stats", {
        total_taxa: 42,
        total_observations: 125,
        observation_date_range: { latest: "2026-09-01T19:58:00Z" },
        last_updated: "2026-09-01T19:59:00Z",
        data_source: "mindex",
        mindex_available: true,
      }),
      result("kingdom-stats", {
        kingdoms: [
          { kingdom: "Fungi", taxon_count: 31 },
          { kingdom: "Plantae", taxon_count: 11 },
        ],
        source: "mindex",
      }),
      result("agent-runs", {
        data: [
          {
            id: "run-1",
            agentId: "agent-1",
            agentName: "Evidence agent",
            status: "running",
            startedAt: "2026-09-01T19:57:00Z",
          },
          {
            id: "run-2",
            agentId: "agent-2",
            agentName: "Index agent",
            status: "failed",
            startedAt: "2026-09-01T19:50:00Z",
            completedAt: "2026-09-01T19:55:00Z",
          },
        ],
        meta: { total: 19 },
      }),
      result("air-quality", {
        items: [
          {
            source: "OpenAQ",
            source_id: "aq-1",
            station_name: "Station A",
            parameter: "pm2_5",
            value: 7.5,
            unit: "µg/m³",
            measured_at: "2026-09-01T19:56:00Z",
            lat: 33,
            lng: -117,
          },
        ],
      }),
      result("ocean-conditions", {
        environments: [
          {
            observation_id: "oc-1",
            temperature_c: 18,
            salinity_psu: 35,
            sea_state: "calm",
            observed_at: "2026-09-01T19:40:00Z",
            source: "buoy",
          },
        ],
      }),
      result("land-transit", {
        type: "FeatureCollection",
        features: [
          {
            properties: {
              id: "bus-1",
              agency: "Metro",
              route_type: "3",
              current_status: "IN_TRANSIT_TO",
              speed: 12,
              updated_at: "2026-09-01T19:59:00Z",
            },
          },
        ],
      }),
      result("aircraft", {
        entities: [
          {
            id: "air-1",
            name: "N123",
            source: "adsb",
            occurred_at: "2026-09-01T19:59:00Z",
            properties: { altitude_ft: 12000, speed_kts: 220, heading: 180 },
          },
        ],
      }),
      result("vessels", {
        entities: [
          {
            id: "vessel-1",
            name: "Research One",
            source: "ais",
            occurred_at: "2026-09-01T19:50:00Z",
            properties: { type: "research", speed_kts: 8, destination: "San Diego" },
          },
        ],
      }),
      result("drones", [
        {
          drone_id: "drone-1",
          drone_name: "Survey One",
          drone_type: "quad",
          battery_percent: 82,
          flight_mode: "AUTO",
          mission_state: "running",
          last_telemetry_time: "2026-09-01T19:59:00Z",
        },
      ]),
    ],
    NOW,
  )

  assert.equal(snapshot.headline.find((item) => item.id === "taxa").value, 42)
  assert.equal(snapshot.headline.find((item) => item.id === "observations").observedAt, "2026-09-01T19:58:00.000Z")
  assert.deepEqual(snapshot.kingdoms.map((item) => [item.label, item.value]), [
    ["Fungi", 31],
    ["Plantae", 11],
  ])
  assert.equal(snapshot.agents.find((item) => item.id === "agent-runs-total").value, 19)
  assert.equal(snapshot.agents.find((item) => item.id === "agent-runs-active").value, 1)
  assert.equal(snapshot.agents.find((item) => item.id === "agent-runs-failed").value, 1)
  assert.equal(snapshot.airRecords[0].facts[0].value, "7.5")
  assert.equal(snapshot.airRecords[0].facts[0].unit, "µg/m³")
  assert.equal(snapshot.oceanRecords[0].subtitle, "calm")
  assert.match(snapshot.transport[0].detail, /Metro: 1/)
  assert.equal(snapshot.aircraftRecords[0].facts[0].unit, "ft")
  assert.equal(snapshot.vesselRecords[0].facts[2].value, "San Diego")
  assert.equal(snapshot.droneRecords[0].facts[0].value, "82")
  assert.equal(snapshot.sources.every((source) => source.updatedAt === NOW), true)
})

test("stale evidence is stateful and empty semantics stay truthful", () => {
  const snapshot = buildNatureStatisticsSnapshot(
    [
      result("air-quality", {
        items: [
          {
            station_name: "Old station",
            parameter: "pm10",
            value: 4,
            unit: "µg/m³",
            measured_at: "2026-08-30T00:00:00Z",
          },
        ],
      }),
      result("aircraft", { entities: [], total: 0 }),
      result("vessels", { entities: [], total: 0 }),
      result("drones", []),
      result("land-transit", { type: "FeatureCollection", features: [], count: 0 }),
      result("kingdom-stats", { kingdoms: [], source: "mindex" }),
    ],
    NOW,
  )
  assert.equal(snapshot.air[0].state, "stale")
  assert.equal(snapshot.transport.find((item) => item.id === "aircraft").state, "unbound")
  assert.equal(snapshot.transport.find((item) => item.id === "aircraft").value, null)
  assert.equal(snapshot.transport.find((item) => item.id === "vessels").state, "unbound")
  assert.equal(snapshot.transport.find((item) => item.id === "drones").state, "verified-empty")
  assert.equal(snapshot.transport.find((item) => item.id === "land-vehicles").state, "verified-empty")
  assert.equal(snapshot.kingdoms[0].state, "verified-empty")
})

test("local contract names x402 and never guesses Explorer2", () => {
  const contract = readFileSync(contractPath, "utf8")
  const x402 = REQUIRED_NATURE_STATISTICS_ADAPTERS.find((adapter) => adapter.id === "x402-transactions")
  assert.ok(x402)
  assert.equal(x402.source, "MINDEX mycodao.x402_audit_log")
  assert.equal(x402.endpoint, "/api/mindex/mycodao/x402/summary")
  assert.doesNotMatch(contract, /Explorer2|Exploro2/i)
})

test("numeric motion animates only source transitions and honors reduced motion", () => {
  const view = readFileSync(operationalViewPath, "utf8")
  assert.match(view, /requestAnimationFrame/)
  assert.match(view, /prefers-reduced-motion: reduce/)
  assert.match(view, /data-animated-evidence-value=.*source-transition/)
  assert.doesNotMatch(view, /birthsPerSecond|deathsPerSecond|netGrowthPerSecond/)
})

test("Fusarium mount keeps the working visual dashboard primary and adds the strict operational evidence view", () => {
  const mount = readFileSync(mountPath, "utf8")
  const natureosView = readFileSync(natureosViewPath, "utf8")
  assert.match(mount, /import \{ NatureStatisticsView \}/)
  assert.match(mount, /<NatureStatisticsView \/>/)
  assert.match(mount, /import \{ FusariumNatureStatisticsOperationalView \}/)
  assert.match(mount, /<FusariumNatureStatisticsOperationalView \/>/)
  assert.match(mount, /data-nature-statistics-parity="natureos-primary"/)
  assert.match(mount, /data-layout="edge-to-edge-responsive-parity"/)
  assert.match(mount, /\[&_\.container\]:!max-w-none/)
  assert.match(mount, /bg-black\/55/)
  assert.match(mount, /Population: estimate feed/)
  assert.match(mount, /data-population-roller-width-fix/)
  assert.match(mount, /width: min\(13ch, 100%\) !important/)
  assert.match(mount, /@media \(max-width: 639px\)/)
  assert.match(mount, /flex: 1 1 10rem/)
  assert.match(mount, /Species: MINDEX/)
  assert.match(mount, /Agents: MAS \+ global-agent registries/)
  assert.match(natureosView, /<RollingNumber/)
  assert.match(natureosView, /<HumansMachinesPanel/)
  assert.match(natureosView, /<KingdomStatCard/)
  assert.match(natureosView, /Humans & Population/)
  assert.match(natureosView, /Humans, Machines & Agents/)
  assert.match(natureosView, /Environmental quality/)
  assert.match(natureosView, /Species & Kingdoms/)
})
