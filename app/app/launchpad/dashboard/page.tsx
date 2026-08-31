'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { GlassButton } from '@/components/ui/glass-button';
import { AppTourButton } from '@/components/launchpad/app-tour';
import {
  ClipboardCheck, FolderLock, Radar, FileText, ArrowRight, Gauge, ListChecks, ShieldCheck, Calculator,
  ShieldAlert, CalendarClock, Send, Landmark, PackageSearch, HardDrive, GraduationCap, Scale, Bot,
  Handshake, Compass, Loader2, type LucideIcon,
} from 'lucide-react';
import {
  PageHeader, Card, StatTile, SegmentBar, ThresholdMeter, StateBadge, type Tone,
} from '@/components/launchpad/ui';
import { useEntitlements } from '@/components/launchpad/entitlements';

/**
 * Launchpad readiness cockpit (GTM §7.4 — the 12-panel view).
 *
 * The four independent indicators, the posture distribution, the score-vs-88
 * meter, and the §170.21 gates — all from the latest snapshot — plus twelve
 * module panels, each fetched defensively. Never a fabricated zero: a module
 * that isn't set up (or whose backend isn't live yet) says so plainly and
 * links to the owning page. The page never crashes on a failed fetch and
 * never shows sample data.
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
/** Loosely-typed per-module payloads (strictNullChecks is off; every consumer
 * guards with `?? []` / `== null` so a missing backend can never crash us). */
interface PanelData {
  controls?: any; poam?: any; tasks?: any; radar?: any; proposals?: any;
  registrations?: any; bom?: any; devices?: any; training?: any; tier1?: any;
  evidence?: any; aiConnections?: any; aiLedger?: any; mesh?: any;
}

const ELIG_TONE: Record<string, Tone> = {
  'final-eligible': 'emerald', 'conditional-eligible': 'sky', 'not-eligible': 'amber',
};

const DAY_MS = 86_400_000;
const EVIDENCE_FRESH_DAYS = 180;

/** Static regulatory context — reference facts, not tenant state. */
const REGULATORY = {
  rulePack: 'Rule pack v1',
  requirements: 110,
  status: 'CMMC Phase I in effect; Phase II suspended 7/13/2026',
};

const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString() : '—');

/** Defensive fetch: any non-OK status (including 404) or thrown error → null.
 * Panels render an honest "not set up yet" state on null — never fake data. */
const grab = (url: string) =>
  fetch(url, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);

/** One cockpit panel: small icon header + link to the owning page. */
function Panel({ icon: Icon, title, href, children }: {
  icon: LucideIcon; title: string; href?: string; children: ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 text-emerald-500 shrink-0" />
          <span className="truncate">{title}</span>
        </h3>
        {href && (
          <Link href={href} className="text-[11px] text-emerald-600 dark:text-emerald-400 underline underline-offset-2 shrink-0">
            Open
          </Link>
        )}
      </div>
      {children}
    </Card>
  );
}

/** Honest empty state: what's missing, and the one link that fixes it. */
function PanelEmpty({ text, href, linkLabel }: { text: string; href: string; linkLabel: string }) {
  return (
    <p className="text-xs text-muted-foreground leading-relaxed">
      <span className="italic">{text}</span>{' '}
      <Link href={href} className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2">{linkLabel}</Link>
    </p>
  );
}

