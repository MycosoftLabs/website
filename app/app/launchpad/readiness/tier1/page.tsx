'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ClipboardList, Loader2, Plus, Trash2, Check, AlertTriangle,
  GraduationCap, Users, Siren, Radio, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageHeader, Card, StatTile, StateBadge, type Tone } from '@/components/launchpad/ui';
import { LiquidRadio } from '@/components/launchpad/liquid';
import { GlassButton } from '@/components/ui/glass-button';
import { OfficialLinksPanel } from '@/components/launchpad/official-links';

/**
 * Tier-1 Turnkey — the operator controls no scanner can prove.
 *
 * A vulnerability scanner can check a firewall; it cannot check whether your
 * cofounder finished insider-threat training or whether anyone could actually
 * file a DIBNet report at 2am. These are per-person, human-entered records
 * with completion + expiry clocks, over launchpad_tier1_records.
 *
 * HONESTY RULE: every record here is entered by a person on your team. AI and
 * automated agents can never create or complete one — the page says so, and
 * the backing table has no service or agent write path.
 */

interface Tier1Record {
  id: string;
  control_id: string;
  category: string;
  person: string | null;
  status: string;
  completed_at: string | null;
  expires_at: string | null;
  artifact_ref: string | null;
  notes: string | null;
}

const CATEGORY_LABEL: Record<string, string> = {
  training: 'Training',
  screening: 'Screening',
  access_agreement: 'Access agreement',
  termination: 'Termination checklist',
  tabletop: 'Tabletop exercise',
  incident_readiness: 'Incident readiness',
  dibnet: 'DIBNet readiness',
};

/** Mirror of the BFF's category → requirement map (the BFF re-validates). */
const CATEGORY_CONTROLS: Record<string, string[]> = {
  training: ['AT.L2-3.2.1', 'AT.L2-3.2.2', 'AT.L2-3.2.3'],
  screening: ['PS.L2-3.9.1'],
  access_agreement: ['PS.L2-3.9.2'],
  termination: ['PS.L2-3.9.2'],
  tabletop: ['IR.L2-3.6.3'],
  incident_readiness: ['IR.L2-3.6.1', 'IR.L2-3.6.2'],
  dibnet: ['IR.L2-3.6.2'],
};

interface Section {
  key: string;
  title: string;
  icon: LucideIcon;
  controls: string;
  categories: string[];
  definition: ReactNode;
  emptyHint: string;
}

