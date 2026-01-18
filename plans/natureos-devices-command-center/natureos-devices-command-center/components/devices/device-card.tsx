'use client';

import * as React from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

import type { Device } from '@/lib/devices/types';
import { statusIntent, statusLabel } from '@/lib/devices/metrics';

import { DeviceCard3DIcon } from './device-card-3d';

export function DeviceCard(props: { device: Device; onSelect: () => void }) {
  const { device } = props;

  // --- Tilt ---
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const rX = useSpring(tiltX, { stiffness: 180, damping: 18 });
  const rY = useSpring(tiltY, { stiffness: 180, damping: 18 });
  const transform = useTransform([rX, rY], ([x, y]) => `perspective(900px) rotateX(${x}deg) rotateY(${y}deg)`);

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    // -1..1
    const dx = (px - 0.5) * 2;
    const dy = (py - 0.5) * 2;
    tiltX.set(-dy * 4);
    tiltY.set(dx * 4);
  };

  const onPointerLeave = () => {
    tiltX.set(0);
    tiltY.set(0);
  };

  // --- Swipe actions (drag) ---
  const dragX = useMotionValue(0);

  // --- Ripple ---
  const [ripple, setRipple] = React.useState<{ x: number; y: number; id: number } | null>(null);
  const rippleId = React.useRef(0);
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    rippleId.current += 1;
    const next = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      id: rippleId.current,
    };
    setRipple(next);
    window.setTimeout(() => {
      // avoid clearing a newer ripple
      setRipple((cur) => (cur?.id === next.id ? null : cur));
    }, 650);
  };

  const intent = statusIntent(device.status);
  const glow =
    intent === 'good'
      ? 'shadow-[0_0_40px_rgba(34,197,94,0.14)]'
      : intent === 'warn'
        ? 'shadow-[0_0_40px_rgba(245,158,11,0.14)]'
        : intent === 'bad'
          ? 'shadow-[0_0_40px_rgba(239,68,68,0.14)]'
          : 'shadow-[0_0_30px_rgba(255,255,255,0.08)]';

  return (
    <div className="relative">
      {/* Underlay actions (revealed on swipe) */}
      <div className="absolute inset-0 cc-surface flex items-center justify-between px-4">
        <ActionButton intent="warn" label="Configure" onClick={() => console.log('TODO: configure', device.id)} />
        <ActionButton intent="bad" label="Restart" onClick={() => console.log('TODO: restart', device.id)} />
      </div>

      {/* Foreground card */}
      <motion.div
        className={`relative cc-surface cc-sheen ${glow} px-4 py-4 select-none cursor-pointer`}
        style={{ transform, x: dragX }}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onPointerDown={onPointerDown}
        onClick={props.onSelect}
        drag="x"
        dragConstraints={{ left: -96, right: 96 }}
        dragElastic={0.18}
        whileHover={{ y: -8 }}
        whileTap={{ scale: 0.985 }}
        transition={{ duration: 0.18 }}
      >
        {/* Ripple */}
        {ripple ? (
          <span
            key={ripple.id}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/15"
            style={{ left: ripple.x, top: ripple.y, width: 12, height: 12, animation: 'ripple 600ms ease-out forwards' }}
          />
        ) : null}

        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-xl border border-white/10 bg-black/30 overflow-hidden">
            <DeviceCard3DIcon type={device.type} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="cc-font-orbitron text-sm tracking-[0.22em] uppercase text-white/90 truncate">
                  {device.name}
                </div>
                <div className="cc-font-ui mt-1 text-xs text-white/55 truncate">{device.model ?? '—'}</div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <StatusPill status={device.status} />
                {typeof device.metrics?.latencyMs === 'number' ? (
                  <Pill label={`${device.metrics.latencyMs}ms`} />
                ) : null}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {device.ip ? <Pill label={device.ip} mono /> : null}
              {device.type !== 'client' ? <Pill label={device.type.replace('_', ' ')} /> : <Pill label="client" />}
              {(device.tags ?? []).slice(0, 2).map((t) => (
                <Pill key={t} label={t} />
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <style jsx>{`
        @keyframes ripple {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.55;
          }
          100% {
            transform: translate(-50%, -50%) scale(24);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

function StatusPill(props: { status: Device['status'] }) {
  const intent = statusIntent(props.status);
  const dot =
    intent === 'good'
      ? 'bg-emerald-400'
      : intent === 'warn'
        ? 'bg-amber-400'
        : intent === 'bad'
          ? 'bg-red-400'
          : 'bg-white/60';

  const border =
    intent === 'good'
      ? 'border-emerald-400/25'
      : intent === 'warn'
        ? 'border-amber-400/25'
        : intent === 'bad'
          ? 'border-red-400/25'
          : 'border-white/15';

  const bg =
    intent === 'good'
      ? 'bg-emerald-400/10'
      : intent === 'warn'
        ? 'bg-amber-400/10'
        : intent === 'bad'
          ? 'bg-red-400/10'
          : 'bg-white/5';

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border ${border} ${bg} px-3 py-1 text-[11px]`}> 
      <span className={`h-2 w-2 rounded-full ${dot} ${props.status === 'online' ? 'cc-pulse' : ''}`} />
      <span className="cc-font-mono tracking-[0.18em]">{statusLabel(props.status)}</span>
    </span>
  );
}

function Pill(props: { label: string; mono?: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] text-white/75 ${props.mono ? 'cc-font-mono' : 'cc-font-ui'}`}> 
      {props.label}
    </span>
  );
}

function ActionButton(props: { intent: 'warn' | 'bad'; label: string; onClick: () => void }) {
  const cls =
    props.intent === 'warn'
      ? 'border-amber-400/25 bg-amber-400/10 hover:bg-amber-400/15'
      : 'border-red-400/25 bg-red-400/10 hover:bg-red-400/15';

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        props.onClick();
      }}
      className={`rounded-md border px-3 py-2 text-xs cc-font-mono text-white/85 transition-colors ${cls}`}
    >
      {props.label}
    </button>
  );
}
