"use client";

/**
 * Emergency Alert Overlay — life-safety weather warnings for the Earth Simulator.
 *
 * Bottom-docked pop-up (desktop) that surfaces active NWS hazards with the official
 * protective-action instruction + links to 911, live radar, the local forecast, all
 * nearby alerts, and preparedness info. Data: the authoritative National Weather
 * Service point query (`/api/crep/emergency-alerts`).
 *
 * DUAL TRIGGER: it polls BOTH the browser GPS ("Your location") AND the current map
 * center ("Map area"), so it fires whether you're physically in a warning OR you pan
 * the map into one. Alerts from both points are merged + de-duped.
 *
 * ONLY POPS for genuine hazards (warnings, watches, emergencies, anything Severe/Extreme,
 * and hazard statements like Special Weather / Beach Hazards) — routine advisories
 * (Wind Advisory, Small Craft Advisory, etc.) are suppressed. Threshold is `isPopupWorthy`.
 *
 * Docked at the BOTTOM, above the stats bar; tuck it away with the chevron. Never a
 * green "all clear"; a real alert persists through a transient fetch error.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle, Radio, CloudRain, Phone, ExternalLink, MapPin, X, ChevronUp, ChevronDown, ShieldAlert, Navigation, Wind,
} from "lucide-react";

type Tier = "warning" | "watch" | "advisory" | "statement";
type LocSource = "gps" | "map";

interface EmergencyAlert {
  id: string;
  event: string;
  severity: string;
  certainty: string;
  urgency: string;
  headline: string;
  description: string;
  instruction: string;
  areaDesc: string;
  senderName: string;
  effective: string | null;
  expires: string | null;
  ends: string | null;
  web: string | null;
  tier: Tier;
  lifeThreatening: boolean;
  _source?: LocSource;
}

type LatLng = { lat: number; lng: number };

const POLL_MS = 45_000;

interface WxState {
  loading?: boolean; error?: boolean;
  tempF?: number | null; tempUnit?: string; shortForecast?: string | null;
  windSpeed?: string | null; windDirection?: string | null;
  place?: string | null; icon?: string | null; radarUrl?: string | null;
}

// 5-min live-weather cache keyed by rounded point — re-renders + the 60s tick + 45s poll reuse it.
const WX_CACHE = new Map<string, { at: number; data: WxState }>();

/** Slippy-map tile x/y for a lat/lng/zoom — picks one RainViewer tile for the thumbnail. */
function tileXY(lat: number, lng: number, z: number): { x: number; y: number } {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) };
}

/** Pop up only for genuine hazards — not routine advisories. Easy to tighten/loosen. */
function isPopupWorthy(a: EmergencyAlert): boolean {
  if (a.lifeThreatening) return true;
  if (/emergency/i.test(a.event)) return true;
  if (a.severity === "Severe" || a.severity === "Extreme") return true;
  if (a.tier === "warning" || a.tier === "watch") return true;
  if (a.tier === "statement") return true;          // Special Weather / Beach Hazards / Coastal, etc.
  return false;                                      // tier === "advisory" → suppressed
}

function forecastUrl(p: LatLng) { return `https://forecast.weather.gov/MapClick.php?lat=${p.lat.toFixed(4)}&lon=${p.lng.toFixed(4)}`; }
const ALL_ALERTS_URL = "https://alerts.weather.gov/";

function prepUrl(event: string) {
  const e = (event || "").toLowerCase();
  if (e.includes("tornado")) return "https://www.ready.gov/tornadoes";
  if (e.includes("flood")) return "https://www.ready.gov/floods";
  if (e.includes("thunderstorm") || e.includes("lightning")) return "https://www.ready.gov/thunderstorms-lightning";
  if (e.includes("hurricane") || e.includes("tropical")) return "https://www.ready.gov/hurricanes";
  if (e.includes("winter") || e.includes("blizzard") || e.includes("ice") || e.includes("snow")) return "https://www.ready.gov/winter-weather";
  if (e.includes("heat")) return "https://www.ready.gov/extreme-heat";
  if (e.includes("fire") || e.includes("red flag")) return "https://www.ready.gov/wildfires";
  if (e.includes("beach") || e.includes("rip current") || e.includes("surf") || e.includes("marine")) return "https://www.weather.gov/safety/ripcurrent";
  return "https://www.ready.gov/be-informed";
}

function fmtCountdown(iso: string | null): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

