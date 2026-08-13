'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, Loader2, Trash2, CheckCircle2, GraduationCap } from 'lucide-react';
import { PageHeader, Card, StateBadge } from '@/components/launchpad/ui';
import { GlassButton } from '@/components/ui/glass-button';
import { LiquidCheckbox } from '@/components/launchpad/liquid';

/**
 * Export & deletion — the "your data remains yours" screen.
 *
 * Download runs the real export route (RLS-scoped rows, attachment download,
 * audit-logged). Deletion is a REQUEST: audit event + a task in the tenant's
 * own list; a human confirms before anything is destroyed.
 */

/** Plain-English map of what the export file contains. */
const EXPORT_CONTENTS: Array<{ group: string; items: string[] }> = [
  {
    group: 'Company & registrations',
    items: [
      'Company profile',
      'Capability profile (capabilities, target agencies, NAICS/PSC)',
      'Registration records (SAM.gov, portals, renewals)',
      'Role assignments (who holds which compliance role)',
    ],
  },
  {
    group: 'Readiness',
    items: [
      'Requirement states (your customer-marked register)',
      'Score snapshot history',
      'POA&M items (your plan of action & milestones)',
      'Tier-1 operator records (training, screening, agreements)',
      'Closure statements',
      'Clearance readiness worksheet',
      'Workbook progress (completed steps)',
    ],
  },
  {
    group: 'Evidence & documents',
    items: [
      'Evidence index (titles, references, hashes — never file content)',
      'Generated-document metadata (titles, versions, hashes — not document bodies)',
      'Enclave references (provider, titles, hashes — never enclave content)',
    ],
  },
  {
    group: 'Operations',
    items: [
      'Tasks',
      'Training assignments',
      'Compliance calendar events',
      'Bill-of-materials parts and replacement candidates',
      'Quarantine events (screening hits — never the screened content)',
      'Proposal workspaces',
      'Radar alerts',
      'Resource cards shown to your workspace (global vendor directory)',
    ],
  },
  {
    group: 'AI usage',
    items: [
      'AI connections (provider, mode, status, key last-4 — never key material)',
      'AI cost ledger (per-action usage and credit charges)',
    ],
  },
  {
    group: 'Provenance',
    items: ['Your full append-only audit trail, in chain order, hashes included — verifiable offline'],
  },
];

