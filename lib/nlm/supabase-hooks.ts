'use client';

import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export interface MindexEntry {
  id: string;
  source: string;
  type: string;
  data: any;
  timestamp: string;
  merkle_root?: string;
}

export interface MycoBrainEntry {
  id: string;
  node_id: string;
  spectral_density: number[];
  acoustic_signature: number[];
  thermal_gradient: number[];
  timestamp: string;
  frame_root?: string;
}

export interface SystemStatusEntry {
  id: string;
  system_name: string;
  status: 'online' | 'offline' | 'degraded';
  latency: number;
  last_sync: string;
}

function normalizeStatus(status: any, connected: boolean): SystemStatusEntry['status'] {
  if (!connected) return 'offline';

  const value = String(status || '').toLowerCase();
  if (value === 'healthy' || value === 'online' || value === 'ok') return 'online';
  if (value === 'degraded' || value === 'warning') return 'degraded';
  return connected ? 'online' : 'offline';
}

function normalizeSystemStatusPayload(payload: any): SystemStatusEntry[] {
  if (Array.isArray(payload)) return payload;

  const timestamp = payload?.timestamp || new Date().toISOString();
  const masConnected = Boolean(payload?.connections?.mas);
  const mindexConnected = Boolean(payload?.connections?.mindex);
  const mycobrainConnected = Boolean(payload?.connections?.mycobrain);
  const middlewareConnected = masConnected && mindexConnected;

  return [
    {
      id: 'mindex',
      system_name: 'Mindex',
      status: normalizeStatus(payload?.mindexStatus?.status, mindexConnected),
      latency: payload?.mindexStatus?.latency ?? 0,
      last_sync: timestamp,
    },
    {
      id: 'mycobrain',
      system_name: 'MycoBrain',
      status: normalizeStatus(payload?.mycobrainStatus?.status || payload?.masStatus?.status, mycobrainConnected),
      latency: payload?.mycobrainStatus?.latency ?? payload?.masStatus?.latency ?? 0,
      last_sync: timestamp,
    },
    {
      id: 'mycosoft',
      system_name: 'Mycosoft',
      status: 'online',
      latency: 0,
      last_sync: timestamp,
    },
    {
      id: 'mas',
      system_name: 'MAS',
      status: normalizeStatus(payload?.masStatus?.status, masConnected),
      latency: payload?.masStatus?.latency ?? 0,
      last_sync: timestamp,
    },
    {
      id: 'network-middleware',
      system_name: 'Network Middleware',
      status: middlewareConnected ? 'online' : masConnected || mindexConnected ? 'degraded' : 'offline',
      latency: Math.max(payload?.masStatus?.latency ?? 0, payload?.mindexStatus?.latency ?? 0),
      last_sync: timestamp,
    },
  ];
}

export function useMindexData() {
  const [data, setData] = useState<MindexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Try fetching from API route first
        const res = await fetch('/api/natureos/nlm-training/mindex');
        if (res.ok) {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await res.json();
            setData(Array.isArray(data) ? data : []);
            setError(null);
            return;
          } else {
            console.warn('Mindex API returned non-JSON response:', await res.text());
          }
        }

        // Fallback to direct Supabase
        if (!supabase) {
          throw new Error('Supabase client not initialized and API route failed.');
        }

        const { data: mindexData, error: supabaseError } = await supabase
          .from('mindex_data')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(100);

        if (supabaseError) throw supabaseError;
        setData(mindexData || []);
        setError(null);
      } catch (err: any) {
        console.error('Mindex Fetch Error:', err);
        setError(err.message || 'Error fetching Mindex data.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { data, loading, error };
}

export function useMycoBrainData() {
  const [data, setData] = useState<MycoBrainEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Try fetching from API route first
        const res = await fetch('/api/natureos/nlm-training/mycobrain');
        if (res.ok) {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await res.json();
            setData(Array.isArray(data) ? data : []);
            setError(null);
            return;
          } else {
            console.warn('MycoBrain API returned non-JSON response:', await res.text());
          }
        }

        // Fallback to direct Supabase
        if (!supabase) {
          throw new Error('Supabase client not initialized and API route failed.');
        }

        const { data: mycoData, error: supabaseError } = await supabase
          .from('mycobrain_data')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(50);

        if (supabaseError) throw supabaseError;
        setData(mycoData || []);
        setError(null);
      } catch (err: any) {
        console.error('MycoBrain Fetch Error:', err);
        setError(err.message || 'Error fetching MycoBrain data.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { data, loading, error };
}

export function useSystemStatus() {
  const [status, setStatus] = useState<SystemStatusEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Try fetching from API route first to avoid CORS issues on local network
        const res = await fetch('/api/natureos/nlm-training/status');
        if (res.ok) {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await res.json();
            setStatus(normalizeSystemStatusPayload(data));
            setError(null);
            return;
          } else {
            const text = await res.text();
            throw new Error(`API returned non-JSON response (Content-Type: ${contentType}). Body starts with: ${text.substring(0, 100)}`);
          }
        }

        // Fallback to direct Supabase if API fails or is not available
        if (!supabase) {
          throw new Error('Supabase client not initialized and API route failed.');
        }

        const { data: statusData, error: supabaseError } = await supabase
          .from('system_status')
          .select('*');

        if (supabaseError) throw supabaseError;
        setStatus(statusData || []);
        setError(null);
      } catch (err: any) {
        console.error('System Status Fetch Error:', err);
        setError(err.message || 'Error fetching system status.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  return { status, loading, error };
}
