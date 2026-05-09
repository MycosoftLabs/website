import { NextRequest, NextResponse } from "next/server";
import { inaturalistClient } from "@/lib/inaturalist-client";
import { TtlCache, roundedNumber } from "@/lib/server/ttl-cache";

/**
 * iNaturalist API Proxy
 * 
 * Fetches organism observations from iNaturalist API.
 * Focuses on fungal/mushroom observations for mycelium mapping.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 5 * 60_000;
const RESPONSE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
};
const cache = new TtlCache<unknown>(512, CACHE_TTL_MS);

function cacheKey(parts: Record<string, unknown>) {
  return Object.entries(parts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${typeof value === "number" ? roundedNumber(value, 3) : String(value ?? "")}`)
    .join("|");
}

function observationCoordinates(obs: any): { latitude: number | null; longitude: number | null } {
  const geo = obs.geojson?.coordinates;
  if (Array.isArray(geo) && geo.length >= 2) {
    const longitude = Number(geo[0]);
    const latitude = Number(geo[1]);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  }

  if (typeof obs.location === "string") {
    const [latRaw, lngRaw] = obs.location.split(",");
    const latitude = Number(latRaw);
    const longitude = Number(lngRaw);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  }

  const latitude = Number(obs.latitude ?? obs.lat);
  const longitude = Number(obs.longitude ?? obs.lng);
  return {
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
  };
}

function serializeObservation(obs: any) {
  const { latitude, longitude } = observationCoordinates(obs);
  const taxonName = obs.taxon?.name || obs.species_guess || "Unknown";
  const commonName = obs.species_guess || obs.taxon?.preferred_common_name || taxonName;

  return {
    id: obs.id,
    observed_on: obs.observed_on,
    latitude,
    longitude,
    species: commonName,
    scientificName: taxonName,
    taxon_id: obs.taxon_id || obs.taxon?.id,
    taxon: obs.taxon,
    photos: obs.photos?.map((p: any) => ({
      id: p.id,
      url: p.medium_url || p.url,
      license: p.license_code,
    })),
    quality_grade: obs.quality_grade,
    user: obs.user?.login,
    source: "iNaturalist",
    sourceUrl: obs.uri || (obs.id ? `https://www.inaturalist.org/observations/${obs.id}` : undefined),
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const action = searchParams.get("action") || "search";
  const lat = parseFloat(searchParams.get("lat") || "0");
  const lng = parseFloat(searchParams.get("lng") || "0");
  const radius = parseFloat(searchParams.get("radius") || "1000"); // meters
  const nelat = parseFloat(searchParams.get("nelat") || "0");
  const nelng = parseFloat(searchParams.get("nelng") || "0");
  const swlat = parseFloat(searchParams.get("swlat") || "0");
  const swlng = parseFloat(searchParams.get("swlng") || "0");
  const taxonId = searchParams.get("taxon_id") ? parseInt(searchParams.get("taxon_id")!) : undefined;
  const observedOn = searchParams.get("observed_on") || undefined;
  const perPage = parseInt(searchParams.get("per_page") || "200");
  const key = cacheKey({ action, lat, lng, radius, nelat, nelng, swlat, swlng, taxonId, observedOn, perPage });
  const cached = cache.get(key);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { ...RESPONSE_HEADERS, "X-Earth-Simulator-Cache": "hit" },
    });
  }

  try {
    let observations;

    switch (action) {
      case "fungi":
        // Get fungal observations (Kingdom Fungi = 47170)
        observations = await inaturalistClient.getFungalObservations({
          lat,
          lng,
          radius,
          observed_on: observedOn,
          per_page: perPage,
        });
        break;

      case "bounds":
        // Get observations in bounding box
        observations = await inaturalistClient.getObservationsInBounds({
          nelat,
          nelng,
          swlat,
          swlng,
          taxon_id: taxonId || 47170, // Default to fungi
          observed_on: observedOn,
          per_page: perPage,
        });
        break;

      case "search":
      default:
        // General search
        const response = await inaturalistClient.searchObservations({
          lat,
          lng,
          radius,
          taxon_id: taxonId,
          quality_grade: "research",
          observed_on: observedOn,
          per_page: perPage,
        });
        observations = response.results || [];
        break;
    }

    const payload = {
      success: true,
      action,
      observations: observations.map(serializeObservation),
      count: observations.length,
    };
    cache.set(key, payload);
    return NextResponse.json(payload, {
      headers: { ...RESPONSE_HEADERS, "X-Earth-Simulator-Cache": "miss" },
    });
  } catch (error) {
    console.error("iNaturalist API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, params } = body;

    let observations;
    const key = cacheKey({ method: "POST", action, params: JSON.stringify(params ?? {}) });
    const cached = cache.get(key);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { ...RESPONSE_HEADERS, "X-Earth-Simulator-Cache": "hit" },
      });
    }

    switch (action) {
      case "fungi":
        observations = await inaturalistClient.getFungalObservations({
          lat: params.lat,
          lng: params.lng,
          radius: params.radius || 1000,
          observed_on: params.observed_on,
          per_page: params.per_page || 200,
        });
        break;

      case "bounds":
        observations = await inaturalistClient.getObservationsInBounds({
          nelat: params.nelat,
          nelng: params.nelng,
          swlat: params.swlat,
          swlng: params.swlng,
          taxon_id: params.taxon_id || 47170,
          observed_on: params.observed_on,
          per_page: params.per_page || 200,
        });
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    const payload = {
      success: true,
      action,
      observations: observations.map(serializeObservation),
      count: observations.length,
    };
    cache.set(key, payload);
    return NextResponse.json(payload, {
      headers: { ...RESPONSE_HEADERS, "X-Earth-Simulator-Cache": "miss" },
    });
  } catch (error) {
    console.error("iNaturalist API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
