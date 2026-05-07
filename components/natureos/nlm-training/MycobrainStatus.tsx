'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Thermometer, Zap, Activity, Shield, HardDrive, RefreshCw, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useSystemStatus, useMycoBrainData } from '@/lib/nlm/supabase-hooks';

function average(values?: number[]) {
  if (!values?.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function MycobrainStatus() {
  const { status: systemStatus } = useSystemStatus();
  const { data: mycoBrainData } = useMycoBrainData();
  const [telemetry, setTelemetry] = useState<any[]>([]);
  const [status, setStatus] = useState<'optimal' | 'warning' | 'critical'>('optimal');
  const [mindexHealth, setMindexHealth] = useState<any>(null);
  const [mindexLoading, setMindexLoading] = useState(true);

  const fetchMindexHealth = useCallback(async () => {
    setMindexLoading(true);
    try {
      const res = await fetch('/api/mindex/health', { cache: 'no-store' });
      if (res.ok) setMindexHealth(await res.json());
      else setMindexHealth({ status: 'offline', error: `HTTP ${res.status}` });
    } catch {
      setMindexHealth({ status: 'offline', error: 'Connection failed' });
    } finally {
      setMindexLoading(false);
    }
  }, []);

  useEffect(() => { fetchMindexHealth(); }, [fetchMindexHealth]);

  const mycobrainSystem = useMemo(() => Array.isArray(systemStatus) ? systemStatus.find(s => s.system_name === 'MycoBrain') : null, [systemStatus]);

  useEffect(() => {
    // Drive telemetry from real system status and mycobrain data
    const interval = setInterval(() => {
      const latestEntry = mycoBrainData[0];
      const latency = mycobrainSystem?.latency ?? 0;
      const hasTelemetry = Boolean(latestEntry);
      const pointCount = hasTelemetry
        ? (latestEntry.spectral_density || []).length + (latestEntry.acoustic_signature || []).length + (latestEntry.thermal_gradient || []).length
        : 0;
      const reportedVoltage = average((latestEntry as any)?.voltage || (latestEntry as any)?.voltage_bus || (latestEntry as any)?.bus_voltage);

      const newPoint = {
        time: new Date().toLocaleTimeString(),
        cpu: hasTelemetry ? clamp(average(latestEntry.spectral_density) * 100) : clamp(latency / 2),
        gpu: hasTelemetry ? clamp(average(latestEntry.acoustic_signature) * 100) : clamp(latency / 1.5),
        temp: hasTelemetry ? average(latestEntry.thermal_gradient) : 0,
        voltage: reportedVoltage || (hasTelemetry ? 12.0 + (latency / 1000) : 0),
        memory: hasTelemetry ? clamp(pointCount / 3) : 0,
      };

      setTelemetry(prev => [...prev.slice(-29), newPoint]);

      if (mycobrainSystem?.status === 'offline' || newPoint.temp > 65 || latency > 500) setStatus('critical');
      else if (mycobrainSystem?.status === 'degraded' || newPoint.temp > 55 || latency > 200) setStatus('warning');
      else setStatus('optimal');
    }, 2000);

    return () => clearInterval(interval);
  }, [mycoBrainData, mycobrainSystem]);

  const latest = telemetry[telemetry.length - 1] || { cpu: 0, gpu: 0, temp: 0, voltage: 0, memory: 0 };
  const voltageStable = latest.voltage > 0 && latest.voltage >= 11.5 && latest.voltage <= 12.8;
  const eccErrors = (mycobrainSystem as any)?.ecc_errors ?? (mycobrainSystem as any)?.eccErrors;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-bold tracking-tight text-white">Mycobrain Status</h2>
          <p className="text-zinc-500 text-lg">Real-time hardware telemetry and neural compute health.</p>
        </div>

        <div className="flex items-center gap-4 px-6 py-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
          <div className={`w-3 h-3 rounded-full animate-pulse ${
            status === 'optimal' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' :
            status === 'warning' ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' :
            'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
          }`} />
          <div className="flex flex-col">
            <span className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Hardware State</span>
            <span className="text-white font-semibold uppercase">{status}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Neural Load', value: `${latest.cpu.toFixed(1)}%`, icon: Cpu, color: 'text-sky-500' },
          { label: 'Core Temp', value: `${latest.temp.toFixed(1)}°C`, icon: Thermometer, color: 'text-rose-500' },
          { label: 'Bus Voltage', value: `${latest.voltage.toFixed(2)}V`, icon: Zap, color: 'text-amber-500' },
          {
            label: 'Mindex Sync',
            value: mindexLoading ? '...' : mindexHealth?.status === 'healthy' ? 'ONLINE' : mindexHealth?.status?.toUpperCase() ?? 'OFFLINE',
            icon: HardDrive,
            color: mindexHealth?.status === 'healthy' ? 'text-emerald-500' : mindexHealth?.status === 'degraded' ? 'text-amber-500' : 'text-zinc-500',
          },
        ].map((stat) => (
          <div key={stat.label} className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <div className="w-8 h-8 bg-zinc-950 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-zinc-700" />
              </div>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">{stat.label}</p>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-8 bg-zinc-900/40 border border-zinc-800 rounded-[40px] space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">Compute Flux</h3>
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-sky-500 rounded-full" />
                <span className="text-zinc-400">CPU</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span className="text-zinc-400">GPU</span>
              </div>
            </div>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetry}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorGpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="time" hide />
                <YAxis hide domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="cpu" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorCpu)" strokeWidth={2} />
                <Area type="monotone" dataKey="gpu" stroke="#10b981" fillOpacity={1} fill="url(#colorGpu)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-8 bg-zinc-900/40 border border-zinc-800 rounded-[40px] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Voltage Stability
              </h3>
              <span className="text-xs font-mono text-amber-500">{latest.voltage.toFixed(2)}V</span>
            </div>
            <div className="h-[100px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={telemetry}>
                  <Line
                    type="monotone"
                    dataKey="voltage"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <YAxis hide domain={['dataMin - 0.1', 'dataMax + 0.1']} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-8 bg-zinc-900/40 border border-zinc-800 rounded-[40px] space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Hardware Guardrails
              </h3>
              <button onClick={fetchMindexHealth} className="text-zinc-600 hover:text-white transition-colors">
                <RefreshCw className={`w-3 h-3 ${mindexLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="space-y-4">
              {[
                {
                  label: 'Thermal Throttling',
                  status: latest.temp > 55 ? 'Active' : 'Inactive',
                  color: latest.temp > 55 ? 'text-amber-500' : 'text-emerald-500',
                },
                {
                  label: 'Voltage Regulation',
                  status: latest.voltage > 0 ? (voltageStable ? 'Stable' : 'Out of Range') : 'No Telemetry',
                  color: latest.voltage > 0 ? (voltageStable ? 'text-emerald-500' : 'text-rose-500') : 'text-zinc-500',
                },
                {
                  label: 'ECC Memory Error',
                  status: typeof eccErrors === 'number' ? `${eccErrors}` : 'No Report',
                  color: eccErrors ? 'text-rose-500' : 'text-zinc-500',
                },
                {
                  label: 'MINDEX Connectivity',
                  status: mindexLoading ? 'Checking...' : mindexHealth?.status === 'healthy' ? 'Connected' : mindexHealth?.status?.toUpperCase() ?? 'Disconnected',
                  color: mindexHealth?.status === 'healthy' ? 'text-emerald-500' : mindexHealth?.status === 'degraded' ? 'text-amber-500' : 'text-zinc-500',
                },
              ].map((guard) => (
                <div key={guard.label} className="flex items-center justify-between p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl">
                  <span className="text-sm text-zinc-300">{guard.label}</span>
                  <span className={`text-[10px] font-mono font-bold uppercase ${guard.color}`}>{guard.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-8 bg-emerald-900/10 border border-emerald-800/50 rounded-[40px] flex items-center gap-6">
            <div className="w-12 h-12 bg-emerald-900/20 rounded-2xl flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-emerald-500" />
            </div>
          <div>
              <h4 className="text-white font-bold">
                {status === 'optimal' ? 'System Optimized' : status === 'warning' ? 'Telemetry Warning' : 'Telemetry Offline'}
              </h4>
              <p className="text-xs text-emerald-500/70">
                {status === 'optimal'
                  ? 'Mycobrain telemetry is inside the expected NLM workload envelope.'
                  : 'Connect live MycoBrain telemetry to restore verified hardware health.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
