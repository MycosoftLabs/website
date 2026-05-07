'use client';

import { useState, useEffect, useCallback } from 'react';
import { useModels } from '@/lib/nlm/firebase-hooks';
import { ModelList } from './ModelList';
import { ModelDetail } from './ModelDetail';
import { CreateModel } from './CreateModel';
import { PipelineDashboard } from './PipelineDashboard';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, Grid, List as ListIcon, Database, Layers, Lock, User as UserIcon } from 'lucide-react';
import { Button } from './ui/button';
import { collection, addDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/nlm/firebase';
import { UserProfile } from '@/lib/nlm/supabase-auth-hooks';

import { MindexExplorer } from './MindexExplorer';
import { MerkleLineageExplorer } from './MerkleLineageExplorer';
import { StateGraphConsole } from './StateGraphConsole';
import { IngestionConsole } from './IngestionConsole';
import { FingerprintStudio } from './FingerprintStudio';
import { VariantLab } from './VariantLab';
import { AvaniGuardian } from './AvaniGuardian';
import { MycobrainStatus } from './MycobrainStatus';
import AgentControlCenter from './AgentControlCenter';

import { SystemStatus } from './SystemStatus';

export function Dashboard({ activeTab, user, profile }: { activeTab: string, user: any, profile: UserProfile | null }) {
  const role = profile?.role?.toLowerCase().trim();
  const isAdminUser = role === 'admin' || role === 'super_admin';
  const { models, loading } = useModels(user?.id, isAdminUser);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSeedingVariant, setIsSeedingVariant] = useState(false);

  const seedArchitectureVariant = useCallback(async () => {
    if (!user?.id) return;
    setIsSeedingVariant(true);

    const baseVariant = {
      name: 'Base-NLM-v1',
      id: 'v1-standard', // Explicitly set ID to match model expectations
      streams: {
        spectral: { enabled: true, resolution: 'high', weight: 1.0 },
        acoustic: { enabled: true, resolution: 'medium', weight: 0.8 },
        bioelectric: { enabled: true, resolution: 'low', weight: 0.5 },
        chemical: { enabled: false, resolution: 'low', weight: 0.2 },
        thermal: { enabled: true, resolution: 'medium', weight: 0.6 },
        mechanical: { enabled: true, resolution: 'high', weight: 0.9 }
      },
      core: {
        type: 'mamba-graph-hybrid',
        layers: 12,
        d_model: 512,
        n_heads: 8,
        state_dim: 128,
        graph_recursion_depth: 4,
        backprop_threshold: 0.01
      },
      preconditioners: ['spectral-norm', 'batch-norm'],
      metrics: {
        target_accuracy: 0.95,
        max_latency_ms: 50
      },
      timestamp: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'variants', 'v1-standard'), {
        ...baseVariant,
        ownerId: user.id,
        createdAt: serverTimestamp()
      });
      alert('Architecture Variant "Base-NLM-v1" seeded successfully!');
    } catch (error) {
      console.error('Error seeding architecture variant:', error);
      alert('Error seeding variant. Check console for details.');
    } finally {
      setIsSeedingVariant(false);
    }
  }, [user]);

  // Automatically seed the base variant if it doesn't exist
  useEffect(() => {
    const checkAndSeed = async () => {
      if (!user?.id) return;

      // We'll just check if we've already seeded it in this session to avoid spamming
      // In a real app, we'd query Firestore to see if it exists
      const hasSeeded = localStorage.getItem('base_variant_seeded');
      if (!hasSeeded) {
        await seedArchitectureVariant();
        localStorage.setItem('base_variant_seeded', 'true');
      }
    };

    checkAndSeed();
  }, [user, seedArchitectureVariant]);

  const seedBaseModels = async () => {
    if (!user?.id) return;
    setIsSeeding(true);

    const baseModels = [
      { name: 'Flora-Base-NLM', description: 'Base model for plant life, photosynthesis, and botanical growth patterns.' },
      { name: 'Fauna-Base-NLM', description: 'Base model for animal behavior, movement, and ecological interactions.' },
      { name: 'Funga-Base-NLM', description: 'Base model for fungal diversity, decomposition, and symbiotic networks.' },
      { name: 'Spores-Micro-NLM', description: 'Micro-scale model for fungal dispersal and reproductive strategies.' },
      { name: 'Pollen-Micro-NLM', description: 'Micro-scale model for plant reproduction and pollinator dynamics.' },
      { name: 'Mycelium-Net-NLM', description: 'Network-scale model for underground fungal communication and nutrient transport.' },
      { name: 'Soil-Microbiome-NLM', description: 'Base model for soil health, microbial diversity, and nutrient cycling.' },
      { name: 'Aerosol-Atmo-NLM', description: 'Environmental model for air particles, seed dispersal, and light scattering.' },
      { name: 'Hydro-Cycle-NLM', description: 'Systemic model for water movement, precipitation, and aquatic life support.' },
      { name: 'Pheno-Sync-NLM', description: 'Temporal model for biological timing and climate-driven event alignment.' }
    ];

    try {
      for (const modelData of baseModels) {
        await addDoc(collection(db, 'models'), {
          ...modelData,
          status: 'idle',
          ownerId: user?.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          config: {
            architecture: 'v3.1-mamba-graph',
            variantId: 'v1-standard',
            layers: 12,
            heads: 8,
            embeddingDim: 512,
            recursionDepth: 4,
            training: {
              learningRate: 0.001,
              batchSize: 32,
              epochs: 10
            }
          }
        });
      }
      // Seeding complete, real-time listener will update the list
    } catch (error) {
      console.error('Error seeding models:', error);
    } finally {
      setIsSeeding(false);
    }
  };

  const selectedModel = models.find(m => m.id === selectedModelId);

  // Route based on activeTab
  switch (activeTab) {
    case 'ingestion':
      return <IngestionConsole />;
    case 'mindex':
      return <MindexExplorer userId={user?.id} isAdmin={isAdminUser} />;
    case 'lineage':
      return <MerkleLineageExplorer userId={user?.id} isAdmin={isAdminUser} />;
    case 'graphs':
      return <StateGraphConsole userId={user?.id} isAdmin={isAdminUser} />;
    case 'mycobrain':
      return <MycobrainStatus />;
    case 'fingerprints':
      return <FingerprintStudio userId={user?.id} isAdmin={isAdminUser} />;
    case 'variants':
      return <VariantLab user={user} isAdmin={isAdminUser} />;
    case 'avani':
      return <AvaniGuardian userId={user?.id} isAdmin={isAdminUser} />;
    case 'training':
      return <PipelineDashboard userId={user?.id} isAdmin={isAdminUser} />;
    case 'agents':
      return <AgentControlCenter userId={user?.id} isAdmin={isAdminUser} />;
    case 'settings':
      return (
        <div className="max-w-2xl space-y-8">
          <h2 className="text-3xl font-bold text-white">Settings</h2>
          <div className="space-y-6">
            <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl space-y-4">
              <h3 className="text-lg font-semibold text-white">API Configuration</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-500">Gemini API Key</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      value={process.env.NEXT_PUBLIC_GEMINI_API_KEY ? '•'.repeat(32) : ''}
                      placeholder={process.env.NEXT_PUBLIC_GEMINI_API_KEY ? undefined : 'Not configured'}
                      readOnly
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-600"
                    />
                    <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${process.env.NEXT_PUBLIC_GEMINI_API_KEY ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-600 border border-zinc-700'}`}>
                      {process.env.NEXT_PUBLIC_GEMINI_API_KEY ? 'SET' : 'NOT SET'}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-500">Firebase Project</label>
                  <input
                    type="text"
                    value={process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'Not configured'}
                    readOnly
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-400 font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-500">MINDEX API</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={process.env.NEXT_PUBLIC_MINDEX_API_URL || process.env.MINDEX_API_URL || 'Not configured'}
                      readOnly
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-400 font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl space-y-4">
              <h3 className="text-lg font-semibold text-white">Account Profile</h3>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700">
                  <UserIcon className="w-6 h-6 text-zinc-500" />
                </div>
                <div>
                  <p className="text-white font-medium">{user?.user_metadata?.full_name || user?.email || 'Authorized User'}</p>
                  <p className="text-zinc-500 text-sm">{user?.email || 'local-session'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-teal-500/10 border border-teal-500/20 rounded text-[10px] font-bold text-teal-500 uppercase tracking-widest">
                      {profile?.role ?? 'viewer'}
                    </span>
                    <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      Level {profile?.access_level ?? 0}
                    </span>
                    {profile?.created_at && (
                      <span className="text-[10px] text-zinc-600 font-mono">
                        Since {new Date(profile.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl space-y-4">
              <h3 className="text-lg font-semibold text-white">Dashboard Preferences</h3>
              <div className="space-y-3">
                {[
                  { label: 'Auto-refresh system status', key: 'autoRefresh', defaultValue: true },
                  { label: 'Show advanced metrics', key: 'advancedMetrics', defaultValue: false },
                  { label: 'Enable MINDEX live observations', key: 'mindexLive', defaultValue: true },
                ].map(pref => (
                  <div key={pref.key} className="flex items-center justify-between p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl">
                    <span className="text-sm text-zinc-300">{pref.label}</span>
                    <button
                      className="w-10 h-5 bg-emerald-500 rounded-full relative transition-colors"
                      aria-label={pref.label}
                    >
                      <span className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    case 'overview':
    default:
      if (selectedModelId && selectedModel) {
        return (
          <ModelDetail
            model={selectedModel}
            isAdmin={isAdminUser}
            userId={user?.id}
            onBack={() => setSelectedModelId(null)}
          />
        );
      }

      return (
        <div className="space-y-8">
          {/* System Status Banner */}
          <SystemStatus />

          {/* Dashboard Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1">
              <h2 className="text-4xl font-bold tracking-tight text-white">Models</h2>
              <p className="text-zinc-500 text-lg">Manage and monitor your Nature Learning Models.</p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={seedArchitectureVariant}
                disabled={isSeedingVariant}
                className="rounded-2xl h-12 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <Layers className={`w-4 h-4 mr-2 ${isSeedingVariant ? 'animate-spin' : ''}`} />
                {isSeedingVariant ? 'Seeding Variant...' : 'Seed Base Variant'}
              </Button>
              <Button
                onClick={seedBaseModels}
                disabled={isSeeding}
                className="rounded-2xl h-12 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <Database className={`w-4 h-4 mr-2 ${isSeeding ? 'animate-spin' : ''}`} />
                {isSeeding ? 'Seeding...' : 'Seed Base Models'}
              </Button>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
                <input
                  type="text"
                  placeholder="Search models..."
                  className="bg-zinc-900/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-zinc-700 transition-all w-64"
                />
              </div>

              <div className="flex items-center bg-zinc-900/50 border border-zinc-800 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <ListIcon className="w-4 h-4" />
                </button>
              </div>

              <Button
                onClick={() => setShowCreate(true)}
                className="bg-white text-black hover:bg-zinc-200 rounded-xl font-semibold shadow-lg shadow-white/5"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Model
              </Button>
            </div>
          </div>

          {/* Models Grid/List */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-64 bg-zinc-900/40 border border-zinc-800 rounded-3xl animate-pulse" />
                ))}
              </motion.div>
            ) : models.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-24 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-3xl text-center"
              >
                <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-zinc-800">
                  <Brain className="w-8 h-8 text-zinc-700" />
                </div>
                <h3 className="text-xl font-semibold text-zinc-300">No models found</h3>
                <p className="text-zinc-500 mt-2 max-w-xs">Start by creating your first Nature Learning Model to begin training.</p>
                <Button
                  variant="outline"
                  onClick={() => setShowCreate(true)}
                  className="mt-6 border-zinc-800 hover:bg-zinc-800 text-zinc-300"
                >
                  Create Model
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <ModelList
                  models={models}
                  viewMode={viewMode}
                  onSelect={setSelectedModelId}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Create Model Modal */}
          <AnimatePresence>
            {showCreate && (
              <CreateModel
                userId={user?.id}
                onClose={() => setShowCreate(false)}
              />
            )}
          </AnimatePresence>
        </div>
      );
  }
}

function Brain({ className }: { className?: string }) {
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
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.54Z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.54Z" />
    </svg>
  );
}
