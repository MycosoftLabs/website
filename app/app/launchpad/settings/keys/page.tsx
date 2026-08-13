'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyRound, Loader2, Plus, Copy, Check, Trash2, AlertTriangle, ShieldCheck, X,
} from 'lucide-react';
import { PageHeader, Card, StateBadge } from '@/components/launchpad/ui';
import { LiquidCheckbox, LiquidButton } from '@/components/launchpad/liquid';
import { GlassButton } from '@/components/ui/glass-button';

/**
 * Settings → API keys (canonical route).
 *
 * Tenant-scoped machine credentials for the Contract Radar collector and the
 * Local Assurance Agent. Wired to Cursor's BFF exactly as specified in
 * docs/launchpad/CURSOR_TO_CLAUDE_API_KEYS_CONTRACT_AUG12_2026.md:
 *   GET    /api/fusarium/launchpad/keys           → metadata only, never hashes
 *   POST   /api/fusarium/launchpad/keys           → plaintext exactly ONCE
 *   DELETE /api/fusarium/launchpad/keys?id=…      → soft revoke
 *
 * This file owns presentation only. Hashing, the create/revoke RPCs, RLS and
 * machine-auth verification are Cursor's lane and are not touched here.
 *
 * Honesty rules this screen enforces:
 *  - the secret appears once, in a modal, and is never recoverable afterward
 *  - the list shows prefixes only
 *  - nothing is fabricated: an empty workspace renders empty, and a failed or
 *    un-migrated backend renders the BFF's own error and hint rather than a
 *    plausible-looking placeholder key
 */

type ApiKeyScope = 'ingest' | 'agent' | 'read' | 'admin';

interface ApiKeyMeta {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  createdAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
}

interface CreatedKey {
  id: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  plaintextKey: string;
  warning?: string;
}

const SCOPE_HELP: Record<ApiKeyScope, string> = {
  ingest: 'Push normalized opportunities to Contract Radar',
  agent: 'Submit sanitized Local Assurance Agent results',
  read: 'Reserved for read-only integrations',
  admin: 'Satisfies both ingest and agent checks',
};
const ALL_SCOPES: ApiKeyScope[] = ['ingest', 'agent', 'read', 'admin'];

