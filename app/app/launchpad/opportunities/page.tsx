'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Radar, Loader2, ExternalLink, CircleHelp, Target, Footprints, ChevronRight,
} from 'lucide-react';
import { PageHeader, Card, StatTile, StateBadge } from '@/components/launchpad/ui';

/**
 * Contract Radar — reads the centrally-ingested opportunity table.
 * Until the official-source collectors ship, this states plainly that no
 * sources are connected. It never renders sample rows as live federal data.
 *
 * Single fetch: GET /api/fusarium/launchpad/radar/opportunities. Beyond the
 * rows + collectorsLive flag, the response's existing status fields are read
 * for the posture tiles — `sources.sam` (configured / honest
 * "sam_not_configured" message). Nothing extra is fetched and no number is
 * ever fabricated: empty renders "—".
 */

interface Opportunity {
  id: string;
  source: string;
  title: string;
  agency: string | null;
  instrument: string | null;
  posted_at: string | null;
  due_at: string | null;
  timezone: string | null;
  naics: string[];
  official_url: string;
}

interface SamSourceStatus {
  configured: boolean;
  status: string;
  message?: string;
}

const SOURCE_LABEL: Record<string, string> = {
  sam: 'SAM.gov', dsip: 'DSIP', grants_gov: 'Grants.gov', diu: 'DIU',
  darpa: 'DARPA', nspires: 'NSPIRES', nsf: 'NSF', other: 'Other',
};

export default function OpportunitiesPage() {
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [live, setLive] = useState(false);
  const [sam, setSam] = useState<SamSourceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/fusarium/launchpad/radar/opportunities', { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json();
        if (r.ok) {
          setOpps(d.opportunities);
          setLive(d.collectorsLive);
          setSam(d.sources?.sam ?? null);
        }
        else setErr(d?.error || `HTTP ${r.status}`);
      })
      .catch(() => setErr('Could not load opportunities'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin text-current" /> Loading Contract Radar…
    </div>;
  }

  return (
    <div className="container max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        title="Contract Radar"
        icon={Radar}
        description="Official sources are ingested centrally, normalized, and deduplicated once — then matched to your company profile. Every record links to its authoritative page."
      />

      {/* Education-first intro */}
      <Card className="p-5 mb-6">
        <div className="grid sm:grid-cols-3 gap-5 text-sm">
          <div className="flex items-start gap-2.5">
            <CircleHelp className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">What is this?</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Official-source opportunity discovery. Collectors run nightly against each configured
                source — SAM.gov, DSIP, Grants.gov — normalize every notice once, and match it against
                your capability profile. Nothing here is entered by hand or invented.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Target className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">Why it matters</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Most federal opportunities are lost before a word is written — the notice was never
                seen, or was seen too late to bid well. A matched radar surfaces the ones worth your
                time while the clock is still usable.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Footprints className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">Your next step</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Open a match, confirm the deadline and eligibility on the official page, then start a
                proposal workspace. If no sources are connected yet, this page says so plainly — it
                never shows sample data.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {err && <p className="text-sm text-destructive mb-4">{err}</p>}

      {/* Posture tiles — derived from the single radar response, never fabricated */}
      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {opps.length > 0 ? (
          <StatTile label="Opportunities indexed" value={opps.length} tone="emerald"
            sub="official-source notices in the central table" />
        ) : (
          <StatTile label="Opportunities indexed" tone="slate" empty="—" />
        )}
        {sam ? (
          sam.configured ? (
            <StatTile label="Sources configured" value={1} tone="emerald"
              sub="SAM.gov collector ready · DSIP and Grants.gov not built" />
          ) : (
            <StatTile label="Sources configured" value={0} tone="amber"
              sub={sam.message ?? 'SAM not configured / no federal source connected'} />
          )
        ) : (
          <StatTile label="Sources configured" tone="slate" empty="—" />
        )}
      </div>

      {!live ? (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">No opportunity source is connected yet.</p>
          <p>
            The SAM.gov collector is built and waiting on an API key — once one is set, notices are
            pulled nightly and matches appear here on their own. DSIP and Grants.gov are not built yet.
          </p>
          <p className="mt-2">
            Nothing is shown until a real source returns real notices. This page never displays sample
            awards as if they were live.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {opps.map((o) => (
            <Card key={o.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2 pl-1.5 mb-1.5">
                <StateBadge tone="sky">{SOURCE_LABEL[o.source] ?? o.source}</StateBadge>
                {o.instrument && <span className="text-[11px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">{o.instrument}</span>}
                <Link href={`/app/launchpad/opportunities/${o.id}`}
                  className="font-medium text-sm inline-flex items-center gap-1 min-w-0 hover:text-emerald-600 dark:hover:text-emerald-400">
                  <span className="truncate">{o.title}</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-1.5 text-xs text-muted-foreground">
                {o.agency && <span>{o.agency}</span>}
                <span className="tabular-nums">
                  posted {o.posted_at ? new Date(o.posted_at).toLocaleDateString() : '—'}
                </span>
                <span className="tabular-nums">
                  {o.due_at
                    ? <>due {new Date(o.due_at).toLocaleString()} {o.timezone ? `(${o.timezone})` : ''}</>
                    : 'due —'}
                </span>
                {o.naics.length > 0 && <span>NAICS {o.naics.join(', ')}</span>}
                <a href={o.official_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 ml-auto">
                  Official source <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
