'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Radar, Loader2, ArrowLeft, ExternalLink, Eye, Sparkles, FileDiff, PenLine, CalendarClock,
} from 'lucide-react';
import { GlassButton } from '@/components/ui/glass-button';
import { PageHeader, Card, StatTile, StateBadge, type Tone } from '@/components/launchpad/ui';

/**
 * Opportunity detail — read-only over the existing radar routes (this page
 * owns NO backend). It reads the central list for collector status and the
 * per-id route for the full record + amendments + this tenant's match row.
 *
 * Honesty rules carried through: no mock federal data, amendments render an
 * honest empty until collectors ship, and deep research is explained as
 * fit-gated — never shown as if it already ran.
 *
 * Watch/unwatch: no watches route exists in the BFF yet (checked
 * app/api/fusarium/launchpad/radar/* — opportunities, ingest, rank, alerts
 * only), so the watch button renders disabled with "watch service pending".
 */

interface OpportunityDetail {
  id: string;
  source: string;
  source_id: string;
  title: string;
  agency: string | null;
  subagency?: string | null;
  instrument: string | null;
  notice_type?: string | null;
  posted_at: string | null;
  due_at: string | null;
  questions_due_at?: string | null;
  timezone: string | null;
  set_asides?: string[];
  naics: string[];
  psc?: string[];
  official_url: string;
  ingested_at?: string | null;
}
interface Amendment { id: string; amendment_no: number; detected_at: string }
interface Match { id: string; fit_score: number | null; status: string; disqualifiers: unknown }

const SOURCE_LABEL: Record<string, string> = {
  sam: 'SAM.gov', dsip: 'DSIP', grants_gov: 'Grants.gov', diu: 'DIU',
  darpa: 'DARPA', nspires: 'NSPIRES', nsf: 'NSF', other: 'Other',
};
const MATCH_TONE: Record<string, Tone> = {
  matched: 'sky', review: 'sky', qualified: 'emerald', watch: 'sky', bid: 'emerald',
  submitted: 'emerald', no_bid: 'slate', won: 'emerald', lost: 'amber', cancelled: 'slate',
};

function fmt(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleString() : '—';
}

