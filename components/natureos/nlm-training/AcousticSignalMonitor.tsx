'use client';

import React from 'react';
import { MicOff, Info } from 'lucide-react';

interface AcousticSignalMonitorProps {
  activeHydrophoneId: string;
  /** Optional live samples from ingest; empty = no-data state */
  samples?: number[];
}

/**
 * Hydrophone monitor — real samples only. Never fabricates waveforms.
 */
export function AcousticSignalMonitor({
  activeHydrophoneId,
  samples = [],
}: AcousticSignalMonitorProps) {
  const hasData = samples.length > 0;

  if (!hasData) {
    return (
      <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <div className="flex items-center gap-2">
          <MicOff className="h-4 w-4 text-zinc-500" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
            Acoustic Monitor
          </h3>
        </div>
        <p className="font-mono text-xs text-zinc-500">
          Hydrophone {activeHydrophoneId || '—'} — no live samples.
          Connect a MycoBrain / hydrophone device; waveforms appear only from real ingest.
        </p>
        <div className="flex h-[200px] items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-black/40">
          <div className="flex flex-col items-center gap-2 text-zinc-600">
            <Info className="h-6 w-6" />
            <span className="text-xs uppercase tracking-widest">No data</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {['RMS Level', 'Peak Level', 'SNR Ratio', 'Spectral Centroid'].map((label) => (
            <div key={label} className="space-y-2 rounded-2xl border border-zinc-800 bg-black/20 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                {label}
              </span>
              <p className="font-mono text-xl text-zinc-600">—</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const rms = Math.sqrt(samples.reduce((a, v) => a + v * v, 0) / samples.length);
  const peak = Math.max(...samples.map(Math.abs));

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400">
        Acoustic Monitor — live
      </h3>
      <p className="font-mono text-xs text-zinc-500">Hydrophone {activeHydrophoneId}</p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="space-y-2 rounded-2xl border border-zinc-800 bg-black/20 p-4">
          <span className="text-[10px] font-bold uppercase text-zinc-500">RMS</span>
          <p className="font-mono text-xl text-white">{(rms * 100).toFixed(2)}%</p>
        </div>
        <div className="space-y-2 rounded-2xl border border-zinc-800 bg-black/20 p-4">
          <span className="text-[10px] font-bold uppercase text-zinc-500">Peak</span>
          <p className="font-mono text-xl text-white">{(peak * 100).toFixed(2)}%</p>
        </div>
        <div className="space-y-2 rounded-2xl border border-zinc-800 bg-black/20 p-4">
          <span className="text-[10px] font-bold uppercase text-zinc-500">Samples</span>
          <p className="font-mono text-xl text-white">{samples.length}</p>
        </div>
        <div className="space-y-2 rounded-2xl border border-zinc-800 bg-black/20 p-4">
          <span className="text-[10px] font-bold uppercase text-zinc-500">SNR / Centroid</span>
          <p className="font-mono text-xl text-zinc-600">—</p>
        </div>
      </div>
    </div>
  );
}