const TIER_STYLE: Record<Tier, { bar: string; chip: string; label: string }> = {
  warning: { bar: "from-red-700 to-red-600 border-red-300", chip: "bg-red-950 text-red-100 border-red-400", label: "WARNING" },
  watch: { bar: "from-orange-600 to-amber-600 border-amber-300", chip: "bg-amber-950 text-amber-100 border-amber-400", label: "WATCH" },
  advisory: { bar: "from-yellow-600 to-yellow-500 border-yellow-300", chip: "bg-yellow-900 text-yellow-100 border-yellow-400", label: "ADVISORY" },
  statement: { bar: "from-sky-700 to-sky-600 border-sky-300", chip: "bg-sky-950 text-sky-100 border-sky-400", label: "ADVISORY" },
};

export default function EmergencyAlertOverlay() {
  const [gps, setGps] = useState<LatLng | null>(null);
  const [gpsState, setGpsState] = useState<"pending" | "granted" | "denied" | "unavailable">("pending");
  const [mapCenter, setMapCenter] = useState<LatLng | null>(null);
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [lastChecked, setLastChecked] = useState<number>(0);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [minimized, setMinimized] = useState(true); // tucked/closed at start (Morgan)
  const [hasNew, setHasNew] = useState(false); // blink the tucked pill when new alert info arrives
  const [expanded, setExpanded] = useState(false);
  const [wx, setWx] = useState<WxState | null>(null);
  const [, force] = useState(0); // re-render for countdown ticking
  const announced = useRef<Set<string>>(new Set());
  const seenIds = useRef<Set<string>>(new Set());

  const gpsKey = gps ? `${gps.lat.toFixed(2)},${gps.lng.toFixed(2)}` : null;
  const mapKey = mapCenter ? `${mapCenter.lat.toFixed(2)},${mapCenter.lng.toFixed(2)}` : null;

  // ── GPS watch ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) { setGpsState("unavailable"); return; }
    let id: number | null = null;
    try {
      id = navigator.geolocation.watchPosition(
        (pos) => { setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsState("granted"); },
        (err) => { setGpsState(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"); },
        { enableHighAccuracy: false, maximumAge: 60_000, timeout: 20_000 },
      );
    } catch { setGpsState("unavailable"); }
    return () => { try { if (id != null) navigator.geolocation.clearWatch(id); } catch { /* */ } };
  }, []);

  // ── Track the map center ALWAYS (not just as a GPS fallback) so panning into an
  //    area shows that area's alerts. ─────────────────────────────────────────
  useEffect(() => {
    const read = () => {
      try {
        const m = (window as unknown as { __crep_map?: any }).__crep_map;
        const c = m?.getCenter?.();
        if (c && Number.isFinite(c.lat) && Number.isFinite(c.lng)) setMapCenter({ lat: c.lat, lng: c.lng });
      } catch { /* */ }
    };
    read();
    const iv = window.setInterval(read, 15_000);
    let m: any;
    try { m = (window as unknown as { __crep_map?: any }).__crep_map; m?.on?.("moveend", read); } catch { /* */ }
    return () => { window.clearInterval(iv); try { m?.off?.("moveend", read); } catch { /* */ } };
  }, []);

  // ── Poll NWS for BOTH the GPS point and the map center; merge + de-dupe ──────
  useEffect(() => {
    const points: Array<LatLng & { source: LocSource }> = [];
    if (gps) points.push({ ...gps, source: "gps" });
    if (mapCenter && mapKey !== gpsKey) points.push({ ...mapCenter, source: "map" });
    if (points.length === 0) return;
    let cancelled = false;
    const check = async () => {
      const results = await Promise.all(points.map(async (pt) => {
        try {
          const r = await fetch(`/api/crep/emergency-alerts?lat=${pt.lat.toFixed(4)}&lng=${pt.lng.toFixed(4)}`, { cache: "no-store" });
          const d = await r.json().catch(() => null);
          if (d && d.ok && Array.isArray(d.alerts)) return (d.alerts as EmergencyAlert[]).map((a) => ({ ...a, _source: pt.source }));
          return null; // upstream error / unsupported → don't treat as "clear"
        } catch { return null; }
      }));
      if (cancelled) return;
      const anyError = results.some((r) => r === null);
      const merged: EmergencyAlert[] = [];
      const seen = new Set<string>();
      for (const list of results) {
        if (!list) continue;
        for (const a of list) { if (seen.has(a.id)) continue; seen.add(a.id); merged.push(a); }
      }
      // Never drop a known alert because of a transient blip: keep the last set if every
      // point errored and we have nothing new.
      if (anyError && merged.length === 0) { setLastChecked(Date.now()); return; }
      setAlerts(merged);
      setLastChecked(Date.now());
    };
    check();
    const iv = window.setInterval(check, POLL_MS);
    return () => { cancelled = true; window.clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsKey, mapKey]);

  // ── Tick once a minute so the countdown stays fresh ──────────────────────
  useEffect(() => {
    const iv = window.setInterval(() => force((n) => n + 1), 60_000);
    return () => window.clearInterval(iv);
  }, []);

  const active = alerts.filter((a) => !dismissed.has(a.id) && isPopupWorthy(a));
  // most urgent first
  const rank = (a: EmergencyAlert) => (a.lifeThreatening ? 0 : a.tier === "warning" ? 1 : a.tier === "watch" ? 2 : a.tier === "statement" ? 3 : 4);
  active.sort((a, b) => rank(a) - rank(b));
  const lifeThreat = active.some((a) => a.lifeThreatening || a.tier === "warning");

  // Point for the live-weather panel — computed BEFORE the early returns so the fetch hook
  // below can use it (hooks can't run after a conditional return).
  const panelTop = active[0];
  const panelLoc: LatLng | null = panelTop ? ((panelTop._source === "gps" ? gps : mapCenter) ?? gps ?? mapCenter) : null;
  const panelKey = panelLoc ? `${panelLoc.lat.toFixed(2)},${panelLoc.lng.toFixed(2)}` : null;

  // ── Live weather (radar thumbnail + current NWS conditions) — fetched only on expand ──
  useEffect(() => {
    if (!expanded || !panelLoc || !panelKey) return;
    const cached = WX_CACHE.get(panelKey);
    if (cached && Date.now() - cached.at < 5 * 60_000) { setWx(cached.data); return; }
    let cancelled = false;
    setWx({ loading: true });
    (async () => {
      try {
        const [wxRes, rv] = await Promise.all([
          fetch(`/api/crep/weather-now?lat=${panelLoc.lat.toFixed(4)}&lng=${panelLoc.lng.toFixed(4)}`, { cache: "no-store" }).then((r) => r.json()).catch(() => null),
          fetch("https://api.rainviewer.com/public/weather-maps.json", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
        ]);
        if (cancelled) return;
        let radarUrl: string | null = null;
        try {
          const host = rv?.host || "https://tilecache.rainviewer.com";
          const past = Array.isArray(rv?.radar?.past) ? rv.radar.past : [];
          const path = past[past.length - 1]?.path;
          if (path) { const z = 6; const { x, y } = tileXY(panelLoc.lat, panelLoc.lng, z); radarUrl = `${host}${path}/256/${z}/${x}/${y}/4/1_1.png`; }
        } catch { /* */ }
        const data: WxState = (wxRes && wxRes.ok)
          ? { tempF: wxRes.tempF, tempUnit: wxRes.tempUnit, shortForecast: wxRes.shortForecast, windSpeed: wxRes.windSpeed, windDirection: wxRes.windDirection, place: wxRes.place, icon: wxRes.icon, radarUrl }
          : { error: true, radarUrl };
        WX_CACHE.set(panelKey, { at: Date.now(), data });
        setWx(data);
      } catch { if (!cancelled) setWx({ error: true }); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, panelKey]);

  // ── Audible cue once per new life-threatening alert (best-effort) ────────
  useEffect(() => {
    const fresh = active.filter((a) => (a.lifeThreatening || a.tier === "warning") && !announced.current.has(a.id));
    if (fresh.length === 0) return;
    fresh.forEach((a) => announced.current.add(a.id));
    // Auto-open ONLY for a NEW life-threatening warning the user is physically INSIDE (the alert
    // came from their GPS point) AND is currently LOOKING AT (their GPS point is in the map
    // viewport). Anything else stays tucked and just blinks the pill. (Morgan, Jun 18 2026.)
    try {
      const m = (window as unknown as { __crep_map?: { getBounds?: () => { contains?: (p: [number, number]) => boolean } } }).__crep_map;
      const inView = !!(gps && m?.getBounds?.()?.contains?.([gps.lng, gps.lat]));
      // The user is physically INSIDE a new life-threatening warning (alert came from their GPS)
      // AND is currently looking at that spot (GPS point in the viewport).
      const insideEmergency = inView && fresh.some((a) => a.lifeThreatening && a._source === "gps");
      if (insideEmergency) {
        setMinimized(false);
        // Auto-arm the live weather radar + lightning so the storm is immediately visible on the
        // map. ONLY in this GPS-AND-viewport-in-emergency case (Morgan, Jun 18 2026) — never just
        // from panning the map into a warning.
        const setLayer = (window as unknown as { __crep_setLayer?: (id: string, on?: boolean) => unknown }).__crep_setLayer;
        try { setLayer?.("weatherRadar", true); setLayer?.("stormLightning", true); } catch { /* */ }
      }
    } catch { /* */ }
    try {
      const Ctx = (window as unknown as { AudioContext?: any; webkitAudioContext?: any }).AudioContext
        || (window as unknown as { webkitAudioContext?: any }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const beep = (t: number) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = "square"; o.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + t + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.35);
        o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.4);
      };
      beep(0); beep(0.5);
      window.setTimeout(() => { try { ctx.close(); } catch { /* */ } }, 1500);
    } catch { /* autoplay may block until a gesture — non-fatal */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.map((a) => a.id).join("|")]);

  // ── Blink the tucked pill when a NEW alert appears (closed at start; blink on new info) ──
  useEffect(() => {
    let isNew = false;
    for (const a of active) { if (!seenIds.current.has(a.id)) { seenIds.current.add(a.id); isNew = true; } }
    if (isNew) setHasNew(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.map((a) => a.id).join("|")]);

  if (typeof document === "undefined") return null;
  if (active.length === 0) return null; // verified clear OR still pending → render nothing

  const top = active[0];
  const ts = TIER_STYLE[top.tier];
  const topLoc: LatLng | null = (top._source === "gps" ? gps : mapCenter) ?? gps ?? mapCenter;
  const updatedAgo = lastChecked ? Math.max(0, Math.round((Date.now() - lastChecked) / 1000)) : null;

  // ── Tucked-away pill (bottom, above the stats bar) ───────────────────────
  if (minimized) {
    return createPortal(
      <button
        onClick={() => { setMinimized(false); setHasNew(false); }}
        className={`fixed bottom-2 md:bottom-10 left-1/2 -translate-x-1/2 z-[100000] flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold text-white shadow-2xl bg-gradient-to-r ${ts.bar} ${(lifeThreat || hasNew) ? "animate-pulse" : ""} ${hasNew ? "ring-4 ring-yellow-300/80" : ""}`}
        style={{ pointerEvents: "auto" }}
        aria-label="Show emergency alert"
      >
        <ShieldAlert className="w-4 h-4" />
        {active.length === 1 ? top.event : `${active.length} active alerts`}
        {hasNew && <span className="inline-flex h-2 w-2 rounded-full bg-yellow-300 ring-2 ring-yellow-100" aria-label="new" />}
        <ChevronUp className="w-4 h-4" />
      </button>,
      document.body,
    );
  }

  const LinkBtn = ({ href, icon, children, strong }: { href: string; icon: ReactNode; children: ReactNode; strong?: boolean }) => (
    <a
      href={href}
      target={href.startsWith("tel:") ? undefined : "_blank"}
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold transition-colors ${strong ? "bg-white text-red-700 hover:bg-red-50" : "bg-black/30 text-white hover:bg-black/50 border border-white/30"}`}
    >
      {icon}{children}
    </a>
  );

  // Docked at the BOTTOM, lifted above the md+ stats bar via bottom padding so it never
  // overlaps it. Slides up on appear (no-op if tailwindcss-animate isn't present).
  return createPortal(
    <div className="fixed bottom-0 left-0 right-0 z-[100000] flex justify-center px-2 pb-2 md:pb-10" style={{ pointerEvents: "none" }}>
      <div
        className={`w-full max-w-3xl rounded-xl border-2 shadow-2xl bg-gradient-to-r ${ts.bar} ${lifeThreat ? "ring-4 ring-red-400/60 animate-pulse" : ""} animate-in fade-in slide-in-from-bottom-4 duration-300`}
        style={{ pointerEvents: "auto" }}
        role="alert"
        aria-live="assertive"
      >
        <div className="p-3 text-white">
          {/* header */}
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-6 h-6 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-base sm:text-lg font-extrabold tracking-tight uppercase">{top.event}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${ts.chip}`}>{ts.label}</span>
                {top.lifeThreatening && <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-white text-red-700">LIFE-THREATENING</span>}
                {active.length > 1 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/30 border border-white/30">+{active.length - 1} more</span>}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-white/90 mt-1">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{top.areaDesc || "your area"}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => setMinimized(true)} className="text-white/70 hover:text-white p-1" aria-label="Tuck away"><ChevronDown className="w-4 h-4" /></button>
              {!top.lifeThreatening && (
                <button onClick={() => setDismissed((s) => new Set(s).add(top.id))} className="text-white/70 hover:text-white p-1" aria-label="Dismiss this alert"><X className="w-4 h-4" /></button>
              )}
            </div>
          </div>

          {/* protective-action instruction (verbatim from NWS) */}
          {(top.instruction || top.headline) && (
            <div className="mt-2 rounded-md bg-black/25 p-2 max-h-24 overflow-y-auto text-xs leading-snug whitespace-pre-line">
              <span className="font-bold">What to do: </span>{top.instruction || top.headline}
            </div>
          )}

          {/* LIVE WEATHER — radar thumbnail + current NWS conditions, fetched on expand */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 w-full flex items-center justify-between rounded-md bg-black/25 px-2 py-1.5 text-xs font-bold hover:bg-black/35 transition-colors"
          >
            <span className="flex items-center gap-1.5"><CloudRain className="w-3.5 h-3.5" /> Live weather &amp; radar</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
          {expanded && (
            <div className="mt-1 rounded-md bg-black/25 p-2 flex gap-3">
              {wx?.radarUrl && (
                <div className="relative shrink-0 rounded overflow-hidden border border-white/20" style={{ width: 120, height: 120 }}>
                  <img src={wx.radarUrl} alt="Radar" width={120} height={120} loading="lazy" decoding="async" className="block bg-slate-900" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-2 h-2 rounded-full bg-white ring-2 ring-red-500" /></div>
                  <div className="absolute bottom-0 inset-x-0 bg-black/50 text-[8px] text-center py-px">Radar · RainViewer</div>
                </div>
              )}
              <div className="flex-1 min-w-0 text-xs">
                {wx?.loading ? (
                  <div className="text-white/70">Loading live weather…</div>
                ) : (wx?.error || wx?.tempF == null) ? (
                  <div className="text-white/70">Live conditions unavailable — use the Local Forecast / Live Radar links below.</div>
                ) : (
                  <div className="space-y-0.5">
                    {wx?.place && <div className="font-semibold truncate">{wx.place}</div>}
                    <div className="flex items-center gap-2">
                      {wx?.icon && <img src={wx.icon} alt="" width={28} height={28} className="rounded" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
                      <span className="text-2xl font-extrabold leading-none">{wx?.tempF != null ? `${wx.tempF}°${wx.tempUnit || "F"}` : "—"}</span>
                    </div>
                    {wx?.shortForecast && <div className="text-white/90">{wx.shortForecast}</div>}
                    {wx?.windSpeed && <div className="flex items-center gap-1 text-white/80"><Wind className="w-3 h-3" />{wx.windSpeed}{wx.windDirection ? ` ${wx.windDirection}` : ""}</div>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* full NWS alert text (verbatim) when expanded */}
          {expanded && top.description && (
            <div className="mt-1 rounded-md bg-black/25 p-2 max-h-40 overflow-y-auto text-[11px] leading-snug whitespace-pre-line text-white/90">
              {top.description}
            </div>
          )}

          {/* links */}
          <div className="flex flex-wrap gap-2 mt-2">
            <LinkBtn href="tel:911" icon={<Phone className="w-3.5 h-3.5" />} strong>Call 911</LinkBtn>
            <button
              onClick={() => {
                const setLayer = (window as unknown as { __crep_setLayer?: (id: string, on?: boolean) => unknown }).__crep_setLayer;
                try { setLayer?.("weatherRadar", true); } catch { /* */ }
              }}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold transition-colors bg-cyan-600 text-white hover:bg-cyan-500 border border-cyan-300"
              aria-label="Turn on the live weather radar on the map"
            >
              <Radio className="w-3.5 h-3.5" />Live Radar
            </button>
            {topLoc && <LinkBtn href={forecastUrl(topLoc)} icon={<CloudRain className="w-3.5 h-3.5" />}>Local Forecast</LinkBtn>}
            {top.web && <LinkBtn href={top.web} icon={<ExternalLink className="w-3.5 h-3.5" />}>Full Alert</LinkBtn>}
            <LinkBtn href={prepUrl(top.event)} icon={<ShieldAlert className="w-3.5 h-3.5" />}>What to do</LinkBtn>
            <LinkBtn href={ALL_ALERTS_URL} icon={<ExternalLink className="w-3.5 h-3.5" />}>All Alerts</LinkBtn>
          </div>

          {/* footer / trust line */}
          <div className="flex items-center justify-between gap-2 mt-2 text-[10px] text-white/80">
            <span className="flex items-center gap-1">
              {top._source === "gps" ? <Navigation className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
              {top._source === "gps" ? "Your location" : "Map area"} · Source: NWS{updatedAgo != null ? ` · updated ${updatedAgo < 90 ? `${updatedAgo}s` : `${Math.round(updatedAgo / 60)}m`} ago` : ""}
            </span>
            {(() => { const c = fmtCountdown(top.expires || top.ends); return c ? <span>Expires in {c}</span> : null; })()}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
