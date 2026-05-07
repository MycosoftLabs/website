'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  RefreshCw,
  Activity,
  Database,
  MapPin,
  Eye,
  Leaf,
  Bird,
  Cpu,
  Server,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Filter,
  ExternalLink,
} from 'lucide-react';

interface Observation {
  id: string;
  species: string;
  scientificName: string;
  lat: number;
  lng: number;
  timestamp: string;
  source: string;
  verified: boolean;
  observer: string;
  imageUrl: string;
  kingdom?: string;
  iconicTaxon?: string;
}

interface MindexHealth {
  status: 'healthy' | 'degraded' | 'offline' | 'unconfigured';
  species_count?: number;
  taxonomic_matches?: number;
  version?: string;
  error?: string;
}

const KINGDOM_OPTIONS = ['all', 'Fungi', 'Plantae', 'Animalia', 'Aves'];

const KINGDOM_COLORS: Record<string, string> = {
  Fungi: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  Plantae: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  Animalia: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  Aves: 'text-sky-400 bg-sky-400/10 border-sky-400/30',
  Unknown: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30',
};

function getKingdomColor(kingdom: string | undefined): string {
  if (!kingdom) return KINGDOM_COLORS.Unknown;
  return KINGDOM_COLORS[kingdom] || KINGDOM_COLORS.Unknown;
}

function KingdomIcon({ kingdom }: { kingdom?: string }) {
  switch (kingdom) {
    case 'Fungi': return <Database className="w-3.5 h-3.5" />;
    case 'Plantae': return <Leaf className="w-3.5 h-3.5" />;
    case 'Aves': return <Bird className="w-3.5 h-3.5" />;
    case 'Animalia': return <Eye className="w-3.5 h-3.5" />;
    default: return <Globe className="w-3.5 h-3.5" />;
  }
}

