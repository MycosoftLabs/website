'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Crosshair, Loader2, Check, AlertTriangle } from 'lucide-react';
import { PageHeader, Card, StateBadge, type Tone } from '@/components/launchpad/ui';
import { LiquidRadio, LiquidCheckbox, LiquidSwitch } from '@/components/launchpad/liquid';
import { GlassButton } from '@/components/ui/glass-button';

/**
 * Scope questionnaire — a workbook, not an admin panel.
 *
 * Seven questions decide most of a small contractor's assessment cost before a
 * single control is touched. Every answer is an enum the BFF whitelists; the
 * "likely scope" summary is derived client-side from the same answers and is
 * labeled planning guidance — never an official scoping determination.
 * Persists to launchpad_company_profiles.data.scope via /readiness/scope.
 */

interface ScopeAnswers {
  expectsCui: string | null;
  cuiLocation: string | null;
  remoteEmployees: boolean;
  cloudServices: string[];
  systemAdmin: string | null;
  companySize: string | null;
  rolesSeparated: boolean;
}

const EMPTY: ScopeAnswers = {
  expectsCui: null,
  cuiLocation: null,
  remoteEmployees: false,
  cloudServices: [],
  systemAdmin: null,
  companySize: null,
  rolesSeparated: false,
};

const CLOUD_OPTIONS: Array<{ value: string; label: string; hint: string }> = [
  { value: 'email_collaboration', label: 'Email & collaboration', hint: 'Microsoft 365, Google Workspace' },
  { value: 'file_storage', label: 'File storage & sharing', hint: 'OneDrive, Drive, Dropbox, Box' },
  { value: 'identity_sso', label: 'Identity / SSO', hint: 'Entra ID, Okta, Google identity' },
  { value: 'code_hosting', label: 'Code & dev tools', hint: 'GitHub, GitLab, CI/CD' },
  { value: 'accounting_erp', label: 'Accounting / ERP', hint: 'QuickBooks, NetSuite' },
  { value: 'chat_comms', label: 'Chat & comms', hint: 'Slack, Teams, Discord' },
  { value: 'crm', label: 'CRM / pipeline', hint: 'HubSpot, Salesforce' },
  { value: 'other', label: 'Other SaaS', hint: 'anything else holding contract data' },
];

/** Derived planning guidance — honest about being guidance. */
function deriveScope(a: ScopeAnswers): { headline: string; tone: Tone; badge: string; points: string[] } {
  const points: string[] = [];
  let headline: string;
  let tone: Tone;
  let badge: string;

  if (!a.expectsCui) {
    return {
      headline: 'Answer the questions to see your likely scope',
      tone: 'slate',
      badge: 'Not yet derived',
      points: [
        'The summary here updates as you answer — nothing is assumed on your behalf.',
      ],
    };
  }

  if (a.expectsCui === 'no') {
    headline = 'Likely FCI-only planning scope (CMMC Level 1 territory)';
    tone = 'sky';
    badge = 'FCI-only likely';
    points.push(
      'With no CUI expected, your contracts likely involve only FCI — Federal Contract Information, the non-public information you exchange under a government contract. That maps to CMMC Level 1: 17 basic safeguarding requirements, self-assessed.',
      'Revisit this page the moment a solicitation mentions CUI, DFARS 252.204-7012, or CMMC Level 2 — that one clause changes everything downstream.',
    );
  } else if (a.cuiLocation === 'enclave') {
    headline = 'Enclave-scoped assessment likely';
    tone = 'emerald';
    badge = 'Enclave-scoped likely';
    points.push(
      'A dedicated enclave typically limits the assessed environment to the enclave itself plus the people, processes, and admin tooling that touch it — the rest of the company can stay out of scope if CUI genuinely never leaves the enclave.',
      'The discipline that makes this hold: document the boundary, and never let CUI drift into everyday email, chat, or file shares.',
    );
  } else if (a.cuiLocation === 'whole_company') {
    headline = 'Whole-company scope likely';
    tone = 'amber';
    badge = 'Whole-company likely';
    points.push(
      'If CUI flows through your everyday systems, every one of those systems — and everyone who uses them — is likely inside the assessment boundary, and all 110 NIST SP 800-171 requirements apply across it.',
      'Most small contractors shrink this with an enclave (a separate, controlled environment for CUI). It is usually the single biggest cost lever available to you.',
    );
  } else {
    headline = 'Scope not yet determined';
    tone = 'slate';
    badge = 'Undecided';
    points.push(
      'Deciding where CUI will live is your biggest cost lever: an enclave usually shrinks the assessed environment dramatically versus putting CUI in everyday company systems.',
    );
  }

  if (a.expectsCui !== 'no') {
    if (a.remoteEmployees) {
      points.push(
        'Remote employees pull remote-access controls into planning — how people connect, from what devices, and how those sessions are protected and monitored.',
      );
    }
    if (a.cloudServices.length >= 4 && a.cuiLocation !== 'enclave') {
      points.push(
        `A broad cloud footprint (${a.cloudServices.length} service categories) widens the boundary — each service that stores or processes contract data has to be accounted for. Fewer services in front of contract data means a smaller assessment.`,
      );
    }
    if (a.systemAdmin === 'msp') {
      points.push(
        'An MSP administering your systems becomes an External Service Provider (ESP) in your assessment — ask them now what CMMC posture they can show you, and get it in writing.',
      );
    }
    if (a.systemAdmin === 'nobody_yet') {
      points.push(
        'Someone has to own system administration — administrators are always in scope, and "nobody yet" is itself a gap. Naming an owner (even a founder) is a next step.',
      );
    }
    if (a.rolesSeparated && a.companySize && a.companySize !== '1_5') {
      points.push(
        'Role separation helps: people who genuinely never touch contract data or in-scope systems can potentially stay outside the boundary, shrinking training, screening, and account-management workload.',
      );
    }
  }

  return { headline, tone, badge, points };
}

