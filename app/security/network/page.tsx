"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Wifi, Server, Monitor, Globe, Shield, Activity, 
  AlertTriangle, Zap, Users, Router, Signal, 
  ArrowUp, ArrowDown, Clock, RefreshCw, Search,
  ChevronRight, Lock, Unlock, XCircle, CheckCircle
} from "lucide-react";

// ===== Types =====

interface WANStatus {
  ip: string;
  isp: string;
  download_speed_mbps: number;
  upload_speed_mbps: number;
  latency_ms: number;
  availability: number;
  status: string;
}

interface LANStatus {
  status: string;
  num_user: number;
  num_guest: number;
  tx_bytes_rate: number;
  rx_bytes_rate: number;
}

interface WifiStatus {
  status: string;
  num_ap: number;
  num_user: number;
  num_guest: number;
  tx_bytes_rate: number;
  rx_bytes_rate: number;
}

interface Device {
  name: string;
  model: string;
  mac: string;
  ip: string;
  type: string;
  state: string;
  uptime: number;
  version: string;
  cpu?: number;
  mem?: number;
}

interface Client {
  name: string;
  mac: string;
  ip: string;
  tx_bytes: number;
  rx_bytes: number;
  is_wired: boolean;
  signal?: number;
  satisfaction?: number;
}

interface TrafficCategory {
  name: string;
  tx_bytes: number;
  rx_bytes: number;
  total_bytes: number;
  tx_formatted: string;
  rx_formatted: string;
  total_formatted: string;
}

interface Alarm {
  id: string;
  type: string;
  message: string;
  time: string;
  subsystem: string;
}

interface WifiNetwork {
  name: string;
  enabled: boolean;
  security: string;
  is_guest: boolean;
  num_sta: number;
}

interface DashboardData {
  timestamp: string;
  wan: WANStatus | null;
  lan: LANStatus | null;
  wifi: WifiStatus | null;
  devices: {
    total: number;
    online: number;
    offline: number;
    list: Device[];
  };
  clients: {
    total: number;
    wired: number;
    wireless: number;
    guests: number;
    top: Client[];
  };
  traffic: {
    total_tx_bytes: number;
    total_rx_bytes: number;
    top_apps: TrafficCategory[];
  };
  alarms: {
    total: number;
    active: number;
    list: Alarm[];
  };
  wifi_networks: WifiNetwork[];
}

interface Throughput {
  timestamp: string;
  lan: { tx_mbps: number; rx_mbps: number };
  wan: { tx_mbps: number; rx_mbps: number };
}

// ===== Component =====

