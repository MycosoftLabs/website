/**
 * RECONSTRUCTED faithful shim (see lib/geo/crep-map-fly-to.ts header). Returns the Google
 * 3D-Tiles API key for v3 photoreal tiles, from the public env var already used elsewhere in the
 * app; null when unset. Cursor's real version supersedes on sync.
 */
export function useGoogleTilesApiKey(): { key: string | null } {
  const key =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_TILES_API_KEY ??
    null
  return { key }
}
