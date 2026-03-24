"use client";

/**
 * Live Services Panel — Real system health monitoring
 *
 * Pings all CREP service endpoints and displays real status.
 * Replaces placeholder services tab content.
 */

import { useEffect, useState, useCallback } from "react";
import {
  Activity, CheckCircle2, AlertTriangle, XCircle,
  Database, Cpu, Cloud, Radio, Satellite, Globe, RefreshCw
} from "lucide-react";

interface ServiceStatus {
  name: string;
  url: string;
  status: "online" | "degraded" | "offline";
  responseTimeMs: number;
  details?: string;
}

interface ServicesSummary {
  online: number;
  degraded: number;
  offline: number;
  total: number;
}

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  MINDEX: <Database className="w-3.5 h-3.5" />,
  "MAS Orchestrator": <Cpu className="w-3.5 h-3.5" />,
  "n8n Workflows": <Activity className="w-3.5 h-3.5" />,
  Redis: <Database className="w-3.5 h-3.5" />,
  "Qdrant Vector DB": <Database className="w-3.5 h-3.5" />,
  "Earth-2 Weather": <Cloud className="w-3.5 h-3.5" />,
  FlightRadar24: <Globe className="w-3.5 h-3.5" />,
  "NOAA SWPC": <Satellite className="w-3.5 h-3.5" />,
  iNaturalist: <Globe className="w-3.5 h-3.5" />,
  "NASA GIBS": <Satellite className="w-3.5 h-3.5" />,
  "Overpass API": <Globe className="w-3.5 h-3.5" />,
  CelesTrak: <Radio className="w-3.5 h-3.5" />,
};

const STATUS_CONFIG = {
  online: { icon: <CheckCircle2 className="w-3 h-3" />, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
  degraded: { icon: <AlertTriangle className="w-3 h-3" />, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
  offline: { icon: <XCircle className="w-3 h-3" />, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
};

export default function ServicesPanelLive() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [summary, setSummary] = useState<ServicesSummary>({ online: 0, degraded: 0, offline: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch("/api/crep/services", { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return;
      const data = await res.json();
      setServices(data.services || []);
      setSummary(data.summary || { online: 0, degraded: 0, offline: 0, total: 0 });
      setLastRefresh(new Date());
    } catch {
      // Keep existing data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
    const interval = setInterval(fetchServices, 30000);
    return () => clearInterval(interval);
  }, [fetchServices]);

  return (
    <div className="p-3 space-y-3 text-xs">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-gray-200">System Services</span>
        </div>
        <button
          onClick={fetchServices}
          className="p-1 rounded hover:bg-white/10 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-1.5">
        <div className="px-2 py-1.5 rounded bg-green-500/10 border border-green-500/20 text-center">
          <div className="text-lg font-bold text-green-400">{summary.online}</div>
          <div className="text-[8px] text-green-400/70">Online</div>
        </div>
        <div className="px-2 py-1.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-center">
          <div className="text-lg font-bold text-yellow-400">{summary.degraded}</div>
          <div className="text-[8px] text-yellow-400/70">Degraded</div>
        </div>
        <div className="px-2 py-1.5 rounded bg-red-500/10 border border-red-500/20 text-center">
          <div className="text-lg font-bold text-red-400">{summary.offline}</div>
          <div className="text-[8px] text-red-400/70">Offline</div>
        </div>
      </div>

      {/* Service list */}
      <div className="space-y-1 max-h-[400px] overflow-y-auto">
        {services.map((svc) => {
          const cfg = STATUS_CONFIG[svc.status];
          return (
            <div
              key={svc.name}
              className={`flex items-center gap-2 px-2 py-1.5 rounded ${cfg.bg} border ${cfg.border}`}
            >
              <span className={cfg.color}>
                {SERVICE_ICONS[svc.name] || <Globe className="w-3.5 h-3.5" />}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-gray-200 font-medium truncate">{svc.name}</span>
                  <span className={cfg.color}>{cfg.icon}</span>
                </div>
                <div className="text-[9px] text-gray-500 truncate">{svc.url}</div>
              </div>
              <div className="text-right">
                <div className={`text-[10px] font-mono ${cfg.color}`}>
                  {svc.responseTimeMs}ms
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Last refresh */}
      {lastRefresh && (
        <div className="text-[8px] text-gray-600 text-center">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
