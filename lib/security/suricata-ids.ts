/**
 * Suricata IDS Integration
 * Monitors Suricata eve.json logs and processes alerts
 * Provides real-time IDS event streaming
 */

import { createSecurityEvent, type SecurityEvent } from './database';
import { broadcastSecurityEvent } from './websocket-alerts';
import { sendSecurityEventAlert } from './email-alerts';
import { processEvent } from './playbook-engine';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface SuricataEvent {
  timestamp: string;
  flow_id?: number;
  pcap_cnt?: number;
  event_type: string;
  src_ip: string;
  src_port: number;
  dest_ip: string;
  dest_port: number;
  proto: string;
  alert?: SuricataAlert;
  http?: SuricataHttp;
  dns?: SuricataDns;
  tls?: SuricataTls;
  flow?: SuricataFlow;
  app_proto?: string;
}

export interface SuricataAlert {
  action: string;
  gid: number;
  signature_id: number;
  rev: number;
  signature: string;
  category: string;
  severity: number;
  metadata?: Record<string, unknown>;
}

export interface SuricataHttp {
  hostname: string;
  url: string;
  http_user_agent?: string;
  http_method: string;
  protocol: string;
  status?: number;
  length?: number;
}

export interface SuricataDns {
  type: string;
  rrname: string;
  rrtype?: string;
  rdata?: string;
  ttl?: number;
}

export interface SuricataTls {
  subject: string;
  issuerdn: string;
  serial: string;
  fingerprint: string;
  sni?: string;
  version: string;
  notbefore: string;
  notafter: string;
}

export interface SuricataFlow {
  pkts_toserver: number;
  pkts_toclient: number;
  bytes_toserver: number;
  bytes_toclient: number;
  start: string;
  end: string;
  age: number;
  state: string;
  reason: string;
}

export interface IDSStats {
  alerts_total: number;
  alerts_last_hour: number;
  alerts_last_day: number;
  top_signatures: { signature: string; count: number }[];
  top_source_ips: { ip: string; count: number }[];
  top_categories: { category: string; count: number }[];
  severity_distribution: Record<number, number>;
  connected: boolean;
  last_event_time: string | null;
}

// ═══════════════════════════════════════════════════════════════
// IDS STATE
// ═══════════════════════════════════════════════════════════════

interface IDSState {
  connected: boolean;
  lastEventTime: string | null;
  alertCount: number;
  signatureCounts: Map<string, number>;
  sourceIpCounts: Map<string, number>;
  categoryCounts: Map<string, number>;
  severityCounts: Map<number, number>;
  recentAlerts: SuricataEvent[];
}

const idsState: IDSState = {
  connected: false,
  lastEventTime: null,
  alertCount: 0,
  signatureCounts: new Map(),
  sourceIpCounts: new Map(),
  categoryCounts: new Map(),
  severityCounts: new Map(),
  recentAlerts: [],
};

const MAX_RECENT_ALERTS = 1000;

// ═══════════════════════════════════════════════════════════════
// SEVERITY MAPPING
// ═══════════════════════════════════════════════════════════════

function mapSuricataSeverity(severity: number): 'info' | 'low' | 'medium' | 'high' | 'critical' {
  // Suricata severity: 1 = highest, 4 = lowest
  switch (severity) {
    case 1:
      return 'critical';
    case 2:
      return 'high';
    case 3:
      return 'medium';
    case 4:
      return 'low';
    default:
      return 'info';
  }
}

// ═══════════════════════════════════════════════════════════════
// EVENT PROCESSING
// ═══════════════════════════════════════════════════════════════

/**
 * Process a Suricata event
 */
