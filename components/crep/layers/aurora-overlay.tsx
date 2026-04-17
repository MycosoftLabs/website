"use client";

/**
 * Aurora Forecast Overlay — NOAA SWPC aurora probability map
 *
 * Renders the NOAA aurora forecast image as a MapLibre ImageSource
 * overlay at the correct polar geographic bounds. Semi-transparent,
 * toggleable. Refreshes every 30 minutes.
 */

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

interface AuroraOverlayProps {
  map: MapLibreMap | null;
  enabled?: boolean;
  opacity?: number;
}

const AURORA_SOURCE_N = "crep-aurora-north";
const AURORA_LAYER_N = "crep-aurora-north-layer";
const AURORA_SOURCE_S = "crep-aurora-south";
const AURORA_LAYER_S = "crep-aurora-south-layer";

// Aurora images cover approximately 40-90° latitude
const BOUNDS_NORTH: [number, number, number, number] = [-180, 40, 180, 90]; // [west, south, east, north]
const BOUNDS_SOUTH: [number, number, number, number] = [-180, -90, 180, -40];

const REFRESH_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Convert a base64 data URI to a blob: URL.
 *
 * MapLibre's ajax loader (type: "image" source) can't fetch data: URIs — it
 * calls fetch(url) which throws AJAXError for very long base64 strings.
 * Blob URLs are plain `blob:...` references that MapLibre fetches cleanly.
 *
 * Returns the blob URL string. Caller is responsible for revoking it via
 * URL.revokeObjectURL() when the source is removed to avoid memory leaks.
 */
function dataUriToBlobUrl(dataUri: string): string | null {
  try {
    if (!dataUri.startsWith("data:")) return dataUri; // already a URL, pass through
    const [prefix, b64] = dataUri.split(",");
    const mimeMatch = /data:([^;,]+)/.exec(prefix);
    const mime = mimeMatch?.[1] || "image/jpeg";
    const bin = atob(b64);
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.warn("[CREP/Aurora] data URI → blob conversion failed:", e);
    return null;
  }
}

export default function AuroraOverlay({ map, enabled = false, opacity = 0.5 }: AuroraOverlayProps) {
  const [auroraData, setAuroraData] = useState<{
    northernHemisphere?: string;
    southernHemisphere?: string;
  } | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const addedRef = useRef(false);
  // Track blob URLs we created so we can revoke them on cleanup / refresh
  const blobUrlsRef = useRef<string[]>([]);
  const revokeBlobUrls = () => {
    for (const u of blobUrlsRef.current) {
      try { URL.revokeObjectURL(u); } catch {}
    }
    blobUrlsRef.current = [];
  };

  // Fetch aurora data
  useEffect(() => {
    if (!enabled) return;

    const fetchAurora = async () => {
      try {
        const res = await fetch("/api/oei/space-weather/aurora", {
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) return;
        const data = await res.json();
        setAuroraData(data.aurora || null);
      } catch (e) {
        console.warn("[CREP/Aurora] Failed to fetch aurora data:", e);
      }
    };

    fetchAurora();
    intervalRef.current = setInterval(fetchAurora, REFRESH_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      revokeBlobUrls();
    };
  }, [enabled]);

  // Render to MapLibre
  useEffect(() => {
    if (!map || !enabled || !auroraData) {
      // Remove if disabled
      if (map && addedRef.current) {
        for (const [layer, source] of [
          [AURORA_LAYER_N, AURORA_SOURCE_N],
          [AURORA_LAYER_S, AURORA_SOURCE_S],
        ]) {
          if (map.getLayer(layer)) try { map.removeLayer(layer); } catch {}
          if (map.getSource(source)) try { map.removeSource(source); } catch {}
        }
        addedRef.current = false;
        revokeBlobUrls(); // free object URL memory
      }
      return;
    }

    const addOverlays = () => {
      // Convert any data: URIs to blob: URLs — MapLibre's AJAX loader
      // cannot fetch data: URIs and throws AJAXError on very long base64.
      const northUrl = auroraData.northernHemisphere
        ? dataUriToBlobUrl(auroraData.northernHemisphere)
        : null;
      const southUrl = auroraData.southernHemisphere
        ? dataUriToBlobUrl(auroraData.southernHemisphere)
        : null;
      // Release any previously-created blob URLs before replacing
      revokeBlobUrls();

      // Northern hemisphere
      if (northUrl) {
        blobUrlsRef.current.push(northUrl);
        if (!map.getSource(AURORA_SOURCE_N)) {
          map.addSource(AURORA_SOURCE_N, {
            type: "image",
            url: northUrl,
            coordinates: [
              [BOUNDS_NORTH[0], BOUNDS_NORTH[3]], // top-left
              [BOUNDS_NORTH[2], BOUNDS_NORTH[3]], // top-right
              [BOUNDS_NORTH[2], BOUNDS_NORTH[1]], // bottom-right
              [BOUNDS_NORTH[0], BOUNDS_NORTH[1]], // bottom-left
            ],
          });
        } else {
          try { (map.getSource(AURORA_SOURCE_N) as any).updateImage?.({ url: northUrl }); } catch {}
        }
        if (!map.getLayer(AURORA_LAYER_N)) {
          map.addLayer({
            id: AURORA_LAYER_N,
            type: "raster",
            source: AURORA_SOURCE_N,
            paint: {
              "raster-opacity": opacity,
              "raster-fade-duration": 500,
            },
          });
        }
      }

      // Southern hemisphere
      if (southUrl) {
        blobUrlsRef.current.push(southUrl);
        if (!map.getSource(AURORA_SOURCE_S)) {
          map.addSource(AURORA_SOURCE_S, {
            type: "image",
            url: southUrl,
            coordinates: [
              [BOUNDS_SOUTH[0], BOUNDS_SOUTH[3]], // top-left
              [BOUNDS_SOUTH[2], BOUNDS_SOUTH[3]], // top-right
              [BOUNDS_SOUTH[2], BOUNDS_SOUTH[1]], // bottom-right
              [BOUNDS_SOUTH[0], BOUNDS_SOUTH[1]], // bottom-left
            ],
          });
        } else {
          try { (map.getSource(AURORA_SOURCE_S) as any).updateImage?.({ url: southUrl }); } catch {}
        }
        if (!map.getLayer(AURORA_LAYER_S)) {
          map.addLayer({
            id: AURORA_LAYER_S,
            type: "raster",
            source: AURORA_SOURCE_S,
            paint: {
              "raster-opacity": opacity,
              "raster-fade-duration": 500,
            },
          });
        }
      }

      addedRef.current = true;
    };

    if (map.isStyleLoaded()) {
      addOverlays();
    } else {
      map.once("style.load", addOverlays);
    }

    return () => {
      if (map && addedRef.current) {
        for (const [layer, source] of [
          [AURORA_LAYER_N, AURORA_SOURCE_N],
          [AURORA_LAYER_S, AURORA_SOURCE_S],
        ]) {
          if (map.getLayer(layer)) try { map.removeLayer(layer); } catch {}
          if (map.getSource(source)) try { map.removeSource(source); } catch {}
        }
        addedRef.current = false;
      }
    };
  }, [map, enabled, auroraData, opacity]);

  // Update opacity
  useEffect(() => {
    if (!map || !addedRef.current) return;
    for (const layerId of [AURORA_LAYER_N, AURORA_LAYER_S]) {
      if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, "raster-opacity", opacity);
      }
    }
  }, [map, opacity]);

  return null;
}
