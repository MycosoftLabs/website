export const VIRTUAL_PETRI_DISH_APP_ID = "virtual-petri-dish"
export const VIRTUAL_PETRI_DISH_FUSARIUM_ROUTE = "/fusarium/virtual-petri-dish"
export const VIRTUAL_PETRI_DISH_NATUREOS_ROUTE = "/natureos/virtual-petri-dish"
export const VIRTUAL_PETRI_DISH_ALIAS_ROUTES = [
  "/fusarium/virtual-petri-dish2",
  "/fusarium/petri-sim",
] as const
export const VIRTUAL_PETRI_DISH_SOURCE_REVISION = "887cb4b1ae46361ca967d37d9141628c57a171af"
export const VIRTUAL_PETRI_DISH_HOST_REVISION = "93cf47e113d3a99e183895b5c23ff2862963b7b5"

export const VIRTUAL_PETRI_DISH_ENTRY = {
  source: "app/natureos/virtual-petri-dish/page.tsx",
  aliases: ["app/natureos/virtual-petri-dish2/page.tsx", "app/natureos/petri-sim/page.tsx"],
  target: "app/fusarium/(dashboard)/virtual-petri-dish/page.tsx",
  targetAliases: [
    "app/fusarium/(dashboard)/virtual-petri-dish2/page.tsx",
    "app/fusarium/(dashboard)/petri-sim/page.tsx",
  ],
} as const

export const VIRTUAL_PETRI_DISH_SAME_ORIGIN_APIS = ["/api/natureos/activity/log"] as const

export const VIRTUAL_PETRI_DISH_PAYLOAD_FILES = [
  { path: "lib/natureos-activity.ts", sha256: "8e0a088d8ce33c35db55de6ccfc32a628b9e2e603e06652605505dd4e225c282" },
  { path: "lib/utils.ts", sha256: "7ff92063f6489f30a95e1963948aa830decc9757e733195eab72ce7928f436d3" },
  { path: "app/natureos/petri-sim/page.tsx", sha256: "c2d19a2d371f41a878c09985c83e0971616bb3ea4ace5388d5123eb72020e9f6" },
  { path: "app/natureos/virtual-petri-dish/page.tsx", sha256: "3729b8f1ff38008ecb67f1e5d93f995ed058c5c2a456f250a945790d39af8724" },
  { path: "app/natureos/virtual-petri-dish2/page.tsx", sha256: "203004f9ba165936b56aa1f1d7a6792eaa15648bf57318830f19e3db7f60dc7a" },
  { path: "components/apps/mycelium-simulator.tsx", sha256: "f5852f3cb9d58b003232da5cd172689b4baf522ec25d7fd869c0c109b4e081f9" },
  { path: "components/natureos/tool-context.tsx", sha256: "c7a95fcbede2982dfac63f92913820de44a02e441bb0de897dacf011d933682f" },
  { path: "components/natureos/tool-viewport.tsx", sha256: "cbc234ef3035a37848e94194aa70c6eb15210f430d70fdee1cb4eda91a72ea65" },
  { path: "components/petri-dish-v2/petri-dish-app.tsx", sha256: "ab12f3221674078d2425943e2236b483670b4b85dcd908a4d6d2a2e59f2068ef" },
  { path: "components/petri-dish-v2/types.ts", sha256: "a1ab25e7bdd1b627744a769413112cfb3bd82861089ef6ef96483d4e0e028d65" },
  { path: "components/petri-dish-v2/viewer.tsx", sha256: "c6ef51233ac5cc56a53500b72529fd47ce8736d2a2b418f776e8be9b3f735964" },
  { path: "components/ui/badge.tsx", sha256: "1889f8e8d355e002e8e34d8d009b2accd4898aa890047cbead95ef83c53c3120" },
  { path: "components/ui/button.tsx", sha256: "6eabffde44eb5f55314b219046110037dcf0f828bba2a2a4b484ca0ceb83997e" },
  { path: "components/ui/card.tsx", sha256: "62e0a73f63e74fb82a4ff455e9072d3b4862e2d7e229ef51a842b6e3c8861b0d" },
  { path: "components/ui/dialog.tsx", sha256: "3b0c6f7b863b9e02ab9d62fa66153a634dc26df2578c18bf56ca4fa0fc88dd4d" },
  { path: "components/ui/label.tsx", sha256: "d92f65d70ed214fb1be4215e4dd6aa07c38646b34711e45d19be2767a7d69cd2" },
  { path: "components/ui/scroll-area.tsx", sha256: "8dc1de92f3cde30161e7f9528527cca317ac194b55a94df4ee82c5e3006bb85a" },
  { path: "components/ui/select.tsx", sha256: "6c5c9d35a4a66abb4b7f06aa8e75769b8a70c3c85fcbd333c8482f078a9f41f0" },
  { path: "components/ui/separator.tsx", sha256: "4e291f794c76ffe1f9c59ae922fc17eeff33cd25b5eb9dc8e22fdf7daf352203" },
  { path: "components/ui/slider.tsx", sha256: "12ed0cea472f6514ab656fd92cdb7dcb28d5866433c75f71ff0c51bc46acb5f3" },
  { path: "components/natureos/tools/petri-dish-embed.tsx", sha256: "dc5e10da2705553b6e6026461c2edf0a9399e851cefa093f157233ea0f6622ae" },
  { path: "components/natureos/tools/petri-dish-v2-embed.tsx", sha256: "e9a51445e3f9555705741d6a0932525eb5dfcb2e97749ea0752ae07fe6c354d3" },
  { path: "lib/bluesight/api.ts", sha256: "f5f8761f369b3672641072a14d7a23bf63e2234d6405d21f02bf413afbecae02" },
  { path: "lib/bluesight/types.ts", sha256: "8e788056cd767b3812b533dc08d925367976fd1f8edf7d6eae02e6fc45e544dc" },
  { path: "lib/petri-dish-v2/petri-api.ts", sha256: "802d212478047de9974b42b75c42c4839e355d81340f427ae33aaff5f8e39b3a" },
  { path: "lib/petri-dish-v2/rest-engine-worker.ts", sha256: "2401258d8a616ed18aeaff7b83aa096604923e528c4bd758b639954ec34fda40" },
  { path: "lib/services/species-mapping.ts", sha256: "7246445c4c11d9d73320094b265bb438d378163880908da3fecbd87e36649c93" },
  { path: "lib/utils/index.ts", sha256: "5c9da9a7d08961a3358b01dbb27f84d6d6f653f09a9b27c5dcb19b5793151043" },
] as const

export const VIRTUAL_PETRI_DISH_INTENTIONAL_DIFFERENCES = [
  "Primary Fusarium route is /fusarium/virtual-petri-dish.",
  "Alias /fusarium/virtual-petri-dish2 remounts the v2 NatureOS page.",
  "Alias /fusarium/petri-sim redirects to /fusarium/virtual-petri-dish instead of /natureos/virtual-petri-dish so the alias stays inside the Fusarium mount.",
] as const
