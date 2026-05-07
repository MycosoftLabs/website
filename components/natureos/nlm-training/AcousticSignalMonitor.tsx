'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Zap, BarChart3, Info } from 'lucide-react';

interface AcousticSignalMonitorProps {
  activeHydrophoneId: string;
}

export function AcousticSignalMonitor({ activeHydrophoneId }: AcousticSignalMonitorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [metrics, setMetrics] = useState({
    rms: 0,
    peak: 0,
    snr: 0,
    centroid: 0
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const bufferSize = 200;
    const data = new Array(bufferSize).fill(0);

    const render = () => {
      // Generate mock raw data
      const newValue = (Math.random() - 0.5) * 2 * (0.5 + Math.sin(Date.now() / 500) * 0.5);
      data.push(newValue);
      if (data.length > bufferSize) data.shift();

      // Update metrics
      const rms = Math.sqrt(data.reduce((acc, val) => acc + val * val, 0) / data.length);
      const peak = Math.max(...data.map(Math.abs));

      setMetrics({
        rms: parseFloat((rms * 100).toFixed(2)),
        peak: parseFloat((peak * 100).toFixed(2)),
        snr: parseFloat((20 + Math.random() * 10).toFixed(1)),
        centroid: Math.floor(400 + Math.random() * 200)
      });

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < canvas.width; i += 40) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
      }
      for (let i = 0; i < canvas.height; i += 40) {
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
      }
      ctx.stroke();

      // Draw center line
      ctx.strokeStyle = '#3f3f46';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // Draw waveform
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const step = canvas.width / (bufferSize - 1);
      for (let i = 0; i < data.length; i++) {
        const x = i * step;
        const y = (canvas.height / 2) + (data[i] * (canvas.height / 2.5));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Add glow effect
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#10b981';
      ctx.stroke();
      ctx.shadowBlur = 0;

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Raw Signal Monitor</h3>
            <p className="text-[10px] text-zinc-500 font-mono">
              SOURCE: {activeHydrophoneId} {"//"} RAW_PCM_STREAM
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 font-bold uppercase">Sample Rate</span>
            <span className="text-[10px] text-white font-mono">48.0 kHz</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 font-bold uppercase">Bit Depth</span>
            <span className="text-[10px] text-white font-mono">24-bit</span>
          </div>
        </div>
      </div>

      <div className="relative group">
        <canvas
          ref={canvasRef}
          width={800}
          height={200}
          className="w-full h-[200px] bg-black/40 rounded-2xl border border-zinc-800/50"
        />
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <div className="px-2 py-1 bg-black/60 backdrop-blur-md border border-zinc-800 rounded text-[10px] font-mono text-emerald-500">
            GAIN: +12dB
          </div>
          <div className="px-2 py-1 bg-black/60 backdrop-blur-md border border-zinc-800 rounded text-[10px] font-mono text-emerald-500">
            FILTER: 20Hz-20kHz
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'RMS Level', value: `${metrics.rms}%`, icon: Zap, color: 'text-blue-400' },
          { label: 'Peak Level', value: `${metrics.peak}%`, icon: Activity, color: 'text-emerald-400' },
          { label: 'SNR Ratio', value: `${metrics.snr} dB`, icon: BarChart3, color: 'text-amber-400' },
          { label: 'Spectral Centroid', value: `${metrics.centroid} Hz`, icon: Info, color: 'text-purple-400' },
        ].map((metric, i) => (
          <div key={i} className="p-4 bg-black/20 border border-zinc-800 rounded-2xl space-y-2">
            <div className="flex items-center gap-2">
              <metric.icon className={`w-3 h-3 ${metric.color}`} />
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{metric.label}</span>
            </div>
            <p className="text-xl font-mono text-white">{metric.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
