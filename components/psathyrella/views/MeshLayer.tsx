"use client";

/**
 * MESH LAYER — Meshtastic / live.tennmesh.com-style live mesh visualization ON THE MAP.
 *
 * Renders the LoRa fleet mesh as three self-contained MapLibre layers on the existing <Map>
 * (via useMap()) — NO CREP/MYCA imports, NO React churn:
 *   1. PEER NODES   — colored circle + label per PeerBuoy (by role: relay/sensor/gateway/buoy),
 *                     gated by `layers.peers`.
 *   2. MESH LINKS   — subtle lines self<->peers (+ active peer<->peer hops), gated by `layers.mesh`.
 *   3. PACKETS      — the signature Meshtastic look: a dot travels along each link from `fromId`
 *                     to `toId`, position interpolated by (now - atMs)/duration, hue by packet
 *                     kind. Capped (~30 active) so it never taxes the frame budget. Gated by
 *                     `layers.mesh`.
 *
 * ISOLATION/FREEZE-SAFETY (mirrors SensorContactsLayer):
 *   - Reads ONLY telemetryRef.current (peers + mesh.packets + pose) on a hidden-gated rAF loop;
 *     NEVER takes the telemetry object as a prop, NEVER setState per frame.
 *   - Every maplibre call try/caught; sources/layers added via runWhenStyleReady().
 *   - One animation loop, ~22fps throttle; cleaned up on unmount; paused when document.hidden.
 *   - Unique "psa-mesh-*" / "psa-peer-*" source/layer namespace (no collision with psa-buoy/radar).
 *
 * The Integrate phase mounts <MeshLayer telemetryRef={telemetryRef} layers={layers} /> inside <Map>.
 */

import { useEffect, useRef } from "react";
import { useMap } from "@/components/ui/map";
import { runWhenStyleReady } from "@/lib/psathyrella/mapReady";
import { isMapViewActive } from "@/lib/psathyrella/viewState";
import { type BuoyTelemetry, type MeshPacket, type MeshPacketKind, type PeerBuoy } from "@/lib/psathyrella/contract";
import { type LayerState } from "./MapFiltersPanel";

const EMPTY_FC = { type: "FeatureCollection", features: [] as unknown[] };

// Role → node color (matches the Meshtastic node-role palette idiom).
const ROLE_COLOR: Record<PeerBuoy["role"], string> = {
  gateway: "#f59e0b", // amber — uplink/router
  relay: "#a78bfa", // violet — repeater
  sensor: "#22d3ee", // cyan — leaf sensor
  buoy: "#4ade80", // green — generic buoy node
};

// Packet kind → hue (the moving dots are color-coded by traffic type, Meshtastic-style).
const PACKET_COLOR: Record<MeshPacketKind, string> = {
  position: "#34d399", // green
  telemetry: "#22d3ee", // cyan
  text: "#f472b6", // pink
  ack: "#fbbf24", // amber
  sensor: "#a78bfa", // violet
  nodeinfo: "#94a3b8", // slate
};

// A packet "flies" along its link over this window; older packets are dropped.
const PACKET_FLIGHT_MS = 1500;
// Hard cap on simultaneously-animated packets so the frame budget is never taxed.
const MAX_ACTIVE_PACKETS = 30;
// rAF throttle (~22fps) — smooth enough for moving dots, cheap on the GPU.
const FRAME_MS = 45;

type LL = [number, number];

/** Resolve a node id to [lon, lat]: selfId → live pose, else the matching peer. */
function nodeLngLat(
  id: string,
  selfId: string,
  selfLL: LL | null,
  peerById: Map<string, PeerBuoy>,
): LL | null {
  if (id === selfId) return selfLL;
  const p = peerById.get(id);
  if (!p || !Number.isFinite(p.lon) || !Number.isFinite(p.lat)) return null;
  return [p.lon, p.lat];
}

