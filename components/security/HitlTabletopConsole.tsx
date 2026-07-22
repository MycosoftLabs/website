'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ShieldAlert, Play, Clock, Check, Copy, Download, Printer, Save,
  ArrowLeft, Loader2, AlertTriangle, FileText,
} from 'lucide-react';
import {
  INJECTS, CLOSEOUT_FIELDS, BOUNDARY_STATEMENT, CLASSIFICATION,
  DECISION_COUNT, PARTICIPANTS, type TabletopQuestion,
} from '@/lib/security/ir/hitl-tabletop-script';
import { captureToPdf, download, openPrintable, copyText } from '@/lib/security/ir/capture-export';

// IR.L2-3.6.3 facilitation console.
//
// HONESTY GATE — the whole point of this screen: it automates facilitation,
// timing, and paperwork, and automates NOTHING about the answers. Every
// decision, both attendance attestations, and all timestamps come from the
// humans in the room at the moment they act. Running the discussion IS the
// tabletop; pre-filling any of it would fabricate attendance evidence.
//
// This console never flips IR.L2-3.6.3 and never writes soc_ops. It records the
// session and hands the capture to the AAR -> DocuSign -> SHA-256 -> EV-IR-001
// path, where the control's evidence status is actually decided.

const DRAFT_KEY = 'mycosoft.ir363.hitl.draft.v1';
type State = Record<string, any>;

