'use client';

import { useState } from 'react';
import { useMutationRecipes } from '@/lib/nlm/firebase-hooks';
import { db } from '@/lib/nlm/firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Save,
  FolderOpen,
  Plus,
  Trash2,
  ChevronRight,
  Settings2,
  Layers,
  Activity,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from './ui/button';

export function MutationRecipeBuilder({ userId }: { userId: string }) {
  const { recipes, loading } = useMutationRecipes(userId);
  const [isSaving, setIsSaving] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const [recipe, setRecipe] = useState({
    name: 'New Mutation Strategy',
    description: 'Custom architecture mutation strategy.',
    type: 'noise_injection',
    mutationRate: 0.05,
    targetLayers: ['attention', 'temporal'],
    streamModifications: {
      spectral: 1.0,
      acoustic: 1.0,
      bioelectric: 1.0,
      chemical: 1.0,
      thermal: 1.0,
      mechanical: 1.0
    }
  });

  const mutationTypes = [
    { id: 'crossover', label: 'Crossover', description: 'Recombine weights from two parent variants.' },
    { id: 'pruning', label: 'Pruning', description: 'Remove low-importance weights to increase efficiency.' },
    { id: 'noise_injection', label: 'Noise Injection', description: 'Inject stochastic noise to explore new topologies.' },
    { id: 'hybrid', label: 'Hybrid', description: 'Multi-strategy architectural evolution.' },
  ];

  const layerOptions = ['backbone', 'attention', 'temporal', 'embedding', 'output'];
  const streamOptions = ['spectral', 'acoustic', 'bioelectric', 'chemical', 'thermal', 'mechanical'];

  const handleSave = async () => {
    setIsSaving(true);
    setStatus(null);
    try {
      await addDoc(collection(db, 'mutation_recipes'), {
        ...recipe,
        ownerId: userId,
        createdAt: serverTimestamp()
      });
      setStatus({ type: 'success', message: 'Recipe saved successfully.' });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      console.error("Error saving recipe:", error);
      setStatus({ type: 'error', message: 'Failed to save recipe.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoad = (loadedRecipe: any) => {
    setRecipe({
      name: loadedRecipe.name,
      description: loadedRecipe.description,
      type: loadedRecipe.type,
      mutationRate: loadedRecipe.mutationRate,
      targetLayers: loadedRecipe.targetLayers || [],
      streamModifications: loadedRecipe.streamModifications || {
        spectral: 1.0,
        acoustic: 1.0,
        bioelectric: 1.0,
        chemical: 1.0,
        thermal: 1.0,
        mechanical: 1.0
      }
    });
    setShowLoadModal(false);
    setStatus({ type: 'success', message: `Loaded: ${loadedRecipe.name}` });
    setTimeout(() => setStatus(null), 3000);
  };

  const handleDelete = async (recipeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this recipe?')) return;

    try {
      await deleteDoc(doc(db, 'mutation_recipes', recipeId));
      setStatus({ type: 'success', message: 'Recipe deleted successfully.' });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      console.error("Error deleting recipe:", error);
      setStatus({ type: 'error', message: 'Failed to delete recipe.' });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-2xl font-bold text-white flex items-center gap-3">
            <Settings2 className="w-6 h-6 text-zinc-500" />
            Mutation Recipe Builder
          </h3>
          <p className="text-zinc-500">Define and persist reusable mutation strategies.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowLoadModal(true)}
            className="border-zinc-800 hover:bg-zinc-800 text-zinc-300"
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Load Recipe
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-white text-black hover:bg-zinc-200 font-bold px-6"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-zinc-300 border-t-black rounded-full animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Recipe
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {status && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl flex items-center gap-3 ${
              status.type === 'success' ? 'bg-emerald-900/20 border border-emerald-800/50 text-emerald-500' : 'bg-red-900/20 border border-red-800/50 text-red-500'
            }`}
          >
            {status.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="text-sm font-medium">{status.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Core Config */}
        <div className="space-y-8">
          <div className="p-8 bg-zinc-900/40 border border-zinc-800 rounded-[32px] space-y-6">
            <div className="space-y-4">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Recipe Identity</label>
              <input
                type="text"
                value={recipe.name}
                onChange={(e) => setRecipe({...recipe, name: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/10"
                placeholder="Recipe Name"
              />
              <textarea
                value={recipe.description}
                onChange={(e) => setRecipe({...recipe, description: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/10 h-24 resize-none"
                placeholder="Strategy description..."
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Mutation Type</label>
              <div className="grid grid-cols-1 gap-3">
                {mutationTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setRecipe({...recipe, type: type.id})}
                    className={`p-4 rounded-2xl border text-left transition-all group ${
                      recipe.type === type.id
                        ? 'bg-zinc-800 border-zinc-600 shadow-lg'
                        : 'bg-zinc-950/50 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-bold ${recipe.type === type.id ? 'text-white' : 'text-zinc-400'}`}>
                        {type.label}
                      </span>
                      {recipe.type === type.id && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Parameters */}
        <div className="space-y-8">
          <div className="p-8 bg-zinc-900/40 border border-zinc-800 rounded-[32px] space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Mutation Rate</label>
                <span className="text-sm font-mono text-white">{(recipe.mutationRate * 100).toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.005"
                value={recipe.mutationRate}
                onChange={(e) => setRecipe({...recipe, mutationRate: parseFloat(e.target.value)})}
                className="w-full accent-white"
              />
              <div className="flex justify-between text-[9px] font-mono text-zinc-600 uppercase">
                <span>Conservative</span>
                <span>Aggressive</span>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Target Layers</label>
              <div className="flex flex-wrap gap-2">
                {layerOptions.map((layer) => (
                  <button
                    key={layer}
                    onClick={() => {
                      const newLayers = recipe.targetLayers.includes(layer)
                        ? recipe.targetLayers.filter(l => l !== layer)
                        : [...recipe.targetLayers, layer];
                      setRecipe({...recipe, targetLayers: newLayers});
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      recipe.targetLayers.includes(layer)
                        ? 'bg-zinc-800 border-zinc-600 text-white shadow-lg'
                        : 'bg-zinc-950/50 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {layer.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Stream Modifications</label>
              <div className="grid grid-cols-2 gap-4">
                {streamOptions.map((stream) => (
                  <div key={stream} className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{stream}</span>
                      <span className="text-[10px] font-mono text-zinc-500">{(recipe.streamModifications as any)[stream].toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="2.0"
                      step="0.1"
                      value={(recipe.streamModifications as any)[stream]}
                      onChange={(e) => {
                        const newStreams = { ...recipe.streamModifications, [stream]: parseFloat(e.target.value) };
                        setRecipe({...recipe, streamModifications: newStreams});
                      }}
                      className="w-full accent-zinc-500 h-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 bg-emerald-900/10 border border-emerald-800/30 rounded-3xl flex items-start gap-4">
            <div className="w-10 h-10 bg-emerald-900/20 rounded-xl flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-emerald-500">Strategy Impact Analysis</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                This {recipe.type} strategy with a {(recipe.mutationRate * 100).toFixed(1)}% rate is estimated to produce
                <span className="text-emerald-400 mx-1">high-variance</span>
                architectural shifts. AVANI risk assessment: <span className="text-emerald-400">Low</span>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Load Recipe Modal */}
      <AnimatePresence>
        {showLoadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-[40px] overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-zinc-800 flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-white">Load Mutation Recipe</h3>
                  <p className="text-sm text-zinc-500">Select a previously saved strategy.</p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setShowLoadModal(false)}
                  className="text-zinc-500 hover:text-white"
                >
                  Cancel
                </Button>
              </div>

              <div className="p-4 max-h-[400px] overflow-y-auto">
                {loading ? (
                  <div className="py-12 flex justify-center">
                    <div className="w-6 h-6 border-2 border-zinc-800 border-t-white rounded-full animate-spin" />
                  </div>
                ) : recipes.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <FolderOpen className="w-10 h-10 text-zinc-800 mx-auto" />
                    <p className="text-zinc-500 text-sm">No saved recipes found.</p>
                  </div>
                ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {recipes.map((r) => (
                          <div key={r.id} className="group relative">
                            <button
                              onClick={() => handleLoad(r)}
                              className="w-full p-5 rounded-2xl bg-zinc-950/50 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50 transition-all text-left"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-white group-hover:text-emerald-400 transition-colors">{r.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 bg-zinc-800 text-[9px] font-mono text-zinc-400 rounded border border-zinc-700 uppercase tracking-wider">
                                    {r.type}
                                  </span>
                                  <span className="text-[10px] font-mono text-zinc-600">
                                    {(r.mutationRate * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-zinc-500 line-clamp-2 mb-3">{r.description}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {r.targetLayers?.map((l: string) => (
                                  <span key={l} className="text-[8px] font-bold text-zinc-600 uppercase tracking-tighter border border-zinc-800 px-1 rounded">
                                    {l}
                                  </span>
                                ))}
                              </div>
                            </button>
                            <button
                              onClick={(e) => handleDelete(r.id, e)}
                              className="absolute top-4 right-4 p-2 text-zinc-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
