export const COMPOUND_ANALYSER_APP_ID = "compound-analyser"
export const COMPOUND_ANALYSER_FUSARIUM_ROUTE = "/fusarium/compound-analyser"
export const COMPOUND_ANALYSER_NATUREOS_ROUTE = "/natureos/compound-analyser"
export const COMPOUND_ANALYSER_RELATED_CIVILIAN_ROUTE = "/apps/compound-sim"
export const COMPOUND_ANALYSER_SOURCE_REVISION = "887cb4b1ae46361ca967d37d9141628c57a171af"
export const COMPOUND_ANALYSER_HOST_REVISION = "93cf47e113d3a99e183895b5c23ff2862963b7b5"

export const COMPOUND_ANALYSER_ENTRY = {
  source: "app/natureos/compound-analyser/page.tsx",
  sourceComponent: "NatureOSCompoundSimPage -> CompoundSimEmbed",
  relatedCivilian: "app/apps/compound-sim/page.tsx",
  target: "app/fusarium/(dashboard)/compound-analyser/page.tsx",
  targetComponent: "FusariumCompoundAnalyserPage -> FusariumCompoundAnalyserMount",
} as const

export const COMPOUND_ANALYSER_SAME_ORIGIN_APIS = ["/api/natureos/activity/log"] as const

export const COMPOUND_ANALYSER_PAYLOAD_FILES = [
  { path: "app/apps/compound-sim/page.tsx", sha256: "19df3f7a90443158bb202047c9d781c38dccbbedfe94b08c8242e88348e5d4d4" },
  { path: "app/natureos/compound-analyser/page.tsx", sha256: "ad72ae7a5fd60b8acb8b1f3541cdc4d47c5e2327f343a9941534747800f05cc6" },
  { path: "components/natureos/tool-context.tsx", sha256: "c7a95fcbede2982dfac63f92913820de44a02e441bb0de897dacf011d933682f" },
  { path: "components/natureos/tool-viewport.tsx", sha256: "cbc234ef3035a37848e94194aa70c6eb15210f430d70fdee1cb4eda91a72ea65" },
  { path: "components/natureos/tools/compound-sim-embed.tsx", sha256: "9bcf091e75e016a368f84e578435dc9522e43dca831b2324f4a318e689b6c4dc" },
  { path: "components/ui/badge.tsx", sha256: "1889f8e8d355e002e8e34d8d009b2accd4898aa890047cbead95ef83c53c3120" },
  { path: "components/ui/button.tsx", sha256: "6eabffde44eb5f55314b219046110037dcf0f828bba2a2a4b484ca0ceb83997e" },
  { path: "components/ui/card.tsx", sha256: "62e0a73f63e74fb82a4ff455e9072d3b4862e2d7e229ef51a842b6e3c8861b0d" },
  { path: "components/ui/input.tsx", sha256: "e22babbd675db6e921fcde4c1f85435dcdeba2734b10b9f4013d3c9ca5332658" },
  { path: "components/ui/tabs.tsx", sha256: "ab463f98c625384d162fd97a534078d03b4f4c4c5ef218b1488f2fb07df7c7aa" },
  { path: "lib/natureos-activity.ts", sha256: "8e0a088d8ce33c35db55de6ccfc32a628b9e2e603e06652605505dd4e225c282" },
  { path: "lib/utils.ts", sha256: "7ff92063f6489f30a95e1963948aa830decc9757e733195eab72ce7928f436d3" },
  { path: "lib/data/compounds.ts", sha256: "a14b57a20f0488f9aad38da0f80c9845201e33d3d5304a46083ced2309f05c11" },
  { path: "lib/services/species-mapping.ts", sha256: "7246445c4c11d9d73320094b265bb438d378163880908da3fecbd87e36649c93" },
  { path: "lib/utils/index.ts", sha256: "5c9da9a7d08961a3358b01dbb27f84d6d6f653f09a9b27c5dcb19b5793151043" },
] as const

export const COMPOUND_ANALYSER_INTENTIONAL_DIFFERENCES = [
  "Fusarium contract route is /fusarium/compound-analyser. Civilian /apps/compound-sim is recorded, not substituted.",
  "/api/natureos/activity/log is called by the cloned embed; a missing route is an honest failure, not invented activity.",
] as const
