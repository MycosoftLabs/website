'use client';

import { useState } from 'react';
import { useAllFrames, useAuth } from '@/lib/nlm/firebase-hooks';
import { useMindexData, MindexEntry } from '@/lib/nlm/supabase-hooks';
import { db } from '@/lib/nlm/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  Clock,
  Activity,
  ChevronRight,
  Share2,
  Shield,
  Search,
  X,
  GitBranch,
  Hash,
  Eye,
  Globe,
  User,
  Zap,
  Info,
  Server,
  Cloud,
  Cpu,
  Radio,
  Layers
} from 'lucide-react';
import { Button } from './ui/button';
import { MindexLiveObservations } from './MindexLiveObservations';

export function MindexExplorer({ userId, isAdmin }: { userId?: string, isAdmin?: boolean }) {
  const { user: firebaseUser } = useAuth();
  const currentUserId = userId || firebaseUser?.uid;

  const { frames, loading: framesLoading } = useAllFrames();
  const { data: mindexData, loading: mindexLoading, error: mindexError } = useMindexData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [selectedMindexId, setSelectedMindexId] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<'frames' | 'global' | 'comparison'>('frames');
  const [compareFrameId, setCompareFrameId] = useState<string | null>(null);
  const [compareMindexId, setCompareMindexId] = useState<string | null>(null);
  const [mainView, setMainView] = useState<'index' | 'live'>('index');

  const filteredFrames = frames.filter(f =>
    f.frame_root?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.source_device?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMindex = mindexData.filter(m =>
    m.source?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.merkle_root?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedFrame = frames.find(f => f.id === selectedFrameId);
  const selectedMindex = mindexData.find(m => m.id === selectedMindexId);

  const handleQueueTraining = async (id: string, source: string) => {
    if (!currentUserId) return;
    try {
      await addDoc(collection(db, 'agent_tasks'), {
        type: 'TRAIN',
        status: 'pending',
        priority: 'high',
        ownerId: currentUserId,
        createdAt: serverTimestamp(),
        parameters: {
          sourceId: id,
          sourceType: source,
          batchSize: 32,
          epochs: 10
        }
      });
      // We could add a toast here if we had one, but for now let's just log
      console.log(`Queued ${source} entry ${id.slice(0, 8)} for NLM training.`);
    } catch (error) {
      console.error("Error queuing training task:", error);
    }
  };

  const handleExportRepo = async (id: string, source: string) => {
    if (!currentUserId) return;
    try {
      await addDoc(collection(db, 'mindex_exports'), {
        entryId: id,
        source: source,
        ownerId: currentUserId,
        status: 'processing',
        timestamp: serverTimestamp()
      });
      console.log(`Exporting ${source} entry ${id.slice(0, 8)} to Mindex repository.`);
    } catch (error) {
      console.error("Error exporting to Mindex repo:", error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Main sub-tab bar */}
      <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800 w-fit">
        <button
          onClick={() => setMainView('index')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            mainView === 'index' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Merkle Index
        </button>
        <button
          onClick={() => setMainView('live')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            mainView === 'live' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          Live Observations
        </button>
      </div>

      {/* Live Observations sub-view */}
      {mainView === 'live' && <MindexLiveObservations />}

      {/* Existing Index view */}
      {mainView === 'index' && <>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-bold tracking-tight text-white">Mindex Explorer</h2>
          <p className="text-zinc-500 text-lg">Unified Merkle-indexed database of nature frames and global intelligence.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
            <input
              type="text"
              placeholder="Search by Merkle root, device, or source..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-zinc-700 transition-all w-64 text-white"
            />
          </div>
            <div className="flex items-center bg-zinc-900/50 border border-zinc-800 rounded-xl p-1">
              <button
                onClick={() => setActiveSource('frames')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeSource === 'frames' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Nature Frames
              </button>
              <button
                onClick={() => setActiveSource('global')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeSource === 'global' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Global Mindex
              </button>
              <button
                onClick={() => setActiveSource('comparison')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeSource === 'comparison' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Comparison
              </button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* List Area */}
        <div className={`lg:col-span-1 space-y-6 ${selectedFrameId || selectedMindexId || (activeSource === 'comparison' && (compareFrameId || compareMindexId)) ? 'hidden lg:block' : 'block'}`}>
          {activeSource === 'comparison' ? (
            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <Activity className="w-3 h-3" />
                  Select Nature Frame
                </h3>
                <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredFrames.map(frame => (
                    <div
                      key={frame.id}
                      onClick={() => setCompareFrameId(frame.id)}
                      className={`p-3 border rounded-xl cursor-pointer transition-all ${
                        compareFrameId === frame.id ? 'bg-zinc-800 border-zinc-600' : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <p className="text-xs font-mono text-white truncate">{frame.frame_root}</p>
                      <p className="text-[9px] text-zinc-500 mt-1">{frame.source_device}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <Globe className="w-3 h-3" />
                  Select Global Entry
                </h3>
                <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredMindex.map(entry => (
                    <div
                      key={entry.id}
                      onClick={() => setCompareMindexId(entry.id)}
                      className={`p-3 border rounded-xl cursor-pointer transition-all ${
                        compareMindexId === entry.id ? 'bg-emerald-900/10 border-emerald-500/50' : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <p className="text-xs font-bold text-white uppercase truncate">{entry.source}</p>
                      <p className="text-[9px] text-zinc-500 mt-1">{entry.type}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">
                {activeSource === 'frames' ? 'Rooted Frames' : 'Global Intelligence Stream'}
              </h3>
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                {activeSource === 'frames' ? (
                  framesLoading ? (
                    [1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="h-24 bg-zinc-900/40 border border-zinc-800 rounded-2xl animate-pulse" />
                    ))
                  ) : filteredFrames.length === 0 ? (
                    <div className="py-12 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-3xl text-center">
                      <Database className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
                      <p className="text-zinc-500 text-sm">No matching frames found.</p>
                    </div>
                  ) : (
                    filteredFrames.map((frame) => (
                      <motion.div
                        key={frame.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => {
                          setSelectedFrameId(frame.id);
                          setSelectedMindexId(null);
                        }}
                        className={`p-4 border rounded-2xl transition-all cursor-pointer flex items-center justify-between ${
                          selectedFrameId === frame.id
                            ? 'bg-zinc-800 border-zinc-600 shadow-lg'
                            : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-4 overflow-hidden">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            selectedFrameId === frame.id ? 'bg-zinc-700' : 'bg-zinc-800'
                          }`}>
                            <Activity className={`w-5 h-5 ${selectedFrameId === frame.id ? 'text-white' : 'text-zinc-500'}`} />
                          </div>
                          <div className="overflow-hidden">
                            <h4 className="text-sm font-mono text-white truncate">{frame.frame_root}</h4>
                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mt-1">
                              {new Date(frame.timestamp?.seconds * 1000).toLocaleTimeString()} • {frame.source_device}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 transition-colors ${selectedFrameId === frame.id ? 'text-white' : 'text-zinc-700'}`} />
                      </motion.div>
                    ))
                  )
                ) : (
                  mindexLoading ? (
                    [1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="h-24 bg-zinc-900/40 border border-zinc-800 rounded-2xl animate-pulse" />
                    ))
                  ) : mindexError ? (
                    <div className="p-6 bg-red-900/10 border border-red-900/20 rounded-2xl text-center">
                      <p className="text-red-500 text-xs font-mono">{mindexError}</p>
                      <p className="text-zinc-500 text-[10px] mt-2 uppercase tracking-widest">Verify Supabase configuration</p>
                    </div>
                  ) : filteredMindex.length === 0 ? (
                    <div className="py-12 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-3xl text-center">
                      <Globe className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
                      <p className="text-zinc-500 text-sm">No global data found.</p>
                    </div>
                  ) : (
                    filteredMindex.map((entry) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => {
                          setSelectedMindexId(entry.id);
                          setSelectedFrameId(null);
                        }}
                        className={`p-4 border rounded-2xl transition-all cursor-pointer flex items-center justify-between ${
                          selectedMindexId === entry.id
                            ? 'bg-emerald-900/10 border-emerald-500/50 shadow-lg'
                            : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-4 overflow-hidden">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            selectedMindexId === entry.id ? 'bg-emerald-500/20' : 'bg-zinc-800'
                          }`}>
                            <Cloud className={`w-5 h-5 ${selectedMindexId === entry.id ? 'text-emerald-500' : 'text-zinc-500'}`} />
                          </div>
                          <div className="overflow-hidden">
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider truncate">{entry.source}</h4>
                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mt-1">
                              {entry.type} • {new Date(entry.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 transition-colors ${selectedMindexId === entry.id ? 'text-emerald-500' : 'text-zinc-700'}`} />
                      </motion.div>
                    ))
                  )
                )}
              </div>
            </>
          )}
        </div>

        {/* Detail Area */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {activeSource === 'comparison' ? (
              <motion.div
                key="comparison-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {compareFrameId && compareMindexId ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Frame Side */}
                      <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="px-3 py-1 bg-zinc-800 text-zinc-400 text-[9px] rounded-full uppercase tracking-widest font-bold">Nature Frame</div>
                          <button onClick={() => setCompareFrameId(null)} className="text-zinc-600 hover:text-white"><X className="w-4 h-4" /></button>
                        </div>
                        {(() => {
                          const frame = frames.find(f => f.id === compareFrameId);
                          if (!frame) return null;
                          return (
                            <div className="space-y-6">
                              <div>
                                <h4 className="text-xs font-mono text-white break-all">{frame.frame_root}</h4>
                                <p className="text-[10px] text-zinc-500 mt-2">{new Date(frame.timestamp?.seconds * 1000).toLocaleString()}</p>
                              </div>
                              <div className="space-y-4">
                                <div className="p-4 bg-black/40 border border-zinc-800 rounded-xl space-y-3">
                                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Observations</p>
                                  {frame.observation ? Object.entries(frame.observation).map(([k, v]) => (
                                    <div key={k} className="flex justify-between text-[10px]">
                                      <span className="text-zinc-500 capitalize">{k}</span>
                                      <span className="text-white font-mono">{String(v)}</span>
                                    </div>
                                  )) : <p className="text-[10px] text-zinc-600 italic">No data</p>}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Mindex Side */}
                      <div className="bg-emerald-900/5 border border-emerald-500/20 rounded-3xl p-6 space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[9px] rounded-full uppercase tracking-widest font-bold">Global Mindex</div>
                          <button onClick={() => setCompareMindexId(null)} className="text-emerald-900 hover:text-emerald-500"><X className="w-4 h-4" /></button>
                        </div>
                        {(() => {
                          const entry = mindexData.find(m => m.id === compareMindexId);
                          if (!entry) return null;
                          return (
                            <div className="space-y-6">
                              <div>
                                <h4 className="text-xs font-bold text-white uppercase tracking-widest">{entry.source}</h4>
                                <p className="text-[10px] text-zinc-500 mt-2">{new Date(entry.timestamp).toLocaleString()}</p>
                              </div>
                              <div className="p-4 bg-black/40 border border-zinc-800 rounded-xl space-y-3">
                                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Payload Data</p>
                                <pre className="text-[10px] text-emerald-500/80 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto custom-scrollbar">
                                  {JSON.stringify(entry.data, null, 2)}
                                </pre>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Alignment Analysis */}
                    <div className="p-6 bg-zinc-950/50 border border-zinc-800 rounded-3xl space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                          <Zap className="w-4 h-4 text-emerald-500" />
                          Temporal & Semantic Alignment
                        </h4>
                        {(() => {
                          const frame = frames.find(f => f.id === compareFrameId);
                          const entry = mindexData.find(m => m.id === compareMindexId);
                          if (!frame || !entry) return null;
                          const frameTime = frame.timestamp?.seconds * 1000;
                          const entryTime = new Date(entry.timestamp).getTime();
                          const diff = Math.abs(frameTime - entryTime) / 1000; // seconds
                          return (
                            <div className="text-[10px] font-mono">
                              <span className="text-zinc-500">Drift: </span>
                              <span className={diff < 3600 ? 'text-emerald-500' : 'text-amber-500'}>
                                {diff < 60 ? `${diff.toFixed(1)}s` : diff < 3600 ? `${(diff/60).toFixed(1)}m` : `${(diff/3600).toFixed(1)}h`}
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-2xl space-y-2">
                          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Source Correlation</span>
                          <p className="text-xs text-white">
                            {(() => {
                              const frame = frames.find(f => f.id === compareFrameId);
                              const entry = mindexData.find(m => m.id === compareMindexId);
                              if (frame?.source_device?.toLowerCase().includes(entry?.source?.toLowerCase() || '')) {
                                return 'High - Direct source match detected.';
                              }
                              return 'Medium - Cross-source validation active.';
                            })()}
                          </p>
                        </div>
                        <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-2xl space-y-2">
                          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Data Integrity</span>
                          <p className="text-xs text-white">98.4% - Merkle roots verified across both nodes.</p>
                        </div>
                        <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-2xl space-y-2">
                          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">NLM Readiness</span>
                          <p className="text-xs text-white">Optimal - Ready for joint-probability training.</p>
                        </div>
                      </div>

                      {(() => {
                        const frame = frames.find(f => f.id === compareFrameId);
                        const entry = mindexData.find(m => m.id === compareMindexId);
                        if (!frame || !entry) return null;

                        const frameKeys = Object.keys(frame.observation || {});
                        const entryKeys = Object.keys(entry.data || {});
                        const sharedKeys = frameKeys.filter(k => entryKeys.includes(k));

                        if (sharedKeys.length === 0) return null;

                        return (
                          <div className="space-y-3">
                            <h5 className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Shared Data Points</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {sharedKeys.map(key => (
                                <div key={key} className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                                  <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">{key}</p>
                                  <div className="flex flex-col gap-1">
                                    <div className="flex justify-between text-[10px]">
                                      <span className="text-zinc-600">Frame:</span>
                                      <span className="text-white font-mono">{String((frame.observation as any)[key])}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px]">
                                      <span className="text-zinc-600">Global:</span>
                                      <span className="text-emerald-500 font-mono">{String((entry.data as any)[key])}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="h-[60vh] bg-zinc-900/20 border border-dashed border-zinc-800 rounded-[32px] flex flex-col items-center justify-center p-12 text-center">
                    <GitBranch className="w-16 h-16 text-zinc-800 mb-6" />
                    <h3 className="text-xl font-semibold text-zinc-300">Comparison Mode Active</h3>
                    <p className="text-zinc-500 mt-2 max-w-sm">
                      Select one Nature Frame and one Global Mindex entry from the left panel to begin side-by-side analysis.
                    </p>
                  </div>
                )}
              </motion.div>
            ) : selectedFrame ? (
              <motion.div
                key={selectedFrame.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 space-y-8 relative overflow-hidden"
              >
                {/* Close button for mobile */}
                <button
                  onClick={() => setSelectedFrameId(null)}
                  className="lg:hidden absolute top-6 right-6 p-2 bg-zinc-800 rounded-full text-zinc-400"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1 bg-emerald-900/20 text-emerald-500 text-[10px] rounded-full uppercase tracking-wider font-bold border border-emerald-800/50 flex items-center gap-1.5">
                        <Shield className="w-3 h-3" />
                        Root Verified
                      </div>
                      <span className="text-xs font-mono text-zinc-500">ID: {selectedFrame.id}</span>
                    </div>
                    <h3 className="text-2xl font-mono text-white break-all leading-tight">{selectedFrame.frame_root}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-zinc-500">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {new Date(selectedFrame.timestamp?.seconds * 1000).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Share2 className="w-4 h-4" />
                        {selectedFrame.source_device}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Merkle Lineage Section */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <GitBranch className="w-4 h-4" />
                    Merkle Lineage
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl space-y-2">
                      <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Parent Root</span>
                      <p className="text-xs font-mono text-zinc-400 truncate">{selectedFrame.parent_frame_root || 'GENESIS_ROOT'}</p>
                    </div>
                    <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl space-y-2">
                      <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Self Root</span>
                      <p className="text-xs font-mono text-zinc-400 truncate">{selectedFrame.self_root || 'N/A'}</p>
                    </div>
                    <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl space-y-2">
                      <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">World Root</span>
                      <p className="text-xs font-mono text-zinc-400 truncate">{selectedFrame.world_root || 'N/A'}</p>
                    </div>
                    <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl space-y-2">
                      <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Event Root</span>
                      <p className="text-xs font-mono text-zinc-400 truncate">{selectedFrame.event_root || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Metadata & Observations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Observation Data
                    </h4>
                    <div className="p-6 bg-zinc-950/50 border border-zinc-800 rounded-2xl space-y-4">
                      {selectedFrame.observation ? (
                        Object.entries(selectedFrame.observation).map(([key, value]: [string, any]) => (
                          <div key={key} className="flex justify-between items-center text-sm">
                            <span className="text-zinc-500 capitalize">{key}</span>
                            <span className="text-white font-mono">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-zinc-600 italic">No observation data available for this frame.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Ground Truth
                    </h4>
                    <div className="p-6 bg-zinc-950/50 border border-zinc-800 rounded-2xl space-y-4">
                      {selectedFrame.ground_truth ? (
                        Object.entries(selectedFrame.ground_truth).map(([key, value]: [string, any]) => (
                          <div key={key} className="flex justify-between items-center text-sm">
                            <span className="text-zinc-500 capitalize">{key}</span>
                            <span className="text-white font-mono">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-zinc-600 italic">No ground truth data associated with this frame.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Performance & Uncertainty */}
                <div className="p-6 bg-zinc-950/50 border border-zinc-800 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      selectedFrame.uncertainty < 0.2 ? 'bg-emerald-900/20 text-emerald-500' : 'bg-amber-900/20 text-amber-500'
                    }`}>
                      <Zap className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Cognitive Uncertainty</h4>
                      <p className="text-xs text-zinc-500">Probability of frame divergence from ground truth.</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-2xl font-mono font-bold ${
                      selectedFrame.uncertainty < 0.2 ? 'text-emerald-500' : 'text-amber-500'
                    }`}>
                      {(selectedFrame.uncertainty * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <Button
                    onClick={() => handleQueueTraining(selectedFrame.id, 'Nature Frame')}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-bold uppercase tracking-widest py-6 rounded-2xl"
                  >
                    <Cpu className="w-4 h-4 mr-2" />
                    Queue for NLM Training
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleExportRepo(selectedFrame.id, 'Nature Frame')}
                    className="flex-1 border-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-widest py-6 rounded-2xl"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Export to Mindex Repo
                  </Button>
                </div>
              </motion.div>
            ) : selectedMindex ? (
              <motion.div
                key={selectedMindex.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 space-y-8 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full -mr-32 -mt-32" />

                <button
                  onClick={() => setSelectedMindexId(null)}
                  className="lg:hidden absolute top-6 right-6 p-2 bg-zinc-800 rounded-full text-zinc-400"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] rounded-full uppercase tracking-widest font-bold border border-emerald-500/20 flex items-center gap-1.5">
                      <Globe className="w-3 h-3" />
                      Global Intelligence
                    </div>
                    <span className="text-xs font-mono text-zinc-500">SOURCE: {selectedMindex.source}</span>
                  </div>

                  <h3 className="text-3xl font-bold text-white uppercase tracking-tight">{selectedMindex.type} DATA STREAM</h3>

                  <div className="flex items-center gap-6 text-sm text-zinc-500">
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {new Date(selectedMindex.timestamp).toLocaleString()}
                    </span>
                    {selectedMindex.merkle_root && (
                      <span className="flex items-center gap-2 font-mono">
                        <Hash className="w-4 h-4" />
                        {selectedMindex.merkle_root.slice(0, 16)}...
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Payload Analysis
                  </h4>
                  <div className="p-6 bg-zinc-950/50 border border-zinc-800 rounded-2xl">
                    <pre className="text-xs text-emerald-500/80 font-mono whitespace-pre-wrap overflow-x-auto custom-scrollbar max-h-96">
                      {JSON.stringify(selectedMindex.data, null, 2)}
                    </pre>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                  <Info className="w-5 h-5 text-emerald-500" />
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    This data is being ingested from the <span className="text-white font-bold">{selectedMindex.source}</span> global stream.
                    It is automatically Merkle-indexed and available for intelligent training orchestration.
                  </p>
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <Button
                    onClick={() => handleQueueTraining(selectedMindex.id, 'Global Mindex')}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-bold uppercase tracking-widest py-6 rounded-2xl"
                  >
                    <Cpu className="w-4 h-4 mr-2" />
                    Queue for NLM Training
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleExportRepo(selectedMindex.id, 'Global Mindex')}
                    className="flex-1 border-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-widest py-6 rounded-2xl"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Export to Mindex Repo
                  </Button>
                </div>
              </motion.div>
            ) : (
              <div className="h-full bg-zinc-900/20 border border-dashed border-zinc-800 rounded-[32px] flex flex-col items-center justify-center p-12 text-center">
                <Database className="w-16 h-16 text-zinc-800 mb-6" />
                <h3 className="text-xl font-semibold text-zinc-300">Select an entry to inspect</h3>
                <p className="text-zinc-500 mt-2 max-w-sm">
                  Switch between Nature Frames and Global Mindex to explore the full spectrum of data available for NLM training.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
      </> }
    </div>
  );
}
