'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck, FolderLock, Radar, FileText, ArrowRight, Gauge, ListChecks, ShieldCheck, Calculator,
} from 'lucide-react';
import {
  PageHeader, Card, StatTile, SegmentBar, ThresholdMeter, StateBadge, GateChip, type Tone,
} from '@/components/launchpad/ui';

/**
 * Launchpad readiness cockpit.
 *
 * The four independent indicators, the posture distribution, the score-vs-88
 * meter, and the §170.21 gates — all from the latest snapshot. Never a
 * fabricated zero: with no snapshot yet, tiles show honest empties and the
 * page invites the first computation.
 */

interface TenantInfo {
  tenant?: { id: string; name: string; status: string };
  role?: string;
}
interface Indicators {
  implementation_count?: { value: number; total: number };
  weighted_score_estimate?: { value: number; max: number; threshold: number };
  conditional_eligibility_estimate?: { value: string; reason?: string; blocking_gaps?: string[]; open_poam_items?: number };
  evidence_confidence?: { value: number; covered: number; assessed: number };
}
interface Snapshot {
  score: number; max_score: number; implemented_count: number; not_met_count: number;
  na_count: number; unassessed_count: number; eligibility: string; indicators?: Indicators; created_at: string;
}
interface Gaps { gaps?: Array<{ controlId: string; state: string; poamEligible: boolean }> }

const ELIG_TONE: Record<string, Tone> = {
  'final-eligible': 'emerald', 'conditional-eligible': 'sky', 'not-eligible': 'amber',
};

