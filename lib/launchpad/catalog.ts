/**
 * FUSARIUM Launchpad — THE single pricing + entitlement source.
 *
 * Derived 1:1 from the verified master package:
 *   stripe_product_catalog.json  (sha256 36ed13fa…, catalog_version 1.0, 2026-08-10)
 *   entitlements_matrix.yaml     (sha256 46429755…, version 1.0)
 *
 * RULES
 * - The repo already carries three conflicting pricing sources
 *   (lib/stripe/config.ts, lib/pricing/public-pricing.ts, lib/access/types.ts).
 *   Launchpad SKUs live HERE and nowhere else. Do not add them to those files.
 * - Stripe price IDs are resolved AT RUNTIME by lookup_key (test and live modes
 *   have different price IDs; lookup_keys are identical), so live cutover is an
 *   env swap, not a code change.
 * - Entitlements are DERIVED server-side from plan_key + subscription status.
 *   Nothing client-writable stores an entitlement.
 */

// ---------------------------------------------------------------------------
// Plans and entitlements (entitlements_matrix.yaml)
// ---------------------------------------------------------------------------

export type PlanKey =
  | 'launch_pass_30d'
  | 'core'
  | 'contractor_ops'
  | 'origin_graph'
  | 'partner_mesh_pro';

export type RadarFrequency = 'weekly' | 'daily';

export interface Entitlements {
  users: number;
  aiCreditsMonthly: number;
  /** BYO provider keys are a privacy feature, available on every paid tier including Launch Pass. */
  byoAiKey: boolean;
  readinessWorkspace: boolean;
  evidenceIndex: boolean;
  documentFactory: boolean;
  trainingTracker: boolean;
  resourceGraph: boolean;
  contractRadarFrequency: RadarFrequency;
  activeOpportunityWatches: number;
  proposalWorkspaces: number;
  localAgentDevices: number;
  enclaveBridge: boolean;
  originGraph: boolean;
  bomLineLimit: number;
  partnerMesh: boolean;
  partnerSandbox: boolean;
  apiAccess: boolean;
}

export const PLAN_ENTITLEMENTS: Record<PlanKey, Entitlements> = {
  launch_pass_30d: {
    users: 3, aiCreditsMonthly: 100, byoAiKey: true,
    readinessWorkspace: true, evidenceIndex: true, documentFactory: true,
    trainingTracker: true, resourceGraph: true,
    contractRadarFrequency: 'weekly', activeOpportunityWatches: 25,
    proposalWorkspaces: 0, localAgentDevices: 0, enclaveBridge: false,
    originGraph: false, bomLineLimit: 0,
    partnerMesh: false, partnerSandbox: false, apiAccess: false,
  },
  core: {
    users: 3, aiCreditsMonthly: 100, byoAiKey: true,
    readinessWorkspace: true, evidenceIndex: true, documentFactory: true,
    trainingTracker: true, resourceGraph: true,
    contractRadarFrequency: 'weekly', activeOpportunityWatches: 25,
    proposalWorkspaces: 0, localAgentDevices: 0, enclaveBridge: false,
    originGraph: false, bomLineLimit: 0,
    partnerMesh: false, partnerSandbox: false, apiAccess: false,
  },
  contractor_ops: {
    users: 7, aiCreditsMonthly: 250, byoAiKey: true,
    readinessWorkspace: true, evidenceIndex: true, documentFactory: true,
    trainingTracker: true, resourceGraph: true,
    contractRadarFrequency: 'daily', activeOpportunityWatches: 100,
    proposalWorkspaces: 5, localAgentDevices: 25, enclaveBridge: true,
    originGraph: false, bomLineLimit: 0,
    partnerMesh: false, partnerSandbox: false, apiAccess: false,
  },
  origin_graph: {
    users: 12, aiCreditsMonthly: 500, byoAiKey: true,
    readinessWorkspace: true, evidenceIndex: true, documentFactory: true,
    trainingTracker: true, resourceGraph: true,
    contractRadarFrequency: 'daily', activeOpportunityWatches: 250,
    proposalWorkspaces: 10, localAgentDevices: 100, enclaveBridge: true,
    originGraph: true, bomLineLimit: 5000,
    partnerMesh: false, partnerSandbox: false, apiAccess: false,
  },
  partner_mesh_pro: {
    users: 25, aiCreditsMonthly: 1200, byoAiKey: true,
    readinessWorkspace: true, evidenceIndex: true, documentFactory: true,
    trainingTracker: true, resourceGraph: true,
    contractRadarFrequency: 'daily', activeOpportunityWatches: 1000,
    proposalWorkspaces: 25, localAgentDevices: 500, enclaveBridge: true,
    originGraph: true, bomLineLimit: 25000,
    partnerMesh: true, partnerSandbox: true, apiAccess: true,
  },
};

/**
 * Days of Core included in the one-time Launch Pass. Never auto-renews unless a
 * recurring plan is explicitly selected.
 *
 * There is deliberately NO cohort cap. An earlier draft carried a "first 50
 * companies" limit lifted from the spec package; it was never a real business
 * constraint, and publishing a seat count tells customers how small the book
 * is. Do not reintroduce one.
 */
export const LAUNCH_PASS_DAYS = 30;

// ---------------------------------------------------------------------------
// Stripe product catalog (stripe_product_catalog.json, verbatim amounts in cents)
// ---------------------------------------------------------------------------

export type ProductKind = 'plan' | 'pass' | 'credits' | 'advisory' | 'envelope';

export interface CatalogProduct {
  lookupKey: string;
  name: string;
  kind: ProductKind;
  billing: 'one_time' | 'month' | 'year';
  unitAmount: number; // cents
  planKey?: PlanKey;
  creditQuantity?: number;
  advisoryMinutes?: number;
}

