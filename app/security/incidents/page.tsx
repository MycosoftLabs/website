'use client';

/**
 * Security Incident Management Dashboard
 * 
 * Provides incident ticket management, severity escalation,
 * timeline view, and resolution tracking.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  assignedTo: string | null;
  sourceIp: string | null;
  affectedSystems: string[];
  timeline: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'created' | 'updated' | 'escalated' | 'comment' | 'action' | 'resolved';
  message: string;
  user: string;
}

// Database indicator
const DatabaseBadge = ({ connected }: { connected: boolean }) => (
  <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono ${
    connected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
  }`}>
    <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
    {connected ? 'Live DB' : 'Offline'}
  </div>
);

const severityColors = {
  low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const statusColors = {
  open: 'bg-blue-500/20 text-blue-400',
  investigating: 'bg-purple-500/20 text-purple-400',
  contained: 'bg-amber-500/20 text-amber-400',
  resolved: 'bg-emerald-500/20 text-emerald-400',
  closed: 'bg-gray-500/20 text-gray-400',
};

export default function IncidentManagementPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'investigating' | 'contained' | 'resolved'>('all');
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbConnected, setDbConnected] = useState(false);

  // Fetch incidents from database via API
  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const res = await fetch('/api/security?action=incidents');
        if (!res.ok) throw new Error('Failed to fetch incidents');
        const data = await res.json();
        
        // Map API data to our Incident interface
        const mappedIncidents: Incident[] = (data.incidents || []).map((inc: any) => ({
          id: inc.id,
          title: inc.title,
          description: inc.description,
          severity: inc.severity,
          status: inc.status,
          assignedTo: inc.assigned_to,
          sourceIp: inc.events?.[0] ? 'Unknown' : null,
          affectedSystems: inc.tags || [],
          timeline: (inc.timeline || []).map((t: any) => ({
            id: t.id || `t-${Date.now()}-${Math.random()}`,
            timestamp: t.timestamp,
            type: t.action?.toLowerCase().includes('resolved') ? 'resolved' : 
                  t.action?.toLowerCase().includes('comment') ? 'comment' : 
                  t.action?.toLowerCase().includes('created') || t.action?.toLowerCase().includes('detected') ? 'created' :
                  t.action?.toLowerCase().includes('escalated') ? 'escalated' :
                  t.action?.toLowerCase().includes('action') || t.action?.toLowerCase().includes('blocked') || t.action?.toLowerCase().includes('contained') ? 'action' : 'updated',
            message: t.details || t.action,
            user: t.actor || 'System',
          })),
          createdAt: inc.created_at,
          updatedAt: inc.updated_at,
          resolvedAt: inc.resolved_at,
        }));
        
        setIncidents(mappedIncidents);
        setDbConnected(true);
        setError(null);
      } catch (err) {
        console.error('Error fetching incidents:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setDbConnected(false);
        setIncidents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchIncidents();
    // Refresh every 30 seconds
    const interval = setInterval(fetchIncidents, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredIncidents = filter === 'all' 
    ? incidents 
    : incidents.filter(i => i.status === filter);

  const stats = {
    open: incidents.filter(i => i.status === 'open').length,
    investigating: incidents.filter(i => i.status === 'investigating').length,
    contained: incidents.filter(i => i.status === 'contained').length,
    resolved: incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length,
    critical: incidents.filter(i => i.severity === 'critical' && i.status !== 'resolved' && i.status !== 'closed').length,
  };

  const addComment = async () => {
    if (!selectedIncident || !newComment.trim()) return;

    const event: TimelineEvent = {
      id: `t${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'comment',
      message: newComment,
      user: 'Morgan',
    };

    // Optimistic update
    const updatedIncident = {
      ...selectedIncident,
      timeline: [...selectedIncident.timeline, event],
      updatedAt: new Date().toISOString(),
    };
    setSelectedIncident(updatedIncident);
    setNewComment('');

    // Persist to API
    try {
      await fetch('/api/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_incident',
          incident_id: selectedIncident.id,
          updates: { updated_at: updatedIncident.updatedAt },
          timeline_entry: {
            timestamp: event.timestamp,
            action: 'comment',
            actor: event.user,
            details: event.message,
          },
          existing_timeline: selectedIncident.timeline.map(t => ({
            timestamp: t.timestamp,
            action: t.type,
            actor: t.user,
            details: t.message,
          })),
        }),
      });
    } catch (err) {
      console.error('Failed to save comment:', err);
    }
  };

  const updateStatus = async (newStatus: Incident['status']) => {
    if (!selectedIncident) return;

    const event: TimelineEvent = {
      id: `t${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: newStatus === 'resolved' ? 'resolved' : 'updated',
      message: `Status changed to ${newStatus}`,
      user: 'Morgan',
    };

    const updated = {
      ...selectedIncident,
      status: newStatus,
      timeline: [...selectedIncident.timeline, event],
      updatedAt: new Date().toISOString(),
      resolvedAt: newStatus === 'resolved' ? new Date().toISOString() : selectedIncident.resolvedAt,
    };

    // Optimistic update
    setSelectedIncident(updated);
    setIncidents(incidents.map(i => i.id === updated.id ? updated : i));

    // Persist to API
    try {
      await fetch('/api/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_incident',
          incident_id: selectedIncident.id,
          updates: { 
            status: newStatus,
            resolved_at: updated.resolvedAt,
            updated_at: updated.updatedAt,
          },
          timeline_entry: {
            timestamp: event.timestamp,
            action: event.type,
            actor: event.user,
            details: event.message,
          },
          existing_timeline: selectedIncident.timeline.map(t => ({
            timestamp: t.timestamp,
            action: t.type,
            actor: t.user,
            details: t.message,
          })),
        }),
      });
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-white">
        <div className="flex items-center gap-3">
          <div className="animate-spin h-6 w-6 border-2 border-orange-400 border-t-transparent rounded-full" />
          <span className="text-lg font-mono">Loading Incidents...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="text-white p-6">
      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
          Database connection error: {error}. Please check server logs.
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && incidents.length === 0 && (
        <div className="mb-4 p-4 bg-slate-800/50 border border-slate-700 rounded-lg text-center">
          <p className="text-slate-400">No incidents recorded. Create a new incident or wait for automated detection.</p>
        </div>
      )}

      {/* Page Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                Incident Management
              </h1>
              <DatabaseBadge connected={dbConnected} />
              <span className="text-xs text-slate-500 font-mono">{incidents.length} incidents</span>
            </div>
            <button 
              onClick={async () => {
                try {
                  const res = await fetch('/api/security', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'create_incident',
                      title: 'New Incident',
                      description: 'Describe the incident...',
                      severity: 'medium',
                      status: 'open',
                    }),
                  });
                  if (res.ok) {
                    window.location.reload();
                  }
                } catch (err) {
                  console.error('Failed to create incident:', err);
                }
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition">
              + New Incident
            </button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="text-3xl font-bold text-blue-400">{stats.open}</div>
            <div className="text-sm text-slate-400">Open</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="text-3xl font-bold text-purple-400">{stats.investigating}</div>
            <div className="text-sm text-slate-400">Investigating</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="text-3xl font-bold text-amber-400">{stats.contained}</div>
            <div className="text-sm text-slate-400">Contained</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="text-3xl font-bold text-emerald-400">{stats.resolved}</div>
            <div className="text-sm text-slate-400">Resolved</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-red-900/50">
            <div className="text-3xl font-bold text-red-400">{stats.critical}</div>
            <div className="text-sm text-slate-400">Critical Active</div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Incident List */}
          <div className="col-span-5">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700">
              <div className="p-4 border-b border-slate-700 flex items-center gap-2">
                <span className="text-slate-400 text-sm">Filter:</span>
                {(['all', 'open', 'investigating', 'contained', 'resolved'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                      filter === f 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              <div className="divide-y divide-slate-700/50 max-h-[600px] overflow-y-auto">
                {filteredIncidents.map((incident) => (
                  <button
                    key={incident.id}
                    onClick={() => setSelectedIncident(incident)}
                    className={`w-full p-4 text-left hover:bg-slate-700/30 transition ${
                      selectedIncident?.id === incident.id ? 'bg-slate-700/50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs text-slate-500 font-mono">{incident.id}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[incident.status]}`}>
                        {incident.status}
                      </span>
                    </div>
                    <h3 className="font-medium mb-1 text-sm">{incident.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs border ${severityColors[incident.severity]}`}>
                        {incident.severity}
                      </span>
                      {incident.assignedTo && (
                        <span className="text-xs text-slate-400">
                          → {incident.assignedTo}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Incident Detail */}
          <div className="col-span-7">
            {selectedIncident ? (
              <div className="bg-slate-800/50 rounded-xl border border-slate-700">
                {/* Header */}
                <div className="p-6 border-b border-slate-700">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm text-slate-500 font-mono">{selectedIncident.id}</span>
                        <span className={`px-2 py-0.5 rounded text-xs border ${severityColors[selectedIncident.severity]}`}>
                          {selectedIncident.severity}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs ${statusColors[selectedIncident.status]}`}>
                          {selectedIncident.status}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold">{selectedIncident.title}</h2>
                    </div>
                  </div>
                  <p className="text-slate-300 text-sm mb-4">{selectedIncident.description}</p>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Source IP</span>
                      <p className="font-mono text-amber-400">{selectedIncident.sourceIp || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Assigned To</span>
                      <p>{selectedIncident.assignedTo || 'Unassigned'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Created</span>
                      <p>{new Date(selectedIncident.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  {selectedIncident.affectedSystems.length > 0 && (
                    <div className="mt-4">
                      <span className="text-slate-500 text-sm">Affected Systems</span>
                      <div className="flex gap-2 mt-1">
                        {selectedIncident.affectedSystems.map((sys) => (
                          <span key={sys} className="px-2 py-1 bg-slate-700 rounded text-xs">
                            {sys}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="p-4 border-b border-slate-700 flex gap-2">
                  <span className="text-sm text-slate-400 mr-2">Update Status:</span>
                  {(['investigating', 'contained', 'resolved'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(s)}
                      disabled={selectedIncident.status === s}
                      className={`px-3 py-1 rounded text-xs font-medium transition ${
                        selectedIncident.status === s
                          ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                          : 'bg-slate-700 text-white hover:bg-slate-600'
                      }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Timeline */}
                <div className="p-6">
                  <h3 className="font-medium mb-4">Timeline</h3>
                  <div className="space-y-4 max-h-[300px] overflow-y-auto">
                    {selectedIncident.timeline.map((event, idx) => (
                      <div key={event.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${
                            event.type === 'created' ? 'bg-blue-500' :
                            event.type === 'resolved' ? 'bg-emerald-500' :
                            event.type === 'action' ? 'bg-amber-500' :
                            event.type === 'escalated' ? 'bg-red-500' :
                            'bg-slate-500'
                          }`} />
                          {idx < selectedIncident.timeline.length - 1 && (
                            <div className="w-px h-full bg-slate-700 mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-slate-500">
                              {new Date(event.timestamp).toLocaleString()}
                            </span>
                            <span className="text-xs text-slate-400">by {event.user}</span>
                          </div>
                          <p className="text-sm text-slate-300">{event.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Comment */}
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                        onKeyDown={(e) => e.key === 'Enter' && addComment()}
                      />
                      <button
                        onClick={addComment}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 h-full flex items-center justify-center p-12">
                <div className="text-center text-slate-500">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>Select an incident to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
