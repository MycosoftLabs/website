"use client";

/**
 * Live SINE detections for the buoy, isolated (own SWR, no CREP providers).
 * Chain: status (ready badge) → acoustic library filtered to the buoy → latest blob's
 * saved analysis → detector_events. Each event carries acoustic_domain (water=hydrophone,
 * air=MEMS mic, ground=geophone) + confidence. Honest STANDBY when nothing is detected.
 */

import useSWR from "swr";
import { useMemo } from "react";
import { normalizeSineDomain, type SineDetection } from "./sineClasses";

const f = (u: string) => fetch(u, { cache: "no-store", headers: { accept: "application/json" } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);

export function useSineDetections(deviceToken = "psathyrella") {
  const { data: status } = useSWR("/api/mindex/sine/status", f, { refreshInterval: 12000, revalidateOnFocus: false });
  const live = !!(status && (status.ok ?? true) && (status.model_ready || status.inference_ready || status.model_loaded || status.prototype_catalog_ready));

  const { data: lib } = useSWR(
    `/api/natureos/mindex/library?category=acoustic&limit=4&q=${encodeURIComponent(deviceToken)}`,
    f,
    { refreshInterval: 20000, revalidateOnFocus: false }
  );
  const blobs: any[] = (lib?.blobs || lib?.items || []) as any[];
  const analysisId: string | null = blobs.find((b) => b?.analysis_id)?.analysis_id ?? null;

  const { data: analysis } = useSWR(
    analysisId ? `/api/mindex/sine/blobs/${analysisId}/analysis` : null,
    f,
    { refreshInterval: 20000, revalidateOnFocus: false }
  );

  const detections = useMemo<SineDetection[]>(() => {
    const events: any[] = (analysis?.detector_events || analysis?.events || []) as any[];
    if (!Array.isArray(events) || events.length === 0) return [];
    // Collapse repeats of the same class+domain → keep max confidence + a count.
    const map = new Map<string, SineDetection>();
    for (const e of events) {
      const target = String(e?.event_type || e?.label || e?.event_family || "unknown");
      const domain = normalizeSineDomain(e?.acoustic_domain);
      const conf = typeof e?.confidence === "number" ? e.confidence : typeof e?.score === "number" ? e.score : 0;
      if (conf <= 0) continue;
      const k = `${domain}:${target}`;
      const prev = map.get(k);
      if (prev) {
        prev.count = (prev.count ?? 1) + 1;
        prev.confidence = Math.max(prev.confidence, conf);
      } else {
        map.set(k, { id: k, target, domain, confidence: conf, count: 1 });
      }
    }
    return Array.from(map.values());
  }, [analysis]);

  return { detections, live };
}
