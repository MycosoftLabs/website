'use client';

import * as React from 'react';
import { motion } from 'framer-motion';

import type { Device } from '@/lib/devices/types';
import { statusLabel } from '@/lib/devices/metrics';

import { DeviceCard3DIcon } from './device-card-3d';

export function MycoBrainPanel(props: { devices: Device[]; onSelect: (d: Device) => void }) {
  if (!props.devices.length) {
    return (
      <div className="cc-surface px-6 py-10 text-sm text-white/60">
        No MycoBrain devices detected.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {props.devices.map((d, idx) => (
        <motion.div
          key={d.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: idx * 0.05, ease: 'easeOut' }}
          className="cc-surface cc-sheen px-5 py-5"
          onClick={() => props.onSelect(d)}
          role="button"
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <div className="h-24 w-24 rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
                <DeviceCard3DIcon type="mycobrain" />
              </div>

              <div className="min-w-0">
                <div className="cc-font-orbitron text-sm uppercase tracking-[0.28em] text-white/85">⚡ MycoBrain Device</div>
                <div className="cc-font-orbitron mt-2 text-xl uppercase tracking-[0.18em] text-white">{d.name}</div>
                <div className="cc-font-ui mt-2 text-sm text-white/60">{d.model ?? 'ESP32'}</div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 cc-pulse" />
                    <span className="cc-font-mono tracking-[0.18em]">{statusLabel(d.status)}</span>
                  </span>

                  {d.metrics?.uptimeSec != null ? (
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs cc-font-mono text-white/70">
                      Uptime: {formatUptime(d.metrics.uptimeSec)}
                    </span>
                  ) : null}

                  {d.ip ? (
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs cc-font-mono text-white/70">
                      {d.ip}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="cc-surface-strong px-4 py-4 md:min-w-[320px]">
              <div className="cc-font-orbitron text-xs uppercase tracking-[0.28em] text-white/80">Sensors</div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                <SensorRow label="🌡️ Temp" value={d.metrics?.tempC != null ? `${d.metrics.tempC.toFixed(1)}°C` : '—'} />
                <SensorRow label="💧 Humidity" value={d.metrics?.humidityPct != null ? `${Math.round(d.metrics.humidityPct)}%` : '—'} />
                <SensorRow label="⚡ Power" value={d.metrics?.powerV != null ? `${d.metrics.powerV.toFixed(1)}V` : '—'} />
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <MycoButton label="Configure" onClick={() => console.log('TODO configure', d.id)} />
            <MycoButton label="Reboot" onClick={() => console.log('TODO reboot', d.id)} />
            <MycoButton label="View Logs" onClick={() => console.log('TODO logs', d.id)} />
            <MycoButton label="Telemetry" onClick={() => console.log('TODO telemetry', d.id)} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function SensorRow(props: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-white/10 bg-black/20 px-3 py-2">
      <div className="cc-font-ui text-xs text-white/70">{props.label}</div>
      <div className="cc-font-mono text-xs text-white/80">{props.value}</div>
    </div>
  );
}

function MycoButton(props: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        props.onClick();
      }}
      className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs cc-font-mono text-white/80 hover:bg-white/10 hover:border-white/20 transition-colors"
    >
      {props.label}
    </button>
  );
}

function formatUptime(uptimeSec: number) {
  const d = Math.floor(uptimeSec / 86400);
  const h = Math.floor((uptimeSec % 86400) / 3600);
  const m = Math.floor((uptimeSec % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}
