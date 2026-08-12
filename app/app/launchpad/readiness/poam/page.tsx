'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, CalendarClock } from 'lucide-react';

/**
 * POA&M items — opened automatically for POA&M-eligible gaps when a snapshot
 * is computed, closed automatically when the gap clears. The 180-day clock
 * starts at first opening and is never reset by recomputation.
 */

interface PoamItem {
  id: string;
  control_id: string;
  status: string;
  weakness: string | null;
  opened_at: string;
  due_at: string | null;
  closed_at: string | null;
}

export default function PoamPage() {
  const [items, setItems] = useState<PoamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/fusarium/launchpad/readiness/poam', { cache: 'no-store' });
      const d = await r.json();
      if (r.ok) { setItems(d.items ?? []); setErr(null); }
      else setErr(d?.error || `HTTP ${r.status}`);
    } catch {
      setErr('Could not load POA&M items');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading POA&M…
      </div>
    );
  }

  const open = items.filter((i) => i.status === 'open' || i.status === 'in_progress');
  const closed = items.filter((i) => i.status === 'closed' || i.status === 'withdrawn');
  const daysLeft = (due: string | null) =>
    due ? Math.ceil((new Date(due).getTime() - Date.now()) / 86_400_000) : null;

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">Plan of Action &amp; Milestones</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Items open automatically for POA&M-eligible gaps when you compute a snapshot and close when
        the gap clears. Under 32 CFR §170.21, a Conditional status requires closeout within 180 days
        of the assessment date — the clock shown here starts when the item first opened.
      </p>

      {err && <p className="text-sm text-destructive mb-4">{err}</p>}

      {open.length === 0 ? (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          No open POA&M items. Compute a score snapshot to derive them from your current gaps.
        </div>
      ) : (
        <div className="space-y-2 mb-8">
          {open.map((i) => {
            const d = daysLeft(i.due_at);
            return (
              <div key={i.id} className="rounded-lg border border-border/60 p-4 flex flex-wrap items-center gap-3">
                <code className="text-sm font-semibold w-32">{i.control_id}</code>
                <span className="text-xs px-2 py-0.5 rounded border border-amber-500/40 text-amber-500">{i.status}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5" />
                  opened {new Date(i.opened_at).toLocaleDateString()}
                  {i.due_at && <> · due {new Date(i.due_at).toLocaleDateString()}</>}
                </span>
                {d !== null && (
                  <span className={`text-xs font-semibold tabular-nums ml-auto ${d < 30 ? 'text-red-500' : d < 90 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                    {d >= 0 ? `${d} days left` : `${-d} days overdue`}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {closed.length > 0 && (
        <>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Closed</h2>
          <div className="space-y-1.5">
            {closed.map((i) => (
              <div key={i.id} className="rounded-lg border border-border/40 px-4 py-2 flex items-center gap-3 opacity-70">
                <code className="text-sm w-32">{i.control_id}</code>
                <span className="text-xs text-muted-foreground">
                  {i.status} {i.closed_at ? `· ${new Date(i.closed_at).toLocaleDateString()}` : ''}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
