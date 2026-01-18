import type { Device, DeviceStatus } from './types';

export interface CommandCenterStats {
  devices: number;
  clients: number;
  avgLatencyMs: number | null;
  healthPct: number | null;
}

const statusWeight: Record<DeviceStatus, number> = {
  online: 1,
  warning: 0.75,
  offline: 0,
  critical: 0.25,
  unknown: 0.5,
};

export function computeStats(devices: Device[]): CommandCenterStats {
  const clients = devices.filter((d) => d.type === 'client').length;
  const nonClients = devices.filter((d) => d.type !== 'client');

  const latencyValues = nonClients
    .map((d) => d.metrics?.latencyMs)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));

  const avgLatencyMs = latencyValues.length
    ? Math.round((latencyValues.reduce((a, b) => a + b, 0) / latencyValues.length) * 10) / 10
    : null;

  const healthValues = nonClients.map((d) => statusWeight[d.status] ?? 0.5);
  const healthPct = healthValues.length
    ? Math.round((healthValues.reduce((a, b) => a + b, 0) / healthValues.length) * 100)
    : null;

  return {
    devices: nonClients.length,
    clients,
    avgLatencyMs,
    healthPct,
  };
}

export function statusLabel(status: DeviceStatus): string {
  switch (status) {
    case 'online':
      return 'ONLINE';
    case 'offline':
      return 'OFFLINE';
    case 'warning':
      return 'WARNING';
    case 'critical':
      return 'CRITICAL';
    default:
      return 'UNKNOWN';
  }
}

export function statusIntent(status: DeviceStatus): 'good' | 'warn' | 'bad' | 'neutral' {
  switch (status) {
    case 'online':
      return 'good';
    case 'warning':
      return 'warn';
    case 'critical':
    case 'offline':
      return 'bad';
    default:
      return 'neutral';
  }
}
