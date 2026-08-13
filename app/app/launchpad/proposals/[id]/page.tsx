'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PenLine, Loader2, ArrowLeft, Plus, ExternalLink, ListChecks, Table2, BookOpen } from 'lucide-react';
import { GlassButton } from '@/components/ui/glass-button';
import { PageHeader, Card, StatTile, StateBadge, type Tone } from '@/components/launchpad/ui';
import { FeatureGate, TierTag } from '@/components/launchpad/entitlements';
import { LiquidCheckbox, LiquidRadio, LiquidSwitch } from '@/components/launchpad/liquid';
import {
  PORTAL_TEMPLATES,
  PROPOSAL_BOUNDARY_NOTE,
  type ChecklistItem,
  type MatrixRow,
  type PortalKey,
} from '@/lib/launchpad/proposal-templates';

/**
 * One proposal workspace: portal playbook, submission checklist, and the
 * compliance-matrix skeleton — all persisted in the row's jsonb via PATCH.
 * The pipeline's terminal customer state is "submitted by you": Launchpad
 * records that fact after the customer submits on the government portal.
 */

interface WorkspaceRow {
  id: string;
  opportunity_id: string | null;
  title: string;
  status: string;
  compliance_matrix: unknown;
  sections: unknown;
  created_at: string;
  updated_at: string;
}

const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  draft: { label: 'Draft', tone: 'slate' },
  in_review: { label: 'In review', tone: 'sky' },
  authorized: { label: 'Authorized', tone: 'amber' },
  submitted_by_customer: { label: 'Submitted by you', tone: 'emerald' },
  closed: { label: 'Closed', tone: 'slate' },
};
const PIPELINE_CHOICES: Array<{ status: string; label: string; hint: string }> = [
  { status: 'draft', label: 'Draft', hint: 'Working the checklist and matrix' },
  { status: 'in_review', label: 'In review', hint: 'Internal read-through before you submit' },
  { status: 'submitted_by_customer', label: 'Submitted by you', hint: 'You submitted it on the government portal' },
  { status: 'closed', label: 'Closed', hint: 'Won, lost, withdrawn, or shelved' },
];

const field = 'myco-glass-field w-full rounded-lg border border-border px-3 py-2 text-sm';

function parseMeta(sections: unknown): { portal: PortalKey | null; opportunity_ref: string | null; checklist: ChecklistItem[] } {
  if (sections && typeof sections === 'object' && !Array.isArray(sections)) {
    const s = sections as Record<string, unknown>;
    return {
      portal: typeof s.portal === 'string' ? (s.portal as PortalKey) : null,
      opportunity_ref: typeof s.opportunity_ref === 'string' ? s.opportunity_ref : null,
      checklist: Array.isArray(s.checklist) ? (s.checklist as ChecklistItem[]) : [],
    };
  }
  return { portal: null, opportunity_ref: null, checklist: [] };
}

function parseMatrix(raw: unknown): MatrixRow[] {
  return Array.isArray(raw) ? (raw as MatrixRow[]) : [];
}

