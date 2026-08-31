'use client';

/**
 * Capability profile — the input Contract Radar matches against.
 *
 * This page exists because the matching half of Radar could never work without
 * it. `launchpad_capability_profiles` had no writer anywhere in the product:
 * PATCH /api/fusarium/launchpad/company/capabilities was implemented and had
 * zero callers, so the table stayed empty, and an empty table is not a soft
 * failure downstream — lib/launchpad/radar/fit-match.ts returns [] outright
 * when no profile row exists, and lib/launchpad/radar/rank.ts pins fitScore to
 * 0. Alerts fan out from matches, so they were dead too.
 *
 * The practical effect: connecting a SAM.gov key would have produced a list of
 * federal notices with no scoring, no matches and no alerts, and the reason
 * would not have been visible anywhere in the UI.
 *
 * NAICS and set-asides carry the real weight (fit-match.ts:71-100). The other
 * fields are recorded for the operator and for later scoring, and are marked as
 * such rather than implying they do something today.
 *
 * Nothing here is inferred or pre-filled. An empty profile means the customer
 * has not told us their capabilities, and Radar says so instead of guessing.
 */

import { useCallback, useEffect, useState } from 'react';
import { Target, Loader2, Info } from 'lucide-react';
import { PageHeader, Card } from '@/components/launchpad/ui';
import { CompanyTabs } from '@/components/launchpad/company-tabs';
import { GlassButton } from '@/components/ui/glass-button';

const field =
  'myco-glass-field w-full rounded-lg border border-border px-3 py-2.5 text-base ' +
  'focus:outline-none focus:ring-2 focus:ring-emerald-500/40';

/** Server whitelist, mirrored so a typo here cannot silently drop a field. */
type FieldKey =
  | 'naics' | 'set_asides' | 'psc' | 'capabilities'
  | 'target_agencies' | 'exclusions' | 'facility_notes';

const LIST_FIELDS: Array<{
  key: FieldKey;
  label: string;
  hint: string;
  placeholder: string;
  scored: boolean;
}> = [
  {
    key: 'naics',
    label: 'NAICS codes',
    hint: 'Comma separated. This is the strongest matching signal — a notice with no overlap is disqualified rather than ranked low.',
    placeholder: '541715, 541330, 334511',
    scored: true,
  },
  {
    key: 'set_asides',
    label: 'Set-aside eligibility',
    hint: 'Only what you are actually certified for. Claiming one you do not hold produces matches you cannot bid.',
    placeholder: 'SBA, WOSB, HUBZone',
    scored: true,
  },
  {
    key: 'psc',
    label: 'Product / service codes',
    hint: 'Recorded on the profile. Not scored yet.',
    placeholder: 'AC12, 5865',
    scored: false,
  },
  {
    key: 'target_agencies',
    label: 'Target agencies',
    hint: 'Recorded on the profile. Not scored yet.',
    placeholder: 'Navy, DARPA, Air Force',
    scored: false,
  },
  {
    key: 'exclusions',
    label: 'Never show me',
    hint: 'Work you do not want surfaced. Recorded on the profile. Not scored yet.',
    placeholder: 'construction, janitorial',
    scored: false,
  },
];

const TEXT_FIELDS: Array<{ key: FieldKey; label: string; hint: string }> = [
  {
    key: 'capabilities',
    label: 'What you actually do',
    hint: 'Plain description of your technical capability. Public business facts only — never CUI, credentials, or proprietary technical data.',
  },
  {
    key: 'facility_notes',
    label: 'Facility and clearance notes',
    hint: 'Location, cleared space, special equipment. Public facts only. Do not record clearance holder names.',
  },
];

const toList = (v: unknown): string =>
  Array.isArray(v) ? v.join(', ') : typeof v === 'string' ? v : '';

const parseList = (s: string): string[] =>
  s.split(',').map((x) => x.trim()).filter(Boolean);

