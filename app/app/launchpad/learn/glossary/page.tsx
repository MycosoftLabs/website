'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronRight, ExternalLink, Search } from 'lucide-react';
import { PageHeader, Card } from '@/components/launchpad/ui';
import {
  GLOSSARY,
  GLOSSARY_CATEGORIES,
  type GlossaryCategory,
  type GlossaryEntry,
} from '@/lib/launchpad/glossary';

/**
 * The founder's defense glossary — the education layer, browsable.
 *
 * All data is the static, typed reference in lib/launchpad/glossary.ts; there
 * is no fetch and no tenant data on this page. Search and category filters run
 * client-side; entries expand with the same animated lp-row-panel pattern the
 * audit trail uses, so "open a row" feels identical everywhere in the app.
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const inputClass = 'myco-glass-field w-full rounded-lg border border-border px-3 py-2 text-sm';

function entryMatches(e: GlossaryEntry, q: string): boolean {
  const hay = [e.term, ...(e.aka ?? []), e.plain, e.whyItMatters, ...e.details].join(' ').toLowerCase();
  return hay.includes(q);
}

export default function GlossaryPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<GlossaryCategory | 'all'>('all');
  const [open, setOpen] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term)),
    [],
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter(
      (e) => (category === 'all' || e.category === category) && (q === '' || entryMatches(e, q)),
    );
  }, [sorted, query, category]);

  /** Entries grouped by first letter, preserving alphabetical order. */
  const groups = useMemo(() => {
    const out: Array<{ letter: string; entries: GlossaryEntry[] }> = [];
    for (const e of shown) {
      const letter = e.term[0].toUpperCase();
      const last = out[out.length - 1];
      if (last && last.letter === letter) last.entries.push(e);
      else out.push({ letter, entries: [e] });
    }
    return out;
  }, [shown]);

  const availableLetters = useMemo(() => new Set(groups.map((g) => g.letter)), [groups]);

  const jumpTo = (letter: string) => {
    document.getElementById(`lp-gloss-${letter}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <PageHeader
        icon={BookOpen}
        title="Defense glossary"
        description={
          <>
            {GLOSSARY.length} terms, written for founders who have never done government work.
            Every entry links to its official source — the summaries here are educational, and
            the official source always wins.
          </>
        }
      />

      {/* Education-first intro: what / why / next. */}
      <Card className="p-5 mb-6">
        <div className="grid sm:grid-cols-3 gap-5 text-sm">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
              What is this
            </div>
            <p className="text-muted-foreground leading-relaxed">
              A plain-language dictionary of the acronyms and rules you will meet in your first
              year of defense work — networks, information types, clearances, frameworks, and
              the portals you will actually log into.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
              Why it matters
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Solicitations and contract clauses assume you know these words. Misreading one —
              like assuming CUI (Controlled Unclassified Information) needs a clearance, or that
              being a subcontractor exempts you from cyber clauses — leads to expensive decisions.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
              Your next step
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Skim the six categories once so you know what exists, then use search whenever a
              document throws a term at you. Start with CUI, CMMC, and SAM.gov — the three that
              shape everything else.
            </p>
          </div>
        </div>
      </Card>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          className={`${inputClass} pl-9`}
          placeholder="Search terms, acronyms, and definitions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search glossary"
        />
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {(['all', ...GLOSSARY_CATEGORIES] as Array<GlossaryCategory | 'all'>).map((c) => {
          const active = category === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              aria-pressed={active}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                active
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-border/70 text-muted-foreground hover:bg-muted/40'
              }`}
            >
              {c === 'all' ? 'All categories' : c}
            </button>
          );
        })}
      </div>

      {/* A–Z jump */}
      <div className="flex flex-wrap gap-x-1 gap-y-1 mb-6 text-[11px] tabular-nums" aria-label="Jump to letter">
        {ALPHABET.map((l) =>
          availableLetters.has(l) ? (
            <button
              key={l}
              type="button"
              onClick={() => jumpTo(l)}
              className="h-6 w-6 rounded font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            >
              {l}
            </button>
          ) : (
            <span key={l} className="h-6 w-6 rounded text-muted-foreground/40 inline-flex items-center justify-center">
              {l}
            </span>
          ),
        )}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          No terms match &ldquo;{query}&rdquo;
          {category !== 'all' ? <> in {category}</> : null}. Try fewer letters, or clear the
          category filter — acronyms are also searchable by their full expansion.
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.letter} id={`lp-gloss-${g.letter}`} className="scroll-mt-20">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 pl-1">
                {g.letter}
              </h2>
              <div className="space-y-2">
                {g.entries.map((e) => {
                  const isOpen = open === e.term;
                  return (
                    <Card key={e.term} className="p-0">
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? null : e.term)}
                        aria-expanded={isOpen}
                        className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-2 hover:bg-muted/30 transition-colors"
                      >
                        <ChevronRight
                          className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${isOpen ? 'rotate-90' : ''}`}
                        />
                        <span className="font-medium text-sm">{e.term}</span>
                        {e.aka && e.aka.length > 0 && (
                          <span className="text-[11px] text-muted-foreground truncate max-w-[45%]">
                            {e.aka[0]}
                          </span>
                        )}
                        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground whitespace-nowrap">
                          {e.category}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="lp-row-panel border-t border-border/40 bg-muted/20 px-4 py-4">
                          <p className="text-sm leading-relaxed">{e.plain}</p>
                          {e.aka && e.aka.length > 1 && (
                            <p className="text-[11px] text-muted-foreground mt-2">
                              Also seen as: {e.aka.join(' · ')}
                            </p>
                          )}
                          <ul className="mt-3 space-y-1.5">
                            {e.details.map((d, i) => (
                              <li key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-2">
                                <span className="text-emerald-500 shrink-0 mt-0.5">›</span>
                                <span>{d}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-3 rounded-lg border border-sky-500/30 bg-sky-500/5 px-3 py-2">
                            <div className="text-[10px] font-medium uppercase tracking-wide text-sky-600 dark:text-sky-400 mb-0.5">
                              Why it matters to you
                            </div>
                            <p className="text-xs leading-relaxed">{e.whyItMatters}</p>
                          </div>
                          <a
                            href={e.officialSource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 underline underline-offset-2"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Official source: {e.officialSource.label}
                          </a>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground mt-10 pt-4 border-t border-border/40 text-center">
        Educational summaries, not legal advice — verify against the official sources linked.
        {' '}Back to <Link href="/app/launchpad/learn" className="underline underline-offset-2">Learn</Link>.
      </p>
    </div>
  );
}
