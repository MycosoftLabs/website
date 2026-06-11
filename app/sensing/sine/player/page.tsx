import { SineAcousticPlayer } from "@/components/sensing/sine-acoustic-player"

export const metadata = {
  title: "SINE Acoustic Player | Mycosoft",
  description:
    "MINDEX-backed acoustic library player with oscilloscope waveform, spectrogram, detector evidence, and model-proof gates.",
}

export default function SinePlayerPage() {
  return <SineAcousticPlayer />
}