export default function LaunchpadDashboard() {
  const [info, setInfo] = useState<TenantInfo | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [panels, setPanels] = useState<PanelData>({});
  const [panelsLoaded, setPanelsLoaded] = useState(false);
  const ent = useEntitlements();

  useEffect(() => {
    let alive = true;
    Promise.allSettled([
      grab('/api/fusarium/launchpad/tenant'),
      grab('/api/fusarium/launchpad/readiness/score'),
      grab('/api/fusarium/launchpad/readiness/controls'),
      grab('/api/fusarium/launchpad/readiness/poam'),
      grab('/api/fusarium/launchpad/tasks'),
      grab('/api/fusarium/launchpad/radar/opportunities'),
      grab('/api/fusarium/launchpad/proposals'),
      grab('/api/fusarium/launchpad/registrations'),
      grab('/api/fusarium/launchpad/origin/bom'),
      grab('/api/fusarium/launchpad/local-agent/devices'),
      grab('/api/fusarium/launchpad/training'),
      grab('/api/fusarium/launchpad/readiness/tier1'),
      grab('/api/fusarium/launchpad/evidence'),
      grab('/api/fusarium/launchpad/ai/connections'),
      grab('/api/fusarium/launchpad/ai/ledger'),
      grab('/api/fusarium/launchpad/partner-mesh'),
    ]).then((results) => {
      if (!alive) return;
      const v = results.map((r) => (r.status === 'fulfilled' ? r.value : null));
      setInfo(v[0]);
      setSnap(v[1]?.latest ?? null);
      setPanels({
        controls: v[2], poam: v[3], tasks: v[4], radar: v[5], proposals: v[6],
        registrations: v[7], bom: v[8], devices: v[9], training: v[10], tier1: v[11],
        evidence: v[12], aiConnections: v[13], aiLedger: v[14], mesh: v[15],
      });
      setPanelsLoaded(true);
    });
    return () => { alive = false; };
  }, []);

  const ind = snap?.indicators;
  const scoreTone: Tone = snap ? (snap.score >= (ind?.weighted_score_estimate?.threshold ?? 88) ? 'emerald' : 'amber') : 'slate';
  const eligTone: Tone = snap ? (ELIG_TONE[snap.eligibility] ?? 'slate') : 'slate';
  const blocking = ind?.conditional_eligibility_estimate?.blocking_gaps ?? [];

  // ---- Derived panel data (all defensive; every source may be null) --------
  const nowMs = Date.now();
  const p = panels;

  // 1. Top blockers: snapshot's non-POA&M-eligible gaps + heaviest open gaps.
  const openGapsAll = (p.controls?.controls ?? []).filter(
    (c: any) => c.state && c.state !== 'implemented' && c.state !== 'not_applicable',
  );
  const topGaps = openGapsAll
    .filter((c: any) => !blocking.includes(c.controlId))
    .sort((a: any, b: any) => (b.weight ?? 0) - (a.weight ?? 0))
    .slice(0, 4);

  // 2. Deadlines: open POA&M due dates + open task due dates, soonest first.
  const deadlines: Array<{ label: string; due: string; href: string }> = [];
  for (const it of p.poam?.items ?? []) {
    if ((it.status === 'open' || it.status === 'in_progress') && it.due_at) {
      deadlines.push({ label: `POA&M · ${it.control_id}`, due: it.due_at, href: '/app/launchpad/readiness/poam' });
    }
  }
  for (const t of p.tasks?.tasks ?? []) {
    if ((t.status === 'open' || t.status === 'in_progress') && t.due_at) {
      deadlines.push({ label: t.title, due: t.due_at, href: '/app/launchpad/tasks' });
    }
  }
  deadlines.sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());

  // 3. Opportunities.
  const opps = p.radar?.opportunities ?? [];

  // 4. Proposal pipeline.
  const workspaces = p.proposals?.workspaces ?? [];
  const wsByStatus: Record<string, number> = {};
  for (const w of workspaces) {
    const s = String(w.status ?? 'unknown');
    wsByStatus[s] = (wsByStatus[s] ?? 0) + 1;
  }

  // 5. Registrations: green/amber/red by renewal_at.
  const regs = p.registrations?.records ?? [];
  const regTone = (r: any): { tone: Tone; label: string } => {
    if (!r.renewal_at) return { tone: 'slate', label: 'no renewal date' };
    const days = Math.ceil((new Date(r.renewal_at).getTime() - nowMs) / DAY_MS);
    if (days < 0) return { tone: 'red', label: 'renewal overdue' };
    if (days <= 60) return { tone: 'amber', label: `renews in ${days}d` };
    return { tone: 'emerald', label: `renews ${fmtDate(r.renewal_at)}` };
  };

  // 6. Origin Graph.
  const bomSummary = p.bom?.summary ?? null;

  // 7. Local agent.
  const devices = p.devices?.devices ?? [];

  // 8. Training + Tier-1.
  const assignments = p.training?.assignments ?? [];
  const trainingDone = assignments.filter((a: any) => a.completed_at || a.status === 'completed').length;
  const tier1Records = p.tier1?.records ?? [];
  const tier1Done = tier1Records.filter((r: any) => r.completed_at || r.status === 'completed' || r.status === 'complete').length;
  const soonestExpiry = [...assignments, ...tier1Records]
    .map((x: any) => x.expires_at)
    .filter((s: any) => typeof s === 'string' && new Date(s).getTime() > nowMs)
    .sort((a: string, b: string) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null;

  // 9. Evidence freshness: fresh (<180d), aging, stale (past valid_through).
  const evRecords = p.evidence?.records ?? [];
  let evFresh = 0; let evAging = 0; let evStale = 0;
  for (const r of evRecords) {
    const vt = r.valid_through ? new Date(r.valid_through).getTime() : null;
    if (vt != null && vt < nowMs) { evStale++; continue; }
    const base = new Date(r.captured_at || r.created_at).getTime();
    if (nowMs - base < EVIDENCE_FRESH_DAYS * DAY_MS) evFresh++; else evAging++;
  }

  // 11. AI usage: cost ledger + custody, credits from entitlements.
  const ledger = p.aiConnections?.costLedger ?? p.aiLedger?.entries ?? [];
  const managedCredits = p.aiLedger?.managedCreditsCharged ?? null;
  const byoCalls = p.aiLedger?.byoCalls ?? null;
  const aiConnCount = (p.aiConnections?.connections ?? []).length;
  const custody = p.aiConnections?.custody ?? null;
  const kmsInfo = p.aiConnections?.kms ?? null;
  const custodyPending = custody != null
    ? custody !== 'ready'
    : kmsInfo != null ? !(kmsInfo.ready || kmsInfo.configured || kmsInfo.status === 'ready') : false;

  // 12. Partner Mesh.
  const activeConsents = (p.mesh?.consents ?? []).filter((c: any) => !c.revoked_at).length;

  return (
    <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        title={info?.tenant?.name ? `${info.tenant.name}` : 'Readiness workspace'}
        description="Four independent indicators, side by side — because an implementation count is never, by itself, a compliance status."
        icon={ShieldCheck}
        actions={
          <>
            <AppTourButton />
            <GlassButton href="/app/launchpad/readiness/score"
              >
              <Calculator className="h-4 w-4 text-current" /> Score
            </GlassButton>
          </>
        }
      />

      {/* What is this / why it matters / next step — the workbook opener */}
      <Card className="p-5 mb-4">
        <div className="grid md:grid-cols-3 gap-4 text-xs leading-relaxed">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">What is this?</div>
            <p className="text-muted-foreground">
              Your readiness cockpit — every Launchpad module summarized on one screen.
              <span className="text-foreground font-medium"> Readiness</span> means being able to show, with records,
              that your company can hold government work.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">Why it matters</div>
            <p className="text-muted-foreground">
              Defense buyers check your registrations (<span className="text-foreground font-medium">SAM.gov</span> — the
              government&apos;s free vendor registry), your self-assessment score (reported to
              <span className="text-foreground font-medium"> SPRS</span>, the DoD&apos;s supplier-risk database), and your
              ability to deliver. Each panel below tracks one of those threads.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">Your next step</div>
            <p className="text-muted-foreground">
              New to government work? Take the tour, then follow the walkthroughs below. Already underway?
              <span className="text-foreground font-medium"> Top blockers</span> and
              <span className="text-foreground font-medium"> Upcoming deadlines</span> are your daily to-do list.
            </p>
          </div>
        </div>
      </Card>

      {/* Getting started — the three walkthroughs */}
      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        {[
          { title: 'Walkthrough 1 · Get registered', detail: 'SAM.gov, your CAGE code, and the accounts every contractor needs first.' },
          { title: 'Walkthrough 2 · Assess & score', detail: 'Work the 110 requirements and compute your first weighted score.' },
          { title: 'Walkthrough 3 · Find & bid', detail: 'From an opportunity match to a submitted proposal — step by step.' },
        ].map((w) => (
          <Link key={w.title} href="/app/launchpad/learn/walkthroughs"
            className="group rounded-xl border border-border/70 bg-card/40 hover:border-emerald-500/40 hover:bg-card/70 transition-colors p-3 flex items-start gap-2.5">
            <Compass className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-xs font-medium flex items-center gap-1.5">
                {w.title}
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-current shrink-0" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{w.detail}</p>
            </div>
          </Link>
        ))}
      </div>

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
            <div className="myco-glass-tile h-9 w-9 shrink-0">
              <s.icon className="h-4.5 w-4.5 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium flex items-center gap-1.5 text-sm">
                {s.title}
                <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-current" />
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">{s.detail}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ---- The 12-panel cockpit ------------------------------------------ */}
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Cockpit — every module at a glance</h2>
      {!panelsLoaded ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Loader2 className="h-4 w-4 animate-spin text-current" /> Checking each module…
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mb-8">

          {/* 1. Top blockers */}
          <Panel icon={ShieldAlert} title="Top blockers" href="/app/launchpad/readiness/score">
            {!snap ? (
              <PanelEmpty text="No score snapshot yet — blockers appear once you compute one."
                href="/app/launchpad/readiness/score" linkLabel="Compute a score" />
            ) : blocking.length === 0 && topGaps.length === 0 ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                No open gaps in your latest snapshot. A <span className="text-foreground font-medium">gap</span> is a
                requirement assessed as partial or not met.
              </p>
            ) : (
              <div className="space-y-2">
                {blocking.length > 0 && (
                  <div>
                    <div className="text-[11px] font-medium text-red-500 mb-1">
                      Can&apos;t sit on a POA&amp;M (a Plan of Action &amp; Milestones — your government-recognized fix-by list); these must be met first:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {blocking.slice(0, 6).map((g) => (
                        <code key={g} className="text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border">{g}</code>
                      ))}
                    </div>
                  </div>
                )}
                {topGaps.map((g: any) => (
                  <div key={g.controlId} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate min-w-0">
                      <code className="text-[10px]">{g.controlId}</code>{' '}
                      <span className="text-muted-foreground">{g.title}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-amber-500 font-medium">−{g.weight} pt{g.weight === 1 ? '' : 's'}</span>
                  </div>
                ))}
                {p.controls == null && (
                  <p className="text-[11px] text-muted-foreground italic">Per-requirement weights unavailable right now — showing snapshot blockers only.</p>
                )}
              </div>
            )}
          </Panel>

          {/* 2. Upcoming deadlines */}
          <Panel icon={CalendarClock} title="Upcoming deadlines" href="/app/launchpad/readiness/poam">
            {deadlines.length === 0 ? (
              <PanelEmpty text="Nothing due yet. POA&M items get a 180-day clock when a score computes; tasks you add with due dates appear here too."
                href="/app/launchpad/tasks" linkLabel="Add a task" />
            ) : (
              <div className="space-y-1.5">
                {deadlines.slice(0, 5).map((d, i) => {
                  const overdue = new Date(d.due).getTime() < nowMs;
                  return (
                    <Link key={`${d.label}-${d.due}-${i}`} href={d.href} className="flex items-center justify-between gap-2 text-xs hover:underline underline-offset-2">
                      <span className="truncate min-w-0">{d.label}</span>
                      <span className={`shrink-0 tabular-nums ${overdue ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
                        {overdue ? 'overdue · ' : ''}{fmtDate(d.due)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* 3. Opportunity matches */}
          <Panel icon={Radar} title="Opportunity matches" href="/app/launchpad/opportunities">
            {opps.length === 0 ? (
              <PanelEmpty text="Collectors aren't live yet — no official notices ingested, and Launchpad never shows sample awards."
                href="/app/launchpad/opportunities" linkLabel="Open Contract Radar" />
            ) : (
              <div className="space-y-1.5">
                <div className="text-2xl font-bold tabular-nums text-emerald-500">{opps.length}</div>
                {opps.slice(0, 3).map((o: any) => (
                  <div key={o.id} className="text-xs text-muted-foreground truncate">{o.title}</div>
                ))}
              </div>
            )}
          </Panel>

          {/* 4. Proposal pipeline */}
          <Panel icon={Send} title="Proposal pipeline" href="/app/launchpad/proposals">
            {workspaces.length === 0 ? (
              <PanelEmpty text="No proposal workspaces yet. A workspace bundles one bid's checklist, references, and portal steps."
                href="/app/launchpad/proposals" linkLabel="Start a workspace" />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(wsByStatus).map(([status, n]) => (
                  <span key={status} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-border/70 text-muted-foreground">
                    <span className="tabular-nums font-semibold text-foreground">{n}</span> {status.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}
          </Panel>

          {/* 5. Registration status */}
          <Panel icon={Landmark} title="Registration status" href="/app/launchpad/company/registrations">
            {regs.length === 0 ? (
              <PanelEmpty text="No registrations tracked yet. Start with SAM.gov — the government's free vendor registry, required before any award."
                href="/app/launchpad/company/registrations" linkLabel="Track registrations" />
            ) : (
              <div className="space-y-1.5">
                {regs.slice(0, 4).map((r: any) => {
                  const t = regTone(r);
                  return (
                    <div key={r.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate min-w-0">
                        {r.portal || r.record_type}
                        {r.identifier ? <span className="text-muted-foreground"> · {r.identifier}</span> : null}
                      </span>
                      <StateBadge tone={t.tone}>{t.label}</StateBadge>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* 6. Origin Graph alerts */}
          <Panel icon={PackageSearch} title="Origin Graph alerts" href="/app/launchpad/origin-graph">
            {!bomSummary ? (
              <PanelEmpty text="No bill of materials indexed yet. Origin Graph maps where your parts come from and flags restricted sources."
                href="/app/launchpad/origin-graph" linkLabel="Open Origin Graph" />
            ) : (
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Flagged parts</span>
                  <span className={`tabular-nums font-semibold ${(bomSummary.flaggedCount ?? 0) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {bomSummary.flaggedCount ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Domestic share</span>
                  <span className="tabular-nums font-medium">{typeof bomSummary.domesticPct === 'number' ? `${Math.round(bomSummary.domesticPct)}%` : '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Parts indexed</span>
                  <span className="tabular-nums font-medium">{bomSummary.totalParts ?? 0}</span>
                </div>
              </div>
            )}
          </Panel>

          {/* 7. Local Agent status */}
          <Panel icon={HardDrive} title="Local Agent" href="/app/launchpad/local-agent">
            {devices.length === 0 ? (
              <PanelEmpty text="No devices enrolled — the local agent binary is in development. When it ships, read-only device check-ins appear here (never file contents)."
                href="/app/launchpad/local-agent" linkLabel="About the agent" />
            ) : (
              <div className="space-y-1.5">
                <div className="text-2xl font-bold tabular-nums text-emerald-500">{devices.length}<span className="text-sm font-normal text-muted-foreground"> device{devices.length === 1 ? '' : 's'}</span></div>
                {devices.slice(0, 3).map((d: any, i: number) => (
                  <div key={d.id ?? i} className="text-xs text-muted-foreground truncate">{d.name || d.hostname || d.id}</div>
                ))}
              </div>
            )}
          </Panel>

          {/* 8. Training & Tier-1 */}
          <Panel icon={GraduationCap} title="Training & Tier-1" href="/app/launchpad/training">
            {p.training == null && p.tier1 == null ? (
              <PanelEmpty text="Not set up yet. Assign security-awareness training and track Tier-1 basics — the everyday hygiene records (MFA, screening, media handling)."
                href="/app/launchpad/training" linkLabel="Open training" />
            ) : (
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Training complete</span>
                  <span className="tabular-nums font-medium">{trainingDone}/{assignments.length}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Tier-1 records complete</span>
                  <span className="tabular-nums font-medium">{tier1Done}/{tier1Records.length}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Soonest expiry</span>
                  <span className="tabular-nums font-medium">{soonestExpiry ? fmtDate(soonestExpiry) : '—'}</span>
                </div>
                <Link href="/app/launchpad/readiness/tier1" className="inline-block text-emerald-600 dark:text-emerald-400 underline underline-offset-2">Tier-1 tracker</Link>
              </div>
            )}
          </Panel>

          {/* 9. Evidence freshness */}
          <Panel icon={FolderLock} title="Evidence freshness" href="/app/launchpad/evidence">
            {evRecords.length === 0 ? (
              <PanelEmpty text="Nothing indexed yet. Evidence records are references + hashes — the files never leave your systems."
                href="/app/launchpad/evidence" linkLabel="Index evidence" />
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  <StateBadge tone="emerald">{evFresh} fresh</StateBadge>
                  <StateBadge tone="amber">{evAging} aging</StateBadge>
                  <StateBadge tone="red">{evStale} stale</StateBadge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Fresh = captured within {EVIDENCE_FRESH_DAYS} days · stale = past its valid-through date.
                </p>
              </div>
            )}
          </Panel>

          {/* 10. Regulatory snapshot (static reference — not tenant state) */}
          <Panel icon={Scale} title="Regulatory snapshot" href="/app/launchpad/learn/glossary">
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{REGULATORY.rulePack}</span>
                <span className="tabular-nums font-medium">{REGULATORY.requirements} requirements</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {REGULATORY.status}. &quot;Phases&quot; are DoD&apos;s rollout schedule for requiring CMMC in new contracts.
              </p>
              <Link href="/app/launchpad/learn/glossary" className="inline-block text-emerald-600 dark:text-emerald-400 underline underline-offset-2">
                Glossary — every term defined
              </Link>
            </div>
          </Panel>

          {/* 11. AI usage */}
          <Panel icon={Bot} title="AI usage & credits" href="/app/launchpad/settings/integrations">
            {p.aiConnections == null && p.aiLedger == null ? (
              <PanelEmpty text="AI connections aren't set up yet. Bring your own provider key, or use managed credits."
                href="/app/launchpad/settings/integrations" linkLabel="Set up AI" />
            ) : (
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Credits remaining</span>
                  <span className="tabular-nums font-medium">
                    {ent.creditBalance ?? '—'}{ent.entitlements?.aiCreditsMonthly ? <span className="text-muted-foreground font-normal"> / {ent.entitlements.aiCreditsMonthly} mo</span> : null}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Actions recorded</span>
                  <span className="tabular-nums font-medium">{ledger.length}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Managed credits used</span>
                  <span className="tabular-nums font-medium">{managedCredits ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">BYO-key calls</span>
                  <span className="tabular-nums font-medium">{byoCalls ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Connections</span>
                  <span className="tabular-nums font-medium">{aiConnCount}{custodyPending ? <span className="text-amber-500 font-normal"> · key custody: KMS pending</span> : null}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">Bring-your-own-key actions never consume credits.</p>
              </div>
            )}
          </Panel>

          {/* 12. Partner Mesh */}
          <Panel icon={Handshake} title="Partner Mesh" href="/app/launchpad/partner-mesh">
            {p.mesh == null ? (
              <PanelEmpty text="Opt-in only — Partner Mesh is off, and no data leaves your workspace until you grant a scoped consent (or your plan adds the feature)."
                href="/app/launchpad/partner-mesh" linkLabel="About Partner Mesh" />
            ) : (
              <div className="space-y-2 text-xs">
                <StateBadge tone={activeConsents > 0 ? 'emerald' : 'slate'}>
                  {activeConsents > 0 ? `${activeConsents} active consent${activeConsents === 1 ? '' : 's'}` : 'no active consents'}
                </StateBadge>
                <p className="text-muted-foreground leading-relaxed">
                  Opt-in only: nothing is shared without an affirmative, scoped, revocable consent — and you can see
                  exactly which fields each consent covers.
                </p>
              </div>
            )}
          </Panel>
        </div>
      )}

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
