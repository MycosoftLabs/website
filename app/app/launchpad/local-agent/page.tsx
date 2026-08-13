'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Laptop, Loader2, RefreshCw, ShieldAlert, ShieldCheck, Lock,
  ClipboardCheck, FileSearch, FileText, Cpu, Radar, Inbox,
  KeyRound, Plug, Bot, ListChecks, ArrowRight, Terminal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageHeader, Card, StateBadge, type Tone } from '@/components/launchpad/ui';
import { FeatureGate, TierTag } from '@/components/launchpad/entitlements';
import { GlassButton } from '@/components/ui/glass-button';

/**
 * MYCA Local Harness — the customer-installed local orchestrator console.
 *
 * The harness is not a bare check-runner: it is a local MYCA orchestrator that
 * runs on the customer's own machine with subagents working under it,
 * multi-agent style, against this Launchpad workspace. It uses the customer's
 * own AI keys locally (BYO privacy) so prompts, files, and raw system data
 * never leave the machine; only sanitized results, hashes, and drafts sync up
 * (the results table has nowhere to put raw logs — see
 * launchpad_local_check_results). The harness ships as Python source in
 * services/launchpad-myca-harness — all five subagents and all twelve checks
 * run today from source; signed installers are the honest remaining gap. The
 * device list and work queue render real tenant data; nothing is simulated.
 */

interface AgentDevice {
  id: string;
  name: string;
  platform: 'windows' | 'linux' | 'macos' | null;
  status: 'enrolled' | 'active' | 'revoked' | 'expired';
  last_seen_at: string | null;
  created_at: string;
}

const STATUS_TONE: Record<AgentDevice['status'], Tone> = {
  enrolled: 'sky',
  active: 'emerald',
  revoked: 'red',
  expired: 'slate',
};

/** Shape served by GET /api/fusarium/launchpad/tasks ({ tasks }). */
interface QueueTask {
  id: string;
  title: string;
  kind: string;
  status: 'open' | 'in_progress' | 'done' | 'dropped';
  due_at: string | null;
}

const QUEUE_TONE: Record<'open' | 'in_progress', Tone> = {
  open: 'sky',
  in_progress: 'amber',
};

/**
 * The subagent roster the harness ships with. Each role states what it does
 * on the local machine and exactly what syncs to the workspace. All five run
 * today via the Python harness (services/launchpad-myca-harness).
 */
interface SubagentRole {
  name: string;
  icon: LucideIcon;
  does: string;
  syncs: string;
}

const SUBAGENT_ROSTER: SubagentRole[] = [
  {
    name: 'Readiness Agent',
    icon: ClipboardCheck,
    does: 'Reads local check results and drafts control-state suggestions for your requirement register — proposals only, you confirm each one.',
    syncs: 'Suggested control states as proposals; never a status flip.',
  },
  {
    name: 'Evidence Agent',
    icon: FileSearch,
    does: 'Indexes artifacts on your machine — policies, screenshots, configs — computing hashes and file references locally.',
    syncs: 'Hashes and references only; the content itself never uploads.',
  },
  {
    name: 'Document Agent',
    icon: FileText,
    does: 'Assembles DRAFT policies and SSP inputs from local facts using your own BYO model — your prompts stay on your machine.',
    syncs: 'Documents marked DRAFT; nothing publishes itself.',
  },
  {
    name: 'Systems Check Agent',
    icon: Cpu,
    does: 'Runs the 12 read-only technical checks in the catalog below — disk encryption, firewall, patch posture, and the rest.',
    syncs: 'One sanitized pass/fail result plus a hash per check.',
  },
  {
    name: 'Radar Agent',
    icon: Radar,
    does: 'Screens your matched Contract Radar opportunities against capability notes kept on your local machine.',
    syncs: 'A fit note per opportunity; your capability notes stay local.',
  },
];

/**
 * The check catalog the Systems Check Agent implements. Every row states
 * what a pass actually proves and which NIST SP 800-171 control family (the
 * letter-coded groups CMMC Level 2 requirements are organized into) the result
 * feeds. All twelve run today on the customer's machine via the Python harness.
 */
interface HarnessCheck {
  name: string;
  proves: string;
  family: string;
  familyName: string;
}

