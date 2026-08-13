'use client';

import { useEffect, useState } from 'react';
import { Radar, Loader2, ExternalLink } from 'lucide-react';

/**
 * Contract Radar — reads the centrally-ingested opportunity table.
 * Until the official-source collectors ship, this states plainly that no
 * sources are connected. It never renders sample rows as live federal data.
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

export default function OpportunitiesPage() {
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/fusarium/launchpad/radar/opportunities', { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json();
        if (r.ok) { setOpps(d.opportunities); setLive(d.collectorsLive); }
        else setErr(d?.error || `HTTP ${r.status}`);
      })
      .catch(() => setErr('Could not load opportunities'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" /> Loading Contract Radar…
    </div>;
  }

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-1">
        <Radar className="h-6 w-6 text-primary" /> Contract Radar
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Official sources are ingested centrally, normalized, and deduplicated once — then matched to
        your company profile. Every record links to its authoritative page.
      </p>

      {err && <p className="text-sm text-destructive mb-4">{err}</p>}

      {!live ? (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">No opportunity sources are connected yet.</p>
          <p>
            The SAM.gov, DSIP, and Grants.gov collectors are in implementation. When they come online,
            matches appear here automatically — this page will never show sample data as if it were live.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {opps.map((o) => (
            <div key={o.id} className="rounded-lg border border-border/60 p-4">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[11px] px-1.5 py-0.5 rounded border border-border text-muted-foreground uppercase">{o.source}</span>
                {o.instrument && <span className="text-[11px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">{o.instrument}</span>}
                <span className="font-medium text-sm">{o.title}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {o.agency && <span>{o.agency}</span>}
                {o.due_at && <span>due {new Date(o.due_at).toLocaleString()} {o.timezone ? `(${o.timezone})` : ''}</span>}
                {o.naics.length > 0 && <span>NAICS {o.naics.join(', ')}</span>}
                <a href={o.official_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary ml-auto">
                  Official source <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
