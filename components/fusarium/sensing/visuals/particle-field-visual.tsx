import type { ScalarSample, VisualDataState, VisualProvenance } from "@/lib/fusarium/sensing-visuals/contracts"
import { samplesToPoints } from "@/lib/fusarium/sensing-visuals/transforms"
import { ChartGrid, VisualFrame, sensingVisualStyles as styles } from "./visual-frame"

export function ParticleFieldVisual({ title, samples, unit, state = samples.length ? "ready" : "idle", provenance }: { title: string; samples: readonly ScalarSample[]; unit: string; state?: VisualDataState; provenance?: VisualProvenance }) {
  const points = samplesToPoints(samples, 600, 180)
  return <VisualFrame title={title} subtitle="Observed sample distribution · position is sample order, not particle trajectory" state={state} unit={unit} provenance={provenance} emptyMessage="No verified particle sample series is bound for this scope.">
    <svg className={styles.svg} viewBox="0 0 600 180" role="img" aria-label={`${title} particle sample distribution`}>
      <ChartGrid />
      {points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r={2.5 + Math.min(5, Math.abs(samples[index]?.value ?? 0) / 20)} fill="rgba(251,146,60,.78)" stroke="rgba(254,215,170,.85)" strokeWidth=".7"><title>{`${samples[index]?.value ?? 0} ${unit}`}</title></circle>)}
    </svg>
  </VisualFrame>
}
