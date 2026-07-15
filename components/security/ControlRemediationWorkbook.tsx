'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, Circle, Wrench, FileText, ShoppingCart, Server, Camera,
  FlaskConical, Send, GraduationCap, ExternalLink, ShieldCheck, Target,
  ClipboardList, AlertTriangle, Info, ListChecks,
} from 'lucide-react';
import {
  getRemediationPlan, type RemediationPlan, type StepAction,
} from '@/lib/security/remediation/remediation-library';
import {
  getControlReference, isPoamExcluded, WEIGHTS_VERIFIED, type PoamEligibility,
} from '@/lib/security/reference/cmmc-l2-reference';

// Minimal shape we need — matches the page's ComplianceControl.
export interface WorkbookControl {
  id: string;
  framework: string;
  family: string;
  name: string;
  description?: string;
  status: 'compliant' | 'partial' | 'non_compliant' | 'not_applicable';
  evidence?: string[];
  lastAudit?: string;
  lastAuditBy?: string;
  priority?: string;
  notes?: string;
  cmmcLevel?: number;
  poamId?: string;
}

const ACTION_META: Record<StepAction, { icon: typeof Wrench; label: string; color: string }> = {
  procure: { icon: ShoppingCart, label: 'Procure', color: 'text-fuchsia-300' },
  configure: { icon: Wrench, label: 'Configure', color: 'text-blue-300' },
  document: { icon: FileText, label: 'Document', color: 'text-purple-300' },
  deploy: { icon: Server, label: 'Deploy', color: 'text-cyan-300' },
  'collect-evidence': { icon: Camera, label: 'Collect evidence', color: 'text-amber-300' },
  test: { icon: FlaskConical, label: 'Test', color: 'text-emerald-300' },
  submit: { icon: Send, label: 'Submit', color: 'text-green-300' },
  train: { icon: GraduationCap, label: 'Train', color: 'text-orange-300' },
};

const STATUS_LABEL: Record<WorkbookControl['status'], string> = {
  compliant: 'Met',
  partial: 'Partially met',
  non_compliant: 'Not met',
  not_applicable: 'Not applicable',
};

interface ParsedSnapshot {
  summary?: string;
  currentNote?: string;
  currentState?: string;
  currentAsOf?: string;
  targetNote?: string;
  targetState?: string;
  targetAsOf?: string;
  evidenceUri?: string | null;
}

function parseSnapshot(notes?: string): ParsedSnapshot | null {
  if (!notes) return null;
  const t = notes.trim();
  if (!t.startsWith('{')) return null;
  try {
    const o = JSON.parse(t) as Record<string, any>;
    const cs = o.current_state ?? {};
    const ts = o.target_state ?? {};
    return {
      summary: typeof o.summary === 'string' ? o.summary : undefined,
      currentNote: typeof cs.notes === 'string' ? cs.notes : undefined,
      currentState: typeof cs.implementation_state === 'string' ? cs.implementation_state : undefined,
      currentAsOf: typeof cs.as_of === 'string' ? cs.as_of : undefined,
      targetNote: typeof ts.notes === 'string' ? ts.notes : undefined,
      targetState: typeof ts.implementation_state === 'string' ? ts.implementation_state : undefined,
      targetAsOf: typeof ts.as_of === 'string' ? ts.as_of : undefined,
      evidenceUri: cs.evidence_uri ?? o.evidence_uri ?? null,
    };
  } catch {
    return null;
  }
}

function prettyAssessor(v?: string): string {
  if (!v) return 'Self-assessment';
  if (v === 'soc_ops') return 'MAS soc_ops (automated record)';
  return v;
}

