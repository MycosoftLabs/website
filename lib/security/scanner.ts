/**
 * Mycosoft Network Scanner Library
 * 
 * Provides network scanning capabilities via the Nmap scanner service.
 * Supports network discovery, port scanning, and vulnerability detection.
 */

export type ScanType = 'ping' | 'syn' | 'version' | 'vuln' | 'full';
export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ScanHost {
  ip: string;
  hostname: string;
  status: 'up' | 'down' | 'unknown';
  mac: string;
  vendor: string;
  os: string;
  ports: ScanPort[];
}

export interface ScanPort {
  port: number;
  protocol: 'tcp' | 'udp';
  state: 'open' | 'closed' | 'filtered';
  service: string;
  version: string;
  scripts: ScanScript[];
}

export interface ScanScript {
  id: string;
  output: string;
}

export interface Vulnerability {
  cve: string;
  host: string;
  port: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  discoveredAt: string;
}

export interface ScanResult {
  scanId: string;
  scanType: ScanType;
  target: string;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  hostsUp: number;
  hostsDown: number;
  hosts: ScanHost[];
  vulnerabilities: Vulnerability[];
  status: ScanStatus;
  error?: string;
}

export interface ScanRequest {
  scanType: ScanType;
  target: string;
  options?: {
    ports?: string;
    timing?: 1 | 2 | 3 | 4 | 5; // Nmap timing template
    scripts?: string[];
  };
}

// Configuration
const NMAP_SERVICE_URL = process.env.NMAP_SERVICE_URL || 'http://localhost:8102';
const SCAN_TARGETS_ALLOWED = (process.env.SCAN_TARGETS || '192.168.0.0/24').split(',');

// In-memory scan results cache
const scanResultsCache = new Map<string, ScanResult>();
const pendingScans = new Map<string, ScanRequest>();

/**
 * Validate scan target is allowed
 */
function isTargetAllowed(target: string): boolean {
  // Only allow internal network scans
  for (const allowed of SCAN_TARGETS_ALLOWED) {
    if (target.startsWith(allowed.split('/')[0].split('.').slice(0, 3).join('.'))) {
      return true;
    }
  }
  // Also allow specific IPs in the allowed range
  return SCAN_TARGETS_ALLOWED.some(range => {
    const baseIP = range.split('/')[0];
    const baseOctets = baseIP.split('.').slice(0, 3).join('.');
    return target.startsWith(baseOctets);
  });
}

/**
 * Request a new network scan
 */
export async function requestScan(request: ScanRequest): Promise<string> {
  if (!isTargetAllowed(request.target)) {
    throw new Error(`Target ${request.target} is not in allowed scan range`);
  }

  const scanId = `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Store pending scan
  pendingScans.set(scanId, request);

  // In development/mock mode, simulate scan
  if (process.env.NODE_ENV === 'development' || !process.env.NMAP_SERVICE_URL) {
    setTimeout(() => simulateScan(scanId, request), 2000);
    return scanId;
  }

  // Request scan from service
  try {
    const response = await fetch(`${NMAP_SERVICE_URL}/api/v1/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scan_id: scanId,
        type: request.scanType,
        target: request.target,
        options: request.options,
      }),
    });

    if (!response.ok) {
      throw new Error(`Scan service error: ${response.status}`);
    }

    return scanId;
  } catch (error) {
    pendingScans.delete(scanId);
    throw error;
  }
}

/**
 * Simulate a scan for development/testing
 */
function simulateScan(scanId: string, request: ScanRequest): void {
  const startTime = new Date();
  
  // Generate mock hosts
  const baseIP = request.target.split('/')[0];
  const octets = baseIP.split('.');
  const mockHosts: ScanHost[] = [];
  
  // Generate 5-15 mock hosts
  const hostCount = Math.floor(Math.random() * 10) + 5;
  for (let i = 1; i <= hostCount; i++) {
    const isUp = Math.random() > 0.2;
    mockHosts.push({
      ip: `${octets[0]}.${octets[1]}.${octets[2]}.${i}`,
      hostname: isUp ? `device-${i}.local` : '',
      status: isUp ? 'up' : 'down',
      mac: isUp ? `00:1A:2B:3C:4D:${i.toString(16).padStart(2, '0').toUpperCase()}` : '',
      vendor: isUp ? ['Apple', 'Dell', 'Ubiquiti', 'Raspberry Pi', 'Unknown'][Math.floor(Math.random() * 5)] : '',
      os: isUp ? ['Linux', 'Windows', 'macOS', 'UniFi OS'][Math.floor(Math.random() * 4)] : '',
      ports: isUp && request.scanType !== 'ping' ? [
        { port: 22, protocol: 'tcp' as const, state: 'open' as const, service: 'ssh', version: 'OpenSSH 8.2', scripts: [] },
        { port: 80, protocol: 'tcp' as const, state: 'open' as const, service: 'http', version: 'nginx 1.18', scripts: [] },
        { port: 443, protocol: 'tcp' as const, state: 'open' as const, service: 'https', version: 'nginx 1.18', scripts: [] },
      ].slice(0, Math.floor(Math.random() * 3) + 1) : [],
    });
  }

  const upHosts = mockHosts.filter(h => h.status === 'up');
  
  // Generate mock vulnerabilities for vuln scan
  const mockVulns: Vulnerability[] = [];
  if (request.scanType === 'vuln') {
    for (const host of upHosts.slice(0, 2)) {
      mockVulns.push({
        cve: `CVE-2024-${Math.floor(Math.random() * 9999)}`,
        host: host.ip,
        port: 443,
        severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high',
        description: 'Potential vulnerability detected in web service',
        discoveredAt: new Date().toISOString(),
      });
    }
  }

  const endTime = new Date();
  const result: ScanResult = {
    scanId,
    scanType: request.scanType,
    target: request.target,
    startedAt: startTime.toISOString(),
    completedAt: endTime.toISOString(),
    durationSeconds: (endTime.getTime() - startTime.getTime()) / 1000 + Math.random() * 10,
    hostsUp: upHosts.length,
    hostsDown: mockHosts.length - upHosts.length,
    hosts: mockHosts,
    vulnerabilities: mockVulns,
    status: 'completed',
  };

  scanResultsCache.set(scanId, result);
  pendingScans.delete(scanId);
}

