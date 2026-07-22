'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GraduationCap, Search, FileSignature, ClipboardCheck, AlertTriangle,
  ShieldCheck, Loader2, Printer, UserPlus, ExternalLink, Users, Wifi, WifiOff,
} from 'lucide-react';

interface Person { id: string; name: string; role?: string; email?: string; sort_order?: number }
interface Rec { id: string; kind: string; person_id: string | null; item_key: string; data: Record<string, any>; updated_by?: string; updated_at?: string }
interface MasScore { total_controls: number; implemented: number; partial: number; implementation_percent: number }
interface ScreeningEvent {
  event_id: string;
  legal_name: string;
  role?: string;
  provider: string;
  package: string;
  completed_at?: string;
  disposition: string;
  adjudication_memo_id?: string;
  adjudicator_name?: string;
}

const COURSES = [
  { id: 'cui', name: 'CUI — CDSE IF141.06', url: 'https://www.cdse.edu/Training/eLearning/IF141/' },
  { id: 'insider', name: 'Insider Threat — CDSE INT101.16', url: 'https://www.cdse.edu/Training/eLearning/INT101/' },
  { id: 'rob', name: 'Mycosoft RoB briefing', url: '' },
];
const CTRLS = [
  { id: 'AT.L2-3.2.1', sec: 'training', label: 'Security awareness (risks + policies)' },
  { id: 'AT.L2-3.2.2', sec: 'training', label: 'Trained for assigned duties' },
  { id: 'AT.L2-3.2.3', sec: 'training', label: 'Insider-threat awareness' },
  { id: 'PS.L2-3.9.1', sec: 'screening', label: 'Screen individuals before CUI access' },
  { id: 'PS.L2-3.9.2', sec: 'screening', label: 'Access agreements signed' },
  { id: 'IR.L2-3.6.3', sec: 'tabletop', label: 'Test the incident-response capability' },
  { id: 'IR.L2-3.6.2', sec: 'incidents', label: 'Track/report incidents (log + DIBNet)' },
];
const SECTIONS: [string, string, any][] = [
  ['overview', 'Overview', ClipboardCheck], ['training', 'Training', GraduationCap],
  ['screening', 'Screening', Search], ['tabletop', 'Tabletop', FileSignature], ['incidents', 'Incidents · DIBNet', AlertTriangle],
];
const STLBL: Record<string, string> = {
  met: 'Met · evidence ready',
  prog: 'In progress · Partial in soc_ops',
  todo: 'Not started',
};
const masStateToUi = (impl: string | undefined): string => {
  const s = (impl || '').toLowerCase();
  if (s === 'implemented') return 'met';
  if (s === 'partial') return 'prog';
  return 'todo';
};
const stCls = (s: string) => s === 'met' ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10'
  : s === 'prog' ? 'text-amber-300 border-amber-500/40 bg-amber-500/10' : 'text-slate-300 border-slate-600 bg-slate-500/10';
const dotCls = (s: string) => s === 'met' ? 'bg-emerald-400' : s === 'prog' ? 'bg-amber-400' : 'bg-slate-500';

// Module-level (stable identity) uncontrolled text/date field. `key` on the
// inner input re-mounts it only when the underlying record actually changes
// (a remote edit), so a 15s poll never steals focus or clobbers active typing.
function Field({ rec, field, onSave, type = 'text', ph }: { rec?: Rec; field: string; onSave: (v: string) => void; type?: string; ph?: string }) {
  const v = (rec?.data?.[field] ?? '') as string;
  return (
    <input type={type} defaultValue={v} placeholder={ph} key={`${rec?.id ?? 'new'}:${rec?.updated_at ?? ''}:${field}`}
      onBlur={(e) => { if ((e.target.value || '') !== v) onSave(e.target.value); }}
      className="w-full bg-slate-900/70 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500" />
  );
}

