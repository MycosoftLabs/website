'use client';

import { useCallback, useEffect, useState } from 'react';
import { CreditCard, Loader2, Coins, AlertTriangle, Layers } from 'lucide-react';
import { CATALOG, PLAN_ENTITLEMENTS, type PlanKey } from '@/lib/launchpad/catalog';
import { PageHeader, Card, StatTile } from '@/components/launchpad/ui';
import { GlassButton } from '@/components/ui/glass-button';

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
  launch_pass_30d: 'Launch Pass',
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

  const openPortal = async () => {
    setBusy('portal');
    setErr(null);
    try {
      const r = await fetch('/api/fusarium/launchpad/billing/portal', { method: 'POST' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(d?.error || 'Billing portal is not available');
        return;
      }
      if (d.url) window.location.href = d.url;
    } finally {
      setBusy(null);
    }
  };

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
      <Loader2 className="h-5 w-5 animate-spin text-current" /> Loading billing…
    </div>;
  }

  const plans = CATALOG.filter((p) => p.kind === 'plan' && p.billing === 'month');
  const packs = CATALOG.filter((p) => p.kind === 'credits');
  const pass = CATALOG.find((p) => p.kind === 'pass')!;

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <PageHeader
        title="Billing"
        icon={CreditCard}
        description="Your plan, AI-credit balance, and the checkout for changing either — all payment handling stays on Stripe's side."
      />

      {/* Education-first: what / why / next step */}
      <Card tone="sky" className="p-5 mb-5">
        <div className="pl-1.5 grid gap-3 sm:grid-cols-3 text-sm">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">What is this</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This workspace&rsquo;s plan, AI-credit balance, and the checkout to change either.
              Every payment runs on Stripe&rsquo;s hosted checkout — card details never touch
              Launchpad.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Why it matters</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A purchase unlocks features only after Stripe&rsquo;s verified webhook lands — the
              success redirect alone changes nothing, so give a fresh purchase a moment to appear
              here.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Your next step</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              No plan yet? The Launch Pass is the one-time, never-auto-renewing way to start.
              Already on a plan? Top up AI credits with a pack below.
            </p>
          </div>
        </div>
      </Card>

      {/* Current state at a glance */}
      <div className="grid sm:grid-cols-3 gap-3 mb-3">
        <StatTile
          label="Current plan"
          tone={state?.derived.planKey ? 'emerald' : 'slate'}
          value={
            <span className="text-lg">
              {state?.derived.planKey ? PLAN_NAMES[state.derived.planKey as PlanKey] ?? state.derived.planKey : 'None'}
            </span>
          }
        />
        <StatTile
          label="Access mode"
          tone={
            state?.derived.mode === 'full' ? 'emerald'
            : state?.derived.mode === 'grace' ? 'amber'
            : 'slate'
          }
          value={<span className="text-lg">{state?.derived.mode ?? 'unknown'}</span>}
        />
        <StatTile
          label="AI credits"
          tone="sky"
          value={
            <span className="inline-flex items-center gap-2">
              <Coins className="h-5 w-5 text-current" />
              {state?.creditBalance ?? 0}
            </span>
          }
        />
      </div>
      <p className="text-xs text-muted-foreground mb-4">{state?.derived.reason}</p>
      {state?.subscription?.plan_key && (
        <div className="mb-8">
          <GlassButton onClick={openPortal} disabled={!!busy}>
            {busy === 'portal' ? 'Opening portal…' : 'Manage billing on Stripe'}
          </GlassButton>
        </div>
      )}

      {err && (
        <Card tone="red" className="p-4 mb-5">
          <div className="pl-1.5 flex items-start gap-2.5 text-sm">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <span>{err}</span>
          </div>
        </Card>
      )}

      <h2 className="text-base font-bold flex items-center gap-2 mb-3">
        <Layers className="h-5 w-5 text-emerald-500" /> Plans
      </h2>
      <div className="grid sm:grid-cols-2 gap-3 mb-8">
        <Card tone="emerald" className="p-4">
          <div className="pl-1.5">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-sm">{PLAN_NAMES.launch_pass_30d}</span>
              <span className="font-bold">{fmt(pass.unitAmount)} <span className="text-xs font-normal text-muted-foreground">one time</span></span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Guided activation + 30 days of Core. Never auto-renews — a recurring plan is a separate,
              explicit choice.
            </p>
            <GlassButton onClick={() => checkout(pass.lookupKey)} disabled={!!busy} className="myco-glass-button--block">
              {busy === pass.lookupKey ? 'Opening checkout…' : 'Purchase pass'}
            </GlassButton>
          </div>
        </Card>
        {plans.map((p) => (
          <Card key={p.lookupKey} className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-sm">{PLAN_NAMES[p.planKey as PlanKey]}</span>
              <span className="font-bold">{fmt(p.unitAmount)}<span className="text-xs font-normal text-muted-foreground">/mo</span></span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {PLAN_ENTITLEMENTS[p.planKey as PlanKey].users} users ·{' '}
              {PLAN_ENTITLEMENTS[p.planKey as PlanKey].aiCreditsMonthly} credits/mo ·{' '}
              {PLAN_ENTITLEMENTS[p.planKey as PlanKey].activeOpportunityWatches} watches
            </p>
            <GlassButton onClick={() => checkout(p.lookupKey)} disabled={!!busy} className="myco-glass-button--block">
              {busy === p.lookupKey ? 'Opening checkout…' : 'Select plan'}
            </GlassButton>
          </Card>
        ))}
      </div>

      <h2 className="text-base font-bold flex items-center gap-2 mb-3">
        <Coins className="h-5 w-5 text-emerald-500" /> Credit packs
      </h2>
      <div className="grid grid-cols-3 gap-3 mb-8">
        {packs.map((p) => (
          <button key={p.lookupKey} onClick={() => checkout(p.lookupKey)} disabled={!!busy}
            className="myco-glass-soft-btn rounded-lg border border-border/60 p-4 text-center disabled:opacity-50">
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
