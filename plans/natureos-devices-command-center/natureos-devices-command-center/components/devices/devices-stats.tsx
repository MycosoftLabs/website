'use client';

import * as React from 'react';
import { animate, motion, useInView, useMotionValue, useTransform } from 'framer-motion';

import type { CommandCenterStats } from '@/lib/devices/metrics';

export function DevicesStats(props: { stats: CommandCenterStats }) {
  const stats = props.stats;

  return (
    <div className="mt-8">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <StatCard title="Total Devices" subtitle="Infrastructure" value={stats.devices} suffix="" accent="cyan" />
        <StatCard title="Clients" subtitle="Connected endpoints" value={stats.clients} suffix="" accent="white" />
        <StatCard
          title="Average Latency"
          subtitle="Round-trip"
          value={stats.avgLatencyMs ?? 0}
          suffix={stats.avgLatencyMs != null ? 'ms' : '—'}
          accent="purple"
          showDash={stats.avgLatencyMs == null}
        />
        <StatCard
          title="Network Health"
          subtitle="Weighted status"
          value={stats.healthPct ?? 0}
          suffix={stats.healthPct != null ? '%' : '—'}
          accent="green"
          showDash={stats.healthPct == null}
        />
      </div>
    </div>
  );
}

function StatCard(props: {
  title: string;
  subtitle: string;
  value: number;
  suffix: string;
  accent: 'white' | 'cyan' | 'purple' | 'green';
  showDash?: boolean;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { amount: 0.35, once: true });

  const mv = useMotionValue(0);
  const formatted = useTransform(mv, (v) => {
    if (props.showDash) return '—';
    // keep ints clean, allow one decimal for latency
    const isInt = Math.abs(v - Math.round(v)) < 0.0001;
    return isInt ? String(Math.round(v)) : String(Math.round(v * 10) / 10);
  });

  React.useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, props.value, { duration: 0.9, ease: 'easeOut' });
    return () => controls.stop();
  }, [inView, mv, props.value]);

  const accent =
    props.accent === 'cyan'
      ? 'shadow-[0_0_40px_rgba(6,182,212,0.18)]'
      : props.accent === 'purple'
        ? 'shadow-[0_0_40px_rgba(139,92,246,0.18)]'
        : props.accent === 'green'
          ? 'shadow-[0_0_40px_rgba(34,197,94,0.18)]'
          : 'shadow-[0_0_40px_rgba(255,255,255,0.10)]';

  const topLine =
    props.accent === 'cyan'
      ? 'bg-cyan-300/70'
      : props.accent === 'purple'
        ? 'bg-violet-400/70'
        : props.accent === 'green'
          ? 'bg-emerald-400/70'
          : 'bg-white/60';

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`cc-surface cc-sheen ${accent} px-5 py-4`}
    >
      <div className={`h-[2px] w-16 rounded-full ${topLine}`} aria-hidden="true" />

      <div className="mt-3">
        <div className="cc-font-orbitron text-xs uppercase tracking-[0.22em] text-white/80">{props.title}</div>
        <div className="cc-font-ui mt-1 text-xs text-white/60">{props.subtitle}</div>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <motion.span className="cc-font-mono text-3xl text-white">{formatted}</motion.span>
        <span className="cc-font-mono text-sm text-white/70">{props.suffix}</span>
      </div>
    </motion.div>
  );
}
