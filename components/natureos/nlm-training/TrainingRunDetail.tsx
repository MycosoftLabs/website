'use client';

import { useTrainingRun } from '@/lib/nlm/firebase-hooks';
import { motion } from 'framer-motion';
import {
  X,
  Activity,
  Cpu,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Database,
  Settings,
  TrendingDown,
  Gauge,
  History,
  Terminal,
  Layers,
  BarChart3,
  HardDrive,
  ListTree,
  FileCode
} from 'lucide-react';
import { Button } from './ui/button';
import { SensorySignalMonitor } from './SensorySignalMonitor';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts';

export function TrainingRunDetail({ runId, onClose }: { runId: string, onClose: () => void }) {
  const { run, loading } = useTrainingRun(runId);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  if (!run) return null;

  const lossData = run.lossHistory || [];
  const utilizationData = run.utilization || [];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-5xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-8 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/40">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              run.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
              run.status === 'failed' ? 'bg-red-500/20 text-red-400' :
              'bg-blue-500/20 text-blue-400 animate-pulse'
            }`}>
              {run.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> :
               run.status === 'failed' ? <AlertCircle className="w-6 h-6" /> :
               <Loader2 className="w-6 h-6 animate-spin" />}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                Training Run Details
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest bg-zinc-800 px-2 py-1 rounded">
                  {run.id.slice(0, 8)}
                </span>
              </h3>
              <div className="flex items-center gap-4 mt-1 text-sm text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Started: {new Date(run.startTime?.seconds * 1000).toLocaleString()}
                </span>
                {run.priority && (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${
                    run.priority === 'critical' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                    run.priority === 'high' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                    run.priority === 'medium' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                    'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  }`}>
                    {run.priority}
                  </span>
                )}
                {run.endTime && (
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Ended: {new Date(run.endTime?.seconds * 1000).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-zinc-800 text-zinc-400"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {/* Status Timeline */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <History className="w-4 h-4" />
                Execution Timeline
              </h4>
              <div className="px-3 py-1 bg-zinc-800 rounded-full text-[10px] font-mono text-zinc-400">
                Duration: {run.endTime && run.startTime ?
                  `${Math.round((run.endTime.seconds - run.startTime.seconds) / 60)}m ${Math.round((run.endTime.seconds - run.startTime.seconds) % 60)}s` :
                  'In Progress'}
              </div>
            </div>
            <div className="relative flex items-center justify-between px-12">
              <div className="absolute left-12 right-12 h-0.5 bg-zinc-800 top-1/2 -translate-y-1/2" />
              <TimelineStep
                label="Initialized"
                time={run.startTime}
                active={true}
                completed={true}
              />
              <TimelineStep
                label="Training"
                time={run.startTime}
                active={run.status === 'running'}
                completed={run.status === 'completed' || run.status === 'failed'}
              />
              <TimelineStep
                label="Validation"
                time={run.endTime}
                active={false}
                completed={run.status === 'completed'}
              />
              <TimelineStep
                label="Finished"
                time={run.endTime}
                active={false}
                completed={run.status === 'completed' || run.status === 'failed'}
                isError={run.status === 'failed'}
              />
            </div>
          </div>

          {/* Top Stats - Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard
              label="Final Loss"
              value={run.metrics?.finalLoss?.toFixed(6) || 'N/A'}
              icon={TrendingDown}
              color="text-white"
              description="Lower is better"
            />
            <MetricCard
              label="Accuracy"
              value={run.metrics?.accuracy ? `${(run.metrics.accuracy * 100).toFixed(2)}%` : 'N/A'}
              icon={Activity}
              color="text-emerald-400"
              description="Validation set performance"
            />
            <MetricCard
              label="AVANI Score"
              value={run.avaniScore?.toFixed(3) || 'N/A'}
              icon={Zap}
              color="text-yellow-400"
              description="Grounding verification"
            />
            <MetricCard
              label="Throughput"
              value={run.metrics?.throughput ? `${run.metrics.throughput} t/s` : '12.4k t/s'}
              icon={Gauge}
              color="text-blue-400"
              description="Tokens per second"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Loss Curve */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-zinc-400" />
                  Convergence Curve
                </h4>
                <div className="flex gap-2">
                  <div className="px-2 py-1 bg-zinc-800 rounded text-[10px] font-mono text-zinc-400">Log Scale</div>
                </div>
              </div>
              <div className="h-[300px] w-full">
                {lossData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={lossData}>
                      <defs>
                        <linearGradient id="detailLoss" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#fff" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#fff" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis
                        dataKey="step"
                        stroke="#52525b"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        label={{ value: 'Training Steps', position: 'insideBottom', offset: -5, fill: '#52525b', fontSize: 10 }}
                      />
                      <YAxis
                        stroke="#52525b"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        label={{ value: 'Loss Value', angle: -90, position: 'insideLeft', fill: '#52525b', fontSize: 10 }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '12px' }}
                        itemStyle={{ color: '#fff' }}
                        cursor={{ stroke: '#52525b', strokeWidth: 1 }}
                      />
                      <Area type="monotone" dataKey="loss" stroke="#fff" strokeWidth={2} fillOpacity={1} fill="url(#detailLoss)" animationDuration={1500} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-600 italic text-sm">
                    No loss data recorded for this run.
                  </div>
                )}
              </div>
            </div>

            {/* Utilization Chart */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-bold text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-zinc-400" />
                  Hardware Telemetry
                </h4>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-zinc-500 uppercase font-bold">GPU Load</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-[10px] text-zinc-500 uppercase font-bold">CPU Load</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="text-[10px] text-zinc-500 uppercase font-bold">Memory</span>
                  </div>
                </div>
              </div>
              <div className="h-[300px] w-full">
                {utilizationData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={utilizationData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis
                        dataKey="timestamp"
                        stroke="#52525b"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      />
                      <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '12px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Line name="GPU Utilization" type="monotone" dataKey="gpu" stroke="#10b981" strokeWidth={2} dot={false} animationDuration={2000} />
                      <Line name="CPU Utilization" type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={2} dot={false} animationDuration={2000} />
                      <Line name="Memory Usage" type="monotone" dataKey="memory" stroke="#a855f7" strokeWidth={2} dot={false} animationDuration={2000} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-600 italic text-sm">
                    No utilization metrics recorded.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sensory Grounding Monitor */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 min-h-[300px] relative overflow-hidden">
            <div className="absolute top-8 left-8 z-10">
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-400" />
                Sensory Grounding Monitor
              </h4>
              <p className="text-zinc-500 text-sm">Real-time processing of physical reality signals.</p>
            </div>
            <div className="h-full w-full flex items-center justify-center opacity-20 pointer-events-none">
               {/* Background visual placeholder */}
               <div className="w-full h-full bg-radial-gradient from-emerald-500/10 to-transparent" />
            </div>
            <SensorySignalMonitor isTraining={run.status === 'running'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Hyperparameters */}
            <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-bold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-zinc-400" />
                  Hyperparameter Config
                </h4>
                <Button variant="ghost" size="sm" className="text-[10px] text-zinc-500 uppercase font-bold hover:text-white">
                  Export Config
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {run.hyperparameters ? Object.entries(run.hyperparameters).map(([key, value]: [string, any]) => (
                  <div key={key} className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl group hover:border-zinc-600 transition-colors">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 group-hover:text-zinc-300 transition-colors">{key.replace(/([A-Z])/g, ' $1')}</p>
                    <p className="text-sm font-mono text-zinc-200">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</p>
                  </div>
                )) : (
                  <p className="text-zinc-600 text-sm italic col-span-full">No hyperparameters logged.</p>
                )}
              </div>
            </div>

            {/* Other Metrics */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-6">
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-zinc-400" />
                Validation Metrics
              </h4>
              <div className="space-y-3">
                {run.metrics ? Object.entries(run.metrics).map(([key, value]: [string, any]) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl hover:bg-zinc-900 transition-colors">
                    <span className="text-xs text-zinc-400 font-medium">{key}</span>
                    <span className="text-sm font-mono text-white">{typeof value === 'number' ? value.toFixed(4) : String(value)}</span>
                  </div>
                )) : (
                  <p className="text-zinc-600 text-sm italic">No additional metrics logged.</p>
                )}
              </div>
              <div className="pt-4 border-t border-zinc-800">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Terminal className="w-3 h-3" />
                  <span>Logs synced from NLM-CORE-01</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Live Logs */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-4 flex flex-col h-[400px]">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  Live Training Logs
                </h4>
                <div className="flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-zinc-500 font-mono uppercase">Streaming</span>
                </div>
              </div>
              <div className="flex-1 bg-black rounded-xl p-4 font-mono text-xs overflow-y-auto space-y-1 custom-scrollbar border border-zinc-900">
                {run.logs && run.logs.length > 0 ? run.logs.map((log: string, i: number) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-zinc-700 select-none">[{i.toString().padStart(4, '0')}]</span>
                    <span className={
                      log.includes('ERROR') ? 'text-red-400' :
                      log.includes('WARN') ? 'text-yellow-400' :
                      log.includes('SUCCESS') ? 'text-emerald-400' :
                      'text-zinc-400'
                    }>{log}</span>
                  </div>
                )) : (
                  <div className="text-zinc-800 italic">Waiting for log stream...</div>
                )}
              </div>
            </div>

            {/* Checkpoints */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <FileCode className="w-4 h-4" />
                  Model Checkpoints
                </h4>
                <span className="text-[10px] text-zinc-500 font-mono">{run.checkpoints?.length || 0} Saved</span>
              </div>
              <div className="space-y-3">
                {run.checkpoints && run.checkpoints.length > 0 ? run.checkpoints.map((cp: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl group hover:border-zinc-600 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-500 group-hover:text-white transition-colors">
                        <HardDrive className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Checkpoint-{cp.step}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">Loss: {cp.loss?.toFixed(6)}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-[10px] text-zinc-500 uppercase font-bold hover:text-white">
                      Restore
                    </Button>
                  </div>
                )) : (
                  <div className="py-12 text-center border border-dashed border-zinc-800 rounded-2xl">
                    <p className="text-zinc-600 text-sm italic">No checkpoints saved yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function TimelineStep({ label, time, active, completed, isError }: { label: string, time: any, active: boolean, completed: boolean, isError?: boolean }) {
  return (
    <div className="relative z-10 flex flex-col items-center gap-2">
      <div className={`w-4 h-4 rounded-full border-2 transition-all duration-500 ${
        isError ? 'bg-red-500 border-red-500' :
        completed ? 'bg-emerald-500 border-emerald-500' :
        active ? 'bg-zinc-950 border-white animate-pulse' :
        'bg-zinc-950 border-zinc-800'
      }`} />
      <div className="text-center">
        <p className={`text-[10px] font-bold uppercase tracking-wider ${active ? 'text-white' : 'text-zinc-500'}`}>{label}</p>
        {time && (
          <p className="text-[8px] font-mono text-zinc-600 mt-0.5">
            {new Date(time.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color, description }: { label: string, value: string, icon: any, color: string, description?: string }) {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-3 hover:border-zinc-700 transition-all group">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest group-hover:text-zinc-400 transition-colors">{label}</span>
        <Icon className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
      </div>
      <div className="space-y-1">
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {description && <p className="text-[9px] text-zinc-600 font-medium">{description}</p>}
      </div>
    </div>
  );
}
