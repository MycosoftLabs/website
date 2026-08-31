'use client';

import { useCallback, useEffect, useState } from 'react';
import { Layers, Loader2, Info, BookOpen, TrendingUp } from 'lucide-react';
import { GlassButton } from '@/components/ui/glass-button';
import { PageHeader, Card, StatTile, SegmentBar, StateBadge, ThresholdMeter, type Tone } from '@/components/launchpad/ui';

/**
 * Closure Board — the tenant's own gaps sequenced into five waves.
 *
 * A wave is an ordered tranche of gap closure: cheapest paper controls first,
 * deepest architecture last. Everything is computed server-side from THIS
 * tenant's control register; every projection is labeled "projected if
 * closed — not achieved".
 */

interface OpenControl {
  controlId: string;
  title: string;
  family: string;
  weight: number | null;
  blocking: boolean;
  state: string | null;
  poamEligible: boolean;
}

interface WaveRow {
  wave: number;
  key: string;
  label: string;
  blurb: string;
  families: string[];
  totalControls: number;
  openCount: number;
  closedCount: number;
  wavePointsTotal: number;
  wavePointsClosed: number;
  pointsRecoverable: number;
  projectedScoreIfWaveClosed: number;
  projectedScoreCumulative: number;
  projectedEligibilityCumulative: string;
  openControls: OpenControl[];
}

interface CurrentPosture {
  score: number;
  maxScore: number;
  threshold: number;
  meetsThreshold: boolean;
  eligibility: string;
  reason: string;
  implementedCount: number;
  notMetCount: number;
  unassessedCount: number;
}

const ELIG_TONE: Record<string, Tone> = {
  'final-eligible': 'emerald',
  'conditional-eligible': 'sky',
  'not-eligible': 'amber',
};

