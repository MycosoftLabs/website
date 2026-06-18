"use client";

/**
 * Emergency Alert Overlay — GPS-geofenced life-safety warnings for the Earth Simulator.
 *
 * When a user is physically inside an active NWS warning area (tornado, flash flood,
 * severe thunderstorm, etc.) this surfaces an unmissable banner with the official
 * protective-action instruction plus direct links to 911, live radar, the local
 * forecast, all nearby alerts, and preparedness info. Data is the authoritative
 * National Weather Service point query (`/api/crep/emergency-alerts`).
 *
 * Location: prefers the browser GPS ("YOUR LOCATION"); if GPS is denied/unavailable
 * it falls back to the current map center ("MAP AREA") so anyone *looking at* a
 * disaster zone still sees the warning.
 *
 * FAIL-SAFE: it never shows a green "all clear". A verified location with no alerts
 * shows nothing; a location it could NOT verify (network/NWS error) shows an amber
 * "couldn't verify — here are direct links" bar instead of implying safety.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle, Radio, CloudRain, Phone, ExternalLink, MapPin, X, ChevronUp, ShieldAlert, Navigation,
} from "lucide-react";

type Tier = "warning" | "watch" | "advisory" | "statement";

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
}

type LatLng = { lat: number; lng: number };
type LocSource = "gps" | "map";
type Status = "pending" | "ok" | "unsupported" | "error";

const POLL_MS = 45_000;

function radarUrl(p: LatLng) { return `https://www.windy.com/?radar,${p.lat.toFixed(3)},${p.lng.toFixed(3)},8`; }
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
  statement: { bar: "from-sky-700 to-sky-600 border-sky-300", chip: "bg-sky-950 text-sky-100 border-sky-400", label: "INFO" },
};

export default function EmergencyAlertOverlay() {
  const [gps, setGps] = useState<LatLng | null>(null);
  const [gpsState, setGpsState] = useState<"pending" | "granted" | "denied" | "unavailable">("pending");
  const [mapCenter, setMapCenter] = useState<LatLng | null>(null);
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [status, setStatus] = useState<Status>("pending");
  const [lastChecked, setLastChecked] = useState<number>(0);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [minimized, setMinimized] = useState(false);
  const [, force] = useState(0); // re-render for countdown ticking
  const announced = useRef<Set<string>>(new Set());

  const loc = gps ?? mapCenter;
  const locSource: LocSource | null = gps ? "gps" : mapCenter ? "map" : null;
  const locKey = loc ? `${loc.lat.toFixed(2)},${loc.lng.toFixed(2)}` : null;

  // ── GPS (preferred) ──────────────────────────────────────────────────────
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

  // ── Map-center fallback (only when GPS is unavailable) ───────────────────
  useEffect(() => {
    if (gps) return;
    const read = () => {
      try {
        const m = (window as unknown as { __crep_map?: any }).__crep_map;
        const c = m?.getCenter?.();
        if (c && Number.isFinite(c.lat) && Number.isFinite(c.lng)) setMapCenter({ lat: c.lat, lng: c.lng });
      } catch { /* */ }
    };
    read();
    const iv = window.setInterval(read, 20_000);
    let m: any;
    try { m = (window as unknown as { __crep_map?: any }).__crep_map; m?.on?.("moveend", read); } catch { /* */ }
    return () => { window.clearInterval(iv); try { m?.off?.("moveend", read); } catch { /* */ } };
  }, [gps]);

  // ── Poll NWS for the active location ─────────────────────────────────────
  useEffect(() => {
    if (!loc || !locKey) return;
    let cancelled = false;
    const check = async () => {
      try {
        const r = await fetch(`/api/crep/emergency-alerts?lat=${loc.lat.toFixed(4)}&lng=${loc.lng.toFixed(4)}`, { cache: "no-store" });
        const d = await r.json().catch(() => null);
        if (cancelled) return;
        if (d && d.ok) {
          setAlerts(Array.isArray(d.alerts) ? d.alerts : []);
          setStatus(d.supported === false ? "unsupported" : "ok");
        } else {
          setAlerts([]);
          setStatus("error");
        }
        setLastChecked(Date.now());
      } catch {
        if (!cancelled) { setStatus("error"); setLastChecked(Date.now()); }
      }
    };
    check();
    const iv = window.setInterval(check, POLL_MS);
    return () => { cancelled = true; window.clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locKey]);

  // ── Tick once a minute so the countdown stays fresh ──────────────────────
  useEffect(() => {
    const iv = window.setInterval(() => force((n) => n + 1), 60_000);
    return () => window.clearInterval(iv);
  }, []);

  const active = alerts.filter((a) => !dismissed.has(a.id));
  const lifeThreat = active.some((a) => a.lifeThreatening) || active.some((a) => a.tier === "warning");

  // ── Audible cue once per new life-threatening alert (best-effort) ────────
  useEffect(() => {
    const fresh = active.filter((a) => (a.lifeThreatening || a.tier === "warning") && !announced.current.has(a.id));
    if (fresh.length === 0) return;
    fresh.forEach((a) => announced.current.add(a.id));
    setMinimized(false);
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

  if (typeof document === "undefined") return null;

  const showError = status === "error" && active.length === 0;
  if (active.length === 0 && !showError) return null; // verified clear OR still pending → render nothing

  const top = active[0];
  const ts = top ? TIER_STYLE[top.tier] : TIER_STYLE.warning;
  const updatedAgo = lastChecked ? Math.max(0, Math.round((Date.now() - lastChecked) / 1000)) : null;

  // ── Minimized pill ───────────────────────────────────────────────────────
  if (minimized && active.length > 0) {
    return createPortal(
      <button
        onClick={() => setMinimized(false)}
        className={`fixed top-3 left-1/2 -translate-x-1/2 z-[100000] flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold text-white shadow-2xl bg-gradient-to-r ${ts.bar} ${lifeThreat ? "animate-pulse" : ""}`}
        style={{ pointerEvents: "auto" }}
      >
        <ShieldAlert className="w-4 h-4" />
        {active.length === 1 ? top.event : `${active.length} active alerts`}
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

  return createPortal(
    <div className="fixed top-0 left-0 right-0 z-[100000] flex justify-center px-2 pt-2" style={{ pointerEvents: "none" }}>
      <div
        className={`w-full max-w-3xl rounded-xl border-2 shadow-2xl bg-gradient-to-r ${showError ? "from-amber-700 to-amber-600 border-amber-300" : ts.bar} ${lifeThreat ? "ring-4 ring-red-400/60 animate-pulse" : ""}`}
        style={{ pointerEvents: "auto" }}
        role="alert"
        aria-live="assertive"
      >
        {showError ? (
          <div className="p-3 text-white">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold text-sm">Couldn't verify local emergency alerts</div>
                <div className="text-xs text-white/90 mt-0.5">The alert service is unreachable right now. Do not assume you are clear — use these official sources directly:</div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <LinkBtn href="tel:911" icon={<Phone className="w-3.5 h-3.5" />} strong>Call 911</LinkBtn>
                  {loc && <LinkBtn href={radarUrl(loc)} icon={<Radio className="w-3.5 h-3.5" />}>Live Radar</LinkBtn>}
                  {loc && <LinkBtn href={forecastUrl(loc)} icon={<CloudRain className="w-3.5 h-3.5" />}>Local Forecast</LinkBtn>}
                  <LinkBtn href={ALL_ALERTS_URL} icon={<ExternalLink className="w-3.5 h-3.5" />}>All NWS Alerts</LinkBtn>
                </div>
              </div>
              <button onClick={() => setMinimized(true)} className="text-white/70 hover:text-white" aria-label="Minimize"><X className="w-4 h-4" /></button>
            </div>
          </div>
        ) : (
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
                <button onClick={() => setMinimized(true)} className="text-white/70 hover:text-white p-1" aria-label="Minimize"><ChevronUp className="w-4 h-4" /></button>
                {!top.lifeThreatening && (
                  <button onClick={() => setDismissed((s) => new Set(s).add(top.id))} className="text-white/70 hover:text-white p-1" aria-label="Dismiss this alert"><X className="w-4 h-4" /></button>
                )}
              </div>
            </div>

            {/* protective-action instruction (verbatim from NWS) */}
            {(top.instruction || top.headline) && (
              <div className="mt-2 rounded-md bg-black/25 p-2 max-h-28 overflow-y-auto text-xs leading-snug whitespace-pre-line">
                <span className="font-bold">What to do: </span>{top.instruction || top.headline}
              </div>
            )}

            {/* links */}
            <div className="flex flex-wrap gap-2 mt-2">
              <LinkBtn href="tel:911" icon={<Phone className="w-3.5 h-3.5" />} strong>Call 911</LinkBtn>
              {loc && <LinkBtn href={radarUrl(loc)} icon={<Radio className="w-3.5 h-3.5" />}>Live Radar</LinkBtn>}
              {loc && <LinkBtn href={forecastUrl(loc)} icon={<CloudRain className="w-3.5 h-3.5" />}>Local Forecast</LinkBtn>}
              {top.web && <LinkBtn href={top.web} icon={<ExternalLink className="w-3.5 h-3.5" />}>Full Alert</LinkBtn>}
              <LinkBtn href={prepUrl(top.event)} icon={<ShieldAlert className="w-3.5 h-3.5" />}>What to do</LinkBtn>
              <LinkBtn href={ALL_ALERTS_URL} icon={<ExternalLink className="w-3.5 h-3.5" />}>All Alerts</LinkBtn>
            </div>

            {/* footer / trust line */}
            <div className="flex items-center justify-between gap-2 mt-2 text-[10px] text-white/80">
              <span className="flex items-center gap-1">
                {locSource === "gps" ? <Navigation className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                {locSource === "gps" ? "Your location" : "Map area"} · Source: NWS{updatedAgo != null ? ` · updated ${updatedAgo < 90 ? `${updatedAgo}s` : `${Math.round(updatedAgo / 60)}m`} ago` : ""}
              </span>
              {(() => { const c = fmtCountdown(top.expires || top.ends); return c ? <span>Expires in {c}</span> : null; })()}
            </div>

            {/* gps-denied nudge: we fell back to map area, offer to enable precise location */}
            {locSource === "map" && (gpsState === "denied" || gpsState === "unavailable") && (
              <div className="mt-1 text-[10px] text-white/70">
                Showing alerts for the map area. Enable location access for warnings at your exact position.
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
