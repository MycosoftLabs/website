/**
 * FUSARIUM Launchpad — server-derived entitlements.
 *
 * Entitlements are a pure function of (plan_key, status, timestamps) from
 * launchpad_subscriptions — never stored client-writable, never trusted from
 * a request. The Stripe webhook writes the subscription row; everything else
 * derives.
 */

import { PLAN_ENTITLEMENTS, type Entitlements, type PlanKey } from '@/lib/launchpad/catalog';

export interface SubscriptionRow {
  plan_key: string | null;
  status: string;
  current_period_end: string | null;
  grace_until: string | null;
  founding_pass_expires_at: string | null;
}

export type AccessMode = 'full' | 'grace' | 'read_export' | 'none';

export interface DerivedEntitlements {
  mode: AccessMode;
  planKey: PlanKey | null;
  entitlements: Entitlements | null;
  reason: string;
}

const ACTIVE_STATUSES = new Set(['active', 'trialing']);
const GRACE_STATUSES = new Set(['past_due', 'grace']);

export function featureGate(derived: DerivedEntitlements): {
  lockedVisible: boolean;
  planKey: PlanKey | null;
  mode: AccessMode;
  capabilities: Record<string, boolean | number | string>;
} {
  const e = derived.entitlements;
  return {
    lockedVisible: true,
    planKey: derived.planKey,
    mode: derived.mode,
    capabilities: {
      byoAiKey: true,
      readinessWorkspace: Boolean(e?.readinessWorkspace),
      evidenceIndex: Boolean(e?.evidenceIndex),
      documentFactory: Boolean(e?.documentFactory),
      trainingTracker: Boolean(e?.trainingTracker),
      resourceGraph: Boolean(e?.resourceGraph),
      contractRadar: Boolean(e),
      proposalWorkspaces: e?.proposalWorkspaces ?? 0,
      localAgentDevices: e?.localAgentDevices ?? 0,
      enclaveBridge: Boolean(e?.enclaveBridge),
      originGraph: Boolean(e?.originGraph),
      bomLineLimit: e?.bomLineLimit ?? 0,
      partnerMesh: Boolean(e?.partnerMesh),
      partnerSandbox: Boolean(e?.partnerSandbox),
      apiAccess: Boolean(e?.apiAccess),
      aiCreditsMonthly: e?.aiCreditsMonthly ?? 0,
    },
  };
}

export function deriveEntitlements(sub: SubscriptionRow | null, now = new Date()): DerivedEntitlements {
  if (!sub || (!sub.plan_key && !sub.founding_pass_expires_at)) {
    return { mode: 'none', planKey: null, entitlements: null, reason: 'No plan on this workspace yet.' };
  }

  // Launch Pass: 30 days of Core; expires without explicit renewal.
  if (sub.founding_pass_expires_at && (!sub.plan_key || sub.plan_key === 'launch_pass_30d')) {
    const exp = new Date(sub.founding_pass_expires_at);
    if (exp.getTime() > now.getTime()) {
      return {
        mode: 'full',
        planKey: 'launch_pass_30d',
        entitlements: PLAN_ENTITLEMENTS.launch_pass_30d,
        reason: `Launch Pass active through ${exp.toISOString().slice(0, 10)}. Recurring plans require explicit selection — nothing auto-renews.`,
      };
    }
    return {
      mode: 'read_export',
      planKey: 'launch_pass_30d',
      entitlements: null,
      reason: 'Launch Pass period ended. Select a recurring plan to continue; your data remains readable and exportable.',
    };
  }

  const planKey = (sub.plan_key ?? '') as PlanKey;
  const ent = PLAN_ENTITLEMENTS[planKey];
  if (!ent) {
    return { mode: 'none', planKey: null, entitlements: null, reason: `Unknown plan "${sub.plan_key}".` };
  }

  if (ACTIVE_STATUSES.has(sub.status)) {
    return { mode: 'full', planKey, entitlements: ent, reason: `Plan ${planKey} active.` };
  }
  if (GRACE_STATUSES.has(sub.status)) {
    const until = sub.grace_until ? new Date(sub.grace_until) : null;
    if (!until || until.getTime() > now.getTime()) {
      return {
        mode: 'grace',
        planKey,
        entitlements: ent,
        reason: 'Payment issue — grace period. Expensive AI actions are paused; fix billing to avoid read/export mode.',
      };
    }
    return {
      mode: 'read_export',
      planKey,
      entitlements: null,
      reason: 'Grace period ended. Workspace is read/export until billing is resolved — records are never destroyed over a failed payment.',
    };
  }
  // canceled / incomplete_expired / unpaid / none
  return {
    mode: 'read_export',
    planKey,
    entitlements: null,
    reason: `Subscription status "${sub.status}". Workspace is read/export; data remains yours.`,
  };
}
