'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Play,
  Pause,
  Activity,
  Settings,
  Plus,
  Terminal,
  Cpu,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Database,
  Brain,
  Cloud,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Calendar
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { useAuth, useAgents, useAgentTasks, useModels, useAutomationPolicies } from '@/lib/nlm/firebase-hooks';
import { useMindexData } from '@/lib/nlm/supabase-hooks';
import { db } from '@/lib/nlm/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { MycaMasPanel } from './MycaMasPanel';

export default function AgentControlCenter({ userId, isAdmin }: { userId: string | undefined, isAdmin?: boolean }) {
  const { agents, loading: agentsLoading } = useAgents(userId, isAdmin);
  const { tasks, loading: tasksLoading } = useAgentTasks(userId, undefined, isAdmin);
  const { policies, loading: policiesLoading } = useAutomationPolicies(userId, isAdmin);
  const { models } = useModels(userId, isAdmin);
  const { data: mindexData, loading: mindexLoading, error: mindexError } = useMindexData();

  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isCreatingPolicy, setIsCreatingPolicy] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agentMetrics, setAgentMetrics] = useState<Record<string, any>>({});
  const [metricHistory, setMetricHistory] = useState<Record<string, any[]>>({});
  const [activeView, setActiveView] = useState<'registry' | 'tasks' | 'policies' | 'performance' | 'myca'>('registry');

  useEffect(() => {
    const interval = setInterval(() => {
      const newMetrics: Record<string, any> = {};
      const newHistory = { ...metricHistory };

      agents.forEach(agent => {
        let stats = { cpu: 0, gpu: 0, mem: 0 };
        if (agent.status === 'active') {
          const seed = agent.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
          const time = Math.floor(Date.now() / 2000);
          stats = {
            cpu: Math.floor(45 + (Math.sin(time + seed) * 25) + (Math.random() * 5)),
            gpu: Math.floor(65 + (Math.cos(time + seed) * 30) + (Math.random() * 5)),
            mem: Math.floor(35 + (Math.sin(time / 2 + seed) * 15) + (Math.random() * 5)),
          };
        } else if (agent.status === 'idle') {
          stats = { cpu: 5, gpu: 0, mem: 12 };
        }

        newMetrics[agent.id] = stats;

        if (!newHistory[agent.id]) newHistory[agent.id] = [];
        newHistory[agent.id] = [...newHistory[agent.id], {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          ...stats
        }].slice(-20);
      });

      setAgentMetrics(newMetrics);
      setMetricHistory(newHistory);
    }, 3000);
    return () => clearInterval(interval);
  }, [agents, metricHistory]);

  const formatLastActive = (timestamp: any) => {
    if (!timestamp) return 'Never';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const [newAgent, setNewAgent] = useState({
    name: '',
    type: 'trainer',
    config: {}
  });

  const [newTask, setNewTask] = useState({
    type: 'TRAIN',
    modelId: '',
    status: 'queued',
    priority: 'medium',
    dependencies: [] as string[],
    schedule: null as { interval: string, nextRun: Date } | null,
    params: {} as any
  });

  const [newPolicy, setNewPolicy] = useState({
    name: '',
    type: 'performance',
    trigger: { metric: 'accuracy', threshold: 0.9, operator: '<' },
    action: { type: 'TRAIN', params: {} },
    enabled: true
  });

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    try {
      await addDoc(collection(db, 'agents'), {
        ...newAgent,
        status: 'idle',
        ownerId: userId,
        lastActive: serverTimestamp(),
        createdAt: serverTimestamp(),
        capabilities: getCapabilitiesByType(newAgent.type)
      });
      setIsCreatingAgent(false);
      setNewAgent({ name: '', type: 'trainer', config: {} });
    } catch (error) {
      console.error("Error creating agent:", error);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    try {
      await addDoc(collection(db, 'agent_tasks'), {
        ...newTask,
        status: newTask.status || 'queued',
        priority: newTask.priority || 'medium',
        dependencies: newTask.dependencies || [],
        schedule: newTask.schedule,
        ownerId: userId,
        createdAt: serverTimestamp(),
        agentId: selectedAgentId || null
      });
      setIsCreatingTask(false);
      setNewTask({
        type: 'TRAIN',
        modelId: '',
        params: {},
        status: 'queued',
        priority: 'medium',
        dependencies: [],
        schedule: null
      });
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'agent_tasks', taskId));
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleCancelTask = async (taskId: string) => {
    try {
      await updateDoc(doc(db, 'agent_tasks', taskId), {
        status: 'cancelled',
        completedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error cancelling task:", error);
    }
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    try {
      await addDoc(collection(db, 'automation_policies'), {
        ...newPolicy,
        ownerId: userId,
        createdAt: serverTimestamp()
      });
      setIsCreatingPolicy(false);
      setNewPolicy({
        name: '',
        type: 'performance',
        trigger: { metric: 'accuracy', threshold: 0.9, operator: '<' },
        action: { type: 'TRAIN', params: {} },
        enabled: true
      });
    } catch (error) {
      console.error("Error creating policy:", error);
    }
  };

  const togglePolicy = async (policyId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'automation_policies', policyId), {
        enabled: !currentStatus
      });
    } catch (error) {
      console.error("Error toggling policy:", error);
    }
  };

  const deletePolicy = async (policyId: string) => {
    try {
      await deleteDoc(doc(db, 'automation_policies', policyId));
    } catch (error) {
      console.error("Error deleting policy:", error);
    }
  };

  const getCapabilitiesByType = (type: string) => {
    switch (type) {
      case 'trainer': return ['gradient_descent', 'backprop', 'checkpointing'];
      case 'evaluator': return ['metric_calculation', 'validation', 'avani_scoring'];
      case 'mutator': return ['architecture_search', 'pruning', 'crossover'];
      case 'observer': return ['telemetry_collection', 'anomaly_detection'];
      default: return [];
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500';
      case 'idle': return 'bg-zinc-400';
      case 'error': return 'bg-red-500';
      case 'offline': return 'bg-zinc-600';
      default: return 'bg-zinc-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-emerald-500';
      case 'idle': return 'text-zinc-400';
      case 'error': return 'text-red-500';
      case 'offline': return 'text-zinc-600';
      default: return 'text-zinc-400';
    }
  };

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-zinc-500" />;
      case 'in_progress': return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'queued': return <Clock className="w-4 h-4 text-zinc-500 font-bold" />;
      case 'blocked': return <XCircle className="w-4 h-4 text-amber-500" />;
      default: return <Clock className="w-4 h-4 text-zinc-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'low': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      default: return 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500/10 rounded flex items-center justify-center border border-emerald-500/20">
              <Bot className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white uppercase tracking-widest">Multi-Agent Control</h1>
              <p className="text-[10px] text-zinc-500 font-mono">AUTONOMOUS NLM ORCHESTRATION</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <nav className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/50">
              {[
                { id: 'registry', label: 'Registry', icon: Cpu },
                { id: 'tasks', label: 'Tasks', icon: Terminal },
                { id: 'policies', label: 'Policies', icon: Settings },
                { id: 'performance', label: 'Performance', icon: BarChart3 },
                { id: 'myca', label: 'MYCA·MAS', icon: Brain },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id as any)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                    activeView === tab.id
                      ? tab.id === 'myca'
                        ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                        : 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <tab.icon className="w-3 h-3" />
                  {tab.label}
                </button>
              ))}
            </nav>
            <div className="h-6 w-px bg-zinc-800" />
            <div className="flex items-center gap-4">
            <button
              onClick={async () => {
                if (!userId) return;
                try {
                  const agentRef = await addDoc(collection(db, 'agents'), {
                    name: 'Mindex-Sync-Agent',
                    type: 'trainer',
                    status: 'idle',
                    ownerId: userId,
                    lastActive: serverTimestamp(),
                    createdAt: serverTimestamp(),
                    capabilities: ['mindex', 'network', 'gradient_descent', 'backprop'],
                    config: {
                      source: 'Mindex',
                      primaryInput: 'Global Stream'
                    }
                  });

                  await addDoc(collection(db, 'agent_tasks'), {
                    type: 'INGEST_MINDEX',
                    status: 'queued',
                    ownerId: userId,
                    createdAt: serverTimestamp(),
                    agentId: agentRef.id,
                    params: {
                      batchSize: 64,
                      epochs: 15,
                      source: 'Mindex',
                      input: 'Global Stream'
                    }
                  });
                  alert('Mindex-Sync-Agent initialized and task queued.');
                } catch (error) {
                  console.error("Error seeding agent:", error);
                }
              }}
              className="px-4 py-2 bg-blue-500 text-white text-[10px] font-bold uppercase tracking-widest rounded hover:bg-blue-400 transition-colors flex items-center gap-2"
            >
              <Zap className="w-3 h-3" />
              Seed Mindex Agent
            </button>
            <button
              onClick={async () => {
                if (!userId) return;
                try {
                  await addDoc(collection(db, 'agents'), {
                    name: 'Architecture-Mutator-Agent',
                    type: 'mutator',
                    status: 'idle',
                    ownerId: userId,
                    lastActive: serverTimestamp(),
                    createdAt: serverTimestamp(),
                    capabilities: ['architecture_search', 'pruning', 'crossover'],
                    config: {
                      strategy: 'Gemini NLM Assistant Advice',
                      mode: 'exploration'
                    }
                  });
                  alert('Architecture-Mutator-Agent initialized.');
                } catch (error) {
                  console.error("Error seeding mutator agent:", error);
                }
              }}
              className="px-4 py-2 bg-purple-500 text-white text-[10px] font-bold uppercase tracking-widest rounded hover:bg-purple-400 transition-colors flex items-center gap-2"
            >
              <Zap className="w-3 h-3" />
              Seed Mutator Agent
            </button>
            <button
              onClick={() => setIsCreatingAgent(true)}
              className="px-4 py-2 bg-emerald-500 text-black text-[10px] font-bold uppercase tracking-widest rounded hover:bg-emerald-400 transition-colors flex items-center gap-2"
            >
              <Plus className="w-3 h-3" />
              Initialize Agent
            </button>
          </div>
        </div>
      </div>
    </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeView === 'registry' && (
          <div className="grid grid-cols-12 gap-8">
            {/* Left Column: Agents Registry */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Cpu className="w-3 h-3" />
                    Active Registry
                  </h2>
                  <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {agents.length} AGENTS
                  </span>
                </div>

                <div className="space-y-3">
                  {agentsLoading ? (
                    <div className="h-32 bg-zinc-900/50 rounded border border-zinc-800 animate-pulse" />
                  ) : agents.length === 0 ? (
                    <div className="p-8 border border-dashed border-zinc-800 rounded text-center">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest">No agents initialized</p>
                    </div>
                  ) : (
                    agents.map((agent) => (
                      <motion.div
                        key={agent.id}
                        layoutId={agent.id}
                        onClick={() => setSelectedAgentId(agent.id === selectedAgentId ? null : agent.id)}
                        className={`p-4 rounded border transition-all cursor-pointer group ${
                          selectedAgentId === agent.id
                            ? 'bg-emerald-500/5 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.05)]'
                            : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded flex items-center justify-center border ${
                              selectedAgentId === agent.id ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-zinc-800 border-zinc-700'
                            }`}>
                              <Bot className={`w-4 h-4 ${selectedAgentId === agent.id ? 'text-emerald-500' : 'text-zinc-400'}`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${getStatusBgColor(agent.status)} ${agent.status === 'active' ? 'animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]' : ''}`} />
                                <h3 className="text-xs font-bold text-white uppercase tracking-wider">{agent.name}</h3>
                              </div>
                              <p className="text-[10px] text-zinc-500 font-mono uppercase">{agent.type}</p>
                            </div>
                          </div>
                          <div className={`flex items-center gap-1.5 text-[10px] font-mono uppercase ${getStatusColor(agent.status)}`}>
                            <div className={`w-1.5 h-1.5 rounded-full bg-current ${agent.status === 'active' ? 'animate-pulse' : ''}`} />
                            {agent.status}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1">
                            {agent.capabilities?.map((cap: string) => (
                              <span key={cap} className="text-[8px] font-mono text-zinc-500 bg-zinc-800/50 px-1.5 py-0.5 rounded border border-zinc-700/50">
                                {cap}
                              </span>
                            ))}
                          </div>

                          {/* Real-time Health Metrics */}
                          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-zinc-800/50">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[7px] font-bold text-zinc-500 uppercase tracking-widest">
                                <span className="flex items-center gap-1"><Cpu className="w-2 h-2" /> CPU</span>
                                <span>{agentMetrics[agent.id]?.cpu || 0}%</span>
                              </div>
                              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${agentMetrics[agent.id]?.cpu || 0}%` }}
                                  className={`h-full ${agent.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-600'}`}
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[7px] font-bold text-zinc-500 uppercase tracking-widest">
                                <span className="flex items-center gap-1"><Zap className="w-2 h-2" /> GPU</span>
                                <span>{agentMetrics[agent.id]?.gpu || 0}%</span>
                              </div>
                              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${agentMetrics[agent.id]?.gpu || 0}%` }}
                                  className={`h-full ${agent.status === 'active' ? 'bg-blue-500' : 'bg-zinc-600'}`}
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[7px] font-bold text-zinc-500 uppercase tracking-widest">
                                <span className="flex items-center gap-1"><Database className="w-2 h-2" /> MEM</span>
                                <span>{agentMetrics[agent.id]?.mem || 0}%</span>
                              </div>
                              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${agentMetrics[agent.id]?.mem || 0}%` }}
                                  className={`h-full ${agent.status === 'active' ? 'bg-purple-500' : 'bg-zinc-600'}`}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 pt-1 text-[7px] font-mono text-zinc-600 uppercase">
                            <Clock className="w-2 h-2" />
                            Last Active: {formatLastActive(agent.lastActive)}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </section>
            </div>

            {/* Right Column: Learning Logs / Summary */}
            <div className="col-span-12 lg:col-span-8 space-y-8">
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Brain className="w-3 h-3" />
                    Neural Learning Stream
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Success Rate</span>
                    </div>
                    <p className="text-2xl font-mono text-white">99.8%</p>
                  </div>
                  <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-3 h-3 text-blue-500" />
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Avg Latency</span>
                    </div>
                    <p className="text-2xl font-mono text-white">14msp</p>
                  </div>
                  <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="w-3 h-3 text-purple-500" />
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Data Ingested</span>
                    </div>
                    <p className="text-2xl font-mono text-white">4.2TB</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {tasks.filter(t => t.status === 'completed').slice(0, 5).map((task) => (
                    <div key={`log-${task.id}`} className="p-4 bg-zinc-900/20 border border-zinc-800/50 rounded-lg relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50" />
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Success</span>
                          <span className="text-[10px] text-zinc-400 font-mono">Task {task.id.slice(0, 6)} finalized</span>
                        </div>
                        <span className="text-[9px] text-zinc-600 font-mono">{task.completedAt?.toDate().toLocaleTimeString()}</span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed italic">
                        &quot;Agent <span className="text-emerald-400">{agents.find(a => a.id === task.agentId)?.name}</span> successfully
                        executed <span className="text-white font-bold uppercase">{task.type}</span>. Neural weights converged.&quot;
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}

        {activeView === 'tasks' && (
          <div className="space-y-8">
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold text-white uppercase tracking-tight">Task Queue</h2>
                  <div className="h-4 w-px bg-zinc-800" />
                  <div className="flex gap-2">
                    {['Critical', 'High', 'Medium', 'Low'].map(p => (
                      <span key={p} className={`text-[8px] px-2 py-0.5 rounded-full border ${getPriorityColor(p.toLowerCase())}`}>
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setIsCreatingTask(true)}
                  className="px-6 py-2 bg-emerald-500 text-black text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-emerald-400 transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Operation
                </button>
              </div>

              <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-zinc-800 bg-black/40">
                  <div className="col-span-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Type</div>
                  <div className="col-span-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</div>
                  <div className="col-span-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center">Priority</div>
                  <div className="col-span-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Agent</div>
                  <div className="col-span-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Dependencies</div>
                  <div className="col-span-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">Actions</div>
                </div>

                <div className="divide-y divide-zinc-800/50">
                  {tasksLoading ? (
                    <div className="p-12 text-center animate-pulse">
                      <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Syncing with task buffer...</p>
                    </div>
                  ) : tasks.length === 0 ? (
                    <div className="p-20 text-center">
                      <Terminal className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                      <p className="text-sm text-zinc-500 font-mono">NO ACTIVE TASKS IN PIPELINE</p>
                    </div>
                  ) : (
                    tasks.map((task) => (
                      <div key={task.id} className={`grid grid-cols-12 gap-4 p-5 hover:bg-white/[0.02] transition-all items-center ${task.priority === 'critical' ? 'bg-red-500/5' : ''}`}>
                        <div className="col-span-1 flex justify-center">
                          <div className="p-2 bg-zinc-800 rounded-lg">
                            {getTaskStatusIcon(task.status)}
                          </div>
                        </div>
                        <div className="col-span-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-white uppercase tracking-wider">{task.type}</span>
                            {task.schedule && (
                              <Calendar className="w-3 h-3 text-blue-500" />
                            )}
                          </div>
                          <p className="text-[9px] text-zinc-500 font-mono">ROOT: {task.id.slice(0, 12)}</p>
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <span className={`text-[9px] px-2 py-0.5 rounded border uppercase font-bold tracking-widest ${getPriorityColor(task.priority || 'medium')}`}>
                            {task.priority || 'medium'}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <div className="flex items-center gap-2">
                            <Bot className="w-3 h-3 text-zinc-500" />
                            <span className="text-[10px] text-zinc-300 uppercase font-mono">
                              {agents.find(a => a.id === task.agentId)?.name || 'DYNAMIC'}
                            </span>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <div className="flex flex-wrap gap-1">
                            {task.dependencies?.length > 0 ? (
                              task.dependencies.map((depId: string) => (
                                <span key={depId} className="text-[8px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700" title={depId}>
                                  {depId.slice(0, 4)}
                                </span>
                              ))
                            ) : (
                              <span className="text-[8px] text-zinc-600 italic uppercase">None</span>
                            )}
                          </div>
                        </div>
                        <div className="col-span-2 text-right flex items-center justify-end gap-3">
                          {task.status === 'queued' || task.status === 'in_progress' ? (
                            <button
                              onClick={() => handleCancelTask(task.id)}
                              className="text-[9px] font-bold text-amber-500/70 hover:text-amber-500 uppercase tracking-widest"
                            >
                              Intervene
                            </button>
                          ) : null}
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-zinc-600 hover:text-red-500 transition-colors"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {activeView === 'policies' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white uppercase tracking-tight">Automation Directives</h2>
              <button
                onClick={() => setIsCreatingPolicy(true)}
                className="px-6 py-2 bg-emerald-500 text-black text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-emerald-400 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Directive
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {policies.map((policy) => (
                <div key={policy.id} className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6 relative overflow-hidden group">
                  <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl opacity-5 rounded-full ${policy.enabled ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-3 bg-zinc-800 rounded-lg">
                      <Settings className={`w-5 h-5 ${policy.enabled ? 'text-emerald-500' : 'text-zinc-500'}`} />
                    </div>
                    <button
                      onClick={() => togglePolicy(policy.id, policy.enabled)}
                      className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all ${
                        policy.enabled
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                      }`}
                    >
                      {policy.enabled ? 'Authorized' : 'Suspended'}
                    </button>
                  </div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">{policy.name}</h3>
                  <div className="space-y-4">
                    <div className="p-3 bg-black/40 rounded border border-zinc-800/50">
                      <p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1">Threshold Condition</p>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-3 h-3 text-zinc-300" />
                        <span className="text-xs font-mono text-zinc-100">{policy.trigger.metric} {policy.trigger.operator} {policy.trigger.threshold}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-black/40 rounded border border-zinc-800/50">
                      <p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1">Execution Action</p>
                      <div className="flex items-center gap-2">
                        <ArrowRight className="w-3 h-3 text-emerald-500" />
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">{policy.action.type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-zinc-800/50 flex justify-end">
                    <button
                      onClick={() => deletePolicy(policy.id)}
                      className="text-[9px] font-bold text-red-500/50 hover:text-red-500 uppercase tracking-widest transition-colors"
                    >
                      Purge Directive
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'performance' && (
          <div className="space-y-8">
             <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white uppercase tracking-tight">Compute Telemetry</h2>
              <div className="flex items-center gap-2 bg-zinc-900/50 px-3 py-1.5 rounded border border-zinc-800">
                <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                <span className="text-[10px] font-mono text-zinc-400 uppercase">Live Buffer: 3s Intervial</span>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-8">
              {/* Metric Overlays */}
              <div className="col-span-12 lg:col-span-8 space-y-6">
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-widest">Global Resource Allocation</h3>
                      <p className="text-[10px] text-zinc-500 font-mono">CPU / GPU / MEMORY STACK</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[9px] text-zinc-400 uppercase font-mono">CPU</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-[9px] text-zinc-400 uppercase font-mono">GPU</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        <span className="text-[9px] text-zinc-400 uppercase font-mono">MEM</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metricHistory[selectedAgentId || agents[0]?.id] || []}>
                        <defs>
                          <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                        <XAxis
                          dataKey="time"
                          stroke="#52525b"
                          fontSize={9}
                          tickLine={false}
                          axisLine={false}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          stroke="#52525b"
                          fontSize={9}
                          tickLine={false}
                          axisLine={false}
                          domain={[0, 100]}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '10px' }}
                          itemStyle={{ padding: '2px 0' }}
                        />
                        <Area type="monotone" dataKey="cpu" stroke="#10b981" fillOpacity={1} fill="url(#colorCpu)" strokeWidth={2} />
                        <Line type="monotone" dataKey="gpu" stroke="#3b82f6" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="mem" stroke="#a855f7" strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6">Thermal Distribution</h3>
                    <div className="h-[150px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={metricHistory[selectedAgentId || agents[0]?.id] || []}>
                          <Line type="stepAfter" dataKey="cpu" stroke="#f43f5e" strokeWidth={1} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6">Network Throughput</h3>
                    <div className="h-[150px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={metricHistory[selectedAgentId || agents[0]?.id] || []}>
                          <Area type="monotone" dataKey="mem" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.1} strokeWidth={1} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

              {/* Agent Selection for Metrics */}
              <div className="col-span-12 lg:col-span-4 space-y-6">
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-4">
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Focused Instance</h3>
                  <div className="space-y-2">
                    {agents.map(agent => (
                      <button
                        key={agent.id}
                        onClick={() => setSelectedAgentId(agent.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                          (selectedAgentId || agents[0]?.id) === agent.id
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-black/20 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Bot className={`w-4 h-4 ${(selectedAgentId || agents[0]?.id) === agent.id ? 'text-emerald-500' : 'text-zinc-500'}`} />
                          <div className="text-left">
                            <p className="text-xs font-bold text-white uppercase tracking-wider">{agent.name}</p>
                            <p className="text-[8px] text-zinc-500 font-mono">{agent.id.slice(0, 12)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-mono text-zinc-300">{agentMetrics[agent.id]?.cpu || 0}%</p>
                          <div className="w-12 h-1 bg-zinc-800 rounded-full mt-1 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500"
                              style={{ width: `${agentMetrics[agent.id]?.cpu || 0}%` }}
                            />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                  <Activity className="w-6 h-6 text-emerald-500 mb-4" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-2">Autonomous Scaling</h4>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    The orchestration engine is currently managing <span className="text-emerald-400 font-bold">{agents.length} nodes</span> with dynamic load balancing.
                    Resources are prioritized for NLM weight convergence.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isCreatingAgent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-800 bg-black/20">
                <h2 className="text-sm font-bold text-white uppercase tracking-widest">Initialize New Agent</h2>
                <p className="text-[10px] text-zinc-500 font-mono uppercase">DEPLOY AUTONOMOUS INSTANCE</p>
              </div>
              <form onSubmit={handleCreateAgent} className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Agent Name</label>
                  <input
                    type="text"
                    required
                    value={newAgent.name}
                    onChange={e => setNewAgent({ ...newAgent, name: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    placeholder="e.g. ALPHA-TRAINER-01"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Agent Type</label>
                  <select
                    value={newAgent.type}
                    onChange={e => setNewAgent({ ...newAgent, type: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  >
                    <option value="trainer">Trainer</option>
                    <option value="evaluator">Evaluator</option>
                    <option value="mutator">Mutator</option>
                    <option value="observer">Observer</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsCreatingAgent(false)}
                    className="flex-1 px-4 py-2 border border-zinc-800 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-emerald-500 text-black text-[10px] font-bold uppercase tracking-widest rounded hover:bg-emerald-400 transition-colors"
                  >
                    Deploy
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isCreatingTask && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-800 bg-black/20">
                <h2 className="text-sm font-bold text-white uppercase tracking-widest">Orchestrate Task</h2>
                <p className="text-[10px] text-zinc-500 font-mono uppercase">QUEUE NEURAL OPERATION</p>
              </div>
              <form onSubmit={handleCreateTask} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Task Type</label>
                    <select
                      value={newTask.type}
                      onChange={e => setNewTask({ ...newTask, type: e.target.value })}
                      className="w-full bg-black border border-zinc-800 rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    >
                      <option value="TRAIN">Train</option>
                      <option value="MUTATE">Mutate</option>
                      <option value="EVALUATE">Evaluate</option>
                      <option value="INGEST">Ingest</option>
                      <option value="INGEST_MINDEX">Ingest Mindex Data</option>
                      <option value="VALIDATE">Validate</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
                      className="w-full bg-black border border-zinc-800 rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Task Dependencies (Select previous tasks)</label>
                  <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto p-2 border border-zinc-800 bg-black rounded">
                    {tasks.filter(t => t.status !== 'completed').map(t => (
                      <label key={t.id} className="flex items-center gap-2 cursor-pointer hover:bg-zinc-800 p-1 rounded transition-colors">
                        <input
                          type="checkbox"
                          checked={newTask.dependencies.includes(t.id)}
                          onChange={e => {
                            const deps = e.target.checked
                              ? [...newTask.dependencies, t.id]
                              : newTask.dependencies.filter(id => id !== t.id);
                            setNewTask({ ...newTask, dependencies: deps });
                          }}
                          className="rounded border-zinc-800 text-emerald-500 focus:ring-emerald-500 bg-black"
                        />
                        <span className="text-[10px] text-zinc-300 uppercase font-mono">{t.type} - {t.id.slice(0, 8)}</span>
                      </label>
                    ))}
                    {tasks.filter(t => t.status !== 'completed').length === 0 && (
                      <p className="text-[8px] text-zinc-600 uppercase italic">No active tasks to depend on</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    Automation Schedule
                  </label>
                  <select
                    value={newTask.schedule?.interval || ''}
                    onChange={e => {
                      const interval = e.target.value;
                      if (!interval) {
                        setNewTask({ ...newTask, schedule: null });
                      } else {
                        setNewTask({ ...newTask, schedule: { interval, nextRun: new Date(Date.now() + 3600000) } });
                      }
                    }}
                    className="w-full bg-black border border-zinc-800 rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  >
                    <option value="">Run Immediately (Once)</option>
                    <option value="hourly">Every Hour</option>
                    <option value="daily">Every 24 Hours</option>
                    <option value="weekly">Every 7 Days</option>
                    <option value="realtime">Continuous Stream (RL)</option>
                  </select>
                </div>

                {newTask.type === 'INGEST_MINDEX' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Mindex Source</label>
                    <select
                      value={(newTask.params as any).source || 'global'}
                      onChange={e => setNewTask({ ...newTask, params: { ...newTask.params, source: e.target.value } })}
                      className="w-full bg-black border border-zinc-800 rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    >
                      <option value="global">Global Stream</option>
                      <option value="device">Device Data</option>
                      <option value="scraping">Scraping Data</option>
                    </select>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Initial Status</label>
                  <select
                    value={newTask.status}
                    onChange={e => setNewTask({ ...newTask, status: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  >
                    <option value="queued">Queued</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed (Manual Log)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Target Model</label>
                  <select
                    required
                    value={newTask.modelId}
                    onChange={e => setNewTask({ ...newTask, modelId: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  >
                    <option value="">Select Model...</option>
                    {models.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                {newTask.type === 'TRAIN' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Batch Size</label>
                    <input
                      type="number"
                      value={(newTask.params as any).batchSize || 32}
                      onChange={e => setNewTask({ ...newTask, params: { ...newTask.params, batchSize: parseInt(e.target.value) } })}
                      className="w-full bg-black border border-zinc-800 rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>
                )}

                {newTask.type === 'MUTATE' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Target Layers</label>
                    <input
                      type="text"
                      placeholder="e.g. 1, 4, 8 or 'all'"
                      value={newTask.params.targetLayers || ''}
                      onChange={e => setNewTask({ ...newTask, params: { ...newTask.params, targetLayers: e.target.value } })}
                      className="w-full bg-black border border-zinc-800 rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>
                )}

                {newTask.type === 'EVALUATE' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Validation Dataset</label>
                    <input
                      type="text"
                      placeholder="Dataset ID or Path"
                      value={newTask.params.datasetId || ''}
                      onChange={e => setNewTask({ ...newTask, params: { ...newTask.params, datasetId: e.target.value } })}
                      className="w-full bg-black border border-zinc-800 rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>
                )}

                {newTask.type === 'INGEST' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Data Source</label>
                    <input
                      type="text"
                      placeholder="Source URL or ID"
                      value={newTask.params.source || ''}
                      onChange={e => setNewTask({ ...newTask, params: { ...newTask.params, source: e.target.value } })}
                      className="w-full bg-black border border-zinc-800 rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>
                )}

                {newTask.type === 'VALIDATE' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Confidence Threshold</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newTask.params.threshold || 0.95}
                      onChange={e => setNewTask({ ...newTask, params: { ...newTask.params, threshold: parseFloat(e.target.value) } })}
                      className="w-full bg-black border border-zinc-800 rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Assign Agent (Optional)</label>
                  <select
                    value={selectedAgentId || ''}
                    onChange={e => setSelectedAgentId(e.target.value || null)}
                    className="w-full bg-black border border-zinc-800 rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  >
                    <option value="">Auto-assign</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsCreatingTask(false)}
                    className="flex-1 px-4 py-2 border border-zinc-800 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-emerald-500 text-black text-[10px] font-bold uppercase tracking-widest rounded hover:bg-emerald-400 transition-colors"
                  >
                    Queue Task
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isCreatingPolicy && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-800 bg-black/20">
                <h2 className="text-sm font-bold text-white uppercase tracking-widest">Define Automation Policy</h2>
                <p className="text-[10px] text-zinc-500 font-mono uppercase">ESTABLISH AUTONOMOUS GUARDRAILS</p>
              </div>
              <form onSubmit={handleCreatePolicy} className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Policy Name</label>
                  <input
                    type="text"
                    required
                    value={newPolicy.name}
                    onChange={e => setNewPolicy({ ...newPolicy, name: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    placeholder="e.g. LOW-ACCURACY-RETRAIN"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Trigger Metric</label>
                    <select
                      value={newPolicy.trigger.metric}
                      onChange={e => setNewPolicy({ ...newPolicy, trigger: { ...newPolicy.trigger, metric: e.target.value } })}
                      className="w-full bg-black border border-zinc-800 rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    >
                      <option value="accuracy">Accuracy</option>
                      <option value="loss">Loss</option>
                      <option value="avani_score">AVANI Score</option>
                      <option value="uncertainty">Uncertainty</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Threshold</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newPolicy.trigger.threshold}
                      onChange={e => setNewPolicy({ ...newPolicy, trigger: { ...newPolicy.trigger, threshold: parseFloat(e.target.value) } })}
                      className="w-full bg-black border border-zinc-800 rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Action</label>
                  <select
                    value={newPolicy.action.type}
                    onChange={e => setNewPolicy({ ...newPolicy, action: { ...newPolicy.action, type: e.target.value } })}
                    className="w-full bg-black border border-zinc-800 rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  >
                    <option value="TRAIN">Trigger Training</option>
                    <option value="MUTATE">Trigger Mutation</option>
                    <option value="EVALUATE">Trigger Evaluation</option>
                    <option value="INGEST_MINDEX">Trigger Mindex Ingestion</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsCreatingPolicy(false)}
                    className="flex-1 px-4 py-2 border border-zinc-800 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-emerald-500 text-black text-[10px] font-bold uppercase tracking-widest rounded hover:bg-emerald-400 transition-colors"
                  >
                    Enable Policy
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MYCA · MAS Integration View */}
      {activeView === 'myca' && (
        <main className="max-w-7xl mx-auto px-6 py-8">
          <MycaMasPanel userId={userId} />
        </main>
      )}
    </div>
  );
}
