'use client';

/**
 * FUSARIUM Launchpad — client-side entitlements context.
 *
 * One fetch of /billing/state per shell mount, shared by every screen. This is
 * the LOCKDOWN MECHANISM: the demo workspace runs Partner Mesh Pro so every
 * feature renders unlocked; when real tenants arrive, the same <FeatureGate>
 * renders the locked plate for plans that don't include a feature — no
 * per-page rework.
 *
 * Security note: this is presentation only. Every BFF route re-derives
 * entitlements server-side; hiding a locked panel is UX, not enforcement.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Lock, Coins, Loader2 } from 'lucide-react';
import { GlassButton } from '@/components/ui/glass-button';
import { CATALOG, PLAN_ENTITLEMENTS, type Entitlements, type PlanKey } from '@/lib/launchpad/catalog';

// ---------------------------------------------------------------------------
// Feature keys — boolean features map straight onto Entitlements; count-based
// features (proposals, local agent devices) unlock when their cap is > 0.
// ---------------------------------------------------------------------------
export type FeatureKey =
  | 'evidenceIndex' | 'documentFactory' | 'trainingTracker' | 'resourceGraph'
  | 'enclaveBridge' | 'originGraph' | 'partnerMesh' | 'apiAccess'
  | 'proposals' | 'localAgent';

export function hasFeature(ent: Entitlements | null, key: FeatureKey): boolean {
  if (!ent) return false;
  switch (key) {
    case 'proposals': return ent.proposalWorkspaces > 0;
    case 'localAgent': return ent.localAgentDevices > 0;
    default: return Boolean(ent[key]);
  }
}

const PLAN_ORDER: PlanKey[] = ['launch_pass_30d', 'core', 'contractor_ops', 'origin_graph', 'partner_mesh_pro'];
const PLAN_LABEL: Record<PlanKey, string> = {
  launch_pass_30d: 'Launch Pass',
  core: 'Launchpad Core',
  contractor_ops: 'Contractor Ops',
  origin_graph: 'Ops + Origin Graph',
  partner_mesh_pro: 'Partner Mesh Pro',
};

/** Lowest plan that includes a feature — powers "Included in X and above". */
export function minPlanFor(key: FeatureKey): { planKey: PlanKey; label: string } | null {
  for (const p of PLAN_ORDER) {
    if (hasFeature(PLAN_ENTITLEMENTS[p], key)) return { planKey: p, label: PLAN_LABEL[p] };
  }
  return null;
}

/** The recurring SKU that unlocks a plan, read from the catalog rather than a
 *  second hardcoded list — a drifting copy here would send a buyer to Stripe
 *  for the wrong thing. Monthly on purpose: it is the smallest commitment that
 *  removes the block, and annual is one click further on the billing page. */
