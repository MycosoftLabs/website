import { Oscilloscope } from "@/components/fungi-compute"
import { STFTSpectrogram } from "@/components/fungi-compute/stft-spectrogram"
import type { DeviceSensorSampleSeries, VisualDataState } from "@/lib/fusarium/sensing-visuals/contracts"
import { VisualFrame } from "./visual-frame"

export function FciInstrumentVisual({ title, series, sampleRateHz, state }: { title: string; series: DeviceSensorSampleSeries; sampleRateHz: number; state: VisualDataState }) {
  const signalBuffer = [{
    deviceId: series.deviceId,
    channel: 0,
    samples: [...series.values],
    timestamps: series.timestamps.map((value) => new Date(value).getTime()),
    sampleRate: sampleRateHz,
  }]
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,360px),1fr))", gap: 12 }}>
    <VisualFrame title={title} subtitle="FCI scientific oscilloscope · supplied microvolt samples" state={state} unit={series.unit} provenance={series.provenance}>
      <div style={{ height: 260, minHeight: 260 }}><Oscilloscope className="h-full min-h-0" signalBuffer={signalBuffer} /></div>
    </VisualFrame>
    <VisualFrame title={`${title} · STFT`} subtitle="Short-time Fourier transform · supplied samples" state={state} unit={`${sampleRateHz} Hz`} provenance={series.provenance}>
      <div style={{ height: 260, minHeight: 260 }}><STFTSpectrogram className="h-full min-h-0" signalBuffer={signalBuffer} /></div>
    </VisualFrame>
  </div>
}
