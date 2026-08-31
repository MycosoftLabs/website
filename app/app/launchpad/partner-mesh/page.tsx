'use client';

import { useCallback, useEffect, useState } from 'react';
import { Network, Loader2, ShieldCheck, Handshake, History } from 'lucide-react';
import { PageHeader, Card, StateBadge } from '@/components/launchpad/ui';
import { FeatureGate, TierTag } from '@/components/launchpad/entitlements';
import { GlassButton } from '@/components/ui/glass-button';
import { LiquidCheckbox } from '@/components/launchpad/liquid';

/**
 * Partner Mesh — the OPT-IN path to integrate a customer's robotics, sensors,
 * software, data, AI, or hardware into the FUSARIUM ecosystem.
 *
 * Two hard boundaries this screen enforces visually and in flow:
 *  1. The capability profile is PRIVATE workspace data. Saving it shares
 *     nothing with anyone.
 *  2. Consent is an append-only ledger: granting adds a row, revoking adds a
 *     NEW row — history is never edited. Current state is the latest row per
 *     scope, rendered from the ledger itself.
 */

const FIELD = 'myco-glass-field w-full rounded-lg border border-border px-3 py-2 text-sm';

interface ConsentRow {
  id: string;
  scope: string;
  purpose: string;
  granted_at: string;
  revoked_at: string | null;
}

const DOMAIN_OPTIONS = [
  { key: 'robotics', label: 'Robotics', hint: 'autonomous platforms, actuation, control' },
  { key: 'sensors', label: 'Sensors', hint: 'environmental, acoustic, optical, RF sensing' },
  { key: 'software', label: 'Software', hint: 'applications, firmware, simulation, tooling' },
  { key: 'data', label: 'Data', hint: 'datasets, pipelines, geospatial, telemetry' },
  { key: 'ai', label: 'AI / ML', hint: 'models, inference, perception, analytics' },
  { key: 'hardware', label: 'Hardware', hint: 'boards, enclosures, power, manufacturing' },
];

const INTEREST_OPTIONS = [
  { key: 'api_integration', label: 'API integration', hint: 'connect your product to FUSARIUM interfaces' },
  { key: 'data_exchange', label: 'Data exchange', hint: 'feed or consume ecosystem data streams' },
  { key: 'hardware_integration', label: 'Hardware integration', hint: 'physical payloads, mounts, interconnects' },
  { key: 'joint_proposals', label: 'Joint proposals', hint: 'team on government opportunities together' },
  { key: 'pilot_deployment', label: 'Pilot deployment', hint: 'field your capability in a FUSARIUM pilot' },
  { key: 'research_collaboration', label: 'Research collaboration', hint: 'shared R&D, papers, prototypes' },
];

const TRL_LEVELS = [
  { value: 1, label: 'TRL 1 — Basic principles observed' },
  { value: 2, label: 'TRL 2 — Technology concept formulated' },
  { value: 3, label: 'TRL 3 — Experimental proof of concept' },
  { value: 4, label: 'TRL 4 — Validated in a lab' },
  { value: 5, label: 'TRL 5 — Validated in a relevant environment' },
  { value: 6, label: 'TRL 6 — Demonstrated in a relevant environment' },
  { value: 7, label: 'TRL 7 — Prototype in an operational environment' },
  { value: 8, label: 'TRL 8 — System complete and qualified' },
  { value: 9, label: 'TRL 9 — Proven in operations' },
];

const SCOPES = [
  {
    key: 'capability_profile',
    title: 'Share the capability profile',
    shares:
      'What is shared: the capability domains, description, TRL, and integration interests you saved above — exactly those fields, nothing else from your workspace.',
  },
  {
    key: 'integration_contact',
    title: 'Integration contact',
    shares:
      'What is shared: permission for the FUSARIUM team to contact your workspace owners about specific integration matches. No readiness, evidence, or billing data is included.',
  },
];