export default function LaunchpadDashboard() {
  const [info, setInfo] = useState<TenantInfo | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [latestGaps, setLatestGaps] = useState<Gaps | null>(null);

  useEffect(() => {
    fetch('/api/fusarium/launchpad/tenant', { cache: 'no-store' }).then((r) => r.json()).then(setInfo).catch(() => {});
    fetch('/api/fusarium/launchpad/readiness/score', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null)).then((d) => setSnap(d?.latest ?? null)).catch(() => {});
  }, []);

  const ind = snap?.indicators;
  const scoreTone: Tone = snap ? (snap.score >= (ind?.weighted_score_estimate?.threshold ?? 88) ? 'emerald' : 'amber') : 'slate';
  const eligTone: Tone = snap ? (ELIG_TONE[snap.eligibility] ?? 'slate') : 'slate';
  const blocking = ind?.conditional_eligibility_estimate?.blocking_gaps ?? [];

  return (
    <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        title={info?.tenant?.name ? `${info.tenant.name}` : 'Readiness workspace'}
        description="Four independent indicators, side by side — because an implementation count is never, by itself, a compliance status."
        icon={ShieldCheck}
        actions={
          <Link href="/app/launchpad/readiness/score"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-500">
            <Calculator className="h-4 w-4" /> Score
          </Link>
        }
      />

      {/* Four indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {snap ? (
          <>
            <StatTile label="Implemented" value={<>{snap.implemented_count}<span className="text-base font-normal text-muted-foreground">/{snap.max_score}</span></>}
              sub="customer-marked" tone="emerald" />
            <StatTile label="Weighted score" value={<>{snap.score}<span className="text-base font-normal text-muted-foreground">/{snap.max_score}</span></>}
              sub={`threshold ${ind?.weighted_score_estimate?.threshold ?? 88}`} tone={scoreTone} />
            <StatTile label="Conditional eligibility" value={<span className="text-lg">{snap.eligibility.replace(/-/g, ' ')}</span>}
              sub="estimate — not a certification" tone={eligTone} />
            <StatTile label="Evidence confidence" value={ind?.evidence_confidence ? `${Math.round(ind.evidence_confidence.value * 100)}%` : '—'}
              sub={`${ind?.evidence_confidence?.covered ?? 0}/${ind?.evidence_confidence?.assessed ?? 0} assessed have evidence`} tone="sky" />
          </>
        ) : (
          <>
            <StatTile label="Implemented" tone="slate" empty="Mark requirements first" />
            <StatTile label="Weighted score" tone="slate" empty="Compute a snapshot" />
            <StatTile label="Conditional eligibility" tone="slate" empty="Derived from score + POA&M" />
            <StatTile label="Evidence confidence" tone="slate" empty="No evidence indexed yet" />
          </>
        )}
      </div>

      {snap && (
        <div className="grid lg:grid-cols-3 gap-4 mb-6">
          {/* Posture distribution */}
          <Card className="lg:col-span-2 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Posture across 110 requirements</h2>
              <span className="text-[11px] text-muted-foreground">snapshot {new Date(snap.created_at).toLocaleString()}</span>
            </div>
            <SegmentBar
              total={snap.max_score}
              segments={[
                { tone: 'emerald', value: snap.implemented_count, label: 'implemented' },
                // not_met_count includes unassessed; show them separately so
                // "never assessed" is never mistaken for "assessed and failing".
                { tone: 'amber', value: Math.max(0, snap.not_met_count - snap.unassessed_count), label: 'partial/not-met' },
                { tone: 'slate', value: snap.na_count, label: 'N/A' },
                { tone: 'red', value: snap.unassessed_count, label: 'unassessed' },
              ]}
            />
            <div className="mt-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold">Weighted score</span>
                <span className={`text-sm font-bold tabular-nums ${scoreTone === 'emerald' ? 'text-emerald-500' : 'text-amber-500'}`}>{snap.score} / {snap.max_score}</span>
              </div>
              <ThresholdMeter value={snap.score} max={snap.max_score} threshold={ind?.weighted_score_estimate?.threshold ?? 88} tone={scoreTone} />
            </div>
          </Card>

          {/* Eligibility verdict */}
          <Card tone={eligTone} className="p-5">
            <h2 className="text-sm font-semibold mb-2 pl-1.5">Conditional status (estimate)</h2>
            <div className="pl-1.5">
              <StateBadge tone={eligTone}>{snap.eligibility.replace(/-/g, ' ')}</StateBadge>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{ind?.conditional_eligibility_estimate?.reason}</p>
              {blocking.length > 0 && (
                <div className="mt-3">
                  <div className="text-[11px] font-medium text-red-500 mb-1.5">{blocking.length} gap(s) can&apos;t sit on a POA&amp;M:</div>
                  <div className="flex flex-wrap gap-1">
                    {blocking.map((g) => <code key={g} className="text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border">{g}</code>)}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {snap && snap.unassessed_count > 0 && (
        <Card tone="red" className="p-4 mb-6">
          <p className="text-sm pl-1.5">
            <span className="font-semibold">{snap.unassessed_count} requirements are unassessed</span> and scored as Not Met in
            this estimate. <Link href="/app/launchpad/readiness/controls" className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2">Assess them</Link> for an accurate picture.
          </p>
        </Card>
      )}

      {/* Start-here actions */}
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Continue your readiness work</h2>
      <div className="grid md:grid-cols-2 gap-3 mb-8">
        {[
          { title: 'Work the 110 requirements', detail: 'Scope your environment and mark implementation in your self-assessment.', href: '/app/launchpad/readiness/controls', icon: ClipboardCheck },
          { title: 'Compute your score', detail: 'Deterministic weighted score, POA&M eligibility, and the three §170.21 gates.', href: '/app/launchpad/readiness/score', icon: Gauge },
          { title: 'Index your evidence', detail: 'References, owners, and hashes — content stays in your systems.', href: '/app/launchpad/evidence', icon: FolderLock },
          { title: 'Manage your POA&M', detail: 'Open items with 180-day closeout clocks, derived from your gaps.', href: '/app/launchpad/readiness/poam', icon: ListChecks },
          { title: 'Draft documents', detail: 'Policies, SSP, and POA&M drafts from your approved facts — always DRAFT.', href: '/app/launchpad/documents', icon: FileText },
          { title: 'Watch opportunities', detail: 'Contract Radar matches once official sources are connected.', href: '/app/launchpad/opportunities', icon: Radar },
        ].map((s) => (
          <Link key={s.href} href={s.href}
            className="group rounded-xl border border-border/70 bg-card/40 hover:border-emerald-500/40 hover:bg-card/70 transition-colors p-4 flex items-start gap-3.5">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <s.icon className="h-4.5 w-4.5 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium flex items-center gap-1.5 text-sm">
                {s.title}
                <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">{s.detail}</p>
            </div>
          </Link>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          <span>
            Launchpad organizes your customer-owned self-assessment. It never marks a requirement implemented for you,
            never certifies compliance, and never submits or signs on your behalf. Every material action lands in your
            workspace&apos;s hash-chained audit trail.
          </span>
        </div>
      </Card>
    </div>
  );
}
