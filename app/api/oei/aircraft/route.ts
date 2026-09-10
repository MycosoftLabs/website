/**
 * Thin alias — September 10, 2026
 * GET /api/oei/aircraft → same handler as /api/oei/flightradar24
 * (aircraft registry already includes OpenSky / ADS-B).
 */
export { GET } from "@/app/api/oei/flightradar24/route"
export const dynamic = "force-dynamic"