const fmtClock = (sec: number) =>
  `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

export default function HitlTabletopConsole() {
  const [S, setS] = useState<State>({});
  const [hydrated, setHydrated] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [capture, setCapture] = useState('');
  const [status, setStatus] = useState('');
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');
  const [preservedFields, setPreservedFields] = useState<string[]>([]);
  const outRef = useRef<HTMLTextAreaElement>(null);

  // hydrate the draft client-side only (avoids an SSR/client markup mismatch)
  useEffect(() => {
    try { setS(JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}')); } catch { /* fresh session */ }
    setHydrated(true);
  }, []);

  // Accepts a plain patch or a function of the previous state. Multi-select
  // answers MUST use the functional form: two option clicks landing in the same
  // React batch would otherwise both compute from the same stale array and the
  // first selection would be silently dropped — an unacceptable failure mode on
  // a record that becomes exercise evidence.
  const set = useCallback((patch: State | ((prev: State) => State)) => {
    setS((prev) => {
      const next = { ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) };
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  }, []);

  // live clock, resumed from the real recorded start after a refresh
  useEffect(() => {
    if (!S.startISO || S.endISO) return;
    const t0 = new Date(S.startISO).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - t0) / 1000)));
    tick();
    const h = window.setInterval(tick, 500);
    return () => window.clearInterval(h);
  }, [S.startISO, S.endISO]);

  const allQs = useMemo(() => INJECTS.flatMap((i) => i.questions), []);
  const answered = allQs.filter((q) => {
    const v = S[q.k];
    return Array.isArray(v) ? v.length > 0 : !!v;
  }).length;

  const missing: string[] = [];
  if (!S.startISO) missing.push('session not started');
  if (answered < DECISION_COUNT) missing.push(`${DECISION_COUNT - answered} decision(s)`);
  if (!S.s_format) missing.push('facilitation format');
  if (!S.c_all) missing.push('all-three-injects confirmation');
  if (!S.att_morgan) missing.push('Morgan’s attestation');
  if (!S.att_rj) missing.push('RJ’s attestation');
  const ready = missing.length === 0;

  function startSession() {
    if (S.startISO && !confirm(`Session already started at ${new Date(S.startISO).toLocaleString()}. Restart the clock?`)) return;
    set({ startISO: new Date().toISOString(), endISO: undefined });
  }

  function attest(who: string, checked: boolean) {
    // stamped at the moment the box is checked, by the person checking it
    set({ [`att_${who}`]: checked ? new Date().toISOString() : undefined });
  }

  // Toggle is resolved against `prev`, never against the render-scope snapshot,
  // so a burst of clicks can't drop or resurrect a selection.
  function pick(q: TabletopQuestion, value: string) {
    if (q.type === 'many') {
      set((prev) => {
        const cur: string[] = Array.isArray(prev[q.k]) ? prev[q.k] : [];
        return { [q.k]: cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value] };
      });
    } else {
      set({ [q.k]: value });
    }
  }
  const isSel = (q: TabletopQuestion, o: string) =>
    q.type === 'many' ? Array.isArray(S[q.k]) && S[q.k].includes(o) : S[q.k] === o;

  function answerText(q: TabletopQuestion): string {
    let v = S[q.k];
    if (Array.isArray(v)) v = v.map((x: string) => (x === '__other' ? `${q.other || 'Other'}: ${S['x_' + q.k] || ''}` : x)).join('; ');
    else if (v === '__other') v = `${q.other || 'Other'}: ${S['x_' + q.k] || ''}`;
    const n = S['n_' + q.k];
    return (v || '(not recorded)') + (n ? `  — Notes: ${n}` : '');
  }

  function buildCapture(endISO: string): string {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const dur = S.startISO ? Math.round((new Date(endISO).getTime() - new Date(S.startISO).getTime()) / 60000) : null;
    const L: string[] = [];
    L.push('# EV-IR-3.6.3 — HITL Tabletop Decision Capture (COMPLETED)', '',
      '**Control:** IR.L2-3.6.3 / NIST SP 800-171 3.6.3',
      `**Classification:** ${CLASSIFICATION}`, '',
      '> Recorded live in the HITL facilitation console. No answer, timestamp, or attestation was pre-filled.', '',
      '## Session record', '',
      '| Field | Factual entry |', '|---|---|',
      `| Exercise date | ${S.s_date || (S.startISO ? new Date(S.startISO).toLocaleDateString() : '(not recorded)')} |`,
      `| Actual start time | ${S.startISO ? `${new Date(S.startISO).toLocaleString()} (${tz})` : '(not recorded)'} |`,
      `| Actual end time | ${new Date(endISO).toLocaleString()} (${tz}) |`,
      `| Duration | ${dur != null ? `${dur} minutes` : '(not recorded)'} |`,
      `| Facilitation format | ${S.s_format || '(not recorded)'} |`,
      `| Facilitator | ${S.s_fac || '(not recorded)'} |`,
      `| Participants | ${PARTICIPANTS.filter((p) => S[`p_${p.k}`]).map((p) => `${p.name} (${p.role})`).join(' · ') || '(not recorded)'} |`,
      '| Exercise materials used | Rapid HITL script · Inject A · Inject B · Inject C |', '');
    for (const inj of INJECTS) {
      L.push(`## ${inj.title}`, '');
      inj.questions.forEach((q, i) => L.push(`${i + 1}. **${q.t}**`, `   - ${answerText(q)}`, ''));
    }
    L.push('## Actual results, gaps, and POA&M', '');
    for (const f of CLOSEOUT_FIELDS) L.push(`**${f.label}:**`, S[f.k] || '(not recorded)', '');
    L.push(`**Did Morgan and RJ participate through all three injects?** ${S.c_all || '(not recorded)'}`, '',
      '## Attendance attestation', '',
      'Each named participant attests only to the factual statement that they attended and participated in this discussion-based tabletop on the recorded date and time. This is not a statement that a live incident occurred, that a production action was performed, or that the control is Met.', '');
    for (const p of PARTICIPANTS) {
      const at = S[`att_${p.k}`];
      L.push(`**${p.name} — ${p.role}** — attended and participated: ${at ? 'YES' : '(not attested)'}${at ? `  ·  recorded ${new Date(at).toLocaleString()}` : ''}`, '');
    }
    L.push('## Cursor handoff', '',
      '**"Merge these factual HITL tabletop answers into the IR.L2-3.6.3 AAR and regenerate the unsigned PDF."**', '',
      'Cursor must preserve uncertainty, leave DocuSign signatures blank, and must **not** promote IR.L2-3.6.3 or update `soc_ops`. IR.L2-3.6.3 becomes evidence-ready only after the AAR is signed via DocuSign, stored, SHA-256 calculated, and `EV-IR-001` registered with a real evidence URI.');
    return L.join('\n');
  }

  async function finish() {
    const endISO = new Date().toISOString();
    const md = buildCapture(endISO);
    set({ endISO });
    setCapture(md);
    setSavingState('saving');
    try {
      // fetch() resolves on 4xx/5xx — an unchecked call would report "saved"
      // after an RLS rejection and the operator could close the tab believing
      // the session was recorded. Every write below is status-checked.
      const post = async (body: Record<string, unknown>) => {
        const r = await fetch('/api/security/tier1', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
        return r;
      };

      // 1) the session row — the full record of this run, keyed by real start time
      await post({
        op: 'upsert-record', kind: 'tabletop', personId: null,
        itemKey: `session-${S.startISO}`,
        data: {
          startISO: S.startISO, endISO, format: S.s_format, facilitator: S.s_fac,
          participants: PARTICIPANTS.filter((p) => S[`p_${p.k}`]).map((p) => p.name),
          attestations: Object.fromEntries(PARTICIPANTS.map((p) => [p.k, S[`att_${p.k}`] || null])),
          answers: Object.fromEntries(allQs.map((q) => [q.k, answerText(q)])),
          closeout: Object.fromEntries(CLOSEOUT_FIELDS.map((f) => [f.k, S[f.k] || ''])),
          allInjects: S.c_all, capture: md,
          evidenceStatus: 'unsigned-session-record',
        },
      });

      // 2) reflect the run in the Tier-1 panel's AAR fields — NON-DESTRUCTIVELY.
      //    The API replaces `data` wholesale, so we merge onto whatever is already
      //    stored and only fill fields that are currently empty. Anything Morgan or
      //    RJ typed by hand wins; this session's own notes live in the session row
      //    above either way. `signoff`/`signoffDate` are never written here — SAO
      //    sign-off stays a separate human act, which is what keeps IR.L2-3.6.3
      //    short of Met until DocuSign completes.
      let existing: Record<string, any> = {};
      try {
        const cur = await fetch('/api/security/tier1', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null));
        existing = (cur?.records || []).find((r: any) => r.kind === 'tabletop' && r.item_key === 'tabletop')?.data || {};
      } catch { /* fall through to a create */ }
      const keepOrFill = (field: string, value: string) => {
        const prior = (existing[field] ?? '').toString().trim();
        return prior ? prior : value;
      };
      const preserved = ['worked', 'gaps', 'actions', 'participants', 'date']
        .filter((f) => (existing[f] ?? '').toString().trim());
      await post({
        op: 'upsert-record', kind: 'tabletop', personId: null, itemKey: 'tabletop',
        data: {
          ...existing,
          date: keepOrFill('date', S.s_date || new Date(S.startISO || endISO).toISOString().slice(0, 10)),
          participants: keepOrFill('participants', PARTICIPANTS.filter((p) => S[`p_${p.k}`]).map((p) => p.name).join(', ')),
          s1: true, s2: true, s3: true,
          worked: keepOrFill('worked', S.c_worked || ''),
          gaps: keepOrFill('gaps', S.c_unresolved || ''),
          actions: keepOrFill('actions', [S.c_poam, S.c_actions].filter(Boolean).join('\n')),
          lastSessionKey: `session-${S.startISO}`,
        },
      });
      setPreservedFields(preserved);
      setSavingState('saved');
    } catch (e: any) {
      setSaveError(String(e?.message || e));
      setSavingState('error');
    }
    setTimeout(() => document.getElementById('captureCard')?.scrollIntoView({ behavior: 'smooth' }), 60);
  }

  const fileBase = `EV-IR-3.6.3_HITL_DECISION_CAPTURE_COMPLETED_${(S.s_date || new Date().toISOString().slice(0, 10)).replace(/[^0-9A-Za-z-]/g, '')}`;

  if (!hydrated) {
    return <div className="flex items-center gap-2 text-slate-400 p-8"><Loader2 className="w-4 h-4 animate-spin" /> Loading console…</div>;
  }

  const inputCls = 'w-full bg-slate-900/70 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500';

  return (
    <div className="max-w-4xl mx-auto pb-40">
      {/* sticky header: real elapsed clock + progress */}
      <div className="sticky top-0 z-30 -mx-4 px-4 py-3 bg-slate-950/95 backdrop-blur border-b border-slate-800 flex items-center gap-3 flex-wrap">
        <Link href="/security/compliance" className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-sm">
          <ArrowLeft className="w-4 h-4" /> Compliance
        </Link>
        <span className="text-[10px] font-bold uppercase tracking-widest bg-amber-400 text-amber-950 px-2 py-0.5 rounded">IR.L2-3.6.3</span>
        <span className="font-semibold text-slate-100">HITL Tabletop</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-slate-400">{answered}/{DECISION_COUNT} decisions</span>
          <span className="font-mono text-lg font-bold text-amber-300 tabular-nums flex items-center gap-1">
            <Clock className="w-4 h-4" />{fmtClock(elapsed)}
          </span>
          <button onClick={startSession}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/25 flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5" />{S.startISO ? 'Restart clock' : 'Start session'}
          </button>
        </div>
      </div>

      <div className="space-y-4 mt-4">
        {/* boundary */}
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <div className="flex items-center gap-2 font-semibold text-amber-200"><ShieldAlert className="w-4 h-4" /> Read aloud before starting</div>
          <p className="text-sm text-amber-50/90 mt-1.5 italic">{BOUNDARY_STATEMENT}</p>
          <p className="text-[11px] text-amber-200/70 mt-2">{CLASSIFICATION}</p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <h3 className="font-semibold text-slate-100">Session record</h3>
          <div className="grid md:grid-cols-2 gap-3 mt-3">
            <label className="block"><span className="text-[11px] text-slate-500">Exercise date</span>
              <input type="date" className={inputCls} value={S.s_date || ''} onChange={(e) => set({ s_date: e.target.value })} /></label>
            <label className="block"><span className="text-[11px] text-slate-500">Facilitator</span>
              <input className={inputCls} placeholder="Morgan Rockcoons" defaultValue={S.s_fac || ''} onBlur={(e) => set({ s_fac: e.target.value })} /></label>
          </div>
          <div className="mt-3">
            <span className="text-[11px] text-slate-500">Facilitation format</span>
            <div className="flex gap-2 flex-wrap mt-1">
              {['Same room', 'Video/phone', 'Asynchronous written discussion'].map((o) => (
                <button key={o} onClick={() => set({ s_format: o })}
                  className={`px-3 py-1.5 rounded-lg border text-sm ${S.s_format === o ? 'border-sky-500 bg-sky-500/15 text-sky-100' : 'border-slate-700 bg-slate-900/50 text-slate-300 hover:border-slate-500'}`}>{o}</button>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <span className="text-[11px] text-slate-500">Participants present</span>
            <div className="flex gap-4 flex-wrap mt-1 text-sm">
              {PARTICIPANTS.map((p) => (
                <label key={p.k} className="flex items-center gap-2 text-slate-200">
                  <input type="checkbox" checked={!!S[`p_${p.k}`]} onChange={(e) => set({ [`p_${p.k}`]: e.target.checked })} />
                  {p.name} <span className="text-slate-500">({p.role})</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* injects */}
        {INJECTS.map((inj) => (
          <div key={inj.id} className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
            <h3 className="font-semibold text-slate-100">{inj.title}</h3>
            <p className="text-sm text-slate-300 mt-1.5"><span className="text-slate-500">Premise: </span>{inj.premise}</p>
            <details className="mt-2">
              <summary className="text-xs text-sky-300 cursor-pointer hover:text-sky-200">Modeled MYCA automated-responder actions (context — nothing is executed)</summary>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{inj.modeled}</p>
            </details>

            {inj.questions.map((q, i) => (
              <div key={q.k} className="mt-4 pt-3 border-t border-slate-700/60">
                <div className="text-sm text-slate-100"><span className="font-mono text-xs text-amber-300/80 mr-1.5">{q.k}</span>{i + 1}. {q.t}
                  {q.type === 'many' && <span className="ml-2 text-[10px] uppercase tracking-wider text-sky-300/80">select all that apply</span>}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[...q.options, ...(q.other ? ['__other'] : [])].map((o) => {
                    const label = o === '__other' ? `${q.other}…` : o;
                    const on = isSel(q, o);
                    return (
                      <button key={o} onClick={() => pick(q, o)}
                        className={`px-3 py-1.5 rounded-lg border text-sm text-left ${on ? 'border-emerald-500 bg-emerald-500/15 text-emerald-100' : 'border-slate-700 bg-slate-900/50 text-slate-300 hover:border-slate-500'}`}>
                        {on && <Check className="w-3.5 h-3.5 inline mr-1" />}{label}
                      </button>
                    );
                  })}
                </div>
                {isSel(q, '__other') && (
                  <input className={`${inputCls} mt-2`} placeholder={`${q.other}…`} defaultValue={S['x_' + q.k] || ''}
                    onBlur={(e) => set({ ['x_' + q.k]: e.target.value })} />
                )}
                {q.notes && (
                  <input className={`${inputCls} mt-2`} placeholder="Notes (optional)" defaultValue={S['n_' + q.k] || ''}
                    onBlur={(e) => set({ ['n_' + q.k]: e.target.value })} />
                )}
              </div>
            ))}
          </div>
        ))}

        {/* closeout */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <h3 className="font-semibold text-slate-100">Closeout</h3>
          {CLOSEOUT_FIELDS.map((f) => (
            <label key={f.k} className="block mt-3">
              <span className="text-[11px] text-slate-500">{f.label}</span>
              <textarea className={`${inputCls} min-h-[60px]`} defaultValue={S[f.k] || ''} onBlur={(e) => set({ [f.k]: e.target.value })} />
            </label>
          ))}
          <div className="mt-3">
            <span className="text-[11px] text-slate-500">Did Morgan and RJ participate through all three injects?</span>
            <div className="flex gap-2 mt-1">
              {['Yes', 'No — do not prepare the AAR for DocuSign'].map((o) => (
                <button key={o} onClick={() => set({ c_all: o })}
                  className={`px-3 py-1.5 rounded-lg border text-sm ${S.c_all === o ? 'border-sky-500 bg-sky-500/15 text-sky-100' : 'border-slate-700 bg-slate-900/50 text-slate-300 hover:border-slate-500'}`}>{o}</button>
              ))}
            </div>
          </div>
        </div>

        {/* attestation */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <h3 className="font-semibold text-slate-100">Attendance attestation</h3>
          <p className="text-xs text-slate-400 mt-1">
            Each participant attests only that they attended and participated on the recorded date and time. This is not a
            statement that a live incident occurred, that a production action was performed, or that the control is Met.
          </p>
          <div className="grid md:grid-cols-2 gap-3 mt-3">
            {PARTICIPANTS.map((p) => (
              <div key={p.k} className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
                <div className="font-medium text-slate-100 text-sm">{p.name}</div>
                <div className="text-[11px] text-slate-500">{p.role}</div>
                <label className="flex items-center gap-2 mt-2 text-sm text-slate-200">
                  <input type="checkbox" checked={!!S[`att_${p.k}`]} onChange={(e) => attest(p.k, e.target.checked)} />
                  I attended and participated
                </label>
                {S[`att_${p.k}`] && <div className="text-[11px] text-emerald-300 mt-1 font-mono">stamped {new Date(S[`att_${p.k}`]).toLocaleString()}</div>}
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs rounded-lg bg-slate-900/60 border border-slate-700 p-2.5 text-slate-400">
            Each attestation is stamped with the moment the box is checked, from this device. Do not check a box on another person’s behalf.
          </div>
        </div>

        {/* capture output */}
        {capture && (
          <div id="captureCard" className="rounded-xl border border-emerald-600/40 bg-emerald-500/5 p-4">
            <h3 className="font-semibold text-slate-100 flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-300" /> Completed decision capture</h3>
            <p className="text-sm text-slate-300 mt-1">
              Paste into Cursor with: <b>“Merge these factual HITL tabletop answers into the IR.L2-3.6.3 AAR and regenerate the unsigned PDF.”</b>
            </p>
            <textarea ref={outRef} readOnly value={capture}
              className="w-full mt-3 h-64 bg-slate-950 border border-slate-700 rounded p-3 text-xs font-mono text-slate-200" />
            <div className="flex gap-2 mt-2 flex-wrap">
              <button onClick={async () => setStatus((await copyText(capture, outRef.current)) ? 'Copied — paste into Cursor with the merge instruction.' : 'Copy blocked — select the text and press Ctrl+C.')}
                className="px-3 py-1.5 rounded-lg text-sm bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/25 flex items-center gap-1.5"><Copy className="w-3.5 h-3.5" /> Copy to clipboard</button>
              <button onClick={() => setStatus(download(new Blob([capture], { type: 'text/markdown;charset=utf-8' }), `${fileBase}.md`) ? `Saved ${fileBase}.md` : 'Download blocked — use Copy or Printable view.')}
                className="px-3 py-1.5 rounded-lg text-sm bg-slate-800 border border-slate-600 text-slate-200 hover:border-slate-400 flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Download .md</button>
              <button onClick={() => { try { const b = captureToPdf(capture); setStatus(download(b, `${fileBase}.pdf`) ? `Saved ${fileBase}.pdf (${Math.round(b.size / 1024)} KB)` : 'Download blocked — use Printable view.'); } catch (e: any) { setStatus(`PDF build failed: ${e?.message || e}`); } }}
                className="px-3 py-1.5 rounded-lg text-sm bg-slate-800 border border-slate-600 text-slate-200 hover:border-slate-400 flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Download PDF</button>
              <button onClick={() => setStatus(openPrintable(capture, fileBase) ? 'Opened a printable tab — press Ctrl+P there and choose Save as PDF.' : 'Popup blocked — allow popups, or use Download .md.')}
                className="px-3 py-1.5 rounded-lg text-sm bg-slate-800 border border-slate-600 text-slate-200 hover:border-slate-400 flex items-center gap-1.5"><Printer className="w-3.5 h-3.5" /> Printable view</button>
            </div>
            <div className="text-xs text-slate-400 mt-2">
              {savingState === 'saving' && <span className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Saving session to the compliance record…</span>}
              {savingState === 'saved' && (
                <span className="text-emerald-300 flex items-center gap-1.5"><Save className="w-3 h-3" /> Session saved to the Tier-1 record — visible to Morgan and RJ.
                  {preservedFields.length > 0 && (
                    <span className="text-slate-400"> Existing after-action entries ({preservedFields.join(', ')}) were left as typed; this session’s notes are in the session record.</span>
                  )}
                </span>
              )}
              {savingState === 'error' && (
                <span className="text-amber-300 flex items-start gap-1.5"><AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                  <span><b>Not saved to the server.</b> Copy or download the capture below before closing this tab — it exists only in this browser.
                    {saveError && <span className="block font-mono text-[10px] text-amber-400/80 mt-0.5">{saveError}</span>}
                    <span className="block text-slate-400 mt-0.5">If this says “row-level security”, sign in with your @mycosoft.org account and press Finish again.</span>
                  </span>
                </span>
              )}
            </div>
            {status && <div className="text-xs text-sky-300 mt-1">{status}</div>}
            <div className="mt-3 text-xs rounded-lg bg-slate-900/60 border border-slate-700 p-2.5 text-slate-400">
              This capture and its downloads are the <b>session record</b>, not the signed evidence artifact. IR.L2-3.6.3 stays
              short of Met until the AAR is signed via DocuSign, stored, SHA-256 calculated, and <span className="font-mono">EV-IR-001</span> registered with a real evidence URI.
            </div>
          </div>
        )}
      </div>

      {/* footer gate */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-slate-950/95 backdrop-blur border-t border-slate-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3 flex-wrap">
          <span className="text-xs text-slate-400">
            {ready ? 'All decisions and attestations recorded.' : `Still needed: ${missing.join(' · ')}`}
          </span>
          <button disabled={!ready} onClick={finish}
            className={`ml-auto px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 ${ready ? 'bg-amber-400 text-amber-950 hover:bg-amber-300' : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}`}>
            <Check className="w-4 h-4" /> Finish &amp; generate capture
          </button>
        </div>
      </div>
    </div>
  );
}