export default function PartnerMeshPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [consents, setConsents] = useState<ConsentRow[]>([]);

  // Capability profile form
  const [domains, setDomains] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [trl, setTrl] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [profileSavedAt, setProfileSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);

  // Consent flow (per scope)
  const [purposes, setPurposes] = useState<Record<string, string>>({});
  const [affirmed, setAffirmed] = useState<Record<string, boolean>>({});
  const [acting, setActing] = useState<string | null>(null);
  const [consentErr, setConsentErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/fusarium/launchpad/partner-mesh', { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) { setErr(d?.error || `HTTP ${r.status}`); return; }
      setErr(null);
      setConsents(Array.isArray(d.consents) ? d.consents : []);
      if (d.profile) {
        setDomains(Array.isArray(d.profile.domains) ? d.profile.domains : []);
        setDescription(typeof d.profile.description === 'string' ? d.profile.description : '');
        setTrl(d.profile.trl ? String(d.profile.trl) : '');
        setInterests(Array.isArray(d.profile.interests) ? d.profile.interests : []);
        setProfileSavedAt(d.profile.updated_at ?? null);
      }
    } catch { setErr('Could not load Partner Mesh'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Ledger semantics: rows arrive newest-first; the first row for a scope IS
  // its current state (a revocation is a row with revoked_at set).
  const latestFor = (scope: string) => consents.find((c) => c.scope === scope);
  const isActive = (scope: string) => { const l = latestFor(scope); return Boolean(l) && !l!.revoked_at; };
  const anyActive = SCOPES.some((s) => isActive(s.key));

  const toggle = (list: string[], set: (v: string[]) => void, key: string, on: boolean) => {
    set(on ? [...new Set([...list, key])] : list.filter((k) => k !== key));
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setSaveNote(null);
    try {
      const r = await fetch('/api/fusarium/launchpad/partner-mesh', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains, description, trl: trl ? Number(trl) : null, interests }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setSaveNote(d?.error || 'Save failed'); return; }
      setSaveNote('Profile saved. It stays private to this workspace until you grant sharing consent below.');
      await load();
    } catch { setSaveNote('Save failed'); }
    finally { setSaving(false); }
  };

  const act = async (action: 'grant' | 'revoke', scope: string) => {
    setActing(`${action}:${scope}`); setConsentErr(null);
    try {
      const r = await fetch('/api/fusarium/launchpad/partner-mesh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, scope, purpose: purposes[scope] || undefined }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setConsentErr(d?.error || `HTTP ${r.status}`); return; }
      setPurposes((x) => ({ ...x, [scope]: '' }));
      setAffirmed((x) => ({ ...x, [scope]: false }));
      await load();
    } catch { setConsentErr('Could not record the consent change'); }
    finally { setActing(null); }
  };

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin text-current" /> Loading Partner Mesh…
    </div>;
  }

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <PageHeader
        title="Partner Mesh"
        icon={Network}
        description="An opt-in path to integrate your robotics, sensors, software, data, AI, or hardware into the FUSARIUM ecosystem. Everything here is off until you affirmatively turn it on."
        actions={<TierTag feature="partnerMesh" />}
      />

      <FeatureGate feature="partnerMesh">
        {/* Education-first intro */}
        <Card className="p-5 mb-6">
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">What is this</div>
              <p className="text-muted-foreground leading-relaxed">
                Partner Mesh is a capability directory inside the FUSARIUM ecosystem. You describe what your
                company builds; if you later choose to share it, the FUSARIUM team can match you with
                integrations and teaming opportunities.
              </p>
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Why it matters</div>
              <p className="text-muted-foreground leading-relaxed">
                Defense programs rarely buy a lone component — they buy integrated capability. Small companies
                win by plugging into a larger system. Being discoverable to the right integrator is how that
                starts.
              </p>
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Your next step</div>
              <p className="text-muted-foreground leading-relaxed">
                Fill in the capability profile below — it stays private. Then decide, separately and
                explicitly, whether to grant sharing consent. You can revoke at any time.
              </p>
            </div>
          </div>
        </Card>

        {/* The boundary, stated prominently */}
        <Card tone={anyActive ? 'emerald' : 'sky'} className="p-5 mb-6">
          <div className="pl-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <ShieldCheck className={`h-5 w-5 shrink-0 ${anyActive ? 'text-emerald-500' : 'text-sky-500'}`} />
              <p className="text-sm font-semibold">
                No tenant data reaches Partner Mesh before affirmative opt-in.
              </p>
              <StateBadge tone={anyActive ? 'emerald' : 'slate'}>
                {anyActive ? 'Consent active — scoped sharing on' : 'Not opted in — nothing is shared'}
              </StateBadge>
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Consent (an explicit, recorded permission) is scoped: each grant names exactly what is shared and
              why. The record below is an append-only ledger — revoking adds a new entry rather than editing
              history, so what was shared, when, is always reconstructable.
            </p>
          </div>
        </Card>

        {err && <p className="text-sm text-destructive mb-4">{err}</p>}

        {/* Capability profile */}
        <Card className="p-5 mb-6">
          <h2 className="text-base font-semibold flex items-center gap-2 mb-1">
            <Handshake className="h-4 w-4 text-emerald-500" /> Capability profile
          </h2>
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            Private to this workspace. Saving here shares nothing — it only prepares what <em>would</em> be
            shared if you opt in below.
            {profileSavedAt && <span className="tabular-nums"> Last saved {new Date(profileSavedAt).toLocaleString()}.</span>}
          </p>

          <form onSubmit={saveProfile} className="space-y-5">
            <div role="group" aria-labelledby="pm-domains-label">
              {/* Not a <label>: it names a set of checkboxes, and htmlFor would
                  arbitrarily bind the heading to whichever one came first. */}
              <div id="pm-domains-label" className="text-sm font-medium block mb-2">Capability domains</div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2">
                {DOMAIN_OPTIONS.map((d) => (
                  <LiquidCheckbox
                    key={d.key}
                    checked={domains.includes(d.key)}
                    onChange={(on) => toggle(domains, setDomains, d.key, on)}
                    label={<span>{d.label} <span className="text-muted-foreground">— {d.hint}</span></span>}
                  />
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="pm-description" className="text-sm font-medium block mb-1">What you build (plain English)</label>
              <textarea
                id="pm-description"
                className={FIELD}
                rows={4}
                maxLength={2000}
                placeholder="e.g. Ruggedized environmental sensor nodes with LoRa mesh networking and an onboard anomaly-detection model…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pm-trl" className="text-sm font-medium block mb-1">Technology maturity</label>
                <select id="pm-trl" className={FIELD} value={trl} onChange={(e) => setTrl(e.target.value)}>
                  <option value="">Not sure yet</option>
                  {TRL_LEVELS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                  TRL (Technology Readiness Level) is the government&apos;s 1–9 maturity scale: 1 is basic
                  research, 9 is proven in real operations. Buyers ask for it constantly — an honest number
                  beats an optimistic one.
                </p>
              </div>
              <div role="group" aria-labelledby="pm-interests-label">
                <div id="pm-interests-label" className="text-sm font-medium block mb-2">Integration interests</div>
                <div className="grid gap-y-2">
                  {INTEREST_OPTIONS.map((i) => (
                    <LiquidCheckbox
                      key={i.key}
                      checked={interests.includes(i.key)}
                      onChange={(on) => toggle(interests, setInterests, i.key, on)}
                      label={<span>{i.label} <span className="text-muted-foreground">— {i.hint}</span></span>}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <GlassButton type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save profile (stays private)'}
              </GlassButton>
              {saveNote && <p className="text-xs text-muted-foreground">{saveNote}</p>}
            </div>
          </form>
        </Card>

        {/* Consent flow */}
        <h2 className="text-base font-semibold mb-2">Sharing consent</h2>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed max-w-3xl">
          Each scope is granted and revoked independently. Granting requires a written purpose and an explicit
          affirmation; both actions are recorded in the ledger and the workspace audit trail.
        </p>
        {consentErr && <p className="text-sm text-destructive mb-3">{consentErr}</p>}

        <div className="grid lg:grid-cols-2 gap-4 mb-8">
          {SCOPES.map((s) => {
            const active = isActive(s.key);
            const latest = latestFor(s.key);
            return (
              <Card key={s.key} tone={active ? 'emerald' : 'slate'} className="p-5">
                <div className="pl-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <span className="text-sm font-semibold">{s.title}</span>
                    <StateBadge tone={active ? 'emerald' : 'slate'}>
                      {active ? 'Granted' : 'Not granted'}
                    </StateBadge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">{s.shares}</p>

                  {active ? (
                    <div className="space-y-3">
                      {latest && (
                        <p className="text-xs text-muted-foreground">
                          Purpose on record: <span className="text-foreground">{latest.purpose}</span>
                          <span className="tabular-nums"> · granted {new Date(latest.granted_at).toLocaleDateString()}</span>
                        </p>
                      )}
                      <GlassButton
                        onClick={() => act('revoke', s.key)}
                        disabled={acting === `revoke:${s.key}`}
                      >
                        {acting === `revoke:${s.key}` ? 'Revoking…' : 'Revoke sharing'}
                      </GlassButton>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        Revoking appends a revocation entry and stops sharing under this scope going forward.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        {/* One purpose field renders per scope, so the id is keyed on
                            the scope — a literal id would collide and silently break
                            label association for every card after the first. */}
                        <label htmlFor={`pm-purpose-${s.key}`} className="text-xs font-medium block mb-1">Purpose (why you are opting in)</label>
                        <textarea
                          id={`pm-purpose-${s.key}`}
                          className={FIELD}
                          rows={2}
                          maxLength={500}
                          placeholder="e.g. We want FUSARIUM integrators to discover our sensor line for teaming."
                          value={purposes[s.key] ?? ''}
                          onChange={(e) => setPurposes((x) => ({ ...x, [s.key]: e.target.value }))}
                        />
                      </div>
                      <LiquidCheckbox
                        checked={affirmed[s.key] ?? false}
                        onChange={(on) => setAffirmed((x) => ({ ...x, [s.key]: on }))}
                        label={<span className="text-xs">I am authorized for this workspace and affirmatively opt in to this scope.</span>}
                      />
                      <GlassButton
                        onClick={() => act('grant', s.key)}
                        disabled={!(affirmed[s.key] && (purposes[s.key] ?? '').trim()) || acting === `grant:${s.key}`}
                      >
                        {acting === `grant:${s.key}` ? 'Recording…' : 'Grant consent'}
                      </GlassButton>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Ledger */}
        <h2 className="text-base font-semibold flex items-center gap-2 mb-2">
          <History className="h-4 w-4 text-muted-foreground" /> Consent ledger
        </h2>
        {consents.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No consent has ever been recorded — nothing is shared. Grant a scope above to create the first
              ledger entry.
            </p>
          </Card>
        ) : (
          <Card className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border/70">
                    <th className="px-4 py-2.5 font-medium">Event</th>
                    <th className="px-4 py-2.5 font-medium">Scope</th>
                    <th className="px-4 py-2.5 font-medium">Purpose</th>
                    <th className="px-4 py-2.5 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {consents.map((c) => (
                    <tr key={c.id} className="border-b border-border/40 last:border-0">
                      <td className="px-4 py-2.5">
                        <StateBadge tone={c.revoked_at ? 'red' : 'emerald'}>
                          {c.revoked_at ? 'Revoked' : 'Granted'}
                        </StateBadge>
                      </td>
                      <td className="px-4 py-2.5"><code className="text-[11px]">{c.scope}</code></td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[22rem]">{c.purpose}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        {new Date(c.revoked_at ?? c.granted_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
        <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
          Append-only: revocations are new entries, never edits — the full history stays reconstructable.
        </p>
      </FeatureGate>
    </div>
  );
}
