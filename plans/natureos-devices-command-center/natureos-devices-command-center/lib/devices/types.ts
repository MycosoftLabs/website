export type DeviceStatus = 'online' | 'offline' | 'warning' | 'critical' | 'unknown';

export type DeviceType =
  | 'gateway'
  | 'switch'
  | 'access_point'
  | 'client'
  | 'server'
  | 'nas'
  | 'mycobrain'
  | 'sensor'
  | 'unknown';

export interface DeviceMetrics {
  cpuPct?: number;
  memPct?: number;
  tempC?: number;
  humidityPct?: number;
  powerV?: number;
  rxKbps?: number;
  txKbps?: number;
  latencyMs?: number;
  packetLossPct?: number;
  uptimeSec?: number;
}

export interface DeviceLocation {
  x?: number;
  y?: number;
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  model?: string;
  ip?: string;
  mac?: string;
  status: DeviceStatus;
  tags?: string[];
  metrics?: DeviceMetrics;
  lastSeenAt?: string; // ISO
  location?: DeviceLocation;
  parentId?: string; // for topology links
}

export interface DevicesSnapshot {
  source: 'live' | 'mock';
  generatedAt: string; // ISO
  devices: Device[];
}
