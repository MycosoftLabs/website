import type { DeviceSensorSampleSeries, ScalarSample, VisualDataState } from "@/lib/fusarium/sensing-visuals/contracts"
import { validateDeviceSensorSampleSeries } from "@/lib/fusarium/sensing-visuals/contracts"
import { HeatFieldVisual } from "./heat-field-visual"
import { HistogramVisual } from "./histogram-visual"
import { ParticleFieldVisual } from "./particle-field-visual"
import { MultichannelTraceVisual } from "./multichannel-trace-visual"
import { SpectrumVisual } from "./spectrum-visual"
import { WaveformVisual } from "./waveform-visual"
import { FciInstrumentVisual } from "./fci-instrument-visual"

const visualState = (series: DeviceSensorSampleSeries, issues: readonly string[]): VisualDataState => issues.length ? "unavailable" : series.state === "available" ? "ready" : series.state === "error" ? "unavailable" : series.state
const samples = (series: DeviceSensorSampleSeries): ScalarSample[] => series.values.map((value,index)=>({ timestamp:series.timestamps[index]!, value }))

/** Adapter target for device discovery. It never fetches and never manufactures a missing sample. */
export function DeviceSensorVisualPanel({ series, sampleRateHz, title }: { series: DeviceSensorSampleSeries; sampleRateHz?: number; title?: string }) {
  const issues=validateDeviceSensorSampleSeries(series); const state=visualState(series,issues); const supplied=samples(series)
  const label=title??`${series.modality} · ${series.sensorId}`
  if ((series.modality==="thermal" || series.modality==="gas-voc") && series.width && series.height) return <HeatFieldVisual title={label} field={{width:series.width,height:series.height,values:series.values,unit:series.unit}} state={state} provenance={series.provenance} subtitle={issues[0]??`${series.modality} spatial field`}/>
  if (series.modality==="particulate") return <ParticleFieldVisual title={label} samples={supplied} unit={series.unit} state={state} provenance={series.provenance}/>
  if (series.channels?.length && series.channels.length > 1 && series.values.length % series.channels.length===0) {
    const channelLength=series.values.length/series.channels.length
    return <MultichannelTraceVisual title={label} state={state} provenance={series.provenance} channels={series.channels.map((channel,index)=>({id:channel,label:channel,unit:series.unit,samples:series.values.slice(index*channelLength,(index+1)*channelLength).map((value,sampleIndex)=>({timestamp:series.timestamps[sampleIndex]!,value}))}))}/>
  }
  if (series.modality==="bioelectric" && sampleRateHz) return <FciInstrumentVisual title={label} series={series} sampleRateHz={sampleRateHz} state={state}/>
  if (series.modality==="microphone" && sampleRateHz) return <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,320px),1fr))",gap:12}}><WaveformVisual title={label} samples={supplied} unit={series.unit} state={state} provenance={series.provenance}/><SpectrumVisual title={`${label} spectrum`} values={series.values} sampleRateHz={sampleRateHz} state={state} provenance={series.provenance}/></div>
  return <WaveformVisual title={label} samples={supplied} unit={series.unit} state={state} provenance={series.provenance} subtitle={issues[0]??`${series.modality} observed values`}/>
}