export default function ProposalWorkspacePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [ws, setWs] = useState<WorkspaceRow | null>(null);
  const [portal, setPortal] = useState<PortalKey | null>(null);
  const [opportunityRef, setOpportunityRef] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [matrix, setMatrix] = useState<MatrixRow[]>([]);
  const [status, setStatus] = useState('draft');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState<string | null>(null);
  const [newItem, setNewItem] = useState('');
  const [newReq, setNewReq] = useState({ requirement: '', section: '' });

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const r = await fetch(`/api/fusarium/launchpad/proposals/${id}`, { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) { setErr(d?.error || `HTTP ${r.status}`); return; }
      const row: WorkspaceRow = d.workspace;
      const meta = parseMeta(row.sections);
      setWs(row);
      setPortal(meta.portal);
      setOpportunityRef(meta.opportunity_ref);
      setChecklist(meta.checklist);
      setMatrix(parseMatrix(row.compliance_matrix));
      setStatus(row.status);
      setErr(null);
    } catch { setErr('Could not load this workspace'); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  /** PATCH the collection route; on failure re-sync from the server. */
  const patch = useCallback(async (body: Record<string, unknown>, note: string) => {
    setSavingNote(note); setErr(null);
    try {
      const r = await fetch('/api/fusarium/launchpad/proposals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...body }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setErr(d?.error || 'Save failed');
        await load(); // undo the optimistic change
      }
    } catch { setErr('Save failed'); await load(); }
    finally { setSavingNote(null); }
  }, [id, load]);

  const toggleItem = (itemId: string, done: boolean) => {
    const next = checklist.map((c) =>
      c.id === itemId ? { ...c, done, done_at: done ? new Date().toISOString() : null } : c);
    setChecklist(next);
    patch({ checklist: next }, 'Saving checklist…');
  };

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    const label = newItem.trim();
    if (!label) return;
    const next = [...checklist, { id: `custom-${Date.now()}`, label: label.slice(0, 400), done: false, done_at: null }];
    setChecklist(next); setNewItem('');
    patch({ checklist: next }, 'Saving checklist…');
  };

  const addRow = (e: React.FormEvent) => {
    e.preventDefault();
    const requirement = newReq.requirement.trim();
    if (!requirement) return;
    const next: MatrixRow[] = [...matrix, {
      id: `req-${Date.now()}`,
      requirement: requirement.slice(0, 600),
      section: newReq.section.trim().slice(0, 200),
      status: 'open',
    }];
    setMatrix(next); setNewReq({ requirement: '', section: '' });
    patch({ complianceMatrix: next }, 'Saving matrix…');
  };

  const toggleRow = (rowId: string, addressed: boolean) => {
    const next = matrix.map((r) => (r.id === rowId ? { ...r, status: addressed ? 'addressed' as const : 'open' as const } : r));
    setMatrix(next);
    patch({ complianceMatrix: next }, 'Saving matrix…');
  };

  const setPipelineStatus = (s: string) => {
    setStatus(s);
    patch({ status: s }, 'Saving status…');
  };

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin text-current" /> Loading workspace…
    </div>;
  }
  if (!ws) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-sm font-medium mb-1">Workspace not found.</p>
        <p className="text-sm text-muted-foreground mb-5">{err ?? 'It may belong to another workspace or have been removed.'}</p>
        <GlassButton href="/app/launchpad/proposals">
          <ArrowLeft className="h-4 w-4 text-current mr-2" /> All proposal workspaces
        </GlassButton>
      </div>
    );
  }

  const template = PORTAL_TEMPLATES[portal ?? 'other'] ?? PORTAL_TEMPLATES.other;
  const meta = STATUS_META[status] ?? { label: status, tone: 'slate' as Tone };
  const done = checklist.filter((c) => c.done).length;
  const addressed = matrix.filter((r) => r.status === 'addressed').length;

  return (
    <div className="container max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/app/launchpad/proposals"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> All proposal workspaces
      </Link>

      <PageHeader
        title={ws.title}
        icon={PenLine}
        description={
          <>
            <span className="inline-flex items-center gap-2 mr-2">
              <StateBadge tone={meta.tone}>{meta.label}</StateBadge>
              <span className="text-[11px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">{template.label}</span>
              {opportunityRef && <code className="text-[11px] text-muted-foreground">ref: {opportunityRef}</code>}
            </span>
            {PROPOSAL_BOUNDARY_NOTE}
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <TierTag feature="proposals" />
            {savingNote && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> {savingNote}
              </span>
            )}
          </div>
        }
      />

      <FeatureGate feature="proposals">
        {err && <p className="text-sm text-destructive mb-4">{err}</p>}

        {/* Progress */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          <StatTile label="Checklist" tone={done === checklist.length && checklist.length > 0 ? 'emerald' : 'sky'}
            value={<>{done}<span className="text-base font-normal text-muted-foreground">/{checklist.length}</span></>}
            sub="portal tasks completed" />
          <StatTile label="Compliance matrix" tone={matrix.length === 0 ? 'slate' : addressed === matrix.length ? 'emerald' : 'amber'}
            {...(matrix.length === 0
              ? { empty: 'No requirements mapped yet' }
              : { value: <>{addressed}<span className="text-base font-normal text-muted-foreground">/{matrix.length}</span></>, sub: 'requirements addressed' })} />
          <StatTile label="Last updated" tone="slate"
            value={<span className="text-lg">{new Date(ws.updated_at).toLocaleDateString()}</span>}
            sub={new Date(ws.updated_at).toLocaleTimeString()} />
        </div>

        <div className="grid lg:grid-cols-3 gap-4 items-start">
          <div className="lg:col-span-2 space-y-4">
            {/* Submission checklist */}
            <Card className="p-5">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-1 pl-1.5">
                <ListChecks className="h-4 w-4 text-emerald-500" /> Submission checklist
              </h2>
              <p className="text-xs text-muted-foreground mb-4 pl-1.5">
                Seeded from the {template.label} template — factual portal steps, not agency rules. Where a rule
                varies by solicitation, the solicitation wins. Check items off as you complete them; each change saves.
              </p>
              {checklist.length === 0 ? (
                <p className="text-sm italic text-muted-foreground pl-1.5">
                  This workspace has no checklist yet — add your first item below.
                </p>
              ) : (
                <div className="space-y-2.5 pl-1.5">
                  {checklist.map((c) => (
                    <div key={c.id} className="flex items-start gap-1">
                      <LiquidCheckbox
                        id={`chk-${c.id}`}
                        checked={c.done}
                        onChange={(v) => toggleItem(c.id, v)}
                        label={<span className={c.done ? 'line-through text-muted-foreground' : ''}>{c.label}</span>}
                      />
                    </div>
                  ))}
                </div>
              )}
              <form onSubmit={addItem} className="flex gap-2 mt-4 pl-1.5">
                <input className={field} maxLength={400} value={newItem} placeholder="Add a task specific to this bid…"
                  onChange={(e) => setNewItem(e.target.value)} />
                <GlassButton type="submit" disabled={!newItem.trim()}>
                  <Plus className="h-4 w-4 text-current" />
                </GlassButton>
              </form>
            </Card>

            {/* Compliance matrix */}
            <Card className="p-5">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-1 pl-1.5">
                <Table2 className="h-4 w-4 text-emerald-500" /> Compliance matrix
              </h2>
              <p className="text-xs text-muted-foreground mb-4 pl-1.5">
                One row per requirement — every “shall” in the solicitation’s instructions — and where your
                proposal answers it. This is how you guarantee the package is responsive before you submit.
              </p>
              {matrix.length === 0 ? (
                <p className="text-sm italic text-muted-foreground pl-1.5 mb-4">
                  No requirements mapped yet. Read the solicitation’s instructions section and add each
                  requirement as a row — start with page limits, required volumes, and submission method.
                </p>
              ) : (
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wide text-muted-foreground text-left">
                        <th className="py-1.5 pl-1.5 pr-3 font-medium">Requirement</th>
                        <th className="py-1.5 pr-3 font-medium">Where addressed</th>
                        <th className="py-1.5 pr-1.5 font-medium">Addressed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matrix.map((r) => (
                        <tr key={r.id} className="border-t border-border/60 align-top">
                          <td className="py-2 pl-1.5 pr-3">{r.requirement}</td>
                          <td className="py-2 pr-3 text-muted-foreground">{r.section || '—'}</td>
                          <td className="py-2 pr-1.5">
                            <LiquidSwitch id={`row-${r.id}`} checked={r.status === 'addressed'}
                              onChange={(v) => toggleRow(r.id, v)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <form onSubmit={addRow} className="grid sm:grid-cols-[1fr_auto_auto] gap-2 pl-1.5">
                <input className={field} maxLength={600} value={newReq.requirement}
                  placeholder="Requirement text from the solicitation…"
                  onChange={(e) => setNewReq((x) => ({ ...x, requirement: e.target.value }))} />
                <input className={`${field} sm:w-48`} maxLength={200} value={newReq.section}
                  placeholder="Where addressed (Vol/§)"
                  onChange={(e) => setNewReq((x) => ({ ...x, section: e.target.value }))} />
                <GlassButton type="submit" disabled={!newReq.requirement.trim()}>
                  <Plus className="h-4 w-4 text-current" />
                </GlassButton>
              </form>
            </Card>
          </div>

          <div className="space-y-4">
            {/* Pipeline */}
            <Card className="p-5" tone={meta.tone}>
              <h2 className="text-sm font-semibold mb-1 pl-1.5">Pipeline stage</h2>
              <p className="text-xs text-muted-foreground mb-3 pl-1.5">
                “Submitted by you” records a fact after YOU submit on the government portal — Launchpad
                never submits or signs.
              </p>
              <div className="space-y-2.5 pl-1.5">
                {PIPELINE_CHOICES.map((p) => (
                  <div key={p.status}>
                    <LiquidRadio
                      name="pipeline-status"
                      id={`st-${p.status}`}
                      value={p.status}
                      checked={status === p.status}
                      onChange={() => setPipelineStatus(p.status)}
                      label={
                        <span>
                          <span className="font-medium">{p.label}</span>
                          <span className="block text-[11px] text-muted-foreground">{p.hint}</span>
                        </span>
                      }
                    />
                  </div>
                ))}
                {status === 'authorized' && (
                  <p className="text-[11px] text-muted-foreground">
                    Current stage is “Authorized” (set elsewhere) — pick a stage above to move it.
                  </p>
                )}
              </div>
            </Card>

            {/* Portal playbook */}
            <Card className="p-5">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-1 pl-1.5">
                <BookOpen className="h-4 w-4 text-emerald-500" /> {template.label} playbook
              </h2>
              <p className="text-xs text-muted-foreground mb-3 pl-1.5">{template.summary}</p>
              {template.officialUrl && (
                <a href={template.officialUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 underline underline-offset-2 mb-3 pl-1.5">
                  Official portal <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {([
                ['Registration prerequisites', template.registration],
                ['Typical volumes', template.volumes],
                ['Formatting reminders', template.formatting],
                ['Deadline discipline', template.deadlines],
              ] as Array<[string, string[]]>).map(([heading, items]) => (
                <div key={heading} className="mb-3 pl-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{heading}</div>
                  <ul className="space-y-1">
                    {items.map((it) => (
                      <li key={it} className="text-xs text-muted-foreground leading-relaxed flex gap-1.5">
                        <span className="text-emerald-500 shrink-0">•</span> {it}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground pl-1.5">
                General workflow guidance, not legal advice — the solicitation is always the authority.
              </p>
            </Card>
          </div>
        </div>
      </FeatureGate>
    </div>
  );
}
