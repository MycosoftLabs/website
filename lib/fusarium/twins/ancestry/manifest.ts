export const ANCESTRY_APP_ID = "ancestry"
export const ANCESTRY_FUSARIUM_ROUTE = "/fusarium/life-database"
export const ANCESTRY_FUSARIUM_COMPATIBILITY_ROUTE = "/fusarium/ancestry"
export const ANCESTRY_NATUREOS_ROUTE = "/natureos/ancestry"
export const ANCESTRY_SOURCE_REVISION = "887cb4b1ae46361ca967d37d9141628c57a171af"
export const ANCESTRY_HOST_REVISION = "93cf47e113d3a99e183895b5c23ff2862963b7b5"
export const ANCESTRY_PAYLOAD_COUNT = 45

export const ANCESTRY_FUSARIUM_SUBTREE = [
  "/fusarium/life-database",
  "/fusarium/life-database/database",
  "/fusarium/life-database/explorer",
  "/fusarium/life-database/phylogeny",
  "/fusarium/life-database/tools",
  "/fusarium/life-database/species/[id]",
  "/fusarium/life-database/species/name/[name]",
  "/fusarium/life-database/taxonomy/[rank]/[name]",
] as const

export const ANCESTRY_INTENTIONAL_DIFFERENCES = [
  "Fusarium names the app Life Database and mounts a Fusarium-native database-first home at /fusarium/life-database.",
  "The NatureOS All-Life Ancestry landing page remains immutable and is not used as the Fusarium home.",
  "A Fusarium-boundary adapter maps rendered links and History API destinations from /natureos/ancestry to /fusarium/life-database without editing snapshots.",
  "/fusarium/ancestry remains a compatibility entry point.",
  "/mindex links remain civilian MINDEX routes.",
] as const
