/**
 * Mycosoft Threat Intelligence Library
 * 
 * Provides threat intelligence lookups from multiple sources:
 * - AbuseIPDB: IP reputation and abuse reports
 * - VirusTotal: Malware and threat analysis
 * - Tor Exit Nodes: Anonymous network detection
 * - Internal database: Custom threat tracking
 */

export type ThreatLevel = 'unknown' | 'safe' | 'low' | 'medium' | 'high' | 'critical';

export type ThreatType = 
  | 'malware' 
  | 'phishing' 
  | 'spam' 
  | 'botnet' 
  | 'scanner' 
  | 'bruteforce' 
  | 'tor_exit' 
  | 'vpn' 
  | 'proxy' 
  | 'hosting' 
  | 'unknown';

export interface IPReputation {
  ip: string;
  score: number; // 0-100, higher is worse
  threatLevel: ThreatLevel;
  threatTypes: ThreatType[];
  country: string;
  countryCode: string;
  isp: string;
  isTor: boolean;
  isVpn: boolean;
  isProxy: boolean;
  isHosting: boolean;
  lastSeen: string | null;
  reportsCount: number;
  source: string;
  cachedAt: string;
}

export interface ThreatReport {
  id: string;
  ip: string;
  reportType: ThreatType;
  severity: ThreatLevel;
  description: string;
  reportedBy: string;
  reportedAt: string;
}

export interface BlockedIP {
  ip: string;
  reason: string;
  blockedBy: string;
  blockedAt: string;
  expiresAt: string | null;
  isPermanent: boolean;
}

// Configuration
const ABUSEIPDB_API_KEY = process.env.ABUSEIPDB_API_KEY || '';
const VIRUSTOTAL_API_KEY = process.env.VIRUSTOTAL_API_KEY || '';
const THREAT_INTEL_SERVICE_URL = process.env.THREAT_INTEL_SERVICE_URL || 'http://localhost:8100';

// In-memory cache for Tor exit nodes
let torExitNodes: Set<string> = new Set();
let torExitLastUpdate = 0;
const TOR_EXIT_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

