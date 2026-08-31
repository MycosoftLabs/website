'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { PenLine, Loader2, Plus, ChevronRight, ExternalLink } from 'lucide-react';
import { GlassButton } from '@/components/ui/glass-button';
import { PageHeader, Card, StateBadge, type Tone } from '@/components/launchpad/ui';
import { FeatureGate, TierTag } from '@/components/launchpad/entitlements';
import {
  PORTAL_OPTIONS,
  PORTAL_TEMPLATES,
  PROPOSAL_BOUNDARY_NOTE,
  type ChecklistItem,
  type PortalKey,
} from '@/lib/launchpad/proposal-templates';

/**
 * Proposal workspaces — organize a bid, never submit one.
 *
 * Each workspace carries a portal-specific submission checklist and a
 * compliance-matrix skeleton. The pipeline ends at "submitted by you":
 * Launchpad records the fact AFTER the customer submits on the government
 * portal themselves.
 */

interface Workspace {
  id: string;
  title: string;
  opportunity_ref: string | null;
  portal: PortalKey | null;
  status: string;
  checklist: ChecklistItem[];
  created_at: string;
}

const PIPELINE: Array<{ status: string; label: string; tone: Tone }> = [
  { status: 'draft', label: 'Draft', tone: 'slate' },
  { status: 'in_review', label: 'In review', tone: 'sky' },
  { status: 'submitted_by_customer', label: 'Submitted by you', tone: 'emerald' },
  { status: 'closed', label: 'Closed', tone: 'slate' },
];
const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  draft: { label: 'Draft', tone: 'slate' },
  in_review: { label: 'In review', tone: 'sky' },
  authorized: { label: 'Authorized', tone: 'amber' },
  submitted_by_customer: { label: 'Submitted by you', tone: 'emerald' },
  closed: { label: 'Closed', tone: 'slate' },
};

const field = 'myco-glass-field w-full rounded-lg border border-border px-3 py-2 text-sm';

