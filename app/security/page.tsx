"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Shield, Activity, Globe, Users, Eye, Lock, Server, RefreshCw, Search, Network, ArrowRight, HelpCircle } from "lucide-react";
import { SecurityTour, WelcomeModal, useSecurityTour, socDashboardTour, TourTriggerButton } from "@/components/security/tour";

interface SecurityStatus {
  status: string;
  threat_level: string;
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
  locations: Array<{
    name: string;
    city: string;
    state: string;
    country: string;
    primary: boolean;
  }>;
  mobile_access: boolean;
  vpn_allowed: boolean;
}

interface GeoIpResult {
  ip: string;
  country: string;
  country_code: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  isp: string;
  organization: string;
  is_proxy: boolean;
  is_hosting: boolean;
  is_allowed_country: boolean;
  is_high_risk: boolean;
  risk_level: string;
}

interface SecurityEvent {
  id: string;
  timestamp: string;
  event_type: string;
  severity: string;
  source_ip: string;
  description: string;
  geo_location?: {
    country: string;
    city: string;
  };
}

export default function SecurityPage() {
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [users, setUsers] = useState<AuthorizedUser[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ipLookup, setIpLookup] = useState("");
  const [geoResult, setGeoResult] = useState<GeoIpResult | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [statusRes, usersRes, eventsRes] = await Promise.all([
        fetch("/api/security?action=status"),
        fetch("/api/security?action=users"),
        fetch("/api/security?action=events"),
      ]);

      if (!statusRes.ok || !usersRes.ok || !eventsRes.ok) {
        throw new Error("Failed to fetch security data");
      }

      const statusData = await statusRes.json();
      const usersData = await usersRes.json();
      const eventsData = await eventsRes.json();

      setStatus(statusData);
      setUsers(usersData.users || []);
      setEvents(eventsData.events || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleIpLookup = async () => {
    if (!ipLookup.trim()) return;
    setLookupLoading(true);
    try {
      const res = await fetch(`/api/security?action=geo-lookup&ip=${encodeURIComponent(ipLookup.trim())}`);
      if (!res.ok) throw new Error("IP lookup failed");
      const data = await res.json();
      setGeoResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLookupLoading(false);
    }
  };

  const getThreatColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case "critical":
        return "text-red-500 bg-red-500/10";
      case "high":
        return "text-orange-500 bg-orange-500/10";
      case "medium":
        return "text-yellow-500 bg-yellow-500/10";
      case "low":
        return "text-green-500 bg-green-500/10";
      default:
        return "text-gray-500 bg-gray-500/10";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-emerald-400">
          <RefreshCw className="animate-spin" size={24} />
          <span className="text-lg font-mono">Loading Security Operations Center...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Welcome Modal for first-time users */}
      <WelcomeModal />
      
      {/* Tour for SOC Dashboard */}
      <SecurityTour tourId="soc-dashboard" steps={socDashboardTour} />
      
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-8" data-tour="soc-header">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="text-emerald-400" size={32} />
              <h1 className="text-3xl font-bold text-white font-mono">Security Operations Center</h1>
            </div>
            <p className="text-slate-400 font-mono text-sm">Mycosoft Network Security Monitoring | 24/7 Active Protection</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Staff Tour Button */}
            <TourTriggerButton tourId="soc-dashboard" />
            
            <Link 
              href="/security/compliance"
              className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-mono text-sm rounded-lg transition-colors"
              data-tour="nav-compliance"
            >
              <Lock size={16} />
              Compliance
            </Link>
            <Link 
              href="/security/incidents"
              className="flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white font-mono text-sm rounded-lg transition-colors"
              data-tour="nav-incidents"
            >
              <AlertTriangle size={16} />
              Incidents
            </Link>
            <Link 
              href="/security/redteam"
              className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-500 text-white font-mono text-sm rounded-lg transition-colors"
              data-tour="nav-redteam"
            >
              🔴 Red Team
            </Link>
            <Link 
              href="/security/network"
              className="flex items-center gap-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-sm rounded-lg transition-colors"
              data-tour="nav-network"
            >
              <Network size={18} />
              Network
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 font-mono">{error}</p>
        </div>
      )}

      {/* Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" data-tour="metrics-panel">
        {/* Threat Level */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6" data-tour="threat-status">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 font-mono text-sm">Threat Level</span>
            <AlertTriangle className={`${getThreatColor(status?.threat_level || "low").split(" ")[0]}`} size={20} />
          </div>
          <div className={`text-2xl font-bold font-mono uppercase px-3 py-1 rounded-lg inline-block ${getThreatColor(status?.threat_level || "low")}`}>
            {status?.threat_level || "UNKNOWN"}
          </div>
        </div>

        {/* Monitoring Status */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 font-mono text-sm">Monitoring</span>
            <Activity className="text-emerald-400" size={20} />
          </div>
          <div className={`text-2xl font-bold font-mono ${status?.monitoring_enabled ? "text-emerald-400" : "text-red-400"}`}>
            {status?.monitoring_enabled ? "ACTIVE" : "DISABLED"}
          </div>
        </div>

        {/* Events Today */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 font-mono text-sm">Events (24h)</span>
            <Eye className="text-blue-400" size={20} />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {status?.events_last_day || 0}
            <span className="text-sm text-slate-500 ml-2">
              ({status?.critical_events || 0} critical)
            </span>
          </div>
        </div>

        {/* Unique IPs */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 font-mono text-sm">Unique IPs</span>
            <Globe className="text-purple-400" size={20} />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {status?.unique_ips || 0}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Authorized Users */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Users className="text-emerald-400" size={20} />
            <h2 className="text-lg font-bold text-white font-mono">Authorized Users</h2>
          </div>
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-white">{user.name}</span>
                  <span className="text-xs font-mono px-2 py-1 rounded bg-emerald-500/20 text-emerald-400">
                    {user.role}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  {user.locations.map((loc, i) => (
                    <span key={i} className={loc.primary ? "text-emerald-400" : ""}>
                      {loc.city}, {loc.state}
                      {i < user.locations.length - 1 ? " • " : ""}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* IP Lookup */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Search className="text-blue-400" size={20} />
            <h2 className="text-lg font-bold text-white font-mono">IP Lookup</h2>
          </div>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={ipLookup}
              onChange={(e) => setIpLookup(e.target.value)}
              placeholder="Enter IP address..."
              className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
              onKeyDown={(e) => e.key === "Enter" && handleIpLookup()}
            />
            <button
              onClick={handleIpLookup}
              disabled={lookupLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono rounded-lg transition-colors disabled:opacity-50"
            >
              {lookupLoading ? "..." : "Lookup"}
            </button>
          </div>

          {geoResult && (
            <div className="space-y-2 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-400 font-mono text-xs">IP</span>
                <span className="text-white font-mono text-xs">{geoResult.ip}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-mono text-xs">Location</span>
                <span className="text-white font-mono text-xs">{geoResult.city}, {geoResult.region}, {geoResult.country_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-mono text-xs">ISP</span>
                <span className="text-white font-mono text-xs truncate max-w-[200px]">{geoResult.isp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-mono text-xs">Risk Level</span>
                <span className={`font-mono text-xs px-2 py-0.5 rounded ${getThreatColor(geoResult.risk_level)}`}>
                  {geoResult.risk_level.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-mono text-xs">Proxy/VPN</span>
                <span className={`font-mono text-xs ${geoResult.is_proxy ? "text-red-400" : "text-emerald-400"}`}>
                  {geoResult.is_proxy ? "YES" : "NO"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-mono text-xs">Allowed Country</span>
                <span className={`font-mono text-xs ${geoResult.is_allowed_country ? "text-emerald-400" : "text-red-400"}`}>
                  {geoResult.is_allowed_country ? "YES" : "NO"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Recent Events */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Server className="text-orange-400" size={20} />
            <h2 className="text-lg font-bold text-white font-mono">Recent Events</h2>
          </div>
          
          {events.length === 0 ? (
            <div className="text-center py-8 text-slate-500 font-mono">
              <Lock className="mx-auto mb-2" size={24} />
              <p>No security events</p>
              <p className="text-xs">All systems normal</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {events.map((event) => (
                <div key={event.id} className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${getThreatColor(event.severity)}`}>
                      {event.severity.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-white font-mono">{event.event_type}</p>
                  <p className="text-xs text-slate-400 font-mono">{event.source_ip}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Security Agents & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Security Agents */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white font-mono mb-4 flex items-center gap-2">
            <Server className="text-purple-400" size={20} />
            Security Agents
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'watchdog', name: 'Watchdog', status: 'active', desc: 'Continuous monitoring' },
              { id: 'hunter', name: 'Hunter', status: 'active', desc: 'Threat hunting' },
              { id: 'guardian', name: 'Guardian', status: 'active', desc: 'System protection' },
              { id: 'incident-response', name: 'Incident Response', status: 'active', desc: 'Auto remediation' },
              { id: 'suricata', name: 'Suricata IDS', status: 'active', desc: 'Network IDS/IPS' },
              { id: 'threat-intel', name: 'Threat Intel', status: 'active', desc: 'Intelligence feeds' },
            ].map((agent) => (
              <div key={agent.id} className="p-3 bg-slate-900/50 rounded-lg border border-slate-700 flex items-center justify-between">
                <div>
                  <div className="font-mono text-sm text-white">{agent.name}</div>
                  <div className="text-xs text-slate-500">{agent.desc}</div>
                </div>
                <div className={`w-2 h-2 rounded-full ${agent.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white font-mono mb-4 flex items-center gap-2">
            <Activity className="text-amber-400" size={20} />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/security/redteam" className="p-4 bg-red-900/30 border border-red-700/50 rounded-lg hover:bg-red-900/50 transition">
              <div className="text-red-400 font-mono font-bold mb-1">🔴 Red Team</div>
              <div className="text-xs text-slate-400">Penetration testing & scanning</div>
            </Link>
            <Link href="/security/incidents" className="p-4 bg-orange-900/30 border border-orange-700/50 rounded-lg hover:bg-orange-900/50 transition">
              <div className="text-orange-400 font-mono font-bold mb-1">⚠️ Incidents</div>
              <div className="text-xs text-slate-400">Incident management</div>
            </Link>
            <Link href="/security/network" className="p-4 bg-cyan-900/30 border border-cyan-700/50 rounded-lg hover:bg-cyan-900/50 transition">
              <div className="text-cyan-400 font-mono font-bold mb-1">🌐 Network</div>
              <div className="text-xs text-slate-400">UniFi monitoring</div>
            </Link>
            <Link href="/security/compliance" className="p-4 bg-purple-900/30 border border-purple-700/50 rounded-lg hover:bg-purple-900/50 transition">
              <div className="text-purple-400 font-mono font-bold mb-1">📋 Compliance</div>
              <div className="text-xs text-slate-400">NIST & audit reports</div>
            </Link>
          </div>
        </div>
      </div>

      {/* Threat Map Placeholder */}
      <div className="mt-6 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-bold text-white font-mono mb-4 flex items-center gap-2">
          <Globe className="text-blue-400" size={20} />
          Global Threat Overview
        </h2>
        <div className="h-48 bg-slate-900/50 rounded-lg border border-slate-700 flex items-center justify-center">
          <div className="text-center text-slate-500">
            <Globe size={48} className="mx-auto mb-2 opacity-50" />
            <p className="font-mono text-sm">Geographic threat visualization</p>
            <p className="text-xs">Showing traffic patterns from {status?.unique_ips || 0} unique IPs</p>
          </div>
        </div>
      </div>

      {/* Last Update Info */}
      <div className="mt-8 text-center text-slate-500 font-mono text-xs">
        <p>Last Updated: {status?.last_check ? new Date(status.last_check).toLocaleString() : "Unknown"}</p>
        <p>Uptime: {status?.uptime_seconds ? Math.floor(status.uptime_seconds / 60) : 0} minutes</p>
      </div>
      </div>
    </div>
  );
}
