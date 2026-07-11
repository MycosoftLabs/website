"use client";

/**
 * Devices / Nodes tab — Mycosoft fleet categorized by DROID TYPE, focused on the buoy.
 *   Aquatic Droid  — moves in water (Psathyrella buoy)         ← this controller's focus
 *   Land Droid     — walking/terrestrial (Mushroom One)
 *   Flying Droid   — aerial (Agaric, future)
 *   Edge Data Center — stationary Blackwell compute (Hyphae One, doesn't move)
 * Live fields populate from telemetry + the device registry; mesh-topology fields
 * (peers/hops) light up when the LoRa/Meshtastic backend feeds them.
 */

import { useState, type ReactNode } from "react";
import useSWR from "swr";
import { Anchor, Bot, Plane, Server, Cpu, Radio, MapPin } from "lucide-react";
import { Panel, SectionLabel, StatLED, Bar } from "../ui";
import { PSATHYRELLA_DEVICE_ID, type BuoyTelemetry, type SelectedDevice } from "@/lib/psathyrella/contract";

const fetcher = (u: string) => fetch(u, { headers: { accept: "application/json" } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);

type Category = "aquatic" | "land" | "flying" | "edge" | "other";
const CATEGORY_ORDER: Category[] = ["aquatic", "land", "flying", "edge", "other"];
const CATEGORY_META: Record<Category, { label: string; short: string; icon: typeof Anchor; color: string }> = {
  aquatic: { label: "Aquatic Droid", short: "Aquatic", icon: Anchor, color: "text-cyan-300" },
  land: { label: "Land Droid", short: "Land", icon: Bot, color: "text-amber-300" },
  flying: { label: "Flying Droid", short: "Air", icon: Plane, color: "text-violet-300" },
  edge: { label: "Edge Data Center", short: "Edge", icon: Server, color: "text-emerald-300" },
  other: { label: "Device", short: "Other", icon: Cpu, color: "text-slate-300" },
};

interface Node {
  id: string;
  name: string;
  category: Category;
  online: boolean;
  isBuoy: boolean;
  lat: number | null;
  lon: number | null;
  batteryPct: number | null;
  rssiDbm: number | null;
  peers: number | null;
}

function classifyCategory(d: any): Category {
  const t = `${d?.type || ""} ${d?.id || ""} ${d?.name || ""}`.toLowerCase();
  if (t.includes("psathyrella") || t.includes("buoy")) return "aquatic";
  if (t.includes("mushroom")) return "land";
  if (t.includes("agaric")) return "flying";
  if (t.includes("hyphae")) return "edge";
  return "other";
}

const rssiFrac = (r: number | null) => (r === null ? null : Math.max(0, Math.min(1, (r + 100) / 60)));

export function DevicesPanel({ telemetry, selected, onSelect }: { telemetry: BuoyTelemetry; selected: SelectedDevice | null; onSelect: (s: SelectedDevice | null) => void }) {
  const { data } = useSWR("/api/earth-simulator/devices", fetcher, { refreshInterval: 15000, revalidateOnFocus: false });
  const rows: any[] = Array.isArray(data?.devices) ? data.devices : [];
  const [filter, setFilter] = useState<Category | "all">("aquatic");
  const activeId = selected?.id ?? telemetry.deviceId;

  const bestRadio = telemetry.comms.radios.filter((r) => r.connected && r.rssiDbm != null).sort((a, b) => (b.rssiDbm ?? -999) - (a.rssiDbm ?? -999))[0];

  const buoyNode: Node = {
    id: telemetry.deviceId,
    name: "Psathyrella",
    category: "aquatic",
    online: telemetry.link === "online",
    isBuoy: true,
    lat: telemetry.pose.lat,
    lon: telemetry.pose.lon,
    batteryPct: telemetry.power.batterySocPct,
    rssiDbm: bestRadio?.rssiDbm ?? null,
    peers: telemetry.comms.radios.filter((r) => r.connected).length || null,
  };

  // The buoy is rendered separately as buoyNode; exclude ALL its aliases so the shared devices
  // aggregator (still emitting the legacy psathyrella-buoy-com4 id) doesn't duplicate it here.
  const BUOY_ALIASES = new Set([PSATHYRELLA_DEVICE_ID.toLowerCase(), "psathyrella-buoy-com4", "mycobrain-com4"]);
  const others: Node[] = rows
    .filter((d) => !BUOY_ALIASES.has(String(d?.id || "").toLowerCase()))
    .map((d) => {
      const lat = Number(d?.location?.lat);
      const lon = Number(d?.location?.lon ?? d?.location?.lng);
      const status = String(d?.status || d?.telemetry?.status || "").toLowerCase();
      return {
        id: String(d?.id || d?.name || Math.random()),
        name: String(d?.name || d?.id || "device"),
        category: classifyCategory(d),
        online: !status.includes("offline") && !status.includes("stale"),
        isBuoy: false,
        lat: Number.isFinite(lat) ? lat : null,
        lon: Number.isFinite(lon) ? lon : null,
        batteryPct: null,
        rssiDbm: null,
        peers: null,
      } as Node;
    });

  const nodes = [buoyNode, ...others];
  const onlineCount = nodes.filter((n) => n.online).length;
  const counts = (c: Category) => nodes.filter((n) => n.category === c).length;
  const presentCats = CATEGORY_ORDER.filter((c) => counts(c) > 0);
  const shownCats = filter === "all" ? presentCats : presentCats.filter((c) => c === filter);

  return (
    <Panel title="Devices · Nodes" icon={<Radio className="h-3.5 w-3.5" />} className="h-full" right={<span className="font-mono text-[10px] text-cyan-300">{onlineCount}/{nodes.length}</span>}>
      {/* fleet summary */}
      <div className="mb-2 grid grid-cols-3 gap-1 rounded-lg border border-cyan-500/15 bg-white/[0.02] p-2 text-center">
        <div><div className="font-mono text-base text-cyan-200">{nodes.length}</div><div className="text-[8px] uppercase tracking-wide text-slate-500">Nodes</div></div>
        <div><div className="font-mono text-base text-green-300">{onlineCount}</div><div className="text-[8px] uppercase tracking-wide text-slate-500">Online</div></div>
        <div><div className="font-mono text-base text-cyan-200">{buoyNode.peers ?? "—"}</div><div className="text-[8px] uppercase tracking-wide text-slate-500">Links</div></div>
      </div>

      {/* type filter — defaults to the buoy (Aquatic) */}
      <div className="mb-2 flex flex-wrap gap-1">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>All · {nodes.length}</FilterChip>
        {presentCats.map((c) => {
          const Icon = CATEGORY_META[c].icon;
          return (
            <FilterChip key={c} active={filter === c} onClick={() => setFilter(c)}>
              <Icon className={`h-3 w-3 ${CATEGORY_META[c].color}`} /> {CATEGORY_META[c].short} · {counts(c)}
            </FilterChip>
          );
        })}
      </div>

      {shownCats.map((cat) => {
        const meta = CATEGORY_META[cat];
        const Icon = meta.icon;
        const catNodes = nodes.filter((n) => n.category === cat);
        return (
          <div key={cat} className="mb-2">
            <SectionLabel><span className="inline-flex items-center gap-1.5"><Icon className={`h-3 w-3 ${meta.color}`} /> {meta.label} ({catNodes.length})</span></SectionLabel>
            <div className="space-y-1.5">
              {catNodes.map((n) => {
                const active = n.id === activeId;
                return (
                <button
                  type="button"
                  key={n.id}
                  onClick={() => onSelect(n.isBuoy ? null : n)}
                  className={`psa-glass-btn w-full rounded-lg border p-2 text-left ${
                    active
                      ? "border-amber-400/70 bg-amber-400/[0.08] ring-1 ring-amber-400/40"
                      : n.isBuoy
                        ? "border-cyan-500/40 bg-cyan-500/[0.06] hover:border-cyan-400/60"
                        : "border-white/10 bg-white/[0.02] hover:border-white/25"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${n.isBuoy ? "text-cyan-300" : meta.color}`} />
                      <span className="truncate text-[11px] font-semibold text-white">{n.name}</span>
                      <span className="shrink-0 rounded bg-black/40 px-1 text-[8px] uppercase tracking-wide text-slate-400">{meta.short}</span>
                    </div>
                    <StatLED color={n.online ? "green" : "slate"} pulse={n.online && n.isBuoy} />
                  </div>
                  <div className="mt-1.5 grid grid-cols-4 gap-1 text-center">
                    <div><div className="text-[8px] uppercase text-slate-500">Batt</div><div className="font-mono text-[11px] text-slate-200">{n.batteryPct != null ? `${Math.round(n.batteryPct)}%` : "—"}</div></div>
                    <div><div className="text-[8px] uppercase text-slate-500">RSSI</div><div className="font-mono text-[11px] text-slate-200">{n.rssiDbm != null ? n.rssiDbm : "—"}</div></div>
                    <div><div className="text-[8px] uppercase text-slate-500">Peers</div><div className="font-mono text-[11px] text-slate-200">{n.peers ?? "—"}</div></div>
                    <div><div className="text-[8px] uppercase text-slate-500">Hops</div><div className="font-mono text-[11px] text-slate-200">—</div></div>
                  </div>
                  {n.rssiDbm != null && <div className="mt-1.5"><Bar value={rssiFrac(n.rssiDbm)} color="cyan" /></div>}
                  <div className="mt-1 flex items-center gap-1 text-[9px] text-slate-500">
                    <MapPin className="h-2.5 w-2.5" />
                    {n.lat != null && n.lon != null ? <span className="font-mono">{n.lat.toFixed(4)}, {n.lon.toFixed(4)}</span> : <span>location standby</span>}
                  </div>
                </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="mt-1 rounded-md border border-cyan-500/15 bg-white/[0.02] px-2 py-1.5 text-[9px] leading-relaxed text-slate-500">
        Full mesh topology — peer links, hop counts, packet flow — lights up on the MAP mesh layer once the LoRa/Meshtastic backend feeds it.
      </div>
    </Panel>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`psa-glass-btn inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        active ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-100" : "border-white/10 text-slate-400 hover:text-slate-100"
      }`}
    >
      {children}
    </button>
  );
}
