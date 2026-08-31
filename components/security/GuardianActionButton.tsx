'use client';

import { useState } from 'react';
import { Lock, Loader2, ShieldCheck, ShieldAlert, ShieldX, X } from 'lucide-react';

// Guardian-gated action control.
//
// This button REQUESTS an action; it never performs one and never reports one
// as done. The flow is: operator states a reason → MAS Guardian returns
// allowed / requires_approval / denied → the decision, its reason, and the
// correlation id are shown verbatim. There is no optimistic success state:
// a security action is only "done" when MAS says a durable run executed.
//
// Fail-closed: an unreachable Guardian renders as blocked, never as permitted.

export type PolicyClass = 'read' | 'low_impact' | 'disruptive' | 'high_risk';

interface Decision {
  state?: string;
  decision: string | null;
  correlation_id?: string | null;
  run_id?: string | null;
  reason?: string | null;
  durable_recorded?: boolean;
  executable?: boolean;
}

const decisionMeta: Record<string, { cls: string; icon: typeof ShieldCheck; label: string }> = {
  allowed: { cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300', icon: ShieldCheck, label: 'Allowed' },
  requires_approval: { cls: 'border-amber-500/40 bg-amber-500/10 text-amber-300', icon: ShieldAlert, label: 'Requires approval' },
  denied: { cls: 'border-red-500/40 bg-red-500/10 text-red-300', icon: ShieldX, label: 'Denied' },
};

export default function GuardianActionButton({
  label, action, policyClass, target, className,
}: {
  label: string;
  action: string;
  policyClass: PolicyClass;
  target?: Record<string, unknown>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);

  const highRisk = policyClass === 'disruptive' || policyClass === 'high_risk';

  async function submit() {
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await fetch('/api/security/guardian/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, policy_class: policyClass, reason, target: target ?? {} }),
      });
      const j = await res.json().catch(() => null);
      if (!j) { setError(`Guardian request failed (HTTP ${res.status}).`); return; }
      // A non-OK response still carries an honest fail-closed envelope.
      if (!res.ok && !j.decision) {
        setError(j.reason || j.error || `Guardian request failed (HTTP ${res.status}).`);
        setResult(j.correlation_id ? j : null);
        return;
      }
      setResult(j);
    } catch (e: any) {
      setError(`Guardian request failed: ${String(e?.message ?? e)}`);
    } finally {
      setBusy(false);
    }
  }

  const meta = result?.decision ? decisionMeta[result.decision] : null;
  const Icon = meta?.icon;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setResult(null); setError(null); }}
        className="w-full p-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 text-sm font-mono hover:bg-slate-700 transition flex items-center justify-center gap-1.5"
        title={`Request ${label} via MAS Guardian — Guardian decides; this does not execute the action.`}
      >
        <Lock size={12} /> {label}
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-slate-600 bg-slate-900/70 p-2.5 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="text-[11px] text-slate-400 font-mono">
              Request <span className="text-slate-200">{action}</span>
              <span className={`ml-1.5 px-1 py-0.5 rounded border text-[10px] ${highRisk ? 'border-amber-500/40 text-amber-300' : 'border-slate-600 text-slate-400'}`}>{policyClass}</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300"><X size={13} /></button>
          </div>

          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for this action (recorded in the audit trail, min 8 chars)"
            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 min-h-[52px] focus:outline-none focus:border-sky-500"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy || reason.trim().length < 8}
              onClick={submit}
              className="px-3 py-1.5 rounded text-xs font-medium bg-sky-600/80 text-white hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lock size={11} />}
              Submit to Guardian
            </button>
            <span className="text-[10px] text-slate-500">Guardian decides. This does not execute the action.</span>
          </div>

          {error && <div className="text-[11px] text-red-300">{error}</div>}

          {result?.decision && meta && Icon && (
            <div className={`rounded border p-2 text-[11px] space-y-1 ${meta.cls}`}>
              <div className="flex items-center gap-1.5 font-semibold"><Icon className="w-3.5 h-3.5" /> {meta.label}</div>
              {result.reason && <div className="text-slate-300">{result.reason}</div>}
              <div className="text-slate-400 font-mono text-[10px] space-y-0.5">
                <div>correlation: {result.correlation_id ?? '—'}</div>
                {result.run_id && <div>run: {result.run_id}</div>}
                <div>
                  durable record: {result.durable_recorded ? 'yes' : 'no'} · executable: {result.executable ? 'yes' : 'no'}
                </div>
              </div>
              {/* The decisive honesty line: allowed ≠ executed. */}
              <div className="text-slate-400">
                {result.decision === 'allowed' && result.executable
                  ? 'Authorized. Execution is performed by MAS, not by this page — confirm the run record before treating the change as applied.'
                  : result.decision === 'requires_approval'
                    ? 'Pending Morgan/RJ approval. Nothing has been changed.'
                    : 'No change was made.'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
