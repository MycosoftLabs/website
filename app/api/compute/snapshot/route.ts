import { proxyMasComputeSnapshot } from "@/lib/mas-compute-snapshot-proxy"

export const dynamic = "force-dynamic"

export async function GET() {
  return proxyMasComputeSnapshot()
}