/** One workbook question: number, prompt, a "why this matters" line, controls. */
function Question({
  n, title, why, define, children,
}: {
  n: number;
  title: string;
  why: string;
  define?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="pl-1.5">
        <div className="flex items-start gap-3">
          <span className="shrink-0 h-6 w-6 rounded-full border border-border text-[11px] font-semibold flex items-center justify-center text-muted-foreground tabular-nums mt-0.5">
            {n}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">{title}</h2>
            {define && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{define}</p>}
            <div className="mt-3">{children}</div>
            <p className="text-[11px] text-muted-foreground mt-3 leading-snug">
              <span className="font-medium text-foreground">Why this matters:</span> {why}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function ScopePage() {
  const [answers, setAnswers] = useState<ScopeAnswers>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/fusarium/launchpad/readiness/scope', { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) { setErr(d?.error || `HTTP ${r.status}`); return; }
      const s = d.scope;
      if (s && typeof s === 'object') {
        setAnswers({
          expectsCui: typeof s.expects_cui === 'string' ? s.expects_cui : null,
          cuiLocation: typeof s.cui_location === 'string' ? s.cui_location : null,
          remoteEmployees: s.remote_employees === true,
          cloudServices: Array.isArray(s.cloud_services) ? s.cloud_services.filter((x: unknown) => typeof x === 'string') : [],
          systemAdmin: typeof s.system_admin === 'string' ? s.system_admin : null,
          companySize: typeof s.company_size === 'string' ? s.company_size : null,
          rolesSeparated: s.roles_separated === true,
        });
      }
      setErr(null);
    } catch {
      setErr('Could not load your scope profile');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (patch: Partial<ScopeAnswers>) => {
    setAnswers((a) => ({ ...a, ...patch }));
    setSaved(false);
  };
  const toggleCloud = (value: string) =>
    set({
      cloudServices: answers.cloudServices.includes(value)
        ? answers.cloudServices.filter((v) => v !== value)
        : [...answers.cloudServices, value],
    });

  const save = async () => {
    setSaving(true); setErr(null);
    try {
      const r = await fetch('/api/fusarium/launchpad/readiness/scope', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: answers }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d?.error || 'Save failed'); return; }
      setSaved(true);
    } catch {
      setErr('Save failed — check your connection');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-current" /> Loading scope questionnaire…
      </div>
    );
  }

  const derived = deriveScope(answers);
  const cuiIrrelevant = answers.expectsCui === 'no';

  return (
    <div className="container max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        title="Assessment scope"
        icon={Crosshair}
        description="Seven questions that decide most of your compliance cost before you touch a single control. Answer honestly — the derived summary is planning guidance for you, not a claim to anyone else."
        actions={
          <GlassButton onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin text-current mr-2" /> : saved ? <Check className="h-4 w-4 text-current mr-2" /> : null}
            {saving ? 'Saving…' : saved ? 'Saved' : 'Save scope profile'}
          </GlassButton>
        }
      />

      {/* Education-first: what / why / next step */}
      <Card tone="sky" className="p-5 mb-6">
        <div className="pl-1.5 grid gap-3 sm:grid-cols-3 text-sm">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">What is this</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              &ldquo;Scope&rdquo; is the set of systems and people an assessment actually looks at — your
              assessment boundary. It is defined by where CUI (Controlled Unclassified Information —
              government information that requires safeguarding) lives and who touches it.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Why it matters</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Scope is the single biggest driver of compliance cost. A small, well-drawn boundary can
              mean securing one enclave instead of your whole company — same contracts, a fraction of
              the work.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Your next step</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Answer the seven questions below, save, and read the derived summary. Then take that
              summary into your enclave decision and your System Security Plan (SSP) — the document
              where scope becomes official.
            </p>
          </div>
        </div>
      </Card>

      {err && (
        <Card tone="red" className="p-4 mb-5">
          <div className="pl-1.5 flex items-start gap-2.5 text-sm">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <span>{err}</span>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        <Question
          n={1}
          title="Do you expect CUI on a contract?"
          define={
            <>CUI is Controlled Unclassified Information — technical drawings, specifications, or any
            data a government contract tells you to safeguard (often marked <code className="px-1 rounded bg-muted text-[11px]">CUI//…</code>,
            sometimes not marked at all). FCI — Federal Contract Information — is the milder class:
            non-public contract information without the safeguarding markings.</>
          }
          why="This one answer decides whether you are heading toward CMMC Level 2 (110 requirements) or Level 1 (17 basic safeguards for FCI)."
        >
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <LiquidRadio name="expects-cui" value="yes" checked={answers.expectsCui === 'yes'}
              onChange={(on) => { if (on) set({ expectsCui: 'yes' }); }} label="Yes — or a solicitation we want mentions it" />
            <LiquidRadio name="expects-cui" value="unsure" checked={answers.expectsCui === 'unsure'}
              onChange={(on) => { if (on) set({ expectsCui: 'unsure' }); }} label="Not sure yet" />
            <LiquidRadio name="expects-cui" value="no" checked={answers.expectsCui === 'no'}
              onChange={(on) => { if (on) set({ expectsCui: 'no', cuiLocation: 'none' }); }} label="No — FCI only, as far as we know" />
          </div>
        </Question>

        <Question
          n={2}
          title="Where will CUI live?"
          define={
            <>An enclave is a separate, controlled environment used only for CUI — examples include
            PreVeil, Microsoft GCC High, or a purpose-built segregated network. The alternative is
            letting CUI flow through the same email, chat, and file systems you use for everything.</>
          }
          why="An enclave typically shrinks the assessed environment to the enclave plus whoever touches it; everyday-systems CUI usually puts your whole company in scope."
        >
          <div className="flex flex-col gap-3">
            <LiquidRadio name="cui-location" value="enclave" checked={answers.cuiLocation === 'enclave'} disabled={cuiIrrelevant}
              onChange={(on) => { if (on) set({ cuiLocation: 'enclave' }); }}
              label="A dedicated enclave (PreVeil, GCC High, or similar)" />
            <LiquidRadio name="cui-location" value="whole_company" checked={answers.cuiLocation === 'whole_company'} disabled={cuiIrrelevant}
              onChange={(on) => { if (on) set({ cuiLocation: 'whole_company' }); }}
              label="Our everyday company systems" />
            <LiquidRadio name="cui-location" value="undecided" checked={answers.cuiLocation === 'undecided'} disabled={cuiIrrelevant}
              onChange={(on) => { if (on) set({ cuiLocation: 'undecided' }); }}
              label="Undecided — we haven't picked yet" />
            <LiquidRadio name="cui-location" value="none" checked={answers.cuiLocation === 'none'}
              onChange={(on) => { if (on) set({ cuiLocation: 'none' }); }}
              label="Nowhere — we don't expect CUI" />
          </div>
        </Question>

        <Question
          n={3}
          title="Do you have remote employees?"
          why="Remote work pulls remote-access requirements into your plan — how sessions are secured, monitored, and from what devices. It doesn't forbid anything; it adds controls to account for."
        >
          <LiquidSwitch
            checked={answers.remoteEmployees}
            onChange={(on) => set({ remoteEmployees: on })}
            label={answers.remoteEmployees ? 'Yes — people work outside one office' : 'No — everyone works from one controlled location'}
          />
        </Question>

        <Question
          n={4}
          title="Which cloud services will hold or touch contract data?"
          why="Every service that stores or processes contract data sits inside the boundary and has to be accounted for. Fewer services in front of contract data means a smaller, cheaper assessment."
        >
          <div className="grid sm:grid-cols-2 gap-2">
            {CLOUD_OPTIONS.map((o) => (
              <div key={o.value} className={`rounded-lg border p-3 transition-colors ${
                answers.cloudServices.includes(o.value) ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border hover:bg-muted/50'}`}>
                <LiquidCheckbox
                  checked={answers.cloudServices.includes(o.value)}
                  onChange={() => toggleCloud(o.value)}
                  label={
                    <span>
                      <span className="text-xs font-semibold">{o.label}</span>
                      <span className="block text-[11px] text-muted-foreground mt-0.5">{o.hint}</span>
                    </span>
                  }
                />
              </div>
            ))}
          </div>
        </Question>

        <Question
          n={5}
          title="Who administers your systems?"
          define={
            <>An MSP (Managed Service Provider) is an outside company that runs IT for you. In CMMC
            terms an MSP is an External Service Provider (ESP) — their access becomes part of your
            assessment story.</>
          }
          why="Administrators are always in scope — they hold the keys. Knowing who they are (and what an outside provider can show you) is foundational to the boundary."
        >
          <div className="flex flex-col gap-3">
            <LiquidRadio name="system-admin" value="founder" checked={answers.systemAdmin === 'founder'}
              onChange={(on) => { if (on) set({ systemAdmin: 'founder' }); }} label="A founder wears the IT hat" />
            <LiquidRadio name="system-admin" value="internal_it" checked={answers.systemAdmin === 'internal_it'}
              onChange={(on) => { if (on) set({ systemAdmin: 'internal_it' }); }} label="Internal IT staff" />
            <LiquidRadio name="system-admin" value="msp" checked={answers.systemAdmin === 'msp'}
              onChange={(on) => { if (on) set({ systemAdmin: 'msp' }); }} label="An MSP (outside IT provider)" />
            <LiquidRadio name="system-admin" value="nobody_yet" checked={answers.systemAdmin === 'nobody_yet'}
              onChange={(on) => { if (on) set({ systemAdmin: 'nobody_yet' }); }} label="Nobody yet — it just happens" />
          </div>
        </Question>

        <Question
          n={6}
          title="How many people are in the company?"
          why="Headcount drives the per-person workload — training records, screening, access agreements, account management. Small is an advantage here: fewer people, fewer records."
        >
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <LiquidRadio name="company-size" value="1_5" checked={answers.companySize === '1_5'}
              onChange={(on) => { if (on) set({ companySize: '1_5' }); }} label="1–5" />
            <LiquidRadio name="company-size" value="6_15" checked={answers.companySize === '6_15'}
              onChange={(on) => { if (on) set({ companySize: '6_15' }); }} label="6–15" />
            <LiquidRadio name="company-size" value="16_50" checked={answers.companySize === '16_50'}
              onChange={(on) => { if (on) set({ companySize: '16_50' }); }} label="16–50" />
            <LiquidRadio name="company-size" value="51_plus" checked={answers.companySize === '51_plus'}
              onChange={(on) => { if (on) set({ companySize: '51_plus' }); }} label="51+" />
          </div>
        </Question>

        <Question
          n={7}
          title="Are roles separated — do some people never touch contract work?"
          why="People who genuinely never touch contract data or in-scope systems can potentially stay outside the boundary, shrinking your training, screening, and account workload."
        >
          <LiquidSwitch
            checked={answers.rolesSeparated}
            onChange={(on) => set({ rolesSeparated: on })}
            label={answers.rolesSeparated ? 'Yes — some people never touch contract data' : 'No — everyone does a bit of everything'}
          />
        </Question>
      </div>

      {/* Derived summary — guidance, plainly labeled as such */}
      <Card tone={derived.tone} className="p-5 mt-6">
        <div className="pl-1.5">
          <div className="flex flex-wrap items-center gap-2.5 mb-2">
            <h2 className="text-base font-bold">Your likely assessment scope</h2>
            <StateBadge tone={derived.tone}>{derived.badge}</StateBadge>
          </div>
          <p className="text-sm font-medium mb-3">{derived.headline}</p>
          <ul className="space-y-2">
            {derived.points.map((p, i) => (
              <li key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-2">
                <span className="text-foreground/60 shrink-0">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground mt-4 pt-3 border-t border-border/50 leading-snug">
            This is planning guidance, not an official scoping determination. Final scope is defined
            in your System Security Plan and confirmed at assessment time under 32 CFR Part 170 —
            nothing here certifies or guarantees anything.
          </p>
        </div>
      </Card>

      <div className="flex items-center gap-3 mt-6">
        <GlassButton onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin text-current mr-2" /> : saved ? <Check className="h-4 w-4 text-current mr-2" /> : null}
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save scope profile'}
        </GlassButton>
        <span className="text-[11px] text-muted-foreground">
          Saving records your answers to your company profile and appends an audit event.
        </span>
      </div>
    </div>
  );
}