const SECTIONS: Section[] = [
  {
    key: 'training',
    title: 'Security awareness & role training',
    icon: GraduationCap,
    controls: 'AT.L2-3.2.1 · 3.2.2 · 3.2.3',
    categories: ['training'],
    definition: (
      <>
        <span className="font-medium text-foreground">AT</span> is the Awareness &amp; Training family
        of NIST SP 800-171 (the standard behind CMMC Level 2). Three requirements:{' '}
        <code className="px-1 rounded bg-muted text-[11px]">AT.L2-3.2.1</code> — everyone gets basic
        security-awareness training; <code className="px-1 rounded bg-muted text-[11px]">AT.L2-3.2.2</code> —
        people with security duties get role-based training; <code className="px-1 rounded bg-muted text-[11px]">AT.L2-3.2.3</code> —
        everyone learns to recognize insider-threat indicators. Even a two-person company needs a
        record per person showing what was completed and when it expires — an annual refresh is the
        norm, which is what the expiry clock here tracks.
      </>
    ),
    emptyHint: 'Add one record per person per course — start with awareness training for each founder.',
  },
  {
    key: 'personnel',
    title: 'Personnel: screening, access agreements, termination',
    icon: Users,
    controls: 'PS.L2-3.9.1 · 3.9.2',
    categories: ['screening', 'access_agreement', 'termination'],
    definition: (
      <>
        <span className="font-medium text-foreground">Personnel screening</span>{' '}
        (<code className="px-1 rounded bg-muted text-[11px]">PS.L2-3.9.1</code>) means you vet people
        before they touch systems that hold contract-sensitive data. For a 3-person startup this is
        not a security-clearance process — it can be a documented background check or identity
        verification you performed, recorded here per person.{' '}
        <span className="font-medium text-foreground">Access agreements</span> are the signed
        rules-of-behavior each person accepts before getting accounts.{' '}
        <span className="font-medium text-foreground">Termination</span>{' '}
        (<code className="px-1 rounded bg-muted text-[11px]">PS.L2-3.9.2</code>) is the checklist you
        run when someone leaves: disable accounts, collect devices, revoke access — with a record of
        when it was done.
      </>
    ),
    emptyHint: 'Add a screening record and an access-agreement record for each person with system access.',
  },
  {
    key: 'incident',
    title: 'Incident readiness & tabletop exercises',
    icon: Siren,
    controls: 'IR.L2-3.6.1 · 3.6.2 · 3.6.3',
    categories: ['incident_readiness', 'tabletop'],
    definition: (
      <>
        A <span className="font-medium text-foreground">tabletop exercise</span> is a scheduled
        talk-through of a pretend incident — &ldquo;a laptop with contract data was stolen: what do we
        do, in what order, who calls whom?&rdquo; No systems are touched; it takes about an hour and
        you keep notes. Done honestly, it satisfies the test-your-response requirement{' '}
        (<code className="px-1 rounded bg-muted text-[11px]">IR.L2-3.6.3</code>) at small-company
        scale. <span className="font-medium text-foreground">Incident readiness</span>{' '}
        (<code className="px-1 rounded bg-muted text-[11px]">IR.L2-3.6.1/2</code>) means you have a
        written response plan and a way to track, document, and report incidents when they happen.
      </>
    ),
    emptyHint: 'Record your written incident-response plan first, then schedule and record your first tabletop.',
  },
  {
    key: 'dibnet',
    title: 'DIBNet reporting readiness',
    icon: Radio,
    controls: 'DFARS 252.204-7012 · IR.L2-3.6.2',
    categories: ['dibnet'],
    definition: (
      <>
        <span className="font-medium text-foreground">DIBNet</span> (dibnet.dod.mil) is the DoD&rsquo;s
        portal where defense contractors report cyber incidents. If your contract carries DFARS clause
        252.204-7012, qualifying incidents must be reported within{' '}
        <span className="font-medium text-foreground">72 hours</span> — and filing requires a
        Medium Assurance Certificate (an identity certificate from a DoD-approved provider) that you
        must obtain <span className="font-medium text-foreground">before</span> an incident, not
        during one. Readiness records to keep here: certificate obtained, portal access verified, and
        who on your team is responsible for filing.
      </>
    ),
    emptyHint: 'First record: who owns DIBNet filing. Second: the Medium Assurance Certificate, once obtained.',
  },
];

const inputCls = 'myco-glass-field w-full rounded-lg border border-border px-3 py-2 text-sm';

interface FormState {
  category: string;
  controlId: string;
  person: string;
  status: 'open' | 'done';
  completedAt: string;
  expiresAt: string;
  artifactRef: string;
  notes: string;
}

const emptyForm = (category: string): FormState => ({
  category,
  controlId: CATEGORY_CONTROLS[category]?.[0] ?? '',
  person: '',
  status: 'open',
  completedAt: '',
  expiresAt: '',
  artifactRef: '',
  notes: '',
});

/** A record marked done whose expiry has passed reads as expired. */
const effectiveStatus = (r: Tier1Record): string =>
  r.expires_at && new Date(r.expires_at).getTime() < Date.now() && r.status !== 'open'
    ? 'expired'
    : r.status;

const STATUS_TONE: Record<string, Tone> = { open: 'amber', done: 'emerald', expired: 'red' };
const STATUS_LABEL: Record<string, string> = { open: 'Open', done: 'Done', expired: 'Expired' };

