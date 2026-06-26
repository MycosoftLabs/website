"use client";

import { cn } from "@/lib/utils";
import type { BuoyTelemetry } from "@/lib/psathyrella/contract";
import { NoFeed, ViewBadge } from "@/components/psathyrella/ui";
import { ScopePPI } from "./ScopePPI";

export default function RadarScope({ telemetry, className }: { telemetry: BuoyTelemetry; className?: string }) {
  const f = telemetry.radar;
  return (
    <div className={cn("relative h-full w-full bg-[#060912]", className)}>
      <ViewBadge>Radar · {(f.maxRangeM / 1000).toFixed(1)} km</ViewBadge>
      <ScopePPI contacts={f.contacts} maxRangeM={f.maxRangeM} active={f.active} headingDeg={telemetry.pose.headingDeg} variant="radar" />
      {!f.active && <NoFeed label="No Radar Feed" sub="marine radar — awaiting backend" />}
    </div>
  );
}
