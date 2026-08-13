'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Rocket, ShieldCheck } from 'lucide-react';
import { BLOCKED_DATA_CLASSES } from '@/lib/launchpad/constants';
import { LiquidCheckbox } from '@/components/launchpad/liquid';

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
        <div className="p-3 rounded-xl bg-primary/10 w-fit mx-auto mb-4">
          <Rocket className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Create your Launchpad workspace</h1>
        <p className="text-muted-foreground">
          One workspace per company. You will be its owner and can invite your team afterward.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <div>
          <label className="text-sm font-medium block mb-1.5">Company legal name</label>
          <input
            required
            minLength={2}
            maxLength={120}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Acme Robotics, Inc."
          />
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold mb-3">
            <ShieldCheck className="h-4 w-4 text-primary" /> Policy acceptance
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
                    <Link href={d.href} target="_blank" className="text-primary underline underline-offset-2">
                      {d.label}
                    </Link>
                  </>
                }
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">This is a non-CUI workspace.</span> Never
          upload: {BLOCKED_DATA_CLASSES.slice(0, 4).join('; ')}; or any other protected content.
          Evidence lives in your systems — Launchpad stores references, metadata, and hashes.
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-lg bg-primary text-primary-foreground py-3 text-base font-medium disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          {state === 'sending' ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Creating workspace…
            </>
          ) : (
            'Create workspace'
          )}
        </button>
      </form>
    </div>
  );
}
