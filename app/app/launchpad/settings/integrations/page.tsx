'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Plug, Loader2, AlertTriangle, ShieldCheck, KeyRound, Coins, BookOpen,
} from 'lucide-react';
import { PageHeader, Card, StateBadge } from '@/components/launchpad/ui';
import type { Tone } from '@/components/launchpad/ui';
import { LiquidSwitch } from '@/components/launchpad/liquid';
import { VendorMark } from '@/components/launchpad/vendor-mark';
import { GlassButton } from '@/components/ui/glass-button';

/**
 * Settings → AI integrations.
 *
 * The dual-meter switchboard: Managed AI (Mycosoft's provider keys, metered in
 * AI credits) vs Bring-Your-Own-Key (the customer's provider account, zero
 * credits, keys envelope-encrypted under KMS and unreadable by Mycosoft staff).
 *
 * Honesty rules this screen enforces:
 *  - a full provider key is accepted exactly ONCE (the BYO POST body), cleared
 *    from state the moment submit fires, and never rendered back — key_last4
 *    (displayPrefix) only, shown a single time in a dismissible confirmation
 *  - BYO shows the real custody state; while the KMS service is being
 *    provisioned it says so plainly instead of pretending to connect
 *  - the cost ledger renders only real recorded actions — an empty workspace
 *    renders an honest empty, never sample rows
 */

interface AiConnection {
  id: string;
  provider: string;
  mode: string;
  status: string;
  label: string | null;
  keyLast4: string | null;
  lastVerifiedAt: string | null;
  lastError: string | null;
  createdAt: string;
  revokedAt: string | null;
}

/**
 * The BFF has shipped this list in two casings (snake_case column names and a
 * camelCase public mapping with displayPrefix = '…last4'). Normalize both so
 * the page renders correctly against either — only metadata, never a key.
 */
function normalizeConnection(raw: Record<string, unknown>): AiConnection {
  const prefix = typeof raw.displayPrefix === 'string' ? raw.displayPrefix.replace(/^…/, '') : null;
  return {
    id: String(raw.id ?? ''),
    provider: String(raw.provider ?? ''),
    mode: String(raw.mode ?? ''),
    status: String(raw.status ?? ''),
    label: (raw.label as string) ?? null,
    keyLast4: (raw.key_last4 as string) ?? prefix,
    lastVerifiedAt: (raw.last_verified_at as string) ?? (raw.lastVerifiedAt as string) ?? null,
    lastError: (raw.last_error as string) ?? (raw.lastError as string) ?? null,
    createdAt: (raw.created_at as string) ?? (raw.createdAt as string) ?? '',
    revokedAt: (raw.revoked_at as string) ?? (raw.revokedAt as string) ?? null,
  };
}

interface LedgerRow {
  id: number;
  provider: string;
  model: string;
  task: string;
  byo_key: boolean;
  input_units: number;
  output_units: number;
  credits_charged: number;
  actual_cost_cents: number;
  created_at: string;
}

const API = '/api/fusarium/launchpad/ai/connections';

/** domain feeds the interim favicon VendorMark (Morgan's Aug 13 directive). */
const INFERENCE_PROVIDERS: Array<{ key: string; name: string; blurb: string; domain: string }> = [
  {
    key: 'anthropic',
    name: 'Anthropic (Claude)',
    domain: 'anthropic.com',
    blurb: 'The default drafting engine — policies, SSP narratives, plain-English explanations.',
  },
  {
    key: 'openai',
    name: 'OpenAI (GPT / Codex)',
    domain: 'openai.com',
    blurb: 'General drafting and structured-document generation.',
  },
  {
    key: 'perplexity',
    name: 'Perplexity',
    domain: 'perplexity.ai',
    blurb: 'Live-web research — opportunity enrichment, agency and market scans.',
  },
  {
    key: 'xai',
    name: 'xAI (Grok)',
    domain: 'x.ai',
    blurb: 'Alternative reasoning engine with live web context.',
  },
];
const PROVIDER_NAME: Record<string, string> = Object.fromEntries(
  INFERENCE_PROVIDERS.map((p) => [p.key, p.name]),
);

const STATUS_TONE: Record<string, Tone> = {
  active: 'emerald',
  verified: 'emerald',
  pending_verification: 'amber',
  pending: 'amber',
  error: 'red',
  failed: 'red',
  revoked: 'slate',
};
const STATUS_LABEL: Record<string, string> = {
  active: 'active',
  verified: 'verified',
  pending_verification: 'pending verification',
  pending: 'pending',
  error: 'error',
  failed: 'failed',
  revoked: 'revoked',
};

