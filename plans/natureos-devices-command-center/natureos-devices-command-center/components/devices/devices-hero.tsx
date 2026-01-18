'use client';

import * as React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

import type { CommandCenterStats } from '@/lib/devices/metrics';

import { ParticleBackground } from './particle-background';

export function DevicesHero(props: { stats: CommandCenterStats; isLive: boolean }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const bgY = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const bgOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.72]);

  const stats = props.stats;

  return (
    <section ref={ref} className="relative overflow-hidden">
      {/* Background layer */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ y: bgY, opacity: bgOpacity }}
      >
        {/* CSS fallback first, then video on top (if present). */}
        <div className="absolute inset-0 cc-hero-fallback" />

        <video
          className="absolute inset-0 h-full w-full object-cover opacity-55"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        >
          <source src="/videos/mycelium.mp4" type="video/mp4" />
          <source src="/videos/mycelium.webm" type="video/webm" />
        </video>
      </motion.div>

      {/* Dark overlay for readability */}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/85" />

      {/* Particle layer */}
      <div aria-hidden="true" className="absolute inset-0">
        <ParticleBackground />
      </div>

      {/* Content */}
      <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-16 md:pt-28 md:pb-20">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="cc-kicker text-xs">NatureOS • Devices</div>
            <h1 className="cc-font-orbitron mt-4 text-2xl sm:text-3xl md:text-5xl cc-heading">
              Network Command Center
            </h1>
            <p className="cc-font-ui mt-4 max-w-2xl text-sm md:text-base text-white/75">
              A neural-style command interface for discovering, monitoring, and controlling Mycosoft’s living sensor network.
            </p>

            <div className="mt-4 flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                  props.isLive
                    ? 'border-white/20 bg-white/10'
                    : 'border-white/15 bg-white/5'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${props.isLive ? 'bg-cyan-300 cc-pulse' : 'bg-white/60'}`} />
                <span className="cc-font-mono">{props.isLive ? 'LIVE DATA' : 'MOCK DATA'}</span>
              </span>

              <span className="cc-font-mono text-xs text-white/60">•</span>

              <span className="cc-font-mono text-xs text-white/60">Updated {new Date().toLocaleTimeString()}</span>
            </div>
          </div>

          <div className="hidden md:block">
            <div className="cc-surface-strong cc-sheen px-5 py-4">
              <div className="cc-font-orbitron text-xs uppercase tracking-[0.28em] text-white/80">Network Signal</div>
              <div className="mt-3 flex items-center gap-3">
                <SignalBars />
                <div className="cc-font-mono text-xs text-white/70">
                  Health: {stats.healthPct ?? '—'}%<br />
                  Avg latency: {stats.avgLatencyMs ?? '—'}ms
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hero stats cards */}
        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
          <HeroStat label="Devices" value={stats.devices} />
          <HeroStat label="Clients" value={stats.clients} />
          <HeroStat label="Latency" value={stats.avgLatencyMs ?? '—'} suffix={stats.avgLatencyMs != null ? 'ms' : ''} />
          <HeroStat label="Health" value={stats.healthPct ?? '—'} suffix={stats.healthPct != null ? '%' : ''} />
        </div>

        <div className="mt-10 flex justify-center">
          <ScrollIndicator />
        </div>
      </div>
    </section>
  );
}

function HeroStat(props: { label: string; value: number | string; suffix?: string }) {
  return (
    <div className="cc-surface cc-sheen px-4 py-3">
      <div className="cc-font-orbitron text-[10px] uppercase tracking-[0.28em] text-white/70">{props.label}</div>
      <div className="cc-font-mono mt-2 text-xl md:text-2xl text-white">
        {props.value}
        {props.suffix ? <span className="ml-1 text-sm text-white/70">{props.suffix}</span> : null}
      </div>
    </div>
  );
}

function ScrollIndicator() {
  return (
    <div className="flex flex-col items-center gap-2 text-white/60">
      <div className="text-[10px] uppercase tracking-[0.28em]">Scroll</div>
      <div className="relative h-10 w-6 rounded-full border border-white/20">
        <motion.div
          className="absolute left-1/2 top-2 h-2 w-1 -translate-x-1/2 rounded-full bg-white/70"
          animate={{ y: [0, 16, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}

function SignalBars() {
  return (
    <div className="flex items-end gap-1" aria-hidden="true">
      {[8, 14, 22, 30].map((h, i) => (
        <motion.div
          key={i}
          className="w-2 rounded-sm bg-white/60"
          style={{ height: h }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.2 + i * 0.15, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}
