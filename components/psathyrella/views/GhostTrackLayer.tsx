"use client";

/**
 * GhostTrackLayer — dead-reckoned predicted track for the comms-denied case.
 * ==========================================================================
 * When the buoy is DELAYED/DARK (contactState !== "live"), the operator no longer gets a
 * live pose every poll — only stale fixes. This map layer projects the buoy's LAST-KNOWN
 * pose forward along its heading at its last speed, drawing:
 *   - a dashed "ghost" track line (where the buoy is *probably* going), and
 *   - a growing uncertainty ELLIPSE (a circle that swells with elapsed time-since-contact),
 * so the watch-stander sees the predicted position cone instead of a frozen dot.
 *
 * When contactState === "live" the layer is emptied (the live BuoyLayers dot is authoritative).
 *
 * ISOLATION + FREEZE-SAFETY — built EXACTLY like SensorContactsLayer in MapView.tsx:
 *   - reads the STABLE `telemetryRef` on a hidden-gated timer (NO React re-render, so the
 *     React.memo'd map subtree never reconciles from a telemetry poll → freeze isolation holds),
 *   - all maplibre calls try/caught and added via runWhenStyleReady (idempotent ensure),
 *   - unique `psa-ghost-*` source/layer ids, fully cleaned up on unmount.
 * Mounted inside MapView's <Map> children alongside SensorContactsLayer.
 */

import { useEffect } from "react";
import { useMap } from "@/components/ui/map";
import type { BuoyTelemetry } from "@/lib/psathyrella/contract";
import { runWhenStyleReady } from "@/lib/psathyrella/mapReady";

const EMPTY_FC = { type: "FeatureCollection", features: [] as unknown[] };

// destination point — copy of MapView's destPoint helper (great-circle projection on WGS84 sphere).
function destPoint(lat: number, lon: number, bearingDeg: number, distM: number): [number, number] {
  const R = 6371008.8;
  const d = distM / R;
  const br = (bearingDeg * Math.PI) / 180;
  const la1 = (lat * Math.PI) / 180;
  const lo1 = (lon * Math.PI) / 180;
  const la2 = Math.asin(Math.sin(la1) * Math.cos(d) + Math.cos(la1) * Math.sin(d) * Math.cos(br));
  const lo2 = lo1 + Math.atan2(Math.sin(br) * Math.sin(d) * Math.cos(la1), Math.cos(d) - Math.sin(la1) * Math.sin(la2));
  return [(((lo2 * 180) / Math.PI + 540) % 360) - 180, (la2 * 180) / Math.PI];
}

function ringPolygon(lat: number, lon: number, radiusM: number, steps = 64): number[][] {
  const ring: number[][] = [];
  for (let i = 0; i <= steps; i++) ring.push(destPoint(lat, lon, (i * 360) / steps, radiusM));
  return ring;
}

const KN_TO_MS = 0.514444; // knots → m/s
const PROJECT_S = 300; // dead-reckon 5 minutes ahead
// Uncertainty growth: along-track ≈ speed error, cross-track ≈ drift. We model a single growing
// circle (a simple isotropic ellipse) whose radius scales with time-since-contact + a speed term.
const DRIFT_MS = 0.35; // assumed current/drift uncertainty (~0.7 kn) contributing to the ellipse
const BASE_UNCERT_M = 60; // floor uncertainty (GPS + last-fix age)

