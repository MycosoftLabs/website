/**
 * Ambient modules for packages / paths that ship without usable TS declarations in this repo.
 */

declare module "maplibre-gl/dist/maplibre-gl.css"

declare module "tone" {
  const Tone: Record<string, unknown>
  export default Tone
}
