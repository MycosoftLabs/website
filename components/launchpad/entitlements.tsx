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

/** The cheapest RECURRING plan that actually unlocks a feature, with its price.
 *
 *  Deliberately not "the first plan in PLAN_ORDER". That order starts with
 *  launch_pass_30d, whose entitlements are byte-identical to core — so keying
 *  the upsell off it offered a $397 one-time 30-day pass in place of the
 *  $149/mo plan that unlocks exactly the same features. Worst case was a
 *  customer whose pass had just expired being sold the same pass again, at
 *  2.66x the price of the recurring plan the server had just told them to pick.
 *
 *  Scanning the catalog by entitlement keeps this correct on its own as plans
 *  change, and returning null rather than falling back to a one-time SKU means
 *  we show no button instead of the wrong price. */
export function upsellFor(
  key: FeatureKey,
): { lookupKey: string; label: string; unitAmount: number } | null {
  let best: { lookupKey: string; label: string; unitAmount: number } | null = null;
  for (const p of CATALOG) {
    if (p.kind !== 'plan' || p.billing !== 'month' || !p.planKey) continue;
    if (!hasFeature(PLAN_ENTITLEMENTS[p.planKey], key)) continue;
    if (!best || p.unitAmount < best.unitAmount) {
      best = { lookupKey: p.lookupKey, label: PLAN_LABEL[p.planKey], unitAmount: p.unitAmount };
    }
  }
  return best;
}

const usd = (cents: number) => `$${(cents / 100).toLocaleString('en-US')}`;

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

  const upsell = upsellFor(feature);

  // Hooks must run on every render, so the entitled early-return sits below them.
  if (s.loading || hasFeature(s.entitlements, feature)) return <>{children}</>;

  // Sends the buyer to Stripe for the plan that unlocks THIS panel. The plate
  // used to offer only a link to the pricing table, which made the person who
  // had already found the thing they wanted go and look for it again.
  async function upgrade() {
    if (!upsell) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch('/api/fusarium/launchpad/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lookupKey: upsell.lookupKey }),
      });
      const d = await r.json().catch(() => ({}));
      let target: URL | null = null;
      try {
        target = d?.url ? new URL(String(d.url)) : null;
      } catch {
        target = null;
      }
      // Pin the destination to Stripe. Nothing user-supplied reaches this value
      // today, but an open redirect is a cheap thing to close and an expensive
      // one to discover later.
      const toStripe =
        target !== null &&
        target.protocol === 'https:' &&
        (target.hostname === 'checkout.stripe.com' || target.hostname.endsWith('.stripe.com'));

      if (r.ok && toStripe && target) {
        // Deliberately NOT clearing busy here. `return` inside `try` still runs
        // `finally`, and location.assign does not stop execution — so clearing
        // it flipped the button back to its idle label while the redirect was
        // still in flight. That reads as a click that did not register, and a
        // second click creates a second payable Stripe session.
        window.location.assign(target.toString());
        return;
      }
      setErr(d?.error || 'Could not start the upgrade. Compare plans below.');
      setBusy(false);
    } catch {
      setErr('Network error — could not reach billing.');
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
        {upsell ? <>This capability is included in <span className="font-medium text-foreground">{upsell.label}</span> and above.</>
                : 'This capability requires a plan upgrade.'}
        {' '}Your existing data is untouched — upgrading re-enables it in place.
      </p>

      {upsell && (
        <div className="mt-4 flex justify-center">
          {/* Price and cadence on the control itself. The pricing page treats
              that disclosure as load-bearing, and a button that starts a real
              charge should not say less than the page selling the same plan. */}
          <GlassButton onClick={upgrade} disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 text-current mr-2 animate-spin" /> Opening secure checkout…
              </>
            ) : (
              <>Upgrade to {upsell.label} — {usd(upsell.unitAmount)}/mo</>
            )}
          </GlassButton>
        </div>
      )}

      {/* Only workspace owners and admins can complete a purchase; the checkout
          route enforces it. Saying so up front beats a 403 after the spinner. */}
      <p className="text-[11px] text-muted-foreground mt-2">
        A workspace owner or admin has to approve billing changes.
      </p>

      {err && (
        <p role="status" aria-live="polite" className="text-xs text-destructive mt-3">
          {err}
        </p>
      )}

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
