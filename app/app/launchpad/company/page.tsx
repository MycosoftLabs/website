'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, Loader2, Save } from 'lucide-react';

/**
 * Company profile — public/business facts only. The form deliberately has no
 * EIN, ownership, bank, or clearance fields: restricted identifiers stay in
 * the customer's own systems (the API refuses them by name as well).
 */

const SECTIONS: Array<{
  title: string;
  fields: Array<{ key: string; label: string; hint?: string; multiline?: boolean }>;
}> = [
  {
    title: 'Identity',
    fields: [
      { key: 'legal_name', label: 'Legal name' },
      { key: 'entity_type', label: 'Entity type', hint: 'LLC, C-Corp…' },
      { key: 'entity_state', label: 'State of formation' },
      { key: 'site', label: 'Primary site (city, state)' },
      { key: 'website', label: 'Website' },
      { key: 'headcount', label: 'Headcount' },
    ],
  },
  {
    title: 'Federal registration',
    fields: [
      { key: 'uei', label: 'UEI', hint: 'public identifier' },
      { key: 'cage', label: 'CAGE code', hint: 'public identifier' },
      { key: 'sam_status', label: 'SAM.gov status', hint: 'active / in progress / not started' },
      { key: 'naics', label: 'NAICS candidates', hint: 'comma-separated' },
      { key: 'target_agencies', label: 'Target agencies' },
    ],
  },
  {
    title: 'Capability and scope (your own words — used verbatim in drafts)',
    fields: [
      { key: 'capability_summary', label: 'What the company builds', multiline: true },
      { key: 'boundary_description', label: 'Assessment boundary description', multiline: true, hint: 'Which systems/people/facilities are in scope. Leave blank if undecided — drafts will show a placeholder instead of a guess.' },
      { key: 'stack_summary', label: 'Systems in scope', multiline: true, hint: 'e.g. M365 GCC, Google Workspace, endpoints, cloud' },
    ],
  },
];

const input = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm';

export default function CompanyPage() {
  const [data, setData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/fusarium/launchpad/company', { cache: 'no-store' });
      const d = await r.json();
      if (r.ok) setData(Object.fromEntries(Object.entries(d.data ?? {}).map(([k, v]) => [k, String(v ?? '')])));
      else setErr(d?.error || `HTTP ${r.status}`);
    } catch { setErr('Could not load profile'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true); setErr(null); setMsg(null);
    try {
      const r = await fetch('/api/fusarium/launchpad/company', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setErr(d?.error || 'Save failed');
      else setMsg('Saved');
      setTimeout(() => setMsg(null), 2500);
    } finally { setSaving(false); }
  };

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" /> Loading profile…
    </div>;
  }

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-1">
        <Building2 className="h-6 w-6 text-primary" /> Company profile
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Public and business facts only. Restricted identifiers (EIN, ownership detail, banking,
        clearance specifics) are not collected here and are refused by the API — keep them in your
        own systems.
      </p>

      {SECTIONS.map((s) => (
        <div key={s.title} className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">{s.title}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {s.fields.map((f) => (
              <div key={f.key} className={f.multiline ? 'sm:col-span-2' : ''}>
                <label className="text-sm font-medium block mb-1">{f.label}</label>
                {f.multiline ? (
                  <textarea rows={3} className={input} value={data[f.key] ?? ''}
                    onChange={(e) => setData((x) => ({ ...x, [f.key]: e.target.value }))} />
                ) : (
                  <input className={input} value={data[f.key] ?? ''}
                    onChange={(e) => setData((x) => ({ ...x, [f.key]: e.target.value }))} />
                )}
                {f.hint && <p className="text-[11px] text-muted-foreground mt-1">{f.hint}</p>}
              </div>
            ))}
          </div>
        </div>
      ))}

      {err && <p className="text-sm text-destructive mb-3">{err}</p>}
      {msg && <p className="text-sm text-emerald-500 mb-3">{msg}</p>}

      <button onClick={save} disabled={saving}
        className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium disabled:opacity-50">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save profile
      </button>
    </div>
  );
}
