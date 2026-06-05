import { SineAcousticPlayer } from "@/components/sensing/sine-acoustic-player"

export const metadata = {
  title: "SINE Acoustic Player | Mycosoft",
  description:
    "MINDEX-backed acoustic library player with waveform, spectrogram, and multi-detector pattern recognition.",
}

export default function SinePlayerPage() {
  return <SineAcousticPlayer />
}
