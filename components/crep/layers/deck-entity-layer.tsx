// @ts-nocheck
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
import { PathStyleExtension } from "@deck.gl/extensions";
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
 * Generic dot – for weather events, earthquakes, etc.
 */
const DOT_ICON = svgUri(
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="13" fill="white"/>
  </svg>`
);

/**
 * Fungal / mushroom icon – distinct from generic dots to show they are clickable/selectable
 * Draws a simple mushroom silhouette so users know these are fungal observation markers
 */
const FUNGAL_ICON = svgUri(
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <ellipse cx="16" cy="14" rx="12" ry="10" fill="white"/>
    <rect x="13" y="14" width="6" height="12" rx="2" fill="white"/>
    <circle cx="16" cy="14" r="3" fill="white" opacity="0.3"/>
  </svg>`
);

// Single icon occupies the entire 32×32 atlas.
// mask: true → deck.gl replaces white with getColor, transparent stays transparent.
const ICON_MAPPING = { icon: { x: 0, y: 0, width: 32, height: 32, mask: true } };

// ── Entity colours ────────────────────────────────────────────────────────────
type RGBA = [number, number, number, number];

/** Canonical colours per entity type. Alpha 230/200 for slight transparency. */
const ENTITY_COLORS: Record<string, RGBA> = {
  aircraft:   [251, 182,  36, 240],   // amber-400
  vessel:     [ 56, 189, 248, 240],   // sky-400
  satellite:  [167,  85, 247, 240],   // violet-500
  fungal:     [ 74, 222, 128, 210],   // green-400
  weather:    [251, 191,  36, 200],   // amber-400
  earthquake: [251, 113, 133, 230],   // rose-400
  elephant:   [251, 146,  60, 220],   // orange-400
  device:     [ 34, 211, 238, 220],   // cyan-400
};

/** Kingdom-specific colours for all-life fungal/observation markers */
const KINGDOM_COLORS: Record<string, RGBA> = {
  Fungi:          [180, 83,   9, 220],   // amber-700 (brown/earthy)
  Plantae:        [  4, 120,  87, 220],  // emerald-700
  Aves:           [  3, 105, 161, 220],  // sky-700
  Mammalia:       [194,  65,  12, 220],  // orange-700
  Reptilia:       [ 77, 124,  15, 220],  // lime-700
  Amphibia:       [ 21, 128,  61, 220],  // green-700
  Actinopterygii: [ 14, 116, 144, 220],  // cyan-700
  Mollusca:       [190,  18,  60, 220],  // rose-700
  Arachnida:      [153,  27,  27, 220],  // red-800
  Insecta:        [161,  98,   7, 220],  // yellow-700
  Animalia:       [194,  65,  12, 220],  // orange-700
};

function entityColor(type: string): RGBA {
  return ENTITY_COLORS[type] ?? [220, 220, 220, 200];
}

/** Get kingdom-specific colour for observation entities */
function fungalEntityColor(entity: UnifiedEntity): RGBA {
  const kingdom = entity.properties?.kingdom || entity.properties?.iconicTaxon || "Fungi";
  return KINGDOM_COLORS[kingdom as string] ?? ENTITY_COLORS.fungal;
}

/** Normalize aviation heading to 0–360 degrees. Accepts degrees or radians (if value in 0..2π). */
function normalizeHeadingDeg(heading: number): number {
  if (!Number.isFinite(heading)) return 0;
  let deg = heading;
  if (heading >= 0 && heading <= 2 * Math.PI + 0.01) deg = (heading * 180) / Math.PI;
  return ((deg % 360) + 360) % 360;
}

// ── Trail / motion trail helpers ──────────────────────────────────────────────

interface TrailItem {
  entity: UnifiedEntity;
  path: [number, number][];
}

// Half-extent for trajectory (sec). Trail = from (current - vel*h) to (current + vel*h).
// Aircraft/vessels: velocity in knots → deg/s = 1/216000. 45 sec each side = 90 s total.
const HALF_TRAIL_SEC_AIRCRAFT = 45 / 216000; // 45 sec in deg per knot
// Satellites: state.velocity already in deg/s. 45 sec each side.
const HALF_TRAIL_SEC_SATELLITE = 45;

