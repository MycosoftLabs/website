"use client";

/**
 * MapEntityWidget — rich, data-dense entity panels for MILITARY bases and DEVICES, the
 * controller analogue of the Earth-Sim InfraDetailWidget / DeviceWidget. Standalone: built
 * from the GCS's own glass UI primitives, NO imports from CREP/MYCA. Reads a static snapshot
 * of the clicked feature (asset.raw.__full, captured at click time) — never a live map ref,
 * never the telemetry poll — so it rides the same pickedAsset pipeline that lives OUTSIDE the
 * memoized map (freeze-safe). Other asset kinds keep the lightweight MapAssetDetailCard.
 */

import { useEffect, useState } from "react";
import { X, MapPin, Shield, Building2, Users, CalendarClock, Phone, Mail, Globe, Cpu, Server, Radio, Clock, ExternalLink } from "lucide-react";
import type { MapAsset } from "@/lib/fusarium/gcs/contract";
import { SectionLabel, StatLED, Readout } from "@/components/fusarium/gcs/ui";
import SensorSuitePanel from "@/components/fusarium/gcs/views/SensorSuitePanel";

function fmtLatLon(lat: number | null, lon: number | null): string | null {
  if (lat == null || lon == null) return null;
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}
function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}
function ago(iso: unknown): string | null {
  if (typeof iso !== "string") return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Military enrichment (static public GeoJSON, fetched once + cached) ────────────────────────
let enrichmentPromise: Promise<any[]> | null = null;
function loadMilitaryEnrichment(): Promise<any[]> {
  if (!enrichmentPromise) {
    enrichmentPromise = fetch("/data/crep/military-bases-enrichment.geojson")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (Array.isArray(j?.features) ? j.features.map((f: any) => f?.properties || f) : []))
      .catch(() => []);
  }
  return enrichmentPromise;
}
function matchEnrichment(list: any[], name: string): any | null {
  const n = name.trim().toLowerCase();
  if (!n) return null;
  return (
    list.find((e) => String(e.name || "").toLowerCase() === n) ||
    list.find((e) => Array.isArray(e.aliases) && e.aliases.some((a: string) => String(a).toLowerCase() === n)) ||
    list.find((e) => {
      const en = String(e.name || "").toLowerCase();
      return en && (n.includes(en) || en.includes(n));
    }) ||
    null
  );
}

// Geometry here is a control-reachability constraint, not decoration. This card is z-30 and
// pointer-events-auto, so whatever it covers stops being clickable. It shares the map pane with two
// z-20 siblings: MapAnalysisWidget (`left-3 top-3 w-60` -> x 12..252, MapAnalysisWidget.tsx:132) and
// MapZone's right-hand column (`right-3 top-3`, full pane height, holding DisconnectedOpsHUD and the
// Layers open/close control, MapZone.tsx:202). The pane is narrow — PsathyrellaConsole's two rails
// leave 720px at a 1280 viewport, 464px at 1024, 304px at md — so a 300px centred card is WIDER than
// the gap between those two lanes and no horizontal position clears both. Picking a base therefore
// used to bury the Layers toggles and MYCA under an opaque panel with no way to reach them.
//
// So instead of chasing a horizontal lane that does not exist, vacate the top 80px band: every
// escape hatch lives there (MYCA's minimize button ~y22..42, the link chip, the Layers button
// ~y48..76 when the link is live). The card may still overlap a sibling's BODY at narrow widths, but
// the operator can always minimize MYCA or close Layers to get at what is underneath. `max-h` is
// reduced by the same 80px plus the 12px bottom margin so the card still bottoms out at bottom-3 —
// its vertical extent is unchanged, only its top is pulled clear.
//
// Width is clamped to the pane because below `md` BOTH console rails are `hidden`: a 375px viewport
// gives a ~359px pane, where a rigid 300px card centred with -translate-x-1/2 leaves no margin.
const CARD =
  "psa-glass-strong pointer-events-auto absolute left-1/2 top-20 z-30 flex max-h-[calc(100%-5.75rem)] w-[min(300px,calc(100%-1.5rem))] -translate-x-1/2 flex-col overflow-hidden rounded-xl";

