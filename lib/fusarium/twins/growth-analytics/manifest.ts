export const GROWTH_ANALYTICS_APP_ID = "growth-analytics"
export const GROWTH_ANALYTICS_FUSARIUM_ROUTE = "/fusarium/growth-analytics"
export const GROWTH_ANALYTICS_NATUREOS_ROUTE = "/natureos/growth-analytics"
export const GROWTH_ANALYTICS_RELATED_CIVILIAN_ROUTE = "/apps/growth-analytics"
export const GROWTH_ANALYTICS_SOURCE_REVISION = "887cb4b1ae46361ca967d37d9141628c57a171af"
export const GROWTH_ANALYTICS_HOST_REVISION = "93cf47e113d3a99e183895b5c23ff2862963b7b5"

export const GROWTH_ANALYTICS_ENTRY = {
  source: "app/natureos/growth-analytics/page.tsx",
  sourceComponent: "NatureOSGrowthAnalyticsPage -> GrowthAnalyticsEmbed",
  relatedCivilian: "app/apps/growth-analytics/page.tsx",
  target: "app/fusarium/(dashboard)/growth-analytics/page.tsx",
  targetComponent: "FusariumGrowthAnalyticsPage -> FusariumGrowthAnalyticsMount",
} as const

export const GROWTH_ANALYTICS_SAME_ORIGIN_APIS = ["/api/natureos/activity/log"] as const

export const GROWTH_ANALYTICS_PAYLOAD_FILES = [
  { path: "app/apps/growth-analytics/page.tsx", sha256: "ef82bc814911ea4376a4f86d3bd4cffbc12b72b679f4f2c39867e2e24cdd2361" },
  { path: "app/natureos/growth-analytics/page.tsx", sha256: "82790cbb8abd6d4eedbf28b76dd7ec6a17ec99f9354ed0a0ca7d7eaed812e59a" },
  { path: "components/natureos/tool-context.tsx", sha256: "c7a95fcbede2982dfac63f92913820de44a02e441bb0de897dacf011d933682f" },
  { path: "components/natureos/tool-viewport.tsx", sha256: "cbc234ef3035a37848e94194aa70c6eb15210f430d70fdee1cb4eda91a72ea65" },
  { path: "components/natureos/tools/growth-analytics-embed.tsx", sha256: "3320bb39dd9b4aa70f508b2676c88af52bf88be1f9f1b900a77667c3bb9d2733" },
  { path: "components/ui/badge.tsx", sha256: "1889f8e8d355e002e8e34d8d009b2accd4898aa890047cbead95ef83c53c3120" },
  { path: "components/ui/button.tsx", sha256: "6eabffde44eb5f55314b219046110037dcf0f828bba2a2a4b484ca0ceb83997e" },
  { path: "components/ui/card.tsx", sha256: "62e0a73f63e74fb82a4ff455e9072d3b4862e2d7e229ef51a842b6e3c8861b0d" },
  { path: "components/ui/progress.tsx", sha256: "98271448650669d39d317bdbd418e5bfb2546cd03fa016d0758b744d26136fcb" },
  { path: "components/ui/scroll-area.tsx", sha256: "8dc1de92f3cde30161e7f9528527cca317ac194b55a94df4ee82c5e3006bb85a" },
  { path: "components/ui/select.tsx", sha256: "6c5c9d35a4a66abb4b7f06aa8e75769b8a70c3c85fcbd333c8482f078a9f41f0" },
  { path: "components/ui/slider.tsx", sha256: "12ed0cea472f6514ab656fd92cdb7dcb28d5866433c75f71ff0c51bc46acb5f3" },
  { path: "components/ui/tabs.tsx", sha256: "ab463f98c625384d162fd97a534078d03b4f4c4c5ef218b1488f2fb07df7c7aa" },
  { path: "lib/natureos-activity.ts", sha256: "8e0a088d8ce33c35db55de6ccfc32a628b9e2e603e06652605505dd4e225c282" },
  { path: "lib/utils.ts", sha256: "7ff92063f6489f30a95e1963948aa830decc9757e733195eab72ce7928f436d3" },
  { path: "lib/services/species-mapping.ts", sha256: "7246445c4c11d9d73320094b265bb438d378163880908da3fecbd87e36649c93" },
  { path: "lib/utils/index.ts", sha256: "5c9da9a7d08961a3358b01dbb27f84d6d6f653f09a9b27c5dcb19b5793151043" },
] as const

export const GROWTH_ANALYTICS_INTENTIONAL_DIFFERENCES = [
  "Fusarium contract route is /fusarium/growth-analytics. Civilian /apps/growth-analytics is recorded, not substituted.",
  "/api/natureos/activity/log is called by the cloned embed; a missing route is an honest failure.",
] as const
