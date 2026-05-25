/**
 * MYCA OpenAPI export — proxies MAS GET /api/myca/openapi
 * Date: May 19, 2026
 */

import { type NextRequest } from "next/server"
import { proxyMasGet } from "@/lib/myca/mas-coordination-proxy"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  return proxyMasGet(request, "/api/myca/openapi")
}