export default function Tier1Page() {
  const [records, setRecords] = useState<Tier1Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [formSection, setFormSection] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm('training'));
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Tier1Record | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/fusarium/launchpad/readiness/tier1', { cache: 'no-store' });
      const d = await r.json();
      if (r.ok) { setRecords(d.records ?? []); setErr(null); }
      else setErr(d?.error || `HTTP ${r.status}`);
    } catch {
      setErr('Could not load Tier-1 records');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const done = records.filter((r) => effectiveStatus(r) === 'done').length;
    const expired = records.filter((r) => effectiveStatus(r) === 'expired').length;
    const soon = records.filter((r) => {
      if (!r.expires_at || effectiveStatus(r) === 'expired') return false;
      const days = (new Date(r.expires_at).getTime() - Date.now()) / 86_400_000;
      return days >= 0 && days <= 60;
    }).length;
    return { total: records.length, done, expired, soon };
  }, [records]);

  const openForm = (section: Section) => {
    setForm(emptyForm(section.categories[0]));
    setFormSection(formSection === section.key ? null : section.key);
  };

  const setCategory = (category: string) =>
    setForm((f) => ({ ...f, category, controlId: CATEGORY_CONTROLS[category]?.[0] ?? '' }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      const r = await fetch('/api/fusarium/launchpad/readiness/tier1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: form.category,
          controlId: form.controlId,
          person: form.person || undefined,
          status: form.status,
          completedAt: form.completedAt || undefined,
          expiresAt: form.expiresAt || undefined,
          artifactRef: form.artifactRef || undefined,
          notes: form.notes || undefined,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d?.error || 'Save failed'); return; }
      setFormSection(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const markDone = async (rec: Tier1Record) => {
    setBusy(rec.id); setErr(null);
    try {
      const r = await fetch('/api/fusarium/launchpad/readiness/tier1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rec.id, status: 'done' }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d?.error || 'Update failed'); return; }
      await load();
    } finally {
      setBusy(null);
    }
  };

  const remove = async (rec: Tier1Record) => {
    setBusy(rec.id); setErr(null);
    try {
      const r = await fetch(`/api/fusarium/launchpad/readiness/tier1?id=${encodeURIComponent(rec.id)}`, {
        method: 'DELETE',
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d?.error || 'Delete failed'); return; }
      setConfirmDelete(null);
      await load();
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-current" /> Loading Tier-1 records…
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        title="Tier-1 Turnkey"
        icon={ClipboardList}
        description="The operator controls no scanner can prove — training people, screening people, rehearsing incidents, being ready to report. Per-person records with completion and expiry clocks."
      />

      {/* Education-first: what / why / next step */}
      <Card tone="sky" className="p-5 mb-5">
        <div className="pl-1.5 grid gap-3 sm:grid-cols-3 text-sm">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">What is this</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A tracker for the people-and-process requirements of NIST SP 800-171: a scanner can
              check your firewall, but it cannot check whether your cofounder finished insider-threat
              training or whether anyone could file a DIBNet report tonight.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Why it matters</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              These are often the fastest requirements a small company can honestly satisfy — and the
              easiest to let silently expire. Assessors ask for exactly these records: who, what,
              when, and when it lapses.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Your next step</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Add one awareness-training record per person, then work down the sections. Keep the
              artifacts (certificates, signed agreements) in your own systems — record only a
              reference here.
            </p>
          </div>
        </div>
      </Card>

      {/* Human-entered-only rule, stated plainly */}
      <Card tone="emerald" className="p-4 mb-6">
        <div className="pl-1.5 flex items-start gap-2.5 text-xs text-muted-foreground">
          <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          <span>
            <span className="font-medium text-foreground">Human-entered only.</span> Every record on
            this page is created and completed by a person on your team. AI and automated agents can
            never create or complete a record here — and nothing on this page marks anything
            &ldquo;met&rdquo; for you or certifies compliance with anything.
          </span>
        </div>
      </Card>

      {err && (
        <Card tone="red" className="p-4 mb-5">
          <div className="pl-1.5 flex items-start gap-2.5 text-sm">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <span>{err}</span>
          </div>
        </Card>
      )}

      {/* Posture at a glance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {records.length === 0 ? (
          <>
            <StatTile label="Records" empty="None yet — start below" />
            <StatTile label="Done" empty="—" />
            <StatTile label="Expiring ≤ 60 days" empty="—" />
            <StatTile label="Expired" empty="—" />
          </>
        ) : (
          <>
            <StatTile label="Records" value={stats.total} tone="sky" sub="across all four sections" />
            <StatTile label="Done" value={stats.done} tone={stats.done > 0 ? 'emerald' : 'slate'} sub="completed, not yet expired" />
            <StatTile label="Expiring ≤ 60 days" value={stats.soon} tone={stats.soon > 0 ? 'amber' : 'slate'} sub="renew before the clock runs out" />
            <StatTile label="Expired" value={stats.expired} tone={stats.expired > 0 ? 'red' : 'slate'} sub="no longer count — redo them" />
          </>
        )}
      </div>

      <div className="space-y-8">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const rows = records.filter((r) => section.categories.includes(r.category));
          return (
            <section key={section.key}>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Icon className="h-5 w-5 text-emerald-500" />
                  {section.title}
                  <code className="text-[10px] font-normal px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                    {section.controls}
                  </code>
                </h2>
                <GlassButton onClick={() => openForm(section)}>
                  {formSection === section.key
                    ? <><X className="h-3.5 w-3.5 text-current mr-1.5" /> Close</>
                    : <><Plus className="h-3.5 w-3.5 text-current mr-1.5" /> Add record</>}
                </GlassButton>
              </div>

              {/* Definition card — jargon explained before the table asks for it */}
              <Card className="p-4 mb-3">
                <p className="pl-1.5 text-xs text-muted-foreground leading-relaxed">{section.definition}</p>
              </Card>

              {formSection === section.key && (
                <Card tone="emerald" className="p-5 mb-3">
                  <form onSubmit={submit} className="pl-1.5 space-y-4">
                    {section.categories.length > 1 && (
                      <div>
                        <span className="text-sm font-medium block mb-2">Record type</span>
                        <div className="flex flex-wrap gap-x-6 gap-y-3">
                          {section.categories.map((c) => (
                            <LiquidRadio
                              key={c}
                              name={`t1-category-${section.key}`}
                              value={c}
                              checked={form.category === c}
                              onChange={(on) => { if (on) setCategory(c); }}
                              label={CATEGORY_LABEL[c]}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium block mb-1">Person</label>
                        <input className={inputCls} value={form.person} maxLength={200}
                          placeholder="Who this record covers"
                          onChange={(e) => setForm((f) => ({ ...f, person: e.target.value }))} />
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Per-person is the point — one row per person, per requirement.
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-1">Requirement</label>
                        <select className={inputCls} value={form.controlId}
                          onChange={(e) => setForm((f) => ({ ...f, controlId: e.target.value }))}>
                          {(CATEGORY_CONTROLS[form.category] ?? []).map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <span className="text-sm font-medium block mb-2">Status</span>
                        <div className="flex flex-wrap gap-x-6 gap-y-3">
                          <LiquidRadio name={`t1-status-${section.key}`} value="open"
                            checked={form.status === 'open'}
                            onChange={(on) => { if (on) setForm((f) => ({ ...f, status: 'open' })); }}
                            label="Open (to do)" />
                          <LiquidRadio name={`t1-status-${section.key}`} value="done"
                            checked={form.status === 'done'}
                            onChange={(on) => { if (on) setForm((f) => ({ ...f, status: 'done' })); }}
                            label="Done" />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-1">Completed on</label>
                        <input type="date" className={inputCls} value={form.completedAt}
                          onChange={(e) => setForm((f) => ({ ...f, completedAt: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-1">Expires on</label>
                        <input type="date" className={inputCls} value={form.expiresAt}
                          onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} />
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Training typically expires annually — set it and the clock warns you.
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1">Artifact reference (optional)</label>
                      <input className={inputCls} value={form.artifactRef} maxLength={400}
                        placeholder="e.g. certificate in our HR drive — a pointer, not the file"
                        onChange={(e) => setForm((f) => ({ ...f, artifactRef: e.target.value }))} />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Reference only — never upload or paste the artifact itself. Certificates and
                        signed agreements stay in your own systems.
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1">Notes (optional)</label>
                      <textarea className={inputCls} rows={2} value={form.notes} maxLength={2000}
                        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                    </div>
                    <div className="flex gap-2">
                      <GlassButton type="submit" disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin text-current mr-2" /> : null}
                        {saving ? 'Saving…' : 'Record it'}
                      </GlassButton>
                      <GlassButton onClick={() => setFormSection(null)}>Cancel</GlassButton>
                    </div>
                  </form>
                </Card>
              )}

              {rows.length === 0 ? (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-6 text-center text-xs text-muted-foreground">
                  No records yet. {section.emptyHint}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {rows.map((r) => {
                    const st = effectiveStatus(r);
                    return (
                      <Card key={r.id} className="p-3.5">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-sm">{r.person || 'Company-wide'}</span>
                              <span className="text-[11px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                                {CATEGORY_LABEL[r.category] ?? r.category}
                              </span>
                              <code className="text-[11px] px-1.5 py-0.5 rounded bg-muted">{r.control_id}</code>
                              <StateBadge tone={STATUS_TONE[st] ?? 'slate'}>{STATUS_LABEL[st] ?? st}</StateBadge>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground mt-1.5 tabular-nums">
                              {r.completed_at && <span>completed {new Date(r.completed_at).toLocaleDateString()}</span>}
                              {r.expires_at && (
                                <span className={st === 'expired' ? 'text-red-500 font-medium' : ''}>
                                  {st === 'expired' ? 'expired' : 'expires'} {new Date(r.expires_at).toLocaleDateString()}
                                </span>
                              )}
                              {r.artifact_ref && <span className="truncate max-w-[16rem]">ref: {r.artifact_ref}</span>}
                              {r.notes && <span className="truncate max-w-[20rem]">{r.notes}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {r.status === 'open' && (
                              <GlassButton onClick={() => markDone(r)} disabled={busy === r.id}>
                                {busy === r.id
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin text-current mr-1.5" />
                                  : <Check className="h-3.5 w-3.5 text-current mr-1.5" />}
                                Mark done
                              </GlassButton>
                            )}
                            <GlassButton onClick={() => setConfirmDelete(r)} disabled={busy === r.id} className="myco-glass-danger">
                              <Trash2 className="h-3.5 w-3.5 text-current" />
                            </GlassButton>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <OfficialLinksPanel surface="tier1" title="Tier-1 source documents" />

      <p className="text-xs text-muted-foreground mt-8">
        Records here are customer-entered facts, not certifications — nothing on this page states
        that you or anyone else is CMMC compliant. If you are pursuing CMMC Level 2
        (Self-Assessment), these records become part of the evidence trail your assessment relies
        on; the artifacts themselves stay in your own systems.
      </p>

      {/* Delete confirmation — in-page so it reads like the rest of the workspace */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="t1-delete">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmDelete(null)} />
          <div className="relative w-full max-w-md rounded-xl border border-red-500/40 bg-background shadow-2xl p-6">
            <h2 id="t1-delete" className="text-lg font-bold flex items-center gap-2 mb-1">
              <AlertTriangle className="h-5 w-5 text-red-500" /> Delete this record?
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              <span className="font-medium text-foreground">{confirmDelete.person || 'Company-wide'}</span>{' '}
              — {CATEGORY_LABEL[confirmDelete.category] ?? confirmDelete.category}{' '}
              (<code className="text-xs">{confirmDelete.control_id}</code>). Deleting removes the row;
              the audit ledger keeps a record that it existed and was deleted. Use this for
              entered-in-error rows — expired records should stay and be renewed instead.
            </p>
            <div className="flex flex-wrap gap-2">
              <GlassButton onClick={() => remove(confirmDelete)} disabled={busy === confirmDelete.id} className="myco-glass-danger">
                {busy === confirmDelete.id
                  ? <Loader2 className="h-4 w-4 animate-spin text-current mr-2" />
                  : <Trash2 className="h-4 w-4 text-current mr-2" />}
                Delete record
              </GlassButton>
              <GlassButton onClick={() => setConfirmDelete(null)}>Keep it</GlassButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
