import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "NLM² — Nature Learning Model | Mycosoft",
  description:
    "Nature-native intelligence: NLM learns from synchronized Earth telemetry—fungi first via FCI, then plants and ecosystems. Scientific instrument, not a generic LLM page.",
  openGraph: {
    title: "NLM² — Nature Learning Model | Mycosoft",
    description:
      "Subterranean science: bioelectric signals, NMF provenance, MINDEX + NatureOS + MYCA. Training lab at /natureos/model-training.",
  },
}

export default function NLM2Layout({ children }: { children: React.ReactNode }) {
  return children
}
