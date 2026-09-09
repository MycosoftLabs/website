"use client"

import { useEffect, useRef } from "react"
import { hasGoogleMapsApiKey, loadGoogleMaps } from "@/lib/google-maps-loader"
import { AO_ORIGIN_LAT, AO_ORIGIN_LNG, AO_PLACE } from "@/lib/itdx/replay-core.mjs"

/**
 * Inset Google Maps JS TrafficLayer + Directions for Fort Stewart.
 * Renders only when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is present. Never prints the key.
 */
export function ITDXGoogleTrafficOverlay() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!hasGoogleMapsApiKey() || !hostRef.current) return
    let cancelled = false
    let directionsRenderer: google.maps.DirectionsRenderer | null = null
    let traffic: google.maps.TrafficLayer | null = null

    void loadGoogleMaps(["places"])
      .then(() => {
        if (cancelled || !hostRef.current || !window.google?.maps) return
        const center = { lat: AO_ORIGIN_LAT, lng: AO_ORIGIN_LNG }
        const gmap = new google.maps.Map(hostRef.current, {
          center,
          zoom: 12,
          disableDefaultUI: true,
          mapTypeControl: false,
          gestureHandling: "cooperative",
        })
        traffic = new google.maps.TrafficLayer()
        traffic.setMap(gmap)
        directionsRenderer = new google.maps.DirectionsRenderer({ map: gmap, suppressMarkers: false })
        const service = new google.maps.DirectionsService()
        service.route(
          {
            origin: AO_PLACE,
            destination: center,
            travelMode: google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (cancelled || status !== google.maps.DirectionsStatus.OK || !result) return
            directionsRenderer?.setDirections(result)
          },
        )
      })
      .catch(() => {
        /* Intel Feed already shows NOT_SUPPLIED when the script cannot load. */
      })

    return () => {
      cancelled = true
      traffic?.setMap(null)
      directionsRenderer?.setMap(null)
    }
  }, [])

  if (!hasGoogleMapsApiKey()) return null

  return (
    <div
      ref={hostRef}
      data-testid="itdx-google-traffic"
      style={{
        width: "100%",
        height: 168,
        marginTop: 8,
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid #304950",
      }}
      aria-label="Google Maps live traffic inset for Fort Stewart"
    />
  )
}
