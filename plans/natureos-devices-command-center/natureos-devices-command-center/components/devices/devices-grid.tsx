'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import type { Device, DeviceStatus } from '@/lib/devices/types';

import { DeviceCard } from './device-card';

export function DevicesGrid(props: { devices: Device[]; onSelect: (d: Device) => void }) {
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState<DeviceStatus | 'all'>('all');

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return props.devices.filter((d) => {
      const matchesQ = !q
        || d.name.toLowerCase().includes(q)
        || (d.model ?? '').toLowerCase().includes(q)
        || (d.ip ?? '').toLowerCase().includes(q)
        || (d.tags ?? []).some((t) => t.toLowerCase().includes(q));

      const matchesStatus = status === 'all' || d.status === status;
      return matchesQ && matchesStatus;
    });
  }, [props.devices, query, status]);

  return (
    <div>
      <div className="cc-surface px-4 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="cc-font-orbitron text-xs uppercase tracking-[0.28em] text-white/80">Devices</div>
            <div className="cc-font-mono text-xs text-white/60">{filtered.length} shown</div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, model, IP, tags..."
              className="w-full md:w-72 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/85 outline-none placeholder:text-white/35 focus:border-white/25"
            />

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/85 outline-none focus:border-white/25"
            >
              <option value="all">All statuses</option>
              <option value="online">Online</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
              <option value="offline">Offline</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        </div>
      </div>

      <motion.div
        className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 1 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.06 },
          },
        }}
      >
        <AnimatePresence>
          {filtered.map((d) => (
            <motion.div
              key={d.id}
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              layout
            >
              <DeviceCard device={d} onSelect={() => props.onSelect(d)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
