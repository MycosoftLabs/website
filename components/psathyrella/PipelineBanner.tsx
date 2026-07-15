"use client";

/**
 * Persistent degraded-pipeline banner — sits directly under the SafetyBanner, above the map.
 *
 * Answers the Jul 09 2026 incident: when the Jetson telemetry hub (:8790) is down, MAS can't merge
 * hub pose/radios, so the GCS shows registry SITE position + all radios disconnected — which reads
 * like "GPS/radios broken hardware" when it's really a pipeline outage. This strip names the actual
 * failure so nobody reflashes a healthy Side B or blames the u-blox. It renders nothing when the
 * field pipeline is healthy (or in SIM mode). All logic lives in derivePipelineAlert (single source
 * of truth); this is just the presentation. Freeze-safe: a sibling strip whose 10s SWR re-render
 * touches only itself, never the memoized MapView.
 */

import { AlertTriangle, ServerCog } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BuoyTelemetry } from "@/lib/psathyrella/contract";
import { useEdgeHealth, derivePipelineAlert } from "@/lib/psathyrella/useEdgeHealth";

export function PipelineBanner({ telemetry, simMode }: { telemetry: BuoyTelemetry; simMode: boolean }) {
  const { data } = useEdgeHealth();
  const alert = derivePipelineAlert(data?.hub ?? null, telemetry, simMode);
  if (!alert) return null;

  const crit = alert.level === "crit";
  return (
    <div
      role="status"
      className={cn(
        "z-[70] flex shrink-0 items-center gap-2 border-b px-3 py-1 text-[10px] font-semibold",
        crit ? "border-red-500/50 bg-red-500/15 text-red-100" : "border-amber-500/40 bg-amber-500/[0.12] text-amber-100",
      )}
    >
      {crit ? <AlertTriangle className="h-3.5 w-3.5 shrink-0 animate-pulse" /> : <ServerCog className="h-3.5 w-3.5 shrink-0" />}
      <span className="truncate">{alert.message}</span>
      <span className="ml-auto hidden shrink-0 text-[8px] uppercase tracking-wider opacity-60 sm:inline">check Edge tab</span>
    </div>
  );
}
