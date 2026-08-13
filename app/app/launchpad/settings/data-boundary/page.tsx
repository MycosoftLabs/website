'use client';

import Link from 'next/link';
import { Shield, Ban, Siren, GraduationCap } from 'lucide-react';
import { PageHeader, Card, StateBadge, type Tone } from '@/components/launchpad/ui';
import { GlassButton } from '@/components/ui/glass-button';
import {
  DATA_BOUNDARY_POLICY,
  DATA_CLASSES,
  PROHIBITED_EXAMPLES,
  ENFORCEMENT_CONTROLS,
  INCIDENT_GUIDANCE,
  type AllowedLevel,
  type EnforcementStatus,
} from '@/lib/launchpad/data-boundary-content';

/**
 * Data boundary — the classification policy as a teaching page.
 *
 * Static by design: this renders policy content (v1.0), not tenant data, so
 * there is nothing to fetch. The enforcement table is the honesty surface —
 * per-control LIVE / PARTIAL / PENDING, never implied coverage.
 */

const ALLOWED_BADGE: Record<AllowedLevel, { tone: Tone; label: string }> = {
  yes: { tone: 'emerald', label: 'Allowed' },
  references_only: { tone: 'amber', label: 'References only' },
  never: { tone: 'red', label: 'Never' },
};

const STATUS_BADGE: Record<EnforcementStatus, { tone: Tone; label: string }> = {
  live: { tone: 'emerald', label: 'LIVE' },
  partial: { tone: 'amber', label: 'PARTIAL' },
  pending: { tone: 'slate', label: 'PENDING' },
};

