'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, ShieldAlert, Play, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

// Approved red-team scenario catalog (MAS PR #123).
//
// The browser presents ONLY what MAS has registered and approved. It cannot
// author a target, CIDR, scan type, or payload — a run request carries just a
// scenario id and the operator's reason. Scope, risk class, isolation target,
// approval class, and kill switch are MAS's fields, displayed read-only.
//
// An unavailable registry renders as unavailable, never as "no scenarios" —
// an empty catalog and an unreachable catalog are different facts.

interface ScenarioEntry {
  id: string;
  name: string;
  risk_class: string;
  allowed_scope: string;
  isolation_target: string;
  data_classification: string;
  cadence?: string | null;
  approval_class: string;
  kill_switch: string;
  required_evidence: string[];
}

interface CatalogResp {
  state: string;
  scenarios: ScenarioEntry[] | null;
  count?: number | null;
  reason?: string;
  source?: string;
}

const riskCls = (r: string) => {
  const s = (r || '').toLowerCase();
  if (s.includes('high') || s.includes('critical')) return 'border-red-500/40 text-red-300';
  if (s.includes('med') || s.includes('moderate')) return 'border-amber-500/40 text-amber-300';
  return 'border-emerald-500/40 text-emerald-300';
};

export default function ScenarioCatalog() {
  const [data, setData] = useState<CatalogResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/security/redteam?action=scenarios', { cache: 'no-store' });
      setData(await r.json());
    } catch (e: any) {
      setData({ state: 'unavailable', scenarios: null, reason: `Request failed: ${String(e?.message ?? e)}` });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function requestRun(scenarioId: string) {
    setBusy(true); setResult(null);
    try {
      const r = await fetch('/api/security/redteam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request-run', scenario_id: scenarioId, reason }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j || j.state === 'unavailable') {
        setResult({ ok: false, text: j?.reason || j?.error || `Run request rejected (HTTP ${r.status}). No run was started.` });
        return;
      }
      const run = j.run ?? {};
      setResult({
        ok: true,
        text: `Requested. MAS state: ${run.state ?? run.status ?? 'recorded'}${run.run_id ? ` · run ${run.run_id}` : ''}. A request is not a completed run — track it in SOC runs.`,
      });
      setReason('');
    } catch (e: any) {
      setResult({ ok: false, text: `Run request failed: ${String(e?.message ?? e)}. No run was started.` });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-slate-400 font-mono"><Loader2 className="w-4 h-4 animate-spin" /> Loading approved scenarios…</div>;
  }

  const scenarios = data?.scenarios;

  if (!scenarios) {
    return (
      <div className="rounded-lg border border-slate-600 bg-slate-800/40 p-3 text-sm">
        <div className="flex items-center gap-2 text-slate-300 font-mono"><ShieldAlert className="w-4 h-4 text-amber-300" /> Scenario registry unavailable</div>
        <p className="mt-1 text-xs text-slate-400">
          {data?.reason ?? 'MAS did not return the approved-scenario catalog.'} No scenarios can be requested until the
          registry is available. This is not a statement that zero scenarios exist.
        </p>
        <button onClick={load} className="mt-2 px-2.5 py-1 rounded border border-slate-600 text-xs text-slate-300 hover:border-slate-400 flex items-center gap-1.5">
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    );
  }

  if (scenarios.length === 0) {
    return (
      <div className="rounded-lg border border-slate-600 bg-slate-800/40 p-3 text-sm text-slate-300 font-mono">
        MAS returned the catalog successfully with <b>0 approved scenarios</b>. Nothing can be run until a scenario is
        registered and approved.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 font-mono">{scenarios.length} approved scenario{scenarios.length === 1 ? '' : 's'} · MAS registry</span>
        <button onClick={load} className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Refresh</button>
      </div>

      {scenarios.map((s) => (
        <div key={s.id} className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="text-sm text-slate-100 font-medium">{s.name}</div>
              <div className="font-mono text-[10px] text-slate-500">{s.id}</div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
              <span className={`px-1.5 py-0.5 rounded border ${riskCls(s.risk_class)}`}>{s.risk_class}</span>
              <span className="px-1.5 py-0.5 rounded border border-slate-600 text-slate-400">{s.approval_class}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-[11px]">
            <div><div className="text-slate-500">Allowed scope</div><div className="text-slate-300">{s.allowed_scope}</div></div>
            <div><div className="text-slate-500">Isolation target</div><div className="text-slate-300">{s.isolation_target}</div></div>
            <div><div className="text-slate-500">Data class</div><div className="text-slate-300">{s.data_classification}</div></div>
            <div><div className="text-slate-500">Kill switch</div><div className="text-slate-300">{s.kill_switch}</div></div>
          </div>
          {s.cadence && <div className="mt-1 text-[11px] text-slate-500">Cadence: {s.cadence}</div>}
          {s.required_evidence?.length > 0 && (
            <div className="mt-1 text-[11px] text-slate-500">Required evidence: <span className="text-slate-400">{s.required_evidence.join(', ')}</span></div>
          )}

          <div className="mt-2">
            {openId === s.id ? (
              <div className="space-y-2">
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for this run (recorded with the request, min 8 chars)"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 min-h-[50px] focus:outline-none focus:border-sky-500"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    disabled={busy || reason.trim().length < 8}
                    onClick={() => requestRun(s.id)}
                    className="px-3 py-1.5 rounded text-xs font-medium bg-sky-600/80 text-white hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Request run
                  </button>
                  <button onClick={() => { setOpenId(null); setResult(null); }} className="text-xs text-slate-400 hover:text-slate-200">Cancel</button>
                  <span className="text-[10px] text-slate-500">Requesting is not running — MAS decides and schedules.</span>
                </div>
                {result && (
                  <div className={`text-[11px] flex items-start gap-1.5 ${result.ok ? 'text-emerald-300' : 'text-red-300'}`}>
                    {result.ok ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                    <span>{result.text}</span>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => { setOpenId(s.id); setReason(''); setResult(null); }}
                className="px-3 py-1.5 rounded text-xs font-mono bg-slate-700/50 border border-slate-600 text-slate-200 hover:bg-slate-700 flex items-center gap-1.5"
              >
                <Play className="w-3 h-3" /> Request run
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
