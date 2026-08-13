"use client";

/**
 * useContactIntel — folds the stateless 1 Hz detection poll into a persistent tactical picture.
 *
 * The detector has no tracker (`deepstream:false`, `trackId:null`), so every frame arrives with no
 * memory of the last one. This hook supplies the memory: it feeds each frame's detections — resolved
 * to TRUE bearings — into the pure reducer in contactIntel.ts, which confirms contacts over time,
 * suppresses moored-scenery clutter, fits bearing rate, and flags CBDR collision geometry.
 *
 * CRITICAL: the reducer carries per-contact observation history on the returned state. It must be fed
 * back VERBATIM — hence the ref. Rebuilding contacts field-by-field would silently reset every track
 * to "tentative" and disable the whole temporal layer.
 */

import { useEffect, useRef, useState } from "react";
import type { CameraDetection } from "@/lib/psathyrella/contract";
import { detectionBearing, type DetectionSource, type TrackGeometry } from "@/lib/psathyrella/targetTracking";
import { classifyDetection } from "@/lib/psathyrella/maritimeOntology";
import { emptyIntelState, ingestFrame, summarize, type IntelState, type ContactObservation } from "@/lib/psathyrella/contactIntel";

export interface ContactIntelApi {
  state: IntelState;
  summary: ReturnType<typeof summarize>;
}

export function useContactIntel(
  input: { tMs: number | null; detections: CameraDetection[]; source: DetectionSource; geometry: TrackGeometry; enabled?: boolean },
): ContactIntelApi {
  const stateRef = useRef<IntelState>(emptyIntelState());
  const [, bump] = useState(0);
  const lastTRef = useRef<number | null>(null);

  const { tMs, detections, source, geometry, enabled = true } = input;

  useEffect(() => {
    if (!enabled || tMs === null) return;
    // One ingest per distinct frame timestamp — re-renders must not double-count a frame into history.
    if (lastTRef.current === tMs) return;
    lastTRef.current = tMs;

    const observations: ContactObservation[] = [];
    const labels: Array<{ label: string; group: string }> = [];
    for (const det of detections) {
      const b = detectionBearing(det, source, geometry);
      if (!b) continue; // no honest bearing ⇒ it cannot enter the tactical picture
      const c = classifyDetection(det.cls);
      observations.push({
        tMs,
        bearingTrueDeg: b.trueDeg,
        bearingRelDeg: b.relativeDeg,
        // Range PROXY only — the box diagonal in normalized units. No rangefinder is fitted.
        sizeProxy: Math.hypot(det.bbox.w, det.bbox.h),
        conf: det.conf,
        source,
      });
      labels.push({ label: c.displayLabel, group: c.group });
    }

    stateRef.current = ingestFrame(stateRef.current, { tMs, observations, labels });
    bump((n) => n + 1);
  }, [enabled, tMs, detections, source, geometry]);

  return { state: stateRef.current, summary: summarize(stateRef.current) };
}
