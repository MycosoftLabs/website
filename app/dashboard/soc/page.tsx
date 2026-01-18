'use client';

/**
 * Security Operations Center Dashboard
 * 
 * Real-time security monitoring and threat detection dashboard
 * with UniFi network integration.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  Globe, 
  Users, 
  Activity,
  MapPin,
  Wifi,
  Lock,
  Unlock,
  Eye,
  RefreshCw,
  ChevronDown,
  XCircle,
  CheckCircle,
  Clock,
  Zap,
  Server
} from 'lucide-react';

// Types
interface SecurityStatus {
  status: string;
  threat_level: 'low' | 'elevated' | 'high' | 'critical';
  monitoring_enabled: boolean;
  last_check: string;
  events_last_hour: number;
  events_last_day: number;
  critical_events: number;
  high_events: number;
  unique_ips: number;
  uptime_seconds: number;
}

interface AuthorizedUser {
  id: string;
  name: string;
  role: string;
  locations: { name: string; city: string; state: string; country: string; primary: boolean }[];
  mobile_access: boolean;
  vpn_allowed: boolean;
}

interface SecurityEvent {
  id: string;
  timestamp: string;
  event_type: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  source_ip: string;
  source_mac?: string;
  destination_ip?: string;
  geo_location?: {
    country: string;
    country_code: string;
    city: string;
    region: string;
  };
  rule_matched?: string;
  action_taken?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

interface ThreatSummary {
  summary: {
    total_events_hour: number;
    total_events_day: number;
    critical_hour: number;
    critical_day: number;
    high_hour: number;
    high_day: number;
    unique_ips_hour: number;
    unique_ips_day: number;
    blocked_count: number;
    last_updated: string;
  };
  events_by_type: Record<string, number>;
  top_source_ips: { ip: string; count: number }[];
  country_distribution: Record<string, number>;
}

// Severity colors and badges
const severityConfig = {
  info: { color: 'bg-blue-500', textColor: 'text-blue-400', bgLight: 'bg-blue-500/10', icon: Eye },
  low: { color: 'bg-green-500', textColor: 'text-green-400', bgLight: 'bg-green-500/10', icon: CheckCircle },
  medium: { color: 'bg-yellow-500', textColor: 'text-yellow-400', bgLight: 'bg-yellow-500/10', icon: AlertTriangle },
  high: { color: 'bg-orange-500', textColor: 'text-orange-400', bgLight: 'bg-orange-500/10', icon: AlertTriangle },
  critical: { color: 'bg-red-500', textColor: 'text-red-400', bgLight: 'bg-red-500/10', icon: XCircle },
};

const threatLevelConfig = {
  low: { color: 'from-green-600 to-green-800', text: 'Low', icon: Shield },
  elevated: { color: 'from-yellow-600 to-yellow-800', text: 'Elevated', icon: Eye },
  high: { color: 'from-orange-600 to-orange-800', text: 'High', icon: AlertTriangle },
  critical: { color: 'from-red-600 to-red-800', text: 'Critical', icon: Zap },
};

export default function SecurityOperationsCenterPage() {
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [users, setUsers] = useState<AuthorizedUser[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [threatSummary, setThreatSummary] = useState<ThreatSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [ipLookup, setIpLookup] = useState<string>('');
  const [lookupResult, setLookupResult] = useState<Record<string, unknown> | null>(null);

  // Fetch security data
  const fetchData = useCallback(async () => {
    try {
      const [statusRes, usersRes, eventsRes, threatsRes] = await Promise.all([
        fetch('/api/security?action=status'),
        fetch('/api/security?action=users'),
        fetch('/api/security?action=events&limit=50'),
        fetch('/api/security?action=threats')
      ]);

      if (!statusRes.ok || !usersRes.ok || !eventsRes.ok || !threatsRes.ok) {
        throw new Error('Failed to fetch security data');
      }

      const [statusData, usersData, eventsData, threatsData] = await Promise.all([
        statusRes.json(),
        usersRes.json(),
        eventsRes.json(),
        threatsRes.json()
      ]);

      setStatus(statusData);
      setUsers(usersData.users || []);
      setEvents(eventsData.events || []);
      setThreatSummary(threatsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchData, 30000); // 30 second refresh
      return () => clearInterval(interval);
    }
  }, [fetchData, autoRefresh]);

  // Geo-IP lookup
  const handleIpLookup = async () => {
    if (!ipLookup) return;
    try {
      const res = await fetch(`/api/security?action=geo-lookup&ip=${ipLookup}`);
      const data = await res.json();
      setLookupResult(data);
    } catch {
      setLookupResult({ error: 'Lookup failed' });
    }
  };

  // Acknowledge event
  const acknowledgeEvent = async (eventId: string) => {
    try {
      await fetch('/api/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge_event', event_id: eventId })
      });
      fetchData();
    } catch {
      console.error('Failed to acknowledge event');
    }
  };

  // Block IP
  const handleBlockIP = async (ip: string, reason: string) => {
    if (!confirm(`Block IP ${ip}?`)) return;
    try {
      await fetch('/api/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'block_ip', ip, reason })
      });
      fetchData();
    } catch {
      console.error('Failed to block IP');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
          <p className="text-slate-400">Loading Security Operations Center...</p>
        </div>
      </div>
    );
  }

  const threatLevel = status?.threat_level || 'low';
  const ThreatIcon = threatLevelConfig[threatLevel].icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${threatLevelConfig[threatLevel].color}`}>
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Security Operations Center</h1>
                <p className="text-sm text-slate-400">Mycosoft 24/7 Threat Monitoring</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Threat Level Indicator */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r ${threatLevelConfig[threatLevel].color}`}>
                <ThreatIcon className="w-5 h-5" />
                <span className="font-semibold">Threat Level: {threatLevelConfig[threatLevel].text}</span>
              </div>
              
              {/* Auto Refresh Toggle */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                  autoRefresh 
                    ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400' 
                    : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                <span className="text-sm">{autoRefresh ? 'Live' : 'Paused'}</span>
              </button>
              
              {/* Manual Refresh */}
              <button
                onClick={fetchData}
                className="p-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-400">{error}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard
            title="Events (1hr)"
            value={status?.events_last_hour || 0}
            icon={Activity}
            color="cyan"
          />
          <StatCard
            title="Events (24hr)"
            value={status?.events_last_day || 0}
            icon={Clock}
            color="blue"
          />
          <StatCard
            title="Critical"
            value={status?.critical_events || 0}
            icon={XCircle}
            color="red"
            alert={status?.critical_events && status.critical_events > 0}
          />
          <StatCard
            title="High Severity"
            value={status?.high_events || 0}
            icon={AlertTriangle}
            color="orange"
          />
          <StatCard
            title="Unique IPs"
            value={status?.unique_ips || 0}
            icon={Globe}
            color="purple"
          />
          <StatCard
            title="Blocked"
            value={threatSummary?.summary.blocked_count || 0}
            icon={Lock}
            color="emerald"
          />
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Events */}
          <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                Recent Security Events
              </h2>
              <span className="text-sm text-slate-400">{events.length} events</span>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {events.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                  <p>No security events detected</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/50">
                  {events.map((event) => {
                    const config = severityConfig[event.severity];
                    const Icon = config.icon;
                    return (
                      <div
                        key={event.id}
                        className="px-4 py-3 hover:bg-slate-800/30 cursor-pointer transition-colors"
                        onClick={() => setSelectedEvent(event)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-1.5 rounded-lg ${config.bgLight}`}>
                            <Icon className={`w-4 h-4 ${config.textColor}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${config.textColor}`}>
                                {event.severity.toUpperCase()}
                              </span>
                              <span className="text-sm text-slate-400">
                                {event.event_type.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <p className="text-sm text-slate-300 truncate">{event.description}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                {event.source_ip}
                              </span>
                              {event.geo_location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {event.geo_location.city}, {event.geo_location.country_code}
                                </span>
                              )}
                              <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBlockIP(event.source_ip, `Blocked from SOC - ${event.event_type}`);
                            }}
                            className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                            title="Block IP"
                          >
                            <Lock className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Authorized Users */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800">
                <h2 className="font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  Authorized Users ({users.length})
                </h2>
              </div>
              <div className="p-4 space-y-3">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-semibold text-sm">
                      {user.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{user.name}</p>
                      <p className="text-xs text-slate-400">
                        {user.locations.find(l => l.primary)?.city || user.locations[0]?.city}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {user.mobile_access && (
                        <span title="Mobile Access" className="p-1 rounded bg-blue-500/10 text-blue-400">
                          <Wifi className="w-3 h-3" />
                        </span>
                      )}
                      {user.vpn_allowed && (
                        <span title="VPN Allowed" className="p-1 rounded bg-purple-500/10 text-purple-400">
                          <Lock className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* IP Lookup Tool */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800">
                <h2 className="font-semibold flex items-center gap-2">
                  <Globe className="w-5 h-5 text-purple-400" />
                  Geo-IP Lookup
                </h2>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ipLookup}
                    onChange={(e) => setIpLookup(e.target.value)}
                    placeholder="Enter IP address..."
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={handleIpLookup}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium transition-colors"
                  >
                    Lookup
                  </button>
                </div>
                {lookupResult && (
                  <div className="p-3 bg-slate-800/50 rounded-lg text-sm space-y-1">
                    {lookupResult.error ? (
                      <p className="text-red-400">{String(lookupResult.error)}</p>
                    ) : (
                      <>
                        <p><span className="text-slate-400">Country:</span> {String(lookupResult.country)} ({String(lookupResult.country_code)})</p>
                        <p><span className="text-slate-400">City:</span> {String(lookupResult.city)}, {String(lookupResult.region)}</p>
                        <p><span className="text-slate-400">ISP:</span> {String(lookupResult.isp)}</p>
                        <p className={lookupResult.is_high_risk ? 'text-red-400' : lookupResult.is_allowed_country ? 'text-green-400' : 'text-yellow-400'}>
                          Risk Level: {String(lookupResult.risk_level)}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Top Threat Sources */}
            {threatSummary?.top_source_ips && threatSummary.top_source_ips.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800">
                  <h2 className="font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-400" />
                    Top Threat Sources
                  </h2>
                </div>
                <div className="p-4 space-y-2">
                  {threatSummary.top_source_ips.slice(0, 5).map(({ ip, count }) => (
                    <div key={ip} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                      <span className="font-mono text-sm text-slate-300">{ip}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-400">{count} events</span>
                        <button
                          onClick={() => handleBlockIP(ip, 'Top threat source')}
                          className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400"
                          title="Block IP"
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Country Distribution */}
        {threatSummary?.country_distribution && Object.keys(threatSummary.country_distribution).length > 0 && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800">
              <h2 className="font-semibold flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-400" />
                Event Country Distribution
              </h2>
            </div>
            <div className="p-4 flex flex-wrap gap-2">
              {Object.entries(threatSummary.country_distribution)
                .sort((a, b) => b[1] - a[1])
                .map(([country, count]) => {
                  const isHighRisk = ['CN', 'RU', 'KP', 'IR', 'BY'].includes(country);
                  const isAllowed = ['US', 'CA'].includes(country);
                  return (
                    <span
                      key={country}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        isHighRisk
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : isAllowed
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      }`}
                    >
                      {country}: {count}
                    </span>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedEvent(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-semibold">Event Details</h3>
              <button onClick={() => setSelectedEvent(null)} className="p-1 rounded hover:bg-slate-700">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400">Event ID</label>
                  <p className="font-mono text-sm">{selectedEvent.id}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Timestamp</label>
                  <p className="text-sm">{new Date(selectedEvent.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Event Type</label>
                  <p className="text-sm">{selectedEvent.event_type.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Severity</label>
                  <p className={`text-sm font-medium ${severityConfig[selectedEvent.severity].textColor}`}>
                    {selectedEvent.severity.toUpperCase()}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Source IP</label>
                  <p className="font-mono text-sm">{selectedEvent.source_ip}</p>
                </div>
                {selectedEvent.source_mac && (
                  <div>
                    <label className="text-xs text-slate-400">Source MAC</label>
                    <p className="font-mono text-sm">{selectedEvent.source_mac}</p>
                  </div>
                )}
                {selectedEvent.geo_location && (
                  <div className="col-span-2">
                    <label className="text-xs text-slate-400">Location</label>
                    <p className="text-sm">
                      {selectedEvent.geo_location.city}, {selectedEvent.geo_location.region}, {selectedEvent.geo_location.country}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-slate-400">Description</label>
                <p className="text-sm">{selectedEvent.description}</p>
              </div>
              {selectedEvent.rule_matched && (
                <div>
                  <label className="text-xs text-slate-400">Rule Matched</label>
                  <p className="text-sm font-mono">{selectedEvent.rule_matched}</p>
                </div>
              )}
              {selectedEvent.action_taken && (
                <div>
                  <label className="text-xs text-slate-400">Action Taken</label>
                  <p className="text-sm">{selectedEvent.action_taken.replace(/_/g, ' ')}</p>
                </div>
              )}
              {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
                <div>
                  <label className="text-xs text-slate-400">Metadata</label>
                  <pre className="text-xs bg-slate-800 rounded p-2 overflow-x-auto">
                    {JSON.stringify(selectedEvent.metadata, null, 2)}
                  </pre>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    acknowledgeEvent(selectedEvent.id);
                    setSelectedEvent(null);
                  }}
                  className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Acknowledge
                </button>
                <button
                  onClick={() => {
                    handleBlockIP(selectedEvent.source_ip, `Blocked from event ${selectedEvent.id}`);
                    setSelectedEvent(null);
                  }}
                  className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Block IP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  alert 
}: { 
  title: string; 
  value: number; 
  icon: React.ComponentType<{ className?: string }>; 
  color: string;
  alert?: boolean;
}) {
  const colorClasses: Record<string, string> = {
    cyan: 'from-cyan-600 to-cyan-800 text-cyan-400',
    blue: 'from-blue-600 to-blue-800 text-blue-400',
    red: 'from-red-600 to-red-800 text-red-400',
    orange: 'from-orange-600 to-orange-800 text-orange-400',
    purple: 'from-purple-600 to-purple-800 text-purple-400',
    emerald: 'from-emerald-600 to-emerald-800 text-emerald-400',
  };

  return (
    <div className={`bg-slate-900/50 border border-slate-800 rounded-xl p-4 ${alert ? 'ring-2 ring-red-500 animate-pulse' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-5 h-5 ${colorClasses[color].split(' ')[2]}`} />
        {alert && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-slate-400">{title}</p>
    </div>
  );
}
