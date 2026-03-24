"use client";

/**
 * Infrastructure Layer — Renders infrastructure data on the CREP map
 *
 * Fetches data from /api/oei/overpass for power plants, factories, mines,
 * pipelines, power lines, solar/wind farms, cell towers, military bases, etc.
 * Also integrates submarine cables from /api/oei/submarine-cables.
 *
 * Uses deck.gl ScatterplotLayer for points and PathLayer for linear features.
 */

import { useEffect, useState, useCallback, useRef, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface InfrastructureFeature {
  id: string;
  type: string;
  lat: number;
  lng: number;
  name?: string;
  tags: Record<string, string>;
  // For linear features (pipelines, power lines, cables)
  path?: [number, number][];
}

export interface SubmarineCable {
  id: string;
  name: string;
  color: string;
  length_km?: number;
  rfs?: string;
  owners?: string;
  coordinates: [number, number][];
}

export interface InfrastructureData {
  features: InfrastructureFeature[];
  cables: SubmarineCable[];
  landingPoints: InfrastructureFeature[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Category definitions
// ═══════════════════════════════════════════════════════════════════════════

export interface InfraCategory {
  id: string;
  label: string;
  types: string[];
  color: string;
  icon: string; // emoji
}

export const INFRA_CATEGORIES: InfraCategory[] = [
  {
    id: "energy",
    label: "Energy",
    types: ["power_plant", "solar_farm", "wind_farm", "substation", "refinery", "oil_gas"],
    color: "#f59e0b",
    icon: "⚡",
  },
  {
    id: "industrial",
    label: "Industrial",
    types: ["factory", "mine"],
    color: "#ef4444",
    icon: "🏭",
  },
  {
    id: "water",
    label: "Water",
    types: ["water_treatment"],
    color: "#3b82f6",
    icon: "💧",
  },
  {
    id: "telecom",
    label: "Telecom",
    types: ["cell_tower", "data_center"],
    color: "#8b5cf6",
    icon: "📡",
  },
  {
    id: "transport",
    label: "Transport",
    types: ["pipeline", "power_line"],
    color: "#6b7280",
    icon: "🔌",
  },
  {
    id: "military",
    label: "Military",
    types: ["military_base"],
    color: "#16a34a",
    icon: "🎖️",
  },
  {
    id: "services",
    label: "Services",
    types: ["hospital", "pharmacy", "fire_station", "police", "school", "university"],
    color: "#ec4899",
    icon: "🏥",
  },
  {
    id: "cables",
    label: "Submarine Cables",
    types: ["submarine_cable"],
    color: "#06b6d4",
    icon: "🌊",
  },
];

export const INFRA_TYPE_COLORS: Record<string, string> = {
  power_plant: "#f59e0b",
  solar_farm: "#fbbf24",
  wind_farm: "#a3e635",
  substation: "#d97706",
  refinery: "#dc2626",
  oil_gas: "#991b1b",
  factory: "#ef4444",
  mine: "#b91c1c",
  water_treatment: "#3b82f6",
  cell_tower: "#8b5cf6",
  data_center: "#7c3aed",
  pipeline: "#9ca3af",
  power_line: "#fbbf24",
  military_base: "#16a34a",
  hospital: "#ec4899",
  pharmacy: "#f472b6",
  fire_station: "#ef4444",
  police: "#3b82f6",
  school: "#8b5cf6",
  university: "#6d28d9",
  submarine_cable: "#06b6d4",
};

export const INFRA_TYPE_ICONS: Record<string, string> = {
  power_plant: "⚡",
  solar_farm: "☀️",
  wind_farm: "💨",
  substation: "🔌",
  refinery: "🛢️",
  oil_gas: "🛢️",
  factory: "🏭",
  mine: "⛏️",
  water_treatment: "💧",
  cell_tower: "📡",
  data_center: "🖥️",
  pipeline: "🔧",
  power_line: "⚡",
  military_base: "🎖️",
  hospital: "🏥",
  pharmacy: "💊",
  fire_station: "🚒",
  police: "🚔",
  school: "🏫",
  university: "🎓",
  submarine_cable: "🌊",
};

// ═══════════════════════════════════════════════════════════════════════════
// Data fetching hook
// ═══════════════════════════════════════════════════════════════════════════

interface UseInfrastructureDataOptions {
  enabledTypes: string[];
  bounds?: { north: number; south: number; east: number; west: number };
  enabled?: boolean;
}

// Cache infrastructure data per bbox+types to avoid re-fetching on every render
const infraCache = new Map<string, { data: InfrastructureFeature[]; ts: number }>();
const INFRA_CACHE_TTL = 10 * 60 * 1000; // 10 minutes client-side

export function useInfrastructureData({ enabledTypes, bounds, enabled = true }: UseInfrastructureDataOptions) {
  const [features, setFeatures] = useState<InfrastructureFeature[]>([]);
  const [cables, setCables] = useState<SubmarineCable[]>([]);
  const [landingPoints, setLandingPoints] = useState<InfrastructureFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchRef = useRef(0);

  const fetchInfra = useCallback(async () => {
    if (!enabled || enabledTypes.length === 0 || !bounds) return;

    const fetchId = ++fetchRef.current;
    const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;

    // Filter out cable type — handled separately
    const overpassTypes = enabledTypes.filter(t => t !== "submarine_cable");
    const wantCables = enabledTypes.includes("submarine_cable");

    setLoading(true);

    try {
      const promises: Promise<void>[] = [];

      // Fetch infrastructure from Overpass
      if (overpassTypes.length > 0) {
        const cacheKey = `${overpassTypes.sort().join(",")}-${bbox}`;
        const cached = infraCache.get(cacheKey);

        if (cached && Date.now() - cached.ts < INFRA_CACHE_TTL) {
          if (fetchId === fetchRef.current) setFeatures(cached.data);
        } else {
          promises.push(
            fetch(`/api/oei/overpass?types=${overpassTypes.join(",")}&bbox=${bbox}`)
              .then(r => r.ok ? r.json() : { features: [] })
              .then(data => {
                const feats = (data.features || []).map((f: any) => ({
                  id: `infra-${f.id}`,
                  type: f.type || "unknown",
                  lat: f.lat,
                  lng: f.lon || f.lng,
                  name: f.tags?.name || f.tags?.operator || f.type,
                  tags: f.tags || {},
                }));
                infraCache.set(cacheKey, { data: feats, ts: Date.now() });
                if (fetchId === fetchRef.current) setFeatures(feats);
              })
              .catch(() => {})
          );
        }
      }

      // Fetch submarine cables
      if (wantCables) {
        promises.push(
          fetch("/api/oei/submarine-cables")
            .then(r => r.ok ? r.json() : { cables: [], landingPoints: [] })
            .then(data => {
              if (fetchId !== fetchRef.current) return;
              setCables(data.cables || []);
              setLandingPoints(
                (data.landingPoints || []).map((lp: any) => ({
                  id: `lp-${lp.id}`,
                  type: "submarine_cable",
                  lat: lp.latitude,
                  lng: lp.longitude,
                  name: lp.name,
                  tags: { country: lp.country },
                }))
              );
            })
            .catch(() => {})
        );
      }

      await Promise.all(promises);
    } finally {
      if (fetchId === fetchRef.current) setLoading(false);
    }
  }, [enabled, enabledTypes, bounds]);

  // Debounced fetch on bounds/types change
  useEffect(() => {
    const t = setTimeout(fetchInfra, 800);
    return () => clearTimeout(t);
  }, [fetchInfra]);

  return { features, cables, landingPoints, loading };
}

// ═══════════════════════════════════════════════════════════════════════════
// Widget content for infrastructure popups
// ═══════════════════════════════════════════════════════════════════════════

export function getInfraWidgetContent(feature: InfrastructureFeature): { label: string; value: string }[] {
  const items: { label: string; value: string }[] = [];
  const t = feature.tags;

  items.push({ label: "Type", value: feature.type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) });
  if (t.name) items.push({ label: "Name", value: t.name });
  if (t.operator) items.push({ label: "Operator", value: t.operator });

  // Type-specific fields
  switch (feature.type) {
    case "power_plant":
      if (t["plant:source"]) items.push({ label: "Fuel", value: t["plant:source"] });
      if (t["plant:output:electricity"]) items.push({ label: "Capacity", value: t["plant:output:electricity"] });
      break;
    case "solar_farm":
    case "wind_farm":
      if (t["plant:output:electricity"]) items.push({ label: "Capacity", value: t["plant:output:electricity"] });
      if (t.modules) items.push({ label: "Modules", value: t.modules });
      break;
    case "factory":
      if (t.product) items.push({ label: "Product", value: t.product });
      if (t.industry) items.push({ label: "Industry", value: t.industry });
      break;
    case "mine":
      if (t.resource) items.push({ label: "Resource", value: t.resource });
      break;
    case "oil_gas":
    case "refinery":
      if (t.product) items.push({ label: "Product", value: t.product });
      break;
    case "cell_tower":
      if (t["communication:mobile_phone"]) items.push({ label: "Mobile", value: t["communication:mobile_phone"] });
      if (t.height) items.push({ label: "Height", value: `${t.height}m` });
      break;
    case "military_base":
      if (t.military) items.push({ label: "Installation", value: t.military });
      if (t.description) items.push({ label: "Description", value: t.description });
      break;
    case "pipeline":
      if (t.substance) items.push({ label: "Substance", value: t.substance });
      if (t.diameter) items.push({ label: "Diameter", value: t.diameter });
      break;
    case "power_line":
      if (t.voltage) items.push({ label: "Voltage", value: `${t.voltage}V` });
      if (t.cables) items.push({ label: "Cables", value: t.cables });
      break;
    case "water_treatment":
      if (t.capacity) items.push({ label: "Capacity", value: t.capacity });
      break;
    case "hospital":
      if (t.beds) items.push({ label: "Beds", value: t.beds });
      if (t.emergency) items.push({ label: "Emergency", value: t.emergency });
      break;
  }

  if (t.website) items.push({ label: "Website", value: t.website });
  if (t.phone) items.push({ label: "Phone", value: t.phone });
  if (t["addr:full"] || t["addr:street"]) items.push({ label: "Address", value: t["addr:full"] || `${t["addr:street"] || ""} ${t["addr:city"] || ""}`.trim() });

  return items;
}
