/**
 * CREP-specific resource hints — Apr 20, 2026
 *
 * Pre-warms TLS handshakes + DNS lookups for the high-traffic external
 * origins CREP hits the moment the dashboard mounts. Browser starts the
 * TLS negotiation in parallel with the rest of page load → first basemap
 * tile / satellite imagery / fixed-infra fetch begins ~100-300 ms sooner
 * than a cold DNS+TLS round trip.
 *
 * Origins below are the ones that fire on EVERY CREP mount before the
 * user does anything (basemap, terrain, ocean, GIBS, OpenRailwayMap).
 * `dns-prefetch` is the cheap fallback (DNS only, no TLS); `preconnect`
 * does DNS + TLS handshake, so we use it on the most-requested origins.
 *
 * Mounted in app/dashboard/crep/page.tsx via Next.js head injection.
 */

const PRECONNECT_ORIGINS = [
  "https://basemaps.cartocdn.com",         // Carto Dark Matter basemap (every map mount)
  "https://services.arcgisonline.com",      // ESRI World Imagery + Ocean Base (sat + bathymetry)
  "https://s3.amazonaws.com",               // AWS Terrain Tiles (Mapzen DEM hillshade)
  "https://gibs.earthdata.nasa.gov",        // NASA GIBS (cloud + true-color satellite imagery)
  "https://api.mapbox.com",                 // Mapbox satellite-streets + 3D buildings
] as const

const DNS_PREFETCH_ORIGINS = [
  "https://a.tiles.openrailwaymap.org",
  "https://b.tiles.openrailwaymap.org",
  "https://c.tiles.openrailwaymap.org",
  "https://api.rainviewer.com",             // Realistic clouds layer
  "https://tilecache.rainviewer.com",
  "https://services1.arcgis.com",           // FAA UAS + ALERTWildfire
  "https://services6.arcgis.com",
  "https://cwwp2.dot.ca.gov",               // Caltrans CCTV viewer + JSON
  "https://wzmedia.dot.ca.gov",             // Caltrans HLS streams
  "https://opensky-network.org",            // OpenSky aircraft tracks
  "https://data-live.flightradar24.com",    // FR24 click-handler for flight history
  "https://api.windy.com",                  // Windy webcams + weather
  "https://api-v3.amtraker.com",            // Amtrak live trains
  "https://cdn.mbta.com",                   // MBTA realtime
  "https://bwt.cbp.gov",                    // CBP border wait times
  "https://waterdata.ibwc.gov",             // IBWC discharge (Tijuana)
  "https://services.surfline.com",          // Surfline cams metadata
] as const

export function CrepResourceHints() {
  return (
    <>
      {PRECONNECT_ORIGINS.map((href) => (
        <link key={`preconnect-${href}`} rel="preconnect" href={href} crossOrigin="anonymous" />
      ))}
      {DNS_PREFETCH_ORIGINS.map((href) => (
        <link key={`dns-prefetch-${href}`} rel="dns-prefetch" href={href} />
      ))}
    </>
  )
}
