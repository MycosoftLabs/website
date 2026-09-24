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
import { LiveNlmBanner } from './LiveNlmBanner';

type DashboardPreferences = {
  autoRefresh: boolean;
  advancedMetrics: boolean;
  mindexLive: boolean;
};

const DEFAULT_DASHBOARD_PREFERENCES: DashboardPreferences = {
  autoRefresh: true,
  advancedMetrics: false,
  mindexLive: true,
};

export function Dashboard({ activeTab, user, profile }: { activeTab: string, user: any, profile: UserProfile | null }) {
  const role = profile?.role?.toLowerCase().trim();
  const isAdminUser = role === 'admin' || role === 'super_admin';
  const userId = user?.id;
  const { models, loading } = useModels(user?.id, isAdminUser);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSeedingVariant, setIsSeedingVariant] = useState(false);
  const [preferences, setPreferences] = useState<DashboardPreferences>(DEFAULT_DASHBOARD_PREFERENCES);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState<any>(null);

  const seedArchitectureVariant = useCallback(async () => {
    if (!userId) return;
    setIsSeedingVariant(true);

    try {
      const response = await fetch('/api/natureos/nlm-training/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variants: true, models: false }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `Variant seed failed (${response.status})`);
      }
      if (data.errors?.length) {
        throw new Error(data.errors.join('; '));
      }
      alert(
        `Architecture variant(s) ensured: ${(data.variantIds || []).join(', ') || 'Base-NLM-v1'}`
      );
    } catch (error) {
      console.error('Error seeding architecture variant:', error);
      alert('Error seeding variant. Check console for details.');
    } finally {
      setIsSeedingVariant(false);
    }
  }, [userId]);

  // Server-side idempotent ensure of the AI Studio base variant (no localStorage gate)
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const ensureBaseVariant = async () => {
      try {
        const statusRes = await fetch('/api/natureos/nlm-training/seed', { cache: 'no-store' });
        if (!statusRes.ok || cancelled) return;
        const status = await statusRes.json();
        if ((status.missingVariantIds || []).length === 0) return;

        const response = await fetch('/api/natureos/nlm-training/seed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variants: true, models: false }),
        });
        if (!response.ok) {
          console.error('Auto-ensure base variant failed:', response.status);
        }
      } catch (error) {
        console.error('Error ensuring base architecture variant:', error);
      }
    };

    ensureBaseVariant();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const loadSettings = async () => {
      try {
        const prefRes = await fetch('/api/natureos/nlm-training/preferences', { cache: 'no-store' });
        if (!cancelled && prefRes.ok) {
          const prefData = await prefRes.json();
          setPreferences({
            ...DEFAULT_DASHBOARD_PREFERENCES,
            ...(prefData.preferences || {}),
          });
        }
      } catch (error) {
        console.error('Error loading dashboard preferences:', error);
      }

      try {
        const res = await fetch('/api/natureos/nlm-training/status', { cache: 'no-store' });
        if (!cancelled && res.ok) {
          setSettingsStatus(await res.json());
        }
      } catch (error) {
        console.error('Error loading NLM settings status:', error);
      }
    };

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const saveDashboardPreferences = useCallback(async (nextPreferences: DashboardPreferences) => {
    if (!userId) return;

    setIsSavingPreferences(true);
    try {
      const response = await fetch('/api/natureos/nlm-training/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: nextPreferences }),
      });
      if (!response.ok) throw new Error(`Preference save failed (${response.status})`);
    } catch (error) {
      console.error('Error saving dashboard preferences:', error);
    } finally {
      setIsSavingPreferences(false);
    }
  }, [userId]);

  const seedBaseModels = async () => {
    if (!user?.id) return;
    setIsSeeding(true);

    try {
      const response = await fetch('/api/natureos/nlm-training/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variants: true, models: true }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `Seed models failed (${response.status})`);
      }
      if (data.errors?.length) {
        throw new Error(data.errors.join('; '));
      }
      alert(
        `Seeded ${data.modelsCreated || 0} new base model(s); ` +
          `${data.modelsSkipped || 0} already present. ` +
          `Variants: ${(data.variantIds || []).join(', ') || 'ok'}`
      );
      // Force model list refresh via hook interval / soft reload of models
      window.dispatchEvent(new Event('nlm-models-refresh'));
    } catch (error) {
      console.error('Error seeding models:', error);
      alert('Error seeding models. Check console for details.');
    } finally {
      setIsSeeding(false);
    }
  };

  const selectedModel = models.find(m => m.id === selectedModelId);
  const settingsSystems = Array.isArray(settingsStatus) ? settingsStatus : [];
  const mindexApiStatus = settingsStatus?.mindexStatus?.status || settingsSystems.find((system: any) => system.system_name === 'Mindex')?.status;
  const masApiStatus = settingsStatus?.masStatus?.status || settingsSystems.find((system: any) => system.system_name === 'MAS')?.status;

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
                  <label className="text-sm text-zinc-500">Product plane</label>
                  <input
                    type="text"
                    value="Supabase + MAS + MINDEX (Firebase disabled)"
                    readOnly
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-400 font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-500">Model kind</label>
                  <input
                    type="text"
                    value="Nature Learning Model (signal-state) — not LLM / Ollama"
                    readOnly
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-400 font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-500">MINDEX API</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={mindexApiStatus ? `status: ${mindexApiStatus}` : 'Not configured / offline'}
                      readOnly
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-400 font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-500">MAS API</label>
                  <input
                    type="text"
                    value={masApiStatus ? `status: ${masApiStatus}` : 'Not configured / offline'}
                    readOnly
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-400 font-mono text-sm"
                  />
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
                  { label: 'Auto-refresh system status', key: 'autoRefresh' },
                  { label: 'Show advanced metrics', key: 'advancedMetrics' },
                  { label: 'Enable MINDEX live observations', key: 'mindexLive' },
                ].map(pref => {
                  const key = pref.key as keyof DashboardPreferences;
                  const enabled = preferences[key];

                  return (
                    <div key={pref.key} className="flex items-center justify-between p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl">
                      <span className="text-sm text-zinc-300">{pref.label}</span>
                      <button
                        disabled={isSavingPreferences}
                        onClick={() => {
                          const nextPreferences = { ...preferences, [key]: !enabled };
                          setPreferences(nextPreferences);
                          saveDashboardPreferences(nextPreferences);
                        }}
                        className={`w-10 h-5 rounded-full relative transition-colors disabled:opacity-60 ${
                          enabled ? 'bg-emerald-500' : 'bg-zinc-700'
                        }`}
                        aria-label={pref.label}
                        aria-pressed={enabled}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                          enabled ? 'right-0.5' : 'left-0.5'
                        }`} />
                      </button>
                    </div>
                  );
                })}
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
          <LiveNlmBanner />
          <SystemStatus />

          {/* Dashboard Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1">
              <h2 className="text-4xl font-bold tracking-tight text-white">Models</h2>
              <p className="text-zinc-500 text-lg">
                {userId
                  ? 'Manage and monitor your Nature Learning Models (signal-state — not an LLM).'
                  : 'Demo catalog — seeded scientific base models. Sign in to train, save, and ingest.'}
              </p>
              {!userId && (
                <p className="font-mono text-[10px] uppercase tracking-widest text-amber-500/80">
                  Catalog / demo · not live sensor streams
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {userId && (
                <>
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
                {isSeeding ? 'Seeding...' : 'Seed Full Catalog'}
              </Button>
                </>
              )}
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

              {userId ? (
              <Button
                onClick={() => setShowCreate(true)}
                className="bg-white text-black hover:bg-zinc-200 rounded-xl font-semibold shadow-lg shadow-white/5"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Model
              </Button>
              ) : (
                <a
                  href="/login"
                  className="inline-flex min-h-[44px] items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black shadow-lg shadow-white/5 hover:bg-zinc-200"
                >
                  Sign in to train
                </a>
              )}
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
                <p className="text-zinc-500 mt-2 max-w-xs">
                  Seed the 10 AI Studio base models, or create a new Nature Learning Model to begin training.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Button
                    onClick={seedBaseModels}
                    disabled={isSeeding || !userId}
                    className="bg-white text-black hover:bg-zinc-200"
                  >
                    <Database className={`w-4 h-4 mr-2 ${isSeeding ? 'animate-spin' : ''}`} />
                    {isSeeding ? 'Seeding...' : 'Seed Base Models'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreate(true)}
                    className="border-zinc-800 hover:bg-zinc-800 text-zinc-300"
                  >
                    Create Model
                  </Button>
                </div>
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
