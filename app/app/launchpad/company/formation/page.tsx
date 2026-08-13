'use client';

/**
 * Formation — corporate formation workbook (GTM §19.1).
 *
 * Ordered steps, each persisted as a launchpad_registration_records row with
 * kind = 'formation:<step-id>' via the registrations BFF. Unchecked means no
 * row (or status 'pending') — there is no seeded progress; the state you see
 * is exactly what you recorded.
 */

import { useCallback, useEffect, useState } from 'react';
import { Building, Loader2, Scale } from 'lucide-react';
import { PageHeader, Card, SegmentBar } from '@/components/launchpad/ui';
import { CompanyTabs } from '@/components/launchpad/company-tabs';
import { LiquidCheckbox } from '@/components/launchpad/liquid';
import Link from 'next/link';

const API = '/api/fusarium/launchpad/registrations';

interface RegistrationRecord {
  id: string;
  record_type: string;
  status: string;
}

const STEPS: Array<{ id: string; title: string; body: React.ReactNode }> = [
  {
    id: 'counsel',
    title: 'Choose counsel or a formation service',
    body: <>A startup lawyer or an online formation service (Clerky is one commonly used example — named
      neutrally; Launchpad has no affiliation and receives no compensation from any provider) prepares
      the standard documents. Either path works; what matters is that the documents are the standard
      ones investors and agencies expect.</>,
  },
  {
    id: 'entity',
    title: 'Form the entity',
    body: <>File with your state: a certificate of incorporation (corporation) or articles of organization
      (LLC), plus bylaws or an operating agreement. You will also appoint a <span className="text-foreground">registered agent</span> —
      a person or service with a street address in the state that receives legal papers for the company.</>,
  },
  {
    id: 'ein',
    title: 'Get your EIN directly from the IRS — it is free',
    body: <>An <span className="text-foreground">EIN</span> (Employer Identification Number) is your company&apos;s federal tax ID.
      Apply directly at irs.gov at no cost — never pay a third-party site for one. Keep the EIN value in
      your own records; Launchpad does not store EINs and the API refuses values shaped like one.</>,
  },
  {
    id: 'bank',
    title: 'Open banking, accounting, and payroll',
    body: <>A business bank account in the company&apos;s name (you will need the formation documents and EIN),
      bookkeeping from day one, and payroll before the first hire. Clean books are a prerequisite for
      government cost proposals and audits later.</>,
  },
  {
    id: 'ip-assignment',
    title: 'Sign founder IP assignments and confidentiality agreements',
    body: <>Every founder signs an <span className="text-foreground">IP assignment</span> — a contract transferring the relevant
      inventions and work product to the company — plus a confidentiality agreement. Investors and
      government customers both check this; missing assignments are a classic diligence failure.</>,
  },
  {
    id: 'records',
    title: 'Keep board and stockholder records',
    body: <>Board consents, stockholder consents, meeting minutes, and a maintained cap table (the ledger of
      who owns what). Keep them current from the start — reconstructing records later is expensive.</>,
  },
  {
    id: 'insurance',
    title: 'Put insurance in place',
    body: <>General liability at minimum; add errors &amp; omissions and cyber coverage as your work requires.
      Many government contracts and facility leases require proof of specific coverage before work starts.</>,
  },
  {
    id: 'federal-registration',
    title: 'Start federal registration',
    body: <>With the entity, EIN, and bank account in place you are ready for the federal registration path:
      Login.gov, then SAM.gov, which issues your UEI. Work through it on the{' '}
      <Link href="/app/launchpad/company/registrations" className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2">Registrations tab</Link>.</>,
  },
];

export default function FormationPage() {
  const [records, setRecords] = useState<RegistrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(API, { cache: 'no-store' });
      const d = await r.json();
      if (r.ok) { setRecords(d.records ?? []); setErr(null); }
      else setErr(d?.error || `HTTP ${r.status}`);
    } catch { setErr('Could not load formation progress'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const recordFor = (stepId: string) =>
    records.find((r) => r.record_type === `formation:${stepId}`);
  const isDone = (stepId: string) => recordFor(stepId)?.status === 'complete';

  const toggle = async (stepId: string, title: string, next: boolean) => {
    setBusy(stepId); setErr(null);
    try {
      const existing = recordFor(stepId);
      const r = existing
        ? await fetch(API, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: existing.id, status: next ? 'complete' : 'pending' }),
          })
        : await fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recordType: `formation:${stepId}`, label: title, status: next ? 'complete' : 'pending' }),
          });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d?.error || 'Could not save step'); return; }
      await load();
    } finally { setBusy(null); }
  };

  const doneCount = STEPS.filter((s) => isDone(s.id)).length;

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8">
      <CompanyTabs />
      <PageHeader
        title="Formation"
        icon={Building}
        description="The corporate plumbing that has to exist before any government work: entity, tax ID, bank, IP, records, insurance."
      />

      <Card tone="sky" className="p-5 mb-4">
        <div className="pl-1.5 grid gap-3 sm:grid-cols-3 text-sm">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">What is this</div>
            <p className="text-muted-foreground leading-relaxed">
              An ordered workbook of the standard company-formation steps, from choosing counsel to
              starting federal registration. Check each step off as you complete it.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Why it matters</div>
            <p className="text-muted-foreground leading-relaxed">
              Every later stage — SAM.gov, proposals, audits, investment — assumes these basics exist.
              Doing them in order avoids rework: you cannot open the bank account without the EIN, or
              get the EIN without the entity.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Your next step</div>
            <p className="text-muted-foreground leading-relaxed">
              Start at the first unchecked step below. Each one explains the jargon and what done
              looks like.
            </p>
          </div>
        </div>
      </Card>

      <Card tone="amber" className="p-4 mb-6">
        <div className="pl-1.5 flex items-start gap-2.5">
          <Scale className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Launchpad is not your law firm, registered agent, or tax advisor.</span>{' '}
            This workbook is education and progress tracking. Formation decisions — entity type, state,
            equity — belong with qualified counsel and a tax professional.
          </p>
        </div>
      </Card>

      {err && <p className="text-sm text-destructive mb-4">{err}</p>}

      {loading ? (
        <div className="min-h-[20vh] flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-current" /> Loading progress…
        </div>
      ) : (
        <>
          <Card className="p-4 mb-6">
            <div className="pl-1.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Progress</span>
                <span className="text-sm font-semibold tabular-nums">{doneCount} / {STEPS.length} steps</span>
              </div>
              <SegmentBar
                total={STEPS.length}
                segments={[
                  { tone: 'emerald', value: doneCount, label: 'complete' },
                  { tone: 'slate', value: STEPS.length - doneCount, label: 'remaining' },
                ]}
              />
            </div>
          </Card>

          <ol className="space-y-3">
            {STEPS.map((step, i) => {
              const done = isDone(step.id);
              return (
                <li key={step.id}>
                  <Card tone={done ? 'emerald' : undefined} className="p-4">
                    <div className="pl-1.5 flex items-start gap-3">
                      <span className="text-xs font-semibold tabular-nums text-muted-foreground mt-1 w-5 shrink-0">{i + 1}.</span>
                      <div className="min-w-0 flex-1">
                        <LiquidCheckbox
                          checked={done}
                          disabled={busy === step.id}
                          onChange={(next) => toggle(step.id, step.title, next)}
                          label={<span className="font-medium text-foreground">{step.title}</span>}
                        />
                        <p className="text-sm text-muted-foreground leading-relaxed mt-1.5">{step.body}</p>
                      </div>
                      {busy === step.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0 mt-1" />}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}