const CHECK_CATALOG: HarnessCheck[] = [
  {
    name: 'OS / device inventory',
    proves: 'You can name every machine in scope — the starting point of any assessment.',
    family: 'CM',
    familyName: 'Configuration Management',
  },
  {
    name: 'Patch posture',
    proves: 'Operating-system updates are applied within your stated window, not just promised.',
    family: 'SI',
    familyName: 'System & Information Integrity',
  },
  {
    name: 'Disk encryption',
    proves: 'Data at rest on the device is encrypted (BitLocker / FileVault / LUKS is on).',
    family: 'SC',
    familyName: 'System & Communications Protection',
  },
  {
    name: 'MFA indicators',
    proves: 'Multi-factor authentication (a second proof beyond the password) is configured where the OS exposes it.',
    family: 'IA',
    familyName: 'Identification & Authentication',
  },
  {
    name: 'Firewall',
    proves: 'The host firewall is enabled and enforcing — the device boundary is defended.',
    family: 'SC',
    familyName: 'System & Communications Protection',
  },
  {
    name: 'Endpoint protection',
    proves: 'Anti-malware is installed, running, and current on the device.',
    family: 'SI',
    familyName: 'System & Information Integrity',
  },
  {
    name: 'Backup status',
    proves: 'A backup mechanism exists and has run recently — recovery is real, not aspirational.',
    family: 'MP',
    familyName: 'Media Protection',
  },
  {
    name: 'Stale accounts',
    proves: 'No local accounts linger past their useful life — access is limited to who needs it now.',
    family: 'AC',
    familyName: 'Access Control',
  },
  {
    name: 'Open services',
    proves: 'Only the ports and services you intend are listening — nonessential services are off.',
    family: 'CM',
    familyName: 'Configuration Management',
  },
  {
    name: 'Logging availability',
    proves: 'The OS is producing audit logs at all — the raw material every audit requirement needs.',
    family: 'AU',
    familyName: 'Audit & Accountability',
  },
  {
    name: 'Wazuh health',
    proves: 'Your SIEM agent (Wazuh is a free, open-source security-monitoring platform) is installed and reporting.',
    family: 'AU',
    familyName: 'Audit & Accountability',
  },
  {
    name: 'NAS health',
    proves: 'Network storage that backups depend on is reachable and healthy.',
    family: 'MP',
    familyName: 'Media Protection',
  },
];

