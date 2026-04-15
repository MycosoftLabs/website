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

import { useEffect, useRef, useState } from "react";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { IconLayer, PathLayer, ScatterplotLayer } from "@deck.gl/layers";
import { PathStyleExtension } from "@deck.gl/extensions";
import type maplibregl from "maplibre-gl";
import type { UnifiedEntity } from "@/lib/crep/entities/unified-entity-schema";

// ── SVG icon data URIs ────────────────────────────────────────────────────────
// All icons are drawn WHITE so deck.gl can tint them via getColor (mask: true).
//
// IMPORTANT: SVG data URIs fail in non-interleaved deck.gl mode (globe projection).
// We pre-render them to PNG via an offscreen canvas so they work in both modes.

function svgUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Pre-render SVG data URI to PNG data URL via offscreen canvas.
 * Returns a Promise that resolves to a PNG data URL.
 * This makes IconLayer work in non-interleaved (globe) mode.
 */
const _pngCache = new Map<string, string>();
function svgToPng(svgDataUri: string, width = 64, height?: number): Promise<string> {
  const h = height ?? width;
  const cached = _pngCache.get(svgDataUri);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, h);
        const png = canvas.toDataURL("image/png");
        _pngCache.set(svgDataUri, png);
        resolve(png);
      } else {
        resolve(svgDataUri); // fallback to SVG
      }
    };
    img.onerror = () => resolve(svgDataUri); // fallback to SVG
    img.src = svgDataUri;
  });
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
 * Kingdom-specific species icons – one per kingdom. Individual 32×32 SVGs.
 * deck.gl IconLayer pre-packed atlas expects raster PNG; SVG atlas can fail.
 * Dynamic getIcon with per-icon URLs works reliably.
 */
const speciesSvg = (content: string) =>
  svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">${content}</svg>`);

/** Per-kingdom SVG content (32×32) – used to build combined atlas */
const SPECIES_ICON_CONTENT: Record<string, string> = {
  fungi:          `<g><ellipse cx="16" cy="14" rx="12" ry="10" fill="white"/><rect x="13" y="14" width="6" height="12" rx="2" fill="white"/><circle cx="16" cy="14" r="3" fill="white" opacity="0.3"/></g>`,
  plantae:        `<g><path fill="white" d="M16 4c-2 4-8 12-8 20 0 4 3 8 8 8s8-4 8-8c0-8-6-16-8-20z"/></g>`,
  aves:           `<g><path fill="white" d="M8 18c0-4 4-8 8-8s8 4 8 8c0 2-1 4-3 5l2 5h-4l-3-4-3 4H7l2-5c-2-1-3-3-3-5z"/><ellipse cx="16" cy="14" rx="4" ry="3" fill="white"/></g>`,
  mammalia:       `<g><ellipse cx="16" cy="18" rx="6" ry="8" fill="white"/><ellipse cx="10" cy="10" rx="3" ry="4" fill="white"/><ellipse cx="16" cy="8" rx="3" ry="4" fill="white"/><ellipse cx="22" cy="10" rx="3" ry="4" fill="white"/><ellipse cx="13" cy="6" rx="2" ry="3" fill="white"/><ellipse cx="19" cy="6" rx="2" ry="3" fill="white"/></g>`,
  reptilia:       `<g><path fill="white" d="M8 16h4l2-4 2 8 2-6 2 2h4l-2-4 2-6h-4l-2 4-2-6-2 4-4 2z"/></g>`,
  amphibia:       `<g><ellipse cx="16" cy="16" rx="10" ry="8" fill="white"/><circle cx="12" cy="14" r="2" fill="white" opacity="0.5"/><circle cx="20" cy="14" r="2" fill="white" opacity="0.5"/><path fill="white" d="M10 22 Q16 26 22 22"/></g>`,
  actinopterygii: `<g><ellipse cx="16" cy="16" rx="12" ry="6" fill="white"/><path fill="white" d="M4 16 L8 12 L8 20 Z"/><path fill="white" d="M28 16 L24 12 L24 20 Z"/></g>`,
  mollusca:       `<g><path fill="white" d="M16 4 Q24 8 24 16 Q24 24 16 28 Q8 24 8 16 Q8 8 16 4 Z M16 10 Q12 14 12 16 Q12 18 16 22 Q20 18 20 16 Q20 14 16 10 Z"/></g>`,
  arachnida:      `<g><circle cx="16" cy="14" r="5" fill="white"/><rect x="15" y="4" width="2" height="12" fill="white"/><rect x="7" y="13" width="18" height="2" fill="white"/><rect x="10" y="10" width="4" height="4" fill="white" transform="rotate(-45 12 12)"/><rect x="18" y="10" width="4" height="4" fill="white" transform="rotate(45 20 12)"/><rect x="10" y="16" width="4" height="4" fill="white" transform="rotate(45 12 18)"/><rect x="18" y="16" width="4" height="4" fill="white" transform="rotate(-45 20 18)"/></g>`,
  insecta:        `<g><ellipse cx="16" cy="16" rx="2" ry="8" fill="white"/><ellipse cx="10" cy="12" rx="6" ry="6" fill="white"/><ellipse cx="22" cy="12" rx="6" ry="6" fill="white"/><ellipse cx="10" cy="20" rx="6" ry="6" fill="white"/><ellipse cx="22" cy="20" rx="6" ry="6" fill="white"/></g>`,
  animalia:       `<g><ellipse cx="16" cy="18" rx="8" ry="6" fill="white"/><path fill="white" d="M14 10 L16 4 L18 10"/><ellipse cx="12" cy="16" rx="2" ry="2" fill="white" opacity="0.5"/><ellipse cx="20" cy="16" rx="2" ry="2" fill="white" opacity="0.5"/></g>`,
};

