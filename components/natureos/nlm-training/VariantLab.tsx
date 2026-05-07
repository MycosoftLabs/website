'use client';

import { useState } from 'react';
import { useVariants } from '@/lib/nlm/firebase-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Plus, Search, Filter, ChevronRight, Activity, Zap, Thermometer, Wind, Brain, GitBranch, Cpu, MessageSquare, Settings2 } from 'lucide-react';
import { Button } from './ui/button';
import { MutationRecipeBuilder } from './MutationRecipeBuilder';

export function VariantLab({ user, isAdmin }: { user: any, isAdmin?: boolean }) {
  const { variants, loading } = useVariants(user?.id, isAdmin);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'variants' | 'recipes'>('variants');

  const selectedVariant = variants.find(v => v.id === selectedVariantId);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-bold tracking-tight text-white">Mutation Lab</h2>
          <p className="text-zinc-500 text-lg">Manage and compare next-gen NLM architecture variants.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-zinc-900/50 border border-zinc-800 rounded-xl p-1">
            <button
              onClick={() => setActiveSubTab('variants')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'variants'
                  ? 'bg-zinc-800 text-white shadow-lg'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Layers className="w-4 h-4" />
              VARIANTS
            </button>
            <button
              onClick={() => setActiveSubTab('recipes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'recipes'
                  ? 'bg-zinc-800 text-white shadow-lg'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              RECIPE BUILDER
            </button>
          </div>

          {activeSubTab === 'variants' && (
            <>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
                <input
                  type="text"
                  placeholder="Search variants..."
                  className="bg-zinc-900/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-zinc-700 transition-all w-64"
                />
              </div>
              <Button
                onClick={() => setShowCreate(true)}
                className="bg-white text-black hover:bg-zinc-200 rounded-xl font-semibold shadow-lg shadow-white/5"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Variant
              </Button>
            </>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'variants' ? (
          <motion.div
            key="variants-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Variant List */}
            <div className="lg:col-span-1 space-y-4">
              <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Architecture Variants</h3>
              <div className="space-y-3">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-zinc-900/40 border border-zinc-800 rounded-2xl animate-pulse" />
                  ))
                ) : variants.length === 0 ? (
                  <div className="p-8 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-3xl text-center">
                    <Layers className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-zinc-300">No variants found</h3>
                    <p className="text-zinc-500 text-sm mt-2">Create a new architecture variant to begin mutation experiments.</p>
                  </div>
                ) : (
                  variants.map((variant) => (
                    <motion.div
                      key={variant.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={`p-4 border rounded-2xl transition-all cursor-pointer flex items-center justify-between ${selectedVariantId === variant.id ? 'bg-zinc-800 border-zinc-600' : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedVariantId === variant.id ? 'bg-zinc-700' : 'bg-zinc-800'}`}>
                          <GitBranch className="w-5 h-5 text-zinc-400" />
                        </div>
                        <div>
                          <h4 className="text-white font-medium">{variant.name}</h4>
                          <p className="text-xs text-zinc-500">{new Date(variant.timestamp?.seconds * 1000).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 transition-colors ${selectedVariantId === variant.id ? 'text-white' : 'text-zinc-700'}`} />
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Variant Detail Area */}
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                {selectedVariant ? (
                  <motion.div
                    key={selectedVariant.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 space-y-8"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="text-2xl font-bold text-white">{selectedVariant.name}</h3>
                        <p className="text-zinc-500">Architecture variant details and configuration.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button variant="outline" className="border-zinc-800 hover:bg-zinc-800 text-zinc-300">
                          Clone Variant
                        </Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold">
                          Deploy to Edge
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="p-6 bg-zinc-950/50 border border-zinc-800 rounded-2xl space-y-4">
                        <div className="flex items-center gap-2 text-zinc-400">
                          <Cpu className="w-4 h-4" />
                          <h4 className="text-sm font-bold uppercase tracking-widest">Core Architecture</h4>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-500">Backbone</span>
                            <span className="text-white font-mono">{selectedVariant.core?.backbone || 'Graph-Native'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-500">Attention</span>
                            <span className="text-white font-mono">{selectedVariant.core?.attention || 'Sparse-Merkle'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-500">Temporal</span>
                            <span className="text-white font-mono">{selectedVariant.core?.temporal || 'SSM/Mamba'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 bg-zinc-950/50 border border-zinc-800 rounded-2xl space-y-4">
                        <div className="flex items-center gap-2 text-zinc-400">
                          <Activity className="w-4 h-4" />
                          <h4 className="text-sm font-bold uppercase tracking-widest">Performance Metrics</h4>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-500">Accuracy</span>
                            <span className="text-emerald-500 font-mono">{(selectedVariant.metrics?.accuracy * 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-500">Latency</span>
                            <span className="text-white font-mono">{selectedVariant.metrics?.latency || '12ms'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-500">AVANI Score</span>
                            <span className="text-sky-500 font-mono">{(selectedVariant.metrics?.avaniScore * 100).toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Learned Streams</h4>
                      <div className="grid grid-cols-3 gap-4">
                        {['spatial', 'temporal', 'spectral', 'world', 'self', 'action'].map((stream) => (
                          <div key={stream} className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl flex items-center gap-3">
                            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                              <Zap className="w-4 h-4 text-zinc-500" />
                            </div>
                            <span className="text-sm text-white capitalize">{stream}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="h-full bg-zinc-900/20 border border-dashed border-zinc-800 rounded-3xl flex flex-col items-center justify-center p-12 text-center">
                    <Layers className="w-16 h-16 text-zinc-800 mb-6" />
                    <h3 className="text-xl font-semibold text-zinc-300">Select a variant to inspect architecture</h3>
                    <p className="text-zinc-500 mt-2 max-w-sm">
                      The Mutation Lab allows you to manage architecture variants, compare performance, and deploy specific configurations to the edge.
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="recipes-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <MutationRecipeBuilder userId={user?.id} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