export default function ExportPage() {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [dlErr, setDlErr] = useState<string | null>(null);

  const [ack, setAck] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [delNote, setDelNote] = useState<string | null>(null);
  const [delErr, setDelErr] = useState<string | null>(null);

  const download = async () => {
    setDownloading(true);
    setDlErr(null);
    setDownloaded(false);
    try {
      const r = await fetch('/api/fusarium/launchpad/export', { cache: 'no-store' });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setDlErr(d?.error || `HTTP ${r.status}`);
        return;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'launchpad-export.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDownloaded(true);
    } catch {
      setDlErr('Could not reach the export endpoint');
    } finally {
      setDownloading(false);
    }
  };

  const requestDeletion = async () => {
    setRequesting(true);
    setDelErr(null);
    setDelNote(null);
    try {
      const r = await fetch('/api/fusarium/launchpad/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_deletion' }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setDelErr(d?.error || `HTTP ${r.status}`);
        return;
      }
      setDelNote(d?.note || 'Deletion request recorded. A human operator confirms before anything is destroyed.');
    } catch {
      setDelErr('Could not reach the export endpoint');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <PageHeader
        title="Export & deletion"
        icon={Download}
        description="Your data remains yours. Take a complete copy any time — and if you ever leave, a human handles deletion with you, never silently."
      />

      {/* Education-first intro */}
      <Card className="p-5 mb-8">
        <div className="pl-1.5 grid sm:grid-cols-3 gap-x-6 gap-y-4">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <GraduationCap className="h-3.5 w-3.5" /> What is this
            </div>
            <p className="text-sm leading-relaxed">
              A one-click download of everything this workspace stores about your company, as a single
              JSON file (a plain, machine-readable text format any tool can open). Each export is
              recorded on your audit trail.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">Why it matters</div>
            <p className="text-sm leading-relaxed">
              Readiness work is <em>your</em> record — you may need it for a self-assessment, an assessor,
              or a new tool. No lock-in: even in read/export mode (the state a workspace enters if billing
              lapses — changes pause, but reading and exporting never do), this button keeps working.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">Your next step</div>
            <p className="text-sm leading-relaxed">
              Download an export now and store it with your own records — a periodic copy is a good habit
              and doubles as evidence of your record-keeping discipline.
            </p>
          </div>
        </div>
      </Card>

      {/* What the export contains */}
      <h2 className="text-lg font-semibold mb-1">What the export contains</h2>
      <p className="text-sm text-muted-foreground mb-4 max-w-3xl">
        Every table is scoped to this workspace and pulled live at download time. Consistent with the{' '}
        <Link
          href="/app/launchpad/settings/data-boundary"
          className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2 font-medium"
        >
          data boundary
        </Link>
        , the file carries references, metadata, and hashes — never file content, document bodies, or
        secrets, because none are stored here to begin with.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {EXPORT_CONTENTS.map((g) => (
          <Card key={g.group} className="p-4">
            <div className="pl-1.5">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">{g.group}</div>
              <ul className="space-y-1.5">
                {g.items.map((item) => (
                  <li key={item} className="text-xs leading-relaxed flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </div>

      {/* Download */}
      <Card tone="emerald" className="p-5 mb-8">
        <div className="pl-1.5 flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="text-base font-semibold mb-1">Download your export</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Assembles <code className="text-xs">launchpad-export.json</code> from the live database and
              downloads it to your machine. The file is wrapped with the workspace banner
              (<code className="text-xs">COMMERCIAL // NON-CUI</code>) and an export timestamp. If any
              table cannot be read at export time, the file still downloads and names it in a top-level{' '}
              <code className="text-xs">omissions</code> list — a partial export always says it is partial.
            </p>
          </div>
          <GlassButton onClick={download} disabled={downloading}>
            {downloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-current mr-2" /> Assembling…
              </>
            ) : (
              <>
                <Download className="h-4 w-4 text-current mr-2" /> Download launchpad-export.json
              </>
            )}
          </GlassButton>
        </div>
        {downloaded && (
          <p className="pl-1.5 text-sm text-emerald-600 dark:text-emerald-400 mt-3 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" /> Export downloaded. The export was recorded on your audit trail.
          </p>
        )}
        {dlErr && <p className="pl-1.5 text-sm text-destructive mt-3">{dlErr}</p>}
      </Card>

      {/* Deletion request */}
      <Card tone="red" className="p-5">
        <div className="pl-1.5">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-500" /> Request workspace deletion
            </h2>
            <StateBadge tone="red">Human-confirmed</StateBadge>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl mb-3">
            This records a deletion <span className="font-medium text-foreground">request</span> — it does
            not delete anything. The request is appended to your audit trail and a task titled
            &ldquo;Tenant deletion request&rdquo; appears in your task list. A human operator then confirms
            with you before any data is destroyed. There is no silent destruction, and read/export access
            stays available while the request is open — export first if you have not already.
          </p>
          <div className="mb-4">
            <LiquidCheckbox
              checked={ack}
              onChange={setAck}
              label={
                <span className="text-sm">
                  I understand this is a request reviewed by a human — nothing is deleted until I confirm
                  with the operator.
                </span>
              }
            />
          </div>
          <GlassButton onClick={requestDeletion} disabled={!ack || requesting} className="myco-glass-danger">
            {requesting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-current mr-2" /> Recording request…
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 text-current mr-2" /> Request deletion
              </>
            )}
          </GlassButton>
          {delNote && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-3 flex items-start gap-1.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> {delNote}
            </p>
          )}
          {delErr && <p className="text-sm text-destructive mt-3">{delErr}</p>}
        </div>
      </Card>
    </div>
  );
}
