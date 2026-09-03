/**
 * The FUSARIUM console app map.
 *
 * Mirrors the platform catalog the runtime serves
 * (services/runtime/fusarium_runtime/platform_catalog.py) — same sections, same
 * order, same titles. The runtime stays the source of truth for what is
 * actually bound; this is the console's map of where things live.
 *
 * Routes are flat under /fusarium, so the Earth Simulator is at
 * /fusarium/earth-simulator.
 */

export interface FusariumItem {
  id: string
  title: string
  href: string
}

export interface FusariumSection {
  id: string
  title: string
  defaultOpen?: boolean
  items: FusariumItem[]
}

const s = (id: string, title: string): FusariumItem => ({
  id,
  title,
  href: id === "overview" ? "/fusarium" : `/fusarium/${id}`,
})

export const FUSARIUM_SECTIONS: FusariumSection[] = [
  {
    id: "operations",
    title: "Operations",
    defaultOpen: true,
    items: [
      s("overview", "Overview"),
      s("situational-awareness", "Situational Awareness"),
      s("threat-assessment", "Threat Assessment"),
      s("data-fusion", "Data Fusion"),
      s("command-control", "Command & Control"),
      // The OEI narrative and stack inventory are first-class operational
      // workspaces; backend bindings still report their own evidence state.
      s("oei", "OEI Narrative"),
      s("stack", "Stack Inventory"),
    ],
  },
  {
    id: "apps",
    title: "Apps",
    defaultOpen: true,
    items: [
      s("nature-statistics", "Nature Statistics"),
      s("fungi-compute", "Fungi Compute"),
      s("earth-simulator", "Earth Simulator"),
      s("virtual-petri-dish", "Virtual Petri Dish"),
      s("biology-simulator", "Biology Simulator"),
      s("compound-analyser", "Compound Analyser"),
      s("aerosol", "Aerosol"),
      { id: "ancestry", title: "Life Database", href: "/fusarium/life-database" },
      s("growth-analytics", "Growth Analytics"),
    ],
  },
  {
    // One tool per sense, plus the shared scope overview and control surface.
    // See components/fusarium/fusarium-senses.ts for the sense/tool map.
    id: "sensing",
    title: "Sensing Tools",
    defaultOpen: true,
    items: [
      s("sensing", "Sensing overview"),
      s("gcs", "Global Control System"),
      s("bluesight", "BlueSight — spectral"),
      s("sine", "SINE — acoustic"),
      s("fci", "FCI — bioelectric"),
      s("thermal", "Thermal Field Laboratory"),
      s("gandha", "GANDHA — chemical"),
      s("mechanical", "Tactus — Mechanical"),
    ],
  },
  {
    id: "ai",
    title: "AI",
    items: [
      s("ai-studio", "MYCA AI Studio"),
      s("nlm-training", "NLM Training Dashboard"),
      s("workflows", "Workflows"),
      s("mas", "MAS Topology"),
      s("avani", "AVANI Guardian"),
    ],
  },
  {
    id: "tools",
    title: "Science & Lab Tools",
    items: [s("tools", "Tools Hub (all categories)")],
  },
  {
    id: "development",
    title: "Development",
    items: [
      s("api", "API Gateway"),
      s("functions", "Functions"),
      s("sdk", "SDK"),
      s("shell", "Cloud Shell"),
    ],
  },
  {
    id: "infrastructure",
    title: "Infrastructure",
    items: [
      s("devices", "DirtNet Operations"),
      s("mycobrain", "DirtNet Edge Nodes"),
      s("sporebase", "DirtNet Bioaerosol Nodes"),
      s("crep", "Earth / CREP Mission Picture"),
      s("mindex", "MINDEX Evidence Fabric"),
      s("storage", "Protected Data Fabric"),
      s("containers", "Compute Fabric"),
      s("monitoring", "Mission Assurance"),
    ],
  },
  {
    id: "platform",
    title: "Platform",
    items: [
      s("partner-mesh", "Partner Mesh"),
      s("adapters", "Integration Hub"),
      s("profile", "Account & Access"),
      s("settings", "Settings"),
    ],
  },
]

/** The catalog entry for a pathname, for the topbar subtitle. */
export function findFusariumApp(
  pathname: string,
): { section: string; title: string; item: FusariumItem } | null {
  const normalizedPath = pathname === "/fusarium/virtual-petri-dish2" || pathname.startsWith("/fusarium/virtual-petri-dish2/")
    ? pathname.replace("/fusarium/virtual-petri-dish2", "/fusarium/virtual-petri-dish")
    : pathname === "/fusarium/petri-sim" || pathname.startsWith("/fusarium/petri-sim/")
      ? pathname.replace("/fusarium/petri-sim", "/fusarium/virtual-petri-dish")
      : pathname
  let match: { section: string; title: string; item: FusariumItem } | null = null
  for (const section of FUSARIUM_SECTIONS) {
    for (const item of section.items) {
      const ownsPath = item.href === "/fusarium"
        ? normalizedPath === item.href
        : normalizedPath === item.href || normalizedPath.startsWith(`${item.href}/`)
      if (ownsPath && (!match || item.href.length > match.item.href.length)) {
        match = { section: section.title.toLowerCase(), title: item.title, item }
      }
    }
  }
  return match
}

/** Overview owns /fusarium exactly; everything else also owns its subtree. */
export function isActiveFusariumPath(pathname: string, href: string): boolean {
  if (href === "/fusarium") return pathname === "/fusarium"
  return pathname === href || pathname.startsWith(href + "/")
}
