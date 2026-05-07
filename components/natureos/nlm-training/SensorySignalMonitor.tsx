'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, Thermometer, Droplets, Wind, Sun, Zap } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { useMycoBrainData } from '@/lib/nlm/supabase-hooks';

interface Signal {
  id: string;
  name: string;
  unit: string;
  icon: any;
  color: string;
  baseValue: number;
  variance: number;
}

const SIGNALS: Signal[] = [
  { id: 'potential', name: 'Mycelial Potential', unit: 'mV', icon: Zap, color: '#10b981', baseValue: -45, variance: 5 },
  { id: 'moisture', name: 'Substrate Moisture', unit: '%', icon: Droplets, color: '#3b82f6', baseValue: 68, variance: 2 },
  { id: 'co2', name: 'CO2 Concentration', unit: 'ppm', icon: Wind, color: '#a855f7', baseValue: 420, variance: 15 },
  { id: 'temp', name: 'Ambient Temp', unit: '°C', icon: Thermometer, color: '#f59e0b', baseValue: 24.2, variance: 0.5 },
  { id: 'light', name: 'Light Intensity', unit: 'lux', icon: Sun, color: '#facc15', baseValue: 1200, variance: 100 },
  { id: 'voc', name: 'VOC Levels', unit: 'ppb', icon: Activity, color: '#ec4899', baseValue: 12, variance: 2 },
];

export function SensorySignalMonitor({ isTraining }: { isTraining: boolean }) {
  const { data: mycoBrainData } = useMycoBrainData();
  const [data, setData] = useState<any[]>([]);
  const [currentValues, setCurrentValues] = useState<Record<string, number>>({});
  const [isStressTesting, setIsStressTesting] = useState(false);

  const triggerStressTest = () => {
    setIsStressTesting(true);
    setTimeout(() => setIsStressTesting(false), 5000);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const latestEntry = mycoBrainData && mycoBrainData.length > 0 ? mycoBrainData[0] : null;
      const newValues: Record<string, number> = {};

      SIGNALS.forEach(s => {
        let val = s.baseValue;

        // Use real data if available
        if (latestEntry) {
          if (s.id === 'temp' && latestEntry.thermal_gradient && latestEntry.thermal_gradient.length) {
            val = latestEntry.thermal_gradient.reduce((a, b) => a + b, 0) / latestEntry.thermal_gradient.length;
          } else if (s.id === 'potential' && latestEntry.acoustic_signature && latestEntry.acoustic_signature.length) {
            // Derive potential from acoustic RMS as a proxy
            val = -45 + Math.sqrt(latestEntry.acoustic_signature.reduce((a, b) => a + b * b, 0) / latestEntry.acoustic_signature.length) * 10;
          } else if (s.id === 'voc' && latestEntry.spectral_density && latestEntry.spectral_density.length) {
            val = Math.max(...latestEntry.spectral_density) / 10;
          }
        }

        const multiplier = isStressTesting ? 5 : 1;
        const noise = (Math.random() - 0.5) * s.variance * multiplier;
        const drift = Math.sin(Date.now() / 5000) * (s.variance / 2);
        newValues[s.id] = Number((val + noise + drift).toFixed(2));
      });

      setCurrentValues(newValues);
      setData(prev => {
        const newData = [...prev, { timestamp, ...newValues }];
        return newData.slice(-20); // Keep last 20 points for sparklines
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isStressTesting, mycoBrainData]);

  return (
    <>
      <div className="absolute top-8 right-8 z-20">
        <button
          onClick={triggerStressTest}
          disabled={isStressTesting}
          className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
            isStressTesting
              ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse'
              : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-white'
          }`}
        >
          {isStressTesting ? 'Stress Test Active' : 'Trigger Signal Stress Test'}
        </button>
      </div>
      <div className="absolute inset-x-8 bottom-8 z-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {SIGNALS.map((signal) => (
        <motion.div
          key={signal.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-950/80 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 space-y-3 group hover:border-zinc-600 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800 group-hover:border-zinc-700 transition-colors">
              <signal.icon className="w-4 h-4" style={{ color: signal.color }} />
            </div>
            <div className="h-6 w-16 opacity-50">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <Line
                    type="monotone"
                    dataKey={signal.id}
                    stroke={signal.color}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{signal.name}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-mono font-bold text-white">
                {currentValues[signal.id] || signal.baseValue}
              </span>
              <span className="text-[10px] font-mono text-zinc-600">{signal.unit}</span>
            </div>
          </div>

          {isTraining && (
            <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
              <motion.div
                animate={{
                  width: ['20%', '80%', '40%', '90%', '30%'],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="h-full"
                style={{ backgroundColor: signal.color }}
              />
            </div>
          )}
        </motion.div>
      ))}
    </div>
    </>
  );
}
