import type { Metadata } from "next"
import { BiologySimulatorLanding } from "@/components/natureos/apps/biology-simulator/biology-simulator-landing"
import { mindexProxyHeaders, mindexUrl } from "@/lib/server/mindex-proxy-request"

export const metadata: Metadata = {
  title: "Biology Simulator | NatureOS",
  description:
    "Vision and roadmap for cross-scale biological simulation; links to existing Mycosoft simulators and live MINDEX module probes.",
}

async function probe(label: string, path: string): Promise<{ label: string; path: string; ok: boolean; status: number }> {
  try {
    const res = await fetch(mindexUrl(path), {
      headers: mindexProxyHeaders(),
      next: { revalidate: 120 },
      signal: AbortSignal.timeout(8000),
    })
    return { label, path, ok: res.ok, status: res.status }
  } catch {
    return { label, path, ok: false, status: 0 }
  }
}

export default async function BiologySimulatorPage() {
  const modules = await Promise.all([
    probe("Eagle Eye (video intelligence)", "/api/mindex/eagle/health/stats"),
    probe("Genetics sequences", "/api/mindex/genetics?limit=1"),
    probe("Compounds catalog", "/api/mindex/compounds?limit=1"),
  ])

  return <BiologySimulatorLanding modules={modules} />
}
