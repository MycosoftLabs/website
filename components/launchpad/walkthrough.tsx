'use client';

/**
 * FUSARIUM Launchpad — the workbook wizard framework.
 *
 * Renders a WalkthroughDef one step at a time, PowerPoint style: progress
 * dots + step counter up top, Back/Next GlassButtons below, and a per-step
 * "done" LiquidCheckbox. Each step body is a fixed workbook structure —
 * what you're doing, why it matters, exactly what to click, an optional
 * official external link, and jargon decoded inline (terms link to the
 * glossary).
 *
 * Progress (current step + done step ids) persists to localStorage under
 * `launchpad-walkthrough-<id>` — browser-local only for now; server
 * persistence comes later. The step transition is a small fade/slide via a
 * component-scoped keyframe that no-ops under prefers-reduced-motion.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, BookOpen, CircleHelp, ExternalLink, Flag,
  MousePointerClick, SpellCheck2,
} from 'lucide-react';
import { GlassButton } from '@/components/ui/glass-button';
import { LiquidCheckbox } from '@/components/launchpad/liquid';
import { Card } from '@/components/launchpad/ui';
import type { WalkthroughDef, WalkthroughLink } from '@/lib/launchpad/walkthroughs/types';

// ---------------------------------------------------------------------------
// Browser-local progress. One key per walkthrough; shape is forgiving so a
// future server-synced format can supersede it without breaking old keys.
// ---------------------------------------------------------------------------
export interface WalkthroughProgress {
  /** Index of the step the user was last on. */
  step: number;
  /** Ids of steps marked done. */
  done: string[];
}

export function walkthroughStorageKey(id: string): string {
  return `launchpad-walkthrough-${id}`;
}

/** Safe read — returns a fresh zero-progress object on any parse problem. */
export function readWalkthroughProgress(id: string): WalkthroughProgress {
  if (typeof window === 'undefined') return { step: 0, done: [] };
  try {
    const raw = window.localStorage.getItem(walkthroughStorageKey(id));
    if (!raw) return { step: 0, done: [] };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const step = typeof parsed.step === 'number' && parsed.step >= 0 ? Math.floor(parsed.step) : 0;
    const done = Array.isArray(parsed.done)
      ? (parsed.done as unknown[]).filter((x): x is string => typeof x === 'string')
      : [];
    return { step, done };
  } catch {
    return { step: 0, done: [] };
  }
}

function writeWalkthroughProgress(id: string, progress: WalkthroughProgress) {
  try {
    window.localStorage.setItem(walkthroughStorageKey(id), JSON.stringify(progress));
  } catch {
    /* storage unavailable (private mode) — the session still works, unsaved */
  }
}

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------
function StepLink({ link }: { link: WalkthroughLink }) {
  const cls =
    'inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 underline underline-offset-2';
  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className={cls}>
        {link.label} <ExternalLink className="h-3 w-3 shrink-0" />
      </a>
    );
  }
  return (
    <Link href={link.href} className={cls}>
      {link.label}
    </Link>
  );
}

