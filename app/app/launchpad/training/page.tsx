'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GraduationCap, Loader2, Plus, CircleHelp, Target, Footprints, Hash, ExternalLink, CalendarClock,
} from 'lucide-react';
import { PageHeader, Card, StatTile, StateBadge, type Tone } from '@/components/launchpad/ui';
import { FeatureGate, TierTag } from '@/components/launchpad/entitlements';
import { GlassButton } from '@/components/ui/glass-button';
import { LiquidCheckbox } from '@/components/launchpad/liquid';
import { OfficialLinksPanel } from '@/components/launchpad/official-links';

/**
 * Training tracker — link + completion metadata ONLY.
 *
 * Launchpad never hosts, copies, or re-serves course content: the `course`
 * field records a title and the official URL, and certificates stay in the
 * customer's systems (reference + optional locally computed SHA-256 only —
 * the file itself is never transmitted).
 *
 * Column truth (supabase/migrations/20260811090100_launchpad_asa.sql,
 * launchpad_training_assignments): person_name / person_email / course /
 * assigned_at / completed_at / expires_at / certificate_ref. The pinned
 * contract's course_title + course_url + role_scope fold into the single
 * `course` text column; `status` is derived from the dates, not stored;
 * there is no certificate_sha256 column — a locally computed digest is
 * recorded inside certificate_ref as `sha256:<hex>`.
 */

interface Assignment {
  id: string;
  person_name: string;
  person_email: string | null;
  course: string;
  assigned_at: string;
  completed_at: string | null;
  expires_at: string | null;
  certificate_ref: string | null;
}

type DerivedStatus = 'assigned' | 'complete' | 'expires_soon' | 'expired';

const STATUS_META: Record<DerivedStatus, { label: string; tone: Tone }> = {
  assigned: { label: 'assigned', tone: 'sky' },
  complete: { label: 'complete', tone: 'emerald' },
  expires_soon: { label: 'expires soon', tone: 'amber' },
  expired: { label: 'expired', tone: 'red' },
};

const ROLE_SCOPES = [
  { value: 'All staff', hint: 'everyone who touches your systems (AT.L2-3.2.1 awareness)' },
  { value: 'Privileged/admin users', hint: 'people with elevated access' },
  { value: 'Assigned security duties', hint: 'role-based duties training (AT.L2-3.2.2)' },
  { value: 'Insider-threat awareness', hint: 'recognizing and reporting insider risk (AT.L2-3.2.3)' },
];

const fieldCls = 'myco-glass-field w-full rounded-lg border border-border px-3 py-2 text-sm';

const daysUntil = (d: string) => Math.ceil((Date.parse(d) - Date.now()) / 86_400_000);

function deriveStatus(a: Assignment): DerivedStatus {
  if (a.expires_at) {
    const d = daysUntil(a.expires_at);
    if (d < 0) return 'expired';
    if (a.completed_at && d <= 30) return 'expires_soon';
  }
  return a.completed_at ? 'complete' : 'assigned';
}

/** Render the stored course text, linkifying the first official URL in it. */
function CourseText({ course }: { course: string }) {
  const m = course.match(/https?:\/\/\S+/);
  if (!m) return <span className="text-sm font-medium">{course}</span>;
  const url = m[0];
  const before = course.slice(0, m.index).replace(/[—-]\s*$/, '').trim();
  const after = course.slice((m.index ?? 0) + url.length);
  return (
    <span className="text-sm font-medium inline-flex items-center gap-1.5 min-w-0">
      <span className="truncate">{before || url}</span>
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5 text-xs shrink-0">
        <ExternalLink className="h-3 w-3" /> official course
      </a>
      {after && <span className="text-xs text-muted-foreground truncate">{after}</span>}
    </span>
  );
}

const emptyForm = {
  personName: '', personEmail: '', courseTitle: '', courseUrl: '',
  roleScope: 'All staff', expiresAt: '', alreadyCompleted: false, completedAt: '', certificateRef: '',
};