export function monthlyLookupKeyFor(planKey: PlanKey): string | null {
  const monthly = CATALOG.find(
    (p) => p.planKey === planKey && p.kind === 'plan' && p.billing === 'month',
  );
  if (monthly) return monthly.lookupKey;
  const pass = CATALOG.find((p) => p.planKey === planKey);
  return pass ? pass.lookupKey : null;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
export interface BillingState {
  loading: boolean;
  mode: 'full' | 'grace' | 'read_export' | 'none' | null;
  planKey: PlanKey | null;
  planLabel: string | null;
  entitlements: Entitlements | null;
  creditBalance: number | null;
  reason: string | null;
}

const EMPTY: BillingState = {
  loading: true, mode: null, planKey: null, planLabel: null,
  entitlements: null, creditBalance: null, reason: null,
};

const Ctx = createContext<BillingState>(EMPTY);

export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BillingState>(EMPTY);

  useEffect(() => {
    let alive = true;
    fetch('/api/fusarium/launchpad/billing/state', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        if (!d?.derived) { setState({ ...EMPTY, loading: false }); return; }
        const planKey = (d.derived.planKey ?? null) as PlanKey | null;
        setState({
          loading: false,
          mode: d.derived.mode ?? null,
          planKey,
          planLabel: planKey ? PLAN_LABEL[planKey] : null,
          entitlements: d.derived.entitlements ?? null,
          creditBalance: typeof d.creditBalance === 'number' ? d.creditBalance : null,
          reason: d.derived.reason ?? null,
        });
      })
      .catch(() => { if (alive) setState({ ...EMPTY, loading: false }); });
    return () => { alive = false; };
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useEntitlements(): BillingState {
  return useContext(Ctx);
}

// ---------------------------------------------------------------------------
// FeatureGate — renders children when the plan includes the feature; a locked
// plate otherwise. While billing state is loading, children render (we never
// flash a lock at someone entitled to the feature).
// ---------------------------------------------------------------------------
export function FeatureGate({ feature, children }: { feature: FeatureKey; children: ReactNode }) {
  const s = useEntitlements();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const min = minPlanFor(feature);
  const lookupKey = min ? monthlyLookupKeyFor(min.planKey) : null;

  // Hooks must run on every render, so the entitled early-return sits below them.
  if (s.loading || hasFeature(s.entitlements, feature)) return <>{children}</>;

  // Sends the buyer to Stripe for the exact plan that unlocks THIS panel. The
  // plate used to offer only a link to the pricing table, which made the person
  // who had already found the thing they wanted go and look for it again.
  async function upgrade() {
    if (!lookupKey) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch('/api/fusarium/launchpad/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lookupKey }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && typeof d?.url === 'string' && d.url.startsWith('https://')) {
        window.location.assign(d.url);
        return;
      }
      // Say what actually happened. The billing page still works, so the sale is
      // not lost — but claiming success here would be a lie.
      setErr(d?.error || 'Could not start the upgrade. Compare plans below.');
    } catch {
      setErr('Network error — could not reach billing.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="myco-glass-surface relative rounded-xl border border-border/70 p-8 text-center">
      <div className="myco-glass-tile h-11 w-11 mx-auto mb-3">
        <Lock className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-semibold">Not included in your current plan</p>
      <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
        {min ? <>This capability is included in <span className="font-medium text-foreground">{min.label}</span> and above.</>
             : 'This capability requires a plan upgrade.'}
        {' '}Your existing data is untouched — upgrading re-enables it in place.
      </p>

      {min && lookupKey && (
        <div className="mt-4 flex justify-center">
          <GlassButton onClick={upgrade} disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 text-current mr-2 animate-spin" /> Opening secure checkout…
              </>
            ) : (
              <>Upgrade to {min.label}</>
            )}
          </GlassButton>
        </div>
      )}

      {err && <p className="text-xs text-destructive mt-3">{err}</p>}

      <Link href="/app/launchpad/billing"
        className="inline-block mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 underline underline-offset-2">
        Compare plans
      </Link>
    </div>
  );
}

/** Small "included in X+" tag for page headers — visible even when unlocked,
 * so the demo shows what tier each capability belongs to. */
export function TierTag({ feature }: { feature: FeatureKey }) {
  const min = minPlanFor(feature);
  if (!min) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground border border-border/70 rounded-full px-2 py-0.5">
      {min.label}{min.planKey !== 'partner_mesh_pro' ? ' +' : ''}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Sidebar widgets
// ---------------------------------------------------------------------------
export function PlanBadge() {
  const s = useEntitlements();
  if (s.loading) return <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> plan…</span>;
  if (!s.planLabel) return <span className="text-[10px] text-muted-foreground">No plan selected</span>;
  return (
    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
      {s.planLabel}{s.mode === 'grace' ? ' · grace' : s.mode === 'read_export' ? ' · read/export' : ''}
    </span>
  );
}

export function CreditMeter() {
  const s = useEntitlements();
  const monthly = s.entitlements?.aiCreditsMonthly ?? null;
  return (
    <div className="px-2 py-1.5">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
        <span className="inline-flex items-center gap-1"><Coins className="h-3 w-3" /> AI credits</span>
        <span className="tabular-nums font-medium text-foreground">
          {s.creditBalance ?? '—'}{monthly ? <span className="text-muted-foreground font-normal"> / {monthly} mo</span> : null}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        {s.creditBalance != null && monthly ? (
          <div className="h-full bg-emerald-500/80"
            style={{ width: `${Math.max(0, Math.min(100, (s.creditBalance / monthly) * 100))}%` }} />
        ) : null}
      </div>
      <p className="text-[9px] text-muted-foreground mt-1 leading-snug">
        Managed AI only — bring-your-own-key actions never consume credits.
      </p>
    </div>
  );
}
