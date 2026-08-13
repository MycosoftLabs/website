'use client';

import { BookOpen, Compass, GraduationCap, ListChecks } from 'lucide-react';
import { PageHeader, Card } from '@/components/launchpad/ui';
import { GlassButton } from '@/components/ui/glass-button';
import { GLOSSARY, GLOSSARY_CATEGORIES } from '@/lib/launchpad/glossary';

/**
 * Learn hub — the front door of the education layer.
 *
 * Three doors: the glossary (every term defined for founders), the guided
 * walkthroughs, and the in-app tour (which launches from the dashboard, not
 * from here — this page just says so plainly). Static content only; nothing
 * here is tenant data.
 */

export default function LearnHubPage() {
  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <PageHeader
        icon={GraduationCap}
        title="Learn"
        description="Defense contracting has its own language and its own paperwork. This section teaches both, in plain English, before any of it costs you money."
      />

      {/* Education-first intro: what / why / next. */}
      <Card className="p-5 mb-8">
        <div className="grid sm:grid-cols-3 gap-5 text-sm">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
              What is this
            </div>
            <p className="text-muted-foreground leading-relaxed">
              The education layer of Launchpad: a glossary of every acronym you will meet, and
              step-by-step walkthroughs of the registrations and assessments the rest of the app
              tracks.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
              Why it matters
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Most first-time contractors lose months to avoidable mistakes — a lapsed SAM.gov
              registration, the wrong cloud tier for CUI (Controlled Unclassified Information),
              a missed 72-hour reporting duty. Knowing the vocabulary is the cheapest insurance
              there is.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
              Your next step
            </div>
            <p className="text-muted-foreground leading-relaxed">
              New to government work entirely? Skim the glossary&apos;s six categories first.
              Ready to act? Open the walkthroughs and start with entity registration.
            </p>
          </div>
        </div>
      </Card>

      {/* The three doors. */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-5 w-5 text-emerald-500 shrink-0" />
            <h2 className="font-semibold text-sm">Glossary</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed flex-1">
            <span className="tabular-nums font-medium text-foreground">{GLOSSARY.length}</span> terms
            across <span className="tabular-nums font-medium text-foreground">{GLOSSARY_CATEGORIES.length}</span> categories
            — from NIPRNet to SPRS — each with a plain definition, why it matters to you, and a
            link to the official source. Searchable, so a confusing clause is never more than a
            few keystrokes from an explanation.
          </p>
          <div className="mt-4">
            <GlassButton href="/app/launchpad/learn/glossary">Open the glossary</GlassButton>
          </div>
        </Card>

        <Card className="p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <ListChecks className="h-5 w-5 text-emerald-500 shrink-0" />
            <h2 className="font-semibold text-sm">Walkthroughs</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed flex-1">
            Step-by-step guides through the real processes — registering in SAM.gov, running your
            first NIST SP 800-171 self-assessment, posting a score to SPRS — written like a
            workbook, in the order a new contractor actually does them.
          </p>
          <div className="mt-4">
            <GlassButton href="/app/launchpad/learn/walkthroughs">Open walkthroughs</GlassButton>
          </div>
        </Card>

        <Card className="p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Compass className="h-5 w-5 text-emerald-500 shrink-0" />
            <h2 className="font-semibold text-sm">Take the app tour</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed flex-1">
            A guided pass over Launchpad itself — what each screen tracks and how the pieces
            connect. The tour launches from the dashboard, not from here: head there and look
            for the tour prompt.
          </p>
          <div className="mt-4">
            <GlassButton href="/app/launchpad/dashboard">Go to the dashboard</GlassButton>
          </div>
        </Card>
      </div>

      <p className="text-[11px] text-muted-foreground mt-10 pt-4 border-t border-border/40 text-center">
        Educational summaries, not legal advice — verify against the official sources linked.
      </p>
    </div>
  );
}