/** Combined 128×96 atlas: 4×3 grid of 32×32 kingdom icons (fungi, plantae, aves, ...). mask:true so getColor tints. */
const SPECIES_ATLAS_ORDER = ["fungi", "plantae", "aves", "mammalia", "reptilia", "amphibia", "actinopterygii", "mollusca", "arachnida", "insecta", "animalia"] as const;
const SPECIES_ATLAS = svgUri(
  `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="96" viewBox="0 0 128 96">` +
  SPECIES_ATLAS_ORDER.map((key, i) => {
    const x = (i % 4) * 32;
    const y = Math.floor(i / 4) * 32;
    return `<g transform="translate(${x},${y})">${SPECIES_ICON_CONTENT[key]}</g>`;
  }).join("") +
  `</svg>`
);
const SPECIES_ICON_MAPPING: Record<string, { x: number; y: number; width: number; height: number; mask: boolean }> = {};
SPECIES_ATLAS_ORDER.forEach((key, i) => {
  SPECIES_ICON_MAPPING[key] = {
    x: (i % 4) * 32,
    y: Math.floor(i / 4) * 32,
    width: 32,
    height: 32,
    mask: true,
  };
});

/** @deprecated – TextLayer emoji does not render in deck.gl (SDF fonts). Use IconLayer + SPECIES_ATLAS. */
const KINGDOM_EMOJI: Record<string, string> = {
  fungi: "🍄",
  plantae: "🌿",
  aves: "🐦",
  mammalia: "🦌",
  reptilia: "🦎",
  amphibia: "🐸",
  actinopterygii: "🐟",
  mollusca: "🐌",
  arachnida: "🕷",
  insecta: "🐛",
  animalia: "🐾",
};

/** Kingdom → icon key (used to look up SPECIES_ICON_URLS / KINGDOM_EMOJI) */
const KINGDOM_ICON_KEYS: Record<string, string> = {
  Fungi: "fungi",
  Plantae: "plantae",
  Aves: "aves",
  Mammalia: "mammalia",
  Reptilia: "reptilia",
  Amphibia: "amphibia",
  Actinopterygii: "actinopterygii",
  Mollusca: "mollusca",
  Arachnida: "arachnida",
  Insecta: "insecta",
  Animalia: "animalia",
  Chromista: "plantae",  // fallback to plant
  Protozoa: "animalia",  // fallback to animal
};

