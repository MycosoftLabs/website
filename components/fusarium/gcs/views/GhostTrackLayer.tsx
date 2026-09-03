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
 * HEADING UNKNOWN is a first-class case, not a default. The buoy has no working heading source
 * today (BMM150 uncalibrated → /magnetometer publishes headingDeg: null), so a track can only be
 * drawn when a heading was actually measured. With no heading we draw NO track and instead show
 * an isotropic REACHABLE-SET ring on the last-known fix, labelled as such — see paint() below.
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
import type { BuoyTelemetry } from "@/lib/fusarium/gcs/contract";
import { runWhenStyleReady } from "@/lib/fusarium/gcs/mapReady";

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
          // Two outlines off one source so the DR cone (heading measured) and the reachable-set
          // ring (heading unknown) never look alike. maplibre's line-dasharray is not data-driven,
          // so the distinction has to be two filtered layers rather than one expression.
          map.addLayer({ id: "psa-ghost-uncert-line", type: "line", source: "psa-ghost-uncert", filter: ["!=", ["get", "kind"], "reachable"], paint: { "line-color": "#f59e0b", "line-width": 1, "line-opacity": 0.4, "line-dasharray": [2, 3] } });
          map.addLayer({ id: "psa-ghost-uncert-reach", type: "line", source: "psa-ghost-uncert", filter: ["==", ["get", "kind"], "reachable"], paint: { "line-color": "#f59e0b", "line-width": 1.5, "line-opacity": 0.6, "line-dasharray": [1, 2] } });
          // An unexplained circle on a chart reads as a measured cone. The polygon carries its own
          // caption so the operator is TOLD the direction is unknown, not left to infer it.
          // text-allow-overlap/ignore-placement: this caption states what is NOT known, so it must
          // never be silently dropped by label collision (BuoyLayers' "Psathyrella" label sits on
          // the same coordinate and declares allow-overlap, so it would win otherwise).
          map.addLayer({ id: "psa-ghost-uncert-label", type: "symbol", source: "psa-ghost-uncert", layout: { "text-field": ["coalesce", ["get", "label"], ""], "text-size": 9, "text-font": ["Open Sans Bold"], "text-anchor": "bottom", "text-offset": [0, -1.6], "text-allow-overlap": true, "text-ignore-placement": true } as any, paint: { "text-color": "#f59e0b", "text-halo-color": "#04070e", "text-halo-width": 1.2 } });
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
        ["psa-ghost-uncert-fill", "psa-ghost-uncert-line", "psa-ghost-uncert-reach", "psa-ghost-uncert-label", "psa-ghost-track-line", "psa-ghost-track-end", "psa-ghost-track-label"].forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });
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
        const speedKn = t.pose.speedKn ?? 0;
        const speedMs = speedKn * KN_TO_MS;
        // Uncertainty growth terms, shared by both branches below: drift swells with
        // time-since-contact over a base GPS/last-fix floor, and everything is larger when DARK.
        const ageS = (t.lastContactMsAgo ?? 0) / 1000;
        const driftR = DRIFT_MS * Math.max(ageS, PROJECT_S);
        const stateMult = t.contactState === "dark" ? 1.6 : 1.0;

        // A heading of 0 is DUE NORTH, not "unknown" — so no `?? 0` here. contract.ts calls
        // pose.headingDeg the single authority for true bearings, and this buoy has no working
        // heading source (BMM150 uncalibrated → headingDeg: null), so defaulting would draw a
        // confident dashed track due north in exactly the comms-denied case this layer exists to
        // serve, with no second source for the watch-stander to check it against.
        // Number.isFinite, not != null, so a NaN from a malformed envelope takes the same branch.
        const hdg = t.pose.headingDeg;
        const heading = typeof hdg === "number" && Number.isFinite(hdg) ? hdg : null;

        if (heading === null) {
          // Direction unknown ⇒ the buoy could be travelling ANY way. The only honest picture is
          // an isotropic reachable-set ring centred on the LAST-KNOWN fix. The radius must absorb
          // the along-track distance too: a drift-only ring (~165 m when DELAYED) would exclude a
          // 3 kn buoy's ~460 m five-minute reachable set, i.e. show a cone that omits reality.
          trackSrc?.setData?.(EMPTY_FC);
          const reachM = speedMs * Math.max(ageS, PROJECT_S);
          const reachRadiusM = (BASE_UNCERT_M + driftR + reachM) * stateMult;
          uncertSrc?.setData?.({
            type: "FeatureCollection",
            features: [{ type: "Feature", geometry: { type: "Polygon", coordinates: [ringPolygon(lat, lon, reachRadiusM)] }, properties: { kind: "reachable", label: "HEADING UNKNOWN · ANY BEARING" } }],
          });
          return;
        }

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
        const radiusM = (BASE_UNCERT_M + driftR) * stateMult;
        // Centre on the projected endpoint when moving, else on the last-known pose.
        const cLat = projDist > 1 ? elat : lat;
        const cLon = projDist > 1 ? elon : lon;
        uncertSrc?.setData?.({
          type: "FeatureCollection",
          features: [{ type: "Feature", geometry: { type: "Polygon", coordinates: [ringPolygon(cLat, cLon, radiusM)] }, properties: { kind: "dr" } }],
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
