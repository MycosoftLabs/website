/**
 * C&E 16 intelligence task names (public IPB doctrine) + Mycosoft capability
 * status. No Army INTSUM facts. No mock intel rows. Empty stays empty.
 *
 * Showcase Army tasks are 12, 13, 8, 14.
 * FormSpace / NLM / WEKA / Trail AR are supporting components, not the showcase.
 */

export type ItdxObjectiveStatus = "DEMOABLE_NOW" | "PARTIAL" | "MENTION_ONLY"

export interface ItdxSixteenObjective {
  id: number
  name: string
  status: ItdxObjectiveStatus
  systems: readonly string[]
  honesty: string
  showcase?: boolean
}

export interface ItdxSupportingComponent {
  id: "formspace" | "nlm" | "weka" | "trail-ar"
  title: string
  honesty: string
  href: string
}

/** Public IPB / C&E task names only. Do not attach real-world injects. */
export const ITDX_SIXTEEN_OBJECTIVES: readonly ItdxSixteenObjective[] = [
  {
    id: 1,
    name: "Prepare an Annex B",
    status: "MENTION_ONLY",
    systems: ["Fusarium ITDX"],
    honesty: "No OPORD Annex B generator. Mention-only.",
  },
  {
    id: 2,
    name: "Prepare an Annex L",
    status: "MENTION_ONLY",
    systems: ["Fusarium ITDX"],
    honesty: "No OPORD Annex L generator. Mention-only.",
  },
  {
    id: 3,
    name: "Build a Modified Combined Obstacle Overlay (MCOO)",
    status: "PARTIAL",
    systems: ["Earth Sim", "FormSpace", "Fusarium ITDX"],
    honesty:
      "Synthetic Fort Stewart AO + FormSpace ADE20K terrain overlay exist. Not a signed doctrinal MCOO.",
  },
  {
    id: 4,
    name: "Prepare a Terrain Effects Matrix",
    status: "PARTIAL",
    systems: ["FormSpace", "Earth Sim"],
    honesty: "4-D ADE20K appearance chart on Trail AR / FormSpace. Not a filled doctrinal TEM.",
  },
  {
    id: 5,
    name: "Prepare a Weather Effects Matrix",
    status: "PARTIAL",
    systems: ["CREP/OEI", "Earth Sim"],
    honesty: "ERA5 / weather layers may bind. No Weather Effects Matrix product is emitted.",
  },
  {
    id: 6,
    name: "Prepare a Key Systems Matrix by Warfighting Function",
    status: "MENTION_ONLY",
    systems: ["Fusarium ITDX", "NatureOS"],
    honesty: "No WfF key-systems matrix is produced.",
  },
  {
    id: 7,
    name: "Produce a Doctrinal Template",
    status: "MENTION_ONLY",
    systems: ["Fusarium ITDX"],
    honesty: "No doctrinal template product.",
  },
  {
    id: 8,
    name: "Produce Courses of Action",
    status: "PARTIAL",
    systems: ["Fusarium ITDX", "NLM", "Earth Sim"],
    honesty:
      "Showcase. AVANI dispositions exist (DENY/PAUSE/PASS/REVIEW). Not a doctrinal COA set. Scenario-sim BFF NOT_SUPPLIED.",
    showcase: true,
  },
  {
    id: 9,
    name: "Produce a Situational Template",
    status: "PARTIAL",
    systems: ["Trail AR", "Earth Sim", "Fusarium ITDX"],
    honesty: "Trail AR overlay + Earth Sim globe. Not a doctrinal SITEMP.",
  },
  {
    id: 10,
    name: "Prepare a Civilian Considerations Assessment",
    status: "MENTION_ONLY",
    systems: ["Earth Sim", "Fusarium ITDX"],
    honesty: "Civil / non-US Part B remains later. No ASCOPE product.",
  },
  {
    id: 11,
    name: "Conduct Battle Damage Assessment (BDA)",
    status: "MENTION_ONLY",
    systems: ["Fusarium ITDX"],
    honesty: "No BDA product.",
  },
  {
    id: 12,
    name: "Perform Pattern Analysis",
    status: "PARTIAL",
    systems: ["WEKA", "NLM", "MINDEX"],
    honesty:
      "Showcase. WEKA 149 compatibility on synthetic tables. NLM environmental SSM abstains (forecast_p null). Trail F1 NOT_YET_SCORED. WEKA ≠ NLM.",
    showcase: true,
  },
  {
    id: 13,
    name: "Perform Link Analysis",
    status: "PARTIAL",
    systems: ["MINDEX", "NatureOS", "Fusarium ITDX"],
    honesty:
      "Showcase. Graph/evidence interfaces exist. No qualified military entity-link model. Empty stays empty.",
    showcase: true,
  },
  {
    id: 14,
    name: "Produce products on a mapping tool",
    status: "DEMOABLE_NOW",
    systems: ["Earth Sim", "Trail AR", "CREP/OEI", "Fusarium ITDX"],
    honesty: "Showcase. Demoable now: Earth Sim + Trail AR + CREP maps. live: false. SYNTHETIC EXERCISE.",
    showcase: true,
  },
  {
    id: 15,
    name: "Produce a Collection Plan",
    status: "MENTION_ONLY",
    systems: ["CREP/OEI", "Fusarium ITDX"],
    honesty: "No collection-plan product.",
  },
  {
    id: 16,
    name: "Prepare an Event Template",
    status: "PARTIAL",
    systems: ["Trail AR", "Earth Sim", "Fusarium ITDX"],
    honesty:
      "Trail AR video clock is the demo clock. Fusarium scenario-sim BFF NOT_SUPPLIED on this tree.",
  },
]