export default function ProposalsPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', portal: 'sam' as PortalKey, opportunityRef: '' });

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/fusarium/launchpad/proposals', { cache: 'no-store' });
      const d = await r.json();
      if (r.ok) { setWorkspaces(d.workspaces ?? []); setNote(d.note ?? null); setErr(null); }
      else setErr(d?.error || `HTTP ${r.status}`);
    } catch { setErr('Could not load proposal workspaces'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Prefill from ?title=&ref= (the opportunity detail page links here). Parsed
  // from location so the page needs no Suspense boundary for useSearchParams.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search);
    const title = q.get('title') ?? '';
    const ref = q.get('ref') ?? '';
    if (title || ref) {
      setForm((x) => ({ ...x, title: title.slice(0, 300), opportunityRef: ref.slice(0, 200) }));
      setShowForm(true);
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      const r = await fetch('/api/fusarium/launchpad/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          portal: form.portal,
          opportunityRef: form.opportunityRef || undefined,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d?.error || 'Could not create workspace'); return; }
      setShowForm(false);
      setForm({ title: '', portal: 'sam', opportunityRef: '' });
      await load();
    } finally { setSaving(false); }
  };

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin text-current" /> Loading proposal workspaces…
    </div>;
  }

  const counts = PIPELINE.map((p) => ({
    ...p,
    count: workspaces.filter((w) => w.status === p.status).length,
  }));

  return (
    <div className="container max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        title="Proposal workspaces"
        icon={PenLine}
        description={
          <>
            Organize each bid: a portal-specific submission checklist plus a compliance matrix.{' '}
            <span className="font-medium text-foreground">{PROPOSAL_BOUNDARY_NOTE}</span>
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <TierTag feature="proposals" />
            <GlassButton onClick={() => setShowForm((s) => !s)}>
              <Plus className="h-4 w-4 text-current mr-2" /> New workspace
            </GlassButton>
          </div>
        }
      />

      <FeatureGate feature="proposals">
        {/* Education-first intro */}
        <Card className="p-5 mb-6" tone="sky">
          <div className="grid sm:grid-cols-3 gap-4 text-sm pl-1.5">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">What is this</div>
              <p className="text-muted-foreground leading-relaxed">
                A workspace per bid. A <span className="font-medium text-foreground">proposal</span> is your written
                response to a government solicitation; each portal (SAM.gov, DSIP, Grants.gov…) has its own
                registration and package rules, so the checklist adapts to the portal you pick.
              </p>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Why it matters</div>
              <p className="text-muted-foreground leading-relaxed">
                Most first proposals lose on process, not merit: a missed registration, a page-limit
                violation, a late upload. A <span className="font-medium text-foreground">compliance matrix</span> —
                one row per requirement in the instructions — is how professionals guarantee responsiveness.
              </p>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Your next step</div>
              <p className="text-muted-foreground leading-relaxed">
                Create a workspace for an opportunity you found in Contract Radar, pick its portal, and work
                the checklist top to bottom. When you submit, you do it on the government portal —
                then record it here.
              </p>
            </div>
          </div>
        </Card>

        {err && <p className="text-sm text-destructive mb-4">{err}</p>}

        {showForm && (
          <Card className="p-5 mb-6">
            <form onSubmit={submit} className="space-y-4 pl-1.5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Workspace title *</label>
                  <input required className={field} maxLength={300} value={form.title}
                    placeholder="e.g. Navy SBIR Phase I — underwater sensing"
                    onChange={(e) => setForm((x) => ({ ...x, title: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Submission portal</label>
                  <select className={field} value={form.portal}
                    onChange={(e) => setForm((x) => ({ ...x, portal: e.target.value as PortalKey }))}>
                    {PORTAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Picks which checklist template seeds the workspace.
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Opportunity reference (optional)</label>
                <input className={field} maxLength={200} value={form.opportunityRef}
                  placeholder="Notice ID / topic number, e.g. N252-110 — a reference, not content"
                  onChange={(e) => setForm((x) => ({ ...x, opportunityRef: e.target.value }))} />
              </div>
              <GlassButton type="submit" disabled={saving}>
                {saving ? 'Creating…' : 'Create workspace'}
              </GlassButton>
            </form>
          </Card>
        )}

        {/* Status pipeline */}
        <Card className="p-4 mb-6">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2 pl-1.5">
            {counts.map((p, i) => (
              <div key={p.status} className="flex items-center gap-2">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />}
                <StateBadge tone={p.count > 0 ? p.tone : 'slate'}>
                  <span className="tabular-nums">{p.count}</span> {p.label}
                </StateBadge>
              </div>
            ))}
            <span className="text-[11px] text-muted-foreground ml-auto">
              “Submitted by you” records a fact — Launchpad never submits.
            </span>
          </div>
        </Card>

        {workspaces.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm font-medium mb-1">No proposal workspaces yet.</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {note ?? 'Create one when you find an opportunity worth pursuing.'} Start in{' '}
              <Link href="/app/launchpad/opportunities" className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2">
                Contract Radar
              </Link>{' '}
              to find an opportunity, then create a workspace for it here.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {workspaces.map((w) => {
              const meta = STATUS_META[w.status] ?? { label: w.status, tone: 'slate' as Tone };
              const total = w.checklist.length;
              const done = w.checklist.filter((c) => c.done).length;
              const portalLabel = w.portal ? (PORTAL_TEMPLATES[w.portal]?.label ?? w.portal) : 'Portal not set';
              return (
                <Link key={w.id} href={`/app/launchpad/proposals/${w.id}`} className="block">
                  <Card tone={meta.tone} className="p-4 hover:border-emerald-500/40 transition-colors">
                    <div className="flex flex-wrap items-center gap-2 pl-1.5">
                      <span className="font-medium text-sm">{w.title}</span>
                      <span className="text-[11px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">{portalLabel}</span>
                      <StateBadge tone={meta.tone}>{meta.label}</StateBadge>
                      <span className="text-[11px] text-muted-foreground ml-auto tabular-nums">
                        {total > 0 ? `${done}/${total} checklist` : 'no checklist'}
                        {' · '}created {new Date(w.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {w.opportunity_ref && (
                      <div className="flex items-center gap-1 mt-1.5 pl-1.5 text-[11px] text-muted-foreground">
                        <ExternalLink className="h-3 w-3" /> ref: <code>{w.opportunity_ref}</code>
                      </div>
                    )}
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </FeatureGate>
    </div>
  );
}
