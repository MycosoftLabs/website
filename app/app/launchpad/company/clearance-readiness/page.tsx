'use client';

/**
 * Clearance readiness — education + checklist (GTM §19.4, DCSA-accurate).
 *
 * Hard truths stated plainly: individuals cannot self-apply for a personnel
 * clearance; a company cannot sponsor its own facility clearance; only the
 * government grants or denies. This page prepares you for the conversation
 * that starts the process — there is no application to fill out here.
 *
 * Checklist steps persist as launchpad_registration_records rows with
 * kind = 'clearance:<step-id>'; screening answers as
 * kind = 'clearance-screen:<q-id>' (status yes/no) via the registrations BFF.
 * A 'yes' renders a counsel-referral card — never an automated legal
 * conclusion.
 */

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Scale, ShieldCheck } from 'lucide-react';
import { PageHeader, Card } from '@/components/launchpad/ui';
import { CompanyTabs } from '@/components/launchpad/company-tabs';
import { LiquidCheckbox, LiquidRadio } from '@/components/launchpad/liquid';

const API = '/api/fusarium/launchpad/registrations';

interface RegistrationRecord {
  id: string;
  record_type: string;
  status: string;
}

const CHECKLIST: Array<{ id: string; title: string; body: string }> = [
  {
    id: 'corporate-records',
    title: 'Corporate records current',
    body: 'Formation documents, board records, and ownership records up to date — DCSA reviews these during facility clearance processing.',
  },
  {
    id: 'kmp-identified',
    title: 'KMP identified',
    body: 'Key Management Personnel — the senior officers, directors, and the FSO who must themselves be cleared as part of a facility clearance. Know who yours would be.',
  },
  {
    id: 'foci-questions',
    title: 'Citizenship / FOCI questions answered internally',
    body: 'You can state, for every owner, board member, and investor, whether foreign ownership, control, or influence exists. The screening questions below walk through it.',
  },
  {
    id: 'fso-training',
    title: 'FSO training path identified',
    body: 'The Facility Security Officer runs the security program day to day. DCSA’s CDSE (Center for Development of Security Excellence) provides the required FSO training at no cost — know who would take it.',
  },
  {
    id: 'sponsorship-path',
    title: 'Sponsorship path understood',
    body: 'You can name the government contracting activity or cleared prime contractor whose classified work would sponsor you — or you know you do not have one yet, which means clearance is not your next step.',
  },
];

const SCREENING: Array<{ id: string; question: string; detail: string }> = [
  {
    id: 'non-us-persons',
    question: 'Are any owners, board members, or key employees non-U.S. persons?',
    detail: 'A "U.S. person" here means a U.S. citizen or lawful permanent resident. Foreign nationals in ownership or control positions raise FOCI questions.',
  },
  {
    id: 'controlled-technical-data',
    question: 'Does your work involve export-controlled technical data (ITAR / EAR)?',
    detail: 'ITAR covers defense articles and services; EAR covers dual-use items. Technical data about them can be "exported" just by showing it to a foreign person — even inside the U.S.',
  },
  {
    id: 'foreign-investors',
    question: 'Do you have foreign investors or foreign sources of financing?',
    detail: 'Foreign investment — even a minority stake — is a core FOCI factor and can trigger CFIUS review for some technologies.',
  },
  {
    id: 'controlled-lists',
    question: 'Are your products or technology on a controlled list (USML or CCL)?',
    detail: 'The USML (United States Munitions List, ITAR) and CCL (Commerce Control List, EAR) define what is export-controlled. If you have never checked, the honest answer today is to find out.',
  },
  {
    id: 'foreign-suppliers',
    question: 'Do you rely on foreign suppliers for critical components?',
    detail: 'Foreign supply-chain dependencies matter for FOCI mitigation and for many DoD program eligibility rules.',
  },
];