function fmtDate(v?: string): string {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ControlRemediationWorkbook({ control }: { control: WorkbookControl }) {
  const plan: RemediationPlan = useMemo(
    () => getRemediationPlan(control.id, control.family),
    [control.id, control.family]
  );
  const snap = useMemo(() => parseSnapshot(control.notes), [control.notes]);
  const ref = useMemo(() => getControlReference(control.id), [control.id]);
  const poamExcluded = useMemo(() => isPoamExcluded(control.id), [control.id]);
  const storageKey = `mycosoft:remediation:v1:${control.id}`;

  // Merge primary-source example tools with the remediation library's tools (dedup).
  const mergedTools = useMemo(() => {
    const seen = new Set<string>();
    return [...(ref?.tools ?? []), ...plan.tools].filter((t) => {
      const k = t.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [ref, plan.tools]);

  const [done, setDone] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);
  const [docBusy, setDocBusy] = useState(false);

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      setDone(raw ? JSON.parse(raw) : {});
    } catch {
      setDone({});
    }
    setLoaded(true);
  }, [storageKey]);

  function toggle(stepId: string) {
    setDone((prev) => {
      const next = { ...prev, [stepId]: !prev[stepId] };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const total = plan.steps.length;
  const complete = plan.steps.filter((s) => done[s.id]).length;
  const pct = total > 0 ? Math.round((complete / total) * 100) : 0;
  const allDone = total > 0 && complete === total;

  // Clean description: only show if it adds information beyond the title/summary.
  const desc = control.description && control.description.trim();
  const showDesc = !!desc && desc !== control.name && desc !== snap?.summary;

  const evidence = (control.evidence ?? []).filter((e) => e && e.trim() && e.trim() !== 'null');
  const hasEvidence = evidence.length > 0;

  const isPoam = !!control.poamId;

  return (
    <div
      className="mt-4 rounded-xl border border-slate-700 bg-slate-900/70 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header strip */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-700 bg-slate-800/60">
        <span className="text-xs font-mono text-slate-400">{control.id}</span>
        <span className={`text-xs px-2 py-0.5 rounded border ${
          control.status === 'compliant' ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10' :
          control.status === 'partial' ? 'border-amber-500/40 text-amber-300 bg-amber-500/10' :
          control.status === 'non_compliant' ? 'border-red-500/40 text-red-300 bg-red-500/10' :
          'border-slate-500/40 text-slate-300 bg-slate-500/10'
        }`}>{STATUS_LABEL[control.status]}</span>
        {isPoam && (
          <span className="text-xs px-2 py-0.5 rounded border border-orange-500/40 text-orange-300 bg-orange-500/10">
            On POA&amp;M
          </span>
        )}
        {ref && <PoamBadge eligibility={ref.poamEligibility} excluded={poamExcluded} />}
        <span className="ml-auto text-xs text-slate-500 flex items-center gap-1">
          <ClipboardList className="w-3.5 h-3.5" /> Remediation workbook
        </span>
      </div>

      <div className="p-4 space-y-5">
        {showDesc && <p className="text-sm text-slate-300">{desc}</p>}

        {/* Metadata grid — refined */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <Meta label="Priority" value={(control.priority || 'medium').toUpperCase()} tone={
            control.priority === 'high' ? 'red' : control.priority === 'medium' ? 'amber' : 'green'} />
          {ref && (
            <Meta
              label="SPRS weight (max)"
              value={`${ref.isNa ? 'NA · blocking (SSP)' : ref.dual ? `${ref.weightRaw}` : `${ref.weightMax} pt${ref.weightMax === 1 ? '' : 's'}`}${WEIGHTS_VERIFIED ? '' : ' · unverified'}`}
              tone={WEIGHTS_VERIFIED ? undefined : 'amber'}
            />
          )}
          <Meta label="Responsible" value={plan.responsibleRole} />
          <Meta label="Last assessed" value={fmtDate(control.lastAudit)} />
          <Meta label="Assessed by" value={prettyAssessor(control.lastAuditBy)} />
        </div>

        {ref?.weightMax != null && !WEIGHTS_VERIFIED && (
          <div className="text-[11px] text-amber-300/80 flex items-start gap-1.5 -mt-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Weight shown for reference only. SPRS score is <strong>not</strong> computed from control weights pending reconciliation against the DoD Assessment Methodology v1.2.1 (corrected table expected ~2026-07-12).</span>
          </div>
        )}

        {/* Assessment methods */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500">Assessment method:</span>
          {plan.assessmentMethods.map((m) => (
            <span key={m} className="px-2 py-0.5 rounded bg-slate-700/70 text-slate-300 capitalize">{m}</span>
          ))}
        </div>

        {/* Current vs target (parsed, not raw JSON) */}
        {(snap?.currentNote || snap?.targetNote) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {snap?.currentNote && (
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                <div className="text-xs text-slate-500 mb-1">Current state {snap.currentAsOf ? `· ${fmtDate(snap.currentAsOf)}` : ''}</div>
                <div className="text-sm text-slate-300">{snap.currentNote}</div>
              </div>
            )}
            {snap?.targetNote && (
              <div className="rounded-lg border border-emerald-700/40 bg-emerald-900/10 p-3">
                <div className="text-xs text-emerald-500/80 mb-1">Target · projected (post-provisioning — not a committed date)</div>
                <div className="text-sm text-emerald-200/90">{snap.targetNote}</div>
              </div>
            )}
          </div>
        )}

        {/* Evidence — rendered, not a JSON dump */}
        <div>
          <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Camera className="w-3.5 h-3.5" /> Evidence on file</div>
          {hasEvidence ? (
            <div className="flex flex-wrap gap-2">
              {evidence.map((e, i) => {
                const isUrl = /^https?:\/\//.test(e) || e.startsWith('/');
                return isUrl ? (
                  <a key={i} href={e} target="_blank" rel="noopener noreferrer"
                     className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-purple-300 inline-flex items-center gap-1">
                    {e.length > 48 ? `${e.slice(0, 48)}…` : e} <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span key={i} className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-200">{e}</span>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-amber-300/80 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> No evidence collected yet — complete the steps below to produce it.
            </div>
          )}
        </div>

        {/* ── Remediation workbook ─────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-700 bg-slate-950/40">
          <div className="px-4 py-3 border-b border-slate-700">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Target className="w-4 h-4 text-purple-300" /> How to become compliant
            </div>
            <p className="text-xs text-slate-400 mt-1">{plan.objective}</p>
          </div>

          <div className="p-4 space-y-4">
            {/* Why it matters */}
            <div className="rounded-lg bg-purple-500/10 border border-purple-500/30 p-3 text-xs text-purple-100 flex gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-purple-300" />
              <span>{plan.whyItMatters}</span>
            </div>

            {/* Primary-source guidance (cited doc) */}
            {ref?.guidance && (
              <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-3 text-xs text-slate-300 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Implementation guidance</span>
                  {ref.guidanceVerified && <span className="text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/40 text-emerald-300">CMMC Assessment Guide v2.13 · verbatim</span>}
                </div>
                <div className="whitespace-pre-line leading-relaxed">{ref.guidance}</div>
                {ref.guidanceSourceCitation && <div className="text-[10px] text-slate-600">{ref.guidanceSourceCitation}</div>}
              </div>
            )}

            {/* Assessment objectives ([a]/[b]/[c]) — the C3PAO check-off list */}
            {ref?.assessmentObjectives && ref.assessmentObjectives.length > 0 && (
              <div className="rounded-lg bg-slate-800/40 border border-slate-700 p-3">
                <div className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5"><ListChecks className="w-3.5 h-3.5" /> Assessment objectives (determination statements)</div>
                <ul className="space-y-0.5">
                  {ref.assessmentObjectives.map((o, i) => (
                    <li key={i} className="text-xs text-slate-400">{o}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Potential assessment methods & objects */}
            {ref?.exampleAssessmentObjects && (ref.exampleAssessmentObjects.Examine || ref.exampleAssessmentObjects.Interview || ref.exampleAssessmentObjects.Test) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                {(['Examine', 'Interview', 'Test'] as const).map((m) =>
                  ref.exampleAssessmentObjects?.[m] ? (
                    <div key={m} className="rounded-lg bg-slate-800/40 border border-slate-700 p-2">
                      <div className="text-[11px] font-semibold text-purple-300 mb-1">{m}</div>
                      <div className="text-[11px] text-slate-400">{ref.exampleAssessmentObjects[m]}</div>
                    </div>
                  ) : null
                )}
              </div>
            )}

            {/* Tools + protocols + refs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <Chips title="Tools / systems" items={mergedTools} tone="blue" />
              <Chips title="Protocols" items={plan.protocols} tone="slate" />
              <Chips title="References" items={plan.references} tone="purple" />
            </div>

            {/* Progress + feedback loop */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-300 flex items-center gap-1.5"><ListChecks className="w-4 h-4" /> {complete} of {total} steps complete</span>
                <span className={allDone ? 'text-emerald-300 font-semibold' : 'text-slate-400'}>{pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-emerald-500' : 'bg-purple-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-slate-400">
                {allDone
                  ? 'All steps complete — file the evidence bundle and mark this control Implemented to raise the SPRS score.'
                  : `Estimated effort: ${plan.estimatedEffort}. Checkmarks are saved on this device.`}
              </div>
            </div>

            {/* Steps */}
            <ol className="space-y-2">
              {plan.steps.map((step, i) => {
                const meta = ACTION_META[step.action];
                const Icon = meta.icon;
                const checked = !!done[step.id];
                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      onClick={() => toggle(step.id)}
                      className={`w-full text-left rounded-lg border p-3 flex gap-3 transition ${
                        checked ? 'border-emerald-600/40 bg-emerald-900/10' : 'border-slate-700 bg-slate-800/40 hover:bg-slate-800/70'
                      }`}
                    >
                      {checked
                        ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                        : <Circle className="w-5 h-5 shrink-0 text-slate-500 mt-0.5" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] text-slate-500">Step {i + 1}</span>
                          <span className={`text-[11px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-700/70 ${meta.color}`}>
                            <Icon className="w-3 h-3" /> {meta.label}
                          </span>
                          {step.system && <span className="text-[11px] text-slate-400">· {step.system}</span>}
                        </div>
                        <div className={`text-sm mt-1 ${checked ? 'text-slate-400 line-through' : 'text-slate-100'}`}>{step.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{step.detail}</div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                          {step.evidenceArtifact && (
                            <span className="text-[11px] text-amber-300/80 inline-flex items-center gap-1">
                              <Camera className="w-3 h-3" /> Produces: {step.evidenceArtifact}
                            </span>
                          )}
                          {step.owner && <span className="text-[11px] text-slate-500">Owner: {step.owner}</span>}
                          {step.link && (
                            <a href={step.link.href} target="_blank" rel="noopener noreferrer"
                               onClick={(e) => e.stopPropagation()}
                               className="text-[11px] text-purple-300 inline-flex items-center gap-1 hover:underline">
                              {step.link.label} <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>

            {/* Evidence required + acceptance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
                <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5"><Camera className="w-3.5 h-3.5" /> Evidence required</div>
                <ul className="space-y-1">
                  {plan.evidenceRequired.map((e, i) => (
                    <li key={i} className="text-xs text-slate-400 flex gap-1.5"><span className="text-slate-600">•</span>{e}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
                <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Met when (acceptance)</div>
                <ul className="space-y-1">
                  {plan.acceptanceCriteria.map((a, i) => (
                    <li key={i} className="text-xs text-slate-400 flex gap-1.5"><span className="text-emerald-600">✓</span>{a}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Submit / feedback */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                disabled={docBusy}
                onClick={async () => {
                  setDocBusy(true);
                  try {
                    const res = await fetch('/api/security/reports/generate', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ reportType: 'control-packet', controlId: control.id, format: 'html' }),
                    });
                    const html = await res.text();
                    const w = window.open('', '_blank');
                    if (w) { w.document.write(html); w.document.close(); }
                  } finally { setDocBusy(false); }
                }}
                className="min-h-[40px] px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                title="MYCA generates the SSP implementation statement + policy for this control"
              >
                {docBusy ? <Circle className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Generate SSP / policy doc
              </button>
              <button
                type="button"
                disabled={!allDone}
                className={`min-h-[40px] px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2 ${
                  allDone ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
                title={allDone ? 'Mark ready for assessor review' : 'Complete all steps to enable'}
              >
                <Send className="w-4 h-4" /> Mark ready for assessor review
              </button>
              {loaded && !allDone && (
                <span className="text-xs text-slate-500">{total - complete} step{total - complete === 1 ? '' : 's'} remaining to Met</span>
              )}
              {allDone && (
                <span className="text-xs text-emerald-300 inline-flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Ready — file evidence, then set Implemented</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value, tone }: { label: string; value: string; tone?: 'red' | 'amber' | 'green' }) {
  const toneCls = tone === 'red' ? 'text-red-300' : tone === 'amber' ? 'text-amber-300' : tone === 'green' ? 'text-green-300' : 'text-slate-200';
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className={`text-xs mt-0.5 ${toneCls}`}>{value}</div>
    </div>
  );
}

function PoamBadge({ eligibility, excluded }: { eligibility: PoamEligibility; excluded: boolean }) {
  // Excluded / not-eligible are the ones that MUST be met before assessment.
  if (eligibility === 'no-excluded' || excluded) {
    return <span className="text-xs px-2 py-0.5 rounded border border-red-500/40 text-red-300 bg-red-500/10" title="Not POA&M-eligible — must be met before assessment (32 CFR §170.21)">POA&amp;M: excluded</span>;
  }
  if (eligibility === 'no') {
    return <span className="text-xs px-2 py-0.5 rounded border border-red-500/40 text-red-300 bg-red-500/10" title="Weight &gt; 1 — not POA&M-eligible; must be met">POA&amp;M: not eligible</span>;
  }
  if (eligibility === 'carveout') {
    return <span className="text-xs px-2 py-0.5 rounded border border-amber-500/40 text-amber-300 bg-amber-500/10" title="Narrow carve-out (SC.L2-3.13.11): POA&M-able only in the 3-pt not-FIPS-validated case">POA&amp;M: carve-out</span>;
  }
  if (eligibility === 'yes') {
    return <span className="text-xs px-2 py-0.5 rounded border border-emerald-500/40 text-emerald-300 bg-emerald-500/10" title="1-point control — POA&M-eligible under 32 CFR §170.21">POA&amp;M: eligible</span>;
  }
  return null;
}

function Chips({ title, items, tone }: { title: string; items: string[]; tone: 'blue' | 'slate' | 'purple' }) {
  const cls = tone === 'blue' ? 'bg-blue-500/15 text-blue-200 border-blue-500/30'
    : tone === 'purple' ? 'bg-purple-500/15 text-purple-200 border-purple-500/30'
    : 'bg-slate-700/60 text-slate-300 border-slate-600/50';
  return (
    <div>
      <div className="text-[11px] text-slate-500 mb-1">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it, i) => (
          <span key={i} className={`text-[11px] px-1.5 py-0.5 rounded border ${cls}`}>{it}</span>
        ))}
      </div>
    </div>
  );
}
