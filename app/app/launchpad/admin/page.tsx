'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, ShieldAlert, UserCog } from 'lucide-react';
import { CATALOG } from '@/lib/launchpad/catalog';
import { PageHeader, Card, StatTile, StateBadge } from '@/components/launchpad/ui';
import { GlassButton } from '@/components/ui/glass-button';

interface TenantRow {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  memberCount: number;
  ownerEmail: string | null;
  planKey: string | null;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

interface HealthState {
  platform: {
    supabase: { status: string; detail?: string };
    mindex: { status: string; detail?: string };
    mas: { status: string; detail?: string };
  };
  flags: { launchpadEnabled: boolean; publicCheckoutEnabled: boolean; waitlistMode: boolean };
  collectors: { samConfigured: boolean };
  advisory: { calcomConfigured: boolean; blockingReason: string | null };
  signatures: { docusignConfigured: boolean; blockingReason: string | null };
}

interface ActivityState {
  events: Array<{ tenant_id: string; action: string; created_at: string; actor_type: string }>;
  purchases: Array<{
    email: string | null;
    lookup_key: string | null;
    status: string;
    company: string | null;
    created_at: string;
  }>;
}

const PLAN_PRODUCTS = CATALOG.filter((p) => p.kind === 'plan' && p.billing === 'month');

function toneFor(status: string): 'emerald' | 'amber' | 'red' | 'slate' {
  if (status === 'ok' || status === 'active') return 'emerald';
  if (status === 'unconfigured' || status === 'grace') return 'amber';
  if (status === 'down' || status === 'canceled' || status === 'suspended') return 'red';
  return 'slate';
}

export default function LaunchpadOperatorPage() {
  const [tenants, setTenants] = useState<TenantRow[] | null>(null);
  const [health, setHealth] = useState<HealthState | null>(null);
  const [activity, setActivity] = useState<ActivityState | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Which plan each row's dropdown is showing. The button used to read its
  // sibling <select> by walking parentElement, which silently breaks the moment
  // the markup around it changes — and it did, when this toolbar was regrouped.
  const [grantChoice, setGrantChoice] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const [t, h, a] = await Promise.all([
        fetch('/api/fusarium/launchpad/admin/tenants', { cache: 'no-store' }),
        fetch('/api/fusarium/launchpad/admin/health', { cache: 'no-store' }),
        fetch('/api/fusarium/launchpad/admin/activity', { cache: 'no-store' }),
      ]);
      if (t.status === 403 || h.status === 403) {
        setErr('Operator access required.');
        return;
      }
      const td = await t.json();
      const hd = await h.json();
      const ad = await a.json();
      if (!t.ok) {
        setErr(td?.error || 'Could not load tenants');
        return;
      }
      setTenants(Array.isArray(td.tenants) ? td.tenants : []);
      setHealth(h.ok ? hd : null);
      setActivity(a.ok ? ad : null);
      setErr(null);
    } catch {
      setErr('Could not reach operator APIs.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const switchTenant = async (tenantId: string) => {
    setBusy(`switch:${tenantId}`);
    try {
      const r = await fetch('/api/fusarium/launchpad/admin/switch-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(d?.error || 'Could not open workspace');
        return;
      }
      window.location.assign('/app/launchpad/dashboard');
    } finally {
      setBusy(null);
    }
  };

  const grant = async (tenantId: string, lookupKey: string) => {
    setBusy(`grant:${tenantId}:${lookupKey}`);
    try {
      const r = await fetch('/api/fusarium/launchpad/admin/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, lookupKey }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(d?.error || 'Grant failed');
        return;
      }
      await load();
    } finally {
      setBusy(null);
    }
  };

  const runRadar = async () => {
    setBusy('radar');
    try {
      const r = await fetch('/api/fusarium/launchpad/admin/radar', { method: 'POST' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(d?.error || 'Radar ingest failed');
        return;
      }
      if (d.skipped) {
        setErr(d.message || 'SAM is not configured. Radar stays empty.');
        return;
      }
      setErr(null);
      await load();
    } finally {
      setBusy(null);
    }
  };

  if (!tenants && !err) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading operator view…
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto px-4 py-6 md:py-8">
      <PageHeader
        title="Operator"
        icon={UserCog}
        description="Paying workspaces, platform hops, and audited grants. Commercial / non-CUI only. Site super-admin does not silently own every tenant."
      />

      {err && (
        <Card tone="red" className="p-4 mb-5">
          <div className="pl-1.5 flex items-start gap-2 text-sm">
            <ShieldAlert className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <span>{err}</span>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <StatTile label="Workspaces" tone="emerald" value={tenants?.length ?? '—'} />
        <StatTile
          label="Supabase"
          tone={toneFor(health?.platform.supabase.status ?? '')}
          value={health?.platform.supabase.status ?? '—'}
          sub={health?.platform.supabase.detail}
        />
        <StatTile
          label="MYCA / MINDEX"
          tone={toneFor(health?.platform.mas.status === 'ok' && health.platform.mindex.status === 'ok' ? 'ok' : health?.platform.mas.status ?? '')}
          value={`${health?.platform.mas.status ?? '—'} / ${health?.platform.mindex.status ?? '—'}`}
        />
      </div>

      <Card className="p-4 mb-6">
        <div className="pl-1.5 space-y-2 text-sm">
          <div className="flex flex-wrap gap-2">
            <StateBadge tone={health?.flags.launchpadEnabled ? 'emerald' : 'red'}>
              App {health?.flags.launchpadEnabled ? 'on' : 'off'}
            </StateBadge>
            <StateBadge tone={health?.flags.publicCheckoutEnabled ? 'emerald' : 'red'}>
              Checkout {health?.flags.publicCheckoutEnabled ? 'on' : 'off'}
            </StateBadge>
            <StateBadge tone={health?.flags.waitlistMode ? 'amber' : 'emerald'}>
              Waitlist {health?.flags.waitlistMode ? 'on' : 'off'}
            </StateBadge>
            <StateBadge tone={health?.collectors.samConfigured ? 'emerald' : 'amber'}>
              SAM {health?.collectors.samConfigured ? 'configured' : 'not configured'}
            </StateBadge>
            <StateBadge tone={health?.advisory.calcomConfigured ? 'emerald' : 'amber'}>
              Cal.com {health?.advisory.calcomConfigured ? 'configured' : 'not configured'}
            </StateBadge>
            <StateBadge tone={health?.signatures.docusignConfigured ? 'emerald' : 'amber'}>
              DocuSign {health?.signatures.docusignConfigured ? 'configured' : 'not configured'}
            </StateBadge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 sm:max-w-md gap-3 pt-2">
            <GlassButton onClick={runRadar} disabled={!!busy} className="myco-glass-button--block min-h-[44px]">
              {busy === 'radar' ? 'Running SAM…' : 'Run SAM ingest'}
            </GlassButton>
            <GlassButton onClick={() => void load()} disabled={!!busy} className="myco-glass-button--block min-h-[44px]">
              Refresh
            </GlassButton>
          </div>
        </div>
      </Card>

      <h2 className="text-base font-bold mb-3">Paying workspaces</h2>
      {!tenants?.length ? (
        <Card className="p-5 mb-6">
          <p className="text-sm text-muted-foreground pl-1.5">No Launchpad tenants yet. Seed or complete a checkout.</p>
        </Card>
      ) : (
        <div className="space-y-3 mb-8">
          {tenants.map((row) => (
            <Card key={row.id} className="p-4">
              <div className="pl-1.5 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{row.name}</div>
                    <div className="text-xs text-muted-foreground break-all">{row.ownerEmail ?? 'owner email not resolved'}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {row.planKey ?? 'no plan'} · {row.subscriptionStatus ?? '—'} · {row.memberCount} members
                    </div>
                  </div>
                  <GlassButton
                    onClick={() => void switchTenant(row.id)}
                    disabled={!!busy}
                    className="myco-glass-button--block min-h-[44px] sm:max-w-[12rem]"
                  >
                    {busy === `switch:${row.id}` ? 'Opening…' : 'Open workspace'}
                  </GlassButton>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2 items-center">
                  <label className="text-xs text-muted-foreground sr-only" htmlFor={`grant-${row.id}`}>
                    Grant plan
                  </label>
                  <select
                    id={`grant-${row.id}`}
                    className="myco-glass-field text-base rounded-lg border border-border px-3 py-3 min-h-[44px] w-full"
                    value={grantChoice[row.id] ?? PLAN_PRODUCTS[0]?.lookupKey ?? ''}
                    disabled={!!busy}
                    onChange={(e) => {
                      const v = e.target.value;
                      setGrantChoice((g) => ({ ...g, [row.id]: v }));
                    }}
                  >
                    {PLAN_PRODUCTS.map((p) => (
                      <option key={p.lookupKey} value={p.lookupKey}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <GlassButton
                    className="myco-glass-button--block min-h-[44px]"
                    disabled={!!busy}
                    onClick={() => {
                      const lookupKey = grantChoice[row.id] ?? PLAN_PRODUCTS[0]?.lookupKey;
                      if (lookupKey) void grant(row.id, lookupKey);
                    }}
                  >
                    Grant plan
                  </GlassButton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <h2 className="text-base font-bold mb-3">Recent purchases</h2>
      <Card className="p-4 mb-6 overflow-x-auto">
        {!activity?.purchases?.length ? (
          <p className="text-sm text-muted-foreground pl-1.5">No checkout rows yet.</p>
        ) : (
          <table className="min-w-[640px] w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">SKU</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">When</th>
              </tr>
            </thead>
            <tbody>
              {activity.purchases.map((p) => (
                <tr key={`${p.email}-${p.created_at}`} className="border-t border-border/60">
                  <td className="py-2 pr-3 break-all">{p.email ?? '—'}</td>
                  <td className="py-2 pr-3">{p.lookup_key ?? '—'}</td>
                  <td className="py-2 pr-3">{p.status}</td>
                  <td className="py-2">{p.created_at ? new Date(p.created_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <h2 className="text-base font-bold mb-3">Audit</h2>
      <Card className="p-4 overflow-x-auto">
        {!activity?.events?.length ? (
          <p className="text-sm text-muted-foreground pl-1.5">No audit events yet.</p>
        ) : (
          <table className="min-w-[640px] w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3">Action</th>
                <th className="py-2 pr-3">Actor</th>
                <th className="py-2">When</th>
              </tr>
            </thead>
            <tbody>
              {activity.events.map((ev) => (
                <tr key={`${ev.action}-${ev.created_at}`} className="border-t border-border/60">
                  <td className="py-2 pr-3">{ev.action}</td>
                  <td className="py-2 pr-3">{ev.actor_type}</td>
                  <td className="py-2">{ev.created_at ? new Date(ev.created_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
