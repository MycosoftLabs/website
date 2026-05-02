/**
 * Canonical tool URLs for anonymous users.
 *
 * `/apps/*` is authenticated at middleware (except a tiny allowlist), so marketing
 * nav and portals must link here — same UI as `/apps/*` but served under
 * `/natureos/tools/*` simulators without a login redirect. Top NatureOS apps
 * use canonical `/natureos/*` paths (May 2026 reorg); old `/natureos/tools/*`
 * URLs redirect permanently.
 */
export const PUBLIC_TOOL_HREFS = {
  earthSimulator: "/natureos/earth-simulator",
  petriDish: "/natureos/virtual-petri-dish",
  compoundSim: "/natureos/compound-analyser",
  mushroomSim: "/natureos/biology-simulator",
  sporeTracker: "/natureos/aerosol",
  growthAnalytics: "/natureos/growth-analytics",
  physicsSim: "/natureos/tools/physics-sim",
  digitalTwin: "/natureos/tools/digital-twin",
  lifecycleSim: "/natureos/tools/lifecycle-sim",
  geneticCircuit: "/natureos/tools/genetic-circuit",
  symbiosis: "/natureos/tools/symbiosis",
  retrosynthesis: "/natureos/tools/retrosynthesis",
  alchemyLab: "/natureos/tools/alchemy-lab",
} as const

/** Public CREP map (same loader as /dashboard/crep for signed-in users). */
export const PUBLIC_CREP_HREF = "/natureos/crep"
