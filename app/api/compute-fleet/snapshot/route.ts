import { proxyMasComputeSnapshot } from "@/lib/mas-compute-snapshot-proxy"

export const dynamic = "force-dynamic"

/** @deprecated Prefer `/api/compute/snapshot` — same upstream. */
export async function GET() {
  return proxyMasComputeSnapshot()
}
