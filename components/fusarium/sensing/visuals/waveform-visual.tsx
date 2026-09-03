import type { ScalarSample, VisualDataState, VisualProvenance } from "@/lib/fusarium/sensing-visuals/contracts"
import { pointsToPath, samplesToPoints, sampleExtent } from "@/lib/fusarium/sensing-visuals/transforms"
import { ChartGrid, VisualFrame, sensingVisualStyles as styles } from "./visual-frame"

export function WaveformVisual({ title, samples, unit, state = samples.length ? "ready" : "idle", provenance, color = "#34d399", subtitle = "Time-domain signal" }: { title: string; samples: readonly ScalarSample[]; unit: string; state?: VisualDataState; provenance?: VisualProvenance; color?: string; subtitle?: string }) {
  const points = samplesToPoints(samples,600,180); const extent = sampleExtent(samples)
  return <VisualFrame title={title} subtitle={subtitle} state={state} unit={unit} provenance={provenance} legend={extent ? <><span>min <b className={styles.value}>{extent.minimum.toPrecision(4)}</b></span><span>max <b className={styles.value}>{extent.maximum.toPrecision(4)}</b></span></> : null}><svg className={styles.svg} viewBox="0 0 600 180" role="img" aria-label={`${title} waveform`}><ChartGrid/><path className={styles.trace} d={pointsToPath(points)} stroke={color} strokeWidth="2"/></svg></VisualFrame>
}
