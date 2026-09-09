/** Catalog app IDs that consume shared ITDX references. Producer `itdx` is excluded. */
export const ITDX_EVIDENCE_CONSUMER_IDS = Object.freeze([
  "overview",
  "situational-awareness",
  "threat-assessment",
  "data-fusion",
  "command-control",
  "oei",
  "stack",
  "nature-statistics",
  "fungi-compute",
  "earth-simulator",
  "virtual-petri-dish",
  "biology-simulator",
  "compound-analyser",
  "aerosol",
  "ancestry",
  "growth-analytics",
  "sensing",
  "gcs",
  "bluesight",
  "sine",
  "fci",
  "thermal",
  "gandha",
  "mechanical",
  "ai-studio",
  "nlm-training",
  "workflows",
  "mas",
  "avani",
  "tools",
  "api",
  "functions",
  "sdk",
  "shell",
  "devices",
  "mycobrain",
  "sporebase",
  "crep",
  "mindex",
  "storage",
  "containers",
  "monitoring",
  "partner-mesh",
  "adapters",
  "profile",
  "settings",
])

export function consumerIdFromPath(pathname) {
  if (typeof pathname !== "string" || !pathname.startsWith("/fusarium")) return null
  if (pathname === "/fusarium" || pathname === "/fusarium/") return "overview"
  const slug = pathname.replace(/^\/fusarium\//, "").split("/")[0]
  if (slug === "life-database") return "ancestry"
  if (slug === "itdx") return null
  return ITDX_EVIDENCE_CONSUMER_IDS.includes(slug) ? slug : null
}