export function MindexLiveObservations() {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [health, setHealth] = useState<MindexHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [healthLoading, setHealthLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedObs, setSelectedObs] = useState<Observation | null>(null);
  const [kingdom, setKingdom] = useState('Fungi');
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [kingdomCounts, setKingdomCounts] = useState<Record<string, number>>({});

  // Fetch MINDEX backend health
  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch('/api/mindex/health', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setHealth({ status: data.status === 'healthy' ? 'healthy' : 'degraded', ...data });
      } else if (res.status === 503) {
        const data = await res.json().catch(() => ({}));
        setHealth({
          status: data.error?.includes('not configured') ? 'unconfigured' : 'offline',
          error: data.error || `HTTP ${res.status}`,
        });
      } else {
        setHealth({ status: 'offline', error: `HTTP ${res.status}` });
      }
    } catch (e: any) {
      setHealth({ status: 'offline', error: e.message });
    } finally {
      setHealthLoading(false);
    }
  }, []);

  // Fetch live observations from iNaturalist + GBIF via MINDEX API
  const fetchObservations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '30', kingdom });
      const res = await fetch(`/api/mindex/observations?${params}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setObservations(data.observations || []);
      setKingdomCounts(data.kingdoms || {});
      setLastFetched(new Date());
    } catch (e: any) {
      setError(e.message || 'Failed to fetch observations');
    } finally {
      setLoading(false);
    }
  }, [kingdom]);

  useEffect(() => {
    fetchHealth();
    fetchObservations();
  }, [fetchHealth, fetchObservations]);

  const getHealthCfg = (status?: string | null) => {
    const cfg: Record<string, { color: string; dot: string; label: string }> = {
      healthy:      { color: 'text-emerald-500', dot: 'bg-emerald-500 animate-pulse', label: 'MINDEX ONLINE' },
      degraded:     { color: 'text-amber-500',   dot: 'bg-amber-500 animate-pulse',   label: 'MINDEX DEGRADED' },
      offline:      { color: 'text-red-500',      dot: 'bg-red-500',                   label: 'MINDEX OFFLINE' },
      unconfigured: { color: 'text-zinc-500',     dot: 'bg-zinc-600',                  label: 'MINDEX NOT CONFIGURED' },
    };
    return cfg[status ?? 'unconfigured'] ?? cfg['unconfigured'];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-2xl font-bold text-white">Live Global Observations</h3>
          <p className="text-zinc-500 text-sm">Real-time nature data from iNaturalist & GBIF via MINDEX pipeline.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* MINDEX Health Badge */}
          {healthLoading ? (
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
              <div className="w-2 h-2 rounded-full bg-zinc-600 animate-pulse" />
              MINDEX API...
            </div>
          ) : (() => {
            const s = getHealthCfg(health?.status);
            return (
              <div className={`flex items-center gap-2 text-[10px] font-mono ${s.color}`}>
                <div className={`w-2 h-2 rounded-full ${s.dot}`} />
                {s.label}
                {health?.species_count !== undefined && (
                  <span className="text-zinc-500">· {health.species_count.toLocaleString()} species</span>
                )}
              </div>
            );
          })()}
          <div className="h-4 w-px bg-zinc-800" />
          <div className="flex items-center bg-zinc-900/50 border border-zinc-800 rounded-xl p-1">
            {KINGDOM_OPTIONS.map(k => (
              <button
                key={k}
                onClick={() => setKingdom(k)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                  kingdom === k ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {k === 'all' ? 'All Life' : k}
              </button>
            ))}
          </div>
          <button
            onClick={fetchObservations}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-emerald-500/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Kingdom count summary */}
      {Object.keys(kingdomCounts).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(kingdomCounts).map(([k, count]) => (
            <span key={k} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${getKingdomColor(k)}`}>
              <KingdomIcon kingdom={k} />
              {k}: {count}
            </span>
          ))}
        </div>
      )}

      {/* Last fetched */}
      {lastFetched && (
        <p className="text-[10px] text-zinc-600 font-mono">
          Last synced: {lastFetched.toLocaleTimeString()} · {observations.length} observations
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-900/10 border border-red-900/20 rounded-2xl flex items-center gap-3">
          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-400 font-mono">{error}</p>
        </div>
      )}

      {/* Observations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <motion.div
                key={`skel-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-48 bg-zinc-900/40 border border-zinc-800 rounded-2xl animate-pulse"
              />
            ))
          ) : observations.length === 0 && !error ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full py-16 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-3xl text-center"
            >
              <Globe className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500 text-sm">No observations found for this filter.</p>
            </motion.div>
          ) : (
            observations.map((obs) => (
              <motion.div
                key={obs.id}
                layoutId={obs.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => setSelectedObs(obs)}
                className="group p-4 bg-zinc-900/40 border border-zinc-800 rounded-2xl cursor-pointer hover:border-zinc-700 transition-all space-y-3 relative overflow-hidden"
              >
                {/* Image or placeholder */}
                {obs.imageUrl ? (
                  <div className="w-full h-32 rounded-xl overflow-hidden bg-zinc-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={obs.imageUrl}
                      alt={obs.species}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-32 rounded-xl bg-zinc-800/50 flex items-center justify-center">
                    <KingdomIcon kingdom={obs.kingdom} />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-white truncate">{obs.species}</h4>
                      <p className="text-[10px] text-zinc-500 italic truncate">{obs.scientificName}</p>
                    </div>
                    <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border ${getKingdomColor(obs.kingdom)}`}>
                      {obs.kingdom || 'Unknown'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-zinc-500">
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                      {obs.lat.toFixed(2)}, {obs.lng.toFixed(2)}
                    </span>
                    <span className="flex items-center gap-1 truncate">
                      <Globe className="w-2.5 h-2.5 flex-shrink-0" />
                      {obs.source}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[8px]">
                    <span className="text-zinc-600">{new Date(obs.timestamp).toLocaleDateString()}</span>
                    {obs.verified ? (
                      <span className="flex items-center gap-1 text-emerald-500">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-zinc-600">
                        <AlertTriangle className="w-2.5 h-2.5" /> Needs ID
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedObs && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedObs(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 max-w-lg w-full space-y-6 relative"
            >
              <button onClick={() => setSelectedObs(null)} className="absolute top-6 right-6 text-zinc-600 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>

              {selectedObs.imageUrl && (
                <div className="w-full h-56 rounded-2xl overflow-hidden bg-zinc-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedObs.imageUrl} alt={selectedObs.species} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="space-y-1">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${getKingdomColor(selectedObs.kingdom)}`}>
                  <KingdomIcon kingdom={selectedObs.kingdom} />
                  {selectedObs.kingdom || 'Unknown'}
                </span>
                <h3 className="text-2xl font-bold text-white">{selectedObs.species}</h3>
                <p className="text-zinc-400 italic text-sm">{selectedObs.scientificName}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Source', value: selectedObs.source, icon: <Database className="w-3 h-3" /> },
                  { label: 'Observer', value: selectedObs.observer, icon: <Eye className="w-3 h-3" /> },
                  { label: 'Latitude', value: selectedObs.lat.toFixed(4), icon: <MapPin className="w-3 h-3" /> },
                  { label: 'Longitude', value: selectedObs.lng.toFixed(4), icon: <MapPin className="w-3 h-3" /> },
                  { label: 'Observed', value: new Date(selectedObs.timestamp).toLocaleDateString(), icon: <Activity className="w-3 h-3" /> },
                  {
                    label: 'Quality',
                    value: selectedObs.verified ? 'Research Grade' : 'Needs ID',
                    icon: selectedObs.verified ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <AlertTriangle className="w-3 h-3 text-amber-500" />,
                  },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                      {icon} {label}
                    </div>
                    <p className="text-sm text-white font-mono truncate">{value}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 p-4 bg-zinc-900/30 border border-zinc-800 rounded-2xl">
                <Cpu className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  This observation is available for NLM training ingestion. Source: <span className="text-white font-bold">{selectedObs.source}</span>.
                  Merkle-indexing will occur on next MINDEX sync cycle.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
