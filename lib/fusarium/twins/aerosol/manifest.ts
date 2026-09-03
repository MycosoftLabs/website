export const AEROSOL_APP_ID = "aerosol"
export const AEROSOL_FUSARIUM_ROUTE = "/fusarium/aerosol"
export const AEROSOL_NATUREOS_ROUTE = "/natureos/aerosol"
export const AEROSOL_SOURCE_REVISION = "887cb4b1ae46361ca967d37d9141628c57a171af"
export const AEROSOL_HOST_REVISION = "93cf47e113d3a99e183895b5c23ff2862963b7b5"
export const AEROSOL_SOURCE_DIRTY_NOTE =
  "NatureOS source worktree was dirty at audit time; selected payload files remained byte-identical."

export const AEROSOL_ENTRY = {
  source: "app/natureos/aerosol/page.tsx",
  sourceComponent: "AerosolPage -> AerosolDashboard",
  target: "app/fusarium/(dashboard)/aerosol/page.tsx",
  targetComponent: "FusariumAerosolPage -> FusariumAerosolMount -> AerosolMapWorkbench",
} as const

export const AEROSOL_SAME_ORIGIN_APIS = [
  "/api/natureos/aerosol/pollen",
  "/api/natureos/aerosol/spores",
  "/api/natureos/aerosol/dust",
  "/api/natureos/aerosol/virus",
  "/api/natureos/aerosol/chemicals",
  "/api/natureos/aerosol/radiation",
  "/api/natureos/feeds/openaq/measurements",
] as const

export const AEROSOL_PAYLOAD_FILES = [
  {
    path: "app/natureos/aerosol/page.tsx",
    sha256: "d830b4e5ad2652c1d55900763509c1d5c2273deaab95c9c4d846e63632ee1e1d",
  },
  {
    path: "components/natureos/apps/aerosol/aerosol-dashboard.tsx",
    sha256: "e5d211b4a31899319ae55d466ad451b68ddd53c340a72500ca54ad7eead935be",
  },
  {
    path: "components/ui/badge.tsx",
    sha256: "1889f8e8d355e002e8e34d8d009b2accd4898aa890047cbead95ef83c53c3120",
  },
  {
    path: "components/ui/button.tsx",
    sha256: "6eabffde44eb5f55314b219046110037dcf0f828bba2a2a4b484ca0ceb83997e",
  },
  {
    path: "components/ui/card.tsx",
    sha256: "62e0a73f63e74fb82a4ff455e9072d3b4862e2d7e229ef51a842b6e3c8861b0d",
  },
  {
    path: "lib/utils.ts",
    sha256: "7ff92063f6489f30a95e1963948aa830decc9757e733195eab72ce7928f436d3",
  },
  {
    path: "lib/services/species-mapping.ts",
    sha256: "7246445c4c11d9d73320094b265bb438d378163880908da3fecbd87e36649c93",
  },
  {
    path: "lib/utils/index.ts",
    sha256: "5c9da9a7d08961a3358b01dbb27f84d6d6f653f09a9b27c5dcb19b5793151043",
  },
] as const

export const AEROSOL_INTENTIONAL_DIFFERENCES = [
  "Fusarium route is /fusarium/aerosol instead of /natureos/aerosol.",
  "The NatureOS payload remains byte-identical, while the Fusarium mount intentionally renders a map-first atmospheric workbench.",
  "Fusarium imports only provenance-bearing UNCLASSIFIED evidence and reports unbound, empty, stale, and error states separately.",
] as const
