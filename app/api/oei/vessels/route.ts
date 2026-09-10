/**
 * Thin alias — September 10, 2026
 * GET /api/oei/vessels → same handler as /api/oei/aisstream.
 */
export { GET } from "@/app/api/oei/aisstream/route"
export const dynamic = "force-dynamic"
