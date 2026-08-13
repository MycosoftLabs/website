'use client';

/**
 * Resource Graph — a curated, disclosed directory of the tools, services, and
 * steps founders meet on the road to government work. The "Your resources"
 * section is read-only for now: customer-added resources are coming in a
 * workspace-scoped table, never the shared catalog.
 *
 * Education-first: every card says when a thing is required AND when it is
 * not, jargon is defined inline the first time it appears (in the catalog
 * copy), and the page opens with what/why/next. Every curated listing is
 * independent — the disclosure renders on each card. Nothing here is a
 * certification, and no listing makes a company CMMC compliant.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Info, Library, Loader2 } from 'lucide-react';
import { PageHeader, Card, StatTile, StateBadge } from '@/components/launchpad/ui';
import { FeatureGate, TierTag } from '@/components/launchpad/entitlements';
import { OfficialLinksPanel } from '@/components/launchpad/official-links';
import { VendorMark } from '@/components/launchpad/vendor-mark';
import {
  RESOURCE_CATEGORIES,
  resourceCategoryLabel,
  type ResourceCatalogCard,
} from '@/lib/launchpad/resource-catalog';

interface CustomResource {
  id: string;
  vendor: string;
  offering: string;
  category: string;
  relationship_type: 'customer-selected';
  why_consider: string | null;
  external_url: string | null;
  notes: string | null;
  added_at: string | null;
}

const field = 'myco-glass-field w-full rounded-lg border border-border px-3 py-2 text-sm';

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function matchesQuery(q: string, ...parts: Array<string | null | undefined>): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return parts.some((p) => p && p.toLowerCase().includes(needle));
}

function CatalogCard({ card, ordered }: { card: ResourceCatalogCard; ordered: boolean }) {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start gap-2">
        <VendorMark
          domain={card.logoDomain ?? (card.external_url ? hostOf(card.external_url) : null)}
          name={card.vendor}
          size={24}
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {ordered && card.step && (
              <span className="text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded border border-border text-muted-foreground shrink-0">
                Step {card.step}
              </span>
            )}
            <span className="font-semibold text-sm">{card.vendor}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{card.offering}</div>
        </div>
        {card.external_url && (
          <a
            href={card.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 underline underline-offset-2 shrink-0"
          >
            {hostOf(card.external_url)}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed mt-2">{card.why_consider}</p>

      <div className="grid sm:grid-cols-2 gap-2 mt-3">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            When you need it
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug mt-1">{card.when_required}</p>
        </div>
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            When you don&apos;t
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug mt-1">{card.when_not_required}</p>
        </div>
      </div>

      {(card.data_allowed?.length || card.data_not_allowed?.length) ? (
        <div className="mt-2 space-y-1">
          {card.data_allowed?.map((d) => (
            <div key={d} className="text-[11px] text-muted-foreground leading-snug">
              <span className="font-medium text-emerald-600 dark:text-emerald-400">Data OK:</span> {d}
            </div>
          ))}
          {card.data_not_allowed?.map((d) => (
            <div key={d} className="text-[11px] text-muted-foreground leading-snug">
              <span className="font-medium text-red-600 dark:text-red-400">Never:</span> {d}
            </div>
          ))}
        </div>
      ) : null}

      {card.alternatives.length > 0 && (
        <div className="text-[11px] text-muted-foreground mt-2">
          <span className="font-medium text-foreground">Alternatives:</span> {card.alternatives.join(' · ')}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-border/50">
        <span className="text-[10px] italic text-muted-foreground">{card.disclosure}</span>
        <span className="text-[10px] text-muted-foreground tabular-nums">verified {card.last_verified}</span>
      </div>
    </Card>
  );
}

export default function ResourcesPage() {
  const [catalog, setCatalog] = useState<ResourceCatalogCard[]>([]);
  const [custom, setCustom] = useState<CustomResource[]>([]);
  const [customAvailable, setCustomAvailable] = useState(true);
  const [customNote, setCustomNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [category, setCategory] = useState<string>('all');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/fusarium/launchpad/resources', { cache: 'no-store' });
      const d = await r.json();
      if (r.ok) {
        setCatalog(d.catalog ?? []);
        setCustom(d.custom ?? []);
        setCustomAvailable(d.customAvailable !== false);
        setCustomNote(d.customNote ?? null);
        setErr(null);
      } else {
        setErr(d?.error || `HTTP ${r.status}`);
      }
    } catch {
      setErr('Could not load the resource directory');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const visibleCategories = useMemo(
    () => RESOURCE_CATEGORIES.filter((c) => category === 'all' || c.key === category),
    [category],
  );

  const cardsFor = useCallback(
    (key: string) =>
      catalog
        .filter((c) => c.category === key)
        .filter((c) =>
          matchesQuery(query, c.vendor, c.offering, c.why_consider, c.alternatives.join(' ')),
        )
        .sort((a, b) => (a.step ?? 0) - (b.step ?? 0)),
    [catalog, query],
  );

  const visibleCustom = useMemo(
    () =>
      custom.filter(
        (c) =>
          (category === 'all' || c.category === category) &&
          matchesQuery(query, c.vendor, c.offering, c.why_consider, c.notes),
      ),
    [custom, category, query],
  );

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-current" /> Loading resource directory…
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <PageHeader
        title="Resources"
        icon={Library}
        description="A curated directory of the tools, services, and steps on the road to government work — each with an honest answer to when you need it and when you don't."
        actions={<TierTag feature="resourceGraph" />}
      />

      <FeatureGate feature="resourceGraph">
        {/* Education-first intro */}
        <Card tone="sky" className="p-5 mb-6">
          <div className="pl-1.5">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <h2 className="text-sm font-semibold flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-sky-500" /> What is this?
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  A plain-language directory of what small companies actually encounter on the way
                  to federal work — secure collaboration, network gear, formation paperwork, the
                  federal registration path, and funding. Every entry explains its jargon the first
                  time it appears.
                </p>
              </div>
              <div>
                <h2 className="text-sm font-semibold">Why it matters</h2>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  Vendors in this space sell fear, and founders new to government work overspend on
                  things they don&apos;t need yet. Every card here states when a thing is required
                  <em> and when it is not</em> — the anti-sell is the point.
                </p>
              </div>
              <div>
                <h2 className="text-sm font-semibold">Your next step</h2>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  Brand new? Read <span className="font-medium text-foreground">Corporate formation</span> and
                  the <span className="font-medium text-foreground">Federal registration path</span> in order.
                  Already operating? Walk the network decision tree, and record what you already use
                  under &ldquo;Your resources&rdquo;.
                </p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-4 pt-3 border-t border-border/50 leading-relaxed">
              Every curated listing is independent — Mycosoft receives no compensation for any
              listing on this page. A listing is not an endorsement or certification, and no tool,
              vendor, or purchase makes a company CMMC compliant.
            </p>
          </div>
        </Card>

        {err && <p className="text-sm text-destructive mb-4">{err}</p>}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <StatTile label="Curated listings" value={catalog.length} tone="emerald" sub="independent, disclosed, no compensation" />
          <StatTile label="Categories" value={RESOURCE_CATEGORIES.length} tone="sky" sub="from formation to funding" />
          <StatTile
            label="Your resources"
            {...(custom.length === 0 ? { empty: 'none added yet' } : { value: custom.length })}
            tone="slate"
            sub="added by your workspace"
          />
        </div>

        {/* Filter + search */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {[{ key: 'all', label: 'All' }, ...RESOURCE_CATEGORIES].map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                category === c.key
                  ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {c.label}
            </button>
          ))}
          <input
            className={`${field} sm:max-w-xs sm:ml-auto`}
            placeholder="Search vendors, offerings, alternatives…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search resources"
          />
        </div>

        {/* Curated catalog by category */}
        <div className="space-y-8">
          {visibleCategories.map((meta) => {
            const cards = cardsFor(meta.key);
            if (cards.length === 0 && query) return null;
            return (
              <section key={meta.key}>
                <h2 className="text-base font-semibold">{meta.label}</h2>
                <p className="text-xs text-muted-foreground mt-1 mb-3 max-w-3xl leading-relaxed">{meta.blurb}</p>
                {cards.length === 0 ? (
                  <p className="text-xs italic text-muted-foreground">No listings match the current search.</p>
                ) : (
                  <div className={meta.kind === 'ordered' ? 'space-y-3' : 'grid md:grid-cols-2 gap-3'}>
                    {cards.map((card) => (
                      <CatalogCard key={card.id} card={card} ordered={meta.kind === 'ordered'} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* Your resources */}
        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold">Your resources</h2>
              <StateBadge tone="amber">Not reviewed by Mycosoft</StateBadge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-4 max-w-3xl leading-relaxed">
            Tools and services your workspace records for itself (relationship: customer-selected).
            Entries here will be added by your team, visible only to your workspace, and are not
            reviewed, endorsed, or verified by Mycosoft. Store references only — never credentials
            or file contents.
          </p>

          {customNote && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-muted-foreground mb-4">
              {customNote}
            </div>
          )}

          {visibleCustom.length === 0 ? (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
              {custom.length === 0
                ? customAvailable
                  ? 'Nothing recorded yet.'
                  : 'Nothing recorded yet — customer-added resources are coming (see the note above).'
                : 'No workspace resources match the current filter.'}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {visibleCustom.map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-sm">{r.vendor}</span>
                      <div className="text-xs text-muted-foreground mt-0.5">{r.offering}</div>
                    </div>
                    {r.external_url && (
                      <a
                        href={r.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 underline underline-offset-2 shrink-0"
                      >
                        {hostOf(r.external_url)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {r.why_consider && (
                    <p className="text-xs text-muted-foreground leading-relaxed mt-2">{r.why_consider}</p>
                  )}
                  {r.notes && <p className="text-[11px] text-muted-foreground mt-1">{r.notes}</p>}
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-border/50">
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                      {resourceCategoryLabel(r.category)}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-600 dark:text-amber-400">
                      customer-selected · not reviewed by Mycosoft
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </FeatureGate>
      <OfficialLinksPanel surface="resources" title="Authoritative portals and vendor docs" />
    </div>
  );
}