export default function ClearanceReadinessPage() {
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
    } catch { setErr('Could not load clearance readiness'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const recordFor = (kind: string) => records.find((r) => r.record_type === kind);

  const save = async (kind: string, label: string, status: string) => {
    setBusy(kind); setErr(null);
    try {
      const existing = recordFor(kind);
      const r = existing
        ? await fetch(API, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: existing.id, status }),
          })
        : await fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recordType: kind, label, status }),
          });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d?.error || 'Could not save'); return; }
      await load();
    } finally { setBusy(null); }
  };

  const answerFor = (qId: string): 'yes' | 'no' | null => {
    const s = recordFor(`clearance-screen:${qId}`)?.status;
    return s === 'yes' || s === 'no' ? s : null;
  };
  const anyYes = SCREENING.some((q) => answerFor(q.id) === 'yes');
  const yesTopics = SCREENING.filter((q) => answerFor(q.id) === 'yes').map((q) => q.question);

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <CompanyTabs />
      <PageHeader
        title="Clearance readiness"
        icon={ShieldCheck}
        description="What security clearances actually are, how sponsorship really works, and whether your company is structurally ready — before anyone asks."
      />

      <Card tone="sky" className="p-5 mb-4">
        <div className="pl-1.5 grid gap-3 sm:grid-cols-3 text-sm">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">What is this</div>
            <p className="text-muted-foreground leading-relaxed">
              Education plus a readiness checklist. There is no clearance application to fill out here —
              this page prepares you for the conversation that starts one.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Why it matters</div>
            <p className="text-muted-foreground leading-relaxed">
              Founders waste months chasing clearances they cannot apply for. Understanding the real
              path — sponsorship by a government customer or cleared prime — saves that time and
              protects you from services that claim to sell clearances. No one can.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Your next step</div>
            <p className="text-muted-foreground leading-relaxed">
              Read the three cards below, then work the readiness checklist and answer the screening
              questions honestly.
            </p>
          </div>
        </div>
      </Card>

      <div className="space-y-4 mb-8">
        <Card className="p-5">
          <div className="pl-1.5">
            <h2 className="text-sm font-semibold mb-2">How sponsorship actually works</h2>
            <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground leading-relaxed">
              <li><span className="text-foreground font-medium">Individuals cannot self-apply</span> for a personnel security clearance. There is no form a person files on their own.</li>
              <li><span className="text-foreground font-medium">A company cannot sponsor its own facility clearance (FCL).</span> Sponsorship must come from a government contracting activity or a cleared prime contractor with a genuine, documented need for you to access classified information.</li>
              <li><span className="text-foreground font-medium">The government grants or denies</span> — DCSA (the Defense Counterintelligence and Security Agency) processes and adjudicates. No vendor, consultant, or platform can obtain or guarantee a clearance, including this one.</li>
              <li>The practical path: win unclassified work first, perform well, and let a classified need arise from a real program. The sponsor initiates the process.</li>
            </ul>
          </div>
        </Card>

        <Card className="p-5">
          <div className="pl-1.5">
            <h2 className="text-sm font-semibold mb-2">Personnel clearance levels, in plain language</h2>
            <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground leading-relaxed">
              <li><span className="text-foreground font-medium">Confidential / Secret / Top Secret</span> — the three levels, tiered by how much damage unauthorized disclosure could cause. <span className="text-foreground font-medium">TS/SCI</span> adds eligibility for Sensitive Compartmented Information — specific programs beyond Top Secret itself.</li>
              <li>Each level requires a <span className="text-foreground font-medium">background investigation</span>, then <span className="text-foreground font-medium">periodic reinvestigation</span> — increasingly replaced by <span className="text-foreground font-medium">continuous vetting</span>, where records are checked on an ongoing basis instead of every few years.</li>
              <li>The <span className="text-foreground font-medium">SF-86</span> is the personnel security questionnaire (filed through eQIP/NBIS) covering residence, employment, foreign contacts, and finances. <span className="text-foreground font-medium">It is never collected here</span> — Launchpad refuses SF-86 material by policy and by its data-boundary scanner. It goes only into the government&apos;s own system when a sponsor initiates your investigation.</li>
            </ul>
          </div>
        </Card>

        <Card className="p-5">
          <div className="pl-1.5">
            <h2 className="text-sm font-semibold mb-2">The facility clearance (FCL), in plain language</h2>
            <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground leading-relaxed">
              <li>An <span className="text-foreground font-medium">FCL</span> clears the <em>company</em> — its structure, ownership, and key people — so it may access classified information under the National Industrial Security Program.</li>
              <li><span className="text-foreground font-medium">KMP</span> (Key Management Personnel) — senior officers, certain directors, and the <span className="text-foreground font-medium">FSO</span> (Facility Security Officer) — must be cleared as part of it.</li>
              <li>The company signs the <span className="text-foreground font-medium">DD Form 441</span> (the DoD Security Agreement) and completes a <span className="text-foreground font-medium">FOCI review</span> — Foreign Ownership, Control, or Influence — via the SF-328. Significant FOCI must be mitigated before an FCL is granted.</li>
            </ul>
          </div>
        </Card>
      </div>

      {err && <p className="text-sm text-destructive mb-4">{err}</p>}

      {loading ? (
        <div className="min-h-[20vh] flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-current" /> Loading readiness…
        </div>
      ) : (
        <>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Readiness checklist</h2>
          <div className="space-y-3 mb-10">
            {CHECKLIST.map((item) => {
              const kind = `clearance:${item.id}`;
              const done = recordFor(kind)?.status === 'complete';
              return (
                <Card key={item.id} tone={done ? 'emerald' : undefined} className="p-4">
                  <div className="pl-1.5 flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <LiquidCheckbox
                        checked={done}
                        disabled={busy === kind}
                        onChange={(next) => save(kind, item.title, next ? 'complete' : 'pending')}
                        label={<span className="font-medium text-foreground">{item.title}</span>}
                      />
                      <p className="text-sm text-muted-foreground leading-relaxed mt-1.5">{item.body}</p>
                    </div>
                    {busy === kind && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0 mt-1" />}
                  </div>
                </Card>
              );
            })}
          </div>

          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-1">Export-control / FOCI screening</h2>
          <p className="text-sm text-muted-foreground mb-3 max-w-2xl">
            Five questions worth answering before any sponsor asks them. Answers are routing flags for a
            human conversation — Launchpad never turns them into a legal determination.
          </p>
          <div className="space-y-3 mb-6">
            {SCREENING.map((q) => {
              const kind = `clearance-screen:${q.id}`;
              const answer = answerFor(q.id);
              return (
                <Card key={q.id} tone={answer === 'yes' ? 'amber' : undefined} className="p-4">
                  <div className="pl-1.5 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{q.question}</p>
                      <p className="text-[13px] text-muted-foreground leading-relaxed mt-1">{q.detail}</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <LiquidRadio
                        name={kind}
                        value="yes"
                        checked={answer === 'yes'}
                        disabled={busy === kind}
                        onChange={() => save(kind, q.question, 'yes')}
                        label="Yes"
                      />
                      <LiquidRadio
                        name={kind}
                        value="no"
                        checked={answer === 'no'}
                        disabled={busy === kind}
                        onChange={() => save(kind, q.question, 'no')}
                        label="No"
                      />
                      {busy === kind && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {anyYes && (
            <Card tone="amber" className="p-5 mb-6">
              <div className="pl-1.5 flex items-start gap-2.5">
                <Scale className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Talk to qualified export-control / FOCI counsel</p>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                    You answered yes on: {yesTopics.map((t, i) => (
                      <span key={t}>{i > 0 && '; '}<span className="text-foreground">{t.replace(/\?$/, '')}</span></span>
                    ))}.
                    These topics have real legal consequences, and the right answer depends on facts a
                    checklist cannot capture. This card is a routing flag, not a legal conclusion —
                    Launchpad and its AI never classify your export-control or FOCI posture.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
