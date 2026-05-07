'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTrainingRuns, useMutations, useFrames, useModelVersions, useJudgments, useModel, useMutationRecipes } from '@/lib/nlm/firebase-hooks';
import { useMindexData } from '@/lib/nlm/supabase-hooks';
import { MerkleLineageExplorer } from './MerkleLineageExplorer';
import * as d3 from 'd3';
import {
  updateDoc,
  doc,
  collection,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/nlm/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Brain, Cpu, Database, GitBranch, GitCommit, GitFork, History,
  Layers, Play, RotateCcw, Save, Server, Settings, Shield, Sparkles,
  Square, TrendingUp, Wand2, Zap, ChevronRight, ChevronDown, ChevronUp,
  Info, Gauge, RefreshCw, AlertCircle, LayoutDashboard, MessageSquare, Trash2,
  Activity, Fingerprint, Clock
} from 'lucide-react';
import { Button } from './ui/button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { NatureVisualization } from './NatureVisualization';
import { TrainingRunDetail } from './TrainingRunDetail';
import { StateGraphConsole } from './StateGraphConsole';
import { SensorySignalMonitor } from './SensorySignalMonitor';
import { NeuralNetworkViz } from './NeuralNetworkViz';

import { getMutationAdvice, analyzeSensoryData, getModelAdvice } from '@/lib/nlm/gemini';

