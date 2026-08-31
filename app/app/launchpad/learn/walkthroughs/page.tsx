'use client';

/**
 * Walkthrough index — three workbook wizards with step counts and a
 * resume-at-step read from browser localStorage. Static education content;
 * no tenant data is fetched here.
 */

import { useEffect, useState } from 'react';
import { ClipboardCheck, Footprints, Rocket, Vault } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { GlassButton } from '@/components/ui/glass-button';
import { Card, PageHeader } from '@/components/launchpad/ui';
import { WALKTHROUGHS } from '@/lib/launchpad/walkthroughs';
import { readWalkthroughProgress, type WalkthroughProgress } from '@/components/launchpad/walkthrough';

const ICONS: Record<string, LucideIcon> = {
  'become-a-defense-contractor': Rocket,
  'cmmc-l2-self-assessment': ClipboardCheck,
  'stand-up-your-enclave': Vault,
};

export default function WalkthroughsIndexPage() {
  // Progress reads localStorage, so it happens after mount — until then the
  // cards render without resume info (no hydration mismatch, no fake state).
  const [progress, setProgress] = useState<Record<string, WalkthroughProgress> | null>(null);

  useEffect(() => {
    const map: Record<string, WalkthroughProgress> = {};
    for (const w of WALKTHROUGHS) map[w.id] = readWalkthroughProgress(w.id);
    setProgress(map);
  }, []);

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <PageHeader
        icon={Footprints}
        title="Guided walkthroughs"
        description="Workbook-style wizards that take you through a whole process one step at a time — with the exact clicks, the official sites, and the jargon decoded."
      />

      {/* Education-first intro */}
      <Card className="p-5 mb-6">
        <div className="grid sm:grid-cols-3 gap-5">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">What is this</div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Three step-by-step playbooks for the journeys every new contractor faces: getting registered,
              running a Level 2 self-assessment, and standing up a protected environment for CUI.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">Why it matters</div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Government work fails on sequence and vocabulary, not intelligence. Each walkthrough puts the steps
              in the right order and defines every term the first time it appears.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">Your next step</div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              New to government work entirely? Start with “Become a defense contractor”. Progress saves in this
              browser as you mark steps done, so you can leave and resume any time.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        {WALKTHROUGHS.map((w) => {
          const Icon = ICONS[w.id] ?? Footprints;
          const p = progress?.[w.id];
          const doneCount = p ? w.steps.filter((s) => p.done.includes(s.id)).length : 0;
          const started = !!p && (p.step > 0 || p.done.length > 0);
          const resumeStep = p ? Math.min(p.step, w.steps.length - 1) + 1 : 1;
          return (
            <Card key={w.id} className="p-5 flex flex-col">
              <div className="myco-glass-tile h-10 w-10 mb-3">
                <Icon className="h-5 w-5 text-emerald-500" />
              </div>
              <h2 className="text-base font-bold tracking-tight">{w.title}</h2>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed flex-1">{w.tagline}</p>

              <div className="mt-4 text-xs text-muted-foreground tabular-nums">
                {w.steps.length} steps
                {progress !== null && (
                  <>
                    <span className="mx-1.5">·</span>
                    {doneCount} of {w.steps.length} marked done
                  </>
                )}
              </div>
              {progress !== null && doneCount > 0 && (
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-emerald-500/80"
                    style={{ width: `${Math.max(0, Math.min(100, (doneCount / w.steps.length) * 100))}%` }}
                  />
                </div>
              )}

              <div className="mt-4">
                <GlassButton href={`/app/launchpad/learn/walkthroughs/${w.id}`}
                  dataAnalytics={`launchpad-walkthrough-open-${w.id}`}>
                  {started ? `Resume at step ${resumeStep}` : 'Start walkthrough'}
                </GlassButton>
              </div>
            </Card>
          );
        })}
      </div>

      <p className="mt-6 text-[11px] text-muted-foreground">
        Walkthroughs are education, not legal or compliance advice — and nothing here marks a requirement met for
        you. Progress is saved in this browser only for now.
      </p>
    </div>
  );
}
