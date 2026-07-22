'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, Lock, KeyRound, ScrollText, Radio, Mail, HardDrive, CheckCircle2, Circle, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import {
  PREVEIL_FACTS, PREVEIL_ENCLAVE_CONTROLS, PREVEIL_ENCLAVE_LIST, PREVEIL_FAMILY_RESPONSIBILITY,
  PREVEIL_CRM_IMPORT, CUI_BOUNDARY, PREVEIL_SIEM, PREVEIL_PROVISIONING,
} from '@/lib/security/preveil/crm';

interface PreVeilPosture {
  status?: string;
  pending_onboarding?: boolean;
  enclave_live?: boolean;
  pe_l2_3_10_6?: { met?: boolean };
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-800/60 border border-slate-700 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-sm text-slate-200 mt-0.5">{value}</div>
    </div>
  );
}

export default function PreVeilPanel() {
  const [posture, setPosture] = useState<PreVeilPosture | null>(null);
  const [postureLoading, setPostureLoading] = useState(true);
  const [postureError, setPostureError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/security/posture');
        const data = await res.json();
        if (!res.ok) {
          if (!cancelled) setPostureError(data.error || `Posture API ${res.status}`);
          return;
        }
        if (!cancelled) setPosture((data.preveil ?? null) as PreVeilPosture | null);
      } catch {
        if (!cancelled) setPostureError('Could not reach MAS posture API');
      } finally {
        if (!cancelled) setPostureLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const envProvisioned = process.env.NEXT_PUBLIC_PREVEIL_PROVISIONED === 'true';
  const pendingOnboarding = posture?.pending_onboarding ?? !posture?.enclave_live;
  const provisioned = posture?.enclave_live === true || (posture?.status === 'configured' && !pendingOnboarding) || envProvisioned;
  const peMet = posture?.pe_l2_3_10_6?.met === true;

  const crmCount = Object.keys(PREVEIL_CRM_IMPORT).length;
  const respTally = { preveil: 0, joint: 0, customer: 0 };
  // family-level rollup for the coverage bar
  for (const fam of Object.keys(PREVEIL_FAMILY_RESPONSIBILITY)) {
    respTally[PREVEIL_FAMILY_RESPONSIBILITY[fam]]++;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6" data-tour="preveil-section">
      {/* Header + status */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">PreVeil — CMMC Level 2 CUI Enclave</h2>
              <p className="text-slate-400">{PREVEIL_FACTS.product} · {PREVEIL_FACTS.tier} · {PREVEIL_FACTS.seats} seats (Morgan + RJ)</p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium ${provisioned ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
            {postureLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : provisioned ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {postureLoading ? 'Loading posture…' : provisioned ? 'Enclave provisioned' : 'Pending onboarding — not provisioned'}
          </div>
        </div>
        {!postureLoading && (
          <div className="mt-3 text-xs rounded-lg border border-slate-600 bg-slate-900/50 p-2.5 text-slate-300 flex flex-wrap gap-x-4 gap-y-1">
            <span>MAS posture: <span className="text-slate-200">{posture?.status || 'pending_onboarding'}</span></span>
            <span>PE.L2-3.10.6 Met: <span className={peMet ? 'text-emerald-300' : 'text-amber-300'}>{peMet ? 'yes (evidence)' : 'no — enclave not live'}</span></span>
            {postureError && <span className="text-amber-300">{postureError}</span>}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-5">
          <Fact label="Encryption" value={PREVEIL_FACTS.encryption} />
          <Fact label="FIPS validation" value={PREVEIL_FACTS.fipsCmvp} />
          <Fact label="Authorization" value={PREVEIL_FACTS.fedramp} />
          <Fact label="Key model" value={PREVEIL_FACTS.keyModel} />
          <Fact label="Audit logs" value={PREVEIL_FACTS.auditLog} />
          <Fact label="Architecture" value={PREVEIL_FACTS.architecture} />
        </div>
      </div>

      {/* CRM control coverage */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center gap-2 mb-1"><Lock className="w-5 h-5 text-sky-400" /><h3 className="text-lg font-semibold">Customer Responsibility Matrix (CRM)</h3></div>
        <p className="text-sm text-slate-400 mb-4">
          PreVeil supports <span className="text-slate-200 font-medium">{PREVEIL_FACTS.controlsSupported} of 110</span> controls (Met + Joint);
          <span className="text-emerald-300 font-medium"> {PREVEIL_FACTS.closesOnProvisioning}</span> close the moment the enclave is provisioned + both users enrolled.
          {crmCount === 0
            ? <span className="text-amber-300"> Signed CRM (Appendix A) not yet ingested — designations below are PreVeil defaults pending the CRM document.</span>
            : <span className="text-emerald-300"> Authoritative CRM ingested ({crmCount} controls).</span>}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
          {Object.entries(PREVEIL_ENCLAVE_CONTROLS).map(([fam, ids]) => (
            <div key={fam} className="rounded-lg border border-emerald-700/40 bg-emerald-900/10 p-3">
              <div className="text-xs text-emerald-400 font-semibold">{fam}</div>
              <div className="text-2xl font-bold text-emerald-200">{ids.length}</div>
              <div className="text-[11px] text-slate-400">close on provisioning</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PREVEIL_ENCLAVE_LIST.map((id) => (
            <span key={id} className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-700/70 text-slate-300">{id}</span>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          These stay <span className="text-slate-300">Not Met</span> on the Controls tab until PreVeil is live and the enclave evidence
          (admin-console screenshots) is captured — then Cursor flips them with <code>evidence_uri</code>. No pre-flipping.
        </p>
      </div>

      {/* Google Workspace ↔ CUI boundary */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center gap-2 mb-4"><Mail className="w-5 h-5 text-sky-400" /><h3 className="text-lg font-semibold">CUI boundary — PreVeil vs Google Workspace</h3></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-sky-700/40 bg-sky-900/10 p-4">
            <div className="flex items-center gap-2 text-sky-300 font-medium mb-2"><Lock className="w-4 h-4" /> Inside the enclave (CUI)</div>
            <ul className="text-sm text-slate-300 space-y-1.5">{CUI_BOUNDARY.insideEnclave.map((x) => <li key={x} className="flex gap-2"><HardDrive className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />{x}</li>)}</ul>
          </div>
          <div className="rounded-lg border border-slate-600 bg-slate-800/40 p-4">
            <div className="flex items-center gap-2 text-slate-300 font-medium mb-2">Outside the boundary (no CUI)</div>
            <ul className="text-sm text-slate-400 space-y-1.5">{CUI_BOUNDARY.outsideBoundary.map((x) => <li key={x} className="flex gap-2"><Circle className="w-3.5 h-3.5 mt-1 shrink-0" />{x}</li>)}</ul>
          </div>
        </div>
        <div className="mt-4 text-sm rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-amber-100"><span className="font-semibold">Rule:</span> {CUI_BOUNDARY.rule}</div>
        <div className="mt-2 text-sm text-slate-400 flex gap-2"><ArrowRight className="w-4 h-4 mt-0.5 text-sky-400 shrink-0" />{CUI_BOUNDARY.companion}</div>
      </div>

      {/* SIEM connector → Wazuh */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center gap-2 mb-2"><Radio className="w-5 h-5 text-sky-400" /><h3 className="text-lg font-semibold">SIEM Connector → Wazuh (Audit family)</h3></div>
        <p className="text-sm text-slate-400">{PREVEIL_SIEM.exports} → <span className="text-slate-200">{PREVEIL_SIEM.target}</span>. {PREVEIL_SIEM.note}</p>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {PREVEIL_SIEM.satisfies.map((id) => <span key={id} className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-700/70 text-slate-300">{id}</span>)}
        </div>
      </div>

      {/* Provisioning checklist */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center gap-2 mb-4"><KeyRound className="w-5 h-5 text-sky-400" /><h3 className="text-lg font-semibold">Provisioning checklist (go-live)</h3></div>
        <div className="space-y-2">
          {PREVEIL_PROVISIONING.map((s) => (
            <div key={s.id} className="flex items-start gap-3 rounded-lg border border-slate-700 bg-slate-800/40 p-3">
              <Circle className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-slate-200 font-medium">{s.title} <span className="text-xs text-slate-500">· {s.owner}</span></div>
                <div className="text-xs text-slate-400">{s.detail}</div>
                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1"><ScrollText className="w-3 h-3" /> {s.evidence}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
