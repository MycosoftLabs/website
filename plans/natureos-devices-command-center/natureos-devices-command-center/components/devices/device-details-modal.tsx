'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import type { Device } from '@/lib/devices/types';
import { statusIntent, statusLabel } from '@/lib/devices/metrics';

export function DeviceDetailsModal(props: { device: Device | null; onClose: () => void }) {
  React.useEffect(() => {
    if (!props.device) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [props.device, props.onClose]);

  return (
    <AnimatePresence>
      {props.device ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center md:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.button
            aria-label="Close modal"
            className="absolute inset-0 bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={props.onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 28, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="relative w-full max-w-2xl cc-surface-strong border border-white/15 rounded-t-2xl md:rounded-2xl p-5 md:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="cc-font-orbitron text-xs uppercase tracking-[0.28em] text-white/75">
                  Device Details
                </div>
                <div className="cc-font-orbitron mt-2 text-xl uppercase tracking-[0.18em] text-white truncate">
                  {props.device.name}
                </div>
                <div className="cc-font-ui mt-1 text-sm text-white/60 truncate">{props.device.model ?? '—'}</div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <StatusChip status={props.device.status} />
                <button
                  onClick={props.onClose}
                  className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs cc-font-mono text-white/80 hover:bg-white/10 hover:border-white/20 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              <DetailRow label="Type" value={prettyType(props.device.type)} />
              <DetailRow label="IP" value={props.device.ip ?? '—'} mono />
              <DetailRow label="MAC" value={props.device.mac ?? '—'} mono />
              <DetailRow
                label="Latency"
                value={props.device.metrics?.latencyMs != null ? `${props.device.metrics.latencyMs} ms` : '—'}
                mono
              />

              <DetailRow label="CPU" value={props.device.metrics?.cpuPct != null ? `${Math.round(props.device.metrics.cpuPct)}%` : '—'} mono />
              <DetailRow label="Memory" value={props.device.metrics?.memPct != null ? `${Math.round(props.device.metrics.memPct)}%` : '—'} mono />
              <DetailRow label="Temp" value={props.device.metrics?.tempC != null ? `${props.device.metrics.tempC.toFixed(1)}°C` : '—'} mono />
              <DetailRow label="Humidity" value={props.device.metrics?.humidityPct != null ? `${Math.round(props.device.metrics.humidityPct)}%` : '—'} mono />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Action label="Configure" intent="neutral" onClick={() => console.log('TODO configure', props.device?.id)} />
              <Action label="Restart" intent="bad" onClick={() => console.log('TODO restart', props.device?.id)} />
              <Action label="View Telemetry" intent="good" onClick={() => console.log('TODO telemetry', props.device?.id)} />
              <Action label="Open Logs" intent="warn" onClick={() => console.log('TODO logs', props.device?.id)} />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function StatusChip(props: { status: Device['status'] }) {
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
    <span className={`inline-flex items-center gap-2 rounded-full border ${border} ${bg} px-3 py-1 text-xs`}> 
      <span className={`h-2 w-2 rounded-full ${dot} ${props.status === 'online' ? 'cc-pulse' : ''}`} />
      <span className="cc-font-mono tracking-[0.18em]">{statusLabel(props.status)}</span>
    </span>
  );
}

function DetailRow(props: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 px-3 py-2">
      <div className="cc-font-ui text-[11px] text-white/55">{props.label}</div>
      <div className={`${props.mono ? 'cc-font-mono' : 'cc-font-ui'} mt-1 text-sm text-white/80`}>{props.value}</div>
    </div>
  );
}

function Action(props: { label: string; intent: 'neutral' | 'good' | 'warn' | 'bad'; onClick: () => void }) {
  const cls =
    props.intent === 'good'
      ? 'border-emerald-400/25 bg-emerald-400/10 hover:bg-emerald-400/15'
      : props.intent === 'warn'
        ? 'border-amber-400/25 bg-amber-400/10 hover:bg-amber-400/15'
        : props.intent === 'bad'
          ? 'border-red-400/25 bg-red-400/10 hover:bg-red-400/15'
          : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20';

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

function prettyType(t: string) {
  return t.replaceAll('_', ' ');
}
