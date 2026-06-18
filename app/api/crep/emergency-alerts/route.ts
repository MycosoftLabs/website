import { NextRequest, NextResponse } from "next/server";

/**
 * Emergency Alerts — GPS-geofenced, life-safety.
 *
 * Returns the active NWS (National Weather Service) alerts whose warning area
 * actually CONTAINS a given point. NWS does the point-in-polygon server-side
 * (`/alerts/active?point=lat,lng`), so we get only the alerts that genuinely
 * apply to the user's location — tornado / flash-flood / severe-thunderstorm
 * warnings, etc. This is the authoritative US gov source (no API key).
 *
 * FAIL-SAFE CONTRACT: this endpoint must NEVER imply "you are safe" when it
 * cannot verify that. On any upstream error it returns `ok:false` with an empty
 * alert list, and the client is required to surface direct emergency links
 * instead of a green all-clear. A genuinely-checked location with no active
 * alerts returns `ok:true, supported:true, alerts:[]`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NWS_HEADERS = {
  Accept: "application/geo+json",
  // NWS requires a descriptive User-Agent with contact info.
  "User-Agent": "Mycosoft NatureOS Earth Simulator emergency-alerts (https://mycosoft.com, ops@mycosoft.com)",
};

type Tier = "warning" | "watch" | "advisory" | "statement";

interface NormalizedAlert {
  id: string;
  event: string;       // e.g. "Tornado Warning"
  severity: string;    // Extreme | Severe | Moderate | Minor | Unknown
  certainty: string;   // Observed | Likely | Possible | Unlikely | Unknown
  urgency: string;     // Immediate | Expected | Future | Past | Unknown
  category: string;
  headline: string;
  description: string;
  instruction: string; // NWS protective-action text (shown VERBATIM)
  areaDesc: string;
  senderName: string;
  effective: string | null;
  onset: string | null;
  expires: string | null;
  ends: string | null;
  web: string | null;
  messageType: string;
  tier: Tier;
  lifeThreatening: boolean; // urgency Immediate + severity Severe/Extreme
}

function tierOf(event: string): Tier {
  const e = (event || "").toLowerCase();
  if (e.includes("warning") || e.includes("emergency")) return "warning";
  if (e.includes("watch")) return "watch";
  if (e.includes("advisory")) return "advisory";
  return "statement";
}

function parsePoint(sp: URLSearchParams): { lat: number; lng: number } | null {
  const pt = sp.get("point");
  let lat = Number(sp.get("lat"));
  let lng = Number(sp.get("lng"));
  if ((!Number.isFinite(lat) || !Number.isFinite(lng)) && pt) {
    const [a, b] = pt.split(",").map((x) => Number(x.trim()));
    lat = a; lng = b;
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export async function GET(req: NextRequest) {
  const point = parsePoint(req.nextUrl.searchParams);
  if (!point) {
    return NextResponse.json(
      { ok: false, error: "valid lat/lng (or point=lat,lng) required", alerts: [] },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const { lat, lng } = point;

  try {
    const url = `https://api.weather.gov/alerts/active?status=actual&point=${lat.toFixed(4)},${lng.toFixed(4)}`;
    const res = await fetch(url, { headers: NWS_HEADERS, signal: AbortSignal.timeout(6500), cache: "no-store" });

    if (!res.ok) {
      // NWS only covers the US + territories. A 4xx for a point outside that
      // footprint means "no US coverage here", which is NOT a verified all-clear.
      const outOfArea = res.status === 404 || res.status === 400;
      return NextResponse.json(
        {
          ok: outOfArea ? true : false,
          supported: !outOfArea,
          point,
          alerts: [],
          note: outOfArea
            ? "Outside NWS coverage (US & territories only)."
            : `NWS upstream ${res.status}`,
        },
        { status: outOfArea ? 200 : 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    const data = await res.json();
    const features: any[] = Array.isArray(data?.features) ? data.features : [];

    const alerts: NormalizedAlert[] = features.map((f) => {
      const p = f?.properties || {};
      const event = String(p.event || "Alert");
      const severity = String(p.severity || "Unknown");
      const urgency = String(p.urgency || "Unknown");
      const idRaw = p.id || f?.id || `${event}-${p.sent || p.effective || p.areaDesc}`;
      return {
        id: String(idRaw),
        event,
        severity,
        certainty: String(p.certainty || "Unknown"),
        urgency,
        category: String(p.category || ""),
        headline: String(p.headline || ""),
        description: String(p.description || ""),
        instruction: String(p.instruction || ""),
        areaDesc: String(p.areaDesc || ""),
        senderName: String(p.senderName || "National Weather Service"),
        effective: p.effective || null,
        onset: p.onset || null,
        expires: p.expires || null,
        ends: p.ends || null,
        web: typeof p.id === "string" && p.id.startsWith("http") ? p.id : (p["@id"] || null),
        messageType: String(p.messageType || ""),
        tier: tierOf(event),
        lifeThreatening: /immediate/i.test(urgency) && /(severe|extreme)/i.test(severity),
      };
    });

    // Most urgent first: life-threatening, then warnings, watches, advisories.
    const rank = (a: NormalizedAlert) =>
      a.lifeThreatening ? 0 : a.tier === "warning" ? 1 : a.tier === "watch" ? 2 : a.tier === "advisory" ? 3 : 4;
    alerts.sort((a, b) => rank(a) - rank(b));

    return NextResponse.json(
      { ok: true, supported: true, point, count: alerts.length, alerts, lastUpdated: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    // FAIL SAFE: never return a false all-clear. ok:false tells the client to show
    // the direct emergency links so the user can still reach radar/forecast/911.
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "NWS unavailable", point, alerts: [] },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
