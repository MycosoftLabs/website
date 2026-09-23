/**
 * Canonical tool URLs for anonymous users.
 *
 * Former `/apps/*` suite URLs permanently redirect to these NatureOS paths.
 * Marketing nav and portals must link here. Top NatureOS tools use canonical
 * `/natureos/*` paths (May 2026 reorg); old `/natureos/tools/*` URLs for
 * primary apps redirect permanently where noted below.
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
