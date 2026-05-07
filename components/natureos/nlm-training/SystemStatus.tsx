'use client';

import { useSystemStatus } from '@/lib/nlm/supabase-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  Activity,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Wifi,
  WifiOff,
  Server,
  Database,
  Brain,
  Network,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const systems = [
  { name: 'Mindex', icon: Database, api: '/api/natureos/nlm-training/mindex' },
  { name: 'MycoBrain', icon: Brain, api: '/api/natureos/nlm-training/mycobrain' },
  { name: 'Mycosoft', icon: ShieldCheck, api: '/api/natureos/nlm-training' },
  { name: 'MAS', icon: Activity, api: '/api/natureos/nlm-training' },
  { name: 'Network Middleware', icon: Network, api: '/api/natureos/nlm-training' },
];

export function SystemStatus() {
  const { status, loading, error } = useSystemStatus();
  const [expandedSystem, setExpandedSystem] = useState<string | null>(null);
  const [systemDetails, setSystemDetails] = useState<Record<string, any>>({});

  useEffect(() => {
    async function fetchDetails() {
      const details: Record<string, any> = {};
      const origin = window.location.origin;
      for (const sys of systems) {
        try {
          const url = `${origin}${sys.api}`;
          console.debug(`[SystemStatus] Fetching ${sys.name} from ${url}`);
          const res = await fetch(url);
          if (res.ok) {
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const data = await res.json();
              console.debug(`[SystemStatus] Received data for ${sys.name}:`, data);
              // If the API returns an array (like mindex or mycobrain), take the first item
              details[sys.name] = Array.isArray(data) ? data[0] : data;
            } else {
              const text = await res.text();
              console.warn(`[SystemStatus] API for ${sys.name} returned non-JSON response:`, text);
              details[sys.name] = { error: 'Invalid response format' };
            }
          } else {
            console.error(`[SystemStatus] API for ${sys.name} failed with status ${res.status}: ${res.statusText}`);
            details[sys.name] = { error: `HTTP ${res.status}: ${res.statusText}` };
          }
        } catch (e: any) {
          console.error(`[SystemStatus] Error fetching details for ${sys.name}:`, e);
          details[sys.name] = { error: e.message || 'Failed to fetch details' };
        }
      }
      setSystemDetails(details);
    }
    fetchDetails();
  }, [status]); // Re-fetch details when status updates

  const getStatusIcon = (statusStr: string) => {
    switch (statusStr) {
      case 'online': return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
      case 'degraded': return <ShieldAlert className="w-4 h-4 text-amber-500" />;
      case 'offline': return <ShieldOff className="w-4 h-4 text-red-500" />;
      default: return <ShieldQuestion className="w-4 h-4 text-zinc-500" />;
    }
  };

  const ShieldOff = ShieldAlert; // Fallback

  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <Server className="w-3 h-3" />
          Backend Infrastructure
        </h3>
        {loading && <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {systems.map((sys) => {
          const sysData = (Array.isArray(status) ? status.find(s =>
            s?.system_name === sys.name ||
            (sys.name === 'Mycosoft' && s?.system_name === 'SystemRegistry') ||
            (sys.name === 'SystemRegistry' && s?.system_name === 'Mycosoft')
          ) : null) || null;
          const isOnline = sysData?.status === 'online';
          const isExpanded = expandedSystem === sys.name;

          return (
            <div
              key={sys.name}
              className={`p-4 bg-black/20 border border-zinc-800 rounded-2xl space-y-3 group hover:border-zinc-700 transition-all cursor-pointer ${isExpanded ? 'ring-1 ring-zinc-600' : ''}`}
              onClick={() => setExpandedSystem(isExpanded ? null : sys.name)}
            >
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${isOnline ? 'bg-emerald-500/10' : 'bg-zinc-800'}`}>
                  <sys.icon className={`w-4 h-4 ${isOnline ? 'text-emerald-500' : 'text-zinc-500'}`} />
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(sysData?.status || 'unknown')}
                  {isExpanded ? <ChevronUp className="w-3 h-3 text-zinc-600" /> : <ChevronDown className="w-3 h-3 text-zinc-600" />}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">{sys.name}</h4>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase">
                    {sysData?.latency ? `${sysData.latency}ms` : '---'}
                  </span>
                  <span className={`text-[9px] font-bold uppercase tracking-widest ${isOnline ? 'text-emerald-500/70' : 'text-zinc-600'}`}>
                    {sysData?.status || 'Unknown'}
                  </span>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden pt-2 border-t border-zinc-800 mt-2"
                  >
                    <div className="space-y-2">
                      {systemDetails[sys.name] ? (
                        Object.entries(systemDetails[sys.name]).map(([key, val]) => (
                          <div key={key} className="flex items-center justify-between text-[8px] font-mono gap-2">
                            <span className="text-zinc-500 uppercase flex-shrink-0">{key.replace(/_/g, ' ')}</span>
                            <span className="text-zinc-300 truncate text-right">
                              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-[8px] text-zinc-600 italic">No additional telemetry...</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="p-3 bg-red-900/10 border border-red-900/20 rounded-xl flex items-center gap-3">
          <WifiOff className="w-4 h-4 text-red-500" />
          <p className="text-[10px] text-red-500 font-mono uppercase tracking-widest">
            Supabase Connection Error: {error.includes('42P01') ? 'System tables not found' : 'Network timeout'}
          </p>
        </div>
      )}
    </div>
  );
}
