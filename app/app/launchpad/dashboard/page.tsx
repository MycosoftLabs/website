'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck, FolderLock, Radar, FileText, ArrowRight, ShieldCheck } from 'lucide-react';

/**
 * Launchpad dashboard — P2 shell.
 *
 * P5 expands this into the four-indicator board (implementation count,
 * weighted score estimate, conditional eligibility estimate, evidence
 * confidence — always shown side by side, never blended). Until the ASA
 * routes land, this renders workspace identity and honest empty states; it
 * never fabricates a score.
 */

interface TenantInfo {
  state: string;
  tenant?: { id: string; name: string; status: string };
  role?: string;
}

interface Snapshot {
  score: number;
  max_score: number;
  implemented_count: number;
  not_met_count: number;
  unassessed_count: number;
  eligibility: string;
  indicators?: Record<string, { value?: unknown; covered?: number; assessed?: number }>;
  created_at: string;
}

const startHere = [
  {
    title: 'Work the 110 requirements',
    detail: 'Scope your environment and track implementation in the ASA Workspace.',
    href: '/app/launchpad/readiness/controls',
    icon: ClipboardCheck,
  },
  {
    title: 'Index your evidence',
    detail: 'References, owners, and hashes — content stays in your systems.',
    href: '/app/launchpad/evidence',
    icon: FolderLock,
  },
  {
    title: 'Watch opportunities',
    detail: 'Contract Radar matches arrive once your company profile is complete.',
    href: '/app/launchpad/opportunities',
    icon: Radar,
  },
  {
    title: 'Draft documents',
    detail: 'Policies, SSP, and POA&M drafts from your approved facts — always marked DRAFT.',
    href: '/app/launchpad/documents',
    icon: FileText,
  },
];

export default function LaunchpadDashboard() {
  const [info, setInfo] = useState<TenantInfo | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    fetch('/api/fusarium/launchpad/tenant', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => setInfo(null));
    fetch('/api/fusarium/launchpad/readiness/score', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSnap(d?.latest ?? null))
      .catch(() => setSnap(null));
  }, []);

  return (
    <div className="container max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          {info?.tenant?.name ? `${info.tenant.name} — readiness workspace` : 'Readiness workspace'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Four indicators will appear here as you work: implementation count, weighted score estimate,
          conditional eligibility estimate, and evidence confidence. They are independent — a count is
          never a status.
        </p>
      </div>

      {/* Four independent indicators — live when a snapshot exists, honest
          empties when not. Never a fabricated zero, never blended. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {(() => {
          const ev = snap?.indicators?.evidence_confidence as
            | { value?: number; covered?: number; assessed?: number }
            | undefined;
          const cells: Array<[string, React.ReactNode, string]> = snap
            ? [
                ['Implementation count',
                  <span key="v" className="tabular-nums">{snap.implemented_count}<span className="text-sm font-normal text-muted-foreground">/{snap.max_score}</span></span>,
                  'customer-marked implemented'],
                ['Weighted score estimate',
                  <span key="v" className={`tabular-nums ${snap.score >= 88 ? 'text-emerald-500' : 'text-amber-500'}`}>{snap.score}<span className="text-sm font-normal text-muted-foreground">/{snap.max_score}</span></span>,
                  'threshold 88 · customer review required'],
                ['Conditional eligibility',
                  <span key="v" className="text-base">{snap.eligibility.replace(/-/g, ' ')}</span>,
                  'estimate — not a certification'],
                ['Evidence confidence',
                  <span key="v" className="tabular-nums">{ev?.value !== undefined ? `${Math.round((ev.value as number) * 100)}%` : '—'}</span>,
                  `${ev?.covered ?? 0}/${ev?.assessed ?? 0} assessed reqs have evidence`],
              ]
            : [
                ['Implementation count', <em key="v" className="text-sm font-normal text-muted-foreground">No requirements marked yet</em>, ''],
                ['Weighted score estimate', <em key="v" className="text-sm font-normal text-muted-foreground">Compute after marking requirements</em>, ''],
                ['Conditional eligibility', <em key="v" className="text-sm font-normal text-muted-foreground">Derived from score + POA&M rules</em>, ''],
                ['Evidence confidence', <em key="v" className="text-sm font-normal text-muted-foreground">No evidence indexed yet</em>, ''],
              ];
          return cells.map(([title, value, sub]) => (
            <div key={title as string} className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</div>
              <div className="text-2xl font-bold mt-1">{value}</div>
              {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
            </div>
          ));
        })()}
      </div>
      {snap && (
        <p className="text-[11px] text-muted-foreground mb-10">
          Latest snapshot {new Date(snap.created_at).toLocaleString()}
          {snap.unassessed_count > 0 && (
            <span className="text-amber-500"> · {snap.unassessed_count} unassessed requirements scored as Not Met</span>
          )}
        </p>
      )}
      {!snap && <div className="mb-10" />}

      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Start here</h2>
      <div className="grid md:grid-cols-2 gap-4 mb-10">
        {startHere.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group rounded-lg border border-border/60 bg-background hover:border-primary/40 transition-colors p-5 flex items-start gap-4"
          >
            <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
              <s.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="font-medium flex items-center gap-1.5">
                {s.title}
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-sm text-muted-foreground mt-1">{s.detail}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-xs text-muted-foreground flex items-start gap-2.5">
        <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <span>
          Launchpad organizes your customer-owned self-assessment. It never marks a requirement
          implemented for you, never certifies compliance, and never submits or signs on your behalf.
          Every material action lands in your workspace&apos;s hash-chained audit trail.
        </span>
      </div>
    </div>
  );
}