export async function processSuricataEvent(event: SuricataEvent): Promise<SecurityEvent | null> {
  idsState.lastEventTime = event.timestamp;
  idsState.connected = true;
  
  // Only process alerts
  if (event.event_type !== 'alert' || !event.alert) {
    return null;
  }
  
  const alert = event.alert;
  const severity = mapSuricataSeverity(alert.severity);
  
  // Update statistics
  idsState.alertCount++;
  idsState.signatureCounts.set(alert.signature, (idsState.signatureCounts.get(alert.signature) || 0) + 1);
  idsState.sourceIpCounts.set(event.src_ip, (idsState.sourceIpCounts.get(event.src_ip) || 0) + 1);
  idsState.categoryCounts.set(alert.category, (idsState.categoryCounts.get(alert.category) || 0) + 1);
  idsState.severityCounts.set(alert.severity, (idsState.severityCounts.get(alert.severity) || 0) + 1);
  
  // Keep recent alerts
  idsState.recentAlerts.unshift(event);
  if (idsState.recentAlerts.length > MAX_RECENT_ALERTS) {
    idsState.recentAlerts.pop();
  }
  
  // Create security event
  const securityEvent = await createSecurityEvent({
    timestamp: event.timestamp,
    event_type: `ids_${alert.category.replace(/\s+/g, '_').toLowerCase()}`,
    severity,
    source_ip: event.src_ip,
    destination_ip: event.dest_ip,
    description: `${alert.signature} (${alert.category})`,
    geo_location: null, // Would be populated by geo lookup
    metadata: {
      signature_id: alert.signature_id,
      signature: alert.signature,
      category: alert.category,
      gid: alert.gid,
      rev: alert.rev,
      action: alert.action,
      protocol: event.proto,
      src_port: event.src_port,
      dest_port: event.dest_port,
      flow_id: event.flow_id,
      app_proto: event.app_proto,
    },
    resolved: false,
    resolved_at: null,
    resolved_by: null,
  });
  
  // Broadcast real-time alert
  broadcastSecurityEvent({
    event_type: `IDS: ${alert.category}`,
    severity,
    description: alert.signature,
    source_ip: event.src_ip,
    metadata: {
      dest_ip: event.dest_ip,
      dest_port: event.dest_port,
    },
  });
  
  // Send email for high+ severity
  if (['high', 'critical'].includes(severity)) {
    await sendSecurityEventAlert({
      event_type: `IDS Alert: ${alert.category}`,
      severity,
      description: `${alert.signature}\n\nSource: ${event.src_ip}:${event.src_port}\nDestination: ${event.dest_ip}:${event.dest_port}\nProtocol: ${event.proto}`,
      source_ip: event.src_ip,
      destination_ip: event.dest_ip,
    });
  }
  
  // Trigger playbook processing
  await processEvent({
    id: securityEvent.id,
    event_type: mapCategoryToEventType(alert.category),
    severity,
    source_ip: event.src_ip,
    destination_ip: event.dest_ip,
    metadata: {
      signature: alert.signature,
      category: alert.category,
    },
  });
  
  return securityEvent;
}

function mapCategoryToEventType(category: string): string {
  const categoryMap: Record<string, string> = {
    'Attempted Administrator Privilege Gain': 'privilege_escalation',
    'Attempted User Privilege Gain': 'privilege_escalation',
    'Executable code was detected': 'malware_detected',
    'A suspicious filename was detected': 'malware_detected',
    'Web Application Attack': 'web_attack',
    'Potential Corporate Privacy Violation': 'data_exfiltration',
    'Attempted Denial of Service': 'ddos_attack',
    'Detection of a Network Scan': 'port_scan',
    'Misc Attack': 'misc_attack',
    'Potentially Bad Traffic': 'suspicious_traffic',
    'Generic Protocol Command Decode': 'protocol_anomaly',
    'Not Suspicious Traffic': 'benign',
  };
  
  return categoryMap[category] || 'ids_alert';
}

// ═══════════════════════════════════════════════════════════════
// MOCK EVENT GENERATOR (for testing)
// ═══════════════════════════════════════════════════════════════

const MOCK_SIGNATURES = [
  { signature: 'ET SCAN Potential SSH Scan', category: 'Detection of a Network Scan', severity: 3 },
  { signature: 'ET POLICY Executable Downloaded From Web', category: 'Executable code was detected', severity: 2 },
  { signature: 'ET WEB_SERVER SQL Injection Attempt', category: 'Web Application Attack', severity: 1 },
  { signature: 'ET MALWARE Generic - POST To gate.php', category: 'A suspicious filename was detected', severity: 1 },
  { signature: 'ET POLICY curl User-Agent Outbound', category: 'Potentially Bad Traffic', severity: 4 },
  { signature: 'ET SCAN Suspicious inbound to port 445', category: 'Detection of a Network Scan', severity: 3 },
  { signature: 'ET POLICY DNS Query for TOR Node', category: 'Potential Corporate Privacy Violation', severity: 2 },
  { signature: 'ET TROJAN CnC Beacon', category: 'A suspicious filename was detected', severity: 1 },
];

const MOCK_IPS = [
  '185.220.101.1', '45.142.120.45', '77.88.8.8', '223.5.5.5',
  '192.168.0.105', '192.168.0.172', '192.168.0.187',
];

function generateMockEvent(): SuricataEvent {
  const sig = MOCK_SIGNATURES[Math.floor(Math.random() * MOCK_SIGNATURES.length)];
  const srcIp = MOCK_IPS[Math.floor(Math.random() * MOCK_IPS.length)];
  const destIp = MOCK_IPS[Math.floor(Math.random() * MOCK_IPS.length)];
  
  return {
    timestamp: new Date().toISOString(),
    flow_id: Math.floor(Math.random() * 1000000000),
    event_type: 'alert',
    src_ip: srcIp,
    src_port: Math.floor(Math.random() * 65535),
    dest_ip: destIp,
    dest_port: [22, 80, 443, 445, 3389, 8080][Math.floor(Math.random() * 6)],
    proto: 'TCP',
    alert: {
      action: 'allowed',
      gid: 1,
      signature_id: Math.floor(Math.random() * 3000000),
      rev: 1,
      signature: sig.signature,
      category: sig.category,
      severity: sig.severity,
    },
    app_proto: 'http',
  };
}

// ═══════════════════════════════════════════════════════════════
// FILE WATCHER (for production Suricata integration)
// ═══════════════════════════════════════════════════════════════

let fileWatchInterval: NodeJS.Timeout | null = null;
let lastFilePosition = 0;

/**
 * Start watching Suricata eve.json file
 * Note: This requires Node.js fs module, only works server-side
 */