/**
 * Get scan result by ID
 */
export async function getScanResult(scanId: string): Promise<ScanResult | null> {
  // Check cache first
  const cached = scanResultsCache.get(scanId);
  if (cached) {
    return cached;
  }

  // Check if pending
  if (pendingScans.has(scanId)) {
    return {
      scanId,
      scanType: pendingScans.get(scanId)!.scanType,
      target: pendingScans.get(scanId)!.target,
      startedAt: new Date().toISOString(),
      completedAt: '',
      durationSeconds: 0,
      hostsUp: 0,
      hostsDown: 0,
      hosts: [],
      vulnerabilities: [],
      status: 'running',
    };
  }

  // Try to fetch from service
  if (process.env.NMAP_SERVICE_URL) {
    try {
      const response = await fetch(`${NMAP_SERVICE_URL}/api/v1/scan/${scanId}`);
      if (response.ok) {
        const data = await response.json();
        scanResultsCache.set(scanId, data);
        return data;
      }
    } catch (error) {
      console.error('[Scanner] Failed to fetch scan result:', error);
    }
  }

  return null;
}

/**
 * Get scan history
 */
export async function getScanHistory(limit = 50): Promise<ScanResult[]> {
  // Return cached results sorted by time
  const results = Array.from(scanResultsCache.values())
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, limit);

  return results;
}

/**
 * Get all discovered hosts from recent scans
 */
export async function getDiscoveredHosts(): Promise<ScanHost[]> {
  const hostsMap = new Map<string, ScanHost>();
  
  for (const result of scanResultsCache.values()) {
    for (const host of result.hosts) {
      if (host.status === 'up') {
        // Keep the most recent/complete data for each IP
        const existing = hostsMap.get(host.ip);
        if (!existing || host.ports.length > existing.ports.length) {
          hostsMap.set(host.ip, host);
        }
      }
    }
  }

  return Array.from(hostsMap.values()).sort((a, b) => {
    const aNum = a.ip.split('.').map(Number).reduce((acc, n, i) => acc + n * Math.pow(256, 3 - i), 0);
    const bNum = b.ip.split('.').map(Number).reduce((acc, n, i) => acc + n * Math.pow(256, 3 - i), 0);
    return aNum - bNum;
  });
}

/**
 * Get all discovered vulnerabilities
 */
export async function getVulnerabilities(): Promise<Vulnerability[]> {
  const vulns: Vulnerability[] = [];
  
  for (const result of scanResultsCache.values()) {
    vulns.push(...result.vulnerabilities);
  }

  // Sort by severity (critical first) and date
  return vulns.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime();
  });
}

/**
 * Cancel a running scan
 */
export async function cancelScan(scanId: string): Promise<boolean> {
  if (pendingScans.has(scanId)) {
    pendingScans.delete(scanId);
    
    // Update result to cancelled
    const result = scanResultsCache.get(scanId);
    if (result) {
      result.status = 'cancelled';
      result.completedAt = new Date().toISOString();
    }
    
    return true;
  }
  return false;
}

/**
 * Quick ping sweep
 */
export async function pingSweep(network: string): Promise<ScanHost[]> {
  const scanId = await requestScan({
    scanType: 'ping',
    target: network,
  });

  // Wait for completion (with timeout)
  const timeout = 30000;
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const result = await getScanResult(scanId);
    if (result && result.status === 'completed') {
      return result.hosts.filter(h => h.status === 'up');
    }
  }

  throw new Error('Ping sweep timed out');
}

export default {
  requestScan,
  getScanResult,
  getScanHistory,
  getDiscoveredHosts,
  getVulnerabilities,
  cancelScan,
  pingSweep,
};
