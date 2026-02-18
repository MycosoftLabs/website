"use client";

/**
 * EntityDeckLayer – renders aircraft, vessel, and satellite icons via deck.gl
 *
 * Uses deck.gl IconLayer with distinct SVG icons for each entity type:
 *   ✈  aircraft  – amber plane silhouette, rotated by heading
 *   ⬡  vessel    – blue arrowhead, rotated by COG
 *   +  satellite  – purple cross, static
 *   •  others     – coloured dot (fungal, weather, earthquake, etc.)
 *
 * All sizes are in PIXELS so icons are always visible at every zoom level.
 * Clicking an entity fires onEntityClick(entity) so the parent can open
 * the correct custom widget (FlightTrackerWidget, VesselTrackerWidget, etc.).
 */

import { useEffect, useMemo } from "react";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { IconLayer, PathLayer } from "@deck.gl/layers";
import type maplibregl from "maplibre-gl";
import type { UnifiedEntity } from "@/lib/crep/entities/unified-entity-schema";

// ── SVG icon data URIs ────────────────────────────────────────────────────────
// All icons are drawn WHITE so deck.gl can tint them via getColor (mask: true).

function svgUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Plane icon pointing UP (north = 0°).
 * Rotated clockwise by heading using getAngle.
 * Source: Material Design "flight" icon path.
 */
const AIRCRAFT_ICON = svgUri(
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
    <path fill="white" d="M21 16v-2l-8-5V3.5C13 2.67 12.33 2 11.5 2S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
  </svg>`
);

/**
 * Ship / vessel – arrowhead pointing UP (bow = north).
 * Rotated by COG / true heading via getAngle.
 */
const VESSEL_ICON = svgUri(
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <polygon points="16,2 27,29 16,22 5,29" fill="white"/>
  </svg>`
);

/**
 * Satellite – cross with solar panels and a central body.
 * Orientation is arbitrary (satellites tumble); no rotation applied.
 */
const SATELLITE_ICON = svgUri(
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <rect x="14" y="0"  width="4" height="32" fill="white" rx="1"/>
    <rect x="0"  y="14" width="32" height="4"  fill="white" rx="1"/>
    <rect x="4"  y="4"  width="8" height="8"   fill="white" rx="1"/>
    <rect x="20" y="20" width="8" height="8"   fill="white" rx="1"/>
    <circle cx="16" cy="16" r="5" fill="white"/>
  </svg>`
);

/**
 * Generic dot – for fungal observations, weather events, earthquakes, etc.
 */
const DOT_ICON = svgUri(
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="13" fill="white"/>
  </svg>`
);

// Single icon occupies the entire 32×32 atlas.
// mask: true → deck.gl replaces white with getColor, transparent stays transparent.
const ICON_MAPPING = { icon: { x: 0, y: 0, width: 32, height: 32, mask: true } };

// ── Entity colours ────────────────────────────────────────────────────────────
type RGBA = [number, number, number, number];

/** Canonical colours per entity type. Alpha 230/200 for slight transparency. */
const ENTITY_COLORS: Record<string, RGBA> = {
  aircraft:   [251, 182,  36, 240],   // amber-400   ← warm yellow-orange (matches "pink" in original)
  vessel:     [ 56, 189, 248, 240],   // sky-400     ← bright blue
  satellite:  [167,  85, 247, 240],   // violet-500  ← purple
  fungal:     [ 74, 222, 128, 210],   // green-400
  weather:    [251, 191,  36, 200],   // amber-400
  earthquake: [251, 113, 133, 230],   // rose-400
  elephant:   [251, 146,  60, 220],   // orange-400
  device:     [ 34, 211, 238, 220],   // cyan-400
};

function entityColor(type: string): RGBA {
  return ENTITY_COLORS[type] ?? [220, 220, 220, 200];
}

// ── Trail / motion trail helpers ──────────────────────────────────────────────

interface TrailItem {
  entity: UnifiedEntity;
  path: [number, number][];
}

function toTrailPath(entity: UnifiedEntity): [number, number][] | null {
  if (!entity?.geometry || entity.geometry.type !== "Point") return null;
  const coords = entity.geometry.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const vel = entity.state?.velocity;
  if (!vel) return null;
  const [lng, lat] = coords as [number, number];
  // Trail length factor – shorter trail looks cleaner at global zoom
  const f = 0.014;
  return [
    [lng, lat],
    [lng - vel.x * f, lat - vel.y * f],
  ];
}

// ── Coordinate validation ─────────────────────────────────────────────────────

