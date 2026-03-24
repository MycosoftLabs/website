"use client";

/**
 * Viewport-Aware Live Stats Panel
 *
 * Replaces the static world population counter with live,
 * viewport-aware statistics showing counts of all visible
 * items in the current map viewport.
 */

import { useMemo } from "react";
import {
  Plane, Ship, Satellite, TreePine, AlertTriangle,
  Cpu, Zap, Factory, Radio, Shield
} from "lucide-react";

interface ViewportStatsProps {
  aircraft: number;
  vessels: number;
  satellites: number;
  observations: number;
  events: number;
  devices: number;
  infrastructure: number;
  militaryBases: number;
  telecomTowers: number;
  mapZoom: number;
  bounds?: { north: number; south: number; east: number; west: number };
}

interface StatItem {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}

export default function ViewportStats({
  aircraft,
  vessels,
  satellites,
  observations,
  events,
  devices,
  infrastructure,
  militaryBases,
  telecomTowers,
  mapZoom,
  bounds,
}: ViewportStatsProps) {
  const stats = useMemo<StatItem[]>(() => {
    const items: StatItem[] = [];

    if (observations > 0) items.push({ icon: <TreePine className="w-3 h-3" />, label: "Nature", value: observations, color: "text-green-400" });
    if (events > 0) items.push({ icon: <AlertTriangle className="w-3 h-3" />, label: "Events", value: events, color: "text-yellow-400" });
    if (aircraft > 0) items.push({ icon: <Plane className="w-3 h-3" />, label: "Aircraft", value: aircraft, color: "text-sky-400" });
    if (vessels > 0) items.push({ icon: <Ship className="w-3 h-3" />, label: "Vessels", value: vessels, color: "text-teal-400" });
    if (satellites > 0) items.push({ icon: <Satellite className="w-3 h-3" />, label: "Satellites", value: satellites, color: "text-purple-400" });
    if (devices > 0) items.push({ icon: <Cpu className="w-3 h-3" />, label: "Devices", value: devices, color: "text-cyan-400" });
    if (infrastructure > 0) items.push({ icon: <Factory className="w-3 h-3" />, label: "Infrastructure", value: infrastructure, color: "text-amber-400" });
    if (militaryBases > 0) items.push({ icon: <Shield className="w-3 h-3" />, label: "Military", value: militaryBases, color: "text-emerald-400" });
    if (telecomTowers > 0) items.push({ icon: <Radio className="w-3 h-3" />, label: "Telecom", value: telecomTowers, color: "text-violet-400" });

    return items;
  }, [aircraft, vessels, satellites, observations, events, devices, infrastructure, militaryBases, telecomTowers]);

  const total = stats.reduce((sum, s) => sum + s.value, 0);

  // Determine viewport scope description
  const scopeLabel = useMemo(() => {
    if (!bounds) return "Global";
    const latSpan = bounds.north - bounds.south;
    const lngSpan = bounds.east - bounds.west;
    if (latSpan > 120) return "Global";
    if (latSpan > 40) return "Continental";
    if (latSpan > 10) return "Regional";
    if (latSpan > 2) return "State/Province";
    if (latSpan > 0.5) return "Metro Area";
    return "Local";
  }, [bounds]);

  if (stats.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Scope header */}
      <div className="flex items-center justify-between text-[9px] text-gray-500 px-1">
        <span>{scopeLabel} View</span>
        <span>{total.toLocaleString()} items tracked</span>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-3 gap-1">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-1 px-1.5 py-1 rounded bg-white/5 border border-white/5"
          >
            <span className={stat.color}>{stat.icon}</span>
            <div className="min-w-0">
              <div className={`text-[10px] font-mono font-bold ${stat.color}`}>
                {stat.value.toLocaleString()}
              </div>
              <div className="text-[7px] text-gray-500 truncate">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Zoom indicator */}
      <div className="flex items-center gap-2 text-[8px] text-gray-600 px-1">
        <Zap className="w-2.5 h-2.5" />
        <span>Zoom {mapZoom.toFixed(1)} — LOD: {mapZoom < 3 ? "low" : mapZoom < 6 ? "medium" : "high"}</span>
      </div>
    </div>
  );
}