const fmtCents = (cents: number) => `$${((cents ?? 0) / 100).toFixed(2)}`;

const fieldCls = 'myco-glass-field w-full rounded-lg border border-border px-3 py-2 text-sm';

export default function AiIntegrationsPage() {
  const [connections, setConnections] = useState<AiConnection[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [custody, setCustody] = useState<'ready' | 'kms_pending' | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [byoNote, setByoNote] = useState<Record<string, string>>({});
  /** Which provider's inline BYO key form is open (one at a time). */
  const [byoFormOpen, setByoFormOpen] = useState<string | null>(null);
  /**
   * The pasted key lives here ONLY while the user is typing. submitByo copies
   * it into a local and clears this state synchronously before the request is
   * even sent — the key never survives past submit and is never rendered.
   */
  const [byoKeyDraft, setByoKeyDraft] = useState('');
  const [byoLabelDraft, setByoLabelDraft] = useState('');
  /** displayPrefix returned by the BYO POST — shown once, dismissible. */
  const [byoConfirm, setByoConfirm] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const r = await fetch(API, { cache: 'no-store' });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        setConnections(
          (Array.isArray(d.connections) ? d.connections : []).map(normalizeConnection),
        );
        setLedger(d.costLedger ?? []);
        setCustody(d.custody === 'ready' ? 'ready' : 'kms_pending');
        setErr(null);
      } else {
        setErr(d?.error || `HTTP ${r.status}`);
      }
    } catch {
      setErr('Could not load AI integrations.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  /** Live (non-revoked) connection for a provider+mode. */
  const live = (provider: string, mode: string) =>
    connections.find((c) => c.provider === provider && c.mode === mode && c.status !== 'revoked');

  const toggleManaged = async (provider: string, on: boolean) => {
    const key = `${provider}:managed`;
    setBusy(key); setErr(null);
    try {
      if (on) {
        const r = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider, mode: 'managed' }),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) setErr(d?.error || 'Could not enable managed AI');
      } else {
        const conn = live(provider, 'managed');
        if (conn) {
          const r = await fetch(API, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: conn.id, action: 'revoke' }),
          });
          const d = await r.json().catch(() => ({}));
          if (!r.ok) setErr(d?.error || 'Could not disable managed AI');
        }
      }
      await load();
    } finally { setBusy(null); }
  };

  /** Opens the inline BYO key form for one provider (fresh, empty fields). */
  const openByoForm = (provider: string) => {
    setByoFormOpen(provider);
    setByoKeyDraft('');
    setByoLabelDraft('');
    setByoNote((n) => ({ ...n, [provider]: '' }));
  };

  const closeByoForm = () => {
    setByoFormOpen(null);
    setByoKeyDraft('');
    setByoLabelDraft('');
  };

  /**
   * Submits the pasted key ONCE. The draft state is cleared synchronously
   * before the request fires, so the plaintext key never outlives this call
   * and is never rendered anywhere. Success shows the server's displayPrefix
   * one time; a 503 means KMS custody is not actually ready and the page
   * falls back to the honest kms_pending copy.
   */
  const submitByo = async (provider: string) => {
    const apiKey = byoKeyDraft.trim();
    const label = byoLabelDraft.trim();
    // Clear the key from state immediately — before any await.
    setByoKeyDraft('');
    if (!apiKey) {
      setByoNote((n) => ({ ...n, [provider]: 'Paste your provider API key first — nothing was sent.' }));
      return;
    }
    const key = `${provider}:byo`;
    setBusy(key); setErr(null);
    try {
      const r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, mode: 'byo', apiKey, ...(label ? { label } : {}) }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        setByoConfirm((c) => ({ ...c, [provider]: typeof d.displayPrefix === 'string' ? d.displayPrefix : '' }));
        setByoNote((n) => ({ ...n, [provider]: '' }));
        closeByoForm();
        await load();
      } else if (r.status === 503 || d?.custody === 'kms_pending' || d?.code === 'kms_unconfigured') {
        // Custody is not actually ready — show the standing kms_pending copy.
        setCustody('kms_pending');
        closeByoForm();
      } else {
        setByoNote((n) => ({ ...n, [provider]: d?.error || `HTTP ${r.status}` }));
      }
    } catch {
      setByoNote((n) => ({ ...n, [provider]: 'Could not reach the connection service.' }));
    } finally { setBusy(null); }
  };

  const revokeByo = async (provider: string) => {
    const conn = live(provider, 'byo');
    if (!conn) return;
    const key = `${provider}:byo`;
    setBusy(key); setErr(null);
    try {
      const r = await fetch(API, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: conn.id, action: 'revoke' }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setErr(d?.error || 'Could not revoke the connection');
      await load();
    } finally { setBusy(null); }
  };

  const cursorConn = connections.find(
    (c) => c.provider === 'cursor' && c.status !== 'revoked',
  );

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-current" /> Loading AI integrations…
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        title="AI integrations"
        icon={Plug}
        description="Control which AI providers Launchpad may use on your behalf — and whose account pays for each call."
      />

      {/* Education-first intro: what / why / next step. */}
      <Card tone="sky" className="p-5 mb-6">
        <div className="pl-1.5">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-4 w-4 text-sky-500" />
            <span className="text-xs font-semibold uppercase tracking-wide">Before you flip anything on</span>
          </div>
          <div className="grid md:grid-cols-3 gap-4 text-xs text-muted-foreground leading-relaxed">
            <div>
              <div className="font-semibold text-foreground mb-1">What is this?</div>
              Launchpad uses large language models (AI text engines) to draft documents, enrich
              opportunities, and explain requirements. This page is the switchboard: which
              providers it may call, and in which of two billing modes.
            </div>
            <div>
              <div className="font-semibold text-foreground mb-1">Why it matters</div>
              AI calls cost real money and carry your prompts to a provider. <span className="text-foreground">Managed</span> mode
              uses Mycosoft&apos;s provider accounts and is metered in <span className="text-foreground">AI credits</span> (the
              allowance included in your plan). <span className="text-foreground">Bring-your-own-key (BYO)</span> mode uses your
              provider account — your rates, your data-retention terms, zero credits.
            </div>
            <div>
              <div className="font-semibold text-foreground mb-1">Your next step</div>
              Turn on Managed AI for at least one provider so AI-assisted drafting works — most
              teams start with Anthropic. {custody === 'ready'
                ? 'Or connect your own key on any provider card below for zero-credit billing under your own provider agreement.'
                : 'Add your own key later, once key custody ships, if you want zero-credit billing under your own provider agreement.'}
            </div>
          </div>
        </div>
      </Card>

      {err && (
        <Card tone="red" className="p-4 mb-5">
          <div className="pl-1.5 flex items-start gap-2.5 text-sm">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <span className="font-medium">{err}</span>
          </div>
        </Card>
      )}

      {/* The dual meter, side by side. */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card tone="sky" className="p-5">
          <div className="pl-1.5">
            <div className="flex items-center gap-2 mb-1.5">
              <Coins className="h-4 w-4 text-sky-500" />
              <span className="text-sm font-semibold">Managed AI</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Mycosoft&apos;s provider keys — nothing to configure. Every action is metered in AI
              credits from your plan, and each one appears in the cost ledger below with its exact
              cost. Your prompts pass through Mycosoft&apos;s provider accounts.
            </p>
          </div>
        </Card>
        <Card tone="emerald" className="p-5">
          <div className="pl-1.5">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <KeyRound className="h-4 w-4 text-emerald-500" /> Bring-your-own-key (BYO)
              </span>
              {custody === 'ready'
                ? <StateBadge tone="emerald">KMS custody ready</StateBadge>
                : <StateBadge tone="amber">KMS custody being provisioned</StateBadge>}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your provider account and API key — your negotiated rates and your data-retention
              agreement apply, and BYO actions consume <span className="text-foreground font-medium">zero credits, ever</span>.
              Keys are envelope-encrypted under a KMS (Key Management Service — dedicated key
              custody, where a master key wraps a per-workspace key) and are unreadable by
              Mycosoft staff. Launchpad displays at most the last 4 characters of a connected key.
            </p>
          </div>
        </Card>
      </div>

      {/* Provider cards. */}
      <div className="grid md:grid-cols-2 gap-4">
        {INFERENCE_PROVIDERS.map((p) => {
          const managed = live(p.key, 'managed');
          const byo = live(p.key, 'byo');
          const cardBusy = busy === `${p.key}:managed` || busy === `${p.key}:byo`;
          return (
            <Card key={p.key} tone={managed || byo ? 'emerald' : undefined} className="p-5">
              <div className="pl-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex items-start gap-2.5">
                    <VendorMark domain={p.domain} name={p.name} size={22} className="mt-0.5" />
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold">{p.name}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{p.blurb}</p>
                    </div>
                  </div>
                  {cardBusy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
                </div>

                {/* Managed meter */}
                <div className="mt-4 rounded-lg border border-border/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-medium flex items-center gap-2">
                        Managed AI
                        {managed && <StateBadge tone={STATUS_TONE[managed.status] ?? 'slate'}>{STATUS_LABEL[managed.status] ?? managed.status}</StateBadge>}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Mycosoft keys · billed in AI credits
                      </div>
                    </div>
                    <LiquidSwitch
                      checked={!!managed}
                      disabled={busy !== null}
                      onChange={(on) => toggleManaged(p.key, on)}
                    />
                  </div>
                </div>

                {/* BYO meter */}
                <div className="mt-2 rounded-lg border border-border/60 p-3">
                  <div className="text-xs font-medium flex items-center gap-2 flex-wrap">
                    Bring-your-own-key
                    {byo && <StateBadge tone={STATUS_TONE[byo.status] ?? 'slate'}>{STATUS_LABEL[byo.status] ?? byo.status}</StateBadge>}
                    {byo?.keyLast4 && (
                      <code className="text-[11px] px-1.5 py-0.5 rounded bg-muted">…{byo.keyLast4}</code>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Your provider account · zero credits
                  </div>

                  {/* One-time connection confirmation — the only place the
                      server's displayPrefix is ever shown; dismiss discards it. */}
                  {byoConfirm[p.key] !== undefined && (
                    <div className="mt-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
                      <p className="text-[11px] leading-snug">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">Key connected.</span>{' '}
                        {byoConfirm[p.key] ? (
                          <>
                            Stored as <code className="px-1 py-0.5 rounded bg-muted">{byoConfirm[p.key]}</code> — this
                            is the only time this reference is shown.
                          </>
                        ) : (
                          <>Your key was stored securely.</>
                        )}{' '}
                        The full key was envelope-encrypted and will never be displayed again.
                      </p>
                      <div className="mt-2">
                        <GlassButton
                          onClick={() => setByoConfirm((c) => {
                            const next = { ...c };
                            delete next[p.key];
                            return next;
                          })}
                        >
                          Dismiss
                        </GlassButton>
                      </div>
                    </div>
                  )}

                  {byo ? (
                    <div className="mt-2">
                      {(byo.status === 'error' || byo.status === 'failed') && byo.lastError && (
                        <p className="text-[11px] text-red-500 mb-2">{byo.lastError}</p>
                      )}
                      {byo.lastVerifiedAt && (
                        <p className="text-[11px] text-muted-foreground mb-2">
                          last verified {new Date(byo.lastVerifiedAt).toLocaleString()}
                        </p>
                      )}
                      <GlassButton onClick={() => revokeByo(p.key)} disabled={busy !== null} className="myco-glass-danger">
                        Revoke key
                      </GlassButton>
                    </div>
                  ) : custody === 'kms_pending' ? (
                    <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
                      KMS custody service being provisioned — BYO opens when it ships. Your key
                      will be envelope-encrypted and unreadable by Mycosoft staff; until then this
                      page accepts no key material at all.
                    </p>
                  ) : byoFormOpen === p.key ? (
                    <form
                      className="mt-2 space-y-2"
                      onSubmit={(e) => { e.preventDefault(); submitByo(p.key); }}
                    >
                      <input
                        type="password"
                        autoComplete="off"
                        spellCheck={false}
                        value={byoKeyDraft}
                        onChange={(e) => setByoKeyDraft(e.target.value)}
                        placeholder={`${p.name} API key`}
                        aria-label={`${p.name} API key`}
                        className={fieldCls}
                        disabled={busy !== null}
                      />
                      <input
                        type="text"
                        autoComplete="off"
                        spellCheck={false}
                        value={byoLabelDraft}
                        onChange={(e) => setByoLabelDraft(e.target.value)}
                        placeholder="Label (optional — e.g. “prod account”)"
                        aria-label="Connection label (optional)"
                        className={fieldCls}
                        disabled={busy !== null}
                      />
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        Your key is envelope-encrypted at rest, never shown again, never metered
                        in credits, revocable any time.
                      </p>
                      <div className="flex items-center gap-2">
                        <GlassButton type="submit" disabled={busy !== null}>
                          <KeyRound className="h-3.5 w-3.5 text-current mr-1.5" /> Connect key
                        </GlassButton>
                        <GlassButton onClick={closeByoForm} disabled={busy !== null}>
                          Cancel
                        </GlassButton>
                      </div>
                      {byoNote[p.key] && (
                        <p className="text-[11px] text-red-500 leading-snug">{byoNote[p.key]}</p>
                      )}
                    </form>
                  ) : (
                    <div className="mt-2">
                      <GlassButton onClick={() => openByoForm(p.key)} disabled={busy !== null}>
                        <KeyRound className="h-3.5 w-3.5 text-current mr-1.5" /> Connect your key
                      </GlassButton>
                      {byoNote[p.key] && (
                        <p className="text-[11px] text-muted-foreground mt-2 leading-snug">{byoNote[p.key]}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Cursor — an editor/agent integration, not an inference API. */}
      <Card className="p-5 mt-4">
        <div className="pl-1.5 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-2xl">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <VendorMark domain="cursor.com" name="Cursor" size={18} /> Cursor
              {cursorConn && (
                <StateBadge tone={STATUS_TONE[cursorConn.status] ?? 'slate'}>
                  {STATUS_LABEL[cursorConn.status] ?? cursorConn.status}
                </StateBadge>
              )}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
              Cursor is an MCP/editor integration, not an inference API — there is no managed
              meter and no provider key to store. MCP (Model Context Protocol) is the open
              standard for attaching tools to AI editors: mint a workspace API key with the{' '}
              <code className="px-1 rounded bg-muted">read</code> scope and add Launchpad&apos;s MCP
              tools to Cursor with it, so your editor can read this workspace&apos;s readiness data
              while you work. Revoking that key from the API-keys screen disconnects Cursor
              immediately.
            </p>
          </div>
          <GlassButton href="/app/launchpad/settings/keys">
            <KeyRound className="h-3.5 w-3.5 text-current mr-1.5" /> Workspace API keys
          </GlassButton>
        </div>
      </Card>

      {/* Cost ledger — the dual meter, receipt by receipt. */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-1">
          <Coins className="h-4 w-4 text-emerald-500" /> AI cost ledger
        </h2>
        <p className="text-xs text-muted-foreground mb-3 max-w-2xl">
          Every AI action in this workspace, most recent first (last 50). Managed actions show the
          credits they consumed; BYO actions always show 0 credits because your own provider
          account was billed directly.
        </p>
        {ledger.length === 0 ? (
          <Card className="p-8 text-center">
            <Coins className="h-7 w-7 text-muted-foreground/40 mx-auto mb-2.5" />
            <p className="text-sm font-medium">No AI actions recorded yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              When Launchpad runs its first AI task for this workspace — a document draft, an
              opportunity enrichment — each action lands here with its provider, model, and exact
              cost. Nothing is estimated or backfilled.
            </p>
          </Card>
        ) : (
          <Card className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border/60">
                    <th className="px-4 py-2.5 font-medium">When</th>
                    <th className="px-3 py-2.5 font-medium">Provider</th>
                    <th className="px-3 py-2.5 font-medium">Model</th>
                    <th className="px-3 py-2.5 font-medium">Task</th>
                    <th className="px-3 py-2.5 font-medium">Billing</th>
                    <th className="px-3 py-2.5 font-medium text-right">Credits</th>
                    <th className="px-4 py-2.5 font-medium text-right">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((row) => (
                    <tr key={row.id} className="border-b border-border/40 last:border-0">
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-xs">{PROVIDER_NAME[row.provider] ?? row.provider}</td>
                      <td className="px-3 py-2.5"><code className="text-[11px]">{row.model}</code></td>
                      <td className="px-3 py-2.5 text-xs">{row.task}</td>
                      <td className="px-3 py-2.5">
                        {row.byo_key
                          ? <StateBadge tone="emerald">BYO · 0 credits</StateBadge>
                          : <StateBadge tone="sky">managed</StateBadge>}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-xs">{row.credits_charged}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-xs">{fmtCents(row.actual_cost_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Boundary footer. */}
      <Card className="p-4 mt-6">
        <div className="pl-1.5 flex items-start gap-2.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          <span>
            Launchpad is a commercial, non-CUI environment. Whichever billing mode you choose,
            never include controlled unclassified information (CUI) or export-controlled technical
            data in AI prompts — keep that material in your authorized enclave. Full provider keys
            are never displayed or logged; a key you paste is accepted exactly once for envelope
            encryption, then only its last 4 characters are ever shown.
          </span>
        </div>
      </Card>
    </div>
  );
}
