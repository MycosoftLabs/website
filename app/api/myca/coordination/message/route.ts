/**
 * Post to desktop coordination mesh — proxies MAS POST /api/coordination/message
 * Owner/superuser only. Date: May 19, 2026
 */

import { type NextRequest } from "next/server"
import { proxyMasPost } from "@/lib/myca/mas-coordination-proxy"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  return proxyMasPost(request, "/api/coordination/message", { requireOwner: true })
}
