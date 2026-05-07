'use client';

import { useState } from 'react';
import { useJudgments } from '@/lib/nlm/firebase-hooks';
import { db } from '@/lib/nlm/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion } from 'framer-motion';
import {
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Info,
  Activity,
  Zap,
  Wind,
  GitBranch,
  Loader2,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import { Button } from './ui/button';

export function AvaniGuardian({ userId, isAdmin }: { userId?: string, isAdmin?: boolean }) {
  const { judgments, loading } = useJudgments(undefined, userId, isAdmin);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditMessage, setAuditMessage] = useState<string | null>(null);

  const latestJudgment = judgments[0];
  const hasLatestMetrics = typeof latestJudgment?.groundingScore === 'number';

  const triggerAudit = async () => {
    if (!userId) return;

    setIsAuditing(true);
    setAuditError(null);
    setAuditMessage(null);

    try {
      const masRes = await fetch('/api/mas/tasks/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'avani_grounding_check',
          source: 'nlm-dashboard',
          ownerId: userId,
          priority: 'normal',
          payload: {
            userId,
            requestedAt: new Date().toISOString(),
          },
        }),
        signal: AbortSignal.timeout(15000),
      });

      const result = await masRes.json().catch(() => null);

      if (!masRes.ok) {
        throw new Error(result?.error || result?.detail || `MAS returned HTTP ${masRes.status}`);
      }

      const judgment = result?.judgment || result?.data?.judgment || result?.result?.judgment || {};
      const targetId = result?.taskId || result?.id || result?.task_id || judgment.targetId || `MAS-${Date.now().toString(36).toUpperCase()}`;
      const hasJudgmentMetrics = typeof judgment.groundingScore === 'number'
        && typeof judgment.ecologicalImpact === 'number'
        && typeof judgment.riskLevel === 'string'
        && typeof judgment.verdict === 'string';

      if (hasJudgmentMetrics) {
        await addDoc(collection(db, 'judgments'), {
          targetId,
          groundingScore: judgment.groundingScore,
          ecologicalImpact: judgment.ecologicalImpact,
          riskLevel: judgment.riskLevel,
          verdict: judgment.verdict,
          source: 'MAS',
          ownerId: userId,
          timestamp: serverTimestamp(),
        });
        setAuditMessage('MAS returned a verified AVANI judgment.');
      } else {
        await addDoc(collection(db, 'judgments'), {
          targetId,
          groundingScore: null,
          ecologicalImpact: null,
          riskLevel: 'pending',
          verdict: 'queued',
          status: 'queued',
          source: 'MAS',
          ownerId: userId,
          timestamp: serverTimestamp(),
        });
        setAuditMessage('MAS accepted the AVANI audit. Waiting for judgment telemetry.');
      }
    } catch (error: any) {
      console.error('[AVANI] MAS audit failed:', error);
      setAuditError(error?.message || 'MAS audit failed');
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-bold tracking-tight text-white">AVANI Guardian</h2>
          <p className="text-zinc-500 text-lg">Ecological guardrails and grounding verification for the NLM.</p>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 px-6 py-3 bg-emerald-900/20 border border-emerald-800/50 rounded-2xl">
            <Shield className="w-5 h-5 text-emerald-500" />
            <div className="flex flex-col">
              <span className="text-xs text-emerald-500 uppercase font-bold tracking-widest">System Status</span>
              <span className="text-white font-semibold">MAS Required</span>
            </div>
          </div>

          <Button
            onClick={triggerAudit}
            disabled={isAuditing}
            className="bg-white text-black hover:bg-zinc-200 rounded-xl h-12 px-6 font-bold shadow-xl shadow-white/5"
          >
            {isAuditing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Auditing...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Trigger Audit
              </>
            )}
          </Button>
        </div>
      </div>

      {(auditError || auditMessage) && (
        <div className={`p-4 rounded-2xl border text-sm ${
          auditError
            ? 'bg-rose-950/20 border-rose-900/40 text-rose-300'
            : 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300'
        }`}>
          {auditError || auditMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="p-8 bg-zinc-900/40 border border-zinc-800 rounded-[32px] space-y-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Activity className="w-24 h-24 text-white" />
            </div>

            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Guardian Panel
            </h3>

            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Grounding Score</span>
                    <p className="text-2xl font-bold text-white">
                      {hasLatestMetrics ? `${(latestJudgment.groundingScore * 100).toFixed(1)}%` : '---'}
                    </p>
                  </div>
                  <span className="text-emerald-500 text-[10px] font-mono mb-1">
                    {latestJudgment?.verdict === 'queued' ? 'QUEUED' : hasLatestMetrics ? 'VERIFIED' : 'WAITING'}
                  </span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: hasLatestMetrics ? `${latestJudgment.groundingScore * 100}%` : '0%' }}
                    className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Ecological Impact</span>
                    <p className="text-2xl font-bold text-white">
                      {typeof latestJudgment?.ecologicalImpact === 'number' ? latestJudgment.ecologicalImpact : '---'}
                    </p>
                  </div>
                  <span className="text-sky-500 text-[10px] font-mono mb-1">
                    {typeof latestJudgment?.ecologicalImpact === 'number' ? 'REPORTED' : 'NO DATA'}
                  </span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: typeof latestJudgment?.ecologicalImpact === 'number' ? `${Math.min(latestJudgment.ecologicalImpact * 100, 100)}%` : '0%' }}
                    className="h-full bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Risk Level</span>
                    <p className={`text-2xl font-bold uppercase tracking-tight ${
                      latestJudgment?.riskLevel === 'critical' ? 'text-rose-500' :
                      latestJudgment?.riskLevel === 'high' ? 'text-orange-500' :
                      latestJudgment?.riskLevel === 'medium' ? 'text-yellow-500' :
                      latestJudgment?.riskLevel === 'pending' ? 'text-zinc-500' :
                      'text-emerald-500'
                    }`}>
                      {latestJudgment?.riskLevel || '---'}
                    </p>
                  </div>
                  <Shield className={`w-5 h-5 ${latestJudgment?.riskLevel === 'low' ? 'text-emerald-500' : 'text-zinc-700'}`} />
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 bg-zinc-900/40 border border-zinc-800 rounded-[32px] space-y-6">
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Policy Enforcement
            </h3>
            <div className="space-y-3">
              {[
                { name: 'Grounding Verification', icon: CheckCircle },
                { name: 'Harm Detection', icon: Shield },
                { name: 'Ecological Guardrails', icon: Wind },
                { name: 'Provenance Audit', icon: GitBranch },
              ].map((policy) => (
                <div key={policy.name} className="flex items-center justify-between p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-all group">
                  <div className="flex items-center gap-3">
                    <policy.icon className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                    <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">{policy.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-emerald-500 uppercase font-bold">Enforced</span>
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Recent AVANI Judgments</h3>
          <div className="space-y-3">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-zinc-900/40 border border-zinc-800 rounded-2xl animate-pulse" />
              ))
            ) : judgments.length === 0 ? (
              <div className="py-24 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-3xl text-center">
                <Shield className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-zinc-300">No judgments recorded</h3>
                <p className="text-zinc-500 mt-2 max-w-sm mx-auto">
                  AVANI records verified MAS judgments on grounding and ecological impact.
                </p>
              </div>
            ) : (
              judgments.map((judgment) => {
                const queued = judgment.verdict === 'queued';
                const passed = judgment.verdict === 'pass';

                return (
                  <motion.div
                    key={judgment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-2xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        queued ? 'bg-zinc-800 text-zinc-400' : passed ? 'bg-emerald-900/20 text-emerald-500' : 'bg-rose-900/20 text-rose-500'
                      }`}>
                        {queued ? <ShieldAlert className="w-5 h-5" /> : passed ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className="text-white font-medium">Judgment: {judgment.targetId}</h4>
                          <span className={`px-2 py-0.5 text-[10px] rounded uppercase tracking-wider font-bold ${
                            queued ? 'bg-zinc-800 text-zinc-400' : passed ? 'bg-emerald-900/40 text-emerald-500' : 'bg-rose-900/40 text-rose-500'
                          }`}>
                            {judgment.verdict}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            {judgment.timestamp?.seconds ? new Date(judgment.timestamp.seconds * 1000).toLocaleString() : 'Pending timestamp'}
                          </span>
                          <span>|</span>
                          <span>Grounding: {typeof judgment.groundingScore === 'number' ? `${(judgment.groundingScore * 100).toFixed(1)}%` : 'pending'}</span>
                          <span>|</span>
                          <span>Impact: {typeof judgment.ecologicalImpact === 'number' ? judgment.ecologicalImpact : 'pending'}</span>
                        </div>
                      </div>
                    </div>
                    <button className="p-2 text-zinc-700 hover:text-white transition-colors">
                      <Info className="w-5 h-5" />
                    </button>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