function hasValidCoords(e: UnifiedEntity): boolean {
  if (!e?.geometry || !Array.isArray(e.geometry.coordinates)) return false;
  const [lng, lat] = e.geometry.coordinates as [number, number];
  return (
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    Math.abs(lng) <= 180 &&
    Math.abs(lat) <= 90
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface EntityDeckLayerProps {
  map: maplibregl.Map | null;
  entities: UnifiedEntity[];
  visible: boolean;
  onEntityClick?: (entity: UnifiedEntity) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EntityDeckLayer({
  map,
  entities,
  visible,
  onEntityClick,
}: EntityDeckLayerProps) {
  // One MapboxOverlay per component instance.
  // interleaved: true → deck.gl layers are inserted INTO the MapLibre render pipeline
  // so they render correctly with the map. Required by @deck.gl/mapbox in this setup.
  // (The @deck.gl/mapbox patch fixes the deck.viewManager API for v9 compatibility.)
  const overlay = useMemo(
    () => new MapboxOverlay({ interleaved: true }),
    []
  );

  // Attach / detach overlay when map ref changes
  useEffect(() => {
    if (!map) return;
    // MapboxOverlay satisfies maplibre's IControl interface at runtime
    map.addControl(overlay as unknown as maplibregl.IControl);
    return () => {
      map.removeControl(overlay as unknown as maplibregl.IControl);
    };
  }, [map, overlay]);

  // Rebuild layers whenever entities or visibility changes
  useEffect(() => {
    if (!visible) {
      overlay.setProps({ layers: [] });
      return;
    }

    // Only render entities with valid geographic coordinates
    const valid = entities.filter(
      (e): e is UnifiedEntity =>
        e != null && e.type != null && hasValidCoords(e)
    );

    // Split by entity type so each gets its own icon atlas
    const aircraft   = valid.filter(e => e.type === "aircraft");
    const vessels    = valid.filter(e => e.type === "vessel");
    const satellites = valid.filter(e => e.type === "satellite");
    const others     = valid.filter(
      e => !["aircraft", "vessel", "satellite"].includes(e.type)
    );

    // Build motion trails for entities with velocity state
    const trails: TrailItem[] = valid
      .map(e => ({ entity: e, path: toTrailPath(e) }))
      .filter((x): x is TrailItem => x.path !== null);

    // Shared click handler – fires onEntityClick with the entity object
    const handleClick = ({
      object,
    }: {
      object: UnifiedEntity | undefined;
    }) => {
      if (object && onEntityClick) onEntityClick(object);
    };

    const getPos = (e: UnifiedEntity) =>
      e.geometry.coordinates as [number, number];

    overlay.setProps({
      layers: [
        // ── Motion trail lines (behind icons) ─────────────────────────────
        new PathLayer<TrailItem>({
          id: "crep-trails",
          data: trails,
          widthUnits: "pixels",
          getPath: (x) => x.path,
          getColor: (x) => entityColor(x.entity.type),
          getWidth: 1.5,
          opacity: 0.5,
          pickable: false,
        }),

        // ── Other entities: fungal, weather, earthquake, elephant, device ──
        new IconLayer<UnifiedEntity>({
          id: "crep-others",
          data: others,
          iconAtlas: DOT_ICON,
          iconMapping: ICON_MAPPING,
          getIcon: () => "icon",
          getPosition: getPos,
          getSize: 10,
          sizeUnits: "pixels",
          sizeMinPixels: 6,
          sizeMaxPixels: 24,
          getColor: (e) => entityColor(e.type),
          pickable: true,
          onClick: handleClick,
        }),

        // ── Satellites – purple cross icon ─────────────────────────────────
        new IconLayer<UnifiedEntity>({
          id: "crep-satellites",
          data: satellites,
          iconAtlas: SATELLITE_ICON,
          iconMapping: ICON_MAPPING,
          getIcon: () => "icon",
          getPosition: getPos,
          getSize: 16,
          sizeUnits: "pixels",
          sizeMinPixels: 8,
          sizeMaxPixels: 32,
          getColor: () => entityColor("satellite"),
          pickable: true,
          onClick: handleClick,
        }),

        // ── Vessels – blue arrowhead, rotated by COG / heading ─────────────
        new IconLayer<UnifiedEntity>({
          id: "crep-vessels",
          data: vessels,
          iconAtlas: VESSEL_ICON,
          iconMapping: ICON_MAPPING,
          getIcon: () => "icon",
          getPosition: getPos,
          getSize: 18,
          sizeUnits: "pixels",
          sizeMinPixels: 10,
          sizeMaxPixels: 36,
          getColor: () => entityColor("vessel"),
          // deck.gl getAngle is counter-clockwise; heading is clockwise from north
          getAngle: (e) => -(e.state?.heading ?? 0),
          pickable: true,
          onClick: handleClick,
        }),

        // ── Aircraft – amber plane icon, rotated by heading ────────────────
        new IconLayer<UnifiedEntity>({
          id: "crep-aircraft",
          data: aircraft,
          iconAtlas: AIRCRAFT_ICON,
          iconMapping: ICON_MAPPING,
          getIcon: () => "icon",
          getPosition: getPos,
          getSize: 20,
          sizeUnits: "pixels",
          sizeMinPixels: 10,
          sizeMaxPixels: 40,
          getColor: () => entityColor("aircraft"),
          // Rotate plane to match its heading (clockwise from north)
          getAngle: (e) => -(e.state?.heading ?? 0),
          pickable: true,
          onClick: handleClick,
        }),
      ],
    });
  }, [overlay, entities, visible, onEntityClick]);

  // This component produces no DOM output – it controls the deck.gl overlay
  return null;
}