export default function NetworkSecurityPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [throughput, setThroughput] = useState<Throughput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedView, setSelectedView] = useState<"overview" | "devices" | "clients" | "traffic" | "topology">("overview");

  const fetchData = useCallback(async () => {
    try {
      const [dashboardRes, throughputRes] = await Promise.all([
        fetch("/api/unifi?action=dashboard"),
        fetch("/api/unifi?action=throughput"),
      ]);

      if (!dashboardRes.ok || !throughputRes.ok) {
        throw new Error("Failed to fetch network data");
      }

      const dashboardData = await dashboardRes.json();
      const throughputData = await throughputRes.json();

      setData(dashboardData);
      setThroughput(throughputData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    if (!seconds) return "0s";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    return parts.join(" ") || "0m";
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-cyan-400">
          <RefreshCw className="animate-spin" size={24} />
          <span className="text-lg font-mono">Loading UniFi Network Data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Router className="text-cyan-400" size={32} />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white font-mono">Network Security Monitor</h1>
            <p className="text-slate-400 font-mono text-sm">UniFi Dream Machine Pro Integration</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-lg font-mono text-sm flex items-center gap-2 transition-colors ${
              autoRefresh ? "bg-cyan-600 text-white" : "bg-slate-700 text-slate-300"
            }`}
          >
            <RefreshCw size={16} className={autoRefresh ? "animate-spin" : ""} />
            {autoRefresh ? "Live" : "Paused"}
          </button>
          <button
            onClick={fetchData}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-mono text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
          <AlertTriangle className="text-red-400" size={20} />
          <p className="text-red-400 font-mono">{error}</p>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { id: "overview", label: "Overview", icon: Monitor },
          { id: "devices", label: "Devices", icon: Server },
          { id: "clients", label: "Clients", icon: Users },
          { id: "traffic", label: "Traffic", icon: Activity },
          { id: "topology", label: "Topology", icon: Globe },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSelectedView(id as any)}
            className={`px-4 py-2 rounded-lg font-mono text-sm flex items-center gap-2 transition-colors ${
              selectedView === id
                ? "bg-cyan-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      {selectedView === "overview" && data && (
        <div className="space-y-6">
          {/* WAN & Throughput Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* WAN Status */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 font-mono text-sm">WAN Status</span>
                <Globe className={`${data.wan?.status === 'ok' ? 'text-emerald-400' : 'text-red-400'}`} size={20} />
              </div>
              <div className="text-xl font-bold font-mono text-white mb-1">
                {data.wan?.ip || "N/A"}
              </div>
              <div className="text-xs text-slate-500 font-mono">{data.wan?.isp || "Unknown ISP"}</div>
            </div>

            {/* Live Throughput */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 font-mono text-sm">Live Throughput</span>
                <Activity className="text-cyan-400" size={20} />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-emerald-400">
                  <ArrowDown size={16} />
                  <span className="font-mono font-bold">{throughput?.lan.rx_mbps.toFixed(1) || 0} Mbps</span>
                </div>
                <div className="flex items-center gap-1 text-orange-400">
                  <ArrowUp size={16} />
                  <span className="font-mono font-bold">{throughput?.lan.tx_mbps.toFixed(1) || 0} Mbps</span>
                </div>
              </div>
            </div>

            {/* Connected Clients */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 font-mono text-sm">Connected Clients</span>
                <Users className="text-purple-400" size={20} />
              </div>
              <div className="text-2xl font-bold font-mono text-white mb-1">
                {data.clients.total}
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {data.clients.wired} wired • {data.clients.wireless} wireless
              </div>
            </div>

            {/* Active Alarms */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 font-mono text-sm">Active Alarms</span>
                <AlertTriangle className={`${data.alarms.active > 0 ? 'text-yellow-400' : 'text-emerald-400'}`} size={20} />
              </div>
              <div className={`text-2xl font-bold font-mono ${data.alarms.active > 0 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                {data.alarms.active}
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {data.alarms.total} total events
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Devices Panel */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Server className="text-cyan-400" size={20} />
                  <h2 className="font-bold text-white font-mono">Network Devices</h2>
                </div>
                <span className="text-xs text-slate-500 font-mono">{data.devices.online}/{data.devices.total} online</span>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {data.devices.list.map((device, idx) => (
                  <div key={idx} className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-white text-sm">{device.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        device.state === 'online' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {device.state}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono">{device.model} • {device.ip}</div>
                    {device.cpu !== undefined && (
                      <div className="mt-2 flex gap-4 text-xs font-mono">
                        <span className="text-slate-400">CPU: <span className="text-white">{device.cpu}%</span></span>
                        <span className="text-slate-400">MEM: <span className="text-white">{device.mem}%</span></span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Top Clients */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="text-purple-400" size={20} />
                  <h2 className="font-bold text-white font-mono">Top Clients</h2>
                </div>
                <span className="text-xs text-slate-500 font-mono">by traffic</span>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {data.clients.top.slice(0, 8).map((client, idx) => (
                  <div key={idx} className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-white text-sm truncate max-w-[150px]">{client.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        client.is_wired ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {client.is_wired ? 'Wired' : 'WiFi'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono">{client.ip}</div>
                    <div className="mt-2 flex justify-between text-xs font-mono">
                      <span className="text-emerald-400">↓ {formatBytes(client.rx_bytes)}</span>
                      <span className="text-orange-400">↑ {formatBytes(client.tx_bytes)}</span>
                    </div>
                    {client.signal !== undefined && client.signal !== 0 && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                        <Signal size={12} />
                        <span>{client.signal} dBm</span>
                        {client.satisfaction !== undefined && (
                          <span className="ml-2">• {client.satisfaction}% satisfaction</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Traffic & Apps */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="text-orange-400" size={20} />
                  <h2 className="font-bold text-white font-mono">Top Traffic</h2>
                </div>
                <span className="text-xs text-slate-500 font-mono">by category</span>
              </div>
              <div className="mb-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400 font-mono mb-2">Total Transfer</div>
                <div className="flex justify-between">
                  <div>
                    <span className="text-emerald-400 font-mono font-bold">{formatBytes(data.traffic.total_rx_bytes)}</span>
                    <span className="text-xs text-slate-500 ml-1">down</span>
                  </div>
                  <div>
                    <span className="text-orange-400 font-mono font-bold">{formatBytes(data.traffic.total_tx_bytes)}</span>
                    <span className="text-xs text-slate-500 ml-1">up</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {data.traffic.top_apps.slice(0, 8).map((app, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-900/30 rounded">
                    <span className="font-mono text-sm text-white truncate max-w-[120px]">{app.name}</span>
                    <span className="font-mono text-xs text-slate-400">{app.total_formatted}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* WiFi Networks & Alarms */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* WiFi Networks */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Wifi className="text-cyan-400" size={20} />
                <h2 className="font-bold text-white font-mono">WiFi Networks</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.wifi_networks.map((network, idx) => (
                  <div key={idx} className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-white text-sm">{network.name}</span>
                      <span className={`w-2 h-2 rounded-full ${network.enabled ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                      <span>{network.security}</span>
                      <span>{network.num_sta} clients</span>
                    </div>
                    {network.is_guest && (
                      <span className="mt-2 inline-block text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">Guest</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Alarms */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="text-yellow-400" size={20} />
                <h2 className="font-bold text-white font-mono">Recent Alarms</h2>
              </div>
              {data.alarms.list.length === 0 ? (
                <div className="text-center py-8 text-slate-500 font-mono">
                  <CheckCircle className="mx-auto mb-2 text-emerald-400" size={24} />
                  <p>No active alarms</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {data.alarms.list.map((alarm) => (
                    <div key={alarm.id} className="p-3 bg-slate-900/50 rounded-lg border border-yellow-500/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-yellow-400 font-mono">{alarm.type}</span>
                        <span className="text-xs text-slate-500 font-mono">
                          {new Date(alarm.time).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-white font-mono">{alarm.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Devices View */}
      {selectedView === "devices" && data && (
        <DevicesView devices={data.devices.list} formatUptime={formatUptime} />
      )}

      {/* Clients View */}
      {selectedView === "clients" && data && (
        <ClientsView clients={data.clients} formatBytes={formatBytes} />
      )}

      {/* Traffic View */}
      {selectedView === "traffic" && (
        <TrafficView formatBytes={formatBytes} />
      )}

      {/* Topology View */}
      {selectedView === "topology" && (
        <TopologyView />
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-slate-500 font-mono text-xs">
        <p>Last Updated: {data?.timestamp ? new Date(data.timestamp).toLocaleString() : "Unknown"}</p>
        <p>UniFi Dream Machine Pro • Real-time Network Monitoring</p>
      </div>
    </div>
  );
}

// ===== Sub-Components =====

function DevicesView({ devices, formatUptime }: { devices: Device[], formatUptime: (s: number) => string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {devices.map((device, idx) => (
        <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Server className={device.state === 'online' ? 'text-emerald-400' : 'text-red-400'} size={20} />
              <span className="font-mono font-bold text-white">{device.name}</span>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${
              device.state === 'online' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {device.state}
            </span>
          </div>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Model</span>
              <span className="text-white">{device.model}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">IP</span>
              <span className="text-white">{device.ip}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">MAC</span>
              <span className="text-white text-xs">{device.mac}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Uptime</span>
              <span className="text-white">{formatUptime(device.uptime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Version</span>
              <span className="text-white">{device.version}</span>
            </div>
            {device.cpu !== undefined && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-400">CPU</span>
                  <span className="text-white">{device.cpu}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Memory</span>
                  <span className="text-white">{device.mem}%</span>
                </div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ClientsView({ clients, formatBytes }: { clients: DashboardData['clients'], formatBytes: (b: number) => string }) {
  const [filter, setFilter] = useState<'all' | 'wired' | 'wireless'>('all');
  const filteredClients = clients.top.filter(c => {
    if (filter === 'wired') return c.is_wired;
    if (filter === 'wireless') return !c.is_wired;
    return true;
  });

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {['all', 'wired', 'wireless'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-3 py-1 rounded font-mono text-sm ${
              filter === f ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'
            }`}
          >
            {f === 'all' ? `All (${clients.total})` : f === 'wired' ? `Wired (${clients.wired})` : `Wireless (${clients.wireless})`}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client, idx) => (
          <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono font-bold text-white truncate max-w-[200px]">{client.name}</span>
              <span className={`text-xs px-2 py-1 rounded ${
                client.is_wired ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
              }`}>
                {client.is_wired ? 'Wired' : 'WiFi'}
              </span>
            </div>
            <div className="space-y-2 text-sm font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">IP</span>
                <span className="text-white">{client.ip}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">MAC</span>
                <span className="text-white text-xs">{client.mac}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-400">Download</span>
                <span className="text-white">{formatBytes(client.rx_bytes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-400">Upload</span>
                <span className="text-white">{formatBytes(client.tx_bytes)}</span>
              </div>
              {client.signal !== undefined && client.signal !== 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Signal</span>
                  <span className="text-white">{client.signal} dBm</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrafficView({ formatBytes }: { formatBytes: (b: number) => string }) {
  const [traffic, setTraffic] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/unifi?action=traffic")
      .then(res => res.json())
      .then(data => {
        setTraffic(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-8 text-slate-400 font-mono">Loading traffic data...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Clients */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
        <h2 className="font-bold text-white font-mono mb-4 flex items-center gap-2">
          <Users className="text-purple-400" size={20} />
          Top Clients by Traffic
        </h2>
        <div className="space-y-2">
          {traffic?.top_clients?.map((client: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
              <div>
                <span className="font-mono text-white text-sm">{client.name}</span>
                <span className="text-xs text-slate-500 ml-2">{client.ip}</span>
              </div>
              <span className="font-mono text-cyan-400 text-sm">{client.total_formatted}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Categories */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
        <h2 className="font-bold text-white font-mono mb-4 flex items-center gap-2">
          <Activity className="text-orange-400" size={20} />
          Top Traffic Categories
        </h2>
        <div className="space-y-2">
          {traffic?.top_categories?.map((cat: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
              <span className="font-mono text-white text-sm">{cat.name}</span>
              <span className="font-mono text-orange-400 text-sm">{cat.total_formatted}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TopologyView() {
  const [topology, setTopology] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/unifi?action=topology")
      .then(res => res.json())
      .then(data => {
        setTopology(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-8 text-slate-400 font-mono">Loading topology...</div>;
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <h2 className="font-bold text-white font-mono mb-6 flex items-center gap-2">
        <Globe className="text-cyan-400" size={24} />
        Network Topology
      </h2>
      
      {/* Simple topology visualization */}
      <div className="space-y-4">
        {topology?.nodes?.filter((n: any) => n.type === 'gateway').map((node: any) => (
          <div key={node.id} className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
            <Router className="mx-auto text-emerald-400 mb-2" size={32} />
            <div className="font-mono font-bold text-white">{node.name}</div>
            <div className="text-xs text-slate-400 font-mono">{node.model} • {node.ip}</div>
          </div>
        ))}

        <div className="flex justify-center">
          <div className="w-0.5 h-8 bg-slate-600" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {topology?.nodes?.filter((n: any) => n.type !== 'gateway' && n.type !== 'client-group').map((node: any) => (
            <div key={node.id} className="bg-slate-900/50 border border-slate-600 rounded-lg p-3 text-center">
              {node.type === 'usw' && <Server className="mx-auto text-blue-400 mb-1" size={20} />}
              {node.type === 'uap' && <Wifi className="mx-auto text-purple-400 mb-1" size={20} />}
              {!['usw', 'uap'].includes(node.type) && <Monitor className="mx-auto text-slate-400 mb-1" size={20} />}
              <div className="font-mono text-sm text-white truncate">{node.name}</div>
              <div className={`text-xs ${node.state === 'online' ? 'text-emerald-400' : 'text-red-400'}`}>
                {node.state}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <div className="w-0.5 h-8 bg-slate-600" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topology?.nodes?.filter((n: any) => n.type === 'client-group').map((node: any) => (
            <div key={node.id} className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="text-purple-400" size={20} />
                <span className="font-mono font-bold text-white">{node.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs font-mono max-h-[100px] overflow-y-auto">
                {node.clients?.slice(0, 6).map((c: any, idx: number) => (
                  <div key={idx} className="text-slate-400 truncate">{c.name}</div>
                ))}
                {node.clients?.length > 6 && (
                  <div className="text-slate-500">+{node.clients.length - 6} more</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Networks */}
      <div className="mt-6 pt-6 border-t border-slate-700">
        <h3 className="font-mono font-bold text-white mb-3">Networks</h3>
        <div className="flex flex-wrap gap-2">
          {topology?.networks?.map((network: any) => (
            <div key={network.id} className="px-3 py-2 bg-slate-900/50 rounded-lg border border-slate-600">
              <div className="font-mono text-sm text-white">{network.name}</div>
              <div className="text-xs text-slate-400">VLAN {network.vlan || 1} • {network.subnet}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
