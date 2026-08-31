'use client';

/**
 * FUSARIUM Launchpad — official documentation links panel.
 *
 * Drop <OfficialLinksPanel surface="tier1" /> at the bottom of any workspace
 * screen and it renders that surface's curated authoritative sources from
 * lib/launchpad/official-links.ts. Text links with external indicators only —
 * government seals and unlicensed vendor marks are never rendered here.
 */

import { ExternalLink, BookOpenCheck } from 'lucide-react';
import { Card } from '@/components/launchpad/ui';
import { LINKS_BY_SURFACE, type LinkSurface, type OfficialLink } from '@/lib/launchpad/official-links';

const KIND_LABEL: Record<OfficialLink['kind'], string> = {
  regulation: 'Regulation',
  guidance: 'Official guidance',
  portal: 'Government portal',
  training: 'Free training',
  'vendor-docs': 'Vendor docs',
};

export function OfficialLinksPanel({ surface, title }: { surface: LinkSurface; title?: string }) {
  const links = LINKS_BY_SURFACE[surface];
  if (!links?.length) return null;
  return (
    <Card className="p-5 mt-6">
      <h2 className="text-sm font-semibold flex items-center gap-2 mb-1">
        <BookOpenCheck className="h-4 w-4 text-emerald-500" />
        {title ?? 'Authoritative sources for this page'}
      </h2>
      <p className="text-xs text-muted-foreground mb-3">
        Read the source, not just our summary — these are the documents an assessor would hold you to.
      </p>
      <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
        {links.map((l) => (
          <li key={l.url} className="min-w-0">
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-start gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 hover:underline underline-offset-2"
            >
              <span className="min-w-0">{l.label}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-60 group-hover:opacity-100 text-current" />
            </a>
            <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">
              <span className="uppercase tracking-wide text-[9px] font-semibold text-muted-foreground/80 mr-1.5">{KIND_LABEL[l.kind]}</span>
              {l.why}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-muted-foreground mt-3 pt-2 border-t border-border/50">
        External sites open in a new tab. Links are informational — no listing is an endorsement, and none of it
        substitutes for the text of your contract clauses.
      </p>
    </Card>
  );
}
