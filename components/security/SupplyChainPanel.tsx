'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, XCircle, Search, Ban, PackageSearch, Cloud, ChevronRight,
  Plus, Trash2, RefreshCw, Loader2, Building2, ShieldCheck,
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

interface SupplierScreen { severity: 'prohibited' | 'review' | 'ok'; reason: string; matchedEntity?: string; authority?: string }
interface ScreenedSupplier {
  id: string | null; name: string; type?: string | null; contact?: string | null; notes?: string | null;
  source: 'customer_vendors' | 'components'; componentCount: number; categories: string[];
  screen: SupplierScreen; removable: boolean;
}
interface SupplyLog { id: string; component_name: string | null; to_status: string | null; changed_by: string | null; changed_at: string | null; note: string | null }
interface SuppliersResp {
  configured: boolean; suppliers: ScreenedSupplier[]; logs: SupplyLog[];
  summary: { total: number; prohibited: number; review: number; ok: number } | null; guidance?: string;
}

export default function SupplyChainPanel() {
  const results = useMemo(() => MYCOSOFT_DEVICE_BOMS.map(checkDeviceBom), []);
  const [open, setOpen] = useState<string | null>(results.find((r) => r.status !== 'clear')?.deviceId ?? null);
  const [boundary, setBoundary] = useState<BoundaryResp | null>(null);
  const [boundaryErr, setBoundaryErr] = useState(false);

  // MycoForge live suppliers
  const [sup, setSup] = useState<SuppliersResp | null>(null);
  const [supLoading, setSupLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [addName, setAddName] = useState('');
  const [addType, setAddType] = useState('vendor');
  const [addContact, setAddContact] = useState('');
  const [addMsg, setAddMsg] = useState<{ kind: 'ok' | 'review' | 'blocked' | 'error'; text: string } | null>(null);

  async function loadSuppliers() {
    setSupLoading(true);
    try {
      const r = await fetch('/api/security/supply-chain/suppliers');
      setSup(await r.json());
    } catch {
      setSup({ configured: false, suppliers: [], logs: [], summary: null, guidance: 'Could not reach the suppliers endpoint.' });
    } finally {
      setSupLoading(false);
    }
  }

  useEffect(() => {
    fetch('/api/security/boundary-check').then((r) => r.json()).then(setBoundary).catch(() => setBoundaryErr(true));
    loadSuppliers();
  }, []);

  async function addSupplier() {
    if (!addName.trim()) return;
    setBusy('add'); setAddMsg(null);
    try {
      const r = await fetch('/api/security/supply-chain/suppliers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', name: addName.trim(), type: addType, contact: addContact.trim() || undefined }),
      });
      const d = await r.json();
      if (d.blocked) setAddMsg({ kind: 'blocked', text: `Blocked by supply-chain compliance: ${d.screen?.reason ?? 'prohibited source'}` });
      else if (d.added) { setAddMsg({ kind: d.screen?.severity === 'review' ? 'review' : 'ok', text: d.screen?.severity === 'review' ? `Added — flagged for review: ${d.screen?.reason}` : 'Supplier added and screened clear.' }); setAddName(''); setAddContact(''); await loadSuppliers(); }
      else setAddMsg({ kind: 'error', text: d.error ?? 'Add failed.' });
    } catch { setAddMsg({ kind: 'error', text: 'Add failed.' }); } finally { setBusy(null); }
  }

  async function removeSupplier(s: ScreenedSupplier) {
    if (!s.id) return;
    setBusy(s.id);
    try {
      await fetch('/api/security/supply-chain/suppliers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', id: s.id, name: s.name }),
      });
      await loadSuppliers();
    } finally { setBusy(null); }
  }

  async function rescreenAll() {
    setBusy('rescreen');
    try {
      await fetch('/api/security/supply-chain/suppliers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'rescreen' }),
      });
      await loadSuppliers();
    } finally { setBusy(null); }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400 max-w-3xl">
        Made-in-America / supply-chain screening (Perplexity doc §6, §8). BOM findings are decision-support, not a
        legal determination — a real prohibited-source call requires counsel and the enacted statute text.
      </p>

      {/* ── MycoForge live suppliers ─────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-300" /> Suppliers &amp; inventory (MycoForge — live)
          </h3>
          <button type="button" onClick={rescreenAll} disabled={busy !== null || !sup?.configured}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 inline-flex items-center gap-1.5 disabled:opacity-50">
            {busy === 'rescreen' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Rescreen all
          </button>
        </div>
        <p className="text-xs text-slate-500 max-w-3xl">
          Live from MycoForge&rsquo;s <code className="text-emerald-300">components</code> + <code className="text-emerald-300">customer_vendors</code> (shared Supabase).
          Every supplier is screened against the prohibited-source lists; adds are blocked on a prohibited match; every change is written to <code className="text-emerald-300">supply_chain_logs</code>.
        </p>

        {supLoading && <div className="text-xs text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading suppliers…</div>}

        {!supLoading && sup && !sup.configured && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {sup.guidance ?? 'MycoForge Supabase not configured in this environment.'}
          </div>
        )}

        {!supLoading && sup?.configured && (
          <>
            {sup.summary && (
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 rounded border border-slate-600 bg-slate-800/60 text-slate-200">{sup.summary.total} suppliers</span>
                {sup.summary.prohibited > 0 && <span className="px-2 py-1 rounded border border-red-500/40 bg-red-500/10 text-red-300">{sup.summary.prohibited} prohibited</span>}
                {sup.summary.review > 0 && <span className="px-2 py-1 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300">{sup.summary.review} review</span>}
                <span className="px-2 py-1 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">{sup.summary.ok} clear</span>
              </div>
            )}

            {/* Add supplier — compliance-enforced */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3 space-y-2">
              <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add supplier (screened before save)</div>
              <div className="flex flex-wrap gap-2">
                <input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Supplier / vendor name"
                  className="flex-1 min-w-[180px] bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-600" />
                <input value={addContact} onChange={(e) => setAddContact(e.target.value)} placeholder="Contact (optional)"
                  className="min-w-[140px] bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-600" />
                <button type="button" onClick={addSupplier} disabled={busy !== null || !addName.trim()}
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm inline-flex items-center gap-1.5 disabled:opacity-50">
                  {busy === 'add' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
                </button>
              </div>
              {addMsg && (
                <div className={`text-xs flex items-center gap-1.5 ${
                  addMsg.kind === 'blocked' || addMsg.kind === 'error' ? 'text-red-300' : addMsg.kind === 'review' ? 'text-amber-300' : 'text-emerald-300'}`}>
                  {addMsg.kind === 'ok' ? <CheckCircle2 className="w-3.5 h-3.5" /> : addMsg.kind === 'review' ? <AlertTriangle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />} {addMsg.text}
                </div>
              )}
            </div>

            {/* Supplier table */}
            <div className="overflow-x-auto rounded-lg border border-slate-700 max-h-96 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-800/60 text-slate-400 sticky top-0">
                  <tr><th className="text-left p-2">Supplier</th><th className="text-left p-2">Source</th><th className="text-left p-2">Components</th><th className="text-left p-2">Screen</th><th className="p-2"></th></tr>
                </thead>
                <tbody>
                  {sup.suppliers.map((s) => (
                    <tr key={`${s.source}-${s.id ?? s.name}`} className="border-t border-slate-800 align-top">
                      <td className="p-2 text-slate-200">{s.name}{s.contact && <div className="text-[10px] text-slate-500">{s.contact}</div>}</td>
                      <td className="p-2 text-slate-500 whitespace-nowrap">{s.source === 'customer_vendors' ? 'vendor' : 'inventory'}</td>
                      <td className="p-2 text-slate-400 whitespace-nowrap">{s.componentCount || '—'}{s.categories.length > 0 && <div className="text-[10px] text-slate-600">{s.categories.join(', ')}</div>}</td>
                      <td className="p-2">
                        <span className="inline-flex items-start gap-1.5">
                          {s.screen.severity === 'prohibited' ? <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                            : s.screen.severity === 'review' ? <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />}
                          <span className={s.screen.severity === 'prohibited' ? 'text-red-200' : s.screen.severity === 'review' ? 'text-amber-200' : 'text-emerald-300/80'}>
                            {s.screen.severity === 'ok' ? 'clear' : s.screen.reason}
                          </span>
                        </span>
                      </td>
                      <td className="p-2 text-right">
                        {s.removable && (
                          <button type="button" onClick={() => removeSupplier(s)} disabled={busy !== null} title="Remove supplier"
                            className="text-slate-500 hover:text-red-300 disabled:opacity-50">
                            {busy === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Supply-chain log feed */}
            {sup.logs.length > 0 && (
              <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
                <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Recent supply-chain compliance log</div>
                <ul className="space-y-1">
                  {sup.logs.slice(0, 8).map((l) => (
                    <li key={l.id} className="text-[11px] text-slate-400 flex flex-wrap gap-x-2">
                      <span className={l.to_status === 'compliance_blocked' ? 'text-red-300' : l.to_status === 'compliance_review' ? 'text-amber-300' : 'text-slate-300'}>{l.to_status}</span>
                      <span className="text-slate-300">{l.component_name}</span>
                      <span className="text-slate-600">{l.note}</span>
                      <span className="text-slate-600 ml-auto">{l.changed_at ? new Date(l.changed_at).toLocaleString() : ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>

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