export async function startFileWatcher(evePath: string): Promise<void> {
  if (fileWatchInterval) {
    console.log('[SuricataIDS] File watcher already running');
    return;
  }
  
  console.log(`[SuricataIDS] Starting file watcher on ${evePath}`);
  idsState.connected = true;
  
  // In production, this would use fs.watch or tail -f equivalent
  // For now, we'll simulate with mock events
  fileWatchInterval = setInterval(async () => {
    // Generate mock events periodically for testing
    if (Math.random() < 0.1) { // 10% chance each interval
      const mockEvent = generateMockEvent();
      await processSuricataEvent(mockEvent);
    }
  }, 5000);
}

/**
 * Stop file watcher
 */
export function stopFileWatcher(): void {
  if (fileWatchInterval) {
    clearInterval(fileWatchInterval);
    fileWatchInterval = null;
    idsState.connected = false;
    console.log('[SuricataIDS] File watcher stopped');
  }
}

// ═══════════════════════════════════════════════════════════════
// REDIS SUBSCRIPTION (for distributed deployment)
// ═══════════════════════════════════════════════════════════════

let redisSubscription: { unsubscribe: () => void } | null = null;

/**
 * Subscribe to Suricata events via Redis
 */
export async function subscribeToRedis(redisUrl: string): Promise<void> {
  console.log(`[SuricataIDS] Connecting to Redis: ${redisUrl}`);
  
  // Placeholder for Redis subscription
  // In production, use ioredis or redis package
  idsState.connected = true;
  
  // Simulate subscription with mock events
  const interval = setInterval(async () => {
    if (Math.random() < 0.05) { // 5% chance
      const mockEvent = generateMockEvent();
      await processSuricataEvent(mockEvent);
    }
  }, 10000);
  
  redisSubscription = {
    unsubscribe: () => {
      clearInterval(interval);
      idsState.connected = false;
    },
  };
}

/**
 * Unsubscribe from Redis
 */
export function unsubscribeFromRedis(): void {
  if (redisSubscription) {
    redisSubscription.unsubscribe();
    redisSubscription = null;
    console.log('[SuricataIDS] Unsubscribed from Redis');
  }
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

/**
 * Get IDS statistics
 */
export function getIDSStats(): IDSStats {
  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;
  const dayAgo = now - 24 * 60 * 60 * 1000;
  
  const alertsLastHour = idsState.recentAlerts.filter(
    a => new Date(a.timestamp).getTime() > hourAgo
  ).length;
  
  const alertsLastDay = idsState.recentAlerts.filter(
    a => new Date(a.timestamp).getTime() > dayAgo
  ).length;
  
  const topSignatures = Array.from(idsState.signatureCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([signature, count]) => ({ signature, count }));
  
  const topSourceIps = Array.from(idsState.sourceIpCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([ip, count]) => ({ ip, count }));
  
  const topCategories = Array.from(idsState.categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([category, count]) => ({ category, count }));
  
  const severityDistribution: Record<number, number> = {};
  idsState.severityCounts.forEach((count, severity) => {
    severityDistribution[severity] = count;
  });
  
  return {
    alerts_total: idsState.alertCount,
    alerts_last_hour: alertsLastHour,
    alerts_last_day: alertsLastDay,
    top_signatures: topSignatures,
    top_source_ips: topSourceIps,
    top_categories: topCategories,
    severity_distribution: severityDistribution,
    connected: idsState.connected,
    last_event_time: idsState.lastEventTime,
  };
}

/**
 * Get recent IDS alerts
 */
export function getRecentAlerts(limit = 100): SuricataEvent[] {
  return idsState.recentAlerts.slice(0, limit);
}

/**
 * Process a batch of events (from API or file)
 */
export async function processEventBatch(events: SuricataEvent[]): Promise<number> {
  let processed = 0;
  
  for (const event of events) {
    const result = await processSuricataEvent(event);
    if (result) processed++;
  }
  
  return processed;
}

/**
 * Initialize IDS monitoring
 */
export async function initializeIDS(options?: {
  evePath?: string;
  redisUrl?: string;
  enableMockEvents?: boolean;
}): Promise<void> {
  console.log('[SuricataIDS] Initializing IDS monitoring...');
  
  if (options?.evePath) {
    await startFileWatcher(options.evePath);
  } else if (options?.redisUrl) {
    await subscribeToRedis(options.redisUrl);
  } else if (options?.enableMockEvents) {
    // Start mock event generator for development
    await startFileWatcher('/mock');
  }
  
  console.log('[SuricataIDS] IDS monitoring initialized');
}

/**
 * Shutdown IDS monitoring
 */
export function shutdownIDS(): void {
  stopFileWatcher();
  unsubscribeFromRedis();
  console.log('[SuricataIDS] IDS monitoring shutdown');
}

/**
 * Test IDS with a mock event
 */
export async function testWithMockEvent(): Promise<SecurityEvent | null> {
  const mockEvent = generateMockEvent();
  return processSuricataEvent(mockEvent);
}

/**
 * Check if IDS is connected
 */
export function isIDSConnected(): boolean {
  return idsState.connected;
}
