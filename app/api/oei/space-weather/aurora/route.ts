import { NextRequest, NextResponse } from "next/server";

const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

let cache: {
  data: Record<string, unknown> | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0,
};

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:image/jpeg;base64,${base64}`;
  } catch {
    return null;
  }
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function parseKpIndex(
  raw: unknown[] | null
): {
  current: number | null;
  forecast3h: number | null;
  history: { time: string; kp: number }[];
} {
  if (!raw || !Array.isArray(raw) || raw.length < 2) {
    return { current: null, forecast3h: null, history: [] };
  }

  // First element is the header row, rest are data rows
  // Format: [time_tag, Kp, a_running, station_count]
  const dataRows = raw.slice(1) as string[][];

  const now = Date.now();
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

  const history: { time: string; kp: number }[] = [];
  let current: number | null = null;
  let forecast3h: number | null = null;

  for (const row of dataRows) {
    if (!row || row.length < 2) continue;
    const timeTag = row[0];
    const kpValue = parseFloat(row[1]);
    if (isNaN(kpValue)) continue;

    const rowTime = new Date(timeTag).getTime();

    if (rowTime >= twentyFourHoursAgo) {
      history.push({ time: timeTag, kp: kpValue });
    }

    if (rowTime <= now) {
      current = kpValue;
    } else if (forecast3h === null) {
      forecast3h = kpValue;
    }
  }

  return { current, forecast3h, history };
}

export async function GET(_request: NextRequest) {
  try {
    // Return cached data if still valid
    if (cache.data && Date.now() - cache.timestamp < CACHE_DURATION_MS) {
      return NextResponse.json({ ...cache.data, cached: true });
    }

    // Fetch all data in parallel
    const [northImage, southImage, ovation, activeRegions, kpRaw] =
      await Promise.all([
        fetchImageAsBase64(
          "https://services.swpc.noaa.gov/images/aurora-forecast-northern-hemisphere.jpg"
        ),
        fetchImageAsBase64(
          "https://services.swpc.noaa.gov/images/aurora-forecast-southern-hemisphere.jpg"
        ),
        fetchJson<unknown[]>(
          "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json"
        ),
        fetchJson<unknown[]>(
          "https://services.swpc.noaa.gov/json/solar_regions.json"
        ),
        fetchJson<unknown[]>(
          "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"
        ),
      ]);

    const kpIndex = parseKpIndex(kpRaw);

    const responseData = {
      aurora: {
        northernHemisphere: northImage,
        southernHemisphere: southImage,
        bounds: {
          north: { north: 90, south: 40, east: 180, west: -180 },
          south: { north: -40, south: -90, east: 180, west: -180 },
        },
      },
      ovation: ovation ?? [],
      activeRegions: activeRegions ?? [],
      kpIndex: {
        current: kpIndex.current,
        forecast3h: kpIndex.forecast3h,
        history: kpIndex.history,
      },
      cached: false,
      timestamp: new Date().toISOString(),
    };

    // Update cache
    cache = {
      data: responseData,
      timestamp: Date.now(),
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Aurora API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch aurora forecast data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
