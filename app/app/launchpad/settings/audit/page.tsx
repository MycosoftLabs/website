'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import {
  ChevronRight, CircleHelp, Footprints, Link2, Loader2, ScrollText, ShieldAlert, ShieldCheck, Target,
} from 'lucide-react';
import { PageHeader, Card, StatTile } from '@/components/launchpad/ui';
import { GlassButton } from '@/components/ui/glass-button';

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
  const [open, setOpen] = useState<number | null>(null);

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
      <Loader2 className="h-5 w-5 animate-spin text-current" /> Loading audit trail…
    </div>;
  }

  const latestSeq = events.length > 0 ? Math.max(...events.map((e) => e.seq)) : null;

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <PageHeader
        title="Audit trail"
        description="Append-only and hash-chained per workspace. Updates and deletes are revoked at the database for every role — including ours."
        icon={ScrollText}
        actions={
          <GlassButton onClick={verify} disabled={verifying}>
            {verifying ? <Loader2 className="h-4 w-4 animate-spin text-current mr-2" /> : <Link2 className="h-4 w-4 text-current mr-2" />}
            Verify chain
          </GlassButton>
        }
      />

      {/* Education-first intro */}
      <Card className="p-5 mb-4">
        <div className="grid sm:grid-cols-3 gap-5 text-sm">
          <div className="flex items-start gap-2.5">
            <CircleHelp className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">What is this?</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A chronological record of every material action in your workspace — who did what,
                when — where each event carries a hash that commits to the event before it.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Target className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">Why it matters</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Records that can be quietly edited later are weak evidence. Because this trail is
                append-only and hash-chained, rewriting any part of history is detectable — by you,
                not just by us.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Footprints className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">Your next step</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Click &quot;Verify chain&quot;. The server recomputes every hash from the genesis
                event forward and reports either an intact chain or the exact sequence number where
                it breaks.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Posture tiles — chain status stays an honest "—" until verify runs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {events.length === 0 ? (
          <StatTile label="Events" tone="slate" empty="No events yet" />
        ) : (
          <StatTile label="Events" value={events.length} tone="sky" sub="append-only rows in this workspace" />
        )}
        {latestSeq === null ? (
          <StatTile label="Latest seq" tone="slate" empty="No events yet" />
        ) : (
          <StatTile label="Latest seq" value={latestSeq} tone="sky" sub="head of the hash chain" />
        )}
        {verification ? (
          verification.valid ? (
            <StatTile label="Chain status" value={<span className="text-lg">Intact</span>}
              tone="emerald" sub={`${verification.checked} events recomputed and matched`} />
          ) : (
            <StatTile label="Chain status" value={<span className="text-lg">Broken</span>}
              tone="red" sub={`at seq ${verification.first_bad_seq}`} />
          )
        ) : (
          <StatTile label="Chain status" value="—" tone="slate" sub="not verified yet — run Verify chain" />
        )}
      </div>

      {verification && (
        <Card tone={verification.valid ? 'emerald' : 'red'} className="p-4 mb-6">
          <div className="flex items-start gap-3 pl-1.5">
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
        </Card>
      )}

      {err && <p className="text-sm text-destructive mb-4">{err}</p>}

      {events.length === 0 ? (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          No events yet — the genesis event appears when the workspace is created.
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
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
                {events.map((e) => {
                  const isOpen = open === e.seq;
                  return (
                    <Fragment key={e.seq}>
                      <tr
                        className="border-t border-border/40 cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => setOpen(isOpen ? null : e.seq)}
                        aria-expanded={isOpen}
                      >
                        <td className="px-3 py-2 tabular-nums">
                          <span className="inline-flex items-center gap-1.5">
                            <ChevronRight
                              className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${isOpen ? 'rotate-90' : ''}`}
                            />
                            {e.seq}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                        <td className="px-3 py-2">{e.actor_type}</td>
                        <td className="px-3 py-2"><code className="text-xs">{e.action}</code></td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">{e.entity ?? ''}</td>
                        <td className="px-3 py-2"><code className="text-[10px] text-muted-foreground">{e.hash.slice(0, 12)}…</code></td>
                      </tr>
                      {isOpen && (
                        <tr className="border-t border-border/30">
                          <td colSpan={6} className="p-0">
                            {/* The whole point of a hash chain is that you can see the
                                links. Full hashes, the predecessor, and the entity id
                                are what make an event checkable by hand. */}
                            <div className="lp-row-panel px-4 py-3 bg-muted/20">
                              <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-xs">
                                <div className="min-w-0">
                                  <dt className="text-muted-foreground mb-0.5">This event&apos;s hash</dt>
                                  <dd><code className="break-all text-[11px]">{e.hash}</code></dd>
                                </div>
                                <div className="min-w-0">
                                  <dt className="text-muted-foreground mb-0.5">Previous hash (chains to seq {e.seq - 1})</dt>
                                  <dd><code className="break-all text-[11px]">{e.prev_hash}</code></dd>
                                </div>
                                <div className="min-w-0">
                                  <dt className="text-muted-foreground mb-0.5">Entity</dt>
                                  <dd>{e.entity ?? <span className="text-muted-foreground">—</span>}</dd>
                                </div>
                                <div className="min-w-0">
                                  <dt className="text-muted-foreground mb-0.5">Entity id</dt>
                                  <dd><code className="break-all text-[11px]">{e.entity_id ?? '—'}</code></dd>
                                </div>
                                <div className="min-w-0">
                                  <dt className="text-muted-foreground mb-0.5">Actor</dt>
                                  <dd>{e.actor_type}</dd>
                                </div>
                                <div className="min-w-0">
                                  <dt className="text-muted-foreground mb-0.5">Recorded</dt>
                                  <dd>{new Date(e.created_at).toISOString()}</dd>
                                </div>
                              </dl>
                              <p className="text-[11px] text-muted-foreground mt-3 pt-2 border-t border-border/40">
                                Events are insert-only and hash-chained: each row commits to the one before it,
                                so a single altered byte anywhere in history breaks verification at that exact
                                sequence number.
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
