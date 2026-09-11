'use client';

import { useEffect, useState } from 'react';
import { Activity, Database, Lock } from 'lucide-react';

interface LiveNlmBannerState {
  masOnline: boolean;
  nlmLoaded: boolean;
  taxaCount: number;
  observationCount: number;
  compoundCount: number;
  skipStartup: boolean;
  trainingReason: string;
}

export function LiveNlmBanner() {
  const [state, setState] = useState<LiveNlmBannerState | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/natureos/nlm-training', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setState({
          masOnline: Boolean(data?.connections?.mas || data?.masStatus?.reachable),
          nlmLoaded: Boolean(data?.nlmStatus?.model_loaded),
          taxaCount: Number(data?.dataStats?.mindexSpecies || 0),
          observationCount: Number(data?.dataStats?.mindexObservations || 0),
          compoundCount: Number(data?.dataStats?.mindexCompounds || 0),
          skipStartup: Boolean(data?.masStatus?.skip_startup),
          trainingReason:
            data?.training?.reason ||
            'Training jobs are fail-closed on MAS 188. No new model pulls.',
        });
      } catch {
        if (!cancelled) setState(null);
      }
    };
    load();
    const interval = window.setInterval(load, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  if (!state) return null;

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 ${state.masOnline ? 'text-emerald-400' : 'text-red-400'}`} />
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-300">
            {state.masOnline ? 'MAS online' : 'MAS unreachable'}
          </p>
        </div>
        <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
          NLM {state.nlmLoaded ? 'loaded' : 'unloaded'} · not Ollama · forecast unqualified
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-zinc-800 bg-black/20 p-3">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">MINDEX taxa</p>
          <p className="text-lg font-semibold text-white">{state.taxaCount || 'empty from source'}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-black/20 p-3">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">Observations</p>
          <p className="text-lg font-semibold text-white">{state.observationCount || 'empty from source'}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-black/20 p-3">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">Compounds</p>
          <p className="text-lg font-semibold text-white">{state.compoundCount || 'empty from source'}</p>
        </div>
      </div>
      <div className="flex items-start gap-2 text-[11px] text-zinc-400">
        {state.skipStartup ? <Lock className="w-3.5 h-3.5 mt-0.5 text-amber-400" /> : <Database className="w-3.5 h-3.5 mt-0.5" />}
        <p>{state.trainingReason}</p>
      </div>
    </div>
  );
}
