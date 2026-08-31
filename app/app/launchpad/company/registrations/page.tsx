'use client';

/**
 * Registrations — portal account inventory (GTM §19.3).
 *
 * Records WHO owns each federal portal account, the login EMAIL, the MFA
 * method, and the renewal clock. Passwords are refused by shape on both the
 * client and the API — they belong in a password manager, never here.
 */

import { useCallback, useEffect, useState } from 'react';
import { Landmark, Loader2, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import { PageHeader, Card, StateBadge, type Tone } from '@/components/launchpad/ui';
import { CompanyTabs } from '@/components/launchpad/company-tabs';
import { GlassButton } from '@/components/ui/glass-button';
import { OfficialLinksPanel } from '@/components/launchpad/official-links';

const API = '/api/fusarium/launchpad/registrations';
const input = 'myco-glass-field w-full rounded-lg border border-border px-3 py-2 text-sm';

interface RegistrationRecord {
  id: string;
  record_type: string;
  label: string;
  portal: string | null;
  identifier: string | null;
  owner_name: string | null;
  authorized_rep: string | null;
  owner_email: string | null;
  mfa_method: string | null;
  status: string;
  last_verified_at: string | null;
  renewal_at: string | null;
  notes: string | null;
  updated_at: string;
}

const PORTALS = ['Login.gov', 'SAM.gov', 'SPRS', 'DSIP', 'Grants.gov', 'NSPIRES', 'Research.gov', 'DIU', 'PIEE', 'DIBNet', 'other'];

const MFA_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'authenticator_app', label: 'Authenticator app (TOTP codes)' },
  { value: 'hardware_key', label: 'Hardware security key (FIDO2)' },
  { value: 'piv_cac', label: 'PIV / CAC card' },
  { value: 'sms', label: 'SMS codes (weakest — upgrade when you can)' },
  { value: 'phone_call', label: 'Phone call' },
  { value: 'none_yet', label: 'Not set up yet' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS: Array<{ value: string; label: string; tone: Tone }> = [
  { value: 'not_started', label: 'Not started', tone: 'slate' },
  { value: 'in_progress', label: 'In progress', tone: 'sky' },
  { value: 'active', label: 'Active', tone: 'emerald' },
  { value: 'expired', label: 'Expired', tone: 'red' },
  { value: 'retired', label: 'Retired', tone: 'slate' },
];

const statusTone = (s: string): Tone => STATUS_OPTIONS.find((o) => o.value === s)?.tone ?? 'slate';
const statusLabel = (s: string): string => STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;
const mfaLabel = (m: string | null): string | null => (m ? (MFA_OPTIONS.find((o) => o.value === m)?.label ?? m) : null);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Client-side mirror of the API's credential shape guard for the login email. */
function loginEmailProblem(value: string): string | null {
  const s = value.trim();
  if (!s || EMAIL_RE.test(s)) return null;
  let classes = 0;
  if (/[a-z]/.test(s)) classes += 1;
  if (/[A-Z]/.test(s)) classes += 1;
  if (/\d/.test(s)) classes += 1;
  if (/[^A-Za-z0-9._-]/.test(s)) classes += 1;
  const secretShaped =
    /\b(sk|pk|rk|ghp|gho|glpat|xox[a-z]?|pplx|AIza|AKIA|eyJ)[A-Za-z0-9_.-]{10,}/.test(s) ||
    (!/\s/.test(s) && s.length >= 12 && classes >= 3);
  if (secretShaped) {
    return 'That looks like a password or secret. Never store passwords here — use your password manager. Launchpad records the login email only.';
  }
  return 'Enter the login email address for this account.';
}

function renewalInfo(renewalAt: string | null): { tone: Tone; label: string; overdue: boolean } | null {
  if (!renewalAt) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${renewalAt}T00:00:00`);
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return { tone: 'amber', label: `Renewal overdue by ${-days}d`, overdue: true };
  if (days <= 45) return { tone: 'amber', label: `Renewal due in ${days}d`, overdue: false };
  return { tone: 'slate', label: `Renews ${due.toLocaleDateString()}`, overdue: false };
}

const EMPTY_FORM = {
  portal: 'Login.gov', identifier: '', ownerName: '', authorizedRep: '',
  ownerEmail: '', mfaMethod: 'none_yet', status: 'not_started',
  lastVerifiedAt: '', renewalAt: '', notes: '',
};

export default function RegistrationsPage() {
  const [records, setRecords] = useState<RegistrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const load = useCallback(async () => {
    try {
      const r = await fetch(API, { cache: 'no-store' });
      const d = await r.json();
      if (r.ok) { setRecords(d.records ?? []); setErr(null); }
      else setErr(d?.error || `HTTP ${r.status}`);
    } catch { setErr('Could not load registration records'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const emailProblem = loginEmailProblem(form.ownerEmail);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailProblem) { setErr(emailProblem); return; }
    setSaving(true); setErr(null);
    try {
      const r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordType: 'portal',
          portal: form.portal,
          identifier: form.identifier || undefined,
          ownerName: form.ownerName || undefined,
          authorizedRep: form.authorizedRep || undefined,
          ownerEmail: form.ownerEmail || undefined,
          mfaMethod: form.mfaMethod,
          status: form.status,
          lastVerifiedAt: form.lastVerifiedAt || undefined,
          renewalAt: form.renewalAt || undefined,
          notes: form.notes || undefined,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d?.error || 'Save failed'); return; }
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      await load();
    } finally { setSaving(false); }
  };

  const patchRecord = async (id: string, body: Record<string, unknown>) => {
    setBusyId(id); setErr(null);
    try {
      const r = await fetch(API, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...body }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d?.error || 'Update failed'); return; }
      await load();
    } finally { setBusyId(null); }
  };

  const removeRecord = async (id: string, label: string) => {
    if (!window.confirm(`Remove the record for "${label}"? This deletes the inventory row only — the portal account itself is untouched.`)) return;
    setBusyId(id); setErr(null);
    try {
      const r = await fetch(`${API}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d?.error || 'Delete failed'); return; }
      await load();
    } finally { setBusyId(null); }
  };

  const portalRecords = records.filter((r) => r.record_type === 'portal');

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <CompanyTabs />
      <PageHeader
        title="Registrations"
        icon={Landmark}
        description="Your inventory of federal portal accounts — who owns each login, its email, MFA method, and renewal clock."
        actions={
          <GlassButton onClick={() => setShowForm((s) => !s)}>
            <Plus className="h-4 w-4 text-current mr-2" /> Add account
          </GlassButton>
        }
      />

      <Card tone="sky" className="p-5 mb-4">
        <div className="pl-1.5 grid gap-3 sm:grid-cols-3 text-sm">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">What is this</div>
            <p className="text-muted-foreground leading-relaxed">
              A registry of every government portal account your company holds. Each row records the
              portal, your organization identifier, the account owner, the login email, and the
              MFA method (multi-factor authentication — the second step beyond a password).
            </p>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Why it matters</div>
            <p className="text-muted-foreground leading-relaxed">
              Portal registrations expire. A lapsed SAM.gov registration makes you ineligible for new
              awards and can stop payment on existing ones. Knowing who owns each login prevents the
              classic failure: the one person with access leaves.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Your next step</div>
            <p className="text-muted-foreground leading-relaxed">
              Follow the path in order: <span className="text-foreground font-medium">Login.gov → SAM.gov → UEI → reps &amp; certs → CAGE → annual renewal</span>.
              Record each account here as you create it.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5 mb-4">
        <div className="pl-1.5">
          <h2 className="text-sm font-semibold mb-2">The registration path, in order</h2>
          <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground leading-relaxed">
            <li><span className="text-foreground font-medium">Login.gov</span> — one free account that is the sign-in for SAM.gov and most federal portals. Set up a strong MFA method here first.</li>
            <li><span className="text-foreground font-medium">SAM.gov entity registration</span> — free (no third party can charge you for it). This is where your company becomes visible to the government.</li>
            <li><span className="text-foreground font-medium">UEI issued</span> — the Unique Entity ID, a 12-character identifier SAM.gov assigns during registration. It replaced the DUNS number, which was retired in 2022 — if a site asks for DUNS, it is out of date.</li>
            <li><span className="text-foreground font-medium">Reps &amp; certs</span> — representations and certifications, a questionnaire inside SAM.gov where you attest to facts about your business (size, ownership, compliance). Answer honestly; these are certifications to the government.</li>
            <li><span className="text-foreground font-medium">CAGE code via DLA</span> — the Commercial and Government Entity code, assigned automatically by the Defense Logistics Agency while SAM processes your registration. No separate application.</li>
            <li><span className="text-foreground font-medium">Annual renewal</span> — SAM registration expires every 365 days. Renew early; processing can take weeks.</li>
          </ol>
        </div>
      </Card>

      <Card tone="amber" className="p-4 mb-6">
        <div className="pl-1.5 flex items-start gap-2.5">
          <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Never store passwords here — use your password manager.</span>{' '}
            This inventory records the login email, owner, and MFA method only. The form and the API
            both refuse values shaped like passwords or secrets, and EIN / DUNS values are refused too.
          </p>
        </div>
      </Card>

      {err && <p className="text-sm text-destructive mb-4">{err}</p>}

      {showForm && (
        <form onSubmit={submit} className="rounded-xl border border-border/60 p-5 mb-8 space-y-4 bg-muted/10">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Portal *</label>
              <select className={input} value={form.portal}
                onChange={(e) => setForm((x) => ({ ...x, portal: e.target.value }))}>
                {PORTALS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Organization identifier</label>
              <input className={input} placeholder="e.g. your UEI or CAGE — never an EIN" value={form.identifier}
                onChange={(e) => setForm((x) => ({ ...x, identifier: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Account owner</label>
              <input className={input} placeholder="Person responsible for this login" value={form.ownerName}
                onChange={(e) => setForm((x) => ({ ...x, ownerName: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Authorized org representative</label>
              <input className={input} placeholder="Who may act for the company in this portal" value={form.authorizedRep}
                onChange={(e) => setForm((x) => ({ ...x, authorizedRep: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Login email</label>
              <input className={input} type="text" placeholder="name@company.com" value={form.ownerEmail}
                onChange={(e) => setForm((x) => ({ ...x, ownerEmail: e.target.value }))} />
              {emailProblem
                ? <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">{emailProblem}</p>
                : <p className="text-[11px] text-muted-foreground mt-1">Email only — never store passwords here; use your password manager.</p>}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">MFA method</label>
              <select className={input} value={form.mfaMethod}
                onChange={(e) => setForm((x) => ({ ...x, mfaMethod: e.target.value }))}>
                {MFA_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Status</label>
              <select className={input} value={form.status}
                onChange={(e) => setForm((x) => ({ ...x, status: e.target.value }))}>
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Last verified</label>
                <input className={input} type="date" value={form.lastVerifiedAt}
                  onChange={(e) => setForm((x) => ({ ...x, lastVerifiedAt: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Renewal date</label>
                <input className={input} type="date" value={form.renewalAt}
                  onChange={(e) => setForm((x) => ({ ...x, renewalAt: e.target.value }))} />
              </div>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Notes</label>
            <textarea rows={2} className={input} placeholder="Anything a teammate needs to know — never credentials"
              value={form.notes}
              onChange={(e) => setForm((x) => ({ ...x, notes: e.target.value }))} />
          </div>
          <GlassButton type="submit" disabled={saving || !!emailProblem}>
            {saving ? 'Saving…' : 'Record account'}
          </GlassButton>
        </form>
      )}

      {loading ? (
        <div className="min-h-[20vh] flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-current" /> Loading accounts…
        </div>
      ) : portalRecords.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          No portal accounts recorded yet. Start with Login.gov — it is the front door to SAM.gov and
          most other federal portals — then record each account here as you create it.
        </div>
      ) : (
        <div className="space-y-2">
          {portalRecords.map((r) => {
            const renewal = renewalInfo(r.renewal_at);
            return (
              <Card key={r.id} tone={renewal?.overdue ? 'amber' : undefined} className="p-4">
                <div className="pl-1.5">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="font-medium text-sm">{r.portal ?? r.label}</span>
                    {r.identifier && <code className="text-[11px] px-1.5 py-0.5 rounded bg-muted tabular-nums">{r.identifier}</code>}
                    <StateBadge tone={statusTone(r.status)}>{statusLabel(r.status)}</StateBadge>
                    {renewal && <StateBadge tone={renewal.tone}>{renewal.label}</StateBadge>}
                    <div className="ml-auto flex items-center gap-2">
                      <select
                        className="myco-glass-field rounded-lg border border-border px-2 py-1 text-xs"
                        value={r.status}
                        disabled={busyId === r.id}
                        onChange={(e) => patchRecord(r.id, { status: e.target.value })}
                        aria-label="Change status"
                      >
                        {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => removeRecord(r.id, r.portal ?? r.label)}
                        className="text-muted-foreground hover:text-red-500 transition-colors"
                        title="Remove record"
                        aria-label="Remove record"
                      >
                        {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin text-current" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    {r.owner_name && <span>owner: <span className="text-foreground">{r.owner_name}</span></span>}
                    {r.authorized_rep && <span>authorized rep: <span className="text-foreground">{r.authorized_rep}</span></span>}
                    {r.owner_email && <span>login email: <span className="text-foreground">{r.owner_email}</span></span>}
                    {r.mfa_method && <span>MFA: <span className="text-foreground">{mfaLabel(r.mfa_method)}</span></span>}
                    <span className="tabular-nums">
                      last verified: {r.last_verified_at ? new Date(`${r.last_verified_at}T00:00:00`).toLocaleDateString() : 'never'}
                    </span>
                    <GlassButton
                      className="text-xs"
                      disabled={busyId === r.id}
                      onClick={() => patchRecord(r.id, { lastVerifiedAt: new Date().toISOString().slice(0, 10) })}
                    >
                      mark verified today
                    </GlassButton>
                  </div>
                  {r.notes && <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">{r.notes}</p>}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <OfficialLinksPanel surface="registrations" />
    </div>
  );
}
