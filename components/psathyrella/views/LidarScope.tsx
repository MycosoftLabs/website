"use client";

import { cn } from "@/lib/utils";
import type { BuoyTelemetry } from "@/lib/psathyrella/contract";
import { NoFeed, ViewBadge } from "@/components/psathyrella/ui";
import { ScopePPI } from "./ScopePPI";

export default function LidarScope({ telemetry, className }: { telemetry: BuoyTelemetry; className?: string }) {
  const f = telemetry.lidar;
  return (
    <div className={cn("relative h-full w-full bg-[#060912]", className)}>
      <ViewBadge>Lidar · 360° color · {f.maxRangeM} m</ViewBadge>
      <ScopePPI contacts={f.contacts} maxRangeM={f.maxRangeM} active={f.active} headingDeg={telemetry.pose.headingDeg} variant="lidar" />
      {!f.active && <NoFeed label="No Lidar Feed" sub="360° color lidar — awaiting backend" />}
    </div>
  );
}