function normalizeKingdom(s: string): string {
  const t = String(s || "").trim().toLowerCase();
  if (!t) return "Fungi";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function getSpeciesIconKey(entity: UnifiedEntity): string {
  const taxon = entity.properties?.taxon as { kingdom?: string; iconic_taxon_name?: string } | undefined;
  const raw =
    (entity.properties?.kingdom as string) ||
    (entity.properties?.iconicTaxon as string) ||
    taxon?.iconic_taxon_name ||
    taxon?.kingdom ||
    "Fungi";
  const kingdom = normalizeKingdom(raw);
  return KINGDOM_ICON_KEYS[kingdom] || KINGDOM_ICON_KEYS.Fungi;
}

// Single icon occupies the entire 32×32 atlas (for aircraft, vessel, satellite, dot).
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
  fire:       [249, 115,  22, 230],   // orange-500 (wildfires, EONET)
  crisis:     [239,  68,  68, 230],   // red-500 (crisis events)
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
  Chromista:      [  4, 120,  87, 220],  // emerald-700 (plant-like)
  Protozoa:       [194,  65,  12, 220],  // orange-700 (animal-like)
};

function entityColor(type: string): RGBA {
  return ENTITY_COLORS[type] ?? [220, 220, 220, 200];
}

/** Get kingdom-specific colour for observation entities */
function fungalEntityColor(entity: UnifiedEntity): RGBA {
  const taxon = entity.properties?.taxon as { kingdom?: string; iconic_taxon_name?: string } | undefined;
  const raw =
    (entity.properties?.kingdom as string) ||
    (entity.properties?.iconicTaxon as string) ||
    taxon?.iconic_taxon_name ||
    taxon?.kingdom ||
    "Fungi";
  const kingdom = normalizeKingdom(raw);
  return KINGDOM_COLORS[kingdom] ?? ENTITY_COLORS.fungal;
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
  /** MapLibre map instance OR a React ref to a map instance.
   *  Parent typically passes mapRef (a ref); we handle both. */
  map: maplibregl.Map | React.RefObject<maplibregl.Map | null> | null;
  entities: UnifiedEntity[];
  visible: boolean;
  onEntityClick?: (entity: UnifiedEntity) => void;
  /** Extra deck.gl layers (e.g. power plant bubbles, transmission lines) merged
   *  into the single MapboxOverlay. Avoids creating competing overlays. */
  extraLayers?: any[];
  /** When true, use non-interleaved rendering (needed for globe projection).
   *  Interleaved mode doesn't work with MapLibre globe projection. */
  useGlobeMode?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EntityDeckLayer({
  map: mapProp,
  entities,
  visible,
  onEntityClick,
  extraLayers = [],
  useGlobeMode = false,
}: EntityDeckLayerProps) {
  // Resolve map instance — parent passes either a Map, a RefObject, or null via state.
  // Since parent uses useState (not useRef), re-renders trigger naturally when map loads.
  const resolvedMap = (() => {
    if (!mapProp) return null;
    // If it's a RefObject, read .current
    if (typeof mapProp === 'object' && 'current' in mapProp) {
      return (mapProp as React.RefObject<maplibregl.Map | null>).current;
    }
    // If it has getZoom, it's the Map instance directly (parent uses useState)
    if (typeof mapProp === 'object' && typeof (mapProp as any).getZoom === 'function') {
      return mapProp as maplibregl.Map;
    }
    // Fallback: try using it directly (parent may pass Map as any)
    return mapProp as maplibregl.Map;
  })();

  // Debug: log map resolution status on every render
  useEffect(() => {
    console.log(`[CREP/Deck] resolvedMap=${!!resolvedMap}, mapProp type=${typeof mapProp}, hasGetZoom=${typeof (mapProp as any)?.getZoom}`);
  }, [resolvedMap, mapProp]);

  // ── Pre-load SVG icons as Image objects ──
  // deck.gl's IconLayer treats string iconAtlas as a URL and tries to fetch() it.
  // SVG data URIs fail in the loaders.gl image parser (globe mode, some browsers).
  // By passing a pre-loaded HTMLImageElement object, we bypass the fetch pipeline entirely.
  // deck.gl accepts Image objects directly — no fetch, no parse, just renders.
  const [iconImages, setIconImages] = useState<{
    aircraft: HTMLImageElement;
    vessel: HTMLImageElement;
    satellite: HTMLImageElement;
    dot: HTMLImageElement;
    species: HTMLImageElement;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    function loadImg(src: string): Promise<HTMLImageElement> {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(img); // still return — deck.gl handles gracefully
        img.src = src;
      });
    }
    Promise.all([
      loadImg(AIRCRAFT_ICON),
      loadImg(VESSEL_ICON),
      loadImg(SATELLITE_ICON),
      loadImg(DOT_ICON),
      loadImg(SPECIES_ATLAS),
    ]).then(([aircraft, vessel, satellite, dot, species]) => {
      if (!cancelled) {
        setIconImages({ aircraft, vessel, satellite, dot, species });
        console.log("[CREP/Deck] Icon atlas images pre-loaded ✓ (bypasses fetch)");
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Single overlay — deck.gl only supports ONE MapboxOverlay per map.
  // Layer order in the array determines rendering depth:
  //   First (index 0) = rendered first (bottom) → infrastructure
  //   Last (highest index) = rendered last (top) → entities (planes, sats)
  //
  // interleaved: true renders INTO MapLibre's pipeline. Icons render correctly
  // on globe projection with this mode.
  const overlayRef = useRef<MapboxOverlay | null>(null);

  useEffect(() => {
    if (!resolvedMap) return;

    if (overlayRef.current) {
      try { resolvedMap.removeControl(overlayRef.current as unknown as maplibregl.IControl); } catch {}
      overlayRef.current = null;
    }

    const overlay = new MapboxOverlay({
      interleaved: true,
      pickingRadius: 28,
    });
    overlayRef.current = overlay;
    resolvedMap.addControl(overlay as unknown as maplibregl.IControl);
    console.log("[CREP/Deck] MapboxOverlay added to map ✓");

    return () => {
      if (overlayRef.current) {
        try { resolvedMap.removeControl(overlayRef.current as unknown as maplibregl.IControl); } catch {}
        overlayRef.current = null;
      }
    };
  }, [resolvedMap, useGlobeMode]);

  // Rebuild layers whenever entities, visibility, or PNG icons change
  useEffect(() => {
    if (!overlayRef.current) return;
    if (!visible) {
      overlayRef.current.setProps({ layers: [...extraLayers] });
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
    if (aircraft.length + vessels.length + satellites.length > 0) {
      console.log(`[CREP/Deck] ✈${aircraft.length} 🚢${vessels.length} 🛰${satellites.length} 🍄${fungal.length} other=${others.length}`);
    }

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

    // 2D position for flat mode
    const getPos = (e: UnifiedEntity) =>
      e.geometry.coordinates as [number, number];

    // 3D position with altitude for globe mode — aircraft at flight level,
    // satellites at orbital altitude, vessels/species at surface
    const getPos3D = (e: UnifiedEntity): [number, number, number] => {
      const [lng, lat] = e.geometry.coordinates as [number, number];
      if (e.type === "aircraft") {
        // altitude_ft → meters, scale down for visual (real altitudes too high)
        const altFt = e.state?.altitude ?? e.properties?.altitude_ft ?? 35000;
        return [lng, lat, Number(altFt) * 0.3048 * 0.5]; // 50% scale for visibility
      }
      if (e.type === "satellite") {
        // Orbital altitude in km, scale to meters but cap for visual
        const altKm = e.state?.altitude ?? e.properties?.altitude_km ?? 400;
        return [lng, lat, Number(altKm) * 100]; // Scaled: 400km orbit → 40km visual
      }
      // Vessels, species, events at surface
      return [lng, lat, 0];
    };

    // ALL layers in one overlay — infrastructure first (bottom), entities last (top)
    overlayRef.current.setProps({
      layers: [
        // ── Infrastructure (bottom) — rendered first ──
        ...extraLayers,

        // ── Entity layers (top) — rendered last, always visible ──
        // ── Trajectory lines: thin, low-opacity dashed path so they don't clog the map ──
        // Planes, boats, satellites: path = [past, future]; icon at current. Not attached to icon.
        new PathLayer<TrailItem>({
          id: "crep-trails",
          data: trails,
          widthUnits: "pixels",
          getPath: (x) => x.path,
          getColor: (x) => entityColor(x.entity.type),
          getWidth: useGlobeMode ? 0.5 : 1,
          opacity: useGlobeMode ? 0.15 : 0.4, // Much thinner on globe so entities stand out
          pickable: false,
          dashJustified: true,
          extensions: [new PathStyleExtension({ dash: true })],
          ...({ getDashArray: () => [4, 3] } as any),
        }),

        // ── Entity ScatterplotLayers — pure WebGL circles, no icon atlas needed ──
        // ScatterplotLayer renders guaranteed without image loading issues.
        // Aircraft = amber, Satellites = purple, Vessels = cyan, Others = gray, Fungal = green

        // ── Others (weather, earthquakes, etc.) – gray dots ──
        new ScatterplotLayer<UnifiedEntity>({
          id: "crep-others",
          data: others,
          getPosition: getPos,
          getRadius: 4,
          radiusUnits: "pixels",
          radiusMinPixels: 3,
          radiusMaxPixels: 12,
          getFillColor: (e) => entityColor(e.type),
          getLineColor: [255, 255, 255, 120],
          lineWidthMinPixels: 1,
          stroked: true,
          pickable: true,
          onClick: handleClick,
        }),

        // ── Satellites – bright purple dots, white-ringed ─────────────────
        new ScatterplotLayer<UnifiedEntity>({
          id: "crep-satellites",
          data: satellites,
          getPosition: getPos,
          getRadius: 5,
          radiusUnits: "pixels",
          radiusMinPixels: 4,
          radiusMaxPixels: 16,
          getFillColor: [167, 85, 247, 255],  // bright purple, full opacity
          getLineColor: [255, 255, 255, 220],
          lineWidthMinPixels: 1.5,
          stroked: true,
          pickable: true,
          onClick: handleClick,
          updateTriggers: { getPosition: [entities] },
        }),

        // ── Vessels – bright cyan dots, white-ringed ─────────────────────
        new ScatterplotLayer<UnifiedEntity>({
          id: "crep-vessels",
          data: vessels,
          getPosition: getPos,
          getRadius: 6,
          radiusUnits: "pixels",
          radiusMinPixels: 5,
          radiusMaxPixels: 18,
          getFillColor: [56, 189, 248, 255],  // bright cyan, full opacity
          getLineColor: [255, 255, 255, 220],
          lineWidthMinPixels: 2,
          stroked: true,
          pickable: true,
          onClick: handleClick,
          updateTriggers: { getPosition: [entities] },
        }),

        // ── Aircraft – bright amber dots, larger than infra, white-ringed ──
        new ScatterplotLayer<UnifiedEntity>({
          id: "crep-aircraft",
          data: aircraft,
          getPosition: getPos,
          getRadius: 7,
          radiusUnits: "pixels",
          radiusMinPixels: 6,
          radiusMaxPixels: 22,
          getFillColor: [251, 182, 36, 255],  // bright amber, full opacity
          getLineColor: [255, 255, 255, 255],
          lineWidthMinPixels: 2,
          stroked: true,
          pickable: true,
          onClick: handleClick,
          updateTriggers: { getPosition: [entities] }, // Re-render when positions update
        }),

        // ── Biodiversity observations (fungal + all species) ─────────────
        ...(fungal.length > 0
          ? [
              new ScatterplotLayer<UnifiedEntity>({
                id: "crep-fungal",
                data: fungal,
                getPosition: getPos,
                getRadius: 4,
                radiusUnits: "pixels",
                radiusMinPixels: 3,
                radiusMaxPixels: 12,
                getFillColor: (e) => {
                  const c = fungalEntityColor(e);
                  return [c[0], c[1], c[2], Math.min(c[3] ?? 255, 160)] as RGBA;
                },
                getLineColor: [255, 255, 255, 100],
                lineWidthMinPixels: 1,
                stroked: true,
                pickable: true,
                onClick: handleClick,
              }),
            ]
          : []),
      ],
    });
  }, [resolvedMap, entities, visible, onEntityClick, extraLayers, useGlobeMode]);

  // This component produces no DOM output – it controls the deck.gl overlay
  return null;
}