export default function TrainingPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hashing, setHashing] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  // Per-row "mark complete" inline panel
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [complete, setComplete] = useState({ completedAt: '', certificateRef: '' });
  const [completeHashing, setCompleteHashing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/fusarium/launchpad/training', { cache: 'no-store' });
      const d = await r.json();
      if (r.ok) { setAssignments(d.assignments ?? []); setErr(null); }
      else setErr(d?.error || `HTTP ${r.status}`);
    } catch { setErr('Could not load training assignments'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Certificates never leave the browser: SHA-256 via Web Crypto, digest only.
  const hashFile = async (f: File, into: 'form' | 'complete') => {
    const setBusy = into === 'form' ? setHashing : setCompleteHashing;
    setBusy(true);
    try {
      const buf = await f.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', buf);
      const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
      const append = (ref: string) => `${ref ? `${ref} ` : ''}sha256:${hex}`;
      if (into === 'form') setForm((x) => ({ ...x, certificateRef: append(x.certificateRef) }));
      else setComplete((x) => ({ ...x, certificateRef: append(x.certificateRef) }));
    } finally { setBusy(false); }
  };

  const assign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      // Single `course` column: title + official URL + role scope fold into one line.
      const course = [
        form.courseTitle.trim(),
        form.courseUrl.trim() ? `— ${form.courseUrl.trim()}` : '',
        `· ${form.roleScope}`,
      ].filter(Boolean).join(' ');
      const r = await fetch('/api/fusarium/launchpad/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personName: form.personName,
          personEmail: form.personEmail || undefined,
          course,
          expiresAt: form.expiresAt || undefined,
          completedAt: form.alreadyCompleted ? (form.completedAt || new Date().toISOString().slice(0, 10)) : undefined,
          certificateRef: form.alreadyCompleted && form.certificateRef ? form.certificateRef : undefined,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d?.error || 'Could not record assignment'); return; }
      setShowForm(false);
      setForm({ ...emptyForm });
      await load();
    } finally { setSaving(false); }
  };

  const markComplete = async (id: string) => {
    setSaving(true); setErr(null);
    try {
      const r = await fetch('/api/fusarium/launchpad/training', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          completedAt: complete.completedAt || new Date().toISOString().slice(0, 10),
          certificateRef: complete.certificateRef || null,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d?.error || 'Could not record completion'); return; }
      setCompletingId(null);
      setComplete({ completedAt: '', certificateRef: '' });
      await load();
    } finally { setSaving(false); }
  };

  const stats = useMemo(() => {
    const people = new Set(assignments.map((a) => a.person_name.toLowerCase())).size;
    const byStatus: Record<DerivedStatus, number> = { assigned: 0, complete: 0, expires_soon: 0, expired: 0 };
    for (const a of assignments) byStatus[deriveStatus(a)] += 1;
    const nextExpiry = assignments
      .filter((a) => a.expires_at && daysUntil(a.expires_at) >= 0)
      .sort((a, b) => Date.parse(a.expires_at!) - Date.parse(b.expires_at!))[0];
    return { people, byStatus, nextExpiry };
  }, [assignments]);

  return (
    <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        title="Training tracker"
        description="Who has taken what security training, when, and when it lapses — links and completion metadata only, never hosted course content."
        icon={GraduationCap}
        actions={<TierTag feature="trainingTracker" />}
      />

      <FeatureGate feature="trainingTracker">
        {/* Education-first intro */}
        <Card className="p-5 mb-4">
          <div className="grid sm:grid-cols-3 gap-5 text-sm">
            <div className="flex items-start gap-2.5">
              <CircleHelp className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold mb-1">What is this?</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  A register of security-training assignments: person, course (title + official link),
                  completion date, and an expiry clock — the record an assessor asks to see first.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Target className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold mb-1">Why it matters</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Three CMMC Level 2 requirements are about training your people, and they are assessed
                  by evidence: &quot;we talked about security once&quot; does not pass. Dated records per person do
                  the work.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Footprints className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold mb-1">Your next step</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Assign an awareness course to every person in your company — even a two-person shop —
                  then record completions as they happen. Free official options exist (e.g. DoD Cyber
                  Exchange awareness training).
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* The three AT requirements, in founder language */}
        <Card className="p-5 mb-6">
          <h2 className="text-sm font-semibold mb-3">The three requirements this page satisfies the record-keeping for</h2>
          <div className="grid sm:grid-cols-3 gap-4 text-xs text-muted-foreground leading-relaxed">
            <div>
              <code className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-foreground">AT.L2-3.2.1</code>
              <p className="mt-1.5"><span className="font-medium text-foreground">Security awareness.</span> Everyone
                who uses your systems must be made aware of the security risks of their activities and the
                policies that apply to their job — not just the IT person.</p>
            </div>
            <div>
              <code className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-foreground">AT.L2-3.2.2</code>
              <p className="mt-1.5"><span className="font-medium text-foreground">Role-based training.</span> People
                must be trained to carry out their assigned security duties before they perform them — the
                person who manages accounts, the person who handles incidents.</p>
            </div>
            <div>
              <code className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-foreground">AT.L2-3.2.3</code>
              <p className="mt-1.5"><span className="font-medium text-foreground">Insider threat.</span> Staff
                must know how to recognize and report potential indicators of insider threat — a specific,
                assessable topic of its own.</p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-4 border-t border-border/60 pt-3">
            Boundary note: Launchpad never uploads, hosts, or copies course content or certificates. Record the
            official course link and completion metadata only; certificates stay in your systems, referenced by
            path/ID and an optional SHA-256 computed locally in your browser.
          </p>
        </Card>

        {err && <p className="text-sm text-destructive mb-4">{err}</p>}

        {/* Posture tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {assignments.length === 0 ? (
            <>
              <StatTile label="People covered" tone="slate" empty="No assignments yet" />
              <StatTile label="Complete" tone="slate" empty="No assignments yet" />
              <StatTile label="Expired" tone="slate" empty="No assignments yet" />
              <StatTile label="Next expiry" tone="slate" empty="No expiry clocks running" />
            </>
          ) : (
            <>
              <StatTile label="People covered" value={stats.people} tone="sky" sub="unique people with assignments" />
              <StatTile label="Complete" value={stats.byStatus.complete + stats.byStatus.expires_soon}
                tone={stats.byStatus.complete + stats.byStatus.expires_soon > 0 ? 'emerald' : 'slate'}
                sub={`${stats.byStatus.assigned} still assigned`} />
              <StatTile label="Expired" value={stats.byStatus.expired}
                tone={stats.byStatus.expired > 0 ? 'red' : 'emerald'}
                sub={stats.byStatus.expired > 0 ? 'needs refresher training' : 'nothing lapsed'} />
              {stats.nextExpiry ? (
                <StatTile label="Next expiry"
                  value={<span className="text-lg">{new Date(stats.nextExpiry.expires_at!).toLocaleDateString()}</span>}
                  sub={`${stats.nextExpiry.person_name} — ${daysUntil(stats.nextExpiry.expires_at!)}d out`}
                  tone={daysUntil(stats.nextExpiry.expires_at!) <= 30 ? 'amber' : 'sky'} />
              ) : (
                <StatTile label="Next expiry" tone="slate" empty="No expiry dates set" />
              )}
            </>
          )}
        </div>

        <div className="flex justify-end mb-4">
          <GlassButton onClick={() => setShowForm((s) => !s)}>
            <Plus className="h-4 w-4 text-current mr-2" /> Assign course
          </GlassButton>
        </div>

        {/* Assign form */}
        {showForm && (
          <Card className="p-5 mb-6">
            <form onSubmit={assign} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Person *</label>
                  <input required className={fieldCls} value={form.personName} maxLength={200}
                    placeholder="Full name"
                    onChange={(e) => setForm((x) => ({ ...x, personName: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Email</label>
                  <input type="email" className={fieldCls} value={form.personEmail} maxLength={200}
                    onChange={(e) => setForm((x) => ({ ...x, personEmail: e.target.value }))} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Course title *</label>
                  <input required className={fieldCls} value={form.courseTitle} maxLength={200}
                    placeholder="e.g. Cyber Awareness Challenge 2026"
                    onChange={(e) => setForm((x) => ({ ...x, courseTitle: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Official course URL</label>
                  <input type="url" className={fieldCls} value={form.courseUrl} maxLength={250}
                    placeholder="https://…  (link only — content is never copied here)"
                    onChange={(e) => setForm((x) => ({ ...x, courseUrl: e.target.value }))} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Role scope</label>
                  <select className={fieldCls} value={form.roleScope}
                    onChange={(e) => setForm((x) => ({ ...x, roleScope: e.target.value }))}>
                    {ROLE_SCOPES.map((r) => <option key={r.value} value={r.value}>{r.value}</option>)}
                  </select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {ROLE_SCOPES.find((r) => r.value === form.roleScope)?.hint}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Expires</label>
                  <input type="date" className={fieldCls} value={form.expiresAt}
                    onChange={(e) => setForm((x) => ({ ...x, expiresAt: e.target.value }))} />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Most awareness training is refreshed annually — set this and the row flags itself when it lapses.
                  </p>
                </div>
              </div>
              <LiquidCheckbox
                checked={form.alreadyCompleted}
                onChange={(checked) => setForm((x) => ({ ...x, alreadyCompleted: checked }))}
                label={<span className="text-sm">Already completed — record the completion now</span>}
              />
              {form.alreadyCompleted && (
                <div className="grid sm:grid-cols-2 gap-4 pl-1">
                  <div>
                    <label className="text-sm font-medium block mb-1">Completion date</label>
                    <input type="date" className={fieldCls} value={form.completedAt}
                      onChange={(e) => setForm((x) => ({ ...x, completedAt: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1 flex items-center gap-1.5">
                      <Hash className="h-3.5 w-3.5" /> Certificate reference (never the file)
                    </label>
                    <div className="flex gap-2">
                      <input className={fieldCls + ' font-mono text-xs'} value={form.certificateRef} maxLength={500}
                        placeholder="path/ID in your system, optionally sha256:<hex>"
                        onChange={(e) => setForm((x) => ({ ...x, certificateRef: e.target.value }))} />
                      <label className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm cursor-pointer hover:bg-muted">
                        {hashing ? <Loader2 className="h-4 w-4 animate-spin text-current" /> : 'Hash a file'}
                        <input type="file" className="hidden"
                          onChange={(e) => e.target.files?.[0] && hashFile(e.target.files[0], 'form')} />
                      </label>
                    </div>
                  </div>
                </div>
              )}
              <GlassButton type="submit" disabled={saving}>
                {saving ? 'Recording…' : 'Record assignment'}
              </GlassButton>
            </form>
          </Card>
        )}

        {/* Assignment list */}
        {loading ? (
          <div className="min-h-[20vh] flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-current" /> Loading training assignments…
          </div>
        ) : assignments.length === 0 ? (
          <div className="rounded-lg border border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            No training assignments yet. Assign an awareness course to each person — the record here (who,
            what, when, expiry) is exactly what an assessor asks for under AT.L2-3.2.1/2/3.
          </div>
        ) : (
          <div className="space-y-2">
            {assignments.map((a) => {
              const status = deriveStatus(a);
              const meta = STATUS_META[status];
              return (
                <Card key={a.id} tone={meta.tone} className="p-4">
                  <div className="flex flex-wrap items-center gap-3 pl-1.5">
                    <span className="text-sm font-semibold w-40 shrink-0 truncate" title={a.person_name}>{a.person_name}</span>
                    <StateBadge tone={meta.tone}>{meta.label}</StateBadge>
                    <CourseText course={a.course} />
                    <span className="ml-auto flex items-center gap-3 shrink-0">
                      {a.expires_at && (
                        <span className={`text-xs tabular-nums inline-flex items-center gap-1 ${
                          status === 'expired' ? 'text-red-500 font-semibold' : status === 'expires_soon' ? 'text-amber-500 font-semibold' : 'text-muted-foreground'
                        }`}>
                          <CalendarClock className="h-3.5 w-3.5" />
                          {status === 'expired'
                            ? `expired ${-daysUntil(a.expires_at)}d ago`
                            : `expires ${new Date(a.expires_at).toLocaleDateString()}`}
                        </span>
                      )}
                      {!a.completed_at && completingId !== a.id && (
                        <GlassButton className="text-xs" onClick={() => { setCompletingId(a.id); setComplete({ completedAt: '', certificateRef: '' }); }}>
                          Mark complete
                        </GlassButton>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 pl-1.5 text-[11px] text-muted-foreground">
                    <span>assigned {new Date(a.assigned_at).toLocaleDateString()}</span>
                    {a.completed_at && <span className="text-emerald-600 dark:text-emerald-400">completed {new Date(a.completed_at).toLocaleDateString()}</span>}
                    {a.certificate_ref && <code className="text-[10px]">cert: {a.certificate_ref.length > 60 ? `${a.certificate_ref.slice(0, 60)}…` : a.certificate_ref}</code>}
                  </div>

                  {completingId === a.id && (
                    <div className="mt-3 ml-1.5 rounded-lg border border-border/60 bg-muted/10 p-4 space-y-3">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium block mb-1">Completion date</label>
                          <input type="date" className={fieldCls} value={complete.completedAt}
                            onChange={(e) => setComplete((x) => ({ ...x, completedAt: e.target.value }))} />
                          <p className="text-[11px] text-muted-foreground mt-1">Blank = today.</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium block mb-1 flex items-center gap-1.5">
                            <Hash className="h-3.5 w-3.5" /> Certificate reference (never the file)
                          </label>
                          <div className="flex gap-2">
                            <input className={fieldCls + ' font-mono text-xs'} value={complete.certificateRef} maxLength={500}
                              placeholder="path/ID in your system, optionally sha256:<hex>"
                              onChange={(e) => setComplete((x) => ({ ...x, certificateRef: e.target.value }))} />
                            <label className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm cursor-pointer hover:bg-muted">
                              {completeHashing ? <Loader2 className="h-4 w-4 animate-spin text-current" /> : 'Hash a file'}
                              <input type="file" className="hidden"
                                onChange={(e) => e.target.files?.[0] && hashFile(e.target.files[0], 'complete')} />
                            </label>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Hashing runs locally in your browser — the certificate itself is never uploaded.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <GlassButton disabled={saving} onClick={() => markComplete(a.id)}>
                          {saving ? 'Recording…' : 'Record completion'}
                        </GlassButton>
                        <GlassButton onClick={() => setCompletingId(null)}>Cancel</GlassButton>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
        <OfficialLinksPanel surface="training" title="Official training sources" />
      </FeatureGate>
    </div>
  );
}
