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
  // Track blob URLs we created so we can revoke them later — but only after
  // MapLibre has finished loading them. Eager revocation was causing
  // AJAXError: Failed to fetch (0): blob:... because MapLibre was still
  // mid-fetch when we freed the blob.
  const blobUrlsRef = useRef<string[]>([]);
  const scheduleRevoke = (url: string, delayMs = 10_000) => {
    if (!url) return;
    // Give MapLibre ample time to finish its internal image-source load
    // before we free the underlying blob. 10s is a conservative upper
    // bound for even slow cold loads.
    setTimeout(() => { try { URL.revokeObjectURL(url); } catch {} }, delayMs);
  };
  const revokeAllBlobUrls = () => {
    // Used only on unmount / disable — MapLibre source is already gone so
    // immediate revoke is safe here.
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
      revokeAllBlobUrls();
    };
  }, [enabled]);

  // Render to MapLibre
  useEffect(() => {
    if (!map || !enabled || !auroraData) {
      // Remove if disabled. Apr 20, 2026 (Morgan: TypeError: Cannot read
      // properties of undefined (reading 'getLayer')). Add an extra
      // function-shape guard so an HMR hot-reload that hands us a torn-
      // down map (object exists but methods are gone) doesn't crash.
      if (map && typeof map.getLayer === "function" && addedRef.current) {
        for (const [layer, source] of [
          [AURORA_LAYER_N, AURORA_SOURCE_N],
          [AURORA_LAYER_S, AURORA_SOURCE_S],
        ]) {
          try { if (map.getLayer(layer)) map.removeLayer(layer); } catch {}
          try { if (map.getSource(source)) map.removeSource(source); } catch {}
        }
        addedRef.current = false;
        revokeAllBlobUrls(); // source is gone, immediate revoke is safe
      }
      return;
    }

    let cancelled = false;

    const addOverlays = () => {
      if (cancelled) return;
      // Convert any data: URIs to blob: URLs — MapLibre's AJAX loader
      // cannot fetch data: URIs and throws AJAXError on very long base64.
      const northUrl = auroraData.northernHemisphere
        ? dataUriToBlobUrl(auroraData.northernHemisphere)
        : null;
      const southUrl = auroraData.southernHemisphere
        ? dataUriToBlobUrl(auroraData.southernHemisphere)
        : null;

      // Capture OLD URLs for delayed revoke AFTER the new source is using
      // the new URL. We do not revoke eagerly — MapLibre still fetches
      // the blob asynchronously and eager revoke was causing AJAXError.
      const prevUrls = [...blobUrlsRef.current];
      blobUrlsRef.current = [];

      // Northern hemisphere
      if (northUrl) {
        blobUrlsRef.current.push(northUrl);
        try {
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
        } catch (e) {
          console.warn("[CREP/Aurora] north source setup failed:", e);
        }
      }

      // Southern hemisphere
      if (southUrl) {
        blobUrlsRef.current.push(southUrl);
        try {
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
        } catch (e) {
          console.warn("[CREP/Aurora] south source setup failed:", e);
        }
      }

      // Revoke the PREVIOUS generation of blob URLs on a delay — MapLibre
      // should have finished swapping to the new URL by then.
      for (const u of prevUrls) scheduleRevoke(u, 10_000);

      addedRef.current = true;
    };

    if (map.isStyleLoaded()) {
      addOverlays();
    } else {
      map.once("style.load", addOverlays);
    }

    return () => {
      cancelled = true;
      // Same guard as the disable path above — torn-down maps lose
      // their method bindings.
      if (map && typeof map.getLayer === "function" && addedRef.current) {
        for (const [layer, source] of [
          [AURORA_LAYER_N, AURORA_SOURCE_N],
          [AURORA_LAYER_S, AURORA_SOURCE_S],
        ]) {
          try { if (map.getLayer(layer)) map.removeLayer(layer); } catch {}
          try { if (map.getSource(source)) map.removeSource(source); } catch {}
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
