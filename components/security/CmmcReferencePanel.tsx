'use client';

import { useState } from 'react';
import { AlertTriangle, BookOpen, Landmark, FileLock2, ShieldAlert, ExternalLink } from 'lucide-react';
import { VERIFICATION_FLAGS, SPRS_MATH, POAM_RULES, WEIGHTS_VERIFIED } from '@/lib/security/reference/cmmc-l2-reference';
import { computeSprs, determineCmmcStatus } from '@/lib/security/reference/sprs';
import { CMMC_L3_REQUIREMENTS, CMMC_L3_META } from '@/lib/security/reference/cmmc-l3-requirements';
import { STATUTORY_FRAMEWORK, STATUTORY_VERIFY_NOTE, CUI_CATEGORIES, CUI_HANDLING } from '@/lib/security/reference/statutory-framework';

type Sub = 'flags' | 'l3' | 'statutory' | 'cui';

const SUBS: Array<{ id: Sub; label: string; icon: typeof BookOpen }> = [
  { id: 'flags', label: 'Verification flags', icon: ShieldAlert },
  { id: 'l3', label: 'Level 3 (800-172)', icon: BookOpen },
  { id: 'statutory', label: 'Statutory framework', icon: Landmark },
  { id: 'cui', label: 'CUI handling', icon: FileLock2 },
];

const sevColor: Record<string, string> = {
  high: 'border-red-500/40 bg-red-500/10 text-red-200',
  medium: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  low: 'border-slate-500/40 bg-slate-500/10 text-slate-300',
};