function CardHeader({ eyebrow, title, accent, onClose }: { eyebrow: React.ReactNode; title: string; accent: string; onClose: () => void }) {
  return (
    <div className={`flex shrink-0 items-start justify-between gap-2 border-b px-3 py-2.5 ${accent}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.18em] text-cyan-400/70">{eyebrow}</div>
        <div className="truncate text-[13px] font-bold text-white">{title}</div>
      </div>
      <button type="button" onClick={onClose} className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-white/5 hover:text-white" title="Close">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Row({ label, value, href }: { label: string; value: React.ReactNode; href?: string }) {
  if (value == null || value === "" ) return null;
  return (
    <div className="flex items-start justify-between gap-2 py-0.5 text-[11px]">
      <span className="shrink-0 text-slate-500">{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="truncate text-right text-cyan-300 hover:underline">{value}</a>
      ) : (
        <span className="truncate text-right text-slate-200">{value}</span>
      )}
    </div>
  );
}

// ── Military base ────────────────────────────────────────────────────────────────────────────
function MilitaryEntityCard({ asset, full, onClose }: { asset: MapAsset; full: any; onClose: () => void }) {
  const [enr, setEnr] = useState<any | null>(null);
  const name = String(full.name || asset.label || "Installation");
  const tags = (full.tags && typeof full.tags === "object" ? full.tags : full) as any;
  const navy = /nav(y|al)/i.test(`${full.type || ""} ${name} ${full.operator || ""}`);
  const alandM2 = num(tags.ALAND);
  const acres = alandM2 != null ? Math.round(alandM2 / 4046.856) : null;
  const km2 = alandM2 != null ? alandM2 / 1e6 : null;
  const lat = asset.lat ?? num(full.lat);
  const lon = asset.lon ?? num(full.lng);
  const ll = fmtLatLon(lat, lon);

  useEffect(() => {
    let alive = true;
    loadMilitaryEnrichment().then((list) => { if (alive) setEnr(matchEnrichment(list, name)); });
    return () => { alive = false; };
  }, [name]);

  const typeLabel = String(full.type || "Military installation").replace(/_/g, " ");
  const branch = enr?.primary_component || (navy ? "Navy" : full.operator || null);

  return (
    <div className={CARD}>
      <CardHeader
        eyebrow={<><Shield className="h-2.5 w-2.5" /> Military Installation</>}
        title={name}
        accent={navy ? "border-red-500/40 bg-gradient-to-r from-red-900/30 to-transparent" : "border-amber-500/30 bg-gradient-to-r from-amber-900/20 to-transparent"}
        onClose={onClose}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {/* identity */}
        <div className="mb-2 grid grid-cols-2 gap-1.5">
          <Readout label="Branch" value={branch || "—"} status={navy ? "ok" : "idle"} />
          <Readout label="Class" value={typeLabel} status="idle" />
          <Readout label="Area" value={acres != null ? `${acres.toLocaleString()} ac` : "—"} status="idle" />
          <Readout label="Area km²" value={km2 != null ? km2.toFixed(2) : "—"} status="idle" />
        </div>
        <Row label="Operator" value={full.operator || null} />
        <Row label="MTFCC" value={tags.MTFCC || null} />
        <Row label="Source" value={tags.source || full.source || null} />

        {/* enrichment (when a curated record matches) */}
        {enr && (
          <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-900/10 p-2">
            <SectionLabel className="mb-1"><Building2 className="mr-1 inline h-3 w-3 text-emerald-300" /> Installation detail</SectionLabel>
            <Row label="Command" value={enr.command || null} />
            <Row label="Commander" value={enr.commander || null} />
            <Row label="Branches" value={Array.isArray(enr.branches) ? enr.branches.join(" · ") : null} />
            <Row label="Personnel" value={enr.personnel || null} />
            <Row label="Established" value={enr.commissioned || null} />
            <Row label="Curated area" value={enr.area_acres != null ? `${Number(enr.area_acres).toLocaleString()} ac` : null} />
            <Row label="Address" value={enr.address || null} />
            {Array.isArray(enr.notable_tenants) && enr.notable_tenants.length > 0 && (
              <div className="mt-1 border-t border-emerald-500/15 pt-1">
                <div className="mb-0.5 flex items-center gap-1 text-[9px] uppercase tracking-wider text-emerald-300/70"><Users className="h-2.5 w-2.5" /> Notable tenants</div>
                {enr.notable_tenants.slice(0, 6).map((t: string, i: number) => (
                  <div key={i} className="truncate text-[10px] text-slate-300">• {t}</div>
                ))}
              </div>
            )}
            <div className="mt-1 border-t border-emerald-500/15 pt-1">
              {enr.pao_phone && <Row label={<><Phone className="mr-0.5 inline h-2.5 w-2.5" />PAO</> as any} value={enr.pao_phone} href={`tel:${enr.pao_phone}`} />}
              {enr.pao_email && <Row label={<><Mail className="mr-0.5 inline h-2.5 w-2.5" />Email</> as any} value={enr.pao_email} href={`mailto:${enr.pao_email}`} />}
              {enr.website && <Row label={<><Globe className="mr-0.5 inline h-2.5 w-2.5" />Web</> as any} value={String(enr.website).replace(/^https?:\/\//, "")} href={enr.website} />}
            </div>
            {enr.last_updated && <div className="mt-1 flex items-center gap-1 text-[8px] uppercase tracking-wide text-emerald-400/50"><CalendarClock className="h-2.5 w-2.5" /> enriched {enr.last_updated}</div>}
          </div>
        )}
        {ll && <div className="mt-2 flex items-center gap-1 border-t border-white/5 pt-1.5 font-mono text-[10px] text-slate-400"><MapPin className="h-3 w-3 text-cyan-400/70" /> {ll}</div>}
      </div>
    </div>
  );
}

// ── Mycosoft device (full telemetry) ─────────────────────────────────────────────────────────
function DeviceEntityCard({ asset, full, onClose }: { asset: MapAsset; full: any; onClose: () => void }) {
  const name = String(full.name || asset.label || "Device");
  const status = String(full.status || "").toLowerCase();
  const online = status ? !/offline|stale/.test(status) : Boolean(full.online);
  const t = (full.telemetry && typeof full.telemetry === "object" ? full.telemetry : {}) as any;
  const lat = asset.lat ?? num(full?.location?.lat);
  const lon = asset.lon ?? num(full?.location?.lon ?? full?.location?.lng);
  const ll = fmtLatLon(lat, lon);
  const pageHref = typeof full.page_href === "string" ? full.page_href : null;

  return (
    <div className={CARD}>
      <CardHeader
        eyebrow={<><Cpu className="h-2.5 w-2.5" /> {String(full.type || full.role || "Mycosoft device").replace(/_/g, " ")}</>}
        title={name}
        accent="border-cyan-500/30 bg-gradient-to-r from-cyan-900/25 to-transparent"
        onClose={onClose}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {/* status line */}
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold">
            <StatLED color={online ? "green" : "slate"} pulse={online} />
            <span className={online ? "text-green-300" : "text-slate-400"}>{full.status || (online ? "online" : "offline")}</span>
          </span>
          {full.lastSeen && <span className="flex items-center gap-1 text-[9px] text-slate-500"><Clock className="h-2.5 w-2.5" /> {ago(full.lastSeen) || "—"}</span>}
        </div>
        {full.location_label && <Row label="Site" value={String(full.location_label)} />}

        {/* Live BME688 / BSEC2 suite. The hub reports ~25 fields; showing a couple of them let an
            operator read a converging BSEC2 estimate as a settled measurement, so the whole suite
            (values + the accuracy/burn-in state that qualifies them) is rendered here. The widget
            floats over the map, so the panel scrolls inside a fixed-height well — the card itself
            must not grow. */}
        <SectionLabel className="mb-1 mt-1.5">Environmental telemetry</SectionLabel>
        <div className="max-h-[14rem] overflow-y-auto rounded-lg border border-white/5 bg-black/25 px-2 pb-1.5">
          <SensorSuitePanel
            compact
            reading={t}
            deviceId={typeof full.mdp_device_id === "string" ? full.mdp_device_id : typeof full.id === "string" ? full.id : null}
            role={typeof full.role === "string" ? full.role : null}
            fwVersion={typeof full.firmware_version === "string" ? full.firmware_version : null}
          />
        </div>
        {t.captured_at && <div className="mt-1 text-[9px] uppercase tracking-wide text-slate-500">reading {ago(t.captured_at) || "—"}</div>}

        {/* connectivity / provenance */}
        <SectionLabel className="mb-1 mt-2"><Server className="mr-1 inline h-3 w-3" /> Node</SectionLabel>
        <Row label="Source" value={full.source ? String(full.source).toUpperCase() : null} />
        <Row label="Host" value={full.host || null} />
        <Row label="Agent" value={typeof full.agent_url === "string" ? full.agent_url.replace(/^https?:\/\//, "") : null} />
        <Row label="Registry" value={full.registry_id || null} />
        <Row label="Firmware" value={full.firmware_repo || null} />
        <Row label="Port" value={full.port != null ? String(full.port) : null} />

        {pageHref && (
          <a href={pageHref} className="mt-2 flex items-center justify-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 py-1.5 text-[10px] font-bold uppercase tracking-wide text-cyan-200 hover:bg-cyan-500/20">
            <ExternalLink className="h-3 w-3" /> Open device manager
          </a>
        )}
        {ll && <div className="mt-2 flex items-center gap-1 border-t border-white/5 pt-1.5 font-mono text-[10px] text-slate-400"><MapPin className="h-3 w-3 text-cyan-400/70" /> {ll}</div>}
      </div>
    </div>
  );
}

/** Router — military bases + Mycosoft devices get the rich panel; callers pass other kinds to MapAssetDetailCard. */
export function MapEntityWidget({ asset, onClose }: { asset: MapAsset | null; onClose: () => void }) {
  if (!asset) return null;
  let full: any = asset.raw || {};
  if (full && typeof full.__full === "string") {
    try { full = JSON.parse(full.__full); } catch { /* keep flat props */ }
  }
  const isMil = asset.layerId === "psa-bases-fill" || asset.layerId === "psa-bases-dot";
  return isMil
    ? <MilitaryEntityCard asset={asset} full={full} onClose={onClose} />
    : <DeviceEntityCard asset={asset} full={full} onClose={onClose} />;
}
