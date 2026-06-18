import { NextRequest, NextResponse } from "next/server";

/**
 * Live "weather now" for a point — current NWS conditions (temp, sky, wind), used by the
 * emergency widget to show LIVE weather inline next to an alert. Authoritative NWS
 * (api.weather.gov), no key, User-Agent required. Fail-safe: ok:false on upstream error.
 *
 * NWS flow: /points/{lat},{lng} → properties.forecastHourly (the "now" period) +
 * relativeLocation (nearest city). Cached per rounded point to spare the upstream.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NWS_HEADERS = {
  Accept: "application/geo+json",
  "User-Agent": "Mycosoft NatureOS Earth Simulator weather-now (https://mycosoft.com, ops@mycosoft.com)",
};

const cache = new Map<string, { at: number; body: unknown }>();
const TTL_MS = 5 * 60 * 1000;

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ ok: false, error: "valid lat/lng required" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return NextResponse.json(hit.body, { headers: { "Cache-Control": "public, max-age=120" } });
  }

  try {
    const pRes = await fetch(`https://api.weather.gov/points/${lat.toFixed(4)},${lng.toFixed(4)}`, {
      headers: NWS_HEADERS, signal: AbortSignal.timeout(6000), cache: "no-store",
    });
    if (!pRes.ok) {
      // 404 = outside NWS coverage (US only), not an error.
      return NextResponse.json(
        { ok: pRes.status === 404, supported: pRes.status !== 404, note: pRes.status === 404 ? "Outside NWS coverage (US only)." : `NWS ${pRes.status}` },
        { status: pRes.status === 404 ? 200 : 502, headers: { "Cache-Control": "no-store" } },
      );
    }
    const pd = await pRes.json();
    const props = pd?.properties || {};
    const rel = props?.relativeLocation?.properties;
    const hourlyUrl: string | undefined = props.forecastHourly || props.forecast;

    let cur: any = null;
    if (hourlyUrl) {
      const fRes = await fetch(hourlyUrl, { headers: NWS_HEADERS, signal: AbortSignal.timeout(6000), cache: "no-store" });
      if (fRes.ok) {
        const fd = await fRes.json();
        cur = Array.isArray(fd?.properties?.periods) ? fd.properties.periods[0] : null;
      }
    }

    const body = {
      ok: true,
      supported: true,
      place: rel?.city ? `${rel.city}, ${rel.state}` : null,
      tempF: cur?.temperature ?? null,
      tempUnit: cur?.temperatureUnit ?? "F",
      shortForecast: cur?.shortForecast ?? null,
      windSpeed: cur?.windSpeed ?? null,
      windDirection: cur?.windDirection ?? null,
      icon: cur?.icon ?? null,
      isDaytime: cur?.isDaytime ?? null,
      forecastUrl: props.forecast ?? null,
      updated: new Date().toISOString(),
    };
    cache.set(key, { at: Date.now(), body });
    return NextResponse.json(body, { headers: { "Cache-Control": "public, max-age=120" } });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "NWS unavailable" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
