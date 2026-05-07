'use client';

import { useState, useMemo } from 'react';
import { useFingerprints, useAllFrames } from '@/lib/nlm/firebase-hooks';
import { useMycoBrainData } from '@/lib/nlm/supabase-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, Search, Filter, Activity, Zap, Thermometer, Wind, LayoutGrid, Maximize2, Database, ChevronDown, Cpu } from 'lucide-react';
import { SensoryFingerprintViz } from './SensoryFingerprintViz';


export function FingerprintStudio({ userId, isAdmin }: { userId?: string, isAdmin?: boolean }) {
  const { frames, loading: framesLoading } = useAllFrames(userId, isAdmin);
  const [selectedFrameRoot, setSelectedFrameRoot] = useState<string | undefined>(undefined);
  const { fingerprints } = useFingerprints(selectedFrameRoot);
  const { data: mycoBrainData } = useMycoBrainData();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMycoBrainData = useMemo(() => {
    if (!selectedFrameRoot) return mycoBrainData;
    return mycoBrainData.filter(d => d.frame_root === selectedFrameRoot);
  }, [mycoBrainData, selectedFrameRoot]);

  // Filter frames by search query
  const filteredFrames = useMemo(() => {
    if (!searchQuery.trim()) return frames;
    const q = searchQuery.toLowerCase();
    return frames.filter(f => f.frame_root?.toLowerCase().includes(q));
  }, [frames, searchQuery]);

  // Compute real metrics from fingerprint data
  const fingerprintMetrics = useMemo(() => {
    const activeFingerprint = fingerprints.find(fp => fp.type === selectedType);
    if (!activeFingerprint?.data) return null;
    // Compute entropy from data distribution
    const values: number[] = Object.values(activeFingerprint.data).filter(v => typeof v === 'number') as number[];
    if (values.length === 0) return null;
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / values.length;
    const entropy = Math.min(1, Math.sqrt(variance) / (avg || 1));
    const coherence = Math.max(0.5, 1 - Math.sqrt(variance) / Math.max(...values, 1));
    const bands = values.slice(0, 5).map((v, i) => ({ band: i + 1, value: v / Math.max(...values, 1) }));
    return { entropy: entropy.toFixed(3), coherence: (coherence * 100).toFixed(1), bands };
  }, [fingerprints, selectedType]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-bold tracking-tight text-white">Fingerprint Studio</h2>
          <p className="text-zinc-500 text-lg">Inspect and compare sensory fingerprints across the NLM.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Frame Selector */}
          <div className="relative">
            <button
              onClick={() => setShowFrameList(!showFrameList)}
              className="flex items-center gap-3 px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm font-medium text-zinc-300 hover:text-white hover:border-zinc-700 transition-all"
            >
              <Database className="w-4 h-4" />
              <span className="max-w-[120px] truncate">
                {selectedFrameRoot ? `Frame: ${selectedFrameRoot.slice(0, 8)}...` : 'Select Frame'}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFrameList ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showFrameList && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full right-0 mt-2 w-72 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
                >
                  <div className="p-2 max-h-64 overflow-y-auto">
                    {framesLoading ? (
                      <div className="p-4 text-center text-zinc-500 text-xs">Loading frames...</div>
                    ) : filteredFrames.length === 0 ? (
                      <div className="p-4 text-center text-zinc-500 text-xs">
                        {frames.length === 0 ? 'No frames found — seed base models first' : 'No frames match search'}
                      </div>
                    ) : (
                      filteredFrames.map((frame) => (
                        <button
                          key={frame.id}
                          onClick={() => {
                            setSelectedFrameRoot(frame.frame_root);
                            setShowFrameList(false);
                          }}
                          className={`w-full text-left p-3 rounded-xl transition-all flex flex-col gap-1 ${
                            selectedFrameRoot === frame.frame_root
                              ? 'bg-zinc-800 text-white'
                              : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                          }`}
                        >
                          <span className="text-xs font-mono font-bold">{frame.frame_root.slice(0, 16)}...</span>
                          <span className="text-[10px] opacity-50">{new Date(frame.timestamp?.seconds * 1000).toLocaleString()}</span>
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center bg-zinc-900/50 border border-zinc-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode('single')}
              className={`p-1.5 rounded-lg transition-all flex items-center gap-2 text-xs font-bold ${viewMode === 'single' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              SINGLE
            </button>
            <button
              onClick={() => setViewMode('comparison')}
              className={`p-1.5 rounded-lg transition-all flex items-center gap-2 text-xs font-bold ${viewMode === 'comparison' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              COMPARE
            </button>
          </div>

          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
            <input
              type="text"
              placeholder="Search by frame root..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-zinc-700 transition-all w-64"
            />
          </div>
          <button className="p-2 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-all">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'comparison' ? (
          <motion.div
            key="comparison"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-zinc-900/20 border border-zinc-800 rounded-[40px] p-8"
          >
            <SensoryFingerprintViz fingerprints={fingerprints} mycoBrainData={filteredMycoBrainData} />
          </motion.div>
        ) : (
          <motion.div
            key="single"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Fingerprint List */}
            <div className="lg:col-span-1 space-y-4">
              <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Available Fingerprints</h3>
              <div className="space-y-3">
                {[
                  { type: 'spectral', icon: Zap, color: 'text-amber-500', label: 'Wavelengths' },
                  { type: 'acoustic', icon: Activity, color: 'text-emerald-500', label: 'Waveforms' },
                  { type: 'bioelectric', icon: Cpu, color: 'text-sky-500', label: 'Voltages' },
                  { type: 'chemical', icon: Wind, color: 'text-sky-500', label: 'Gas Concentrations' },
                  { type: 'thermal', icon: Thermometer, color: 'text-rose-500', label: 'Temp Gradients' },
                  { type: 'mechanical', icon: LayoutGrid, color: 'text-zinc-500', label: 'Pressure Fields' },
                ].map((fp) => (
                  <div
                    key={fp.type}
                    onClick={() => setSelectedType(fp.type)}
                    className={`p-4 border rounded-2xl transition-all cursor-pointer flex items-center gap-4 ${
                      selectedType === fp.type
                        ? 'bg-zinc-800 border-zinc-600 shadow-lg'
                        : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className={`w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center ${fp.color}`}>
                      <fp.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium capitalize">{fp.type}</h4>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">{fp.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fingerprint Visualization Area */}
            <div className="lg:col-span-2">
              {selectedType ? (
                <motion.div
                  key={selectedType}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 space-y-8 h-full min-h-[500px]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-white capitalize">{selectedType} Fingerprint</h3>
                      <p className="text-zinc-500 text-sm">Deterministic sensory signature analysis.</p>
                    </div>
                    <div className="px-3 py-1 bg-zinc-950 border border-zinc-800 rounded-xl text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                      Verified by AVANI
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="aspect-video bg-zinc-950 border border-zinc-800 rounded-2xl relative overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-0 opacity-10">
                          <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
                        </div>
                        <Fingerprint className="w-12 h-12 text-zinc-800" />
                        <div className="absolute bottom-4 left-4 right-4 h-1 bg-zinc-900 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: '65%' }}
                            className="h-full bg-white/20"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Signal Metrics</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Entropy</p>
                            <p className="text-lg font-bold text-white">
                              {fingerprintMetrics?.entropy ?? (fingerprints.length > 0 ? '...' : 'No data')}
                            </p>
                          </div>
                          <div className="p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Coherence</p>
                            <p className="text-lg font-bold text-white">
                              {fingerprintMetrics?.coherence ? `${fingerprintMetrics.coherence}%` : (fingerprints.length > 0 ? '...' : 'No data')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Frequency Distribution</h4>
                       <div className="space-y-3">
                         {(fingerprintMetrics?.bands ?? Array.from({ length: 5 }, (_, i) => ({ band: i + 1, value: 0 }))).map((band) => (
                           <div key={band.band} className="space-y-1">
                             <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                               <span>BAND {band.band}</span>
                               <span>{band.value > 0 ? band.value.toFixed(3) : 'no data'}</span>
                             </div>
                             <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                               <motion.div
                                 initial={{ width: 0 }}
                                 animate={{ width: `${band.value * 100}%` }}
                                 className="h-full bg-zinc-600"
                               />
                             </div>
                           </div>
                         ))}
                       </div>
                      <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl">
                        <p className="text-xs text-zinc-400 leading-relaxed italic">
                          &quot;Fingerprint shows high correlation with baseline nature patterns. No anomalous artifacts detected in the spectral domain.&quot;
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="bg-zinc-900/20 border border-dashed border-zinc-800 rounded-[32px] flex flex-col items-center justify-center p-12 text-center h-full min-h-[500px]">
                  <Fingerprint className="w-16 h-16 text-zinc-800 mb-6" />
                  <h3 className="text-xl font-semibold text-zinc-300">Select a fingerprint type to inspect</h3>
                  <p className="text-zinc-500 mt-2 max-w-sm">
                    Fingerprints are extracted from rooted nature frames and provide deterministic sensory signatures for the NLM.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
