'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, ShieldCheck, ShieldAlert, Link2 } from 'lucide-react';

/**
 * Audit trail viewer — every material action, hash-chained and append-only.
 * "Verify chain" recomputes every hash server-side; a single altered byte in
 * history surfaces as a mismatch at the exact sequence number.
 */

interface AuditEvent {
  seq: number;
  actor_type: string;
  action: string;
  entity: string | null;
  entity_id: string | null;
  hash: string;
  prev_hash: string;
  created_at: string;
}

interface Verification {
  valid: boolean;
  checked: number;
  first_bad_seq?: number;
  reason?: string;
}

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/fusarium/launchpad/audit', { cache: 'no-store' });
      const d = await r.json();
      if (r.ok) { setEvents(d.events); setErr(null); }
      else setErr(d?.error || `HTTP ${r.status}`);
    } catch { setErr('Could not load audit trail'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const verify = async () => {
    setVerifying(true);
    try {
      const r = await fetch('/api/fusarium/launchpad/audit?verify=1');
      const d = await r.json();
      if (r.ok) setVerification(d.verification);
      else setErr(d?.error || 'Verification failed');
    } finally { setVerifying(false); }
  };

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" /> Loading audit trail…
    </div>;
  }

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Audit trail</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Append-only and hash-chained per workspace. Updates and deletes are revoked at the
            database for every role — including ours.
          </p>
        </div>
        <button onClick={verify} disabled={verifying}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50">
          {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
          Verify chain
        </button>
      </div>

      {verification && (
        <div className={`rounded-lg border p-4 mb-6 flex items-start gap-3 ${
          verification.valid ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-red-500/40 bg-red-500/10'}`}>
          {verification.valid
            ? <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            : <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />}
          <div className="text-sm">
            {verification.valid ? (
              <span><strong>Chain intact.</strong> All {verification.checked} events recomputed and matched.</span>
            ) : (
              <span>
                <strong>Chain broken at seq {verification.first_bad_seq}</strong> after {verification.checked} verified
                events: {verification.reason}
              </span>
            )}
          </div>
        </div>
      )}

      {err && <p className="text-sm text-destructive mb-4">{err}</p>}

      {events.length === 0 ? (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          No events yet — the genesis event appears when the workspace is created.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Seq</th>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Actor</th>
                <th className="px-3 py-2 font-medium">Action</th>
                <th className="px-3 py-2 font-medium">Entity</th>
                <th className="px-3 py-2 font-medium">Hash</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.seq} className="border-t border-border/40">
                  <td className="px-3 py-2 tabular-nums">{e.seq}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{e.actor_type}</td>
                  <td className="px-3 py-2"><code className="text-xs">{e.action}</code></td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">{e.entity ?? ''}</td>
                  <td className="px-3 py-2"><code className="text-[10px] text-muted-foreground">{e.hash.slice(0, 12)}…</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
