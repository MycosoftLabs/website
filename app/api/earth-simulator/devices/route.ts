import { NextResponse } from "next/server";
import { KNOWN_DEVICE_CATALOG } from "@/lib/devices/catalog";

/**
 * Device Locations API
 *
 * Merges (1) live MycoBrain-attached devices with (2) the known device-type catalog
 * so Earth Simulator and other UIs can show the full Mycosoft roster before units phone home.
 */

interface EarthSimDeviceRow {
  id: string
  name: string
  type?: string
  role?: string
  page_href?: string
  firmware_repo?: string | null
  source: "live" | "catalog"
  port?: string | number | null
  status?: string
  location: { lat: number; lon: number } | null
  lastSeen?: string | null
  telemetry?: unknown
}

export async function GET() {
  try {
    const mycobrainUrl =
      process.env.MYCOBRAIN_SERVICE_URL ||
      process.env.MYCOBRAIN_API_URL ||
      "http://localhost:8003";

    const byId = new Map<string, EarthSimDeviceRow>();

    for (const entry of KNOWN_DEVICE_CATALOG) {
      byId.set(entry.id, {
        id: entry.id,
        name: entry.name,
        type: entry.type,
        role: entry.role,
        page_href: entry.page_href,
        firmware_repo: entry.firmware_repo,
        status: entry.status,
        location: entry.default_location,
        lastSeen: null,
        telemetry: null,
        source: "catalog",
      });
    }

    try {
      const response = await fetch(`${mycobrainUrl}/devices`, { cache: "no-store" });
      if (response.ok) {
        const data = (await response.json()) as { devices?: Record<string, unknown>[] };
        const live = data.devices || [];
        for (const device of live) {
          const d = device as Record<string, unknown>;
          const id = String(d.device_id ?? d.id ?? "");
          if (!id) continue;
          const location = (d.location as { lat?: number; lon?: number } | null) || null;
          const normalized =
            location && typeof location.lat === "number" && typeof location.lon === "number"
              ? { lat: location.lat, lon: location.lon }
              : null;
          byId.set(id, {
            id,
            name: String(d.name ?? d.device_id ?? id),
            port: (d.port as string | number | undefined) ?? null,
            status: d.status as string | undefined,
            location: normalized,
            lastSeen: (d.last_seen as string | undefined) ?? (d.lastSeen as string | undefined) ?? null,
            telemetry: d.telemetry ?? null,
            source: "live",
          });
        }
      }
    } catch (error) {
      console.error("Error fetching MycoBrain devices:", error);
    }

    const devices = Array.from(byId.values());

    return NextResponse.json({
      success: true,
      devices,
      count: devices.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Devices API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