export const CATALOG: CatalogProduct[] = [
  { lookupKey: 'fus_launchpad_launch_pass', name: 'FUSARIUM Launchpad Launch Pass',
    kind: 'pass', billing: 'one_time', unitAmount: 39700, planKey: 'launch_pass_30d' },

  { lookupKey: 'fus_launchpad_core_monthly', name: 'FUSARIUM Launchpad Core',
    kind: 'plan', billing: 'month', unitAmount: 14900, planKey: 'core' },
  { lookupKey: 'fus_launchpad_core_annual', name: 'FUSARIUM Launchpad Core Annual',
    kind: 'plan', billing: 'year', unitAmount: 149000, planKey: 'core' },
  { lookupKey: 'fus_launchpad_ops_monthly', name: 'FUSARIUM Contractor Ops',
    kind: 'plan', billing: 'month', unitAmount: 29900, planKey: 'contractor_ops' },
  { lookupKey: 'fus_launchpad_ops_annual', name: 'FUSARIUM Contractor Ops Annual',
    kind: 'plan', billing: 'year', unitAmount: 299000, planKey: 'contractor_ops' },
  { lookupKey: 'fus_launchpad_origin_monthly', name: 'FUSARIUM Contractor Ops + Origin Graph',
    kind: 'plan', billing: 'month', unitAmount: 49900, planKey: 'origin_graph' },
  { lookupKey: 'fus_launchpad_origin_annual', name: 'FUSARIUM Contractor Ops + Origin Graph Annual',
    kind: 'plan', billing: 'year', unitAmount: 499000, planKey: 'origin_graph' },
  { lookupKey: 'fus_launchpad_partner_monthly', name: 'FUSARIUM Partner Mesh Pro',
    kind: 'plan', billing: 'month', unitAmount: 99900, planKey: 'partner_mesh_pro' },
  { lookupKey: 'fus_launchpad_partner_annual', name: 'FUSARIUM Partner Mesh Pro Annual',
    kind: 'plan', billing: 'year', unitAmount: 999000, planKey: 'partner_mesh_pro' },

  { lookupKey: 'fus_launchpad_credits_100', name: 'FUSARIUM Launchpad 100 AI Credits',
    kind: 'credits', billing: 'one_time', unitAmount: 2000, creditQuantity: 100 },
  { lookupKey: 'fus_launchpad_credits_500', name: 'FUSARIUM Launchpad 500 AI Credits',
    kind: 'credits', billing: 'one_time', unitAmount: 7500, creditQuantity: 500 },
  { lookupKey: 'fus_launchpad_credits_2000', name: 'FUSARIUM Launchpad 2,000 AI Credits',
    kind: 'credits', billing: 'one_time', unitAmount: 24000, creditQuantity: 2000 },

  { lookupKey: 'fus_launchpad_advisory_15', name: 'FUSARIUM Launchpad 15-Minute Advisory',
    kind: 'advisory', billing: 'one_time', unitAmount: 9900, advisoryMinutes: 15 },
  { lookupKey: 'fus_launchpad_advisory_30', name: 'FUSARIUM Launchpad 30-Minute Advisory',
    kind: 'advisory', billing: 'one_time', unitAmount: 17500, advisoryMinutes: 30 },
  { lookupKey: 'fus_launchpad_advisory_60', name: 'FUSARIUM Launchpad 60-Minute Advisory',
    kind: 'advisory', billing: 'one_time', unitAmount: 32500, advisoryMinutes: 60 },
  { lookupKey: 'fus_launchpad_advisory_90', name: 'FUSARIUM Launchpad 90-Minute Working Session',
    kind: 'advisory', billing: 'one_time', unitAmount: 47500, advisoryMinutes: 90 },

  { lookupKey: 'fus_launchpad_envelope_send', name: 'FUSARIUM Launchpad Hosted Envelope Send',
    kind: 'envelope', billing: 'one_time', unitAmount: 1500 },
];

const BY_LOOKUP = new Map(CATALOG.map((p) => [p.lookupKey, p]));

export function getProduct(lookupKey: string): CatalogProduct | null {
  return BY_LOOKUP.get(lookupKey) ?? null;
}

export function planProducts(): CatalogProduct[] {
  return CATALOG.filter((p) => p.kind === 'plan');
}

/** Sanity invariants — asserted by unit tests, cheap enough to check on import in dev. */
export function catalogInvariants(): string[] {
  const errors: string[] = [];
  // annual = 10 × monthly (spec §22.1: "two months free")
  const pairs: [string, string][] = [
    ['fus_launchpad_core_monthly', 'fus_launchpad_core_annual'],
    ['fus_launchpad_ops_monthly', 'fus_launchpad_ops_annual'],
    ['fus_launchpad_origin_monthly', 'fus_launchpad_origin_annual'],
    ['fus_launchpad_partner_monthly', 'fus_launchpad_partner_annual'],
  ];
  for (const [m, y] of pairs) {
    const mo = BY_LOOKUP.get(m)!, yr = BY_LOOKUP.get(y)!;
    if (yr.unitAmount !== mo.unitAmount * 10) errors.push(`${y} != 10x ${m}`);
  }
  for (const p of CATALOG) {
    if (p.kind === 'plan' && !p.planKey) errors.push(`${p.lookupKey} missing planKey`);
    if (!p.lookupKey.startsWith('fus_launchpad_')) errors.push(`${p.lookupKey} bad prefix`);
  }
  const keys = CATALOG.map((p) => p.lookupKey);
  if (new Set(keys).size !== keys.length) errors.push('duplicate lookup keys');
  for (const [plan, ent] of Object.entries(PLAN_ENTITLEMENTS)) {
    if (!ent.byoAiKey) errors.push(`${plan} must allow BYO AI keys`);
  }
  return errors;
}
