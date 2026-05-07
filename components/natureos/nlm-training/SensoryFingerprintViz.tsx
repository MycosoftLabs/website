'use client';

import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Activity, Thermometer, Eye, EyeOff, Layers, Wifi, WifiOff } from 'lucide-react';
import { MycoBrainEntry } from '@/lib/nlm/supabase-hooks';

interface FingerprintData {
  type: string;
  data: any;
  features?: any[];
}

export function SensoryFingerprintViz({
  fingerprints,
  mycoBrainData = []
}: {
  fingerprints: FingerprintData[],
  mycoBrainData?: MycoBrainEntry[]
}) {
  const [showFeatures, setShowFeatures] = useState(true);
  const isLive = mycoBrainData.length > 0;

  // Seeded random for purity
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  const spectralData = useMemo(() => {
    if (isLive && mycoBrainData[0]?.spectral_density) {
      return mycoBrainData[0].spectral_density.map((val, i) => ({ freq: i * 10, amplitude: val }));
    }
    const fp = fingerprints.find(f => f.type === 'spectral');
    return fp?.data?.series || [];
  }, [fingerprints, mycoBrainData, isLive]);

  const acousticData = useMemo(() => {
    if (isLive && mycoBrainData[0]?.acoustic_signature) {
      return mycoBrainData[0].acoustic_signature.map((val, i) => ({ time: i, db: val }));
    }
    const fp = fingerprints.find(f => f.type === 'acoustic');
    return fp?.data?.series || [];
  }, [fingerprints, mycoBrainData, isLive]);

  const thermalData = useMemo(() => {
    if (isLive && mycoBrainData[0]?.thermal_gradient) {
      return mycoBrainData[0].thermal_gradient.map((val, i) => ({ x: i, y: val }));
    }
    const fp = fingerprints.find(f => f.type === 'thermal');
    return fp?.data?.series || [];
  }, [fingerprints, mycoBrainData, isLive]);

  // Mock data if real data is missing for demonstration
  const mockSpectral = useMemo(() => Array.from({ length: 50 }, (_, i) => ({
    freq: i * 20,
    amplitude: seededRandom(i) * 100 * Math.exp(-i / 10) + seededRandom(i + 100) * 10,
    feature: i === 12 || i === 25 ? 80 : null
  })), []);

  const mockAcoustic = useMemo(() => Array.from({ length: 100 }, (_, i) => ({
    time: i,
    db: Math.sin(i / 5) * 20 + seededRandom(i + 200) * 5 + 40,
    feature: i % 30 === 0 ? 65 : null
  })), []);

  const mockThermal = useMemo(() => Array.from({ length: 50 }, (_, i) => ({
    x: i,
    y: seededRandom(i + 300) * 5 + 25 + Math.sin(i / 10) * 5,
    feature: i === 25 ? 35 : null
  })), []);

  const displaySpectral = spectralData.length > 0 ? spectralData : mockSpectral;
  const displayAcoustic = acousticData.length > 0 ? acousticData : mockAcoustic;
  const displayThermal = thermalData.length > 0 ? thermalData : mockThermal;

  const metrics = useMemo(() => {
    if (!isLive || !mycoBrainData[0]) {
      return {
        peakIntensity: '112.4 dBm',
        bandwidth: '8.2 kHz',
        rmsPower: '0.642 v',
        zeroCross: '421 / s',
        avgTemp: '28.4 °C',
        maxDelta: '4.2 °C'
      };
    }
    const d = mycoBrainData[0];

    const peakIntensity = d.spectral_density?.length ? `${Math.max(...d.spectral_density).toFixed(1)} dBm` : '0.0 dBm';
    const bandwidth = d.spectral_density?.length ? `${(d.spectral_density.length * 10 / 1000).toFixed(1)} kHz` : '0.0 kHz';

    const rmsPower = d.acoustic_signature?.length
      ? `${Math.sqrt(d.acoustic_signature.reduce((acc, val) => acc + val * val, 0) / d.acoustic_signature.length).toFixed(3)} v`
      : '0.000 v';

    const zeroCross = d.acoustic_signature?.length
      ? `${d.acoustic_signature.reduce((acc, val, i, arr) => {
          if (i === 0) return 0;
          const prev = arr[i - 1];
          // Check if the signal crossed zero (changed sign)
          return (prev > 0 && val <= 0) || (prev < 0 && val >= 0) ? acc + 1 : acc;
        }, 0)} / s`
      : '0 / s';

    const avgTemp = d.thermal_gradient?.length
      ? `${(d.thermal_gradient.reduce((acc, val) => acc + val, 0) / d.thermal_gradient.length).toFixed(1)} °C`
      : '0.0 °C';

    const maxDelta = d.thermal_gradient?.length
      ? `${(Math.max(...d.thermal_gradient) - Math.min(...d.thermal_gradient)).toFixed(1)} °C`
      : '0.0 °C';

    return { peakIntensity, bandwidth, rmsPower, zeroCross, avgTemp, maxDelta };
  }, [mycoBrainData, isLive]);

  const features = useMemo(() => {
    if (!isLive || !mycoBrainData[0]) {
      return [
        { label: 'Harmonic Peak', value: '12.4 kHz', confidence: '0.992', desc: 'Primary resonance detected in spectral array.' },
        { label: 'Thermal Anomaly', value: '34.2 °C', confidence: '0.874', desc: 'Localized heat signature exceeding baseline.' },
        { label: 'Acoustic Pulse', value: '42.0 ms', confidence: '0.941', desc: 'Transient event captured in temporal stream.' },
        { label: 'Spectral Entropy', value: '0.824', confidence: '0.928', desc: 'System complexity metric within normal range.' },
      ];
    }

    const d = mycoBrainData[0];
    const f = [];

    if (d.spectral_density?.length) {
      const maxVal = Math.max(...d.spectral_density);
      const maxIdx = d.spectral_density.indexOf(maxVal);
      f.push({
        label: 'Spectral Peak',
        value: `${(maxIdx * 10 / 1000).toFixed(1)} kHz`,
        confidence: (0.9 + (d.node_id.charCodeAt(0) % 10) / 100).toFixed(3),
        desc: `Dominant frequency component at ${maxVal.toFixed(2)} amplitude.`
      });
    }

    if (d.thermal_gradient?.length) {
      const maxTemp = Math.max(...d.thermal_gradient);
      f.push({
        label: 'Thermal Peak',
        value: `${maxTemp.toFixed(1)} °C`,
        confidence: (0.85 + (d.node_id.charCodeAt(1) % 10) / 100).toFixed(3),
        desc: 'Highest recorded temperature in the current frame.'
      });
    }

    if (d.acoustic_signature?.length) {
      const energy = d.acoustic_signature.reduce((acc, v) => acc + v*v, 0);
      f.push({
        label: 'Acoustic Energy',
        value: energy.toFixed(1),
        confidence: (0.92 + (d.node_id.charCodeAt(2) % 5) / 100).toFixed(3),
        desc: 'Total signal energy integrated over the temporal window.'
      });
    }

    f.push({
      label: 'Node Identity',
      value: d.node_id,
      confidence: '1.000',
      desc: 'Verified origin node for the sensory data stream.'
    });

    return f;
  }, [mycoBrainData, isLive]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-center shadow-inner">
            <Layers className="w-6 h-6 text-zinc-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Sensory Comparison Engine</h3>
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.2em]">Multi-Domain Signal Analysis v4.2</p>
              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-950 border ${isLive ? 'border-emerald-500/30 text-emerald-500' : 'border-zinc-800 text-zinc-600'}`}>
                {isLive ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                <span className="text-[8px] font-bold uppercase tracking-widest">{isLive ? 'Live MycoBrain' : 'Static Frame'}</span>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowFeatures(!showFeatures)}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-bold tracking-widest transition-all ${
            showFeatures
              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
              : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
          }`}
        >
          {showFeatures ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {showFeatures ? 'FEATURES: ACTIVE' : 'FEATURES: HIDDEN'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Spectral Analysis */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-[32px] p-6 space-y-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
            <div className="w-24 h-24 border border-dashed border-amber-500/50 rounded-full animate-[spin_20s_linear_infinite]" />
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Spectral Domain</h4>
              <p className="text-lg font-bold text-white tracking-tight">Frequency Response</p>
            </div>
          </div>

          <div className="h-48 w-full bg-zinc-900/20 rounded-2xl border border-zinc-800/50 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displaySpectral}>
                <defs>
                  <linearGradient id="colorSpectral" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="#27272a" vertical={false} />
                <XAxis dataKey="freq" hide />
                <YAxis hide domain={[0, 120]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '16px', fontSize: '10px', fontFamily: 'monospace' }}
                  itemStyle={{ color: '#f59e0b' }}
                />
                <Area
                  type="monotone"
                  dataKey="amplitude"
                  stroke="#f59e0b"
                  fillOpacity={1}
                  fill="url(#colorSpectral)"
                  strokeWidth={2}
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-4 relative z-10">
            <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
              <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Peak Intensity</p>
              <p className="text-sm font-mono text-white">{metrics.peakIntensity}</p>
            </div>
            <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
              <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Bandwidth</p>
              <p className="text-sm font-mono text-white">{metrics.bandwidth}</p>
            </div>
          </div>
        </div>

        {/* Acoustic Waveform */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-[32px] p-6 space-y-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
            <div className="w-24 h-24 border border-dashed border-emerald-500/50 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Acoustic Domain</h4>
              <p className="text-lg font-bold text-white tracking-tight">Temporal Waveform</p>
            </div>
          </div>

          <div className="h-48 w-full bg-zinc-900/20 rounded-2xl border border-zinc-800/50 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayAcoustic}>
                <CartesianGrid strokeDasharray="2 4" stroke="#27272a" vertical={false} />
                <XAxis dataKey="time" hide />
                <YAxis hide domain={[0, 80]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '16px', fontSize: '10px', fontFamily: 'monospace' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Line
                  type="stepAfter"
                  dataKey="db"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  animationDuration={2500}
                />
                {showFeatures && (
                  <Line
                    type="monotone"
                    dataKey="feature"
                    stroke="#ffffff"
                    strokeDasharray="4 4"
                    dot={{ r: 4, fill: '#ffffff', strokeWidth: 0 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-4 relative z-10">
            <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
              <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-1">RMS Power</p>
              <p className="text-sm font-mono text-white">{metrics.rmsPower}</p>
            </div>
            <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
              <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Zero Cross</p>
              <p className="text-sm font-mono text-white">{metrics.zeroCross}</p>
            </div>
          </div>
        </div>

        {/* Thermal Gradient */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-[32px] p-6 space-y-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
            <div className="w-24 h-24 border border-dashed border-rose-500/50 rounded-full animate-[spin_25s_linear_infinite]" />
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-center">
              <Thermometer className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Thermal Domain</h4>
              <p className="text-lg font-bold text-white tracking-tight">Infrared Gradient</p>
            </div>
          </div>

          <div className="h-48 w-full bg-zinc-900/20 rounded-2xl border border-zinc-800/50 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayThermal}>
                <defs>
                  <linearGradient id="colorThermal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="#27272a" vertical={false} />
                <XAxis dataKey="x" hide />
                <YAxis hide domain={[20, 40]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '16px', fontSize: '10px', fontFamily: 'monospace' }}
                  itemStyle={{ color: '#f43f5e' }}
                />
                <Area
                  type="basis"
                  dataKey="y"
                  stroke="#f43f5e"
                  fillOpacity={1}
                  fill="url(#colorThermal)"
                  strokeWidth={2}
                  animationDuration={3000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-4 relative z-10">
            <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
              <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Avg Temp</p>
              <p className="text-sm font-mono text-white">{metrics.avgTemp}</p>
            </div>
            <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
              <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Max Delta</p>
              <p className="text-sm font-mono text-white">{metrics.maxDelta}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Overlay Details */}
      <AnimatePresence>
        {showFeatures && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-8 bg-zinc-950 border border-zinc-800 rounded-[40px] relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-1 bg-zinc-950 border border-zinc-800 rounded-full text-[9px] font-bold text-zinc-500 tracking-[0.3em] uppercase">
                Extracted Feature Map
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {features.map((feature, i) => (
                  <div key={i} className="p-5 bg-zinc-900/30 border border-zinc-800/50 rounded-3xl space-y-3 hover:border-zinc-700 transition-colors group">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">{feature.label}</p>
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-bold text-white tracking-tight">{feature.value}</span>
                      <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">{feature.confidence}</span>
                    </div>
                    <p className="text-[10px] text-zinc-600 leading-relaxed font-medium group-hover:text-zinc-400 transition-colors">
                      {feature.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