function SectionLabel({ icon: Icon, children }: { icon: typeof BookOpen; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
      <Icon className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The wizard
// ---------------------------------------------------------------------------
export function Walkthrough({ walkthrough }: { walkthrough: WalkthroughDef }) {
  const { steps } = walkthrough;
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Resume from localStorage after mount (SSR-safe).
  useEffect(() => {
    const p = readWalkthroughProgress(walkthrough.id);
    setIndex(Math.min(p.step, steps.length - 1));
    setDone(p.done);
    setHydrated(true);
  }, [walkthrough.id, steps.length]);

  // Persist on every change — but never before the initial read, or a fresh
  // mount would clobber saved progress with zeros.
  useEffect(() => {
    if (!hydrated) return;
    writeWalkthroughProgress(walkthrough.id, { step: index, done });
  }, [walkthrough.id, index, done, hydrated]);

  const step = steps[index];
  const isLast = index === steps.length - 1;
  const stepDone = done.includes(step.id);
  const doneCount = steps.filter((s) => done.includes(s.id)).length;

  const setStepDone = (checked: boolean) => {
    setDone((d) => (checked ? (d.includes(step.id) ? d : [...d, step.id]) : d.filter((x) => x !== step.id)));
  };

  return (
    <Card className="p-6">
      {/* Component-scoped transition; no-op under reduced motion. */}
      <style>{`
        @keyframes lp-wt-step-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .lp-wt-step-anim { animation: lp-wt-step-in 260ms cubic-bezier(0.25, 1, 0.5, 1) both; }
        @media (prefers-reduced-motion: reduce) { .lp-wt-step-anim { animation: none; } }
      `}</style>

      {/* Progress dots + counter */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Walkthrough steps">
          {steps.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to step ${i + 1}: ${s.title}`}
              aria-current={i === index ? 'step' : undefined}
              title={`${i + 1}. ${s.title}`}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                i === index
                  ? 'bg-emerald-500 ring-2 ring-emerald-500/30'
                  : done.includes(s.id)
                    ? 'bg-emerald-500/50 hover:bg-emerald-500/70'
                    : 'bg-muted-foreground/25 hover:bg-muted-foreground/50'
              }`}
            />
          ))}
        </div>
        <div className="text-xs text-muted-foreground tabular-nums">
          Step <span className="font-semibold text-foreground">{index + 1}</span> of {steps.length}
          <span className="mx-1.5">·</span>
          {doneCount} marked done
        </div>
      </div>

      {/* One step at a time — keyed so the enter animation re-runs per step. */}
      <div key={step.id} className="lp-wt-step-anim">
        <h2 className="text-lg font-bold tracking-tight mb-4">{step.title}</h2>

        <div className="space-y-5">
          <div>
            <SectionLabel icon={BookOpen}>What you&rsquo;re doing</SectionLabel>
            <p className="text-sm leading-relaxed">{step.what}</p>
          </div>

          <div>
            <SectionLabel icon={CircleHelp}>Why it matters</SectionLabel>
            <p className="text-sm leading-relaxed text-muted-foreground">{step.why}</p>
          </div>

          <div>
            <SectionLabel icon={MousePointerClick}>Exactly what to click</SectionLabel>
            <ol className="space-y-2.5">
              {step.actions.map((a, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full border border-border text-[11px] font-semibold tabular-nums flex items-center justify-center text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="text-sm leading-relaxed">
                    {a.text}
                    {a.link && (
                      <>
                        {' '}
                        <StepLink link={a.link} />
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {step.official && (
            <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 px-3 py-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400 mb-1">
                Official reference
              </div>
              <StepLink link={step.official} />
            </div>
          )}

          {step.terms && step.terms.length > 0 && (
            <div>
              <SectionLabel icon={SpellCheck2}>Jargon decoded</SectionLabel>
              <dl className="space-y-1.5">
                {step.terms.map((t) => (
                  <div key={t.term} className="text-sm leading-relaxed">
                    <dt className="inline font-semibold">
                      <Link
                        href="/app/launchpad/learn/glossary"
                        className="underline decoration-dotted underline-offset-2 hover:text-emerald-600 dark:hover:text-emerald-400"
                      >
                        {t.term}
                      </Link>
                    </dt>
                    <dd className="inline text-muted-foreground"> — {t.definition}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* Footer: Back · done checkbox · Next */}
      <div className="mt-6 pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
        <GlassButton onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}
          dataAnalytics="launchpad-walkthrough-back">
          <ArrowLeft className="h-4 w-4 text-current mr-2" /> Back
        </GlassButton>

        <LiquidCheckbox
          key={step.id}
          checked={stepDone}
          onChange={setStepDone}
          label={<span className="text-sm">I did this step</span>}
        />

        {isLast ? (
          <GlassButton href="/app/launchpad/learn/walkthroughs" dataAnalytics="launchpad-walkthrough-finish">
            <Flag className="h-4 w-4 text-current mr-2" /> Finish
          </GlassButton>
        ) : (
          <GlassButton onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))}
            dataAnalytics="launchpad-walkthrough-next">
            Next <ArrowRight className="h-4 w-4 text-current ml-2" />
          </GlassButton>
        )}
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        Progress is saved in this browser only for now — server-side sync across devices is coming later.
      </p>
    </Card>
  );
}
