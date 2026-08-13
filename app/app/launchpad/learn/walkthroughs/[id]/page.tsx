'use client';

/**
 * One walkthrough, rendered by the workbook wizard. Static education content
 * resolved from the registry by slug — an unknown slug gets an honest
 * not-found card, never a fabricated walkthrough.
 */

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CircleOff, Footprints } from 'lucide-react';
import { GlassButton } from '@/components/ui/glass-button';
import { Card, PageHeader } from '@/components/launchpad/ui';
import { Walkthrough } from '@/components/launchpad/walkthrough';
import { getWalkthrough } from '@/lib/launchpad/walkthroughs';

export default function WalkthroughDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';
  const def = getWalkthrough(id);

  if (!def) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <CircleOff className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-semibold">No walkthrough with that name</p>
          <p className="text-xs text-muted-foreground mt-1.5">
            The address may be out of date. The full list of guided walkthroughs is one click away.
          </p>
          <div className="mt-4 flex justify-center">
            <GlassButton href="/app/launchpad/learn/walkthroughs">
              <ArrowLeft className="h-4 w-4 text-current mr-2" /> All walkthroughs
            </GlassButton>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8">
      <Link
        href="/app/launchpad/learn/walkthroughs"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All walkthroughs
      </Link>

      <PageHeader icon={Footprints} title={def.title} description={def.audience} />

      {/* Education-first intro */}
      <Card className="p-5 mb-6">
        <div className="space-y-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">What is this</div>
            <p className="text-sm text-muted-foreground leading-relaxed">{def.intro.what}</p>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">Why it matters</div>
            <p className="text-sm text-muted-foreground leading-relaxed">{def.intro.why}</p>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">Your next step</div>
            <p className="text-sm text-muted-foreground leading-relaxed">{def.intro.next}</p>
          </div>
        </div>
      </Card>

      <Walkthrough walkthrough={def} />
    </div>
  );
}