export default function Tier1Panel() {
  const [personnel, setPersonnel] = useState<Person[]>([]);
  const [records, setRecords] = useState<Rec[]>([]);
  const [me, setMe] = useState(''); const [live, setLive] = useState(false); const [note, setNote] = useState<string | null>(null);
  const [masScore, setMasScore] = useState<MasScore | null>(null);
  const [masAtControls, setMasAtControls] = useState<Record<string, string>>({});
  const [masPsControls, setMasPsControls] = useState<Record<string, string>>({});
  const [screeningEvents, setScreeningEvents] = useState<ScreeningEvent[]>([]);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(0);
  const [section, setSection] = useState('overview');
  const recRef = useRef<Rec[]>([]); recRef.current = records;

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/security/tier1'); const d = await r.json();
      if (r.ok) {
        setPersonnel(d.personnel || []); setRecords(d.records || []); setMe(d.me || '');
        setLive(!!d.live); setNote(d.note || null);
        setMasScore(d.masScore || null);
        setMasAtControls(d.masAtControls || {});
        setMasPsControls(d.masPsControls || {});
        setScreeningEvents(d.screeningEvents || []);
      }
    } catch { /* offline */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  const recOf = (kind: string, pid: string | null, key: string) =>
    records.find(r => r.kind === kind && (r.person_id || null) === (pid || null) && r.item_key === key);
  const dataOf = (kind: string, pid: string | null, key: string): Record<string, any> =>
    recRef.current.find(r => r.kind === kind && (r.person_id || null) === (pid || null) && r.item_key === key)?.data || {};

  const patch = useCallback(async (kind: string, pid: string | null, key: string, partial: Record<string, any>) => {
    const merged = { ...(recRef.current.find(r => r.kind === kind && (r.person_id || null) === (pid || null) && r.item_key === key)?.data || {}), ...partial };
    setRecords(prev => {
      const i = prev.findIndex(r => r.kind === kind && (r.person_id || null) === (pid || null) && r.item_key === key);
      const next: Rec = { ...(i >= 0 ? prev[i] : { id: 'tmp-' + key, kind, person_id: pid, item_key: key, data: {} }), data: merged, updated_by: me, updated_at: new Date().toISOString() };
      const arr = [...prev]; if (i >= 0) arr[i] = next; else arr.push(next); return arr;
    });
    setSaving(s => s + 1);
    try { await fetch('/api/security/tier1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'upsert-record', kind, personId: pid, itemKey: key, data: merged }) }); }
    catch { /* keep optimistic */ } finally { setSaving(s => Math.max(0, s - 1)); }
  }, [me]);

  // concise field helper — Field is module-level, so this just wires props
  const F = (kind: string, pid: string | null, key: string, field: string, opts?: { type?: string; ph?: string }) =>
    <Field rec={recOf(kind, pid, key)} field={field} type={opts?.type} ph={opts?.ph} onSave={(v) => patch(kind, pid, key, { [field]: v })} />;

  // ---- status ----
  const trainDone = () => personnel.length > 0 && personnel.every(p => COURSES.every(c => dataOf('training', p.id, c.id).status === 'complete'));
  const trainProg = () => personnel.some(p => COURSES.some(c => ['complete', 'progress'].includes(dataOf('training', p.id, c.id).status)));
  const screenSt = (pid: string) => { const r = dataOf('screening', pid, 'screening'); return (r.completed && r.result === 'favorable' && r.authorized) ? 'met' : (r.initiated || r.type || r.ref) ? 'prog' : 'todo'; };
  const aaSt = (pid: string) => { const r = dataOf('access_agreement', pid, 'aa'); return r.emp && r.rep ? 'met' : (r.emp || r.rep) ? 'prog' : 'todo'; };
  const screeningCleared = () => screeningEvents.length > 0 && screeningEvents.every(e => e.disposition === 'cleared');
  const ctrlSt = (id: string): string => {
    // AT family: soc_ops on MAS is authoritative — training rows complete ≠ Met
    if (id === 'AT.L2-3.2.1' || id === 'AT.L2-3.2.2' || id === 'AT.L2-3.2.3') {
      const masSt = masAtControls[id];
      if (masSt) return masStateToUi(masSt);
      return trainDone() ? 'prog' : trainProg() ? 'prog' : 'todo';
    }
    if (id === 'PS.L2-3.9.1') {
      const masSt = masPsControls[id];
      if (masSt) return masStateToUi(masSt);
      if (screeningCleared()) return 'prog';
      if (personnel.length > 0 && personnel.every(p => screenSt(p.id) === 'met')) return 'prog';
      return personnel.some(p => screenSt(p.id) !== 'todo') ? 'prog' : 'todo';
    }
    if (id === 'PS.L2-3.9.2') {
      const masSt = masPsControls[id];
      if (masSt) return masStateToUi(masSt);
      if (personnel.length > 0 && personnel.every(p => aaSt(p.id) === 'met')) return 'prog';
      return personnel.some(p => aaSt(p.id) !== 'todo') ? 'prog' : 'todo';
    }
    if (id === 'IR.L2-3.6.3') { const t = dataOf('tabletop', null, 'tabletop'); return (t.date && t.signoff) ? 'met' : (t.date || t.s1) ? 'prog' : 'todo'; }
    if (id === 'IR.L2-3.6.2') { const d = dataOf('dibnet', null, 'dibnet'); const keys = ['cert', 'reg', 'test', 'know']; return keys.every(k => d[k]) ? 'met' : keys.some(k => d[k]) ? 'prog' : 'todo'; }
    return 'todo';
  };
  const metCount = CTRLS.filter(c => ctrlSt(c.id) === 'met').length;

  async function addPerson() {
    const name = prompt('Full name of the person to onboard:'); if (!name) return;
    const role = prompt('Role (e.g. Engineering · CUI handler):') || '';
    const email = prompt('Company email (@mycosoft.org):') || '';
    setSaving(s => s + 1);
    try { await fetch('/api/security/tier1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'add-person', name, role, email, sortOrder: personnel.length + 1 }) }); await load(); }
    finally { setSaving(s => Math.max(0, s - 1)); }
  }
  const addIncident = () => patch('incident', null, 'inc-' + Date.now(), { date: '', desc: '', sev: 'Low', cui: 'No', report: '', status: 'Open' });
  async function delIncident(id: string) { setRecords(p => p.filter(r => r.id !== id)); await fetch('/api/security/tier1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'delete-record', id }) }); load(); }

  const firstName = (n: string) => n.split(' ')[0];
  const cbx = (kind: string, pid: string | null, key: string, field: string) => { const d = dataOf(kind, pid, key); return { checked: !!d[field], onChange: (e: any) => patch(kind, pid, key, { [field]: e.target.checked }) }; };
  const sel = (kind: string, pid: string | null, key: string, field: string, def = '') => { const d = dataOf(kind, pid, key); return { value: d[field] ?? def, onChange: (e: any) => patch(kind, pid, key, { [field]: e.target.value }) }; };

  return (
    <div className="max-w-5xl mx-auto space-y-5" data-tour="tier1-section">
      {/* header */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-sky-600 to-indigo-700 grid place-items-center"><ShieldCheck className="w-6 h-6 text-white" /></div>
            <div>
              <h2 className="text-xl font-bold">Tier-1 Turnkey — operator controls</h2>
              <p className="text-sm text-slate-400">Close AT / PS / IR with no laptops or PreVeil. Shared across the team, live.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] px-2 py-1 rounded border flex items-center gap-1 ${live ? 'border-emerald-500/40 text-emerald-300' : 'border-amber-500/40 text-amber-300'}`}>
              {live ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}{live ? `Live · ${me}` : 'Sign in to sync'}</span>
            {saving > 0 && <span className="text-[11px] text-sky-300 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />saving</span>}
            <button onClick={() => window.print()} className="text-xs px-3 py-1.5 rounded-lg border border-slate-600 hover:border-sky-500 flex items-center gap-1.5"><Printer className="w-3.5 h-3.5" />Evidence pack</button>
          </div>
        </div>
        {note && <div className="mt-3 text-xs rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 text-amber-100">{note}</div>}
        {masScore && (
          <div className="mt-3 text-xs rounded-lg bg-slate-900/60 border border-slate-600 p-2.5 text-slate-300 flex flex-wrap gap-x-4 gap-y-1">
            <span>MAS score (live): <span className="text-emerald-300 font-medium">{masScore.implemented}</span> implemented rows</span>
            <span><span className="text-amber-300 font-medium">{masScore.partial}</span> partial</span>
            <span>of {masScore.total_controls} mapped · {masScore.implementation_percent}%</span>
            <span className="text-slate-500">AT.L2-3.2.x = Partial until org program close</span>
            {masPsControls['PS.L2-3.9.1'] && <span className="text-slate-500">PS.3.9.1 = {masPsControls['PS.L2-3.9.1']}</span>}
            {masPsControls['PS.L2-3.9.2'] && <span className="text-slate-500">PS.3.9.2 = {masPsControls['PS.L2-3.9.2']}</span>}
          </div>
        )}
        <div className="flex gap-1.5 mt-4 flex-wrap">
          {SECTIONS.map(([s, n, Ic]) => {
            let cls = 'todo'; if (s !== 'overview') { const cs = CTRLS.filter(c => c.sec === s).map(c => ctrlSt(c.id)); cls = cs.every(x => x === 'met') ? 'met' : cs.some(x => x !== 'todo') ? 'prog' : 'todo'; }
            return <button key={s} onClick={() => setSection(s)} className={`text-sm px-3 py-1.5 rounded-lg border flex items-center gap-2 ${section === s ? 'bg-slate-700 border-slate-500 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}>
              <Ic className="w-4 h-4" />{n}{s !== 'overview' && <span className={`w-2 h-2 rounded-full ${dotCls(cls)}`} />}</button>;
          })}
        </div>
      </div>

      {loading ? <div className="text-slate-400 text-sm flex items-center gap-2 p-6"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div> : (<>
        {/* OVERVIEW */}
        {section === 'overview' && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <h3 className="font-semibold flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-sky-400" /> {metCount} of {CTRLS.length} Tier-1 controls evidence-ready</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 flex items-center gap-1"><Users className="w-3.5 h-3.5" />{personnel.length} personnel</span>
                <button onClick={addPerson} className="text-xs px-3 py-1.5 rounded-lg border border-slate-600 hover:border-sky-500 flex items-center gap-1.5"><UserPlus className="w-3.5 h-3.5" />Onboard person</button>
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-3">No hardware needed. Fill each section, capture the named evidence, print the pack, hand to Cursor to flip in <code className="text-purple-300">soc_ops</code>. Tier-1 evidence-ready ≠ Met — AT and PS families follow MAS <code className="text-purple-300">soc_ops</code> unless score API reports implemented.</p>
            <div className="divide-y divide-slate-700/60">
              {CTRLS.map(c => { const s = ctrlSt(c.id); return (
                <div key={c.id} className="flex items-center gap-3 py-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${dotCls(s)}`} />
                  <span className="text-xs font-mono text-amber-300/90 w-28 shrink-0">{c.id}</span>
                  <span className="text-sm flex-1">{c.label}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded border ${stCls(s)}`}>{STLBL[s]}</span>
                  <button onClick={() => setSection(c.sec)} className="text-xs text-sky-300 hover:underline shrink-0">Open →</button>
                </div>
              ); })}
            </div>
          </div>
        )}

        {/* TRAINING */}
        {section === 'training' && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
            <h3 className="font-semibold flex items-center gap-2 flex-wrap"><GraduationCap className="w-5 h-5 text-sky-400" /> Security Awareness &amp; Training <span className="text-xs font-mono text-amber-300/90">AT.L2-3.2.1/.2/.3</span></h3>
            <p className="text-sm text-slate-400 mt-1">Each handler completes the three courses and keeps the certificate. CDSE courses are free and produce a dated certificate that is the evidence.</p>
            <div className="grid sm:grid-cols-3 gap-2 mt-3">
              {COURSES.map(c => <div key={c.id} className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
                <div className="text-sm font-medium">{c.name}</div>
                {c.url ? <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-300 inline-flex items-center gap-1 mt-1">Open course <ExternalLink className="w-3 h-3" /></a>
                  : <div className="text-xs text-slate-400 mt-1">Read + attest to the Mycosoft CUI Rules of Behavior + signed policies.</div>}
              </div>)}
            </div>
            <div className="overflow-x-auto mt-4 border border-slate-700 rounded-lg">
              <table className="w-full text-sm min-w-[560px]">
                <thead><tr className="text-slate-400 text-[11px] uppercase bg-slate-800/60"><th className="text-left p-2.5">Person</th><th className="text-left p-2.5">Course</th><th className="text-left p-2.5">Status</th><th className="text-left p-2.5">Completed</th><th className="text-left p-2.5">Certificate ref</th></tr></thead>
                <tbody className="divide-y divide-slate-700/50">
                  {personnel.map(p => COURSES.map(c => { const d = dataOf('training', p.id, c.id); const st = d.status || 'todo'; const cs = st === 'complete' ? 'met' : st === 'progress' ? 'prog' : 'todo'; return (
                    <tr key={p.id + c.id}><td className="p-2.5"><span className={`inline-block w-2 h-2 rounded-full mr-2 ${dotCls(cs)}`} />{firstName(p.name)}</td>
                      <td className="p-2.5 text-slate-300">{c.name}</td>
                      <td className="p-2.5">
                        {st === 'complete' ? (
                          <span className={`text-[11px] px-2 py-0.5 rounded border ${stCls('met')}`}>Complete</span>
                        ) : (
                          <select {...sel('training', p.id, c.id, 'status', 'todo')} className="bg-slate-900/70 border border-slate-700 rounded px-2 py-1 text-xs">
                            <option value="todo">Not started</option><option value="progress">In progress</option><option value="complete">Complete</option></select>
                        )}
                      </td>
                      <td className="p-2.5">{st === 'complete' && d.date ? <span className="text-emerald-200">{d.date}</span> : F('training', p.id, c.id, 'date', { type: 'date' })}</td>
                      <td className="p-2.5">{st === 'complete' && d.cert ? <code className="text-emerald-300 text-xs">{d.cert}</code> : F('training', p.id, c.id, 'cert', { ph: 'EV-AT-001 / EV-AT-ROB-MORGAN' })}</td></tr>
                  ); }))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-xs rounded-lg bg-sky-500/10 border border-sky-500/30 p-2.5 text-sky-100">
              Morgan + RJ: CDSE certs <code>EV-AT-001</code>–<code>004</code> and RoB DocuSign <code>EV-AT-ROB-MORGAN</code> / <code>EV-AT-ROB-RJ</code> filed in <code>docs/cmmc_evidence/at/</code>.
              Tier-1 rows should show <b>Complete</b> with those register IDs (15s refresh). AT.L2-3.2.1/.2/.3 follow MAS soc_ops — currently <b>Partial</b> until org program close.
            </div>
          </div>
        )}

        {/* SCREENING */}
        {section === 'screening' && (<>
          {screeningEvents.length > 0 && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
              <h3 className="font-semibold flex items-center gap-2 flex-wrap"><Search className="w-5 h-5 text-sky-400" /> Personnel screening — soc_ops (live MAS)</h3>
              <p className="text-sm text-slate-400 mt-1">HireRight six-check packages + peer adjudication memos. Metadata only — report bodies stay in PreVeil.</p>
              <div className="overflow-x-auto mt-3 border border-slate-700 rounded-lg">
                <table className="w-full text-sm min-w-[640px]">
                  <thead><tr className="text-slate-400 text-[11px] uppercase bg-slate-800/60">
                    <th className="text-left p-2.5">Person</th><th className="text-left p-2.5">Provider</th><th className="text-left p-2.5">Package</th>
                    <th className="text-left p-2.5">Completed</th><th className="text-left p-2.5">Disposition</th><th className="text-left p-2.5">Adjudication ref</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {screeningEvents.map(ev => {
                      const done = ev.disposition === 'cleared';
                      return (
                        <tr key={ev.event_id}>
                          <td className="p-2.5"><span className={`inline-block w-2 h-2 rounded-full mr-2 ${dotCls(done ? 'met' : 'prog')}`} />{ev.legal_name}</td>
                          <td className="p-2.5 text-slate-300">{ev.provider}</td>
                          <td className="p-2.5 text-slate-300">{ev.package}</td>
                          <td className="p-2.5">{ev.completed_at ? String(ev.completed_at).slice(0, 10) : '—'}</td>
                          <td className="p-2.5"><span className={`text-[11px] px-2 py-0.5 rounded border ${stCls(done ? 'met' : 'prog')}`}>{done ? 'Complete · cleared' : ev.disposition}</span></td>
                          <td className="p-2.5"><code className="text-emerald-300 text-xs">{ev.adjudication_memo_id || '—'}</code></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 text-xs text-slate-500">PS.L2-3.9.1 soc_ops: {masPsControls['PS.L2-3.9.1'] || 'loading…'} — Met only after evidence emitter adjudicate run.</div>
            </div>
          )}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
            <h3 className="font-semibold flex items-center gap-2 flex-wrap"><Search className="w-5 h-5 text-sky-400" /> Personnel Screening <span className="text-xs font-mono text-amber-300/90">PS.L2-3.9.1</span></h3>
            <p className="text-sm text-slate-400 mt-1">Screen each handler <b>before</b> CUI access. A documented commercial background check (identity, criminal, employment) with a favorable SAO adjudication is sufficient for CUI (non-classified).</p>
            <div className="grid md:grid-cols-2 gap-3 mt-4">
              {personnel.map(p => { const s = screenSt(p.id); return (
                <div key={p.id} className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
                  <div className="text-sm font-medium flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${dotCls(s)}`} />{p.name} <span className="text-slate-500 font-normal text-xs">· {p.role}</span></div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div><div className="text-[11px] text-slate-500 mb-0.5">Type</div>{F('screening', p.id, 'screening', 'type', { ph: 'Background check' })}</div>
                    <div><div className="text-[11px] text-slate-500 mb-0.5">Provider</div>{F('screening', p.id, 'screening', 'provider', { ph: 'Checkr / Sterling' })}</div>
                    <div><div className="text-[11px] text-slate-500 mb-0.5">Initiated</div>{F('screening', p.id, 'screening', 'initiated', { type: 'date' })}</div>
                    <div><div className="text-[11px] text-slate-500 mb-0.5">Completed</div>{F('screening', p.id, 'screening', 'completed', { type: 'date' })}</div>
                    <div><div className="text-[11px] text-slate-500 mb-0.5">Adjudication</div>
                      <select {...sel('screening', p.id, 'screening', 'result')} className="w-full bg-slate-900/70 border border-slate-700 rounded px-2 py-1.5 text-sm">
                        <option value="">—</option><option value="favorable">Favorable</option><option value="unfavorable">Unfavorable</option><option value="pending">Pending</option></select></div>
                    <div><div className="text-[11px] text-slate-500 mb-0.5">Record ref</div>{F('screening', p.id, 'screening', 'ref', { ph: 'file / report id' })}</div>
                  </div>
                  <label className="flex items-center gap-2 mt-2.5 text-sm"><input type="checkbox" {...cbx('screening', p.id, 'screening', 'authorized')} /> SAO adjudicated favorable &amp; authorized CUI access</label>
                </div>
              ); })}
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
            <h3 className="font-semibold flex items-center gap-2 flex-wrap"><FileSignature className="w-5 h-5 text-sky-400" /> Access Agreements <span className="text-xs font-mono text-amber-300/90">PS.L2-3.9.2</span></h3>
            <div className="overflow-x-auto mt-3 border border-slate-700 rounded-lg">
              <table className="w-full text-sm min-w-[480px]"><thead><tr className="text-slate-400 text-[11px] uppercase bg-slate-800/60"><th className="text-left p-2.5">Person</th><th className="text-left p-2.5">Employee signed</th><th className="text-left p-2.5">SAO / rep signed</th><th className="text-left p-2.5">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-700/50">{personnel.map(p => { const s = aaSt(p.id); return (
                  <tr key={p.id}><td className="p-2.5">{p.name}</td>
                    <td className="p-2.5">{s === 'met' ? <span className={`text-[11px] px-2 py-0.5 rounded border ${stCls('met')}`}>Signed</span> : <label className="flex items-center gap-2"><input type="checkbox" {...cbx('access_agreement', p.id, 'aa', 'emp')} /> signed</label>}</td>
                    <td className="p-2.5">{s === 'met' ? <span className={`text-[11px] px-2 py-0.5 rounded border ${stCls('met')}`}>Signed</span> : <label className="flex items-center gap-2"><input type="checkbox" {...cbx('access_agreement', p.id, 'aa', 'rep')} /> signed</label>}</td>
                    <td className="p-2.5"><span className={`text-[11px] px-2 py-0.5 rounded border ${stCls(s)}`}>{s === 'met' ? 'Complete' : s === 'prog' ? 'Partial' : 'Not started'}</span></td></tr>
                ); })}</tbody></table>
            </div>
            <div className="mt-3 text-xs rounded-lg bg-sky-500/10 border border-sky-500/30 p-2.5 text-sky-100">
              Morgan + RJ access agreements and HireRight screening complete (Jul 21). Tier-1 <code>access_agreement</code> rows should show both signatures on refresh.
              PS.L2-3.9.2 soc_ops: <b>{masPsControls['PS.L2-3.9.2'] || 'planned/partial'}</b> — control Met follows MAS score API, not checkbox alone.
            </div>
          </div>
        </>)}

        {/* TABLETOP */}
        {section === 'tabletop' && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
            <h3 className="font-semibold flex items-center gap-2 flex-wrap"><FileSignature className="w-5 h-5 text-sky-400" /> Incident-Response Tabletop <span className="text-xs font-mono text-amber-300/90">IR.L2-3.6.3</span></h3>
            <p className="text-sm text-slate-400 mt-1">Run the three scenarios from the signed IR Runbook (Morgan = lead, RJ = support), then complete the after-action report below.</p>
            <div className="grid md:grid-cols-3 gap-2 mt-3 text-xs">
              {[['1 — Phishing → CUI exfil', 'Harvested PreVeil creds → unknown-IP CUI download. Detect → contain (revoke) → eradicate → assess reportability → DIBNet ≤72h → recover → lessons.'],
                ['2 — Ransomware on endpoint', 'Encrypted files on a CMMC laptop. Isolate host → CUI-impact → preserve evidence → rebuild → restore backup → reporting → lessons.'],
                ['3 — Lost / stolen laptop', 'Laptop stolen; FDE + PreVeil. Remote-revoke → confirm encryption → police report → exposure assessment → replace → lessons.']].map(([t, b]) =>
                <div key={t} className="rounded-lg border border-slate-700 bg-slate-900/40 p-3"><div className="font-medium text-slate-200">Scenario {t}</div><div className="text-slate-400 mt-1">{b}</div></div>)}
            </div>
            <div className="grid md:grid-cols-2 gap-3 mt-4">
              <div><div className="text-[11px] text-slate-500 mb-0.5">Date conducted</div>{F('tabletop', null, 'tabletop', 'date', { type: 'date' })}</div>
              <div><div className="text-[11px] text-slate-500 mb-0.5">Participants</div>{F('tabletop', null, 'tabletop', 'participants', { ph: 'Morgan (lead), RJ (support)' })}</div>
            </div>
            <div className="flex gap-4 flex-wrap mt-3 text-sm">
              {[['s1', 'Phishing/exfil'], ['s2', 'Ransomware'], ['s3', 'Lost laptop']].map(([k, l]) =>
                <label key={k} className="flex items-center gap-2"><input type="checkbox" {...cbx('tabletop', null, 'tabletop', k)} /> {l}</label>)}
            </div>
            {[['worked', 'What worked'], ['gaps', 'Gaps identified'], ['actions', 'Corrective actions (owner · due)']].map(([f, l]) => { const r = recOf('tabletop', null, 'tabletop'); return (
              <div key={f} className="mt-3"><div className="text-[11px] text-slate-500 mb-0.5">{l}</div>
                <textarea defaultValue={r?.data?.[f] ?? ''} key={`tt:${r?.updated_at ?? ''}:${f}`} onBlur={e => { if ((e.target.value || '') !== (r?.data?.[f] ?? '')) patch('tabletop', null, 'tabletop', { [f]: e.target.value }); }}
                  className="w-full bg-slate-900/70 border border-slate-700 rounded px-2 py-1.5 text-sm min-h-[60px] focus:outline-none focus:border-sky-500" /></div>); })}
            <div className="grid md:grid-cols-2 gap-3 mt-3">
              <div><div className="text-[11px] text-slate-500 mb-0.5">SAO sign-off (name)</div>{F('tabletop', null, 'tabletop', 'signoff', { ph: 'Morgan Rockcoons, SAO' })}</div>
              <div><div className="text-[11px] text-slate-500 mb-0.5">Sign-off date</div>{F('tabletop', null, 'tabletop', 'signoffDate', { type: 'date' })}</div>
            </div>
            <div className="mt-3 text-xs rounded-lg bg-sky-500/10 border border-sky-500/30 p-2.5 text-sky-100">Date + sign-off filled → print the Evidence pack; this section is the after-action report for IR.3.6.3.</div>
          </div>
        )}

        {/* INCIDENTS + DIBNET */}
        {section === 'incidents' && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
            <h3 className="font-semibold flex items-center gap-2 flex-wrap"><AlertTriangle className="w-5 h-5 text-sky-400" /> Incident Log &amp; DIBNet <span className="text-xs font-mono text-amber-300/90">IR.L2-3.6.2</span></h3>
            <p className="text-sm text-slate-400 mt-1">Maintain a record of incidents and be ready to report to DoD within 72 hours (DFARS 252.204-7012).</p>
            <div className="mt-3 space-y-1.5">
              {[['cert', 'Obtain a DoD-approved medium-assurance PKI (ECA) certificate — needed to log into DIBNet.'],
                ['reg', 'Register the company at dibnet.dod.mil with the ECA cert (CAGE 9KR60).'],
                ['test', 'Confirm login works and you can reach the reporting form (do not submit a test report).'],
                ['know', 'Brief the 72-hour rule: reportable cyber incident → report within 72h; preserve images 90 days.']].map(([k, l]) =>
                <label key={k} className="flex items-start gap-2.5 text-sm rounded-lg border border-slate-700 bg-slate-900/40 p-2.5"><input type="checkbox" className="mt-0.5" {...cbx('dibnet', null, 'dibnet', k)} /><span>{l}</span></label>)}
            </div>
            <div className="flex items-center justify-between mt-4 mb-1"><h4 className="text-sm font-semibold">Incident log</h4>
              <button onClick={addIncident} className="text-xs px-3 py-1.5 rounded-lg border border-slate-600 hover:border-sky-500">+ Add incident</button></div>
            <div className="overflow-x-auto border border-slate-700 rounded-lg">
              <table className="w-full text-xs min-w-[640px]"><thead><tr className="text-slate-400 uppercase bg-slate-800/60"><th className="text-left p-2">Detected</th><th className="text-left p-2">Description</th><th className="text-left p-2">Severity</th><th className="text-left p-2">CUI?</th><th className="text-left p-2">Reported / case #</th><th className="text-left p-2">Status</th><th></th></tr></thead>
                <tbody className="divide-y divide-slate-700/50">
                  {records.filter(r => r.kind === 'incident').length === 0 ? <tr><td colSpan={7} className="text-center text-slate-500 p-4">No incidents — an empty, maintained log is the expected state.</td></tr> :
                    records.filter(r => r.kind === 'incident').map(r => (
                      <tr key={r.id}><td className="p-2">{F('incident', null, r.item_key, 'date', { type: 'date' })}</td>
                        <td className="p-2">{F('incident', null, r.item_key, 'desc', { ph: 'what happened' })}</td>
                        <td className="p-2"><select {...sel('incident', null, r.item_key, 'sev', 'Low')} className="bg-slate-900/70 border border-slate-700 rounded px-1.5 py-1">{['Low', 'Medium', 'High', 'Critical'].map(o => <option key={o}>{o}</option>)}</select></td>
                        <td className="p-2"><select {...sel('incident', null, r.item_key, 'cui', 'No')} className="bg-slate-900/70 border border-slate-700 rounded px-1.5 py-1">{['No', 'Yes', 'Unknown'].map(o => <option key={o}>{o}</option>)}</select></td>
                        <td className="p-2">{F('incident', null, r.item_key, 'report', { ph: 'case # / n/a' })}</td>
                        <td className="p-2"><select {...sel('incident', null, r.item_key, 'status', 'Open')} className="bg-slate-900/70 border border-slate-700 rounded px-1.5 py-1">{['Open', 'Contained', 'Closed'].map(o => <option key={o}>{o}</option>)}</select></td>
                        <td className="p-2"><button onClick={() => delIncident(r.id)} className="text-red-400 hover:text-red-300">✕</button></td></tr>
                    ))}
                </tbody></table>
            </div>
          </div>
        )}
      </>)}
    </div>
  );
}