export default function DataBoundaryPage() {
  const classes = DATA_CLASSES.filter((c) => c.kind === 'class');
  const specials = DATA_CLASSES.filter((c) => c.kind === 'special');

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <PageHeader
        title="Data boundary"
        icon={Shield}
        description="What belongs in this workspace, what never does, and how honestly that line is enforced today."
        actions={<GlassButton href="/app/launchpad/settings/export">Open data export</GlassButton>}
      />

      {/* Policy banner + metadata */}
      <Card tone="sky" className="p-4 mb-6">
        <div className="pl-1.5 flex flex-wrap items-center justify-between gap-3">
          <code className="text-sm font-semibold tracking-wide">{DATA_BOUNDARY_POLICY.banner}</code>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            Data classification policy v{DATA_BOUNDARY_POLICY.version} · effective {DATA_BOUNDARY_POLICY.effectiveDate}
          </span>
        </div>
      </Card>

      {/* Education-first intro */}
      <Card className="p-5 mb-8">
        <div className="pl-1.5 grid sm:grid-cols-3 gap-x-6 gap-y-4">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <GraduationCap className="h-3.5 w-3.5" /> What is this
            </div>
            <p className="text-sm leading-relaxed">
              This workspace is commercial and non-CUI. CUI (Controlled Unclassified Information) is
              government-regulated data — for example technical drawings under a defense contract — and it
              is never stored here. Launchpad holds your business data, plus references and hashes that
              point at sensitive content living in your own systems.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">Why it matters</div>
            <p className="text-sm leading-relaxed">
              Putting regulated data in an unauthorized system is a spill — it can breach your contracts and
              federal rules even if nothing leaks. Knowing the classes below is the single habit that keeps
              a new contractor out of that trouble.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">Your next step</div>
            <p className="text-sm leading-relaxed">
              Read the eight cards once. If you handle CUI, set up an enclave (a government-suitable
              environment such as PreVeil or GCC High) and keep that content there — Launchpad tracks
              readiness around it, never the content itself.
            </p>
          </div>
        </div>
      </Card>

      {/* The six classes */}
      <h2 className="text-lg font-semibold mb-1">The six data classes</h2>
      <p className="text-sm text-muted-foreground mb-4 max-w-3xl">
        Every piece of information you touch falls into one of these. The badge on each card is the whole
        rule: allowed here, references only, or never.
      </p>
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {classes.map((c) => (
          <ClassCard key={c.key} card={c} />
        ))}
      </div>

      {/* Special categories */}
      <h2 className="text-lg font-semibold mb-1">Always blocked, regardless of class</h2>
      <p className="text-sm text-muted-foreground mb-4 max-w-3xl">
        Two categories are refused no matter which class the surrounding data belongs to.
      </p>
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {specials.map((c) => (
          <ClassCard key={c.key} card={c} />
        ))}
      </div>

      {/* Prohibited examples */}
      <Card tone="red" className="p-5 mb-8">
        <div className="pl-1.5">
          <h2 className="text-base font-semibold flex items-center gap-2 mb-1">
            <Ban className="h-4 w-4 text-red-500" /> Never put these in Launchpad
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Not in a form, a note, a task, an evidence title, or an AI chat box:
          </p>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {PROHIBITED_EXAMPLES.map((item) => (
              <li key={item} className="text-sm flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground mt-3">
            If you pasted a secret by mistake: treat it as exposed and rotate it, then remove the record.
          </p>
        </div>
      </Card>

      {/* Enforcement — honest status */}
      <h2 className="text-lg font-semibold mb-1">How the boundary is enforced — honest status</h2>
      <p className="text-sm text-muted-foreground mb-4 max-w-3xl">
        Per-control status as it stands today. PENDING means the piece does not exist yet — we say so
        rather than implying coverage.
      </p>
      <div className="overflow-x-auto rounded-xl border border-border/70 mb-8 myco-glass-surface">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2 font-medium whitespace-nowrap">Control</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Where it stands</th>
            </tr>
          </thead>
          <tbody>
            {ENFORCEMENT_CONTROLS.map((c) => {
              const badge = STATUS_BADGE[c.status];
              return (
                <tr key={c.control} className="border-t border-border/40 align-top">
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap">{c.control}</td>
                  <td className="px-3 py-2.5">
                    <StateBadge tone={badge.tone}>{badge.label}</StateBadge>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground leading-relaxed">
                    {c.detail}
                    {c.href && (
                      <>
                        {' '}
                        <Link
                          href={c.href}
                          className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2 font-medium"
                        >
                          {c.hrefLabel}
                        </Link>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Incident guidance */}
      <Card tone="red" className="p-5">
        <div className="pl-1.5">
          <h2 className="text-base font-semibold flex items-center gap-2 mb-1">
            <Siren className="h-4 w-4 text-red-500" /> {INCIDENT_GUIDANCE.title}
          </h2>
          <p className="text-sm text-muted-foreground mb-3 max-w-3xl">{INCIDENT_GUIDANCE.intro}</p>
          <ol className="space-y-2 mb-3">
            {INCIDENT_GUIDANCE.steps.map((step, i) => (
              <li key={step} className="text-sm flex items-start gap-2.5">
                <span className="h-5 w-5 rounded-full bg-red-500/10 border border-red-500/40 text-red-600 dark:text-red-400 text-[11px] font-semibold tabular-nums flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">{INCIDENT_GUIDANCE.closing}</p>
        </div>
      </Card>
    </div>
  );
}

function ClassCard({ card }: { card: (typeof DATA_CLASSES)[number] }) {
  const badge = ALLOWED_BADGE[card.allowed];
  return (
    <Card tone={card.tone} className="p-4">
      <div className="pl-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold">{card.name}</h3>
          <StateBadge tone={badge.tone}>{badge.label}</StateBadge>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">{card.definition}</p>
        <dl className="space-y-2 mb-3">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Allowed in Launchpad?</dt>
            <dd className="text-xs leading-relaxed mt-0.5">{card.allowedDetail}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Can AI features use it?</dt>
            <dd className="text-xs leading-relaxed mt-0.5">{card.aiUse}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">What you do</dt>
            <dd className="text-xs leading-relaxed mt-0.5">{card.action}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-1.5">
          {card.examples.map((ex) => (
            <span key={ex} className="text-[11px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">
              {ex}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}