export default function CapabilityProfilePage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/fusarium/launchpad/company/capabilities', { cache: 'no-store' });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d) {
        setErr(d?.error || 'Could not load your capability profile.');
        setState('error');
        return;
      }
      const data = (d.data ?? {}) as Record<string, unknown>;
      const next: Record<string, string> = {};
      for (const f of LIST_FIELDS) next[f.key] = toList(data[f.key]);
      for (const f of TEXT_FIELDS) next[f.key] = typeof data[f.key] === 'string' ? (data[f.key] as string) : '';
      setValues(next);
      setUpdatedAt(typeof d.updatedAt === 'string' ? d.updatedAt : null);
      setState('ready');
    } catch {
      setErr('Could not reach Launchpad.');
      setState('error');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const set = (k: FieldKey) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const v = e.target.value;
    setValues((s) => ({ ...s, [k]: v }));
    if (saved) setSaved(false);
    if (err) setErr(null);
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    setSaved(false);
    try {
      // Lists go as arrays, prose as strings — the fit matcher reads arrays.
      const body: Record<string, unknown> = {};
      for (const f of LIST_FIELDS) body[f.key] = parseList(values[f.key] ?? '');
      for (const f of TEXT_FIELDS) body[f.key] = (values[f.key] ?? '').trim();

      const r = await fetch('/api/fusarium/launchpad/company/capabilities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(d?.error || 'Could not save your capability profile.');
        return;
      }
      setSaved(true);
      void load();
    } catch {
      setErr('Network error — nothing was saved.');
    } finally {
      setSaving(false);
    }
  }

  const naicsCount = parseList(values.naics ?? '').length;

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 md:py-8">
      <CompanyTabs />
      <PageHeader
        title="Capability profile"
        icon={Target}
        description="What Contract Radar matches federal notices against. Nothing is inferred — an empty profile means Radar can rank nothing, and it will say so rather than guess."
      />

      {state === 'loading' && (
        <div className="min-h-[30vh] flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading your profile…
        </div>
      )}

      {state === 'error' && (
        <Card tone="red" className="p-4">
          <div className="pl-1.5">
            <p className="text-sm text-destructive mb-3">{err}</p>
            <GlassButton onClick={() => { setState('loading'); void load(); }}>Try again</GlassButton>
          </div>
        </Card>
      )}

      {state === 'ready' && (
        <>
          {naicsCount === 0 && (
            <Card tone="amber" className="p-4 mb-5">
              <div className="pl-1.5 flex items-start gap-2 text-sm">
                <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  Without at least one NAICS code, Contract Radar can list notices but cannot score
                  or match them, and no alerts are raised. This is the one field it genuinely needs.
                </span>
              </div>
            </Card>
          )}

          <form onSubmit={save} className="space-y-5">
            <Card className="p-6">
              <div className="pl-1.5 space-y-5">
                {LIST_FIELDS.map((f) => (
                  <div key={f.key}>
                    <label htmlFor={`cap-${f.key}`} className="text-sm font-medium block mb-1.5">
                      {f.label}
                      {f.scored ? (
                        <span className="ml-2 text-[11px] font-normal text-emerald-600 dark:text-emerald-400">
                          used for matching
                        </span>
                      ) : (
                        <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                          recorded, not scored yet
                        </span>
                      )}
                    </label>
                    <input
                      id={`cap-${f.key}`}
                      className={field}
                      value={values[f.key] ?? ''}
                      onChange={set(f.key)}
                      placeholder={f.placeholder}
                      disabled={saving}
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">{f.hint}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <div className="pl-1.5 space-y-5">
                {TEXT_FIELDS.map((f) => (
                  <div key={f.key}>
                    <label htmlFor={`cap-${f.key}`} className="text-sm font-medium block mb-1.5">
                      {f.label}
                    </label>
                    <textarea
                      id={`cap-${f.key}`}
                      rows={3}
                      className={field}
                      value={values[f.key] ?? ''}
                      onChange={set(f.key)}
                      disabled={saving}
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">{f.hint}</p>
                  </div>
                ))}
              </div>
            </Card>

            {err && <p role="status" aria-live="polite" className="text-sm text-destructive">{err}</p>}
            {saved && (
              <p role="status" aria-live="polite" className="text-sm text-emerald-600 dark:text-emerald-400">
                Saved. New notices are matched against this from the next collector run.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <GlassButton type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 text-current mr-2 animate-spin" /> Saving…
                  </>
                ) : (
                  'Save capability profile'
                )}
              </GlassButton>
              {updatedAt && (
                <span className="text-xs text-muted-foreground">
                  Last updated {new Date(updatedAt).toLocaleString()}
                </span>
              )}
            </div>
          </form>
        </>
      )}
    </div>
  );
}
