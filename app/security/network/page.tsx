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
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-cyan-400">
          <RefreshCw className="animate-spin" size={24} />
          <span className="text-lg font-mono">Loading UniFi Network Data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
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
                <button 
                  onClick={() => setSelectedView("devices")} 
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-mono transition"
                >
                  View All →
                </button>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {data.devices.list.map((device, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedView("devices")}
                    className="p-3 bg-slate-900/50 rounded-lg border border-slate-700 cursor-pointer hover:border-cyan-500/50 hover:bg-slate-800/50 transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-white text-sm">{device.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        device.state === 'online' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {device.state}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono hover:text-cyan-400 transition">{device.model} • {device.ip}</div>
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
                <button 
                  onClick={() => setSelectedView("clients")} 
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-mono transition"
                >
                  View All →
                </button>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {data.clients.top.slice(0, 8).map((client, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedView("clients")}
                    className="p-3 bg-slate-900/50 rounded-lg border border-slate-700 cursor-pointer hover:border-purple-500/50 hover:bg-slate-800/50 transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-white text-sm truncate max-w-[150px]">{client.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        client.is_wired ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {client.is_wired ? 'Wired' : 'WiFi'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono hover:text-cyan-400 transition cursor-pointer">{client.ip}</div>
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

      {/* Last Update Info */}
      <div className="mt-8 text-center text-slate-500 font-mono text-xs">
        <p>Last Updated: {data?.timestamp ? new Date(data.timestamp).toLocaleString() : "Unknown"}</p>
        <p>UniFi Dream Machine Pro • Real-time Network Monitoring</p>
      </div>
    </div>
  );
}

// ===== Sub-Components =====

// Device/Client Detail Sidebar
function DetailSidebar({ 
  isOpen, 
  onClose, 
  title, 
  children 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-slate-900 border-l border-slate-700 z-50 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white font-mono">{title}</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white"
          >
            <XCircle size={20} />
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </>
  );
}

function DevicesView({ devices, formatUptime }: { devices: Device[], formatUptime: (s: number) => string }) {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(null);

  const executeDeviceAction = async (action: string, device_mac: string) => {
    setActionLoading(action);
    setActionResult(null);
    try {
      const response = await fetch('/api/unifi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, device_mac }),
      });
      const data = await response.json();
      setActionResult({ success: data.success, message: data.message });
      setTimeout(() => setActionResult(null), 3000);
    } catch (error) {
      setActionResult({ success: false, message: 'Failed to execute action' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestart = () => selectedDevice && executeDeviceAction('restart-device', selectedDevice.mac);
  const handleIsolate = () => selectedDevice && executeDeviceAction('isolate-device', selectedDevice.mac);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map((device, idx) => (
          <div 
            key={idx} 
            onClick={() => setSelectedDevice(device)}
            className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 cursor-pointer hover:border-cyan-500/50 hover:bg-slate-800 transition-all"
          >
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
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-cyan-400 font-mono">
              Click for details →
            </div>
          </div>
        ))}
      </div>

      {/* Device Detail Sidebar */}
      <DetailSidebar
        isOpen={!!selectedDevice}
        onClose={() => setSelectedDevice(null)}
        title={selectedDevice?.name || 'Device Details'}
      >
        {selectedDevice && (
          <div className="space-y-6">
            {/* Status Badge */}
            <div className="flex items-center gap-3">
              <Server className={selectedDevice.state === 'online' ? 'text-emerald-400' : 'text-red-400'} size={32} />
              <div>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  selectedDevice.state === 'online' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {selectedDevice.state.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Device Info */}
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
              <h3 className="font-bold text-white font-mono mb-3">Device Information</h3>
              {[
                { label: 'Model', value: selectedDevice.model },
                { label: 'IP Address', value: selectedDevice.ip },
                { label: 'MAC Address', value: selectedDevice.mac },
                { label: 'Type', value: selectedDevice.type },
                { label: 'Firmware', value: selectedDevice.version },
                { label: 'Uptime', value: formatUptime(selectedDevice.uptime) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm font-mono">
                  <span className="text-slate-400">{label}</span>
                  <span className="text-white">{value}</span>
                </div>
              ))}
            </div>

            {/* Resource Usage */}
            {selectedDevice.cpu !== undefined && (
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                <h3 className="font-bold text-white font-mono mb-3">Resource Usage</h3>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-sm font-mono mb-1">
                      <span className="text-slate-400">CPU</span>
                      <span className="text-white">{selectedDevice.cpu}%</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${selectedDevice.cpu! > 80 ? 'bg-red-500' : selectedDevice.cpu! > 50 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                        style={{ width: `${selectedDevice.cpu}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm font-mono mb-1">
                      <span className="text-slate-400">Memory</span>
                      <span className="text-white">{selectedDevice.mem}%</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${selectedDevice.mem! > 80 ? 'bg-red-500' : selectedDevice.mem! > 50 ? 'bg-yellow-500' : 'bg-cyan-500'}`}
                        style={{ width: `${selectedDevice.mem}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Result */}
            {actionResult && (
              <div className={`p-3 rounded-lg ${actionResult.success ? 'bg-emerald-500/20 border border-emerald-500/50' : 'bg-red-500/20 border border-red-500/50'}`}>
                <p className={`text-sm font-mono ${actionResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                  {actionResult.message}
                </p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h3 className="font-bold text-white font-mono mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={handleRestart}
                  disabled={actionLoading === 'restart-device'}
                  className="p-2 bg-cyan-600/20 border border-cyan-600/50 rounded-lg text-cyan-400 text-sm font-mono hover:bg-cyan-600/30 transition disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {actionLoading === 'restart-device' ? <RefreshCw size={14} className="animate-spin" /> : null}
                  Restart
                </button>
                <button className="p-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 text-sm font-mono hover:bg-slate-700 transition">
                  Upgrade
                </button>
                <button className="p-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 text-sm font-mono hover:bg-slate-700 transition">
                  View Logs
                </button>
                <button 
                  onClick={handleIsolate}
                  disabled={actionLoading === 'isolate-device'}
                  className="p-2 bg-red-600/20 border border-red-600/50 rounded-lg text-red-400 text-sm font-mono hover:bg-red-600/30 transition disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {actionLoading === 'isolate-device' ? <RefreshCw size={14} className="animate-spin" /> : null}
                  Isolate
                </button>
              </div>
            </div>
          </div>
        )}
      </DetailSidebar>
    </>
  );
}

function ClientsView({ clients, formatBytes }: { clients: DashboardData['clients'], formatBytes: (b: number) => string }) {
  const [filter, setFilter] = useState<'all' | 'wired' | 'wireless'>('all');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showBandwidthModal, setShowBandwidthModal] = useState(false);
  const [bandwidthLimit, setBandwidthLimit] = useState({ download: 10, upload: 5 });
  const [clientHistory, setClientHistory] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const filteredClients = clients.top.filter(c => {
    if (filter === 'wired') return c.is_wired;
    if (filter === 'wireless') return !c.is_wired;
    return true;
  });

  // Client action handlers
  const executeClientAction = async (action: string, mac: string, extraData?: object) => {
    setActionLoading(action);
    setActionResult(null);
    try {
      const response = await fetch('/api/unifi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, mac, ...extraData }),
      });
      const data = await response.json();
      setActionResult({ success: data.success, message: data.message });
      // Auto-clear success message after 3 seconds
      setTimeout(() => setActionResult(null), 3000);
    } catch (error) {
      setActionResult({ success: false, message: 'Failed to execute action' });
    } finally {
      setActionLoading(null);
    }
  };

  const fetchClientHistory = async (mac: string) => {
    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/unifi?action=client-history&mac=${mac}`);
      const data = await response.json();
      setClientHistory(data);
    } catch (error) {
      console.error('Failed to fetch client history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleReconnect = () => selectedClient && executeClientAction('reconnect-client', selectedClient.mac);
  const handleBlock = () => selectedClient && executeClientAction('block-client', selectedClient.mac, { reason: 'Manual block from SOC' });
  const handleLimitSpeed = () => {
    if (selectedClient) {
      executeClientAction('set-client-bandwidth', selectedClient.mac, {
        download_limit: bandwidthLimit.download,
        upload_limit: bandwidthLimit.upload,
      });
      setShowBandwidthModal(false);
    }
  };
  const handleViewHistory = () => {
    if (selectedClient) {
      fetchClientHistory(selectedClient.mac);
    }
  };

  return (
    <>
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
          <div 
            key={idx} 
            onClick={() => setSelectedClient(client)}
            className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 cursor-pointer hover:border-purple-500/50 hover:bg-slate-800 transition-all"
          >
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
            <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-purple-400 font-mono">
              Click for details →
            </div>
          </div>
        ))}
      </div>

      {/* Client Detail Sidebar */}
      <DetailSidebar
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        title={selectedClient?.name || 'Client Details'}
      >
        {selectedClient && (
          <div className="space-y-6">
            {/* Connection Type Badge */}
            <div className="flex items-center gap-3">
              <Users className={selectedClient.is_wired ? 'text-blue-400' : 'text-purple-400'} size={32} />
              <span className={`px-3 py-1 rounded-full text-sm ${
                selectedClient.is_wired ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
              }`}>
                {selectedClient.is_wired ? 'WIRED CONNECTION' : 'WIRELESS CONNECTION'}
              </span>
            </div>

            {/* Client Info */}
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
              <h3 className="font-bold text-white font-mono mb-3">Client Information</h3>
              {[
                { label: 'IP Address', value: selectedClient.ip },
                { label: 'MAC Address', value: selectedClient.mac },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm font-mono">
                  <span className="text-slate-400">{label}</span>
                  <span className="text-white">{value}</span>
                </div>
              ))}
            </div>

            {/* Traffic Stats */}
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
              <h3 className="font-bold text-white font-mono mb-3">Traffic Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center">
                  <div className="text-emerald-400 text-xl font-bold font-mono">{formatBytes(selectedClient.rx_bytes)}</div>
                  <div className="text-xs text-slate-400">Downloaded</div>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 text-center">
                  <div className="text-orange-400 text-xl font-bold font-mono">{formatBytes(selectedClient.tx_bytes)}</div>
                  <div className="text-xs text-slate-400">Uploaded</div>
                </div>
              </div>
            </div>

            {/* WiFi Stats (if wireless) */}
            {!selectedClient.is_wired && selectedClient.signal !== undefined && (
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                <h3 className="font-bold text-white font-mono mb-3">WiFi Quality</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-mono">
                    <span className="text-slate-400">Signal Strength</span>
                    <span className={`${selectedClient.signal > -50 ? 'text-emerald-400' : selectedClient.signal > -70 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {selectedClient.signal} dBm
                    </span>
                  </div>
                  {selectedClient.satisfaction !== undefined && (
                    <div>
                      <div className="flex justify-between text-sm font-mono mb-1">
                        <span className="text-slate-400">Satisfaction</span>
                        <span className="text-white">{selectedClient.satisfaction}%</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${selectedClient.satisfaction > 80 ? 'bg-emerald-500' : selectedClient.satisfaction > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${selectedClient.satisfaction}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Result */}
            {actionResult && (
              <div className={`p-3 rounded-lg ${actionResult.success ? 'bg-emerald-500/20 border border-emerald-500/50' : 'bg-red-500/20 border border-red-500/50'}`}>
                <p className={`text-sm font-mono ${actionResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                  {actionResult.message}
                </p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h3 className="font-bold text-white font-mono mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={handleReconnect}
                  disabled={actionLoading === 'reconnect-client'}
                  className="p-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 text-sm font-mono hover:bg-slate-700 transition disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {actionLoading === 'reconnect-client' ? <RefreshCw size={14} className="animate-spin" /> : null}
                  Reconnect
                </button>
                <button 
                  onClick={() => setShowBandwidthModal(true)}
                  className="p-2 bg-yellow-600/20 border border-yellow-600/50 rounded-lg text-yellow-400 text-sm font-mono hover:bg-yellow-600/30 transition"
                >
                  Limit Speed
                </button>
                <button 
                  onClick={handleViewHistory}
                  disabled={historyLoading}
                  className="p-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 text-sm font-mono hover:bg-slate-700 transition disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {historyLoading ? <RefreshCw size={14} className="animate-spin" /> : null}
                  View History
                </button>
                <button 
                  onClick={handleBlock}
                  disabled={actionLoading === 'block-client'}
                  className="p-2 bg-red-600/20 border border-red-600/50 rounded-lg text-red-400 text-sm font-mono hover:bg-red-600/30 transition disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {actionLoading === 'block-client' ? <RefreshCw size={14} className="animate-spin" /> : null}
                  Block
                </button>
              </div>
            </div>

            {/* Bandwidth Limit Modal */}
            {showBandwidthModal && (
              <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
                <h3 className="font-bold text-white font-mono mb-3">Set Bandwidth Limit</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-slate-400 font-mono block mb-1">Download (Mbps)</label>
                    <input
                      type="number"
                      value={bandwidthLimit.download}
                      onChange={(e) => setBandwidthLimit({ ...bandwidthLimit, download: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 font-mono block mb-1">Upload (Mbps)</label>
                    <input
                      type="number"
                      value={bandwidthLimit.upload}
                      onChange={(e) => setBandwidthLimit({ ...bandwidthLimit, upload: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleLimitSpeed}
                      disabled={actionLoading === 'set-client-bandwidth'}
                      className="flex-1 p-2 bg-yellow-600 text-white rounded font-mono text-sm hover:bg-yellow-500 transition disabled:opacity-50"
                    >
                      Apply Limit
                    </button>
                    <button
                      onClick={() => setShowBandwidthModal(false)}
                      className="p-2 bg-slate-700 text-slate-300 rounded font-mono text-sm hover:bg-slate-600 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Client History */}
            {clientHistory && (
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h3 className="font-bold text-white font-mono mb-3">Traffic History (24h)</h3>
                {clientHistory.error ? (
                  <p className="text-red-400 text-sm">{clientHistory.error}</p>
                ) : (
                  <>
                    {clientHistory.summary && (
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-2 text-center">
                          <div className="text-emerald-400 font-bold font-mono text-sm">{clientHistory.summary.rx_formatted}</div>
                          <div className="text-xs text-slate-400">Total Downloaded</div>
                        </div>
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded p-2 text-center">
                          <div className="text-orange-400 font-bold font-mono text-sm">{clientHistory.summary.tx_formatted}</div>
                          <div className="text-xs text-slate-400">Total Uploaded</div>
                        </div>
                      </div>
                    )}
                    <div className="max-h-[150px] overflow-y-auto space-y-1">
                      {clientHistory.history?.slice(0, 12).map((entry: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-xs font-mono py-1 border-b border-slate-700">
                          <span className="text-slate-400">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                          <span className="text-emerald-400">↓{formatBytes(entry.rx_bytes)}</span>
                          <span className="text-orange-400">↑{formatBytes(entry.tx_bytes)}</span>
                        </div>
                      ))}
                    </div>
                    {clientHistory.mock_data && (
                      <p className="text-xs text-slate-500 mt-2">* Simulated data (mock mode)</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </DetailSidebar>
    </>
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

// ===== Interactive Network Topology View =====
interface TopologyNode {
  id: string;
  name: string;
  type: string;
  model?: string;
  ip?: string;
  mac?: string;
  state: string;
  uplink?: string;
  clients?: any[];
  ports?: number;
  x?: number;
  y?: number;
}

interface TopologyConnection {
  from: string;
  to: string;
  type: 'wired' | 'wireless';
  speed?: string;
}

function TopologyView() {
  const [topology, setTopology] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'radial' | 'force'>('tree');
  const [showLabels, setShowLabels] = useState(true);
  const [animateTraffic, setAnimateTraffic] = useState(true);

  useEffect(() => {
    fetch("/api/unifi?action=topology")
      .then(res => res.json())
      .then(data => {
        setTopology(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getNodeIcon = (type: string, size: number = 24) => {
    switch (type) {
      case 'gateway':
      case 'ugw':
        return <Globe size={size} />;
      case 'usw':
        return <Server size={size} />;
      case 'uap':
        return <Wifi size={size} />;
      case 'client-group':
        return <Users size={size} />;
      default:
        return <Monitor size={size} />;
    }
  };

  const getNodeColor = (type: string, state: string) => {
    if (state !== 'online') return { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400', glow: 'shadow-red-500/30' };
    switch (type) {
      case 'gateway':
      case 'ugw':
        return { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-400', glow: 'shadow-emerald-500/30' };
      case 'usw':
        return { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400', glow: 'shadow-blue-500/30' };
      case 'uap':
        return { bg: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-400', glow: 'shadow-purple-500/30' };
      case 'client-group':
        return { bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-400', glow: 'shadow-amber-500/30' };
      default:
        return { bg: 'bg-slate-500/20', border: 'border-slate-500/50', text: 'text-slate-400', glow: 'shadow-slate-500/30' };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-cyan-500/30 rounded-full animate-spin border-t-cyan-500" />
          <Globe className="absolute inset-0 m-auto text-cyan-400" size={24} />
        </div>
        <p className="mt-4 text-slate-400 font-mono">Loading network topology...</p>
      </div>
    );
  }

  // Organize nodes into hierarchy
  const gateways = topology?.nodes?.filter((n: any) => n.type === 'gateway' || n.type === 'ugw') || [];
  const switches = topology?.nodes?.filter((n: any) => n.type === 'usw') || [];
  const accessPoints = topology?.nodes?.filter((n: any) => n.type === 'uap') || [];
  const clientGroups = topology?.nodes?.filter((n: any) => n.type === 'client-group') || [];
  const otherDevices = topology?.nodes?.filter((n: any) => !['gateway', 'ugw', 'usw', 'uap', 'client-group'].includes(n.type)) || [];

  const totalClients = clientGroups.reduce((acc: number, g: any) => acc + (g.clients?.length || 0), 0);

  return (
    <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl overflow-hidden">
      {/* Header Controls */}
      <div className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/20 rounded-lg">
            <Globe className="text-cyan-400" size={24} />
          </div>
          <div>
            <h2 className="font-bold text-white font-mono text-lg">Network Topology</h2>
            <p className="text-xs text-slate-400 font-mono">
              {gateways.length + switches.length + accessPoints.length} devices • {totalClients} clients
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
            {(['tree', 'radial', 'force'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-xs font-mono rounded transition-all ${
                  viewMode === mode 
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`p-2 rounded-lg border transition-all ${
              showLabels ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Toggle Labels"
          >
            <Activity size={16} />
          </button>
          <button
            onClick={() => setAnimateTraffic(!animateTraffic)}
            className={`p-2 rounded-lg border transition-all ${
              animateTraffic ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Animate Traffic"
          >
            <Zap size={16} />
          </button>
        </div>
      </div>

      {/* Main Topology Canvas */}
      <div className="relative p-8 min-h-[600px]">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `
            linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }} />

        {/* Internet Cloud */}
        <div className="relative flex justify-center mb-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 blur-xl rounded-full" />
            <div className="relative px-8 py-4 bg-gradient-to-r from-slate-800/90 to-slate-900/90 rounded-2xl border border-cyan-500/30 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <Globe className="text-cyan-400" size={28} />
                <div>
                  <div className="font-mono font-bold text-white">Internet</div>
                  <div className="text-xs text-slate-400 font-mono">
                    {topology?.wan?.ip || 'WAN Connected'} • {topology?.wan?.isp || 'ISP'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Connection Line from Internet */}
        <div className="flex justify-center mb-4">
          <div className="relative w-1 h-12">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/50 to-emerald-500/50 rounded-full" />
            {animateTraffic && (
              <>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animation: 'flowDown 1.5s ease-in-out infinite' }} />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" style={{ animation: 'flowUp 1.5s ease-in-out infinite 0.75s' }} />
              </>
            )}
          </div>
        </div>

        {/* Gateway Layer */}
        <div className="flex justify-center mb-8">
          {gateways.map((gateway: TopologyNode) => {
            const colors = getNodeColor(gateway.type, gateway.state);
            return (
              <div
                key={gateway.id}
                onClick={() => setSelectedNode(gateway)}
                className={`relative group cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                  selectedNode?.id === gateway.id ? 'scale-105' : ''
                }`}
              >
                {/* Glow Effect */}
                <div className={`absolute -inset-3 ${colors.bg} blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity`} />
                
                <div className={`relative p-6 ${colors.bg} ${colors.border} border-2 rounded-2xl backdrop-blur-sm shadow-lg ${colors.glow} shadow-xl`}>
                  <div className="flex flex-col items-center">
                    <div className={`p-4 rounded-full ${colors.bg} ${colors.border} border mb-3`}>
                      {getNodeIcon(gateway.type, 36)}
                    </div>
                    <div className="font-mono font-bold text-white text-lg">{gateway.name}</div>
                    <div className="text-xs text-slate-400 font-mono">{gateway.model}</div>
                    <div className="text-xs text-slate-500 font-mono">{gateway.ip}</div>
                    <div className={`mt-2 flex items-center gap-1 ${colors.text}`}>
                      <div className={`w-2 h-2 rounded-full ${gateway.state === 'online' ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
                      <span className="text-xs font-mono uppercase">{gateway.state}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Connection Lines to Switches/APs */}
        <div className="flex justify-center mb-4">
          <svg className="w-full max-w-4xl h-16" viewBox="0 0 800 60">
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.6" />
                <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.6" />
              </linearGradient>
            </defs>
            {/* Main trunk */}
            <line x1="400" y1="0" x2="400" y2="30" stroke="url(#lineGradient)" strokeWidth="3" />
            {/* Horizontal line */}
            <line x1="100" y1="30" x2="700" y2="30" stroke="url(#lineGradient)" strokeWidth="2" />
            {/* Branches */}
            {[100, 250, 400, 550, 700].map((x, i) => (
              <line key={i} x1={x} y1="30" x2={x} y2="60" stroke="url(#lineGradient)" strokeWidth="2" />
            ))}
            {animateTraffic && [100, 250, 400, 550, 700].map((x, i) => (
              <circle key={`pulse-${i}`} cx={x} cy="45" r="3" fill="rgb(16, 185, 129)" opacity="0.8">
                <animate attributeName="cy" values="30;60;30" dur={`${1.5 + i * 0.2}s`} repeatCount="indefinite" />
              </circle>
            ))}
          </svg>
        </div>

        {/* Switches & Access Points Layer */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {[...switches, ...accessPoints, ...otherDevices].map((device: TopologyNode) => {
            const colors = getNodeColor(device.type, device.state);
            return (
              <div
                key={device.id}
                onClick={() => setSelectedNode(device)}
                className={`relative group cursor-pointer transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ${
                  selectedNode?.id === device.id ? 'scale-105 -translate-y-1' : ''
                }`}
              >
                {/* Glow Effect */}
                <div className={`absolute -inset-2 ${colors.bg} blur-lg rounded-xl opacity-0 group-hover:opacity-100 transition-opacity`} />
                
                <div className={`relative p-4 ${colors.bg} ${colors.border} border rounded-xl backdrop-blur-sm`}>
                  <div className="flex flex-col items-center">
                    <div className={`p-3 rounded-full ${colors.bg} ${colors.border} border mb-2`}>
                      <span className={colors.text}>{getNodeIcon(device.type, 24)}</span>
                    </div>
                    {showLabels && (
                      <>
                        <div className="font-mono text-sm text-white truncate max-w-full">{device.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{device.model?.slice(0, 12)}</div>
                      </>
                    )}
                    <div className={`mt-1 flex items-center gap-1 ${colors.text}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${device.state === 'online' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      <span className="text-xs font-mono">{device.state}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Connection Lines to Clients */}
        <div className="flex justify-center mb-4">
          <svg className="w-full max-w-3xl h-12" viewBox="0 0 600 40">
            <line x1="300" y1="0" x2="300" y2="20" stroke="rgb(168, 85, 247)" strokeWidth="2" strokeOpacity="0.5" />
            <line x1="100" y1="20" x2="500" y2="20" stroke="rgb(168, 85, 247)" strokeWidth="2" strokeOpacity="0.5" />
            <line x1="150" y1="20" x2="150" y2="40" stroke="rgb(168, 85, 247)" strokeWidth="2" strokeOpacity="0.5" />
            <line x1="300" y1="20" x2="300" y2="40" stroke="rgb(168, 85, 247)" strokeWidth="2" strokeOpacity="0.5" />
            <line x1="450" y1="20" x2="450" y2="40" stroke="rgb(168, 85, 247)" strokeWidth="2" strokeOpacity="0.5" />
          </svg>
        </div>

        {/* Client Groups Layer */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientGroups.map((group: TopologyNode) => {
            const colors = getNodeColor(group.type, group.state);
            const clientCount = group.clients?.length || 0;
            return (
              <div
                key={group.id}
                onClick={() => setSelectedNode(group)}
                className={`relative group cursor-pointer transition-all duration-300 transform hover:scale-102 ${
                  selectedNode?.id === group.id ? 'ring-2 ring-amber-500/50' : ''
                }`}
              >
                <div className={`relative p-4 ${colors.bg} ${colors.border} border rounded-xl backdrop-blur-sm`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={colors.text}>{getNodeIcon(group.type, 20)}</span>
                      <span className="font-mono font-bold text-white">{group.name}</span>
                    </div>
                    <span className={`px-2 py-0.5 ${colors.bg} ${colors.border} border rounded-full text-xs font-mono ${colors.text}`}>
                      {clientCount} devices
                    </span>
                  </div>
                  
                  {/* Client Icons Grid */}
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-hidden">
                    {group.clients?.slice(0, 12).map((client: any, idx: number) => (
                      <div
                        key={idx}
                        className="w-8 h-8 bg-slate-800/80 rounded-lg flex items-center justify-center border border-slate-700 hover:border-amber-500/50 transition-colors"
                        title={client.name || client.mac}
                      >
                        {client.is_wired ? (
                          <Monitor size={14} className="text-blue-400" />
                        ) : (
                          <Wifi size={14} className="text-purple-400" />
                        )}
                      </div>
                    ))}
                    {clientCount > 12 && (
                      <div className="w-8 h-8 bg-slate-700/80 rounded-lg flex items-center justify-center border border-slate-600 text-xs font-mono text-slate-400">
                        +{clientCount - 12}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend & Networks */}
      <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-700/50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs text-slate-500 font-mono">LEGEND:</span>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="text-xs text-slate-400 font-mono">Gateway</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-400" />
              <span className="text-xs text-slate-400 font-mono">Switch</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-400" />
              <span className="text-xs text-slate-400 font-mono">Access Point</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="text-xs text-slate-400 font-mono">Clients</span>
            </div>
          </div>

          {/* Networks */}
          <div className="flex flex-wrap gap-2">
            {topology?.networks?.slice(0, 5).map((network: any) => (
              <div 
                key={network.id} 
                className="px-3 py-1.5 bg-slate-900/70 rounded-lg border border-slate-700 hover:border-cyan-500/50 transition-colors cursor-pointer"
              >
                <div className="font-mono text-xs text-white">{network.name}</div>
                <div className="text-[10px] text-slate-500">VLAN {network.vlan || 1}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Node Detail Sidebar */}
      {selectedNode && (
        <div className="absolute top-0 right-0 w-80 h-full bg-slate-900/95 backdrop-blur-sm border-l border-slate-700 p-4 overflow-y-auto z-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mono font-bold text-white">Device Details</h3>
            <button 
              onClick={() => setSelectedNode(null)}
              className="p-1 hover:bg-slate-800 rounded transition-colors"
            >
              <XCircle size={18} className="text-slate-400" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
              {getNodeIcon(selectedNode.type, 32)}
              <div>
                <div className="font-mono font-bold text-white">{selectedNode.name}</div>
                <div className="text-xs text-slate-400">{selectedNode.model}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 font-mono">Status</span>
                <span className={`font-mono ${selectedNode.state === 'online' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {selectedNode.state?.toUpperCase()}
                </span>
              </div>
              {selectedNode.ip && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 font-mono">IP Address</span>
                  <span className="text-white font-mono">{selectedNode.ip}</span>
                </div>
              )}
              {selectedNode.mac && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 font-mono">MAC</span>
                  <span className="text-white font-mono text-xs">{selectedNode.mac}</span>
                </div>
              )}
              {selectedNode.type === 'client-group' && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 font-mono">Clients</span>
                  <span className="text-amber-400 font-mono">{selectedNode.clients?.length || 0}</span>
                </div>
              )}
            </div>

            {selectedNode.type === 'client-group' && selectedNode.clients && (
              <div className="mt-4">
                <h4 className="text-sm font-mono text-slate-400 mb-2">Connected Devices</h4>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {selectedNode.clients.map((client: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-slate-800/50 rounded text-xs font-mono">
                      {client.is_wired ? <Monitor size={12} className="text-blue-400" /> : <Wifi size={12} className="text-purple-400" />}
                      <span className="text-white truncate flex-1">{client.name || 'Unknown'}</span>
                      <span className="text-slate-500">{client.ip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes flowDown {
          0% { transform: translateX(-50%) translateY(0); opacity: 1; }
          100% { transform: translateX(-50%) translateY(40px); opacity: 0; }
        }
        @keyframes flowUp {
          0% { transform: translateX(-50%) translateY(0); opacity: 1; }
          100% { transform: translateX(-50%) translateY(-40px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