function GhostTrackLayerInner({ telemetryRef }: { telemetryRef: { current: BuoyTelemetry } }) {
  const { map } = useMap();

  // sources + layers, once (idempotent ensure, [map]-only)
  useEffect(() => {
    if (!map) return;
    const ensure = () => {
      try {
        if (!map.getSource("psa-ghost-uncert")) {
          map.addSource("psa-ghost-uncert", { type: "geojson", data: EMPTY_FC as any });
          map.addLayer({ id: "psa-ghost-uncert-fill", type: "fill", source: "psa-ghost-uncert", paint: { "fill-color": "#f59e0b", "fill-opacity": 0.08 } });
          map.addLayer({ id: "psa-ghost-uncert-line", type: "line", source: "psa-ghost-uncert", paint: { "line-color": "#f59e0b", "line-width": 1, "line-opacity": 0.4, "line-dasharray": [2, 3] } });
        }
        if (!map.getSource("psa-ghost-track")) {
          map.addSource("psa-ghost-track", { type: "geojson", data: EMPTY_FC as any });
          map.addLayer({ id: "psa-ghost-track-line", type: "line", source: "psa-ghost-track", filter: ["==", ["geometry-type"], "LineString"], paint: { "line-color": "#fbbf24", "line-width": 1.5, "line-opacity": 0.7, "line-dasharray": [3, 2] } });
          map.addLayer({ id: "psa-ghost-track-end", type: "circle", source: "psa-ghost-track", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": 4, "circle-color": "#fbbf24", "circle-opacity": 0.5, "circle-stroke-width": 1, "circle-stroke-color": "#04070e" } });
          map.addLayer({ id: "psa-ghost-track-label", type: "symbol", source: "psa-ghost-track", filter: ["==", ["geometry-type"], "Point"], layout: { "text-field": "DR", "text-size": 9, "text-font": ["Open Sans Bold"], "text-offset": [0, 1.1], "text-anchor": "top", "text-optional": true } as any, paint: { "text-color": "#fbbf24", "text-halo-color": "#04070e", "text-halo-width": 1 } });
        }
      } catch { /* style mid-load */ }
    };
    runWhenStyleReady(map, ensure);
    return () => {
      try {
        ["psa-ghost-uncert-fill", "psa-ghost-uncert-line", "psa-ghost-track-line", "psa-ghost-track-end", "psa-ghost-track-label"].forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });
        ["psa-ghost-uncert", "psa-ghost-track"].forEach((id) => { if (map.getSource(id)) map.removeSource(id); });
      } catch { /* tearing down */ }
    };
  }, [map]);

  // live feed via the stable ref on a timer — NO React re-render, hidden-tab paused, try/caught.
  useEffect(() => {
    if (!map) return;
    let timer: ReturnType<typeof setTimeout> | 0 = 0;
    const paint = () => {
      try {
        const t = telemetryRef.current;
        const trackSrc = map.getSource("psa-ghost-track") as { setData?: (d: any) => void } | undefined;
        const uncertSrc = map.getSource("psa-ghost-uncert") as { setData?: (d: any) => void } | undefined;
        const lat = t?.pose?.lat ?? null;
        const lon = t?.pose?.lon ?? null;
        // Only draw the ghost when the link is degraded AND we have a last-known pose to project from.
        if (!t || t.contactState === "live" || lat == null || lon == null) {
          trackSrc?.setData?.(EMPTY_FC);
          uncertSrc?.setData?.(EMPTY_FC);
          return;
        }
        const heading = t.pose.headingDeg ?? 0;
        const speedKn = t.pose.speedKn ?? 0;
        const speedMs = speedKn * KN_TO_MS;
        const projDist = speedMs * PROJECT_S; // metres dead-reckoned ahead

        // Dashed predicted track from last-known pose to the projected endpoint.
        const [elon, elat] = destPoint(lat, lon, heading, projDist);
        const trackFeatures: any[] = [];
        if (projDist > 1) {
          trackFeatures.push({ type: "Feature", geometry: { type: "LineString", coordinates: [[lon, lat], [elon, elat]] }, properties: {} });
          trackFeatures.push({ type: "Feature", geometry: { type: "Point", coordinates: [elon, elat] }, properties: {} });
        }
        trackSrc?.setData?.({ type: "FeatureCollection", features: trackFeatures });

        // Growing uncertainty ellipse: a circle centred on the projected endpoint whose radius
        // swells with time-since-contact (drift) plus a base GPS/last-fix floor. Larger when DARK.
        const ageS = (t.lastContactMsAgo ?? 0) / 1000;
        const driftR = DRIFT_MS * Math.max(ageS, PROJECT_S);
        const stateMult = t.contactState === "dark" ? 1.6 : 1.0;
        const radiusM = (BASE_UNCERT_M + driftR) * stateMult;
        // Centre on the projected endpoint when moving, else on the last-known pose.
        const cLat = projDist > 1 ? elat : lat;
        const cLon = projDist > 1 ? elon : lon;
        uncertSrc?.setData?.({
          type: "FeatureCollection",
          features: [{ type: "Feature", geometry: { type: "Polygon", coordinates: [ringPolygon(cLat, cLon, radiusM)] }, properties: {} }],
        });
      } catch { /* layer mid-teardown */ }
    };
    const tick = () => { if (!document.hidden) paint(); timer = setTimeout(tick, 1000); };
    paint();
    timer = setTimeout(tick, 1000);
    return () => { if (timer) clearTimeout(timer); };
  }, [map, telemetryRef]);

  return null;
}

export const GhostTrackLayer = GhostTrackLayerInner;
export default GhostTrackLayer;
