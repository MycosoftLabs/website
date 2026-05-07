'use client';

import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/nlm/firebase';
import { motion } from 'framer-motion';
import { X, Brain, Sparkles, Zap, Shield } from 'lucide-react';
import { Button } from './ui/button';

export function CreateModel({ userId, onClose }: { userId: string, onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [architecture, setArchitecture] = useState('transformer');
  const [variantId, setVariantId] = useState('v1-standard');
  const [learningRate, setLearningRate] = useState(0.001);
  const [batchSize, setBatchSize] = useState(32);
  const [epochs, setEpochs] = useState(10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'models'), {
        name,
        description,
        status: 'idle',
        ownerId: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        config: {
          architecture,
          variantId,
          layers: 12,
          heads: 8,
          embeddingDim: 512,
          recursionDepth: 4,
          training: {
            learningRate,
            batchSize,
            epochs
          }
        }
      });
      onClose();
    } catch (error) {
      console.error("Error creating model:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-[32px] shadow-2xl overflow-hidden"
      >
        <div className="p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Initialize NLM</h3>
                <p className="text-zinc-500 text-sm">Configure your new sensory world model.</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Model Name</label>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Forest-Temporal-Alpha"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-zinc-700 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the sensory scope and purpose..."
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-zinc-700 transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Architecture</label>
                  <select
                    value={architecture}
                    onChange={(e) => setArchitecture(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-zinc-700 transition-all appearance-none"
                  >
                    <option value="transformer">Transformer (Attention)</option>
                    <option value="recursive">Recursive Neural Network</option>
                    <option value="evolutionary">Evolutionary Mutation</option>
                    <option value="hybrid">Hybrid Sensory-Grounded</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Variant ID</label>
                  <input
                    value={variantId}
                    onChange={(e) => setVariantId(e.target.value)}
                    placeholder="e.g. v1-alpha"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-zinc-700 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Initial Training Parameters</label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-600 uppercase font-bold ml-1">LR</span>
                    <input
                      type="number"
                      step="0.0001"
                      value={learningRate}
                      onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/10"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-600 uppercase font-bold ml-1">Batch</span>
                    <input
                      type="number"
                      value={batchSize}
                      onChange={(e) => setBatchSize(parseInt(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/10"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-600 uppercase font-bold ml-1">Epochs</span>
                    <input
                      type="number"
                      value={epochs}
                      onChange={(e) => setEpochs(parseInt(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/10"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="flex-1 h-12 rounded-2xl border border-zinc-800 text-zinc-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!name || loading}
                className="flex-[2] h-12 bg-white text-black hover:bg-zinc-200 rounded-2xl font-bold text-lg shadow-xl shadow-white/5"
              >
                {loading ? "Initializing..." : "Create Model"}
              </Button>
            </div>
          </form>

          <div className="flex items-center gap-2 text-[10px] text-zinc-600 font-mono uppercase tracking-tighter">
            <Shield className="w-3 h-3" />
            End-to-end encrypted model weights • Secure training environment
          </div>
        </div>
      </motion.div>
    </div>
  );
}
