/**
 * Nature Statistics twin mount manifest.
 * Payload files are immutable snapshots. This file only records the verified
 * baseline used by the Fusarium wrapper; it does not copy or mutate them.
 */
export const NATURE_STATISTICS_APP_ID = "nature-statistics"
export const NATURE_STATISTICS_FUSARIUM_ROUTE = "/fusarium/nature-statistics"
export const NATURE_STATISTICS_NATUREOS_ROUTE = "/natureos/nature-statistics"

export const NATURE_STATISTICS_SOURCE_REPO = "MycosoftLabs/website"
export const NATURE_STATISTICS_SOURCE_REVISION = "887cb4b1ae46361ca967d37d9141628c57a171af"
export const NATURE_STATISTICS_HOST_REVISION = "93cf47e113d3a99e183895b5c23ff2862963b7b5"
export const NATURE_STATISTICS_SOURCE_DIRTY_NOTE =
  "NatureOS source worktree was dirty at audit time; selected payload files remained byte-identical."

export const NATURE_STATISTICS_ENTRY = {
  source: "app/natureos/nature-statistics/page.tsx",
  sourceComponent: "NatureOSNatureStatisticsPage -> NatureStatisticsView",
  target: "app/fusarium/(dashboard)/nature-statistics/page.tsx",
  targetComponent: "FusariumNatureStatisticsPage -> FusariumNatureStatisticsMount -> NatureStatisticsView",
} as const

export const NATURE_STATISTICS_SAME_ORIGIN_APIS = [
  "/api/natureos/live-stats",
  "/api/natureos/population",
  "/api/natureos/global-events",
  "/api/natureos/intel-reports",
  "/api/mas/agents",
  "/api/global-agents",
  "/api/mycobrain",
] as const

export const NATURE_STATISTICS_PAYLOAD_FILES = [
  {
    path: "app/natureos/nature-statistics/page.tsx",
    sha256: "3af6d1812324a091e6b3913cf6d01dc212a94bff7499e53f296d1c46b488d8ee",
  },
  {
    path: "components/dashboard/header.tsx",
    sha256: "c7854593b922e546c14d01207f853ecd9059905b072682105745d46387032dba",
  },
  {
    path: "components/dashboard/shell.tsx",
    sha256: "dd3096f51a33178c36ba84fb8148f5bb58f841818c3a8dedf0be1dbe43eeab37",
  },
  {
    path: "components/natureos/nature-statistics-view.tsx",
    sha256: "9f56cf3c2d4174b6cf7b817dab50f5601a91c837a5e88cafc8f5514aa8b05fde",
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
    path: "components/widgets/humans-machines-panel.tsx",
    sha256: "724ee03808cd3051fb62468fe6df857c190f5df9d38835c8e392fb57e875dd7f",
  },
  {
    path: "components/widgets/kingdom-stat-card.tsx",
    sha256: "1a2223d0f7031835c9996d6b2dcdd977629278a135a580bee18d48d9c3734506",
  },
  {
    path: "components/widgets/rolling-number.tsx",
    sha256: "7df2a096cf7625e87740b650aeeeb432c4813f2c19b60d4c7cc450784e2dcffe",
  },
  {
    path: "hooks/use-live-stats.ts",
    sha256: "a1be13ffb63c3414c3ba80dde08b10cc1d96911de4d38b64b6999e0b20a0a796",
  },
  {
    path: "hooks/use-mycobrain.ts",
    sha256: "30a9f5fbb86c21d72f11d42c6cb9c9010e06295b8b0c24d920d06c8f4d2e51e8",
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

export const NATURE_STATISTICS_INTENTIONAL_DIFFERENCES = [
  "Fusarium route is /fusarium/nature-statistics instead of /natureos/nature-statistics.",
  "Wrapper lives under the Fusarium dashboard route group so the existing console chrome wraps the cloned view.",
  "Page title metadata is copied from the NatureOS entry; no Fusarium rename or redesign.",
] as const
