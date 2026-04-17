/**
 * OEI EONET Connector – NASA Earth Observatory Natural Event Tracker
 *
 * Fetches fires, volcanoes, storms, floods, and other natural events
 * for CREP intelligence layers. Part of Shadowbroker / EO imagery expansion.
 *
 * GET /api/oei/eonet
 * Query params:
 * - limit: max events (default 2000, max 5000) — covers full active global set
 * - status: "open" | "closed" (default open)
 * - category: wildfires, volcanoes, severeStorms, floods, etc.
 *
 * NOTE (Apr 2026): limits bumped from 100→2000 default, 300→5000 max so the
 * Army-proposal event coverage is complete (NASA EONET currently tracks
 * ~1,500 active events globally, no reason to cap smaller than that).
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const EONET_BASE = "https://eonet.gsfc.nasa.gov/api/v3";

export interface EONETEvent {
  id: string;
  type: "fire" | "crisis" | "earthquake" | "weather" | "volcano" | "other";
  title: string;
  description: string;
  category: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  timestamp: string;
  location: { latitude: number; longitude: number; name?: string };
  source: string;
  sourceUrl?: string;
  link?: string;
}

function mapEONETCategoryToType(category: string): EONETEvent["type"] {
  if (category === "wildfires") return "fire";
  if (
    ["volcanoes", "severeStorms", "floods", "landslides", "drought", "dustHaze"].includes(category)
  )
    return "crisis";
  if (category === "earthquakes") return "earthquake";
  if (["seaLakeIce", "manmade", "snow", "tempExtremes"].includes(category)) return "weather";
  return "other";
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(parseInt(searchParams.get("limit") || "2000"), 5000);
  const status = searchParams.get("status") || "open";
  const category = searchParams.get("category");

  let url = `${EONET_BASE}/events?status=${status}&limit=${limit}`;
  if (category) url += `&category=${encodeURIComponent(category)}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`EONET API error: ${res.status}`);

    const data = (await res.json()) as {
      events: Array<{
        id: string;
        title: string;
        description?: string;
        categories: Array<{ id: string; title: string }>;
        geometry: Array<{ date: string; coordinates: [number, number] }>;
        link?: string;
      }>;
    };

    const events: EONETEvent[] = data.events.map((ev) => {
      const cat = ev.categories[0]?.id || "other";
      const geom = ev.geometry[0];
      const coords = geom?.coordinates ?? [0, 0];

      return {
        id: `eonet-${ev.id}`,
        type: mapEONETCategoryToType(cat),
        title: ev.title,
        description: ev.description || `Active ${cat} event tracked by NASA EONET.`,
        category: cat,
        severity: "medium" as const,
        timestamp: new Date(geom?.date || Date.now()).toISOString(),
        location: {
          latitude: coords[1],
          longitude: coords[0],
          name: ev.title,
        },
        source: "NASA EONET",
        sourceUrl: "https://eonet.gsfc.nasa.gov",
        link: ev.link,
      };
    });

    return NextResponse.json({
      events,
      total: events.length,
      source: "NASA EONET",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[OEI EONET] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch EONET data",
        details: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