export default function OpportunityDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [opp, setOpp] = useState<OpportunityDetail | null>(null);
  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [match, setMatch] = useState<Match | null>(null);
  const [collectorsLive, setCollectorsLive] = useState(false);
  const [sourceNote, setSourceNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      // Existing radar routes only — the per-id route is the PRIMARY record
      // source; the list supplies collector status and acts as the fallback
      // filter only when the :id route cannot produce the record.
      const [detailRes, listRes] = await Promise.all([
        fetch(`/api/fusarium/launchpad/radar/opportunities/${id}`, { cache: 'no-store' }),
        fetch('/api/fusarium/launchpad/radar/opportunities', { cache: 'no-store' }),
      ]);
      let record: OpportunityDetail | null = null;
      if (detailRes.ok) {
        const d = await detailRes.json();
        record = d.opportunity ?? null;
        setAmendments(d.amendments ?? []);
        setMatch(d.match ?? null);
      }
      if (listRes.ok) {
        const list = await listRes.json();
        setCollectorsLive(Boolean(list.collectorsLive));
        setSourceNote(list.note ?? null);
        if (!record) {
          record = (list.opportunities ?? []).find((o: OpportunityDetail) => o.id === id) ?? null;
        }
      }
      setOpp(record);
      setErr(null);
    } catch { setErr('Could not load this opportunity'); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin text-current" /> Loading opportunity…
    </div>;
  }

  if (!opp) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-16 text-center">
        <Radar className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm font-medium mb-1">Opportunity not found.</p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
          {err ?? (collectorsLive
            ? 'This record is not in the central opportunity table.'
            : 'No opportunity source is connected yet — the SAM.gov collector is built and waiting on an API key; DSIP and Grants.gov are not built. This page never shows sample data as if it were live.')}
        </p>
        <GlassButton href="/app/launchpad/opportunities">
          <ArrowLeft className="h-4 w-4 text-current mr-2" /> Back to Contract Radar
        </GlassButton>
      </div>
    );
  }

  const sourceLabel = SOURCE_LABEL[opp.source] ?? opp.source;
  const proposalHref = `/app/launchpad/proposals?title=${encodeURIComponent(opp.title.slice(0, 120))}&ref=${encodeURIComponent(opp.source_id)}`;

  return (
    <div className="container max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/app/launchpad/opportunities"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Contract Radar
      </Link>

      <PageHeader
        title={opp.title}
        icon={Radar}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="text-[11px] px-1.5 py-0.5 rounded border border-border text-muted-foreground uppercase">{sourceLabel}</span>
            <code className="text-[11px] text-muted-foreground">{opp.source_id}</code>
            {opp.notice_type && <span className="text-[11px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">{opp.notice_type}</span>}
            {opp.instrument && <span className="text-[11px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">{opp.instrument}</span>}
          </span>
        }
        actions={
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <GlassButton disabled dataAnalytics="lp-opp-watch-pending">
                <Eye className="h-4 w-4 text-current mr-2" /> Watch
              </GlassButton>
              <GlassButton href={opp.official_url} external dataAnalytics="lp-opp-official">
                Official page <ExternalLink className="h-4 w-4 text-current ml-2" />
              </GlassButton>
            </div>
            <span className="text-[10px] text-muted-foreground">watch service pending — the watches API has not shipped yet</span>
          </div>
        }
      />

      {/* Education-first intro */}
      <Card className="p-5 mb-6" tone="sky">
        <div className="grid sm:grid-cols-3 gap-4 text-sm pl-1.5">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">What is this</div>
            <p className="text-muted-foreground leading-relaxed">
              One federal opportunity, normalized from its official source. An{' '}
              <span className="font-medium text-foreground">opportunity</span> is a government notice that it
              intends to buy something — a solicitation, pre-solicitation, or funding announcement.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Why it matters</div>
            <p className="text-muted-foreground leading-relaxed">
              Dates and eligibility decide everything. The official page is the only authority — this view is a
              working summary that always links back to it.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Your next step</div>
            <p className="text-muted-foreground leading-relaxed">
              Open the official page, confirm the deadline and eligibility, then start a proposal workspace
              to track the bid.
            </p>
          </div>
        </div>
      </Card>

      {err && <p className="text-sm text-destructive mb-4">{err}</p>}

      {/* Dates */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-2">
        <StatTile label="Posted" tone="slate"
          {...(opp.posted_at ? { value: <span className="text-lg">{fmt(opp.posted_at)}</span> } : { empty: 'Not stated on the record' })} />
        <StatTile label="Questions due" tone="sky"
          {...(opp.questions_due_at ? { value: <span className="text-lg">{fmt(opp.questions_due_at)}</span>, sub: 'Q&A usually closes before the proposal deadline' } : { empty: 'Not stated on the record' })} />
        <StatTile label="Response due" tone={opp.due_at ? 'amber' : 'slate'}
          {...(opp.due_at ? { value: <span className="text-lg">{fmt(opp.due_at)}</span>, sub: 'hard cutoff — late is late' } : { empty: 'Not stated on the record' })} />
      </div>
      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mb-6">
        <CalendarClock className="h-3.5 w-3.5 shrink-0" />
        Times render in your browser’s local timezone. The official record states timezone:{' '}
        <span className="font-medium text-foreground">{opp.timezone || 'not stated'}</span> — always confirm
        the deadline on the official page before planning.
      </p>

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4">
          {/* Record facts */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold mb-3 pl-1.5">Record</h2>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm pl-1.5">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Agency</dt>
                <dd className="mt-0.5">{opp.agency || '—'}{opp.subagency ? <span className="text-muted-foreground"> · {opp.subagency}</span> : null}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Source / notice ID</dt>
                <dd className="mt-0.5">{sourceLabel} · <code className="text-xs">{opp.source_id}</code></dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  NAICS <span className="normal-case">(industry classification code used to size the competition)</span>
                </dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {(opp.naics ?? []).length > 0
                    ? opp.naics.map((n) => <code key={n} className="text-[11px] px-1.5 py-0.5 rounded bg-muted tabular-nums">{n}</code>)
                    : <span className="text-muted-foreground">Not stated on the record</span>}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Set-asides <span className="normal-case">(competition limited to a business category)</span>
                </dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {(opp.set_asides ?? []).length > 0
                    ? (opp.set_asides ?? []).map((s) => <StateBadge key={s} tone="sky">{s}</StateBadge>)
                    : <span className="text-muted-foreground">None stated — assume full and open unless the official page says otherwise</span>}
                </dd>
              </div>
              {(opp.psc ?? []).length > 0 && (
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    PSC <span className="normal-case">(product/service code)</span>
                  </dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {(opp.psc ?? []).map((p) => <code key={p} className="text-[11px] px-1.5 py-0.5 rounded bg-muted">{p}</code>)}
                  </dd>
                </div>
              )}
              {opp.ingested_at && (
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Ingested</dt>
                  <dd className="mt-0.5 text-muted-foreground">{fmt(opp.ingested_at)}</dd>
                </div>
              )}
            </dl>
          </Card>

          {/* Amendments */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold flex items-center gap-2 mb-1 pl-1.5">
              <FileDiff className="h-4 w-4 text-emerald-500" /> Amendments
            </h2>
            <p className="text-xs text-muted-foreground mb-3 pl-1.5">
              An <span className="font-medium text-foreground">amendment</span> changes the solicitation after
              posting — often the deadline or the requirements. Reading every amendment is mandatory: proposals
              that ignore one can be rejected.
            </p>
            {amendments.length > 0 ? (
              <div className="space-y-2 pl-1.5">
                {amendments.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm">
                    <span className="font-medium tabular-nums">Amendment {a.amendment_no}</span>
                    <span className="text-xs text-muted-foreground ml-auto">detected {fmt(a.detected_at)}</span>
                  </div>
                ))}
                <p className="text-[11px] text-muted-foreground">
                  Amendment contents live on the official page — open it for the actual changes.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground ml-1.5">
                No amendments tracked yet. Amendment tracking goes live with the collectors — until then,
                re-check the official page before relying on any date shown here.
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          {/* Fit + research escalation */}
          <Card className="p-5" tone={match?.fit_score != null ? 'emerald' : 'slate'}>
            <h2 className="text-sm font-semibold flex items-center gap-2 mb-1 pl-1.5">
              <Sparkles className="h-4 w-4 text-emerald-500" /> Research escalation
            </h2>
            <p className="text-xs text-muted-foreground mb-3 pl-1.5 leading-relaxed">
              Deep research (AI enrichment) is deliberately rationed: it runs centrally and only for
              opportunities whose <span className="font-medium text-foreground">fit score</span> — how well a
              notice matches your company profile — clears the threshold. Credits go to bids you might
              actually win, never a blanket scrape of every notice.
            </p>
            {match ? (
              <div className="pl-1.5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold tabular-nums">
                    {match.fit_score != null ? Number(match.fit_score).toFixed(0) : '—'}
                  </span>
                  <span className="text-[11px] text-muted-foreground">fit score</span>
                  <span className="ml-auto"><StateBadge tone={MATCH_TONE[match.status] ?? 'slate'}>{match.status.replace(/_/g, ' ')}</StateBadge></span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {match.fit_score == null
                    ? 'Matched to your workspace but not yet scored.'
                    : 'A score is an estimate for triage — read the official page before deciding to bid.'}
                </p>
              </div>
            ) : collectorsLive ? (
              <p className="text-sm text-muted-foreground pl-1.5">
                No fit score for this workspace yet — the matching engine scores opportunities against your
                company profile as they are ingested. No score is fabricated in the meantime.
              </p>
            ) : (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground ml-1.5">
                Collectors are not yet live, so no fit scoring or research escalation has run for any
                opportunity. {sourceNote ?? ''} No mock scores are shown.
              </div>
            )}
          </Card>

          {/* Next step */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold flex items-center gap-2 mb-2 pl-1.5">
              <PenLine className="h-4 w-4 text-emerald-500" /> Pursue it
            </h2>
            <p className="text-xs text-muted-foreground mb-3 pl-1.5">
              A proposal workspace gives you the portal checklist and a compliance matrix for this notice.
              You submit on the government portal yourself — Launchpad never submits or signs.
            </p>
            <div className="pl-1.5">
              <GlassButton href={proposalHref} dataAnalytics="lp-opp-start-proposal">
                Start a proposal workspace
              </GlassButton>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