// In-memory IP reputation cache
const reputationCache = new Map<string, { data: IPReputation; expires: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Calculate threat level from score
 */
function calculateThreatLevel(score: number): ThreatLevel {
  if (score <= 0) return 'safe';
  if (score <= 20) return 'low';
  if (score <= 50) return 'medium';
  if (score <= 80) return 'high';
  return 'critical';
}

/**
 * Update Tor exit node list
 */
export async function updateTorExitNodes(): Promise<void> {
  const now = Date.now();
  if (now - torExitLastUpdate < TOR_EXIT_CACHE_TTL) {
    return; // Cache is still valid
  }

  try {
    const response = await fetch('https://check.torproject.org/torbulkexitlist', {
      cache: 'no-store',
    });

    if (response.ok) {
      const text = await response.text();
      const nodes = text.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      torExitNodes = new Set(nodes);
      torExitLastUpdate = now;
      console.log(`[ThreatIntel] Updated Tor exit list: ${torExitNodes.size} nodes`);
    }
  } catch (error) {
    console.error('[ThreatIntel] Failed to update Tor exit nodes:', error);
  }
}

/**
 * Check if IP is a Tor exit node
 */
export function isTorExitNode(ip: string): boolean {
  return torExitNodes.has(ip);
}

/**
 * Query AbuseIPDB for IP reputation
 */
async function queryAbuseIPDB(ip: string): Promise<Partial<IPReputation> | null> {
  if (!ABUSEIPDB_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(
      `https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}&maxAgeInDays=90&verbose=true`,
      {
        headers: {
          'Key': ABUSEIPDB_API_KEY,
          'Accept': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      console.error(`[ThreatIntel] AbuseIPDB error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const result = data.data;

    const threatTypes: ThreatType[] = [];
    
    // Parse category codes from reports
    if (result.reports) {
      for (const report of result.reports.slice(0, 10)) {
        for (const cat of report.categories || []) {
          if (cat === 18) threatTypes.push('bruteforce');
          else if (cat === 14) threatTypes.push('scanner');
          else if ([3, 4, 5].includes(cat)) threatTypes.push('malware');
          else if (cat === 9) threatTypes.push('proxy');
          else if (cat === 10) threatTypes.push('spam');
          else if (cat === 7) threatTypes.push('phishing');
        }
      }
    }

    return {
      score: result.abuseConfidenceScore || 0,
      country: result.countryName || '',
      countryCode: result.countryCode || '',
      isp: result.isp || '',
      isVpn: result.isPublicProxy || false,
      isHosting: result.usageType?.includes('Data Center') || false,
      reportsCount: result.totalReports || 0,
      threatTypes: [...new Set(threatTypes)],
      lastSeen: result.lastReportedAt || null,
    };
  } catch (error) {
    console.error('[ThreatIntel] AbuseIPDB query failed:', error);
    return null;
  }
}

/**
 * Query VirusTotal for IP reputation
 */
async function queryVirusTotal(ip: string): Promise<Partial<IPReputation> | null> {
  if (!VIRUSTOTAL_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(
      `https://www.virustotal.com/api/v3/ip_addresses/${ip}`,
      {
        headers: {
          'x-apikey': VIRUSTOTAL_API_KEY,
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const attrs = data.data?.attributes || {};
    const stats = attrs.last_analysis_stats || {};

    const malicious = stats.malicious || 0;
    const threatTypes: ThreatType[] = [];
    
    if (malicious > 0) {
      threatTypes.push('malware');
    }

    return {
      score: Math.min(100, malicious * 10),
      country: attrs.country || '',
      threatTypes,
    };
  } catch (error) {
    console.error('[ThreatIntel] VirusTotal query failed:', error);
    return null;
  }
}

/**
 * Get comprehensive IP reputation from all sources
 */
export async function getIPReputation(ip: string, forceRefresh = false): Promise<IPReputation> {
  // Check cache first
  if (!forceRefresh) {
    const cached = reputationCache.get(ip);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
  }

  // Ensure Tor list is updated
  await updateTorExitNodes();
  
  // Check if Tor exit
  const isTor = isTorExitNode(ip);

  // Query external sources in parallel
  const [abuseData, vtData] = await Promise.all([
    queryAbuseIPDB(ip),
    queryVirusTotal(ip),
  ]);

  // Merge results
  let score = 0;
  let threatTypes: ThreatType[] = [];
  let country = '';
  let countryCode = '';
  let isp = '';
  let isVpn = false;
  let isProxy = false;
  let isHosting = false;
  let reportsCount = 0;
  let lastSeen: string | null = null;
  const sources: string[] = [];

  if (abuseData) {
    score = Math.max(score, abuseData.score || 0);
    threatTypes = [...threatTypes, ...(abuseData.threatTypes || [])];
    country = abuseData.country || country;
    countryCode = abuseData.countryCode || countryCode;
    isp = abuseData.isp || isp;
    isVpn = abuseData.isVpn || isVpn;
    isHosting = abuseData.isHosting || isHosting;
    reportsCount = abuseData.reportsCount || reportsCount;
    lastSeen = abuseData.lastSeen || lastSeen;
    sources.push('abuseipdb');
  }

  if (vtData) {
    score = Math.max(score, vtData.score || 0);
    threatTypes = [...threatTypes, ...(vtData.threatTypes || [])];
    country = vtData.country || country;
    sources.push('virustotal');
  }

  if (isTor) {
    threatTypes.push('tor_exit');
    score = Math.max(score, 30);
    sources.push('tor');
  }

  // Deduplicate threat types
  threatTypes = [...new Set(threatTypes)];

  const reputation: IPReputation = {
    ip,
    score,
    threatLevel: calculateThreatLevel(score),
    threatTypes,
    country,
    countryCode,
    isp,
    isTor,
    isVpn,
    isProxy,
    isHosting,
    lastSeen,
    reportsCount,
    source: sources.join('+') || 'internal',
    cachedAt: new Date().toISOString(),
  };

  // Cache the result
  reputationCache.set(ip, {
    data: reputation,
    expires: Date.now() + CACHE_TTL,
  });

  return reputation;
}

/**
 * Check multiple IPs in batch
 */
export async function checkIPsBatch(ips: string[]): Promise<Map<string, IPReputation>> {
  const results = new Map<string, IPReputation>();
  
  // Process in chunks to avoid rate limits
  const chunkSize = 10;
  for (let i = 0; i < ips.length; i += chunkSize) {
    const chunk = ips.slice(i, i + chunkSize);
    const promises = chunk.map(ip => getIPReputation(ip));
    const chunkResults = await Promise.all(promises);
    
    for (let j = 0; j < chunk.length; j++) {
      results.set(chunk[j], chunkResults[j]);
    }
    
    // Small delay between chunks
    if (i + chunkSize < ips.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

/**
 * Get threat summary for dashboard
 */
export async function getThreatSummary(): Promise<{
  totalChecked: number;
  threatsByLevel: Record<ThreatLevel, number>;
  topThreatTypes: { type: ThreatType; count: number }[];
  recentThreats: IPReputation[];
}> {
  const allEntries = Array.from(reputationCache.values())
    .filter(entry => entry.expires > Date.now())
    .map(entry => entry.data);

  const threatsByLevel: Record<ThreatLevel, number> = {
    unknown: 0,
    safe: 0,
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  const threatTypeCounts = new Map<ThreatType, number>();

  for (const rep of allEntries) {
    threatsByLevel[rep.threatLevel]++;
    for (const type of rep.threatTypes) {
      threatTypeCounts.set(type, (threatTypeCounts.get(type) || 0) + 1);
    }
  }

  const topThreatTypes = Array.from(threatTypeCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const recentThreats = allEntries
    .filter(rep => rep.score > 20)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  return {
    totalChecked: allEntries.length,
    threatsByLevel,
    topThreatTypes,
    recentThreats,
  };
}

/**
 * High-risk country codes
 */
export const HIGH_RISK_COUNTRIES = new Set([
  'CN', // China
  'RU', // Russia
  'KP', // North Korea
  'IR', // Iran
  'BY', // Belarus
  'VE', // Venezuela
  'SY', // Syria
  'CU', // Cuba
]);

/**
 * Check if IP is from high-risk country
 */
export function isHighRiskCountry(countryCode: string): boolean {
  return HIGH_RISK_COUNTRIES.has(countryCode.toUpperCase());
}

/**
 * Get risk assessment for an IP
 */
export async function assessIPRisk(ip: string): Promise<{
  reputation: IPReputation;
  riskScore: number;
  riskFactors: string[];
  recommendation: 'allow' | 'monitor' | 'block';
}> {
  const reputation = await getIPReputation(ip);
  const riskFactors: string[] = [];
  let riskScore = reputation.score;

  // Add risk factors
  if (reputation.isTor) {
    riskFactors.push('Tor exit node detected');
    riskScore += 20;
  }

  if (reputation.isVpn) {
    riskFactors.push('VPN/Proxy detected');
    riskScore += 10;
  }

  if (isHighRiskCountry(reputation.countryCode)) {
    riskFactors.push(`High-risk country: ${reputation.country}`);
    riskScore += 30;
  }

  if (reputation.reportsCount > 10) {
    riskFactors.push(`Multiple abuse reports: ${reputation.reportsCount}`);
    riskScore += 15;
  }

  if (reputation.threatTypes.includes('malware')) {
    riskFactors.push('Associated with malware');
    riskScore += 25;
  }

  if (reputation.threatTypes.includes('bruteforce')) {
    riskFactors.push('Brute force attack history');
    riskScore += 20;
  }

  // Cap score at 100
  riskScore = Math.min(100, riskScore);

  // Determine recommendation
  let recommendation: 'allow' | 'monitor' | 'block';
  if (riskScore >= 70) {
    recommendation = 'block';
  } else if (riskScore >= 30) {
    recommendation = 'monitor';
  } else {
    recommendation = 'allow';
  }

  return {
    reputation,
    riskScore,
    riskFactors,
    recommendation,
  };
}

export default {
  getIPReputation,
  checkIPsBatch,
  getThreatSummary,
  assessIPRisk,
  isTorExitNode,
  isHighRiskCountry,
  updateTorExitNodes,
  HIGH_RISK_COUNTRIES,
};
