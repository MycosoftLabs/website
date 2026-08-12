'use client';

import { useCallback, useEffect, useState } from 'react';
import { CreditCard, Loader2, Coins } from 'lucide-react';
import { CATALOG, PLAN_ENTITLEMENTS, type PlanKey } from '@/lib/launchpad/catalog';

/**
 * Tenant billing — Stripe hosted checkout by lookup_key.
 *
 * The success redirect changes nothing here: entitlements appear only after
 * the verified webhook lands. Test mode and live mode differ only by env keys.
 */

interface BillingState {
  subscription: {
    plan_key: string | null; status: string;
    current_period_end: string | null; founding_pass_expires_at: string | null;
  } | null;
  derived: { mode: string; planKey: string | null; reason: string };
  creditBalance: number;
}

const PLAN_NAMES: Record<PlanKey, string> = {
  founding_pass_30d: 'Founding Launch Pass',
  core: 'Launchpad Core',
  contractor_ops: 'Contractor Ops',
  origin_graph: 'Ops + Origin Graph',
  partner_mesh_pro: 'Partner Mesh Pro',
};
const fmt = (c: number) => `$${(c / 100).toLocaleString('en-US')}`;

export default function BillingPage() {
  const [state, setState] = useState<BillingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/fusarium/launchpad/billing/state', { cache: 'no-store' });
      const d = await r.json();
      if (r.ok) { setState(d); setErr(null); }
      else setErr(d?.error || `HTTP ${r.status}`);
    } catch { setErr('Could not load billing state'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const checkout = async (lookupKey: string) => {
    setBusy(lookupKey); setErr(null);
    try {
      const r = await fetch('/api/fusarium/launchpad/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lookupKey }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d?.error || 'Checkout failed'); return; }
      if (d.url) window.location.href = d.url;
    } finally { setBusy(null); }
  };

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" /> Loading billing…
    </div>;
  }

  const plans = CATALOG.filter((p) => p.kind === 'plan' && p.billing === 'month');
  const packs = CATALOG.filter((p) => p.kind === 'credits');
  const pass = CATALOG.find((p) => p.kind === 'pass')!;

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <CreditCard className="h-6 w-6 text-primary" /> Billing
      </h1>

      <div className="rounded-lg border border-border/60 p-5 mb-8">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Current plan</div>
            <div className="font-semibold mt-1">
              {state?.derived.planKey ? PLAN_NAMES[state.derived.planKey as PlanKey] ?? state.derived.planKey : 'None'}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Access mode</div>
            <div className={`font-semibold mt-1 ${
              state?.derived.mode === 'full' ? 'text-emerald-500'
              : state?.derived.mode === 'grace' ? 'text-amber-500'
              : 'text-muted-foreground'}`}>
              {state?.derived.mode ?? 'unknown'}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <Coins className="h-3 w-3" /> AI credits
            </div>
            <div className="font-semibold mt-1 tabular-nums">{state?.creditBalance ?? 0}</div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">{state?.derived.reason}</p>
      </div>

      {err && <p className="text-sm text-destructive mb-4">{err}</p>}

      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Plans</h2>
      <div className="grid sm:grid-cols-2 gap-3 mb-8">
        <div className="rounded-lg border-2 border-primary/30 p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-sm">{PLAN_NAMES.founding_pass_30d}</span>
            <span className="font-bold">{fmt(pass.unitAmount)} <span className="text-xs font-normal text-muted-foreground">one time</span></span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Guided activation + 30 days of Core. Never auto-renews — a recurring plan is a separate,
            explicit choice.
          </p>
          <button onClick={() => checkout(pass.lookupKey)} disabled={!!busy}
            className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm font-medium disabled:opacity-50">
            {busy === pass.lookupKey ? 'Opening checkout…' : 'Purchase pass'}
          </button>
        </div>
        {plans.map((p) => (
          <div key={p.lookupKey} className="rounded-lg border border-border/60 p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-sm">{PLAN_NAMES[p.planKey as PlanKey]}</span>
              <span className="font-bold">{fmt(p.unitAmount)}<span className="text-xs font-normal text-muted-foreground">/mo</span></span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {PLAN_ENTITLEMENTS[p.planKey as PlanKey].users} users ·{' '}
              {PLAN_ENTITLEMENTS[p.planKey as PlanKey].aiCreditsMonthly} credits/mo ·{' '}
              {PLAN_ENTITLEMENTS[p.planKey as PlanKey].activeOpportunityWatches} watches
            </p>
            <button onClick={() => checkout(p.lookupKey)} disabled={!!busy}
              className="w-full rounded-lg border border-border py-2 text-sm font-medium hover:bg-muted disabled:opacity-50">
              {busy === p.lookupKey ? 'Opening checkout…' : 'Select plan'}
            </button>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Credit packs</h2>
      <div className="grid grid-cols-3 gap-3 mb-8">
        {packs.map((p) => (
          <button key={p.lookupKey} onClick={() => checkout(p.lookupKey)} disabled={!!busy}
            className="rounded-lg border border-border/60 p-4 text-center hover:border-primary/40 disabled:opacity-50">
            <div className="font-bold tabular-nums">{p.creditQuantity?.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">credits</div>
            <div className="text-sm font-semibold mt-1">{fmt(p.unitAmount)}</div>
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Payments are processed by Stripe on its hosted checkout — Launchpad never sees card details.
        A failed renewal leads to a grace period, then read/export mode. Your records are never
        destroyed over a billing problem.
      </p>
    </div>
  );
}