export const ITDX_FOUR_SHOWCASE: readonly ItdxSixteenObjective[] = ITDX_SIXTEEN_OBJECTIVES.filter(
  (row) => row.showcase === true,
)

export const ITDX_SHOWCASE_TASK_IDS = [12, 13, 8, 14] as const

export const ITDX_SUPPORTING_STACK: readonly ItdxSupportingComponent[] = [
  {
    id: "formspace",
    title: "FormSpace (support)",
    honesty: "In-repo F_t / elapsed ℓ_t. PXL chart is 4-D ADE20K, not a filled 24-D u_t.",
    href: "/fusarium/itdx/v2#nlm",
  },
  {
    id: "nlm",
    title: "NLM (support)",
    honesty: "LAN /api/nlm bind. forecast_p is null. FORECAST_ABSTAIN. Model loaded ≠ forecast issued.",
    href: "/fusarium/itdx/v2#nlm",
  },
  {
    id: "weka",
    title: "WEKA (support)",
    honesty: "149-scheme compatibility. Scientific readiness false. Fixture SYNTHETIC. Trail NOT_YET_SCORED.",
    href: "/fusarium/itdx/v2#weka",
  },
  {
    id: "trail-ar",
    title: "Trail AR (support)",
    honesty: "Two clocks + loop-refine IoU for map/pattern support. live: false.",
    href: "/natureos/bluesight-trail",
  },
]

export function itdxObjectivesByStatus(status: ItdxObjectiveStatus): readonly ItdxSixteenObjective[] {
  return ITDX_SIXTEEN_OBJECTIVES.filter((row) => row.status === status)
}

export function assertItdxSixteenComplete(): void {
  if (ITDX_SIXTEEN_OBJECTIVES.length !== 16) {
    throw new Error("ITDX sixteen-objectives table must have exactly 16 rows")
  }
  const ids = ITDX_FOUR_SHOWCASE.map((row) => row.id).sort((a, b) => a - b)
  if (ids.join(",") !== "8,12,13,14") {
    throw new Error("ITDX showcase must be Army tasks 8, 12, 13, 14")
  }
}
