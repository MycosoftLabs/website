import type { Metadata } from "next"
import { NeuromorphicTestPage } from "@/components/ui/neuromorphic/NeuromorphicTestPage"

export const metadata: Metadata = {
  title: "Neuromorphic UI – Component Library | Mycosoft",
  description:
    "Neuromorphic UI component library test page. Accessible, animated, modern design patterns.",
}

export default function NeuromorphicUIPage() {
  return <NeuromorphicTestPage />
}
