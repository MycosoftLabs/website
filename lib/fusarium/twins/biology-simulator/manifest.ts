export const BIOLOGY_SIMULATOR_APP_ID = "biology-simulator"
export const BIOLOGY_SIMULATOR_FUSARIUM_ROUTE = "/fusarium/biology-simulator"
export const BIOLOGY_SIMULATOR_NATUREOS_ROUTE = "/natureos/biology-simulator"
export const BIOLOGY_SIMULATOR_SOURCE_REVISION = "887cb4b1ae46361ca967d37d9141628c57a171af"
export const BIOLOGY_SIMULATOR_HOST_REVISION = "93cf47e113d3a99e183895b5c23ff2862963b7b5"

export const BIOLOGY_SIMULATOR_ENTRY = {
  source: "app/natureos/biology-simulator/page.tsx",
  sourceComponent: "BiologySimulatorPage -> BiologySimulatorLanding",
  target: "app/fusarium/(dashboard)/biology-simulator/page.tsx",
  targetComponent: "FusariumBiologySimulatorPage -> FusariumBiologySimulatorMount",
} as const

export const BIOLOGY_SIMULATOR_SAME_ORIGIN_APIS = [
  "/api/mindex/eagle/health/stats",
  "/api/mindex/genetics",
  "/api/mindex/compounds",
] as const

export const BIOLOGY_SIMULATOR_PAYLOAD_FILES = [
  { path: "app/natureos/biology-simulator/page.tsx", sha256: "b2940e35b96e0aaacad105d92218c29cb30efd20e1687f7c72cf36199c54b075" },
  { path: "components/natureos/apps/biology-simulator/biology-simulator-landing.tsx", sha256: "b979b2ff09d8c8b729c10354123d058ab207a3e9268925ad658071ebcaea326d" },
  { path: "components/natureos/apps/biology-simulator/biology-simulator-unreal-panel.tsx", sha256: "bc8b12caf2a33870a3ba808d737535e7fdc2f0fd65d48487c901e76cb8ece74e" },
  { path: "components/ui/badge.tsx", sha256: "1889f8e8d355e002e8e34d8d009b2accd4898aa890047cbead95ef83c53c3120" },
  { path: "components/ui/card.tsx", sha256: "62e0a73f63e74fb82a4ff455e9072d3b4862e2d7e229ef51a842b6e3c8861b0d" },
  { path: "lib/mindex-base-url.ts", sha256: "732fe27af1e9fa72035612c5a414c31902779f12647f9394595b6b28ced18794" },
  { path: "lib/utils.ts", sha256: "7ff92063f6489f30a95e1963948aa830decc9757e733195eab72ce7928f436d3" },
  { path: "lib/server/mindex-proxy-request.ts", sha256: "2e0e0085991492f327cf063466851a8800541ad5fe4bb782369f61a6c02e66e5" },
  { path: "lib/services/species-mapping.ts", sha256: "7246445c4c11d9d73320094b265bb438d378163880908da3fecbd87e36649c93" },
  { path: "lib/utils/index.ts", sha256: "5c9da9a7d08961a3358b01dbb27f84d6d6f653f09a9b27c5dcb19b5793151043" },
] as const

export const BIOLOGY_SIMULATOR_INTENTIONAL_DIFFERENCES = [
  "Fusarium route is /fusarium/biology-simulator instead of /natureos/biology-simulator.",
  "Server-side MINDEX probes remain the cloned page's probes; failures stay honest empty/unavailable.",
] as const
