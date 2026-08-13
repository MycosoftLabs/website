'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Landmark, Loader2, RotateCcw, ShieldAlert, Terminal, Link2 } from 'lucide-react';
import { PageHeader, Card, StateBadge, SegmentBar } from '@/components/launchpad/ui';
import { FeatureGate, TierTag } from '@/components/launchpad/entitlements';
import { LiquidCheckbox } from '@/components/launchpad/liquid';
import { VendorMark } from '@/components/launchpad/vendor-mark';
import { GlassButton } from '@/components/ui/glass-button';
import { OfficialLinksPanel } from '@/components/launchpad/official-links';
import { COMMERCIAL_NON_CUI_BANNER } from '@/lib/launchpad/constants';
import {
  ENCLAVE_PROVIDER_OPTIONS,
  PROVIDER_DISCLAIMER,
  RESPONSIBILITY_MATRIX,
  SETUP_CHECKLIST,
  HARDWARE_CHECKLIST,
  LOGGING_CHECKLIST,
  WAZUH_EXAMPLES,
  CUI_BOUNDARY_EXAMPLE,
  type WorkbookStep,
} from '@/lib/launchpad/enclave-content';

/**
 * Enclave Bridge — the "stand up your CUI enclave" workbook.
 *
 * Launchpad itself is a COMMERCIAL // NON-CUI workspace: nothing on this page
 * creates a place to put CUI. The page teaches what an enclave is, who owns
 * which responsibility, and walks through provider setup / hardware / logging
 * checklists a founder can actually complete.
 *
 * Checklist persistence: checked state is saved to localStorage, keyed by the
 * tenant id fetched from /api/fusarium/launchpad/tenant, so two workspaces on
 * the same browser never share progress. Server-side persistence lands with
 * the tasks integration — until then progress is per-browser, and the page
 * says so rather than pretending otherwise.
 */

const STORAGE_PREFIX = 'lp-enclave-workbook:';

/**
 * Interim favicon marks per Morgan's Aug 13 directive (over GTM §18.1's
 * no-logo default). Marks identify a provider — never endorsement; the
 * PROVIDER_DISCLAIMER below stays authoritative. Unmapped options (e.g.
 * self-hosted) render the neutral monogram.
 */
const PROVIDER_MARK_DOMAINS: Record<string, string> = {
  'PreVeil': 'preveil.com',
  'Microsoft 365 GCC High': 'microsoft.com',
  'AWS GovCloud / Azure Government': 'aws.amazon.com',
  'Google Assured Workloads': 'workspace.google.com',
};

const ALL_STEPS: WorkbookStep[] = [...SETUP_CHECKLIST, ...HARDWARE_CHECKLIST, ...LOGGING_CHECKLIST];

function ChecklistSection({
  title,
  intro,
  steps,
  ordered,
  checked,
  onToggle,
}: {
  title: string;
  intro: string;
  steps: WorkbookStep[];
  ordered?: boolean;
  checked: Record<string, boolean>;
  onToggle: (id: string, value: boolean) => void;
}) {
  return (
    <Card className="p-5 mb-6">
      <h2 className="text-sm font-semibold mb-1">{title}</h2>
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{intro}</p>
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={s.id} className="flex items-start gap-3">
            {ordered && (
              <span className="mt-1 h-5 w-5 shrink-0 rounded-full border border-border text-[10px] font-semibold tabular-nums flex items-center justify-center text-muted-foreground">
                {i + 1}
              </span>
            )}
            <LiquidCheckbox
              id={s.id}
              checked={!!checked[s.id]}
              onChange={(v) => onToggle(s.id, v)}
              label={
                <span className="block">
                  <span className={`text-sm font-medium ${checked[s.id] ? 'line-through opacity-60' : ''}`}>{s.title}</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded border border-border text-muted-foreground ml-2 align-middle">{s.role}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.detail}</span>
                  {s.evidenceHint && (
                    <span className="block text-[11px] text-muted-foreground mt-0.5">
                      Evidence to capture: <span className="italic">{s.evidenceHint}</span>
                    </span>
                  )}
                </span>
              }
            />
          </li>
        ))}
      </ol>
    </Card>
  );
}

