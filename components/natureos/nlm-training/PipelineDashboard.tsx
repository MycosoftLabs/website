'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePipelines, useModels, useAllTrainingRuns } from '@/lib/nlm/firebase-hooks';
import { db } from '@/lib/nlm/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Plus, Settings, Database, Activity, Clock, CheckCircle2, XCircle, Loader2, ChevronRight, BarChart3, TrendingDown, Cpu, FlaskConical, Microscope, Atom, Link, Server, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { TrainingRunDetail } from './TrainingRunDetail';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

export function PipelineDashboard({ userId, isAdmin }: { userId: string, isAdmin?: boolean }) {
  const { pipelines, loading: pipelinesLoading } = usePipelines(userId, isAdmin);
  const { models } = useModels(userId, isAdmin);
  const { runs, loading: runsLoading } = useAllTrainingRuns(userId, isAdmin);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [mindexHealth, setMindexHealth] = useState<any>(null);

  // Fetch MINDEX health for the Mindex Sync stat
  const fetchMindexHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/mindex/health', { cache: 'no-store' });
      if (res.ok) setMindexHealth(await res.json());
    } catch { /* offline */ }
  }, []);

  useEffect(() => { fetchMindexHealth(); }, [fetchMindexHealth]);

  const [newPipeline, setNewPipeline] = useState({
    name: '',
    modelId: '',
    dataSource: 'wavelengths',
    preprocessing: ['normalization'],
    hyperparameters: {
      learningRate: 0.001,
      batchSize: 32,
      epochs: 10
    },
    preconditioners: {
      physics: { enabled: false, strength: 0.5 },
      chemistry: { enabled: false, sensitivity: 0.8 },
      biology: { enabled: false, growthRate: 1.2 }
    },
    calibrationChain: 'standard-v1'
  });

  const handleCreate = async () => {
    if (!newPipeline.name || !newPipeline.modelId) return;

    try {
      await addDoc(collection(db, 'pipelines'), {
        ...newPipeline,
        status: 'idle',
        ownerId: userId,
        lastRun: null,
        createdAt: serverTimestamp()
      });
      setShowCreate(false);
      // Reset form
      setNewPipeline({
        name: '',
        modelId: '',
        dataSource: 'wavelengths',
        preprocessing: ['normalization'],
        hyperparameters: {
          learningRate: 0.001,
          batchSize: 32,
          epochs: 10
        },
        preconditioners: {
          physics: { enabled: false, strength: 0.5 },
          chemistry: { enabled: false, sensitivity: 0.8 },
          biology: { enabled: false, growthRate: 1.2 }
        },
        calibrationChain: 'standard-v1'
      });
    } catch (error) {
      console.error("Error creating pipeline:", error);
    }
  };

  const triggerPipeline = async (pipelineId: string) => {
    try {
      const pipeline = pipelines.find(p => p.id === pipelineId);
      if (!pipeline) return;

      const pipelineRef = doc(db, 'pipelines', pipelineId);
      await updateDoc(pipelineRef, {
        status: 'queued',
        lastRun: serverTimestamp()
      });

      const runRef = await addDoc(collection(db, 'training_runs'), {
        modelId: pipeline.modelId,
        pipelineId: pipeline.id,
        ownerId: userId,
        startTime: serverTimestamp(),
        status: 'queued',
        hyperparameters: pipeline.hyperparameters,
        lossHistory: [],
        utilization: [],
        checkpoints: [],
        metrics: null,
        logs: [
          'INFO: Training request prepared for MAS.',
          `INFO: Dataset source '${pipeline.dataSource}' queued.`,
          `INFO: Calibration chain '${pipeline.calibrationChain}' selected.`,
        ],
        source: 'MAS',
      });

      const response = await fetch('/api/natureos/nlm-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          runId: runRef.id,
          pipelineId: pipeline.id,
          modelId: pipeline.modelId,
          ownerId: userId,
          dataSource: pipeline.dataSource,
          preprocessing: pipeline.preprocessing,
          hyperparameters: pipeline.hyperparameters,
          preconditioners: pipeline.preconditioners,
          calibrationChain: pipeline.calibrationChain,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        const errorMessage = result?.error || `MAS returned HTTP ${response.status}`;
        await updateDoc(pipelineRef, { status: 'failed' });
        await updateDoc(runRef, {
          status: 'failed',
          endTime: serverTimestamp(),
          logs: [
            'INFO: Training request prepared for MAS.',
            `ERROR: ${errorMessage}`,
          ],
        });
        return;
      }

      const masData = result.data || {};
      const runUpdate: Record<string, any> = {
        status: masData.status || 'queued',
        acceptedAt: serverTimestamp(),
        logs: [
          'INFO: Training request prepared for MAS.',
          'SUCCESS: MAS accepted training request.',
          masData.taskId ? `INFO: MAS task ${masData.taskId}` : 'INFO: Waiting for live run telemetry.',
        ],
        masResponse: masData,
      };

      if (masData.taskId || masData.runId) {
        runUpdate.masTaskId = masData.taskId || masData.runId;
      }
      if (masData.metrics) runUpdate.metrics = masData.metrics;
      if (Array.isArray(masData.lossHistory)) runUpdate.lossHistory = masData.lossHistory;
      if (Array.isArray(masData.utilization)) runUpdate.utilization = masData.utilization;
      if (Array.isArray(masData.checkpoints)) runUpdate.checkpoints = masData.checkpoints;

      await updateDoc(runRef, runUpdate);
      await updateDoc(pipelineRef, { status: masData.status === 'running' ? 'running' : 'queued' });
    } catch (error) {
      console.error("Error triggering pipeline:", error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <h2 className="text-4xl font-bold tracking-tight text-white">Training Lab</h2>
          <p className="text-zinc-500 text-lg">Automate and monitor your NLM training workflows.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-white text-black hover:bg-zinc-200 rounded-xl">
          <Plus className="w-4 h-4 mr-2" />
          New Pipeline
        </Button>
      </div>

      {/* System Health Summary — real computed from Firebase */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-3xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Active Pipelines</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-white">{pipelines.filter(p => p.status === 'running').length}</p>
        </div>
        <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-3xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Success Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-white">
            {(() => {
              const completed = runs.filter(r => r.status === 'completed').length;
              const total = runs.filter(r => r.status === 'completed' || r.status === 'failed').length;
              return total > 0 ? `${((completed / total) * 100).toFixed(1)}%` : '---';
            })()}
          </p>
        </div>
        <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-3xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Avg. Final Loss</span>
            <TrendingDown className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-3xl font-bold text-white">
            {(() => {
              const completedWithMetrics = runs.filter(r => r.status === 'completed' && r.metrics?.finalLoss);
              if (completedWithMetrics.length === 0) return '---';
              const avg = completedWithMetrics.reduce((sum, r) => sum + (r.metrics?.finalLoss ?? 0), 0) / completedWithMetrics.length;
              return avg.toFixed(4);
            })()}
          </p>
        </div>
        <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-3xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Total Runs</span>
            <Cpu className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-white">{runs.length}</p>
        </div>
        <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-3xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Mindex Sync</span>
            <Server className={`w-4 h-4 ${mindexHealth?.status === 'healthy' ? 'text-emerald-500' : 'text-zinc-600'}`} />
          </div>
          <p className={`text-3xl font-bold ${mindexHealth?.status === 'healthy' ? 'text-emerald-400' : mindexHealth?.status === 'degraded' ? 'text-amber-400' : 'text-zinc-600'}`}>
            {mindexHealth ? (mindexHealth.status === 'healthy' ? 'OK' : mindexHealth.status?.toUpperCase() ?? '---') : '---'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {pipelines.map((pipeline) => (
          <motion.div
            key={pipeline.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 flex items-center justify-between group hover:border-zinc-700 transition-all"
          >
            <div className="flex items-center gap-6">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                pipeline.status === 'running' ? 'bg-blue-500/20 text-blue-400 animate-pulse' :
                pipeline.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                pipeline.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                'bg-zinc-800 text-zinc-400'
              }`}>
                {pipeline.status === 'running' ? <Loader2 className="w-6 h-6 animate-spin" /> :
                 pipeline.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> :
                 pipeline.status === 'failed' ? <XCircle className="w-6 h-6" /> :
                 <Settings className="w-6 h-6" />}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white">{pipeline.name}</h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Database className="w-3 h-3" /> {pipeline.dataSource}
                  </span>
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3" /> {models.find(m => m.id === pipeline.modelId)?.name || 'Unknown Model'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Settings className="w-3 h-3" /> {pipeline.preprocessing?.length || 0} steps
                  </span>
                  {pipeline.lastRun && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(pipeline.lastRun?.seconds * 1000).toLocaleTimeString()}
                    </span>
                  )}
                </div>

                {/* Latest Run Metrics Summary — from real run data */}
                {pipeline.status === 'completed' && (() => {
                  const latestRun = runs.find(r => r.pipelineId === pipeline.id && r.status === 'completed');
                  if (!latestRun) return null;
                  return (
                    <div className="flex items-center gap-6 mt-3">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest">Accuracy</span>
                        <span className="text-xs font-mono text-emerald-500">
                          {latestRun.metrics?.accuracy ? `${(latestRun.metrics.accuracy * 100).toFixed(1)}%` : '---'}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest">Loss</span>
                        <span className="text-xs font-mono text-white">
                          {latestRun.metrics?.finalLoss?.toFixed(4) ?? '---'}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest">AVANI</span>
                        <span className="text-xs font-mono text-yellow-500">
                          {latestRun.avaniScore?.toFixed(2) ?? '---'}
                        </span>
                      </div>
                      {latestRun.lossHistory?.length > 0 && (
                        <div className="h-8 w-24 bg-zinc-950/50 rounded border border-zinc-900 overflow-hidden">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={latestRun.lossHistory}>
                              <Area type="monotone" dataKey="loss" stroke="#fff" fill="#fff" fillOpacity={0.1} strokeWidth={1} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Hyperparameters Preview */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {Object.entries(pipeline.hyperparameters || {}).slice(0, 4).map(([key, value]) => (
                    <div key={key} className="px-2 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-[9px] font-mono text-zinc-500">
                      <span className="text-zinc-600">{key}:</span> {String(value)}
                    </div>
                  ))}
                  {Object.keys(pipeline.hyperparameters || {}).length > 4 && (
                    <span className="text-[9px] text-zinc-700 font-mono">+{Object.keys(pipeline.hyperparameters).length - 4} more</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider ${
                pipeline.status === 'running' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                pipeline.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}>
                {pipeline.status}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pipeline.status === 'running' || pipeline.status === 'queued'}
                  onClick={() => triggerPipeline(pipeline.id)}
                  className="border-zinc-800 hover:bg-white hover:text-black transition-all h-8"
                >
                  <Play className="w-3 h-3 mr-2" />
                  Run
                </Button>
                {pipeline.lastRun && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] text-zinc-500 hover:text-white"
                    onClick={() => {
                      // Find the latest run for this pipeline
                      const latestRun = runs.find(r => r.pipelineId === pipeline.id);
                      if (latestRun) setSelectedRunId(latestRun.id);
                    }}
                  >
                    View Last Run
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {pipelines.length === 0 && !pipelinesLoading && (
          <div className="py-24 text-center border border-dashed border-zinc-800 rounded-3xl">
            <p className="text-zinc-500">No pipelines configured yet.</p>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-zinc-400" />
          <h3 className="text-2xl font-bold text-white">Recent Training Runs</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {runs.map((run) => (
            <motion.div
              key={run.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => setSelectedRunId(run.id)}
              className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between group cursor-pointer hover:border-zinc-700 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  run.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                  run.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                  'bg-blue-500/20 text-blue-400 animate-pulse'
                }`}>
                  {run.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> :
                   run.status === 'failed' ? <XCircle className="w-5 h-5" /> :
                   <Loader2 className="w-5 h-5 animate-spin" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium">Run {run.id.slice(0, 8)}</p>
                    <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest bg-zinc-800/50 px-1.5 py-0.5 rounded">
                      {models.find(m => m.id === run.modelId)?.name || 'Unknown Model'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs text-zinc-500">
                      {run.startTime?.seconds ? new Date(run.startTime.seconds * 1000).toLocaleString() : 'Just now'}
                    </p>
                    {run.status === 'completed' && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-zinc-800" />
                        <span className="text-[10px] font-mono text-emerald-500">Acc: {(run.metrics?.accuracy * 100).toFixed(1)}%</span>
                        <span className="text-[10px] font-mono text-white">Loss: {run.metrics?.finalLoss?.toFixed(4)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-700 group-hover:text-zinc-400 transition-all" />
            </motion.div>
          ))}

          {runs.length === 0 && !runsLoading && (
            <div className="col-span-full py-12 text-center border border-dashed border-zinc-800 rounded-2xl">
              <p className="text-zinc-600">No training history yet.</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedRunId && (
          <TrainingRunDetail
            runId={selectedRunId}
            onClose={() => setSelectedRunId(null)}
          />
        )}
        {showCreate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreate(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <h3 className="text-2xl font-bold text-white mb-6">Create Training Pipeline</h3>

              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Pipeline Name</label>
                    <input
                      type="text"
                      value={newPipeline.name}
                      onChange={(e) => setNewPipeline({...newPipeline, name: e.target.value})}
                      placeholder="e.g., Daily Grounding Sync"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white/10"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Target Model</label>
                    <select
                      value={newPipeline.modelId}
                      onChange={(e) => setNewPipeline({...newPipeline, modelId: e.target.value})}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white/10"
                    >
                      <option value="">Select a model...</option>
                      {models.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Data Source</label>
                    <select
                      value={newPipeline.dataSource}
                      onChange={(e) => setNewPipeline({...newPipeline, dataSource: e.target.value})}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white/10"
                    >
                      <option value="wavelengths">Wavelengths</option>
                      <option value="waveforms">Waveforms</option>
                      <option value="gas_concentrations">Gas Concentrations</option>
                      <option value="thermal_gradients">Thermal Gradients</option>
                      <option value="mindex_global">Mindex Global Stream</option>
                      <option value="mindex_mycobrain">Mindex MycoBrain</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Learning Rate</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={newPipeline.hyperparameters.learningRate}
                      onChange={(e) => setNewPipeline({
                        ...newPipeline,
                        hyperparameters: {...newPipeline.hyperparameters, learningRate: parseFloat(e.target.value)}
                      })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white/10"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-400">Preprocessing Steps</label>
                  <div className="flex flex-wrap gap-2">
                    {['normalization', 'tokenization', 'feature scaling', 'outlier removal', 'dimensionality reduction'].map((step) => (
                      <button
                        key={step}
                        type="button"
                        onClick={() => {
                          const current = newPipeline.preprocessing;
                          const next = current.includes(step)
                            ? current.filter(s => s !== step)
                            : [...current, step];
                          setNewPipeline({ ...newPipeline, preprocessing: next });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                          newPipeline.preprocessing.includes(step)
                            ? 'bg-white text-black border-white'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'
                        }`}
                      >
                        {step.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preconditioners Section */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Preconditioners
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Physics */}
                    <div className={`p-4 rounded-2xl border transition-all ${newPipeline.preconditioners.physics.enabled ? 'bg-zinc-800 border-blue-500/50' : 'bg-zinc-950/50 border-zinc-800'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Atom className={`w-4 h-4 ${newPipeline.preconditioners.physics.enabled ? 'text-blue-400' : 'text-zinc-600'}`} />
                          <span className="text-sm font-medium text-zinc-300">Physics</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={newPipeline.preconditioners.physics.enabled}
                          onChange={(e) => setNewPipeline({
                            ...newPipeline,
                            preconditioners: {
                              ...newPipeline.preconditioners,
                              physics: { ...newPipeline.preconditioners.physics, enabled: e.target.checked }
                            }
                          })}
                          className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-0"
                        />
                      </div>
                      {newPipeline.preconditioners.physics.enabled && (
                        <div className="space-y-2">
                          <label className="text-[10px] text-zinc-500 uppercase font-bold">Strength</label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={newPipeline.preconditioners.physics.strength}
                            onChange={(e) => setNewPipeline({
                              ...newPipeline,
                              preconditioners: {
                                ...newPipeline.preconditioners,
                                physics: { ...newPipeline.preconditioners.physics, strength: parseFloat(e.target.value) }
                              }
                            })}
                            className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          />
                        </div>
                      )}
                    </div>

                    {/* Chemistry */}
                    <div className={`p-4 rounded-2xl border transition-all ${newPipeline.preconditioners.chemistry.enabled ? 'bg-zinc-800 border-purple-500/50' : 'bg-zinc-950/50 border-zinc-800'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <FlaskConical className={`w-4 h-4 ${newPipeline.preconditioners.chemistry.enabled ? 'text-purple-400' : 'text-zinc-600'}`} />
                          <span className="text-sm font-medium text-zinc-300">Chemistry</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={newPipeline.preconditioners.chemistry.enabled}
                          onChange={(e) => setNewPipeline({
                            ...newPipeline,
                            preconditioners: {
                              ...newPipeline.preconditioners,
                              chemistry: { ...newPipeline.preconditioners.chemistry, enabled: e.target.checked }
                            }
                          })}
                          className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-purple-500 focus:ring-0"
                        />
                      </div>
                      {newPipeline.preconditioners.chemistry.enabled && (
                        <div className="space-y-2">
                          <label className="text-[10px] text-zinc-500 uppercase font-bold">Sensitivity</label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={newPipeline.preconditioners.chemistry.sensitivity}
                            onChange={(e) => setNewPipeline({
                              ...newPipeline,
                              preconditioners: {
                                ...newPipeline.preconditioners,
                                chemistry: { ...newPipeline.preconditioners.chemistry, sensitivity: parseFloat(e.target.value) }
                              }
                            })}
                            className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                          />
                        </div>
                      )}
                    </div>

                    {/* Biology */}
                    <div className={`p-4 rounded-2xl border transition-all ${newPipeline.preconditioners.biology.enabled ? 'bg-zinc-800 border-emerald-500/50' : 'bg-zinc-950/50 border-zinc-800'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Microscope className={`w-4 h-4 ${newPipeline.preconditioners.biology.enabled ? 'text-emerald-400' : 'text-zinc-600'}`} />
                          <span className="text-sm font-medium text-zinc-300">Biology</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={newPipeline.preconditioners.biology.enabled}
                          onChange={(e) => setNewPipeline({
                            ...newPipeline,
                            preconditioners: {
                              ...newPipeline.preconditioners,
                              biology: { ...newPipeline.preconditioners.biology, enabled: e.target.checked }
                            }
                          })}
                          className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-0"
                        />
                      </div>
                      {newPipeline.preconditioners.biology.enabled && (
                        <div className="space-y-2">
                          <label className="text-[10px] text-zinc-500 uppercase font-bold">Growth Rate</label>
                          <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={newPipeline.preconditioners.biology.growthRate}
                            onChange={(e) => setNewPipeline({
                              ...newPipeline,
                              preconditioners: {
                                ...newPipeline.preconditioners,
                                biology: { ...newPipeline.preconditioners.biology, growthRate: parseFloat(e.target.value) }
                              }
                            })}
                            className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Calibration Chain Section */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Link className="w-4 h-4" />
                    Calibration Chain
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">Variant</label>
                      <select
                        value={newPipeline.calibrationChain}
                        onChange={(e) => setNewPipeline({...newPipeline, calibrationChain: e.target.value})}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white/10"
                      >
                        <option value="standard-v1">Standard V1 (Linear)</option>
                        <option value="adaptive-v2">Adaptive V2 (Non-Linear)</option>
                        <option value="quantum-v3">Quantum V3 (Probabilistic)</option>
                        <option value="deep-sync-v4">DeepSync V4 (Temporal)</option>
                      </select>
                    </div>
                    <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase">Status</p>
                        <p className="text-xs text-zinc-300">Verified Chain</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowCreate(false)} className="flex-1 border-zinc-800">
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} className="flex-1 bg-white text-black hover:bg-zinc-200">
                    Create Pipeline
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
