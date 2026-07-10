'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, XCircle, Search, Ban, PackageSearch, Cloud, ChevronRight,
} from 'lucide-react';
import { SUPPLY_CHAIN_INSTRUMENTS, PROHIBITED_ENTITIES } from '@/lib/security/reference/prohibited-sources';
import { MYCOSOFT_DEVICE_BOMS, checkDeviceBom, type DeviceBomResult } from '@/lib/security/supply-chain/bom-check';

const statusMeta: Record<DeviceBomResult['status'], { label: string; cls: string }> = {
  'prohibited-source-found': { label: 'Prohibited source found', cls: 'border-red-500/40 bg-red-500/10 text-red-300' },
  'needs-review': { label: 'Needs review', cls: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
  clear: { label: 'Clear (of entered items)', cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
  'not-populated': { label: 'BOM not entered', cls: 'border-slate-500/40 bg-slate-500/10 text-slate-300' },
};

interface BoundaryResp {
  configured: boolean;
  status: string;
  guidance: string;
  keywords: string[];
  scope: string[];
  boundaryPolicy: string;
  lastRun: string | null;
}

export default function SupplyChainPanel() {
  const results = useMemo(() => MYCOSOFT_DEVICE_BOMS.map(checkDeviceBom), []);
  const [open, setOpen] = useState<string | null>(results.find((r) => r.status !== 'clear')?.deviceId ?? null);
  const [boundary, setBoundary] = useState<BoundaryResp | null>(null);
  const [boundaryErr, setBoundaryErr] = useState(false);

  useEffect(() => {
    fetch('/api/security/boundary-check')
      .then((r) => r.json())
      .then(setBoundary)
      .catch(() => setBoundaryErr(true));
  }, []);

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400 max-w-3xl">
        Made-in-America / supply-chain screening (Perplexity doc §6, §8). BOM findings are decision-support, not a
        legal determination — a real prohibited-source call requires counsel and the enacted statute text.
      </p>

      {/* Prohibited-source rules */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Ban className="w-4 h-4 text-red-300" /> Prohibited-source rules</h3>
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full text-xs">
            <thead className="bg-slate-800/60 text-slate-400">
              <tr><th className="text-left p-2">Instrument</th><th className="text-left p-2">Effective</th><th className="text-left p-2">Scope</th></tr>
            </thead>
            <tbody>
              {SUPPLY_CHAIN_INSTRUMENTS.map((s) => (
                <tr key={s.instrument} className="border-t border-slate-800 align-top">
                  <td className="p-2 text-slate-200 whitespace-nowrap">{s.instrument}<div className="text-[10px] text-slate-500">{s.citation}</div></td>
                  <td className="p-2 text-slate-300 whitespace-nowrap">{s.effectiveDate}</td>
                  <td className="p-2 text-slate-400">{s.scope}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <div className="text-[11px] text-slate-500 mb-1">Named prohibited entities screened by the BOM check:</div>
          <div className="flex flex-wrap gap-1.5">
            {PROHIBITED_ENTITIES.map((e) => (
              <span key={e.name} className="text-[11px] px-1.5 py-0.5 rounded border border-red-500/30 bg-red-500/10 text-red-200" title={e.note}>
                {e.name} · {e.category}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Device BOM screen */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2"><PackageSearch className="w-4 h-4 text-purple-300" /> Device BOM screen</h3>
        <div className="space-y-2">
          {results.map((r) => {
            const dev = MYCOSOFT_DEVICE_BOMS.find((d) => d.deviceId === r.deviceId)!;
            const meta = statusMeta[r.status];
            const isOpen = open === r.deviceId;
            return (
              <div key={r.deviceId} className="rounded-lg border border-slate-700 bg-slate-800/40">
                <button type="button" onClick={() => setOpen(isOpen ? null : r.deviceId)} className="w-full text-left p-3 flex items-center gap-3">
                  <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-100">{r.deviceName}</div>
                    <div className="text-xs text-slate-500">{dev.description}</div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    {r.counts.prohibited > 0 && <span className="text-red-300">{r.counts.prohibited} prohibited</span>}
                    {r.counts.review > 0 && <span className="text-amber-300">{r.counts.review} review</span>}
                    {r.population !== 'none' && <span className="text-emerald-300/70">{r.counts.ok} ok</span>}
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded border ${meta.cls}`}>{meta.label}</span>
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 space-y-2">
                    {dev.note && (
                      <div className="text-[11px] text-amber-300/80 flex gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0" />{dev.note}</div>
                    )}
                    {r.findings.length === 0 ? (
                      <div className="text-xs text-slate-500">No components entered. Add the production BOM to screen it.</div>
                    ) : (
                      <div className="overflow-x-auto rounded border border-slate-700">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-800/60 text-slate-400">
                            <tr><th className="text-left p-2">Component</th><th className="text-left p-2">Vendor</th><th className="text-left p-2">Origin</th><th className="text-left p-2">Finding</th></tr>
                          </thead>
                          <tbody>
                            {r.findings.map((f, i) => (
                              <tr key={i} className="border-t border-slate-800 align-top">
                                <td className="p-2 text-slate-200">{f.line.component}</td>
                                <td className="p-2 text-slate-300">{f.line.vendor}</td>
                                <td className="p-2 text-slate-400 whitespace-nowrap">{f.line.country ?? '—'}</td>
                                <td className="p-2">
                                  <span className="inline-flex items-start gap-1.5">
                                    {f.severity === 'prohibited' ? <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                                      : f.severity === 'review' ? <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                      : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />}
                                    <span className={f.severity === 'prohibited' ? 'text-red-200' : f.severity === 'review' ? 'text-amber-200' : 'text-slate-400'}>{f.reason}</span>
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Google Workspace boundary check */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Cloud className="w-4 h-4 text-blue-300" /> Google Workspace CUI-boundary check</h3>
        {boundaryErr && <div className="text-xs text-red-300">Could not reach the boundary-check endpoint.</div>}
        {boundary && (
          <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4 space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded border text-[11px] ${
                boundary.configured ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-slate-500/40 bg-slate-500/10 text-slate-300'
              }`}>
                {boundary.configured ? 'Configured — scan pending' : 'Automated scan not configured'}
              </span>
              <span className="text-slate-500">Last run: {boundary.lastRun ?? 'never'}</span>
            </div>
            <div className="text-slate-300">{boundary.boundaryPolicy}</div>
            <div className="text-slate-400 flex gap-1.5"><Search className="w-3.5 h-3.5 shrink-0 mt-0.5" /> Scans {boundary.scope.join(', ')} for markings: <span className="font-mono text-slate-300">{boundary.keywords.join(', ')}</span></div>
            <div className="text-amber-300/80 flex gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{boundary.guidance}</div>
          </div>
        )}
        {!boundary && !boundaryErr && <div className="text-xs text-slate-500">Loading boundary-check status…</div>}
      </section>
    </div>
  );
}
