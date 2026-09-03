import type { VisualDataState, VisualProvenance } from "@/lib/fusarium/sensing-visuals/contracts"
import { magnitudeSpectrum } from "@/lib/fusarium/sensing-visuals/transforms"
import { ChartGrid, VisualFrame, sensingVisualStyles as styles } from "./visual-frame"

export function SpectrumVisual({ title, values, sampleRateHz, state = values.length ? "ready" : "idle", provenance, color = "#22d3ee" }: { title: string; values: readonly number[]; sampleRateHz: number; state?: VisualDataState; provenance?: VisualProvenance; color?: string }) {
  const bins=magnitudeSpectrum(values,sampleRateHz); const max=Math.max(...bins.map(b=>b.magnitude),1e-9); const width=600/bins.length
  return <VisualFrame title={title} subtitle="Bounded DFT magnitude spectrum" state={state} unit="Hz" provenance={provenance} legend={bins.length ? <span>{bins.length} bins · Nyquist <b className={styles.value}>{(sampleRateHz/2).toFixed(1)} Hz</b></span>:null}><svg className={styles.svg} viewBox="0 0 600 180" role="img" aria-label={`${title} frequency spectrum`}><ChartGrid/>{bins.map((bin,index)=><rect key={bin.frequencyHz} x={index*width+.5} y={178-(bin.magnitude/max)*166} width={Math.max(.5,width-1)} height={(bin.magnitude/max)*166} fill={color} opacity={.34+.66*(bin.magnitude/max)}/>)}</svg></VisualFrame>
}
