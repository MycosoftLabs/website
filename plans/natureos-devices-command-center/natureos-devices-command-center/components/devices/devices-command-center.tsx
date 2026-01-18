'use client';

import * as React from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';

import type { Device, DevicesSnapshot } from '@/lib/devices/types';
import { computeStats } from '@/lib/devices/metrics';

import { DevicesHero } from './devices-hero';
import { DevicesStats } from './devices-stats';
import { DevicesGrid } from './devices-grid';
import { NetworkTopology } from './network-topology';
import { MycoBrainPanel } from './mycobrain-panel';
import { DeviceDetailsModal } from './device-details-modal';

type TabKey = 'devices' | 'clients' | 'mycobrain';
type ViewMode = 'grid' | 'topology';

export function DevicesCommandCenter(props: { initialSnapshot: DevicesSnapshot }) {
  const [tab, setTab] = React.useState<TabKey>('devices');
  const [viewMode, setViewMode] = React.useState<ViewMode>('grid');
  const [selected, setSelected] = React.useState<Device | null>(null);

  const snapshot = props.initialSnapshot;
  const devices = snapshot.devices;
  const stats = React.useMemo(() => computeStats(devices), [devices]);

  const isLive = snapshot.source === 'live';

  const { scrollY } = useScroll();
  const [stickyVisible, setStickyVisible] = React.useState(false);
  useMotionValueEvent(scrollY, 'change', (y) => {
    setStickyVisible(y > 520);
  });

  const clients = React.useMemo(() => devices.filter((d) => d.type === 'client'), [devices]);
  const infra = React.useMemo(() => devices.filter((d) => d.type !== 'client'), [devices]);

  return (
    <div className="cc-page">
      {/* Sticky header */}
      <AnimatePresence>
        {stickyVisible && (
          <motion.div
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.22 }}
            className="fixed left-0 right-0 top-0 z-50 px-4 py-3"
          >
            <div className="mx-auto flex max-w-6xl items-center justify-between cc-surface-strong px-4 py-2">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-white cc-pulse" aria-hidden="true" />
                <div className="text-xs uppercase tracking-[0.28em] opacity-85">Network Command Center</div>
                <div className="text-xs opacity-70">
                  {isLive ? 'LIVE' : 'MOCK'} • {infra.length} devices • {clients.length} clients
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`rounded-md px-3 py-1 text-xs border ${
                    viewMode === 'grid'
                      ? 'bg-white/10 border-white/20'
                      : 'bg-transparent border-white/10 hover:border-white/20'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('topology')}
                  className={`rounded-md px-3 py-1 text-xs border ${
                    viewMode === 'topology'
                      ? 'bg-white/10 border-white/20'
                      : 'bg-transparent border-white/10 hover:border-white/20'
                  }`}
                >
                  Topology
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DevicesHero stats={stats} isLive={isLive} />

      <div className="mx-auto max-w-6xl px-4 pb-16">
        <DevicesStats stats={stats} />

        {/* Tabs */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TabButton active={tab === 'devices'} onClick={() => setTab('devices')}>
              Devices
            </TabButton>
            <TabButton active={tab === 'clients'} onClick={() => setTab('clients')}>
              Clients
            </TabButton>
            <TabButton active={tab === 'mycobrain'} onClick={() => setTab('mycobrain')}>
              MycoBrain
            </TabButton>
          </div>

          {tab !== 'mycobrain' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`rounded-md px-3 py-1 text-xs border ${
                  viewMode === 'grid'
                    ? 'bg-white/10 border-white/20'
                    : 'bg-transparent border-white/10 hover:border-white/20'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('topology')}
                className={`rounded-md px-3 py-1 text-xs border ${
                  viewMode === 'topology'
                    ? 'bg-white/10 border-white/20'
                    : 'bg-transparent border-white/10 hover:border-white/20'
                }`}
              >
                Topology
              </button>
            </div>
          )}
        </div>

        <div className="mt-4">
          <AnimatePresence mode="wait">
            {tab === 'mycobrain' ? (
              <motion.div
                key="mycobrain"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.22 }}
              >
                <MycoBrainPanel
                  devices={devices.filter((d) => d.type === 'mycobrain')}
                  onSelect={setSelected}
                />
              </motion.div>
            ) : viewMode === 'topology' ? (
              <motion.div
                key="topology"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.22 }}
              >
                <NetworkTopology
                  devices={tab === 'clients' ? clients : infra}
                  onSelect={setSelected}
                />
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.22 }}
              >
                <DevicesGrid
                  devices={tab === 'clients' ? clients : infra}
                  onSelect={setSelected}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <DeviceDetailsModal device={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function TabButton(props: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={props.onClick}
      className={
        `rounded-md px-3 py-1 text-sm border transition-colors ` +
        (props.active
          ? 'bg-white/10 border-white/20'
          : 'bg-transparent border-white/10 hover:border-white/20 hover:bg-white/5')
      }
    >
      {props.children}
    </button>
  );
}