/**
 * Build a fixed trajectory segment: [where from, where to] centered on trailAnchor.
 * The line does not move; the icon (geometry.coordinates) moves along it.
 * trailAnchor = last-known API position, updated only on fetch; icon = extrapolated position.
 */
function toTrailPath(entity: UnifiedEntity): [number, number][] | null {
  if (!entity?.geometry || entity.geometry.type !== "Point") return null;
  const coords = entity.geometry.coordinates as [number, number];
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const vel = entity.state?.velocity;
  if (!vel) return null;
  const anchor = entity.state?.trailAnchor ?? coords;
  const [lng, lat] = anchor;
  const half =
    entity.type === "satellite"
      ? HALF_TRAIL_SEC_SATELLITE
      : HALF_TRAIL_SEC_AIRCRAFT;
  const fromLng = lng - vel.x * half;
  const fromLat = lat - vel.y * half;
  const toLng = lng + vel.x * half;
  const toLat = lat + vel.y * half;
  return [[fromLng, fromLat], [toLng, toLat]];
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
    const fungal     = valid.filter(e => e.type === "fungal");
    const others     = valid.filter(
      e => !["aircraft", "vessel", "satellite", "fungal"].includes(e.type)
    );

    // Build motion trails: satellites only get full-orbit path (no short segment) for consistency
    const trails: TrailItem[] = valid
      .map((e) => {
        const path =
          e.type === "satellite"
            ? (e.state?.orbitPath?.length ? e.state.orbitPath : null)
            : toTrailPath(e);
        return { entity: e, path };
      })
      .filter((x): x is TrailItem => x.path !== null && x.path.length > 0);

    // Shared click handler – fires onEntityClick with the entity object
    const handleClick = (info: any) => {
      if (info?.object && onEntityClick) onEntityClick(info.object);
    };

    const getPos = (e: UnifiedEntity) =>
      e.geometry.coordinates as [number, number];

    overlay.setProps({
      layers: [
        // ── Trajectory lines: thin, low-opacity dashed path so they don't clog the map ──
        // Planes, boats, satellites: path = [past, future]; icon at current. Not attached to icon.
        new PathLayer<TrailItem>({
          id: "crep-trails",
          data: trails,
          widthUnits: "pixels",
          getPath: (x) => x.path,
          getColor: (x) => entityColor(x.entity.type),
          getWidth: 1,
          opacity: 0.4,
          pickable: false,
          getDashArray: (() => [4, 3]) as any,
          dashJustified: true,
          extensions: [new PathStyleExtension({ dash: true })],
        }),

        // ── Fungal observations: distinct mushroom icon, larger and more visible ──
        new IconLayer<UnifiedEntity>({
          id: "crep-fungal",
          data: fungal,
          iconAtlas: FUNGAL_ICON,
          iconMapping: ICON_MAPPING,
          getIcon: () => "icon",
          getPosition: getPos,
          getSize: 16,
          sizeUnits: "pixels",
          sizeMinPixels: 8,
          sizeMaxPixels: 32,
          getColor: (e) => fungalEntityColor(e),
          pickable: true,
          onClick: handleClick,
        }),

        // ── Other entities: weather, earthquake, elephant, device ──
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
          // deck.gl getAngle: degrees, positive = CCW. Aviation heading = clockwise from north → angle = -heading
          getAngle: (e) => -normalizeHeadingDeg(e.state?.heading ?? 0),
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
          // Rotate plane to match aviation heading (clockwise from north); getAngle = -heading in degrees
          getAngle: (e) => -normalizeHeadingDeg(e.state?.heading ?? 0),
          pickable: true,
          onClick: handleClick,
        }),
      ],
    });
  }, [overlay, entities, visible, onEntityClick]);

  // This component produces no DOM output – it controls the deck.gl overlay
  return null;
}
