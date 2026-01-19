'use client';

/**
 * Red Team Security Dashboard
 * 
 * Provides network topology visualization, vulnerability heatmap,
 * scan scheduling, and attack simulation controls.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Globe, Router, Server, Wifi, Monitor, Users, RefreshCw, Target, Shield, AlertTriangle, Crosshair, Lock, Unlock, Zap, Database, Cloud, Eye, ChevronRight, X } from 'lucide-react';

interface Host {
  ip: string;
  hostname: string;
  mac: string;
  vendor: string;
  os: string;
  status: 'up' | 'down';
  ports: { port: number; service: string; state: string }[];
}

interface Vulnerability {
  cve: string;
  host: string;
  port: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  discoveredAt: string;
}

interface ScanResult {
  scanId: string;
  scanType: string;
  target: string;
  status: string;
  hostsUp: number;
  startedAt: string;
}

interface UniFiDevice {
  mac: string;
  ip: string;
  name: string;
  type: string;
  model: string;
  state: string;
  uptime: number;
}

interface UniFiClient {
  mac: string;
  ip: string;
  name: string;
  hostname: string;
  is_wired: boolean;
  uptime: number;
}

// Detail Sidebar for showing host/device information
function DetailSidebar({ isOpen, onClose, title, children }: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-slate-900 border-l border-red-900/50 shadow-2xl z-50 overflow-y-auto">
      <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 flex items-center justify-between">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Target className="text-red-400" size={18} />
          {title}
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded">
          <X size={20} className="text-slate-400" />
        </button>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

// Schedule Types
interface ScanSchedule {
  id: string;
  name: string;
  target: string;
  scanType: 'ping' | 'syn' | 'version' | 'vuln';
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number;
  hourOfDay: number;
  enabled: boolean;
  lastRun?: string;
  nextRun: string;
  createdAt: string;
}

// Schedule Tab Component
function ScheduleTab({ scanTarget, setScanTarget, onRefresh }: { 
  scanTarget: string; 
  setScanTarget: (v: string) => void;
  onRefresh: () => void;
}) {
  const [schedules, setSchedules] = useState<ScanSchedule[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    target: scanTarget || '192.168.0.0/24',
    scanType: 'ping' as const,
    frequency: 'daily' as const,
    dayOfWeek: 1,
    hourOfDay: 2,
    enabled: true,
  });

  // Load existing schedules
  useEffect(() => {
    loadSchedules();
  }, []);

  async function loadSchedules() {
    setLoading(true);
    try {
      const res = await fetch('/api/security?action=scan-schedules');
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules || []);
      }
    } catch (err) {
      console.error('Failed to load schedules:', err);
    }
    setLoading(false);
  }

  async function createSchedule() {
    if (!newSchedule.name || !newSchedule.target) {
      setError('Please provide a name and target');
      return;
    }

    try {
      const res = await fetch('/api/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_scan_schedule',
          ...newSchedule,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSchedules([...schedules, data.schedule]);
        setIsCreating(false);
        setNewSchedule({
          name: '',
          target: scanTarget || '192.168.0.0/24',
          scanType: 'ping',
          frequency: 'daily',
          dayOfWeek: 1,
          hourOfDay: 2,
          enabled: true,
        });
        setError(null);
      } else {
        setError('Failed to create schedule');
      }
    } catch (err) {
      setError('Network error');
    }
  }

  async function toggleSchedule(id: string, enabled: boolean) {
    try {
      const res = await fetch('/api/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_scan_schedule',
          schedule_id: id,
          enabled: !enabled,
        }),
      });

      if (res.ok) {
        setSchedules(schedules.map(s => 
          s.id === id ? { ...s, enabled: !enabled } : s
        ));
      }
    } catch (err) {
      console.error('Failed to toggle schedule:', err);
    }
  }

  async function deleteSchedule(id: string) {
    try {
      const res = await fetch('/api/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_scan_schedule',
          schedule_id: id,
        }),
      });

      if (res.ok) {
        setSchedules(schedules.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete schedule:', err);
    }
  }

  const frequencyLabels = {
    hourly: 'Every hour',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
  };

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Database className="text-red-400" size={20} />
          Scheduled Scans
        </h3>
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition flex items-center gap-2"
        >
          <Zap size={16} />
          Create Schedule
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Create Schedule Modal */}
      {isCreating && (
        <div className="mb-6 bg-slate-800/80 border border-red-900/50 rounded-xl p-6">
          <h4 className="font-bold text-white mb-4">New Scheduled Scan</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Schedule Name</label>
              <input
                type="text"
                value={newSchedule.name}
                onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                placeholder="Daily Network Scan"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Target</label>
              <input
                type="text"
                value={newSchedule.target}
                onChange={(e) => setNewSchedule({ ...newSchedule, target: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono"
                placeholder="192.168.0.0/24"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Scan Type</label>
              <select
                value={newSchedule.scanType}
                onChange={(e) => setNewSchedule({ ...newSchedule, scanType: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                <option value="ping">Ping Sweep</option>
                <option value="syn">SYN Scan</option>
                <option value="version">Version Detection</option>
                <option value="vuln">Vulnerability Scan</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Frequency</label>
              <select
                value={newSchedule.frequency}
                onChange={(e) => setNewSchedule({ ...newSchedule, frequency: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            {newSchedule.frequency === 'weekly' && (
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Day of Week</label>
                <select
                  value={newSchedule.dayOfWeek}
                  onChange={(e) => setNewSchedule({ ...newSchedule, dayOfWeek: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  {dayLabels.map((day, i) => (
                    <option key={i} value={i}>{day}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Hour (0-23)</label>
              <input
                type="number"
                min={0}
                max={23}
                value={newSchedule.hourOfDay}
                onChange={(e) => setNewSchedule({ ...newSchedule, hourOfDay: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={createSchedule}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition"
            >
              Create Schedule
            </button>
          </div>
        </div>
      )}

      {/* Schedules List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="animate-spin" size={16} /> Loading schedules...
        </div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Database size={48} className="mx-auto mb-4 opacity-50" />
          <p className="mb-2">No scheduled scans configured.</p>
          <p className="text-sm">Click "Create Schedule" to set up automated security scans.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className={`flex items-center justify-between p-4 rounded-lg border transition ${
                schedule.enabled 
                  ? 'bg-slate-700/30 border-slate-600' 
                  : 'bg-slate-800/50 border-slate-700 opacity-60'
              }`}
            >
              <div className="flex items-center gap-4">
                <button
                  onClick={() => toggleSchedule(schedule.id, schedule.enabled)}
                  className={`w-10 h-6 rounded-full transition relative ${
                    schedule.enabled ? 'bg-red-600' : 'bg-slate-600'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                    schedule.enabled ? 'right-1' : 'left-1'
                  }`} />
                </button>
                <div>
                  <div className="font-medium text-white">{schedule.name}</div>
                  <div className="text-sm text-slate-400 flex items-center gap-2">
                    <span className="font-mono text-amber-400">{schedule.target}</span>
                    <span>•</span>
                    <span className="capitalize">{schedule.scanType}</span>
                    <span>•</span>
                    <span>{frequencyLabels[schedule.frequency]}</span>
                    {schedule.frequency === 'weekly' && (
                      <span>on {dayLabels[schedule.dayOfWeek || 0]}</span>
                    )}
                    <span>at {schedule.hourOfDay}:00</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right text-sm">
                  {schedule.lastRun && (
                    <div className="text-slate-500">
                      Last: {new Date(schedule.lastRun).toLocaleString()}
                    </div>
                  )}
                  <div className="text-slate-400">
                    Next: {new Date(schedule.nextRun).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => deleteSchedule(schedule.id)}
                  className="p-2 text-red-400 hover:bg-red-600/20 rounded transition"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RedTeamDashboard() {
  const [activeTab, setActiveTab] = useState<'topology' | 'vulnerabilities' | 'scans' | 'schedule'>('topology');
  const [hosts, setHosts] = useState<Host[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scanTarget, setScanTarget] = useState('192.168.0.0/24');
  const [scanType, setScanType] = useState<'ping' | 'syn' | 'version' | 'vuln'>('ping');
  const [isScanning, setIsScanning] = useState(false);
  
  // UniFi real network data
  const [unifiDevices, setUnifiDevices] = useState<UniFiDevice[]>([]);
  const [unifiClients, setUnifiClients] = useState<UniFiClient[]>([]);
  const [topology, setTopology] = useState<any>(null);
  const [selectedTarget, setSelectedTarget] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'attack' | 'defense'>('attack');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [hostsRes, vulnsRes, scansRes, devicesRes, clientsRes, topoRes] = await Promise.all([
        fetch('/api/pentest?action=hosts'),
        fetch('/api/pentest?action=vulnerabilities'),
        fetch('/api/pentest?action=scan-history'),
        fetch('/api/unifi?action=devices'),
        fetch('/api/unifi?action=clients'),
        fetch('/api/unifi?action=topology'),
      ]);

      if (hostsRes.ok) {
        const data = await hostsRes.json();
        setHosts(data.hosts || []);
      }
      if (vulnsRes.ok) {
        const data = await vulnsRes.json();
        setVulnerabilities(data.vulnerabilities || []);
      }
      if (scansRes.ok) {
        const data = await scansRes.json();
        setScans(data.scans || []);
      }
      if (devicesRes.ok) {
        const data = await devicesRes.json();
        setUnifiDevices(data.devices || []);
      }
      if (clientsRes.ok) {
        const data = await clientsRes.json();
        setUnifiClients(data.clients || []);
      }
      if (topoRes.ok) {
        const data = await topoRes.json();
        setTopology(data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function startScan() {
    setIsScanning(true);
    try {
      const res = await fetch('/api/pentest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'scan-network',
          target: scanTarget,
          type: scanType,
        }),
      });
      if (res.ok) {
        // Refresh data after a delay
        setTimeout(fetchData, 5000);
      }
    } catch (error) {
      console.error('Scan failed:', error);
    }
    setIsScanning(false);
  }

  const severityColors = {
    low: 'bg-emerald-500',
    medium: 'bg-amber-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
  };

  const vulnStats = {
    critical: vulnerabilities.filter(v => v.severity === 'critical').length,
    high: vulnerabilities.filter(v => v.severity === 'high').length,
    medium: vulnerabilities.filter(v => v.severity === 'medium').length,
    low: vulnerabilities.filter(v => v.severity === 'low').length,
  };

  return (
    <div className="bg-gradient-to-br from-slate-950 via-red-950/20 to-slate-950 text-white p-6">
      {/* Page Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/security" className="text-slate-400 hover:text-white transition">
                ← Security
              </Link>
              <div className="h-6 w-px bg-slate-700" />
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔴</span>
                <h1 className="text-xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                  Red Team Operations
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-1 bg-red-900/50 border border-red-700 rounded text-red-300">
                AUTHORIZED TESTING ONLY
              </span>
            </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-6 gap-4 mb-8">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="text-3xl font-bold text-blue-400">{hosts.length}</div>
            <div className="text-sm text-slate-400">Discovered Hosts</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="text-3xl font-bold text-purple-400">
              {hosts.reduce((acc, h) => acc + h.ports.length, 0)}
            </div>
            <div className="text-sm text-slate-400">Open Ports</div>
          </div>
          <div className="col-span-4 bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="text-sm text-slate-400 mb-2">Vulnerabilities by Severity</div>
            <div className="flex gap-4">
              {Object.entries(vulnStats).map(([sev, count]) => (
                <div key={sev} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${severityColors[sev as keyof typeof severityColors]}`} />
                  <span className="text-sm capitalize">{sev}: <strong>{count}</strong></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scan Controls */}
        <div className="bg-slate-800/50 rounded-xl border border-red-900/30 p-6 mb-8">
          <h2 className="text-lg font-bold mb-4 text-red-400">Network Scanner</h2>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="text-sm text-slate-400 mb-1 block">Target Network</label>
              <input
                type="text"
                value={scanTarget}
                onChange={(e) => setScanTarget(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-red-500"
                placeholder="192.168.0.0/24"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Scan Type</label>
              <select
                value={scanType}
                onChange={(e) => setScanType(e.target.value as any)}
                className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-red-500"
              >
                <option value="ping">Ping Sweep</option>
                <option value="syn">SYN Scan</option>
                <option value="version">Version Detection</option>
                <option value="vuln">Vulnerability Scan</option>
              </select>
            </div>
            <button
              onClick={startScan}
              disabled={isScanning}
              className={`px-6 py-2 rounded-lg font-medium transition ${
                isScanning
                  ? 'bg-slate-600 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isScanning ? 'Scanning...' : 'Start Scan'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['topology', 'vulnerabilities', 'scans', 'schedule'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === tab
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          {activeTab === 'topology' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Target className="text-red-400" />
                  Attack Surface Map
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('attack')}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-mono transition ${
                      viewMode === 'attack' ? 'bg-red-600/30 text-red-300 border border-red-600/50' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    <Crosshair size={14} /> Attack View
                  </button>
                  <button
                    onClick={() => setViewMode('defense')}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-mono transition ${
                      viewMode === 'defense' ? 'bg-blue-600/30 text-blue-300 border border-blue-600/50' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    <Shield size={14} /> Defense View
                  </button>
                  <button onClick={fetchData} className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition">
                    <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>
              
              {isLoading ? (
                <div className="text-center py-12 text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="animate-spin" size={16} />
                  Mapping network attack surface...
                </div>
              ) : (
                <div className="min-h-[500px] relative">
                  {/* Network Attack Surface Visualization */}
                  <div className="flex flex-col items-center space-y-6">
                    
                    {/* Internet / External Zone */}
                    <div className="w-full bg-red-950/30 border border-red-800/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3 text-red-400 font-bold">
                        <Globe size={18} />
                        External Zone (UNTRUSTED)
                      </div>
                      <div className="flex flex-wrap gap-3 justify-center">
                        <div 
                          className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg cursor-pointer hover:border-red-500 transition group"
                          onClick={() => setSelectedTarget({ type: 'internet', name: 'Internet Gateway', ip: 'WAN', risk: 'high', exposedPorts: [80, 443, 22] })}
                        >
                          <Cloud size={24} className="text-red-400 mx-auto mb-2" />
                          <div className="text-xs text-center font-mono text-red-300">Internet</div>
                          <div className="text-xs text-center text-slate-500">WAN Access</div>
                        </div>
                        {/* Potential Attack Vectors */}
                        <div className="p-3 bg-slate-800/50 border border-slate-600 rounded-lg opacity-50">
                          <AlertTriangle size={24} className="text-amber-400 mx-auto mb-2" />
                          <div className="text-xs text-center text-slate-400">Port Scanners</div>
                        </div>
                        <div className="p-3 bg-slate-800/50 border border-slate-600 rounded-lg opacity-50">
                          <AlertTriangle size={24} className="text-amber-400 mx-auto mb-2" />
                          <div className="text-xs text-center text-slate-400">Brute Force</div>
                        </div>
                        <div className="p-3 bg-slate-800/50 border border-slate-600 rounded-lg opacity-50">
                          <AlertTriangle size={24} className="text-amber-400 mx-auto mb-2" />
                          <div className="text-xs text-center text-slate-400">DDoS</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Connection Line */}
                    <div className="h-8 w-1 bg-gradient-to-b from-red-600 to-emerald-600 rounded" />
                    
                    {/* Firewall / Gateway */}
                    <div className="w-full bg-amber-950/20 border border-amber-700/30 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3 text-amber-400 font-bold">
                        <Shield size={18} />
                        DMZ / Gateway (FIREWALL)
                      </div>
                      <div className="flex flex-wrap gap-3 justify-center">
                        {topology?.nodes?.filter((n: any) => n.type === 'gateway').map((gw: any) => (
                          <div 
                            key={gw.mac}
                            className={`p-4 rounded-lg cursor-pointer transition ${
                              viewMode === 'attack' 
                                ? 'bg-amber-900/30 border-2 border-amber-600/50 hover:border-red-500' 
                                : 'bg-emerald-900/30 border-2 border-emerald-600/50'
                            }`}
                            onClick={() => setSelectedTarget({ 
                              type: 'gateway', 
                              name: gw.name || 'Gateway', 
                              ip: gw.ip, 
                              mac: gw.mac,
                              model: gw.model,
                              risk: viewMode === 'attack' ? 'critical' : 'protected',
                              exposedPorts: [22, 443, 8443]
                            })}
                          >
                            <Router size={28} className={viewMode === 'attack' ? 'text-amber-400' : 'text-emerald-400'} />
                            <div className="text-sm font-mono text-white mt-2">{gw.name || 'Gateway'}</div>
                            <div className="text-xs text-slate-400">{gw.ip}</div>
                            <div className="text-xs text-slate-500">{gw.model}</div>
                            {viewMode === 'attack' && (
                              <div className="mt-2 px-2 py-0.5 bg-red-600/30 rounded text-xs text-red-300 text-center">
                                PRIMARY TARGET
                              </div>
                            )}
                          </div>
                        ))}
                        {(!topology?.nodes?.some((n: any) => n.type === 'gateway')) && (
                          <div className="p-4 bg-slate-800/50 border border-slate-600 rounded-lg">
                            <Router size={28} className="text-slate-500" />
                            <div className="text-sm text-slate-400 mt-2">No gateway detected</div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Connection Line */}
                    <div className="h-8 w-1 bg-gradient-to-b from-amber-600 to-blue-600 rounded" />
                    
                    {/* Internal Network Devices */}
                    <div className="w-full bg-blue-950/20 border border-blue-700/30 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3 text-blue-400 font-bold">
                        <Server size={18} />
                        Internal Infrastructure
                        <span className="text-xs text-slate-500 ml-2">
                          ({unifiDevices.length} devices, {unifiClients.length} clients)
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        {/* Switches */}
                        {topology?.nodes?.filter((n: any) => n.type === 'usw').map((sw: any) => (
                          <div 
                            key={sw.mac}
                            className={`p-3 rounded-lg cursor-pointer transition ${
                              viewMode === 'attack' 
                                ? 'bg-blue-900/30 border border-blue-600/50 hover:border-red-500' 
                                : 'bg-emerald-900/20 border border-emerald-600/30'
                            }`}
                            onClick={() => setSelectedTarget({ 
                              type: 'switch', 
                              name: sw.name, 
                              ip: sw.ip, 
                              mac: sw.mac,
                              model: sw.model,
                              risk: 'medium',
                              exposedPorts: [22]
                            })}
                          >
                            <Server size={20} className="text-blue-400 mx-auto" />
                            <div className="text-xs font-mono text-center text-white mt-1">{sw.name}</div>
                            <div className="text-xs text-center text-slate-500">{sw.ip}</div>
                          </div>
                        ))}
                        
                        {/* Access Points */}
                        {topology?.nodes?.filter((n: any) => n.type === 'uap').map((ap: any) => (
                          <div 
                            key={ap.mac}
                            className={`p-3 rounded-lg cursor-pointer transition ${
                              viewMode === 'attack' 
                                ? 'bg-purple-900/30 border border-purple-600/50 hover:border-red-500' 
                                : 'bg-emerald-900/20 border border-emerald-600/30'
                            }`}
                            onClick={() => setSelectedTarget({ 
                              type: 'ap', 
                              name: ap.name, 
                              ip: ap.ip, 
                              mac: ap.mac,
                              model: ap.model,
                              risk: 'high',
                              exposedPorts: [22],
                              wirelessVulnerabilities: ['WPA2', 'Deauth', 'Evil Twin']
                            })}
                          >
                            <Wifi size={20} className="text-purple-400 mx-auto" />
                            <div className="text-xs font-mono text-center text-white mt-1">{ap.name}</div>
                            <div className="text-xs text-center text-slate-500">{ap.ip}</div>
                            {viewMode === 'attack' && (
                              <div className="mt-1 px-1 py-0.5 bg-purple-600/30 rounded text-xs text-purple-300 text-center">
                                RF Target
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {/* Show hosts from scans */}
                        {hosts.slice(0, 8).map((host) => (
                          <div 
                            key={host.ip}
                            className={`p-3 rounded-lg cursor-pointer transition ${
                              host.ports.length > 3 
                                ? 'bg-red-900/30 border border-red-600/50 hover:border-red-400' 
                                : 'bg-slate-800/50 border border-slate-600 hover:border-slate-500'
                            }`}
                            onClick={() => setSelectedTarget({ 
                              type: 'host', 
                              name: host.hostname || host.ip, 
                              ip: host.ip, 
                              mac: host.mac,
                              vendor: host.vendor,
                              os: host.os,
                              risk: host.ports.length > 5 ? 'high' : host.ports.length > 2 ? 'medium' : 'low',
                              exposedPorts: host.ports.map(p => p.port)
                            })}
                          >
                            <Monitor size={20} className={host.status === 'up' ? 'text-emerald-400' : 'text-red-400'} />
                            <div className="text-xs font-mono text-center text-white mt-1">{host.ip}</div>
                            <div className="text-xs text-center text-slate-500">{host.hostname || 'Unknown'}</div>
                            {host.ports.length > 0 && (
                              <div className="mt-1 text-xs text-center text-amber-400">
                                {host.ports.length} ports
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Connection Line */}
                    <div className="h-8 w-1 bg-gradient-to-b from-blue-600 to-emerald-600 rounded" />
                    
                    {/* Endpoints / Clients */}
                    <div className="w-full bg-emerald-950/20 border border-emerald-700/30 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3 text-emerald-400 font-bold">
                        <Users size={18} />
                        Endpoints ({unifiClients.length} active)
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {unifiClients.slice(0, 12).map((client) => (
                          <div 
                            key={client.mac}
                            className={`p-2 rounded cursor-pointer transition ${
                              viewMode === 'attack' 
                                ? 'bg-slate-800/50 border border-slate-600 hover:border-red-500' 
                                : 'bg-emerald-900/20 border border-emerald-700/30'
                            }`}
                            onClick={() => setSelectedTarget({ 
                              type: 'client', 
                              name: client.name || client.hostname || 'Unknown', 
                              ip: client.ip, 
                              mac: client.mac,
                              isWired: client.is_wired,
                              risk: client.is_wired ? 'low' : 'medium'
                            })}
                          >
                            {client.is_wired ? (
                              <Monitor size={16} className="text-slate-400" />
                            ) : (
                              <Wifi size={16} className="text-purple-400" />
                            )}
                            <div className="text-xs text-slate-300 mt-0.5">{client.name || client.hostname || client.mac.slice(-8)}</div>
                          </div>
                        ))}
                        {unifiClients.length > 12 && (
                          <div className="p-2 bg-slate-800/50 rounded text-xs text-slate-400">
                            +{unifiClients.length - 12} more
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Legend */}
                  <div className="mt-6 pt-4 border-t border-slate-700 flex flex-wrap justify-between">
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500/30 border border-red-500 rounded" /> Critical</span>
                      <span className="flex items-center gap-1"><div className="w-3 h-3 bg-amber-500/30 border border-amber-500 rounded" /> High</span>
                      <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500/30 border border-blue-500 rounded" /> Medium</span>
                      <span className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500/30 border border-emerald-500 rounded" /> Low</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Click any device to view attack vectors and vulnerabilities
                    </div>
                  </div>
                </div>
              )}
              
              {/* Detail Sidebar */}
              <DetailSidebar 
                isOpen={!!selectedTarget} 
                onClose={() => setSelectedTarget(null)}
                title={selectedTarget?.name || 'Target Details'}
              >
                {selectedTarget && (
                  <div className="space-y-4">
                    <div className={`p-3 rounded-lg ${
                      selectedTarget.risk === 'critical' ? 'bg-red-900/30 border border-red-600' :
                      selectedTarget.risk === 'high' ? 'bg-amber-900/30 border border-amber-600' :
                      selectedTarget.risk === 'medium' ? 'bg-blue-900/30 border border-blue-600' :
                      'bg-emerald-900/30 border border-emerald-600'
                    }`}>
                      <div className="text-xs uppercase text-slate-400 mb-1">Risk Level</div>
                      <div className={`font-bold ${
                        selectedTarget.risk === 'critical' ? 'text-red-400' :
                        selectedTarget.risk === 'high' ? 'text-amber-400' :
                        selectedTarget.risk === 'medium' ? 'text-blue-400' :
                        'text-emerald-400'
                      }`}>
                        {selectedTarget.risk?.toUpperCase()}
                      </div>
                    </div>
                    
                    <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">IP Address:</span>
                        <span className="font-mono text-amber-400">{selectedTarget.ip}</span>
                      </div>
                      {selectedTarget.mac && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">MAC:</span>
                          <span className="font-mono text-slate-300">{selectedTarget.mac}</span>
                        </div>
                      )}
                      {selectedTarget.model && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Model:</span>
                          <span className="text-slate-300">{selectedTarget.model}</span>
                        </div>
                      )}
                      {selectedTarget.vendor && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Vendor:</span>
                          <span className="text-slate-300">{selectedTarget.vendor}</span>
                        </div>
                      )}
                      {selectedTarget.os && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">OS:</span>
                          <span className="text-slate-300">{selectedTarget.os}</span>
                        </div>
                      )}
                    </div>
                    
                    {selectedTarget.exposedPorts && selectedTarget.exposedPorts.length > 0 && (
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <div className="text-xs uppercase text-red-400 mb-2 flex items-center gap-1">
                          <AlertTriangle size={12} /> Exposed Ports
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {selectedTarget.exposedPorts.map((port: number) => (
                            <span key={port} className="px-2 py-0.5 bg-red-900/30 border border-red-700/50 rounded text-xs text-red-300">
                              {port}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedTarget.wirelessVulnerabilities && (
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <div className="text-xs uppercase text-purple-400 mb-2 flex items-center gap-1">
                          <Wifi size={12} /> Wireless Attack Vectors
                        </div>
                        <div className="space-y-1">
                          {selectedTarget.wirelessVulnerabilities.map((vuln: string) => (
                            <div key={vuln} className="text-sm text-purple-300 flex items-center gap-2">
                              <ChevronRight size={12} /> {vuln}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="pt-3 border-t border-slate-700">
                      <div className="text-xs uppercase text-slate-400 mb-2">Quick Actions</div>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => {
                            setScanTarget(selectedTarget.ip);
                            setScanType('syn');
                          }}
                          className="p-2 bg-red-600/20 border border-red-600/50 rounded text-red-300 text-xs hover:bg-red-600/30 transition"
                        >
                          Port Scan
                        </button>
                        <button 
                          onClick={() => {
                            setScanTarget(selectedTarget.ip);
                            setScanType('vuln');
                          }}
                          className="p-2 bg-amber-600/20 border border-amber-600/50 rounded text-amber-300 text-xs hover:bg-amber-600/30 transition"
                        >
                          Vuln Scan
                        </button>
                        <button className="p-2 bg-purple-600/20 border border-purple-600/50 rounded text-purple-300 text-xs hover:bg-purple-600/30 transition">
                          Banner Grab
                        </button>
                        <button className="p-2 bg-blue-600/20 border border-blue-600/50 rounded text-blue-300 text-xs hover:bg-blue-600/30 transition">
                          OS Detect
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </DetailSidebar>
            </div>
          )}

          {activeTab === 'vulnerabilities' && (
            <div>
              <h3 className="text-lg font-bold mb-4">Vulnerability Report</h3>
              {vulnerabilities.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  No vulnerabilities found. Run a vulnerability scan to detect security issues.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-slate-400 border-b border-slate-700">
                      <tr>
                        <th className="pb-2 font-medium">CVE</th>
                        <th className="pb-2 font-medium">Host</th>
                        <th className="pb-2 font-medium">Port</th>
                        <th className="pb-2 font-medium">Severity</th>
                        <th className="pb-2 font-medium">Discovered</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {vulnerabilities.map((vuln, idx) => (
                        <tr key={idx} className="hover:bg-slate-700/30">
                          <td className="py-3 font-mono text-red-400">{vuln.cve}</td>
                          <td className="py-3 font-mono text-amber-400">{vuln.host}</td>
                          <td className="py-3">{vuln.port}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              vuln.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                              vuln.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                              vuln.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-emerald-500/20 text-emerald-400'
                            }`}>
                              {vuln.severity}
                            </span>
                          </td>
                          <td className="py-3 text-slate-400">
                            {new Date(vuln.discoveredAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'scans' && (
            <div>
              <h3 className="text-lg font-bold mb-4">Scan History</h3>
              {scans.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  No scans performed yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {scans.map((scan) => (
                    <div
                      key={scan.scanId}
                      className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg"
                    >
                      <div>
                        <span className="font-mono text-xs text-slate-500">{scan.scanId}</span>
                        <div className="font-medium">{scan.target}</div>
                        <div className="text-sm text-slate-400">{scan.scanType} scan</div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          scan.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                          scan.status === 'running' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {scan.status}
                        </span>
                        <div className="text-sm text-slate-400 mt-1">
                          {scan.hostsUp} hosts discovered
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(scan.startedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'schedule' && (
            <ScheduleTab 
              scanTarget={scanTarget} 
              setScanTarget={setScanTarget}
              onRefresh={fetchData}
            />
          )}
        </div>

        {/* Attack Simulation Panel */}
        <div className="mt-8 bg-slate-800/50 rounded-xl border border-red-900/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">⚠️</span>
            <h2 className="text-lg font-bold text-red-400">Attack Simulation</h2>
            <span className="ml-auto px-2 py-1 bg-red-900/50 text-red-300 text-xs rounded">
              REQUIRES AUTHORIZATION
            </span>
          </div>
          <p className="text-slate-400 text-sm mb-4">
            Run controlled attack simulations to test security controls. All activities are logged and require explicit authorization.
          </p>
          <div className="grid grid-cols-4 gap-4">
            <button className="p-4 bg-slate-700/50 border border-slate-600 rounded-lg hover:border-red-500/50 transition text-left">
              <div className="text-red-400 font-medium mb-1">Credential Testing</div>
              <div className="text-xs text-slate-400">Test password policies</div>
            </button>
            <button className="p-4 bg-slate-700/50 border border-slate-600 rounded-lg hover:border-red-500/50 transition text-left">
              <div className="text-red-400 font-medium mb-1">Phishing Simulation</div>
              <div className="text-xs text-slate-400">Test user awareness</div>
            </button>
            <button className="p-4 bg-slate-700/50 border border-slate-600 rounded-lg hover:border-red-500/50 transition text-left">
              <div className="text-red-400 font-medium mb-1">Network Pivot Test</div>
              <div className="text-xs text-slate-400">Test segmentation</div>
            </button>
            <button className="p-4 bg-slate-700/50 border border-slate-600 rounded-lg hover:border-red-500/50 transition text-left">
              <div className="text-red-400 font-medium mb-1">Exfil Detection</div>
              <div className="text-xs text-slate-400">Test DLP controls</div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