export default function ClosureBoardPage() {
  const [current, setCurrent] = useState<CurrentPosture | null>(null);
  const [waves, setWaves] = useState<WaveRow[]>([]);
  const [rulePack, setRulePack] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/fusarium/launchpad/readiness/closure', { cache: 'no-store' });
      const d = await r.json();
      if (r.ok) { setCurrent(d.current); setWaves(d.waves ?? []); setRulePack(d.rulePackVersion ?? ''); setErr(null); }
      else setErr(d?.error || `HTTP ${r.status}`);
    } catch { setErr('Could not load the Closure Board'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin text-current" /> Loading Closure Board…
    </div>;
  }

  const totalOpen = waves.reduce((s, w) => s + w.openCount, 0);
  const scoreTone: Tone = current ? (current.score >= current.threshold ? 'emerald' : 'amber') : 'slate';

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        title="Closure Board"
        icon={Layers}
        description={<>Your open requirements sequenced into five waves — cheapest paper first, deepest architecture last. Computed from your own control register under rule pack <code className="text-xs px-1 rounded bg-muted">{rulePack || 'cmmc-l2-v2.13-r1'}</code>.</>}
        actions={<GlassButton onClick={load}>Recompute</GlassButton>}
      />

      {/* Education-first intro */}
      <Card className="p-5 mb-6">
        <div className="pl-1.5 grid sm:grid-cols-3 gap-5">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <BookOpen className="h-3.5 w-3.5" /> What is this
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A <strong className="text-foreground">gap</strong> is any of the 110 requirements you have not
              customer-marked implemented or not applicable — including ones you have not assessed yet.
              A <strong className="text-foreground">wave</strong> is an ordered batch of gaps to close together:
              wave 1 is mostly paperwork, wave 5 is real architecture.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Why it matters</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Each requirement carries a <strong className="text-foreground">weight</strong> (1, 3, or 5 points)
              deducted from 110 while it stays open. Closing waves in order recovers the most points for the least
              effort and shows exactly when your projected score would cross the 88-point conditional threshold.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Your next step</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Work wave 1 left to right: fix the underlying practice, index the evidence, then mark the requirement
              in the control register. The board recomputes from your register — nothing here closes on its own,
              and no AI ever marks a requirement for you.
            </p>
          </div>
        </div>
      </Card>

      {err && <Card tone="red" className="p-4 mb-5"><p className="text-sm pl-1.5">{err}</p></Card>}

      {current && (
        <>
          {/* Current posture */}
          <Card tone={scoreTone} className="p-5 mb-4">
            <div className="pl-1.5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Current weighted score estimate</div>
                  <div className={`text-4xl font-bold tabular-nums ${scoreTone === 'emerald' ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {current.score}<span className="text-xl font-normal text-muted-foreground">/{current.maxScore}</span>
                  </div>
                </div>
                <StateBadge tone={ELIG_TONE[current.eligibility] ?? 'slate'}>
                  {current.eligibility.replace(/-/g, ' ')} — estimate
                </StateBadge>
              </div>
              <ThresholdMeter value={current.score} max={current.maxScore} threshold={current.threshold} tone={scoreTone} />
              <p className="text-xs text-muted-foreground mt-3">{current.reason}</p>
            </div>
          </Card>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            <StatTile label="Open requirements" tone={totalOpen > 0 ? 'amber' : 'emerald'} value={totalOpen}
              sub="not customer-marked implemented / N-A — includes unassessed" />
            <StatTile label="Unassessed" tone={current.unassessedCount > 0 ? 'amber' : 'emerald'} value={current.unassessedCount}
              sub="no recorded state — counted as open, never as closed" />
            <StatTile label="Projected if all 5 waves close" tone="sky"
              value={waves.length > 0 ? waves[waves.length - 1].projectedScoreCumulative : current.score}
              sub="projected if closed — not achieved" />
          </div>
        </>
      )}

      {/* The five waves */}
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
        <TrendingUp className="h-3.5 w-3.5" /> Five closure waves
        <span className="font-normal normal-case tracking-normal text-[11px] text-muted-foreground/70">
          deterministic sequence · projections are estimates, not achievements
        </span>
      </h2>
      <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-3 mb-6">
        {waves.map((w) => {
          const done = w.openCount === 0;
          return (
            <Card key={w.wave} tone={done ? 'emerald' : 'amber'} className="p-4 flex flex-col">
              <div className="pl-1.5 flex flex-col flex-1 min-h-0">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Wave {w.wave}</div>
                <div className="text-sm font-semibold mt-0.5">{w.label}</div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {w.families.map((f) => (
                    <code key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-muted">{f}</code>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 leading-snug">{w.blurb}</p>

                {/* Points-recovered meter */}
                <div className="mt-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                    Points recovered in this wave
                  </div>
                  <SegmentBar
                    total={w.wavePointsTotal || 1}
                    segments={[
                      { tone: 'emerald', value: w.wavePointsClosed, label: 'recovered' },
                      { tone: 'amber', value: w.wavePointsTotal - w.wavePointsClosed, label: 'still open' },
                    ]}
                  />
                </div>

                <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                  <div className="flex justify-between gap-2">
                    <span>Recoverable now</span>
                    <span className="tabular-nums font-semibold text-foreground">+{w.pointsRecoverable} pts</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>If only this wave closes</span>
                    <span className="tabular-nums font-semibold text-foreground">{w.projectedScoreIfWaveClosed}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>Through wave {w.wave} (projected)</span>
                    <span className="tabular-nums font-semibold text-foreground">{w.projectedScoreCumulative}</span>
                  </div>
                </div>
                <div className="mt-2">
                  <StateBadge tone={ELIG_TONE[w.projectedEligibilityCumulative] ?? 'slate'}>
                    {w.projectedEligibilityCumulative.replace(/-/g, ' ')} — projected, not achieved
                  </StateBadge>
                </div>

                {/* Open controls */}
                <div className="mt-3 border-t border-border/50 pt-2 flex-1 min-h-0">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                    Open requirements ({w.openCount}/{w.totalControls})
                  </div>
                  {done ? (
                    <p className="text-[11px] text-muted-foreground italic">
                      No open requirements in this wave.
                    </p>
                  ) : (
                    <ul className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                      {w.openControls.map((c) => (
                        <li key={c.controlId} className="text-[11px] leading-snug">
                          <div className="flex items-center gap-1.5">
                            <code className="px-1 py-0.5 rounded bg-muted text-[10px]">{c.controlId}</code>
                            <span className="tabular-nums font-semibold shrink-0">
                              {c.blocking ? 'blocking' : `${c.weight} pt`}
                            </span>
                            {!c.poamEligible && !c.blocking && (
                              <span className="text-[9px] uppercase tracking-wide text-red-500 shrink-0">no POA&amp;M</span>
                            )}
                          </div>
                          <div className="text-muted-foreground truncate" title={c.title}>{c.title}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>
          Projections assume every open requirement in a wave is later customer-marked implemented — they are
          estimates of what your score <em>would</em> be, never a statement of what it <em>is</em>.
          &quot;blocking&quot; marks the SSP requirement (CA.L2-3.12.4), which carries no points but blocks
          eligibility while open. &quot;no POA&amp;M&quot; marks gaps that cannot be deferred to a
          POA&amp;M (Plan of Action &amp; Milestones) — each one blocks conditional status until closed.
        </span>
      </div>
    </div>
  );
}