export function ModelDetail({ model: initialModel, onBack, userId, isAdmin }: { model: any, onBack: () => void, userId: string, isAdmin?: boolean }) {
  const { model: liveModel } = useModel(initialModel.id);
  const model = liveModel || initialModel;

  const { runs } = useTrainingRuns(model.id, userId, isAdmin);
  const { mutations } = useMutations(model.id);
  const { frames } = useFrames(model.id);
  const { versions } = useModelVersions(model.id);
  const { judgments } = useJudgments(model.id);
  const { recipes } = useMutationRecipes(model.ownerId, isAdmin);
  const { data: mindexData, loading: mindexLoading } = useMindexData();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const isTraining = model.status === 'training';
  const [activeTab, setActiveTab] = useState<'overview' | 'mindex' | 'training-config' | 'recursive-training' | 'judgments' | 'mutation' | 'cognition' | 'lineage' | 'activity' | 'sensors'>('overview');
  const [activitySubTab, setActivitySubTab] = useState<'runs' | 'mutations' | 'versions'>('runs');
  const [sensors, setSensors] = useState<any[]>(model.config?.sensors || [
    { id: 'spectral', name: 'Spectral Intensity', threshold: 0.75, current: 0.42, status: 'stable' },
    { id: 'acoustic', name: 'Acoustic Vibration', threshold: 0.5, current: 0.68, status: 'active' },
    { id: 'bioelectric', name: 'Bioelectric Potential', threshold: 0.8, current: 0.12, status: 'stable' },
    { id: 'thermal', name: 'Thermal Flux', threshold: 0.6, current: 0.55, status: 'stable' },
    { id: 'chemical', name: 'Chemical Concentration', threshold: 0.4, current: 0.38, status: 'stable' },
    { id: 'mechanical', name: 'Mechanical Stress', threshold: 0.9, current: 0.25, status: 'stable' },
  ]);
  const [sensorActions, setSensorActions] = useState<any[]>([
    { id: 1, sensor: 'Acoustic Vibration', action: 'Weight Adjustment', impact: 'High', timestamp: new Date() },
    { id: 2, sensor: 'Spectral Intensity', action: 'Layer Normalization', impact: 'Medium', timestamp: new Date(Date.now() - 1000 * 60 * 5) },
  ]);
  const [trainingData, setTrainingData] = useState<any[]>([]);
  const [aiAdvice, setAiAdvice] = useState<any[]>([]);
  const [modelAdvice, setModelAdvice] = useState<any>(null);
  const [expandedAdvice, setExpandedAdvice] = useState<number | null>(null);
  const [showModelAdvice, setShowModelAdvice] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplyingMutation, setIsApplyingMutation] = useState<number | null>(null);
  const [learningRate, setLearningRate] = useState(model.config?.learningRate || 0.001);
  const [batchSize, setBatchSize] = useState(model.config?.batchSize || 32);
  const [epochs, setEpochs] = useState(model.config?.epochs || 10);
  const [recursionDepth, setRecursionDepth] = useState(model.config?.recursionDepth || 4);
  const [cyclicalLearning, setCyclicalLearning] = useState(model.config?.cyclicalLearning ?? true);
  const [backpropThreshold, setBackpropThreshold] = useState(model.config?.backpropThreshold || 0.01);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [mutationRate, setMutationRate] = useState(model.config?.mutationRate || 0.05);
  const [targetLayers, setTargetLayers] = useState(model.config?.targetLayers || "1, 2, 3, 4");
  const [selectedStrategy, setSelectedStrategy] = useState<string>('Default (Random Weight Perturbation)');

  const handleSaveConfig = () => {
    setShowSaveConfirm(true);
  };

  const confirmSaveConfig = async () => {
    setShowSaveConfirm(false);
    setIsSavingConfig(true);
    try {
      await updateDoc(doc(db, 'models', model.id), {
        config: {
          ...model.config,
          learningRate,
          batchSize,
          epochs,
          recursionDepth,
          cyclicalLearning,
          backpropThreshold,
          mutationRate,
          sensors
        },
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error saving config:", error);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleUpdateSensorThreshold = (sensorId: string, threshold: number) => {
    setSensors(prev => prev.map(s => s.id === sensorId ? { ...s, threshold } : s));
  };

  // Simulate sensor activity
  useEffect(() => {
    const interval = setInterval(() => {
      setSensors(prev => {
        const newSensors = prev.map(s => {
          const nextCurrent = Math.max(0, Math.min(1, s.current + (Math.random() * 0.1 - 0.05)));
          const status = nextCurrent > s.threshold ? 'active' : 'stable';

          // Trigger action if status changed to active
          if (status === 'active' && s.status === 'stable') {
            const actions = [
              'Weight Adjustment',
              'Layer Normalization',
              'Gradient Clipping',
              'Learning Rate Decay',
              'Entropy Regularization',
              'Architecture Pruning'
            ];
            const impacts = ['Low', 'Medium', 'High'];
            const newAction = {
              id: Date.now() + Math.random(),
              sensor: s.name,
              action: actions[Math.floor(Math.random() * actions.length)],
              impact: impacts[Math.floor(Math.random() * impacts.length)],
              timestamp: new Date()
            };
            setSensorActions(prevActions => [newAction, ...prevActions].slice(0, 10));
          }

          return { ...s, current: nextCurrent, status };
        });
        return newSensors;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (model.config?.sensors) {
      setSensors(model.config.sensors);
    }
  }, [model.config?.sensors]);

  const trainingProgress = useMemo(() => {
    if (trainingData.length === 0) return 0;
    const last = trainingData[trainingData.length - 1];
    return Math.min(100, last.accuracy * 100);
  }, [trainingData]);

  // Simulated AVANI Score
  const avaniScore = model.avaniScore || 0.92;
  const architectureId = model.architectureId || 'v3.1-mamba-graph';

  const mindexStreamData = useMemo(() => {
    if (!mindexData || mindexData.length === 0) return [
      { time: '10:00', val: 120 },
      { time: '10:05', val: 150 },
      { time: '10:10', val: 130 },
      { time: '10:15', val: 180 },
      { time: '10:20', val: 160 },
      { time: '10:25', val: 210 },
    ];

    // Group mindex data by time (e.g., 5-minute intervals) for the last hour
    const now = new Date();
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

    const filtered = mindexData.filter(d => new Date(d.timestamp) > lastHour);

    // Simple grouping by 5-minute intervals
    const groups: Record<string, number> = {};
    filtered.forEach(d => {
      const date = new Date(d.timestamp);
      const timeStr = `${date.getHours()}:${Math.floor(date.getMinutes() / 5) * 5}`;
      groups[timeStr] = (groups[timeStr] || 0) + 1;
    });

    return Object.entries(groups).map(([time, val]) => ({ time, val })).sort((a, b) => a.time.localeCompare(b.time));
  }, [mindexData]);

  const fetchAiAdvice = async () => {
    setIsAnalyzing(true);
    try {
      const lastMetrics = trainingData[trainingData.length - 1] || { loss: 0.8, accuracy: 0.2 };

      const [mAdvice, gAdvice] = await Promise.all([
        getMutationAdvice(model.config, lastMetrics),
        getModelAdvice(model, sensors)
      ]);

      if (mAdvice) setAiAdvice(mAdvice);
      if (gAdvice) setModelAdvice(gAdvice);
    } catch (error) {
      console.error("Error fetching AI advice:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Use real training data from the latest run if available, otherwise simulate
  useEffect(() => {
    if (runs && runs.length > 0) {
      const latestRun = runs[0];
      if (latestRun.lossHistory && latestRun.lossHistory.length > 0) {
        setTrainingData(latestRun.lossHistory.map((h: any) => ({
          step: h.step,
          loss: h.loss,
          accuracy: h.accuracy || (1 - h.loss / 2) // Fallback accuracy if not present
        })));
        return;
      }
    }

    if (!isTraining) return;

    const interval = setInterval(() => {
      setTrainingData(prev => {
        const last = prev[prev.length - 1] || { step: 0, loss: 0.8, accuracy: 0.2 };
        const nextStep = last.step + 1;
        const nextLoss = Math.max(0.05, last.loss - (Math.random() * 0.02) + (Math.random() * 0.01));
        const nextAccuracy = Math.min(0.99, last.accuracy + (Math.random() * 0.015));

        const newData = [...prev, { step: nextStep, loss: nextLoss, accuracy: nextAccuracy }];
        return newData.slice(-50); // Keep last 50 points
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTraining, runs]);

  const handleToggleTraining = async () => {
    const newStatus = model.status === 'training' ? 'idle' : 'training';

    try {
      await updateDoc(doc(db, 'models', model.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      if (newStatus === 'training') {
        await addDoc(collection(db, 'training_runs'), {
          modelId: model.id,
          ownerId: userId,
          startTime: serverTimestamp(),
          status: 'running',
          hyperparameters: {
            learningRate,
            batchSize,
            epochs,
            recursionDepth,
            cyclicalLearning,
            backpropThreshold,
            mutationRate,
            architectureId
          },
          config: model.config || {},
          dataset: model.dataset || 'MINDEX-Primary'
        });
      }
    } catch (error) {
      console.error("Error toggling training:", error);
    }
  };

  const handleMutate = async () => {
    const mutationType = selectedStrategy.includes('Default') ?
      ['crossover', 'noise', 'pruning', 'expansion'][Math.floor(Math.random() * 4)] :
      selectedStrategy.split(' ')[0].toLowerCase();

    const newMutation = {
      type: mutationType,
      strategy: selectedStrategy,
      description: `Applied ${selectedStrategy} mutation with rate ${mutationRate} to regions [${targetLayers}]`,
      mutationRate,
      targetLayers,
      config: {
        mutationRate,
        recursionDepth,
        targetLayers
      }
    };

    try {
      await addDoc(collection(db, 'mutations'), {
        ...newMutation,
        modelId: model.id,
        ownerId: userId,
        timestamp: serverTimestamp()
      });

      await updateDoc(doc(db, 'models', model.id), {
        status: 'mutating',
        updatedAt: serverTimestamp()
      });

      setTimeout(async () => {
        try {
          await updateDoc(doc(db, 'models', model.id), {
            status: 'idle',
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          console.error("Error finalizing mutation:", err);
        }
      }, 3000);
    } catch (error) {
      console.error("Error recording mutation:", error);
    }
  };

  const applyAdviceMutation = async (advice: any, index: number) => {
    setIsApplyingMutation(index);
    try {
      // 1. Record the mutation
      await addDoc(collection(db, 'mutations'), {
        type: advice.type,
        description: advice.description,
        impact: advice.expectedImpact,
        modelId: model.id,
        ownerId: userId,
        timestamp: serverTimestamp(),
        source: 'gemini_assistant'
      });

      // 2. Update model status to 'mutating' and apply config changes if any
      const updatedConfig = { ...model.config };

      // Heuristic: if advice mentions learning rate, adjust it
      if (advice.description.toLowerCase().includes('learning rate')) {
        if (advice.description.toLowerCase().includes('increase')) {
          updatedConfig.learningRate = (updatedConfig.learningRate || 0.001) * 1.5;
        } else if (advice.description.toLowerCase().includes('decrease')) {
          updatedConfig.learningRate = (updatedConfig.learningRate || 0.001) * 0.5;
        }
      }

      await updateDoc(doc(db, 'models', model.id), {
        status: 'mutating',
        config: updatedConfig,
        updatedAt: serverTimestamp()
      });

      // 3. Simulate mutation process completion
      setTimeout(async () => {
        try {
          await updateDoc(doc(db, 'models', model.id), {
            status: 'idle',
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          console.error("Error finalizing advised mutation:", err);
        } finally {
          setIsApplyingMutation(null);
          setExpandedAdvice(null);
        }
      }, 3000);

    } catch (error) {
      console.error("Error applying mutation:", error);
      setIsApplyingMutation(null);
    }
  };

  const handleCommitFrame = async () => {
    const frameRoot = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const parentRoot = frames.length > 0 ? frames[0].frame_root : '0'.repeat(64);

    try {
      await addDoc(collection(db, 'frames'), {
        modelId: model.id,
        ownerId: userId,
        frame_root: frameRoot,
        parent_frame_root: parentRoot,
        self_root: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        world_root: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        event_root: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        timestamp: serverTimestamp(),
        uncertainty: Math.random() * 0.1,
        source_device: 'NLM-CORE-01'
      });
    } catch (error) {
      console.error("Error committing frame:", error);
    }
  };

  const handleCreateVersion = async () => {
    const versionNumber = versions.length + 1;
    try {
      await addDoc(collection(db, `models/${model.id}/versions`), {
        modelId: model.id,
        ownerId: userId,
        versionNumber,
        description: `Manual snapshot at ${new Date().toLocaleString()}`,
        config: model.config || {},
        architectureId: model.architectureId || 'v3.1-mamba-graph',
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error creating version:", error);
    }
  };

  const handleRevertVersion = async (version: any) => {
    if (!confirm(`Are you sure you want to revert to version ${version.versionNumber}? This will overwrite current configuration.`)) return;

    try {
      await updateDoc(doc(db, 'models', model.id), {
        config: version.config,
        architectureId: version.architectureId,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error reverting version:", error);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-2xl space-y-2">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Step {label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-8">
              <span className="text-xs text-zinc-400">Loss</span>
              <span className="text-xs font-mono text-red-400 font-bold">{data.loss.toFixed(6)}</span>
            </div>
            <div className="flex items-center justify-between gap-8">
              <span className="text-xs text-zinc-400">Accuracy</span>
              <span className="text-xs font-mono text-emerald-400 font-bold">{(data.accuracy * 100).toFixed(2)}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  return (
    <div className="space-y-8 pb-20 max-w-full overflow-x-hidden">
      {/* Model Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-2xl border border-zinc-800 hover:bg-zinc-800 text-zinc-400"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-3xl font-bold text-white">{model.name}</h2>
              <div className="px-2 py-0.5 bg-zinc-800 rounded-md border border-zinc-700">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">{architectureId}</span>
              </div>
            </div>
            <p className="text-zinc-400 text-sm mb-3 max-w-xl">
              {model.description || 'Nature Learning Model instance.'}
              <span className="text-zinc-600 ml-2">• Lineage: {frames.length} cognitive frames</span>
            </p>
            <div className="flex items-center gap-4 text-sm text-zinc-500">
              <span className="flex items-center gap-1.5">
                <Activity className={`w-4 h-4 ${isTraining ? 'text-green-500 animate-pulse' : ''}`} />
                {isTraining ? 'Training Active' : 'Idle'}
              </span>
              <span className="flex items-center gap-1.5">
                <Database className="w-4 h-4" />
                {model.dataset || 'MINDEX-Primary'}
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-500" />
                AVANI Certified
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleToggleTraining}
            className={`rounded-2xl px-6 h-12 font-bold transition-all ${
              isTraining
                ? 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700'
                : 'bg-white text-black hover:bg-zinc-200'
            }`}
          >
            {isTraining ? (
              <><Square className="w-4 h-4 mr-2 fill-current" /> Stop Training</>
            ) : (
              <><Play className="w-4 h-4 mr-2 fill-current" /> Start Training</>
            )}
          </Button>
          <Button variant="outline" className="rounded-2xl h-12 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-zinc-900/60 border border-zinc-800 rounded-2xl w-fit max-w-full">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'mindex', label: 'Mindex Grounding', icon: Server },
          { id: 'training-config', label: 'Training Config', icon: Settings },
          { id: 'recursive-training', label: 'Recursion', icon: RotateCcw },
          { id: 'judgments', label: 'Judgments', icon: Shield },
          { id: 'mutation', label: 'Mutation', icon: GitFork },
          { id: 'cognition', label: 'Cognition', icon: Brain },
          { id: 'lineage', label: 'Lineage', icon: GitCommit },
          { id: 'activity', label: 'Activity', icon: History },
          { id: 'sensors', label: 'Sensors', icon: Gauge },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-zinc-800 text-white shadow-lg'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Grid */}
      <div className={`grid grid-cols-1 ${activeTab === 'lineage' ? '' : 'lg:grid-cols-3'} gap-8`}>
        {/* Left Column: Visualization & Metrics */}
        <div className={`${activeTab === 'lineage' ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-8`}>
          <AnimatePresence mode="wait">
            {activeTab === 'lineage' && (
              <motion.div
                key="lineage"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <MerkleLineageExplorer modelId={model.id} />
              </motion.div>
            )}
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {/* Sensory Visualization */}
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 min-h-[400px] relative overflow-hidden flex flex-col">
                    <div className="z-10 mb-6">
                      <h3 className="text-xl font-bold text-white">Sensory Grounding</h3>
                      <p className="text-zinc-500 text-sm">Real-time processing of physical reality signals.</p>
                    </div>
                    <div className="flex-1 relative">
                      <NatureVisualization isTraining={isTraining} />
                      <SensorySignalMonitor isTraining={isTraining} />
                    </div>
                  </div>

                  {/* Gemini Assistant Panel */}
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 space-y-6 relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                      <Sparkles className="w-24 h-24 text-white" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700">
                          <Brain className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">Gemini NLM Assistant</h3>
                          <p className="text-zinc-500 text-sm">AI-driven architectural insights.</p>
                        </div>
                      </div>
                      <Button
                        onClick={fetchAiAdvice}
                        disabled={isAnalyzing}
                        size="sm"
                        className="bg-zinc-800 text-white hover:bg-zinc-700 rounded-xl border border-zinc-700"
                      >
                        {isAnalyzing ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Wand2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto max-h-[400px] no-scrollbar pr-1">
                      {modelAdvice && (
                        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4 mb-2">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-3 h-3 text-indigo-400" />
                            <span className="text-[10px] font-bold text-indigo-200">Gemini Strategic Insight</span>
                          </div>
                          <p className="text-[10px] text-zinc-400 leading-relaxed tabular-nums">{modelAdvice.architecture.slice(0, 100)}...</p>
                        </div>
                      )}

                      {aiAdvice.length === 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                          {[1, 2].map(i => (
                            <div key={i} className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl h-24 flex items-center justify-center text-zinc-700 text-[10px] text-center px-8 italic">
                              Click analyze to generate insights.
                            </div>
                          ))}
                        </div>
                      ) : (
                        aiAdvice.map((advice, i) => (
                          <div key={i} className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl space-y-2">
                             <div className="flex justify-between items-start">
                               <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{advice.type}</span>
                               <Zap className="w-3 h-3 text-zinc-600" />
                             </div>
                             <p className="text-xs text-zinc-300 line-clamp-2">{advice.description}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Training History Chart */}
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Training History</h3>
                        <p className="text-zinc-500 text-sm">Loss and Accuracy metrics over time.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-xs text-zinc-400 font-mono uppercase">Loss</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        <span className="text-xs text-zinc-400 font-mono uppercase">Accuracy</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trainingData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis
                          dataKey="step"
                          stroke="#52525b"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#52525b"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          domain={[0, 'auto']}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="loss"
                          stroke="#ef4444"
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="accuracy"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatCard label="Loss" value={trainingData[trainingData.length-1]?.loss.toFixed(4) || '0.0000'} trend="-12%" />
                  <StatCard label="Accuracy" value={`${(trainingData[trainingData.length-1]?.accuracy * 100).toFixed(1) || '0.0'}%`} trend="+4.2%" />
                  <StatCard label="Tokens/Sec" value={isTraining ? '12.4k' : '0'} trend="Stable" />
                </div>

                {/* Recent Lifecycle Events (Accordions) */}
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 space-y-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-zinc-400" />
                    Recent Lifecycle Events
                  </h3>

                  <div className="space-y-3">
                    {/* Latest Run Accordion */}
                    <ActivityAccordion
                      title="Latest Training Run"
                      icon={Play}
                      content={runs.length > 0 ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${runs[0].status === 'running' ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`} />
                            <span className="text-sm text-zinc-300">
                              {runs[0].status === 'running' ? 'Active Session' : 'Last run completed'}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500">
                              {runs[0].startTime?.seconds ? new Date(runs[0].startTime.seconds * 1000).toLocaleString() : 'Just now'}
                            </span>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => setSelectedRunId(runs[0].id)} className="text-xs text-indigo-400">View Details</Button>
                        </div>
                      ) : "No runs recorded."}
                    />

                    {/* Latest Mutation Accordion */}
                    <ActivityAccordion
                      title="Latest Mutation"
                      icon={GitFork}
                      content={mutations.length > 0 ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <GitBranch className="w-4 h-4 text-purple-400" />
                            <span className="text-sm text-zinc-300">{mutations[0].description}</span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {mutations[0].timestamp?.seconds ? new Date(mutations[0].timestamp.seconds * 1000).toLocaleString() : 'Just now'}
                          </span>
                        </div>
                      ) : "No mutations recorded."}
                    />

                    {/* Latest Version Accordion */}
                    <ActivityAccordion
                      title="Latest Snapshot"
                      icon={Save}
                      content={versions.length > 0 ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px] font-bold text-white border border-zinc-700">v{versions[0].versionNumber}</div>
                            <span className="text-sm text-zinc-300">{versions[0].description}</span>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => setActiveTab('activity')} className="text-xs text-indigo-400">Manage Versions</Button>
                        </div>
                      ) : "No versions recorded."}
                    />
                  </div>
                </div>

                {/* Mindex Grounding */}
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
                        <Server className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Mindex Intelligence Grounding</h3>
                        <p className="text-zinc-500 text-sm">Global stream integration for non-local intelligence.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Live Sync</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-zinc-500 uppercase">Global Stream Weight</span>
                        <span className="text-white">42%</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-indigo-500"
                          initial={{ width: 0 }}
                          animate={{ width: '42%' }}
                        />
                      </div>
                      <p className="text-[10px] text-zinc-500 leading-relaxed italic">
                        The model is currently prioritizing global scraping data for architectural refinement.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Mindex Entries</span>
                        <span className="text-xl font-mono text-white">{mindexLoading ? '...' : mindexData.length}</span>
                      </div>
                      <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Source Diversity</span>
                        <span className="text-xl font-mono text-white">{mindexData.length > 100 ? 'High' : 'Moderate'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'cognition' && (
              <motion.div
                key="cognition"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-[800px]"
              >
                <StateGraphConsole userId={model.ownerId || 'default'} modelId={model.id} />
              </motion.div>
            )}

            {activeTab === 'mindex' && (
              <motion.div
                key="mindex"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                        <Server className="w-6 h-6 text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white">Intelligence Grounding</h3>
                        <p className="text-zinc-500 text-sm">Configure how the model interacts with the global Mindex stream.</p>
                      </div>
                    </div>
                    <Button className="bg-white text-black hover:bg-zinc-200 font-bold">
                      Sync Mindex Root
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="p-6 bg-zinc-950/50 border border-zinc-800 rounded-2xl space-y-4">
                        <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Grounding Weights</h4>
                        <div className="space-y-6">
                          <WeightSlider label="Global Scraping" value={42} color="bg-indigo-500" />
                          <WeightSlider label="Device Telemetry" value={28} color="bg-emerald-500" />
                          <WeightSlider label="Local Sensory" value={30} color="bg-amber-500" />
                        </div>
                      </div>

                      <div className="p-6 bg-zinc-950/50 border border-zinc-800 rounded-2xl space-y-4">
                        <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Ingestion Policy</h4>
                        <div className="space-y-3">
                          <PolicyToggle label="Auto-Ingest New Streams" enabled={true} />
                          <PolicyToggle label="Merkle-Index Verification" enabled={true} />
                          <PolicyToggle label="Cross-Source Validation" enabled={false} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
                        <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Stream Activity</h4>
                        <div className="h-[300px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={mindexStreamData}>
                              <defs>
                                <linearGradient id="colorMindex" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                              <XAxis dataKey="time" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                              <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                                itemStyle={{ color: '#fff' }}
                              />
                              <Area type="monotone" dataKey="val" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorMindex)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'training-config' && (
              <motion.div
                key="training-config"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Training Configuration */}
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white">Training Configuration</h3>
                      <p className="text-zinc-500 text-sm">Fine-tune the Nature Learning Model parameters.</p>
                    </div>
                    <Button
                      onClick={handleSaveConfig}
                      disabled={isSavingConfig || learningRate <= 0 || batchSize <= 0 || epochs <= 0}
                      className="bg-white text-black hover:bg-zinc-200 font-bold"
                    >
                      {isSavingConfig ? 'Saving...' : 'Save Configuration'}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Learning Rate</label>
                        {learningRate <= 0 && <span className="text-[10px] text-red-500 font-bold">Must be &gt; 0</span>}
                      </div>
                      <input
                        type="number"
                        step="0.0001"
                        value={learningRate}
                        onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                        className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/10 transition-all ${learningRate <= 0 ? 'border-red-500/50' : 'border-zinc-800'}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Batch Size</label>
                        {batchSize <= 0 && <span className="text-[10px] text-red-500 font-bold">Must be &gt; 0</span>}
                      </div>
                      <input
                        type="number"
                        value={batchSize}
                        onChange={(e) => setBatchSize(parseInt(e.target.value))}
                        className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/10 transition-all ${batchSize <= 0 ? 'border-red-500/50' : 'border-zinc-800'}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Epochs</label>
                        {epochs <= 0 && <span className="text-[10px] text-red-500 font-bold">Must be &gt; 0</span>}
                      </div>
                      <input
                        type="number"
                        value={epochs}
                        onChange={(e) => setEpochs(parseInt(e.target.value))}
                        className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/10 transition-all ${epochs <= 0 ? 'border-red-500/50' : 'border-zinc-800'}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Sensory Thresholds Configuration */}
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700">
                        <Gauge className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Sensory Thresholds</h3>
                        <p className="text-zinc-500 text-sm">Configure individual sensor thresholds for the 6 learned streams.</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {sensors.map((sensor) => (
                      <div key={sensor.id} className="space-y-2 p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block truncate" title={sensor.name}>
                          {sensor.id}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.01"
                          value={sensor.threshold}
                          onChange={(e) => handleUpdateSensorThreshold(sensor.id, parseFloat(e.target.value) || 0)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500/50"
                        />
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={sensor.threshold}
                          onChange={(e) => handleUpdateSensorThreshold(sensor.id, parseFloat(e.target.value))}
                          className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Loss Chart */}
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-6 md:p-8 space-y-6 flex flex-col min-h-[400px]">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-white">Training Loss</h3>
                        <p className="text-zinc-500 text-sm">Real-time convergence metrics.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-xs text-zinc-400 font-mono">LOSS</span>
                      </div>
                    </div>
                    <div className="flex-1 w-full min-h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trainingData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis dataKey="step" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                          <Tooltip content={<CustomTooltip />} />
                          <Line
                            type="monotone"
                            dataKey="loss"
                            stroke="#ef4444"
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={true}
                            animationDuration={300}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Accuracy Chart */}
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-6 md:p-8 space-y-6 flex flex-col min-h-[400px]">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-white">Training Accuracy</h3>
                        <p className="text-zinc-500 text-sm">Model grounding and precision evolution.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        <span className="text-xs text-zinc-400 font-mono">ACCURACY</span>
                      </div>
                    </div>
                    <div className="flex-1 w-full min-h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trainingData}>
                          <defs>
                            <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis dataKey="step" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} domain={[0, 1]} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorAcc)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'recursive-training' && (
              <motion.div
                key="recursive-training"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Recursive Training Configuration */}
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700">
                        <RotateCcw className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Recursive Training</h3>
                        <p className="text-zinc-500 text-sm">Manage the depth and cyclical nature of neural processing.</p>
                      </div>
                    </div>
                    <Button
                      onClick={handleSaveConfig}
                      disabled={isSavingConfig || recursionDepth <= 0 || backpropThreshold < 0 || backpropThreshold > 1}
                      className="bg-white text-black hover:bg-zinc-200 font-bold"
                    >
                      {isSavingConfig ? 'Saving...' : 'Save Configuration'}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Recursion Depth</label>
                        {recursionDepth <= 0 && <span className="text-[10px] text-red-500 font-bold">Must be &gt; 0</span>}
                      </div>
                      <input
                        type="number"
                        value={recursionDepth}
                        onChange={(e) => setRecursionDepth(parseInt(e.target.value))}
                        className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/10 transition-all ${recursionDepth <= 0 ? 'border-red-500/50' : 'border-zinc-800'}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Backprop Threshold</label>
                        {(backpropThreshold < 0 || backpropThreshold > 1) && <span className="text-[10px] text-red-500 font-bold">Must be 0-1</span>}
                      </div>
                      <input
                        type="number"
                        step="0.001"
                        value={backpropThreshold}
                        onChange={(e) => setBackpropThreshold(parseFloat(e.target.value))}
                        className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/10 transition-all ${backpropThreshold < 0 || backpropThreshold > 1 ? 'border-red-500/50' : 'border-zinc-800'}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cyclical Learning</label>
                      <div className="flex items-center gap-3 h-12">
                        <button
                          onClick={() => setCyclicalLearning(!cyclicalLearning)}
                          className={`relative w-12 h-6 rounded-full transition-all duration-300 ${cyclicalLearning ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]' : 'bg-zinc-800'}`}
                        >
                          <motion.div
                            initial={false}
                            animate={{ x: cyclicalLearning ? 26 : 4 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                          />
                        </button>
                        <span className={`text-sm font-medium transition-colors ${cyclicalLearning ? 'text-indigo-400' : 'text-zinc-500'}`}>
                          {cyclicalLearning ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'judgments' && (
              <motion.div
                key="judgments"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700">
                        <Shield className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">AVANI Judgments</h3>
                        <p className="text-zinc-500 text-sm">Automated Validation and Neural Integrity assessments.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {judgments.length === 0 ? (
                      <div className="p-12 text-center border border-dashed border-zinc-800 rounded-2xl">
                        <Shield className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                        <p className="text-zinc-500">No integrity judgments recorded yet.</p>
                      </div>
                    ) : (
                      judgments.map((j) => (
                        <div key={j.id} className="p-6 bg-zinc-950/50 border border-zinc-800 rounded-2xl space-y-4 hover:border-zinc-700 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${j.status === 'pass' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              <h4 className="text-white font-bold">{j.title || 'Integrity Check'}</h4>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${j.status === 'pass' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                              {j.status}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-400 leading-relaxed">{j.reason || 'No detailed reason provided.'}</p>
                          <div className="flex items-center gap-4 text-[10px] text-zinc-500 font-mono">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {j.timestamp?.seconds ? new Date(j.timestamp.seconds * 1000).toLocaleString() : 'Just now'}
                            </span>
                            <span>SCORE: {(j.score * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'mutation' && (
              <motion.div
                key="mutation"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                        <Zap className="w-6 h-6 text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white">Systematic Mutation Exploration</h3>
                        <p className="text-zinc-500 text-sm">Automate the generation of architectural variants for hyper-parameter search.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const name = prompt('Enter name for this mutation strategy:');
                          if (name) {
                            addDoc(collection(db, 'mutation_recipes'), {
                              name,
                              type: 'hybrid',
                              mutationRate,
                              targetLayers: targetLayers.split(',').map((l: string) => l.trim()),
                              ownerId: userId, // Use current user ID
                              createdAt: serverTimestamp()
                            });
                          }
                        }}
                        className="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save Recipe
                      </Button>
                      <Button
                        onClick={handleMutate}
                        disabled={model.status === 'mutating'}
                        className="bg-white text-black hover:bg-zinc-200 rounded-xl h-12 px-6 font-bold"
                      >
                        {model.status === 'mutating' ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        {model.status === 'mutating' ? 'Mutating Architecture...' : 'Trigger Systematic Mutation'}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Mutation Strategy</label>
                          <select
                            value={selectedStrategy}
                            onChange={(e) => setSelectedStrategy(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/10 transition-all text-sm appearance-none"
                          >
                            <option>Default (Random Weight Perturbation)</option>
                            <option>Evolutionary Crossover (Lineage-based)</option>
                            <option>Sparsification (Aggressive Pruning)</option>
                            <option>Entropy Expansion (Dimensionality Growth)</option>
                            {recipes.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Mutation Rate</label>
                            <span className="text-xs font-mono text-indigo-400">{(mutationRate * 100).toFixed(1)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="0.5"
                            step="0.01"
                            value={mutationRate}
                            onChange={(e) => setMutationRate(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Target Layers / Cognitive Regions</label>
                        <input
                          type="text"
                          value={targetLayers}
                          onChange={(e) => setTargetLayers(e.target.value)}
                          placeholder="e.g. 1, 4, 8, 12, world_state, action_mapping"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/10 transition-all font-mono text-sm"
                        />
                        <p className="text-[10px] text-zinc-600 italic">Target specific indices or cross-modal binding regions for genetic variation.</p>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MutationControl label="Recursion Depth" value={recursionDepth.toString()} />
                        <MutationControl label="Stream Fusion" value="Enabled" />
                        <MutationControl label="Graph Sparsity" value="0.85" />
                        <MutationControl label="Entropy" value="0.12" />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="p-6 bg-zinc-950/50 border border-zinc-800 rounded-[32px] space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                          <History className="w-3 h-3" />
                          Saved Recipes
                        </div>
                        <div className="space-y-3">
                          {recipes.length === 0 ? (
                            <p className="text-xs text-zinc-600 italic">No saved recipes found. Save your current config as a recipe to reuse it.</p>
                          ) : (
                            recipes.map(r => (
                              <div key={r.id} className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl group hover:border-zinc-600 transition-colors">
                                <span className="text-xs text-zinc-300 font-medium">{r.name}</span>
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 group-hover:text-white"><Play className="w-3 h-3" /></Button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="p-6 bg-zinc-950/50 border border-zinc-800 rounded-[32px] space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                          <History className="w-3 h-3" />
                          Recent Mutations
                        </div>
                        <div className="space-y-3">
                          {mutations.slice(0, 5).map(m => (
                            <div key={m.id} className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-600 transition-colors">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{m.type}</span>
                                <span className="text-[9px] text-zinc-600 font-mono">
                                  {m.timestamp?.seconds ? new Date(m.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-400 line-clamp-2">{m.description}</p>
                            </div>
                          ))}
                          {mutations.length === 0 && <p className="text-xs text-zinc-600 italic text-center py-4">No recent mutations.</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Advice Section */}
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">AI Mutation Advice</h3>
                        <p className="text-zinc-500 text-sm">Gemini-driven suggestions for architectural evolution.</p>
                      </div>
                    </div>
                    <Button
                      onClick={fetchAiAdvice}
                      disabled={isAnalyzing}
                      variant="outline"
                      className="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
                    >
                      {isAnalyzing ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Wand2 className="w-4 h-4 mr-2" />
                      )}
                      {isAnalyzing ? 'Analyzing...' : 'Get Advice'}
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {aiAdvice.length === 0 ? (
                      <div className="p-12 text-center border border-dashed border-zinc-800 rounded-2xl">
                        <MessageSquare className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                        <p className="text-zinc-500">No advice generated yet. Click &quot;Get Advice&quot; to start.</p>
                      </div>
                    ) : (
                      aiAdvice.map((advice, index) => (
                        <div key={index} className="p-6 bg-zinc-950/50 border border-zinc-800 rounded-2xl space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-amber-500" />
                              <h4 className="text-white font-bold">{advice.type.toUpperCase()}</h4>
                            </div>
                            <span className="text-[10px] font-mono text-zinc-500">IMPACT: {advice.expectedImpact}</span>
                          </div>
                          <p className="text-sm text-zinc-400 leading-relaxed">{advice.description}</p>
                          <Button
                            onClick={() => applyAdviceMutation(advice, index)}
                            disabled={isApplyingMutation !== null}
                            className="w-full bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20 font-bold"
                          >
                            {isApplyingMutation === index ? 'Applying...' : 'Apply This Mutation'}
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'activity' && (
              <motion.div
                key="activity"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-white">Model Activity & History</h3>
                      <p className="text-zinc-500 text-sm">Comprehensive log of training runs, mutations, and snapshots.</p>
                    </div>
                  </div>

                  {/* Sub-tabs */}
                  <div className="flex items-center gap-4 border-b border-zinc-800 pb-4">
                    {[
                      { id: 'runs', label: 'Training Runs', icon: Play },
                      { id: 'mutations', label: 'Mutations', icon: GitFork },
                      { id: 'versions', label: 'Versions', icon: Save },
                    ].map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => setActivitySubTab(sub.id as any)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          activitySubTab === sub.id
                            ? 'bg-zinc-800 text-white'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        <sub.icon className="w-3.5 h-3.5" />
                        {sub.label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4">
                    {activitySubTab === 'runs' && (
                      <div className="space-y-4">
                        {runs.length === 0 ? (
                          <div className="p-12 text-center border border-dashed border-zinc-800 rounded-2xl">
                            <Play className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                            <p className="text-zinc-500">No training runs recorded yet.</p>
                          </div>
                        ) : (
                          runs.map((run: any) => (
                            <div key={run.id} className="p-6 bg-zinc-950/50 border border-zinc-800 rounded-2xl flex items-center justify-between group hover:border-zinc-700 transition-colors">
                              <div className="flex items-center gap-6">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                                  run.status === 'running' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                  run.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                  'bg-zinc-800 border-zinc-700 text-zinc-400'
                                }`}>
                                  {run.status === 'running' ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6" />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-3">
                                    <h4 className="text-white font-bold">
                                      {run.status === 'running' ? 'Active Session' : 'Completed Training Run'}
                                    </h4>
                                    <span className={`px-2 py-0.5 rounded-[4px] text-[8px] font-mono font-bold uppercase tracking-widest ${
                                      run.status === 'running' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                      run.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                      'bg-zinc-800 text-zinc-500 border border-zinc-700'
                                    }`}>
                                      {run.status}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {run.startTime?.seconds ? new Date(run.startTime.seconds * 1000).toLocaleString() : 'Just now'}
                                    </span>
                                    {run.metrics?.accuracy && (
                                      <>
                                        <span>•</span>
                                        <span className="text-emerald-500 font-mono">{(run.metrics.accuracy * 100).toFixed(1)}% Acc</span>
                                      </>
                                    )}
                                    {run.hyperparameters?.learningRate && (
                                      <>
                                        <span>•</span>
                                        <span className="font-mono text-[10px]">LR: {run.hyperparameters.learningRate}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                onClick={() => setSelectedRunId(run.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl"
                              >
                                <ChevronRight className="w-5 h-5" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {activitySubTab === 'mutations' && (
                      <div className="space-y-4">
                        {mutations.length === 0 ? (
                          <div className="p-12 text-center border border-dashed border-zinc-800 rounded-2xl">
                            <GitFork className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                            <p className="text-zinc-500">No mutations recorded yet.</p>
                          </div>
                        ) : (
                          mutations.map((log: any, i: number) => (
                            <div key={log.id || i} className="flex items-center justify-between p-6 bg-zinc-950/50 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800">
                                  <GitBranch className="w-6 h-6 text-zinc-400" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-sm text-zinc-200 font-bold">{log.description}</span>
                                    {log.type && (
                                      <span className="px-1.5 py-0.5 bg-zinc-800 text-[10px] font-mono text-zinc-500 rounded border border-zinc-700 uppercase tracking-wider">
                                        {log.type}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                                    <Clock className="w-3 h-3" />
                                    {log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'Just now'}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-tighter">ID: {log.id?.slice(0, 8) || 'PENDING'}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {activitySubTab === 'versions' && (
                      <div className="space-y-4">
                        {versions.length === 0 ? (
                          <div className="p-12 text-center border border-dashed border-zinc-800 rounded-2xl">
                            <History className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                            <p className="text-zinc-500">No versions recorded yet.</p>
                          </div>
                        ) : (
                          versions.map((v) => (
                            <div key={v.id} className="p-6 bg-zinc-950/50 border border-zinc-800 rounded-2xl flex items-center justify-between group hover:border-zinc-700 transition-colors">
                              <div className="flex items-center gap-6">
                                <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800 text-lg font-bold text-white">
                                  v{v.versionNumber}
                                </div>
                                <div>
                                  <h4 className="text-white font-bold">{v.description}</h4>
                                  <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {v.createdAt?.seconds ? new Date(v.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                                    </span>
                                    <span>•</span>
                                    <span className="font-mono">{v.architectureId}</span>
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                onClick={() => handleRevertVersion(v)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400 hover:text-indigo-300 hover:bg-indigo-400/10 rounded-xl"
                              >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Revert
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'cognition' && (
              <motion.div
                key="cognition"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-white">Synaptic Topology</h3>
                      <p className="text-zinc-500 text-sm">Real-time visualization of NLM neurons and connection weights.</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Active Neurons</p>
                        <p className="text-lg font-mono text-white">1,402,840</p>
                      </div>
                      <div className="h-8 w-px bg-zinc-800" />
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Dense Synapses</p>
                        <p className="text-lg font-mono text-emerald-400">12.4B</p>
                      </div>
                    </div>
                  </div>

                  <NeuralNetworkViz isTraining={isTraining} />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-zinc-950/50 border border-zinc-800 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Weight Distribution</h4>
                        <Gauge className="w-4 h-4 text-zinc-600" />
                      </div>
                      <div className="h-24 flex items-end gap-1 px-1">
                        {[40, 60, 30, 80, 50, 90, 70, 45, 65, 85, 35, 55].map((h, i) => (
                          <div
                            key={i}
                            style={{ height: `${h}%` }}
                            className="bg-zinc-800 hover:bg-emerald-500 transition-colors rounded-t-sm flex-1"
                          />
                        ))}
                      </div>
                      <div className="flex justify-between text-[8px] font-mono text-zinc-600">
                        <span>-3.2</span>
                        <span>0</span>
                        <span>+3.2</span>
                      </div>
                    </div>

                    <div className="p-6 bg-zinc-950/50 border border-zinc-800 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Latent Entanglement</h4>
                        <Activity className="w-4 h-4 text-zinc-600" />
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-zinc-500">Cross-Correlation</span>
                          <span className="text-white font-mono">0.82</span>
                        </div>
                        <div className="w-full bg-zinc-900 h-1 rounded-full">
                          <div className="bg-emerald-500 h-full w-[82%] rounded-full" />
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-zinc-500">Mutual Info</span>
                          <span className="text-white font-mono">1.45 bit</span>
                        </div>
                        <div className="w-full bg-zinc-900 h-1 rounded-full">
                          <div className="bg-sky-500 h-full w-[65%] rounded-full" />
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-zinc-950/50 border border-zinc-800 rounded-2xl space-y-4">
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Gradient Health</h4>
                      <div className="flex items-center justify-center h-24">
                        <div className="relative">
                          <div className="w-20 h-20 rounded-full border-4 border-zinc-800 flex items-center justify-center">
                            <span className="text-xl font-bold text-white">99%</span>
                          </div>
                          <svg className="absolute inset-0 w-20 h-20 -rotate-90">
                            <circle
                              cx="40" cy="40" r="38"
                              fill="transparent"
                              stroke="#10b981"
                              strokeWidth="4"
                              strokeDasharray="239"
                              strokeDashoffset="2.4"
                              className="transition-all duration-1000"
                            />
                          </svg>
                        </div>
                      </div>
                      <p className="text-[10px] text-center text-zinc-500">Signal Integrity Stable</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'recursive-training' && (
              <motion.div
                key="recursive"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-white">Recursive Feedback Control</h3>
                      <p className="text-zinc-500 text-sm">Configure how the model learns from its own outputs.</p>
                    </div>
                    <Button
                      onClick={handleSaveConfig}
                      className="bg-white text-black hover:bg-zinc-200 rounded-xl px-6 h-12 font-bold"
                    >
                      Apply Parameters
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="p-6 bg-zinc-950/50 border border-zinc-800 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Recursion Depth</label>
                          <span className="text-sm font-mono text-emerald-400">{recursionDepth} levels</span>
                        </div>
                        <input
                          type="range" min="1" max="10"
                          value={recursionDepth}
                          onChange={e => setRecursionDepth(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                        <p className="text-[10px] text-zinc-600 leading-relaxed italic">
                          Determines how many times a sample is passed back through the attention layers for self-refinement.
                        </p>
                      </div>

                      <div className="p-6 bg-zinc-950/50 border border-zinc-800 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cyclical Learning</label>
                          <button
                            onClick={() => setCyclicalLearning(!cyclicalLearning)}
                            className={`w-12 h-6 rounded-full transition-all relative ${cyclicalLearning ? 'bg-emerald-500' : 'bg-zinc-800'}`}
                          >
                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${cyclicalLearning ? 'translate-x-6' : ''}`} />
                          </button>
                        </div>
                        <p className="text-[10px] text-zinc-400">
                          Periodically resets learning rate to escape local minima during the self-play phases.
                        </p>
                      </div>
                    </div>

                    <div className="p-8 bg-zinc-950/50 border border-zinc-800 rounded-2xl relative overflow-hidden flex flex-col justify-center">
                      <div className="absolute top-0 right-0 p-8 opacity-5">
                        <RotateCcw className="w-32 h-32 text-white" />
                      </div>
                      <div className="relative z-10 space-y-6">
                        <h4 className="text-lg font-bold text-white">Self-Knowledge Persistence</h4>
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
                              <Database className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-zinc-300">Memory Buffer</p>
                              <p className="text-[10px] text-zinc-500 uppercase">2.4 TB Grounded Weights</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                              <Cpu className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-zinc-300">Persistent Weights</p>
                              <p className="text-[10px] text-zinc-500 uppercase">Enabled (NatureOS FS)</p>
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" className="border-zinc-800 text-zinc-500 hover:text-white w-full rounded-xl">
                          Export Synaptic Map (.nlm)
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'sensors' && (
              <motion.div
                key="sensors"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                        <Gauge className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white">Sensor Configuration</h3>
                        <p className="text-zinc-500 text-sm">Monitor and configure sensory thresholds for model grounding.</p>
                      </div>
                    </div>
                    <Button
                      onClick={handleSaveConfig}
                      disabled={isSavingConfig}
                      className="bg-white text-black hover:bg-zinc-200 rounded-xl h-12 px-6 font-bold"
                    >
                      {isSavingConfig ? 'Saving...' : 'Save Configuration'}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {sensors.map((sensor) => (
                      <div key={sensor.id} className="p-6 bg-zinc-950/50 border border-zinc-800 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${sensor.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-700'}`} />
                            <h4 className="text-white font-bold">{sensor.name}</h4>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${sensor.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}`}>
                            {sensor.status}
                          </span>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Threshold</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max="1"
                                step="0.01"
                                value={sensor.threshold}
                                onChange={(e) => handleUpdateSensorThreshold(sensor.id, parseFloat(e.target.value) || 0)}
                                className="w-16 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500/50"
                              />
                              <span className="text-[10px] font-mono text-zinc-600">({(sensor.threshold * 100).toFixed(0)}%)</span>
                            </div>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={sensor.threshold}
                            onChange={(e) => handleUpdateSensorThreshold(sensor.id, parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                          />
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Current Activity</span>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map(i => (
                                <div
                                  key={i}
                                  className={`w-1 h-3 rounded-full ${i/5 <= sensor.current ? 'bg-emerald-500' : 'bg-zinc-800'}`}
                                />
                              ))}
                            </div>
                          </div>
                          <span className="text-xs font-mono text-zinc-400">{(sensor.current * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
                      <Zap className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Sensor-Triggered Actions</h3>
                      <p className="text-zinc-500 text-sm">Automated model adjustments based on sensory threshold breaches.</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-y-2">
                      <thead>
                        <tr className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                          <th className="px-4 py-2">Action Type</th>
                          <th className="px-4 py-2">Sensor Triggered</th>
                          <th className="px-4 py-2">Impact</th>
                          <th className="px-4 py-2 text-right">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sensorActions.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-12 text-center border border-dashed border-zinc-800 rounded-2xl">
                              <Zap className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                              <p className="text-zinc-500">No sensor actions logged yet.</p>
                            </td>
                          </tr>
                        ) : (
                          sensorActions.map((action) => (
                            <tr key={action.id} className="group hover:bg-zinc-900/50 transition-colors">
                              <td className="px-4 py-4 bg-zinc-950/50 rounded-l-2xl border-y border-l border-zinc-800 group-hover:border-zinc-700">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800">
                                    <Activity className="w-4 h-4 text-zinc-400" />
                                  </div>
                                  <span className="text-sm text-zinc-200 font-bold">{action.action}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4 bg-zinc-950/50 border-y border-zinc-800 group-hover:border-zinc-700">
                                <span className="text-xs text-zinc-400">{action.sensor}</span>
                              </td>
                              <td className="px-4 py-4 bg-zinc-950/50 border-y border-zinc-800 group-hover:border-zinc-700">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  action.impact === 'High' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                  action.impact === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}>
                                  {action.impact}
                                </span>
                              </td>
                              <td className="px-4 py-4 bg-zinc-950/50 rounded-r-2xl border-y border-r border-zinc-800 group-hover:border-zinc-700 text-right">
                                <div className="flex items-center justify-end gap-2 text-[10px] text-zinc-500">
                                  <Clock className="w-3 h-3" />
                                  {action.timestamp.toLocaleTimeString()}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
        {/* Right Column: Sidebar Info */}
        <div className="space-y-8">
          {/* Training Status */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 space-y-6">
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Operational Awareness</h4>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Grounding Score</span>
                <span className="text-sm font-bold text-emerald-500">{(model.accuracy * 100 || 98.2).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <motion.div
                   initial={{ width: 0 }}
                   animate={{ width: `${model.accuracy * 100 || 98.2}%` }}
                   className="h-full bg-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Ecological Impact</span>
                <span className="text-sm font-bold text-sky-500">{model.ecologicalImpact || '0.08'}</span>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(model.ecologicalImpact || 0.08) * 100}%` }}
                  className="h-full bg-sky-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-zinc-400">Training Progress</span>
                <span className="text-sm font-bold text-indigo-400">{trainingProgress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${trainingProgress}%` }}
                  transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                  className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]"
                />
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <Button
                onClick={handleCommitFrame}
                variant="outline"
                className="w-full justify-start h-11 border-zinc-800 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"
              >
                <GitCommit className="w-4 h-4 mr-3" />
                Commit Cognitive Frame
              </Button>
              <Button variant="outline" className="w-full justify-start h-11 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800">
                <Shield className="w-4 h-4 mr-3" />
                AVANI Audit
              </Button>
              <Button variant="outline" className="w-full justify-start h-11 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800">
                <Database className="w-4 h-4 mr-3" />
                MINDEX Provenance
              </Button>
              <Button variant="outline" className="w-full justify-start h-11 border-zinc-800 text-red-400 hover:text-red-300 hover:bg-red-400/10">
                <Trash2 className="w-4 h-4 mr-3" />
                Retire Model
              </Button>
            </div>
          </div>

          {/* Recent Runs */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 space-y-6">
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Recent Runs</h4>
            <div className="space-y-4">
              {runs.length === 0 ? (
                <p className="text-zinc-600 text-sm">No training history available.</p>
              ) : (
                runs.map((run: any) => (
                  <div
                    key={run.id}
                    onClick={() => setSelectedRunId(run.id)}
                    className="flex items-center justify-between group cursor-pointer hover:bg-zinc-800/50 p-2 -mx-2 rounded-xl transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${run.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-zinc-700'}`} />
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{run.status === 'running' ? 'Current Session' : 'Completed Run'}</p>
                        <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-tighter">
                          {run.startTime?.seconds ? new Date(run.startTime.seconds * 1000).toLocaleDateString() : 'Just now'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      <AnimatePresence>
        {selectedRunId && (
          <TrainingRunDetail
            runId={selectedRunId}
            onClose={() => setSelectedRunId(null)}
          />
        )}
      </AnimatePresence>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showSaveConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSaveConfirm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
                  <AlertCircle className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Confirm Changes</h3>
                  <p className="text-zinc-500 text-sm">Are you sure you want to update the model configuration?</p>
                </div>
              </div>

              <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Learning Rate</span>
                  <span className="text-white font-mono">{learningRate}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Batch Size</span>
                  <span className="text-white font-mono">{batchSize}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Epochs</span>
                  <span className="text-white font-mono">{epochs}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Recursion Depth</span>
                  <span className="text-white font-mono">{recursionDepth}</span>
                </div>
                <div className="pt-2 border-t border-zinc-900 mt-2">
                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-2">Sensor Thresholds</span>
                  <div className="grid grid-cols-2 gap-2">
                    {sensors.map(s => (
                      <div key={s.id} className="flex justify-between text-[10px]">
                        <span className="text-zinc-500">{s.name.split(' ')[0]}</span>
                        <span className="text-emerald-500 font-mono">{s.threshold.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowSaveConfirm(false)}
                  className="flex-1 rounded-2xl h-12 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmSaveConfig}
                  className="flex-1 bg-white text-black hover:bg-zinc-200 rounded-2xl h-12 font-bold"
                >
                  Confirm & Save
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, trend }: { label: string, value: string, trend: string }) {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-6 space-y-2">
      <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{label}</span>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-bold text-white">{value}</span>
        <span className={`text-xs font-bold ${trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
          {trend}
        </span>
      </div>
    </div>
  );
}

function MutationControl({ label, value }: { label: string, value: string }) {
  return (
    <div className="bg-zinc-950/50 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
      <span className="text-xs text-zinc-500 font-medium">{label}</span>
      <span className="text-sm font-bold text-zinc-200 font-mono">{value}</span>
    </div>
  );
}

function LayoutDashboardIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

function WeightSlider({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{label}</span>
        <span className="text-sm font-mono text-white font-bold">{value}%</span>
      </div>
      <div className="h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
        <motion.div
          className={`h-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function PolicyToggle({ label, enabled }: { label: string, enabled: boolean }) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  return (
    <div className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
      <span className="text-xs font-medium text-zinc-300">{label}</span>
      <button
        onClick={() => setIsEnabled(!isEnabled)}
        className={`relative w-10 h-5 rounded-full transition-all duration-300 ${isEnabled ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-zinc-800'}`}
      >
        <motion.div
          initial={false}
          animate={{ x: isEnabled ? 22 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
        />
      </button>
    </div>
  );
}

function ActivityAccordion({ title, icon: Icon, content }: { title: string, icon: any, content: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950/30">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-zinc-500" />
          <span className="text-sm font-bold text-zinc-300">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-600" /> : <ChevronDown className="w-4 h-4 text-zinc-600" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 border-t border-zinc-900/50 text-zinc-400">
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