export default function EnclavePage() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Resolve the tenant, then hydrate this workspace's saved progress.
  useEffect(() => {
    let alive = true;
    fetch('/api/fusarium/launchpad/tenant', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        const id = typeof d?.tenant?.id === 'string' ? d.tenant.id : null;
        setTenantId(id);
        if (id) {
          try {
            const raw = window.localStorage.getItem(STORAGE_PREFIX + id);
            if (raw) setChecked(JSON.parse(raw));
          } catch {
            /* unreadable saved state — start fresh */
          }
        }
      })
      .catch(() => { /* no tenant — checklist still renders, unsaved */ })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const toggle = useCallback((id: string, value: boolean) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: value };
      if (tenantId) {
        try { window.localStorage.setItem(STORAGE_PREFIX + tenantId, JSON.stringify(next)); } catch { /* storage full/blocked */ }
      }
      return next;
    });
  }, [tenantId]);

  const reset = useCallback(() => {
    setChecked({});
    if (tenantId) {
      try { window.localStorage.removeItem(STORAGE_PREFIX + tenantId); } catch { /* ignore */ }
    }
  }, [tenantId]);

  const done = useMemo(() => ALL_STEPS.filter((s) => checked[s.id]).length, [checked]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-current" /> Loading Enclave Bridge…
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <PageHeader
        title="Enclave Bridge"
        icon={Landmark}
        description={
          <>The workbook for standing up your CUI enclave — the separate, authorized boundary where controlled data actually lives.</>
        }
        actions={
          <>
            <TierTag feature="enclaveBridge" />
            <GlassButton onClick={reset} disabled={done === 0}>
              <RotateCcw className="h-4 w-4 text-current mr-2" /> Reset checklist
            </GlassButton>
          </>
        }
      />

      <FeatureGate feature="enclaveBridge">
        {/* Education first: what / why / next step */}
        <Card className="p-5 mb-6">
          <div className="grid sm:grid-cols-3 gap-5">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">What is this</div>
              <p className="text-sm leading-relaxed">
                A guided workbook for choosing and configuring a CUI enclave. CUI — Controlled
                Unclassified Information — is government data that isn&apos;t classified but must be
                protected by contract; an enclave is the walled-off system where it lives.
              </p>
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">Why it matters</div>
              <p className="text-sm leading-relaxed">
                Defense contracts that touch CUI require you to protect it under NIST SP 800-171 —
                and to say exactly where it lives. A small, well-drawn enclave keeps the rest of
                your company out of assessment scope.
              </p>
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">Your next step</div>
              <p className="text-sm leading-relaxed">
                Read the responsibility matrix, pick a provider path with your contracting officer,
                then work the setup checklist below. Your progress saves in this browser per
                workspace.
              </p>
            </div>
          </div>
        </Card>

        {/* 1. Why an enclave */}
        <Card tone="amber" className="p-5 mb-6">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-2 pl-1.5">
            <ShieldAlert className="h-4 w-4 text-amber-500" /> Why an enclave — and why it can&apos;t be this one
          </h2>
          <p className="text-sm leading-relaxed pl-1.5 mb-3">
            Launchpad is a <span className="font-semibold">{COMMERCIAL_NON_CUI_BANNER}</span>. It runs on
            commercial infrastructure that is not authorized to hold CUI, and it never will hold
            CUI: no uploads, no content, references and hashes only. Handling CUI requires a
            separate boundary that meets DFARS 252.204-7012 (the contract clause that obligates
            you to protect covered defense information) — that boundary is your enclave, and this
            page exists to help you stand one up <span className="italic">outside</span> Launchpad.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 pl-1.5">
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1.5">Inside the enclave (example)</div>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {CUI_BOUNDARY_EXAMPLE.inside.map((x) => <li key={x}>• {x}</li>)}
              </ul>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Outside the boundary (example)</div>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {CUI_BOUNDARY_EXAMPLE.outside.map((x) => <li key={x}>• {x}</li>)}
              </ul>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 pl-1.5 leading-relaxed">{CUI_BOUNDARY_EXAMPLE.rule}</p>
        </Card>

        {/* 2. Provider options + responsibility matrix */}
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Provider options</h2>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          {ENCLAVE_PROVIDER_OPTIONS.map((p) => (
            <Card key={p.name} className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <VendorMark domain={PROVIDER_MARK_DOMAINS[p.name]} name={p.name} size={20} />
                <div className="font-semibold text-sm">{p.name}</div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-2">{p.model}</p>
              <p className="text-xs leading-relaxed mb-1"><span className="font-medium">Best for:</span> {p.bestFor}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{p.note}</p>
            </Card>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mb-6 leading-relaxed">{PROVIDER_DISCLAIMER}</p>

        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Who owns what — the responsibility matrix</h2>
        <Card className="mb-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left">
                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Activity</th>
                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">You (customer)</th>
                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Provider</th>
                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Launchpad</th>
                </tr>
              </thead>
              <tbody>
                {RESPONSIBILITY_MATRIX.map((r) => (
                  <tr key={r.activity} className="border-b border-border/40 last:border-0 align-top">
                    <td className="px-4 py-3 font-medium leading-snug min-w-[10rem]">{r.activity}</td>
                    <td className="px-4 py-3 text-muted-foreground leading-relaxed min-w-[12rem]">{r.customer}</td>
                    <td className="px-4 py-3 text-muted-foreground leading-relaxed min-w-[10rem]">{r.provider}</td>
                    <td className="px-4 py-3 text-muted-foreground leading-relaxed min-w-[10rem]">{r.launchpad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <p className="text-xs text-muted-foreground mb-8 leading-relaxed">
          Read the pattern in the last column: Launchpad is guidance and reference only, every row.
          The real work happens between you and your provider, and the split is formalized in the
          provider&apos;s Customer Responsibility Matrix (CRM) — a signed document listing, requirement
          by requirement, who covers what.
        </p>

        {/* Progress across all three checklists */}
        <Card className="p-5 mb-6">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h2 className="text-sm font-semibold">Workbook progress</h2>
            <span className="text-xs text-muted-foreground tabular-nums">{done} of {ALL_STEPS.length} steps checked</span>
          </div>
          <SegmentBar
            total={ALL_STEPS.length}
            segments={[
              { tone: 'emerald', value: done, label: 'checked off' },
              { tone: 'slate', value: ALL_STEPS.length - done, label: 'remaining' },
            ]}
          />
          <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
            {tenantId
              ? 'Progress saves in this browser for this workspace. Server-side persistence arrives with the tasks integration — checking a box here records your own working state, it does not mark any requirement implemented.'
              : 'No active workspace resolved — you can still read the workbook, but progress will not be saved.'}
          </p>
        </Card>

        {/* 3. Provider setup checklist */}
        <ChecklistSection
          title="Provider setup checklist"
          intro="Generalized from a real enclave provisioning runbook (PreVeil), in the order that works. Screen names differ by provider; the steps do not. Owner = whoever signs for the company; IT lead = whoever administers the machines (in a two-person shop, often the same person wearing two hats)."
          steps={SETUP_CHECKLIST}
          ordered
          checked={checked}
          onToggle={toggle}
        />

        {/* 4. Hardware checklist */}
        <ChecklistSection
          title="Hardware checklist"
          intro="The physical machines that will touch CUI. Small list, big scope consequences: only these devices enter your assessment boundary."
          steps={HARDWARE_CHECKLIST}
          checked={checked}
          onToggle={toggle}
        />

        {/* 5. Logging / Wazuh checklist */}
        <ChecklistSection
          title="Logging & monitoring checklist"
          intro="Audit requirements need logs that exist, persist, and get read. This checklist plus the provider's SIEM connector (step 8 above) covers the collection side."
          steps={LOGGING_CHECKLIST}
          checked={checked}
          onToggle={toggle}
        />

        <Card className="p-5 mb-8">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-1">
            <Terminal className="h-4 w-4 text-muted-foreground" /> Example agent install commands
          </h2>
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            Illustrations of what a Wazuh agent install looks like — <span className="font-medium">examples, not
            instructions</span>. Versions, package sources, and the manager address
            (<code className="text-[11px] px-1 py-0.5 rounded bg-muted">siem.example.internal</code> below) are
            placeholders you must replace for your environment.
          </p>
          <div className="space-y-4">
            {WAZUH_EXAMPLES.map((ex) => (
              <div key={ex.label}>
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">{ex.label}</div>
                <div className="overflow-x-auto rounded-lg border border-border bg-muted/40">
                  <pre className="p-3 text-xs leading-relaxed"><code>{ex.lines.join('\n')}</code></pre>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 6. Enclave connector status — honest */}
        <Card tone="sky" className="p-5">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-2 pl-1.5">
            <Link2 className="h-4 w-4 text-sky-500" /> Enclave connector
            <StateBadge tone="slate">backend pending</StateBadge>
          </h2>
          <p className="text-sm leading-relaxed pl-1.5">
            The metadata-only connector backend is pending. When it ships, you will be able to
            reference items that live in your enclave from inside Launchpad — and Launchpad will
            store <span className="font-medium">title, ID, owner, date, and hash only, never content</span>.
            No OAuth grant, no drive crawl, no import: the enclave stays the sole home of CUI, and
            Launchpad keeps pointers, not copies.
          </p>
        </Card>

        <OfficialLinksPanel surface="enclave" />
      </FeatureGate>
    </div>
  );
}
