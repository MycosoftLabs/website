/**
 * MINDEX dashboard voice hints (May 03, 2026).
 * The MINDEX dashboard matches transcript substrings in `mindex-dashboard.tsx`;
 * this map is for documentation, tests, and future shared classifiers.
 */
export const MINDEX_VOICE_TAB_PHRASES: Record<
  | "overview"
  | "encyclopedia"
  | "data"
  | "integrity"
  | "ledger"
  | "network"
  | "bio"
  | "chemistry"
  | "devices"
  | "mwave"
  | "agents",
  readonly string[]
> = {
  overview: ["overview", "show overview"],
  encyclopedia: ["encyclopedia", "species"],
  data: ["data pipeline", "pipeline", "containers", "docker"],
  integrity: ["integrity", "verify", "crypto", "cryptography"],
  ledger: ["ledger"],
  network: ["network", "mycorrhizal"],
  bio: ["bio", "phylogeny", "tree of life", "genomics", "genome"],
  chemistry: ["chemistry", "compound"],
  devices: ["devices"],
  mwave: ["mwave", "m-wave"],
  agents: ["agents", "topology"],
} as const
