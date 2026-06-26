"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { type BuoyTelemetry, type SensorContact } from "@/lib/psathyrella/contract";
import { NoFeed, ViewBadge } from "@/components/psathyrella/ui";
import { ScopePPI } from "./ScopePPI";

type Layer = "radar" | "lidar" | "wifi";

export default function BlueSightView({ telemetry, className }: { telemetry: BuoyTelemetry; className?: string }) {
  const [layers, setLayers] = useState<Record<Layer, boolean>>({ radar: true, lidar: true, wifi: true });
  const active = telemetry.radar.active || telemetry.lidar.active || telemetry.bluesight.active;

  const contacts: SensorContact[] = [
    ...(layers.radar ? telemetry.radar.contacts : []),
    ...(layers.lidar ? telemetry.lidar.contacts : []),
    ...(layers.wifi ? telemetry.bluesight.wifi : []),
  ];
  const maxRangeM = Math.max(telemetry.radar.maxRangeM, telemetry.lidar.maxRangeM);

  const toggle = (k: Layer) => setLayers((l) => ({ ...l, [k]: !l[k] }));

  return (
    <div className={cn("relative h-full w-full bg-[#060912]", className)}>
      <ViewBadge>BlueSight · radar + lidar + wifi-sense</ViewBadge>
      <ScopePPI contacts={contacts} maxRangeM={maxRangeM} active={active} headingDeg={telemetry.pose.headingDeg} variant="fusion" />

      <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
        {(["radar", "lidar", "wifi"] as Layer[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => toggle(k)}
            className={cn(
              "rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors",
              layers[k] ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-200" : "border-white/10 text-slate-500 hover:text-slate-300"
            )}
          >
            {k}
          </button>
        ))}
      </div>

      {!active && <NoFeed label="No Fusion Feed" sub="radar · lidar · wifi-sense — awaiting backend" />}
    </div>
  );
}
