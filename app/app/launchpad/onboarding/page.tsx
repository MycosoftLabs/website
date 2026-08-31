'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CircleHelp, Footprints, Loader2, Rocket, ShieldCheck, Target } from 'lucide-react';
import { BLOCKED_DATA_CLASSES } from '@/lib/launchpad/constants';
import { Card } from '@/components/launchpad/ui';
import { LiquidCheckbox } from '@/components/launchpad/liquid';
import { GlassButton } from '@/components/ui/glass-button';

/**
 * Tenant onboarding: name the company, accept the four policy documents,
 * create the workspace. Creation is atomic server-side (tenant + owner
 * membership + genesis audit event via the launchpad_create_tenant RPC).
 */

const DOCS: Array<{ key: string; label: string; href: string }> = [
  { key: 'terms', label: 'Terms of Service', href: '/fusarium/launchpad/legal/terms' },
  { key: 'privacy', label: 'Privacy Notice', href: '/fusarium/launchpad/legal/privacy' },
  { key: 'aup', label: 'Acceptable Use & Anti-Fabrication Policy', href: '/fusarium/launchpad/legal/aup' },
  { key: 'non_cui_policy', label: 'Non-CUI Data Policy', href: '/fusarium/launchpad/trust' },
];

export default function OnboardingPage() {
  const [companyName, setCompanyName] = useState('');
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [state, setState] = useState<'idle' | 'sending'>('idle');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const toggle = (key: string) =>
    setAccepted((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  const allAccepted = DOCS.every((d) => accepted.has(d.key));
  const canSubmit = companyName.trim().length >= 2 && allAccepted && state === 'idle';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setState('sending');
    setError(null);
    try {
      const r = await fetch('/api/fusarium/launchpad/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: companyName.trim(), accepted: [...accepted] }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d?.error || 'Could not create workspace');
        setState('idle');
        return;
      }
      router.replace('/app/launchpad/dashboard');
    } catch {
      setError('Network error — please try again');
      setState('idle');
    }
  };

  return (
    <div className="container max-w-xl mx-auto px-4 py-14">
      <div className="text-center mb-8">
        <div className="myco-glass-tile p-3 w-fit mx-auto mb-4">
          <Rocket className="h-7 w-7 text-emerald-500" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Create your Launchpad workspace</h1>
        <p className="text-muted-foreground">
          One workspace per company. You will be its owner and can invite your team afterward.
        </p>
      </div>

      {/* Education-first intro */}
      <Card className="p-5 mb-6">
        <div className="space-y-4 text-sm">
          <div className="flex items-start gap-2.5">
            <CircleHelp className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">What is this?</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A private workspace where your company tracks its compliance-readiness work —
                self-assessments, training records, and references to evidence that stays in your
                own systems.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Target className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">Why it matters</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Every material action you record here lands in an append-only, hash-chained audit
                trail — starting with the genesis event created the moment this workspace exists —
                so what you tracked, and when, stays checkable later.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Footprints className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">Your next step</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Enter your company&apos;s legal name, read and accept the four policies below, and
                create the workspace. You become its owner and can invite teammates afterward.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <form onSubmit={submit} className="space-y-6">
        <Card className="p-5">
          <label className="text-sm font-medium block mb-1.5">Company legal name</label>
          <input
            required
            minLength={2}
            maxLength={120}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="myco-glass-field w-full rounded-lg border border-border px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            placeholder="Acme Robotics, Inc."
          />
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-semibold mb-3">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Policy acceptance
          </div>
          <div className="space-y-2.5">
            {DOCS.map((d) => (
              <LiquidCheckbox
                key={d.key}
                checked={accepted.has(d.key)}
                onChange={() => toggle(d.key)}
                label={
                  <>
                    I accept the{' '}
                    <Link
                      href={d.href}
                      target="_blank"
                      className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2"
                    >
                      {d.label}
                    </Link>
                  </>
                }
              />
            ))}
          </div>
        </Card>

        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">This is a non-CUI workspace.</span> Never
          upload: {BLOCKED_DATA_CLASSES.slice(0, 4).join('; ')}; or any other protected content.
          Evidence lives in your systems — Launchpad stores references, metadata, and hashes.
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <GlassButton type="submit" disabled={!canSubmit} className="w-full">
          {state === 'sending' ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-current" /> Creating workspace…
            </>
          ) : (
            'Create workspace'
          )}
        </GlassButton>
      </form>
    </div>
  );
}