export default function CmmcReferencePanel() {
  const [sub, setSub] = useState<Sub>('flags');

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-400 max-w-3xl">
        Primary-source reference extracted from the CMMC L2/L3 research doc (141 citations). Reference only —
        items flagged <span className="text-amber-300">verify</span> need direct confirmation against the cited
        regulatory text before being treated as authoritative logic.
      </p>

      <div className="flex flex-wrap gap-2">
        {SUBS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSub(s.id)}
            className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 ${
              sub === s.id ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <s.icon className="w-4 h-4" /> {s.label}
          </button>
        ))}
      </div>

      {sub === 'flags' && (
        <div className="space-y-4">
          {WEIGHTS_VERIFIED ? <SprsCard /> : (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100 flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>
                <strong>SPRS scoring is locked.</strong> The doc&rsquo;s per-control table weights ({SPRS_MATH.parsedTableDistribution})
                do not match the methodology cross-check ({SPRS_MATH.methodologyDistribution}). The app does not compute a
                SPRS score from weights until Perplexity&rsquo;s corrected weight table lands. Start {SPRS_MATH.startingScore};
                conditional threshold {SPRS_MATH.conditionalThreshold}; min {SPRS_MATH.minScore}. The scoring engine is built
                and gated — it activates automatically the moment verified weights are in place.
              </span>
            </div>
          )}
          <div className="space-y-2">
            {VERIFICATION_FLAGS.map((f) => (
              <div key={f.id} className={`rounded-lg border p-3 ${sevColor[f.severity]}`}>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-black/20">{f.severity}</span>
                  {f.topic}
                </div>
                <div className="text-xs mt-1 opacity-90">{f.detail}</div>
                <div className="text-[11px] mt-1 opacity-70">Reconcile against: {f.reconcileAgainst}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3 text-xs text-slate-300">
            <div className="font-semibold mb-1">POA&amp;M rules (32 CFR §170.21) — reference</div>
            <ul className="space-y-1 text-slate-400">
              <li>• {POAM_RULES.eligibleRule}</li>
              <li>• Carve-out: {POAM_RULES.carveout}</li>
              <li>• Excluded (VERIFY): {POAM_RULES.excludedControls.join(', ')}</li>
              <li>• Max {POAM_RULES.maxItems} items on a POA&amp;M · {POAM_RULES.closeWindowDays}-day close window</li>
            </ul>
          </div>
        </div>
      )}

      {sub === 'l3' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3 text-xs text-slate-300 grid grid-cols-1 md:grid-cols-2 gap-y-1 gap-x-4">
            <div><span className="text-slate-500">Requirements:</span> {CMMC_L3_META.totalRequirements} (NIST SP 800-172)</div>
            <div><span className="text-slate-500">Assessor:</span> {CMMC_L3_META.assessor}</div>
            <div><span className="text-slate-500">Prerequisite:</span> {CMMC_L3_META.prerequisite}</div>
            <div><span className="text-slate-500">Phase start:</span> {CMMC_L3_META.phaseStart} (Phase 3)</div>
            <div className="md:col-span-2 text-amber-300/80"><AlertTriangle className="w-3 h-3 inline mr-1" />{CMMC_L3_META.verifyTacoL3}</div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-700">
            <table className="w-full text-xs">
              <thead className="bg-slate-800/60 text-slate-400">
                <tr><th className="text-left p-2">ID</th><th className="text-left p-2">Title</th><th className="text-left p-2">Guidance</th></tr>
              </thead>
              <tbody>
                {CMMC_L3_REQUIREMENTS.map((r) => (
                  <tr key={r.id} className="border-t border-slate-800">
                    <td className="p-2 font-mono text-purple-300 whitespace-nowrap">{r.id}{r.poamIneligible && <span className="ml-1 text-red-300" title="POA&M-ineligible (verify §170.21(a)(3))">*</span>}</td>
                    <td className="p-2 text-slate-200 whitespace-nowrap">{r.title}</td>
                    <td className="p-2 text-slate-400">{r.guidance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-[11px] text-slate-500">* POA&amp;M-ineligible per secondary compilations of 32 CFR §170.21(a)(3) — verify.</div>
        </div>
      )}

      {sub === 'statutory' && (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-lg border border-slate-700">
            <table className="w-full text-xs">
              <thead className="bg-slate-800/60 text-slate-400">
                <tr><th className="text-left p-2">Instrument</th><th className="text-left p-2">Effective</th><th className="text-left p-2">Applies when</th><th className="text-left p-2">Key obligation</th></tr>
              </thead>
              <tbody>
                {STATUTORY_FRAMEWORK.map((s) => (
                  <tr key={s.instrument} className="border-t border-slate-800 align-top">
                    <td className="p-2 whitespace-nowrap">
                      {s.href ? (
                        <a href={s.href} target="_blank" rel="noopener noreferrer" className="text-purple-300 inline-flex items-center gap-1 hover:underline">
                          {s.instrument} <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : <span className="text-slate-200">{s.instrument}</span>}
                      <div className="text-[10px] text-slate-500">{s.citation}</div>
                    </td>
                    <td className="p-2 text-slate-300 whitespace-nowrap">{s.effectiveDate}</td>
                    <td className="p-2 text-slate-400">{s.applicability}</td>
                    <td className="p-2 text-slate-400">{s.keyObligation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-[11px] text-amber-300/80 flex gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0" />{STATUTORY_VERIFY_NOTE}</div>
        </div>
      )}

      {sub === 'cui' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-lg border border-slate-700">
            <table className="w-full text-xs">
              <thead className="bg-slate-800/60 text-slate-400">
                <tr><th className="text-left p-2">Category</th><th className="text-left p-2">Banner (Specified)</th><th className="text-left p-2">Banner (Basic)</th><th className="text-left p-2">Relevance to Mycosoft</th></tr>
              </thead>
              <tbody>
                {CUI_CATEGORIES.map((c) => (
                  <tr key={c.category} className="border-t border-slate-800 align-top">
                    <td className="p-2 text-slate-200">{c.category}</td>
                    <td className="p-2 font-mono text-emerald-300 whitespace-nowrap">{c.bannerSpecified}</td>
                    <td className="p-2 font-mono text-slate-300">{c.bannerBasic}</td>
                    <td className="p-2 text-slate-400">{c.relevance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <RefCard title="Basic vs. Specified" body={CUI_HANDLING.basicVsSpecified} />
            <RefCard title="Enclave guidance" body={CUI_HANDLING.enclaveGuidance} />
            <RefCard title="Storage / transmission / destruction" body={`${CUI_HANDLING.storage} ${CUI_HANDLING.transmission} ${CUI_HANDLING.destruction}`} />
            <RefCard title="Export overlap (SP-EXPT)" body={CUI_HANDLING.exptOverlap} />
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3 text-xs">
            <div className="font-semibold text-slate-300 mb-1">Marking rules</div>
            <ul className="space-y-1 text-slate-400">
              {CUI_HANDLING.markingRules.map((m, i) => <li key={i}>• {m}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function SprsCard() {
  const current = computeSprs('current');
  const target = computeSprs('target');
  const status = determineCmmcStatus(current);
  const statusCls =
    status.eligibility === 'final-eligible' ? 'text-emerald-300'
      : status.eligibility === 'conditional-eligible' ? 'text-amber-300'
      : 'text-red-300';
  return (
    <div className="rounded-lg border border-emerald-600/40 bg-emerald-900/10 p-4 space-y-3">
      <div className="text-sm font-semibold text-emerald-200">SPRS score (computed — weights verified)</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="rounded border border-slate-700 bg-slate-800/40 p-3">
          <div className="text-slate-500">Current</div>
          <div className="text-2xl font-bold text-white">{current.score}</div>
          <div className="text-slate-500">{current.met}/{current.maxScore} met</div>
        </div>
        <div className="rounded border border-slate-700 bg-slate-800/40 p-3">
          <div className="text-slate-500">Projected (target)</div>
          <div className="text-2xl font-bold text-emerald-300">{target.score >= 0 ? `+${target.score}` : target.score}</div>
          <div className="text-slate-500">{target.met}/{target.maxScore} met</div>
        </div>
        <div className="rounded border border-slate-700 bg-slate-800/40 p-3">
          <div className="text-slate-500">Conditional threshold</div>
          <div className="text-2xl font-bold text-white">{current.conditionalThreshold}</div>
          <div className="text-slate-500">{current.meetsConditionalThreshold ? 'met' : 'not met'}</div>
        </div>
        <div className="rounded border border-slate-700 bg-slate-800/40 p-3">
          <div className="text-slate-500">Status (current)</div>
          <div className={`text-sm font-semibold ${statusCls}`}>{status.eligibility.replace('-', ' ')}</div>
          <div className="text-slate-500">{status.openPoamItems} POA&amp;M-eligible gaps</div>
        </div>
      </div>
      <div className="text-xs text-slate-400">{status.reason}</div>
      {status.blockingGaps.length > 0 && (
        <div className="text-xs text-red-300">Must be met (not POA&amp;M-eligible): {status.blockingGaps.join(', ')}</div>
      )}
    </div>
  );
}

function RefCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
      <div className="font-semibold text-slate-300 mb-1">{title}</div>
      <div className="text-slate-400">{body}</div>
    </div>
  );
}