export default function LocalAgentPage() {
  const [devices, setDevices] = useState<AgentDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [queue, setQueue] = useState<QueueTask[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueErr, setQueueErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/fusarium/launchpad/local-agent/devices', { cache: 'no-store' });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { setDevices(d.devices ?? []); setErr(null); }
      else setErr(d?.error || `HTTP ${r.status}`);
    } catch {
      setErr('Could not load the device list.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadQueue = useCallback(async () => {
    try {
      const r = await fetch('/api/fusarium/launchpad/tasks', { cache: 'no-store' });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        const all: QueueTask[] = d.tasks ?? [];
        setQueue(all.filter((t) => t.status === 'open' || t.status === 'in_progress'));
        setQueueErr(null);
      } else setQueueErr(d?.error || `HTTP ${r.status}`);
    } catch {
      setQueueErr('Could not load the work queue.');
    } finally {
      setQueueLoading(false);
    }
  }, []);

  useEffect(() => { load(); loadQueue(); }, [load, loadQueue]);

  const refresh = () => { setRefreshing(true); load(); loadQueue(); };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-current" /> Loading MYCA Local Harness…
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <PageHeader
        title="MYCA Local Harness"
        icon={Laptop}
        description={
          <>Your local multi-agent operator — runs on your machine, works your Launchpad queue.</>
        }
        actions={
          <>
            <TierTag feature="localAgent" />
            <GlassButton onClick={refresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 text-current mr-2 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </GlassButton>
          </>
        }
      />

      <FeatureGate feature="localAgent">
        {/* What the harness is: local orchestrator, BYO privacy, sanitized sync */}
        <Card className="p-5 mb-6">
          <div className="grid sm:grid-cols-3 gap-5">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">What is this</div>
              <p className="text-sm leading-relaxed">
                A customer-installed orchestrator that runs on your own computer with a roster of
                subagents working under it — reading your Launchpad work queue and doing the legwork
                locally, multi-agent style.
              </p>
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">BYO privacy</div>
              <p className="text-sm leading-relaxed">
                It uses <span className="font-medium">your</span> AI keys, locally. Prompts, files,
                and raw system data never leave your machine — the model calls happen on your
                hardware, against your provider account.
              </p>
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">What syncs up</div>
              <p className="text-sm leading-relaxed">
                Only sanitized results, cryptographic hashes, and clearly-marked drafts sync to this
                workspace — and every one of them lands as a proposal for a person to review, never
                a change that applies itself.
              </p>
            </div>
          </div>
        </Card>

        {/* Subagent roster — all five implemented in the Python harness */}
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Bot className="h-4 w-4" /> Subagent roster
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
          {SUBAGENT_ROSTER.map((a) => (
            <Card key={a.name} className="p-4 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <a.icon className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-sm font-semibold">{a.name}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{a.does}</p>
              <p className="text-[11px] text-muted-foreground mt-2">
                <span className="font-medium uppercase tracking-wide">Syncs:</span> {a.syncs}
              </p>
              {a.name === 'Systems Check Agent' && (
                <a href="#check-catalog" className="text-[11px] text-sky-500 hover:underline inline-flex items-center gap-1 mt-1.5">
                  <ListChecks className="h-3 w-3" /> See the full check catalog below
                </a>
              )}
              <div className="mt-3">
                <StateBadge tone="emerald">runs locally via the MYCA harness</StateBadge>
              </div>
            </Card>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mb-8">
          All five subagents are implemented in the Python harness and run on your machine.
          Runs from source today — signed installers are coming. No activity is simulated on
          this page.
        </p>

        {/* The security model, quoted plainly */}
        <Card tone="sky" className="p-5 mb-6">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-3 pl-1.5">
            <ShieldCheck className="h-4 w-4 text-sky-500" /> The security model, plainly
          </h2>
          <ul className="space-y-2 text-sm pl-1.5">
            <li className="flex gap-2">
              <span className="text-sky-500 shrink-0">1.</span>
              <span><span className="font-medium">You install it, you control it.</span> The harness runs on your hardware under your account. Enrollment, revocation, and the kill switch are yours.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-sky-500 shrink-0">2.</span>
              <span><span className="font-medium">Checks are read-only.</span> The Systems Check Agent inspects settings; it never changes them, installs anything, or opens ports.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-sky-500 shrink-0">3.</span>
              <span><span className="font-medium">Raw data stays local.</span> Logs, configuration bodies, prompts, and packet captures never leave your device — the cloud schema has nowhere to put them.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-sky-500 shrink-0">4.</span>
              <span><span className="font-medium">The cloud gets sanitized results + hashes only.</span> One pass/fail/indeterminate result, one plain-English summary sentence, and a cryptographic hash (a fingerprint of the local detail — the detail itself stays with you).</span>
            </li>
            <li className="flex gap-2">
              <span className="text-sky-500 shrink-0">5.</span>
              <span><span className="font-medium">No credentials are stored.</span> Enrollment tokens and signing keys are kept as hashes only — there is no plaintext secret column anywhere. Your BYO AI key never transits this workspace.</span>
            </li>
          </ul>
        </Card>

        {/* Hard rule: a subagent never marks anything implemented */}
        <Card tone="amber" className="p-5 mb-8">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-2 pl-1.5">
            <ShieldAlert className="h-4 w-4 text-amber-500" /> Hard rule: the harness proposes, you confirm
          </h2>
          <p className="text-sm leading-relaxed pl-1.5">
            An agent check can <span className="font-semibold">never</span> mark a requirement
            implemented. A passing check is a proposal — supporting signal attached to the
            requirement it feeds. The same rule binds every subagent in the roster: drafts stay
            drafts, suggestions stay suggestions. Only you, a person at your company, can review
            that signal and record a requirement as customer-marked implemented. Automated tooling
            that flips compliance statuses on its own is exactly the kind of shortcut an assessor
            will unwind. This rule is enforced in the harness code itself — every proposal is
            forced to <code className="text-[11px] px-1 py-0.5 rounded bg-muted">control_flip=False</code> before
            it can sync, and the sanitizer rejects anything that claims otherwise.
          </p>
        </Card>

        {/* Work queue — real tenant tasks the harness will pick up */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Work queue</h2>
          <Link href="/app/launchpad/tasks" className="text-xs text-sky-500 hover:underline inline-flex items-center gap-1">
            All tasks <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <Card className="p-5 mb-8">
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            These are the real open and in-progress tasks in your workspace — the same queue the
            harness pulls when it runs on your machine. This list is workspace data, not agent
            activity.
          </p>
          {queueLoading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-current" /> Loading the queue…
            </p>
          ) : queueErr ? (
            <p className="text-sm text-destructive">{queueErr}</p>
          ) : queue.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No open or in-progress tasks — the queue is empty. Add tasks on the{' '}
              <Link href="/app/launchpad/tasks" className="text-sky-500 hover:underline not-italic">Tasks page</Link>{' '}
              and they will appear here as work the harness can pick up.
            </p>
          ) : (
            <div className="space-y-2">
              {queue.map((t) => (
                <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border/50 px-3 py-2.5">
                  <span className="font-medium text-sm min-w-0">{t.title}</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">{t.kind}</span>
                  <StateBadge tone={QUEUE_TONE[t.status as 'open' | 'in_progress'] ?? 'slate'}>
                    {t.status === 'in_progress' ? 'in progress' : t.status}
                  </StateBadge>
                  <span className="text-xs text-muted-foreground ml-auto tabular-nums">
                    {t.due_at ? `due ${new Date(t.due_at).toLocaleDateString()}` : 'no due date'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Approval inbox — the human gate, honestly empty */}
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Inbox className="h-4 w-4" /> Approval inbox
          </h2>
        </div>
        <Card className="p-5 mb-8">
          <p className="text-sm leading-relaxed mb-3">
            Every subagent action lands here as a <span className="font-medium">proposal</span> — a
            suggested control state, an indexed evidence reference, a draft document, a check
            result, a screened opportunity. Nothing self-applies: a person at your company reviews
            each proposal and accepts or rejects it, and that decision is what changes the
            workspace.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            On your machine, proposals land in the local inbox first — run{' '}
            <code className="text-[11px] px-1 py-0.5 rounded bg-muted">python -m launchpad_myca_harness inbox</code>{' '}
            to see them — and sync up only as sanitized one-sentence summaries pending{' '}
            <span className="font-medium">your</span> approval. When your harness syncs its first
            results, they will queue here.
          </p>
        </Card>

        {/* How it connects — the real contracts, in order */}
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Plug className="h-4 w-4" /> How it connects
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-semibold text-emerald-500">1</span>
              <Laptop className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Enroll a device</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              An owner or admin enrolls each machine using the live enrollment contract — a
              one-time token, stored as a hash. Device caps follow your plan.
            </p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-semibold text-emerald-500">2</span>
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Mint a workspace API key</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Create a tenant-scoped key in{' '}
              <Link href="/app/launchpad/settings/keys" className="text-sky-500 hover:underline">Settings → API keys</Link>.
              The secret shows once; the workspace keeps only a hash.
            </p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-semibold text-emerald-500">3</span>
              <Bot className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Connect your BYO AI key</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Point the harness at your own AI provider in{' '}
              <Link href="/app/launchpad/settings/integrations" className="text-sky-500 hover:underline">Settings → AI integrations</Link>{' '}
              — your key, your account, used locally.
            </p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-semibold text-emerald-500">4</span>
              <Plug className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Harness pulls the queue</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The harness reads your queue through the same MCP surface tools like Cursor use —
              workspace keys are read-only, so every write still goes through a signed-in person.
            </p>
          </Card>
        </div>

        {/* Quick start — the real run-from-source path, step by step */}
        <Card tone="emerald" className="p-5 mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-3 pl-1.5">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Quick start
            </h2>
            <StateBadge tone="emerald">runs from source today</StateBadge>
            <StateBadge tone="slate">signed installers are coming</StateBadge>
          </div>
          <ol className="space-y-4 text-sm pl-1.5">
            <li className="flex gap-2">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">1.</span>
              <span>
                <span className="font-medium">Enroll this workspace.</span> An owner or admin runs
                the existing enroll flow (the live enrollment contract above) and copies the{' '}
                <code className="text-[11px] px-1 py-0.5 rounded bg-muted">agent.id</code> — the
                one-time token shows once and is stored as a hash.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">2.</span>
              <span>
                <span className="font-medium">Mint a workspace API key with the agent scope</span> in{' '}
                <Link href="/app/launchpad/settings/keys" className="text-sky-500 hover:underline">Settings → API keys</Link>.
                The <code className="text-[11px] px-1 py-0.5 rounded bg-muted">lp_</code> secret
                shows once; the workspace keeps only a hash.
              </span>
            </li>
            <li>
              <div className="flex gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">3.</span>
                <span><span className="font-medium">On your machine</span> (Python 3.11+, no extra packages):</span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-border bg-muted/40 mt-2 ml-5">
                <pre className="p-3 text-xs leading-relaxed"><code>{'cd services/launchpad-myca-harness\npython -m launchpad_myca_harness init'}</code></pre>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mt-2 ml-5">
                Edit <code className="text-[11px] px-1 py-0.5 rounded bg-muted">~/.launchpad-myca/config.json</code> —
                set <code className="text-[11px] px-1 py-0.5 rounded bg-muted">agent_id</code>, your{' '}
                <code className="text-[11px] px-1 py-0.5 rounded bg-muted">lp_</code> key, and optionally{' '}
                <code className="text-[11px] px-1 py-0.5 rounded bg-muted">byo_ai.api_key</code>{' '}
                (your AI key <span className="font-medium">never</span> leaves your machine). Then:
              </p>
              <div className="overflow-x-auto rounded-lg border border-border bg-muted/40 mt-2 ml-5">
                <pre className="p-3 text-xs leading-relaxed"><code>{'python -m launchpad_myca_harness once'}</code></pre>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mt-2 ml-5">
                — or <code className="text-[11px] px-1 py-0.5 rounded bg-muted">run</code> for
                continuous polling. Windows helper:{' '}
                <code className="text-[11px] px-1 py-0.5 rounded bg-muted">.\scripts\launchpad\run-myca-harness.ps1 once</code>
              </p>
            </li>
          </ol>
          <p className="text-sm leading-relaxed mt-4 pl-1.5">
            Proposals land in the local inbox first (
            <code className="text-[11px] px-1 py-0.5 rounded bg-muted">python -m launchpad_myca_harness inbox</code>
            ) and sync to this workspace as sanitized one-sentence summaries pending{' '}
            <span className="font-medium">your</span> approval.
          </p>
        </Card>

        {/* Enrolled devices — real tenant data, honest empty */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Enrolled devices</h2>
          <span className="text-xs text-muted-foreground tabular-nums">{devices.length} enrolled</span>
        </div>
        {err && <p className="text-sm text-destructive mb-4">{err}</p>}
        {devices.length === 0 ? (
          <Card className="p-8 text-center mb-8">
            <p className="text-sm text-muted-foreground">
              No devices enrolled yet. Follow the connect steps above — the harness runs from source
              today (signed installers are coming), and once it checks in, the device appears here
              with its platform, status, and last check-in time.
            </p>
          </Card>
        ) : (
          <div className="space-y-2 mb-8">
            {devices.map((d) => (
              <Card key={d.id} tone={STATUS_TONE[d.status]} className="p-4">
                <div className="flex flex-wrap items-center gap-3 pl-1.5">
                  <span className="font-medium text-sm">{d.name}</span>
                  {d.platform && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">{d.platform}</span>
                  )}
                  <StateBadge tone={STATUS_TONE[d.status]}>{d.status}</StateBadge>
                  <span className="text-xs text-muted-foreground ml-auto tabular-nums">
                    {d.last_seen_at
                      ? `last seen ${new Date(d.last_seen_at).toLocaleString()}`
                      : `enrolled ${new Date(d.created_at).toLocaleDateString()} · never checked in`}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Planned checks */}
        <div id="check-catalog" className="flex flex-wrap items-center gap-2 mb-3 scroll-mt-24">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Check catalog</h2>
          <StateBadge tone="emerald">implemented in the harness — runs on your machine, results arrive sanitized</StateBadge>
        </div>
        <Card className="mb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left">
                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground whitespace-nowrap">Check</th>
                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">What a pass proves</th>
                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground whitespace-nowrap">Feeds family</th>
                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {CHECK_CATALOG.map((c) => (
                  <tr key={c.name} className="border-b border-border/40 last:border-0 align-top">
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{c.name}</td>
                    <td className="px-4 py-3 text-muted-foreground leading-relaxed">{c.proves}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <code className="text-[11px] px-1.5 py-0.5 rounded bg-muted font-semibold">{c.family}</code>
                      <span className="block text-[11px] text-muted-foreground mt-1">{c.familyName}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StateBadge tone="emerald">available</StateBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
          <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          A control family is one of the letter-coded groups (AC, AU, CM…) that NIST SP 800-171 —
          the standard behind CMMC Level 2 — organizes its requirements into. A check feeding a
          family gives you supporting signal for requirements in that family; it does not satisfy
          any requirement by itself.
        </p>
      </FeatureGate>
    </div>
  );
}
