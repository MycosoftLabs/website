const FUSARIUM_TWIN_ROUTE_MAP = [
  ["/natureos/tools/retrosynthesis", "/fusarium/tools/retrosynthesis", false],
  ["/natureos/tools/digital-twin", "/fusarium/tools/digital-twin", false],
  ["/natureos/tools/physics-sim", "/fusarium/tools/physics-sim", false],
  ["/natureos/tools", "/fusarium/tools", false],
  ["/natureos/virtual-petri-dish2", "/fusarium/virtual-petri-dish2", false],
  ["/natureos/virtual-petri-dish", "/fusarium/virtual-petri-dish", false],
  ["/natureos/nature-statistics", "/fusarium/nature-statistics", false],
  ["/natureos/biology-simulator", "/fusarium/biology-simulator", false],
  ["/natureos/compound-analyser", "/fusarium/compound-analyser", false],
  ["/natureos/growth-analytics", "/fusarium/growth-analytics", false],
  ["/natureos/earth-simulator", "/fusarium/earth-simulator", false],
  ["/natureos/fungi-compute", "/fusarium/fungi-compute", false],
  ["/natureos/mindex", "/fusarium/mindex", false],
  ["/natureos/petri-sim", "/fusarium/petri-sim", false],
  ["/natureos/ancestry", "/fusarium/life-database", true],
  ["/natureos/aerosol", "/fusarium/aerosol", false],
  ["/natureos", "/fusarium", false],
]

/** @param {string} pathname */
function mapTwinPath(pathname) {
  for (const [source, target, includesSubtree] of FUSARIUM_TWIN_ROUTE_MAP) {
    if (pathname === source) return target
    if (includesSubtree && pathname.startsWith(`${source}/`)) {
      return `${target}${pathname.slice(source.length)}`
    }
  }
  return pathname
}

/**
 * Rewrites same-origin destinations only when an explicit Fusarium twin route
 * exists. Query strings and hashes are preserved. Unmapped NatureOS tools and
 * external destinations remain unchanged.
 *
 * @param {string | URL | null | undefined} target
 * @param {string} currentOrigin
 * @returns {string | URL | null | undefined}
 */
export function rewriteFusariumTwinNavigationTarget(target, currentOrigin) {
  if (target == null) return target

  const targetWasUrl = target instanceof URL
  const rawTarget = targetWasUrl ? target.href : target

  try {
    const current = new URL(currentOrigin)
    const parsed = new URL(rawTarget, current)
    if (parsed.origin !== current.origin) return target

    const mappedPath = mapTwinPath(parsed.pathname)
    if (mappedPath === parsed.pathname) return target
    parsed.pathname = mappedPath

    if (targetWasUrl) return parsed
    const isAbsolute = /^[a-z][a-z\d+.-]*:/i.test(rawTarget) || rawTarget.startsWith("//")
    return isAbsolute ? parsed.href : `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return target
  }
}

export { FUSARIUM_TWIN_ROUTE_MAP }