export function MeshLayer({
  telemetryRef,
  layers,
}: {
  telemetryRef: { current: BuoyTelemetry };
  layers: LayerState;
}) {
  const { map } = useMap();
  const peersOn = !!layers.peers;
  const meshOn = !!layers.mesh;

  // Fresh-toggle ref so the [map]-only ensure() can bake CURRENT visibility into the layers it
  // creates — without this, a layer already ON before style-ready is created hidden and the
  // separate visibility effect may not re-flip it (the visibility race, per SensorContactsLayer).
  const onRef = useRef({ peers: peersOn, mesh: meshOn });
  onRef.current = { peers: peersOn, mesh: meshOn };

  // sources + layers, once
  useEffect(() => {
    if (!map) return;
    const ensure = () => {
      try {
        const peerVis = onRef.current.peers ? "visible" : "none";
        const meshVis = onRef.current.mesh ? "visible" : "none";

        // ── Mesh links (drawn first → under nodes/packets) ──
        if (!map.getSource("psa-mesh-links")) {
          map.addSource("psa-mesh-links", { type: "geojson", data: EMPTY_FC as any });
          map.addLayer({
            id: "psa-mesh-links-line",
            type: "line",
            source: "psa-mesh-links",
            layout: { visibility: meshVis, "line-cap": "round" },
            paint: {
              "line-color": "#38bdf8",
              "line-width": ["interpolate", ["linear"], ["zoom"], 2, 0.6, 9, 1.4],
              "line-opacity": ["case", ["==", ["get", "active"], true], 0.55, 0.22],
              "line-dasharray": [2, 2],
            },
          });
        }

        // ── Animated packets (moving dots along the links) ──
        if (!map.getSource("psa-mesh-packets")) {
          map.addSource("psa-mesh-packets", { type: "geojson", data: EMPTY_FC as any });
          map.addLayer({
            id: "psa-mesh-packets-glow",
            type: "circle",
            source: "psa-mesh-packets",
            layout: { visibility: meshVis },
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["get", "fade"], 0, 4, 1, 9],
              "circle-color": ["get", "color"],
              "circle-opacity": ["*", 0.22, ["get", "fade"]],
              "circle-blur": 0.8,
            },
          });
          map.addLayer({
            id: "psa-mesh-packets-dot",
            type: "circle",
            source: "psa-mesh-packets",
            layout: { visibility: meshVis },
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["get", "fade"], 0, 1.8, 1, 3.6],
              "circle-color": ["get", "color"],
              "circle-opacity": ["get", "fade"],
              "circle-stroke-width": 0.75,
              "circle-stroke-color": "#04070e",
            },
          });
        }

        // ── Peer buoy nodes (top) ──
        if (!map.getSource("psa-peer-nodes")) {
          map.addSource("psa-peer-nodes", { type: "geojson", data: EMPTY_FC as any });
          map.addLayer({
            id: "psa-peer-nodes-glow",
            type: "circle",
            source: "psa-peer-nodes",
            layout: { visibility: peerVis },
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 7, 10, 15],
              "circle-color": ["get", "color"],
              "circle-opacity": ["case", ["==", ["get", "online"], true], 0.16, 0.06],
              "circle-blur": 0.7,
            },
          });
          map.addLayer({
            id: "psa-peer-nodes-dot",
            type: "circle",
            source: "psa-peer-nodes",
            layout: { visibility: peerVis },
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 4, 10, 7],
              "circle-color": ["get", "color"],
              "circle-opacity": ["case", ["==", ["get", "online"], true], 0.95, 0.4],
              "circle-stroke-width": 1.5,
              "circle-stroke-color": "#04070e",
            },
          });
          map.addLayer({
            id: "psa-peer-nodes-label",
            type: "symbol",
            source: "psa-peer-nodes",
            minzoom: 5,
            layout: {
              visibility: peerVis,
              "text-field": ["coalesce", ["get", "name"], ["get", "id"], ""],
              "text-size": 9,
              "text-font": ["Open Sans Bold"],
              "text-offset": [0, 1.2],
              "text-anchor": "top",
              "text-allow-overlap": false,
              "text-optional": true,
            } as any,
            paint: { "text-color": "#cbd5e1", "text-halo-color": "#04070e", "text-halo-width": 1 },
          });
        }
      } catch { /* style mid-load */ }
    };
    runWhenStyleReady(map, ensure);
    return () => {
      try {
        [
          "psa-mesh-links-line",
          "psa-mesh-packets-glow",
          "psa-mesh-packets-dot",
          "psa-peer-nodes-glow",
          "psa-peer-nodes-dot",
          "psa-peer-nodes-label",
        ].forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });
        ["psa-mesh-links", "psa-mesh-packets", "psa-peer-nodes"].forEach((id) => { if (map.getSource(id)) map.removeSource(id); });
      } catch { /* tearing down */ }
    };
  }, [map]);

  // visibility follows toggles
  useEffect(() => {
    const setVis = (ids: string[], on: boolean) => {
      ids.forEach((id) => {
        try { if (map?.getLayer(id)) map.setLayoutProperty(id, "visibility", on ? "visible" : "none"); } catch { /* */ }
      });
    };
    setVis(["psa-peer-nodes-glow", "psa-peer-nodes-dot", "psa-peer-nodes-label"], peersOn);
    setVis(["psa-mesh-links-line", "psa-mesh-packets-glow", "psa-mesh-packets-dot"], meshOn);
  }, [map, peersOn, meshOn]);

  // live feed + packet animation via the stable ref on a hidden-gated rAF loop — NO React
  // re-render, try/caught. This is the "controls separated from the map" guarantee at runtime.
  useEffect(() => {
    if (!map || (!peersOn && !meshOn)) return;
    let raf = 0;
    let last = 0;

    const paint = () => {
      try {
        const t = telemetryRef.current;
        const selfId = t?.mesh?.selfId ?? "psathyrella-01";
        const plat = t?.pose?.lat;
        const plon = t?.pose?.lon;
        const selfLL: LL | null = typeof plat === "number" && typeof plon === "number" ? [plon, plat] : null;
        const peers: PeerBuoy[] = Array.isArray(t?.peers) ? t.peers : [];
        const peerById = new Map<string, PeerBuoy>();
        for (const p of peers) peerById.set(p.id, p);

        const peerSrc = map.getSource("psa-peer-nodes") as { setData?: (d: any) => void } | undefined;
        const linkSrc = map.getSource("psa-mesh-links") as { setData?: (d: any) => void } | undefined;
        const pktSrc = map.getSource("psa-mesh-packets") as { setData?: (d: any) => void } | undefined;

        // ── Peer nodes ──
        if (peersOn) {
          const nodeFeatures = peers
            .filter((p) => Number.isFinite(p.lon) && Number.isFinite(p.lat))
            .map((p) => ({
              type: "Feature",
              geometry: { type: "Point", coordinates: [p.lon, p.lat] },
              properties: {
                id: p.id,
                name: p.name || p.id,
                color: ROLE_COLOR[p.role] || "#94a3b8",
                online: !!p.online,
              },
            }));
          peerSrc?.setData?.({ type: "FeatureCollection", features: nodeFeatures });
        } else {
          peerSrc?.setData?.(EMPTY_FC);
        }

        if (!meshOn) {
          linkSrc?.setData?.(EMPTY_FC);
          pktSrc?.setData?.(EMPTY_FC);
          return;
        }

        const now = Date.now();
        const packets: MeshPacket[] = Array.isArray(t?.mesh?.packets) ? t.mesh.packets : [];
        // Most recent in-flight packets first, capped.
        const live = packets
          .filter((pk) => now - pk.atMs >= 0 && now - pk.atMs <= PACKET_FLIGHT_MS)
          .sort((a, b) => b.atMs - a.atMs)
          .slice(0, MAX_ACTIVE_PACKETS);

        // ── Mesh links: self<->peer for every peer, plus the edge each live packet rides. ──
        const linkKeys = new Set<string>();
        const linkFeatures: any[] = [];
        const addLink = (aId: string, bId: string, active: boolean) => {
          const key = aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
          if (linkKeys.has(key)) {
            if (active) {
              // upgrade an existing link to active
              const existing = linkFeatures.find((f) => f.properties._key === key);
              if (existing) existing.properties.active = true;
            }
            return;
          }
          const a = nodeLngLat(aId, selfId, selfLL, peerById);
          const b = nodeLngLat(bId, selfId, selfLL, peerById);
          if (!a || !b) return;
          linkKeys.add(key);
          linkFeatures.push({
            type: "Feature",
            geometry: { type: "LineString", coordinates: [a, b] },
            properties: { _key: key, active },
          });
        };
        // baseline star: self <-> each peer
        for (const p of peers) addLink(selfId, p.id, false);
        // active edges carrying a packet right now (covers peer<->peer hops too)
        for (const pk of live) addLink(pk.fromId, pk.toId, true);
        linkSrc?.setData?.({ type: "FeatureCollection", features: linkFeatures });

        // ── Animated packet dots: interpolate fromId→toId by elapsed/flight. ──
        const pktFeatures: any[] = [];
        for (const pk of live) {
          const a = nodeLngLat(pk.fromId, selfId, selfLL, peerById);
          const b = nodeLngLat(pk.toId, selfId, selfLL, peerById);
          if (!a || !b) continue;
          const tt = Math.max(0, Math.min(1, (now - pk.atMs) / PACKET_FLIGHT_MS));
          const lon = a[0] + (b[0] - a[0]) * tt;
          const lat = a[1] + (b[1] - a[1]) * tt;
          // fade: bright at launch, dim on arrival (1 → ~0.15) for the "trail" feel.
          const fade = 1 - tt * 0.85;
          pktFeatures.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: [lon, lat] },
            properties: { color: PACKET_COLOR[pk.kind] || "#94a3b8", fade },
          });
        }
        pktSrc?.setData?.({ type: "FeatureCollection", features: pktFeatures });
      } catch { /* layer mid-teardown */ }
    };

    const tick = (ts: number) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden || !isMapViewActive()) return;
      if (ts - last < FRAME_MS) return;
      last = ts;
      paint();
    };
    paint();
    raf = requestAnimationFrame(tick);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [map, peersOn, meshOn, telemetryRef]);

  return null;
}

export default MeshLayer;
