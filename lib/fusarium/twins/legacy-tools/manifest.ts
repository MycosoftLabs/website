export const LEGACY_TOOL_TWIN_MOUNTS = {
  retrosynthesis: {
    natureosRoute: "/natureos/tools/retrosynthesis",
    fusariumRoute: "/fusarium/tools/retrosynthesis",
    payloadFileCount: 17,
    truthMode: "LOCKED / CONTENT WITHHELD",
    providerState: "unavailable",
    replacementState: "available-local-evidence-review",
  },
  "digital-twin": {
    natureosRoute: "/natureos/tools/digital-twin",
    fusariumRoute: "/fusarium/tools/digital-twin",
    payloadFileCount: 16,
    truthMode: "LIVE READ SEAM",
    providerState: "unbound",
  },
  "physics-sim": {
    natureosRoute: "/natureos/tools/physics-sim",
    fusariumRoute: "/fusarium/tools/physics-sim",
    payloadFileCount: 18,
    truthMode: "SIMULATED",
    providerState: "no-provider",
  },
} as const