/** The BFF's own codes, translated into something a founder can act on. */
const CODE_GUIDANCE: Record<string, string> = {
  list_failed: 'The API-keys migration has not been applied to this database yet.',
  insufficient_role: 'Only an owner or admin can create or revoke keys.',
  read_export_mode: 'This workspace is in read/export mode, so keys cannot be changed.',
  tenant_suspended: 'This workspace is suspended.',
  launchpad_disabled: 'Launchpad is not enabled in this environment.',
};

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<Set<ApiKeyScope>>(new Set(['ingest']));
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<ApiKeyMeta | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyError = useCallback((d: { error?: string; code?: string; hint?: string }, fallback: string) => {
    setErr(d?.error || fallback);
    setHint(d?.hint || (d?.code ? CODE_GUIDANCE[d.code] ?? `code: ${d.code}` : null));
  }, []);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/fusarium/launchpad/keys', { cache: 'no-store' });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { setKeys(d.keys ?? []); setErr(null); setHint(null); }
      else { setKeys([]); applyError(d, `HTTP ${r.status}`); }
    } catch {
      setKeys([]);
      setErr('Could not reach the key service.');
      setHint(null);
    } finally { setLoading(false); }
  }, [applyError]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);

  // Escape closes whichever modal is open. The one-time key modal is
  // deliberately included: dismissing it is the user's call, and the warning
  // already says the secret cannot be shown again.
  useEffect(() => {
    if (!created && !confirmRevoke) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (confirmRevoke) setConfirmRevoke(null);
      else setCreated(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [created, confirmRevoke]);

  const toggleScope = (s: ApiKeyScope) =>
    setScopes((prev) => { const n = new Set(prev); if (n.has(s)) n.delete(s); else n.add(s); return n; });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || scopes.size === 0) return;
    setCreating(true); setErr(null); setHint(null);
    try {
      const r = await fetch('/api/fusarium/launchpad/keys', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), scopes: [...scopes] }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { applyError(d, 'Create failed'); return; }
      setCreated({
        id: d.id, keyPrefix: d.keyPrefix, scopes: d.scopes,
        plaintextKey: d.plaintextKey, warning: d.warning,
      });
      setShowForm(false); setName(''); setScopes(new Set(['ingest']));
      await load();
    } finally { setCreating(false); }
  };

  const revoke = async (key: ApiKeyMeta) => {
    setRevoking(key.id); setErr(null); setHint(null);
    try {
      const r = await fetch(`/api/fusarium/launchpad/keys?id=${encodeURIComponent(key.id)}`, { method: 'DELETE' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) applyError(d, 'Revoke failed');
      setConfirmRevoke(null);
      await load();
    } finally { setRevoking(null); }
  };

  const copyKey = async () => {
    if (!created) return;
    const mark = () => {
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2500);
    };
    try { await navigator.clipboard.writeText(created.plaintextKey); mark(); }
    catch {
      // Clipboard API needs a secure context; fall back so a plain-http
      // deployment still lets the user take the secret with them.
      const ta = document.createElement('textarea');
      ta.value = created.plaintextKey; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); mark(); } catch { /* user can select manually */ }
      document.body.removeChild(ta);
    }
  };

  const active = keys.filter((k) => !k.revokedAt);
  const revoked = keys.filter((k) => k.revokedAt);

  return (
    <div className="container max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        title="API keys"
        icon={KeyRound}
        description="Machine credentials scoped to this workspace — for the Contract Radar collector and the Local Assurance Agent. Keys are hashed at rest; the secret is shown once at creation and never again."
        actions={
          <GlassButton onClick={() => setShowForm((s) => !s)}>
            <Plus className="h-4 w-4 text-current mr-2" /> New key
          </GlassButton>
        }
      />

      {err && (
        <Card tone="red" className="p-4 mb-5">
          <div className="pl-1.5 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <span className="font-medium">{err}</span>
              {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
            </div>
          </div>
        </Card>
      )}

      {showForm && (
        <Card className="p-5 mb-6">
          <form onSubmit={create} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5" htmlFor="lp-key-name">Key name</label>
              <input id="lp-key-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required
                placeholder="SAM.gov collector (production)"
                className="myco-glass-field w-full rounded-lg border border-border px-3 py-2 text-sm" />
              <p className="text-[11px] text-muted-foreground mt-1">
                Name it after the thing that will hold it, so a future revoke is obvious.
              </p>
            </div>
            <div>
              <span className="text-sm font-medium block mb-2">Scopes</span>
              <div className="grid sm:grid-cols-2 gap-2">
                {ALL_SCOPES.map((s) => (
                  <div key={s} className={`rounded-lg border p-3 transition-colors ${
                    scopes.has(s) ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border hover:bg-muted/50'}`}>
                    <LiquidCheckbox
                      checked={scopes.has(s)}
                      onChange={() => toggleScope(s)}
                      label={
                        <span>
                          <code className="text-xs font-semibold">{s}</code>
                          <span className="block text-[11px] text-muted-foreground mt-0.5">{SCOPE_HELP[s]}</span>
                        </span>
                      }
                    />
                  </div>
                ))}
              </div>
              {scopes.size === 0 && <p className="text-xs text-red-500 mt-1.5">Pick at least one scope.</p>}
            </div>
            <div className="flex gap-2">
              <LiquidButton type="submit" disabled={creating || !name.trim() || scopes.size === 0}>
                {creating ? 'Creating…' : 'Create key'}
              </LiquidButton>
              <GlassButton onClick={() => setShowForm(false)}>Cancel</GlassButton>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="py-16 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-current" /> Loading keys…
        </div>
      ) : active.length === 0 && revoked.length === 0 && !err ? (
        <Card className="p-10 text-center">
          <KeyRound className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium">No API keys yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Create one when you connect a Contract Radar collector or enroll a Local Assurance Agent.
            Nothing is pre-provisioned — you mint keys yourself and can revoke them at any time.
          </p>
        </Card>
      ) : (
        <>
          {active.length > 0 && (
            <div className="space-y-2 mb-6">
              {active.map((k) => (
                <Card key={k.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{k.name}</span>
                        {k.scopes.map((s) => <StateBadge key={s} tone={s === 'admin' ? 'amber' : 'sky'}>{s}</StateBadge>)}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground mt-1.5">
                        <code className="px-1.5 py-0.5 rounded bg-muted">{k.keyPrefix}…</code>
                        <span>created {new Date(k.createdAt).toLocaleDateString()}</span>
                        <span>{k.lastUsedAt ? `last used ${new Date(k.lastUsedAt).toLocaleString()}` : 'never used'}</span>
                      </div>
                    </div>
                    <GlassButton onClick={() => setConfirmRevoke(k)} disabled={revoking === k.id} className="myco-glass-danger">
                      {revoking === k.id ? <Loader2 className="h-3.5 w-3.5 animate-spin text-current mr-1.5" /> : <Trash2 className="h-3.5 w-3.5 text-current mr-1.5" />} Revoke
                    </GlassButton>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {revoked.length > 0 && (
            <>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Revoked</h2>
              <div className="space-y-1.5 mb-6">
                {revoked.map((k) => (
                  <div key={k.id} className="rounded-lg border border-border/50 px-4 py-2.5 flex flex-wrap items-center gap-3 opacity-60">
                    <span className="text-sm">{k.name}</span>
                    <code className="text-[11px] px-1.5 py-0.5 rounded bg-muted">{k.keyPrefix}…</code>
                    <span className="text-[11px] text-muted-foreground ml-auto">
                      revoked {k.revokedAt ? new Date(k.revokedAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <Card className="p-4">
        <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          <span>
            Keys are stored as SHA-256 hashes — Mycosoft cannot recover a lost secret, only revoke it and issue a new one.
            Send them as <code className="px-1 rounded bg-muted">Authorization: Bearer lp_…</code> and never commit one to a
            repository or paste it into a support ticket.
          </span>
        </div>
      </Card>

      {/* One-time plaintext modal — the only moment this secret exists in the UI. */}
      {created && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="lp-key-created">
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full max-w-lg rounded-xl border border-emerald-500/40 bg-background shadow-2xl p-6">
            <button onClick={() => setCreated(null)} className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-muted" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
            <h2 id="lp-key-created" className="text-lg font-bold flex items-center gap-2 mb-1">
              <KeyRound className="h-5 w-5 text-emerald-500" /> Copy your key now
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {created.warning ?? 'This secret is shown once and cannot be retrieved again.'}
            </p>
            <div className="rounded-lg border border-border bg-muted/50 p-3 mb-3">
              <code className="text-xs break-all font-mono">{created.plaintextKey}</code>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <GlassButton onClick={copyKey}>
                {copied ? <><Check className="h-4 w-4 text-current" /> Copied</> : <><Copy className="h-4 w-4 text-current" /> Copy key</>}
              </GlassButton>
              <GlassButton onClick={() => setCreated(null)}>I&apos;ve saved it</GlassButton>
              <span className="text-[11px] text-muted-foreground ml-auto">{created.scopes.join(', ')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Revoke confirmation — in-page rather than window.confirm() so it reads
          like the rest of the workspace and can name the consequence. */}
      {confirmRevoke && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="lp-key-revoke">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmRevoke(null)} />
          <div className="relative w-full max-w-md rounded-xl border border-red-500/40 bg-background shadow-2xl p-6">
            <h2 id="lp-key-revoke" className="text-lg font-bold flex items-center gap-2 mb-1">
              <AlertTriangle className="h-5 w-5 text-red-500" /> Revoke this key?
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              <span className="font-medium text-foreground">{confirmRevoke.name}</span>{' '}
              (<code className="text-xs">{confirmRevoke.keyPrefix}…</code>) stops working immediately. Anything
              still authenticating with it — a collector, an enrolled agent — starts failing. This cannot be undone;
              issue a new key instead.
            </p>
            <div className="flex flex-wrap gap-2">
              <GlassButton onClick={() => revoke(confirmRevoke)} disabled={revoking === confirmRevoke.id} className="myco-glass-danger">
                {revoking === confirmRevoke.id ? <Loader2 className="h-4 w-4 animate-spin text-current mr-2" /> : <Trash2 className="h-4 w-4 text-current mr-2" />}
                Revoke key
              </GlassButton>
              <GlassButton onClick={() => setConfirmRevoke(null)}>Keep it</GlassButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
