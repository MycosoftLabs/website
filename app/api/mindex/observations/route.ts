/**
 * Observations API Route (BFF Proxy)
 *
 * Proxies requests to MINDEX observation endpoints
 */

import { type NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"
import { searchObservations, getObservationsByLocation } from "@/lib/integrations/mindex"
import { mockObservations } from "@/lib/integrations/mock-data"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const radius = searchParams.get("radius")
  const page = Number.parseInt(searchParams.get("page") || "1")
  const pageSize = Number.parseInt(searchParams.get("pageSize") || "20")

  // Return mock data if integrations disabled
  if (!env.integrationsEnabled) {
    let filtered = mockObservations

    if (query) {
      filtered = filtered.filter(
        (o) =>
          o.taxon?.scientificName.toLowerCase().includes(query.toLowerCase()) ||
          o.taxon?.commonName?.toLowerCase().includes(query.toLowerCase()) ||
          o.notes?.toLowerCase().includes(query.toLowerCase()),
      )
    }

    if (lat && lng) {
      const targetLat = Number.parseFloat(lat)
      const targetLng = Number.parseFloat(lng)
      const radiusKm = Number.parseFloat(radius || "10")
      filtered = filtered.filter((o) => {
        const distance = Math.sqrt(
          Math.pow(o.location.latitude - targetLat, 2) + Math.pow(o.location.longitude - targetLng, 2),
        )
        return distance <= radiusKm / 111 // Rough km to degrees conversion
      })
    }

    return NextResponse.json({
      data: filtered.slice((page - 1) * pageSize, page * pageSize),
      meta: { total: filtered.length, page, pageSize, hasMore: filtered.length > page * pageSize },
    })
  }

  try {
    let result

    if (lat && lng) {
      result = await getObservationsByLocation(
        Number.parseFloat(lat),
        Number.parseFloat(lng),
        Number.parseFloat(radius || "10"),
      )
    } else if (query) {
      result = await searchObservations({ query, page, pageSize })
    } else {
      result = await searchObservations({ query: "*", page, pageSize })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching observations:", error)
    return NextResponse.json({ error: "Failed to fetch observations", code: "MINDEX_ERROR" }, { status: 500 })
  }
}
