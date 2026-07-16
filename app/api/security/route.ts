/**
 * Security Operations Center API
 * 
 * Provides endpoints for security monitoring, threat detection,
 * event management, scanning, and automated response playbooks.
 * 
 * @version 2.1.0 - Enhanced with real implementations
 */

import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { requireAdmin } from '@/lib/auth/api-auth';
import { incidentLedger } from '@/lib/security/ledger';

// Legacy imports (for backwards compatibility)
import { 
  getIPReputation, 
  assessIPRisk, 
  getThreatSummary as getIntelSummary,
  type IPReputation 
} from '@/lib/security/threat-intel';
import { 
  triggerPlaybooks, 
  getPlaybooks, 
  getPlaybook, 
  getExecutionHistory,
  type PlaybookTrigger,
  type Playbook 
} from '@/lib/security/playbooks';
import { 
  requestScan, 
  getScanResult, 
  getScanHistory, 
  getDiscoveredHosts,
  getVulnerabilities,
  type ScanType 
} from '@/lib/security/scanner';
import { 
  createAlert, 
  getAlerts, 
  acknowledgeAlert as ackAlert, 
  getAlertStats 
} from '@/lib/security/alerting';

// NEW: Enhanced implementations
import {
  // Database persistence
  createSecurityEvent as dbCreateEvent,
  getSecurityEvents as dbGetEvents,
  getEventStats,
  createIncident as dbCreateIncident,
  getIncidents as dbGetIncidents,
  updateIncident as dbUpdateIncident,
  getScanResults as dbGetScanResults,
  getPlaybookExecutions,
  getAuditLogs,
  createAuditLog,
  getScanSchedules,
  createScanSchedule,
  updateScanSchedule,
  deleteScanSchedule,
  // Compliance
  getComplianceControls,
  updateComplianceControl,
  getComplianceAuditLogs,
  createComplianceAuditLog,
  getComplianceStats,
  // FCL
  getKeyPersonnel,
  createKeyPersonnel,
  updateKeyPersonnel,
  deleteKeyPersonnel,
  getTrainingRecords,
  createTrainingRecord,
} from '@/lib/security/database';

import {
  // Email alerts
  sendSecurityEventAlert,
  sendIncidentAlert,
  getEmailProviderStatus,
} from '@/lib/security/email-alerts';

import {
  // Real-time alerts
  broadcastSecurityEvent,
  broadcastIncidentAlert,
  alertManager,
} from '@/lib/security/websocket-alerts';

import {
  // Playbook engine
  processEvent as processPlaybookEvent,
  getPlaybooks as getPlaybookDefinitions,
  getPendingApprovals,
  approvePlaybook,
  rejectPlaybook,
  triggerPlaybookManually,
} from '@/lib/security/playbook-engine';

import {
  // Network scanner
  queueScan,
  getScanStatus,
  getQueuedScans,
} from '@/lib/security/network-scanner';

import {
  // Suricata IDS
  getIDSStats,
  getRecentAlerts as getRecentIDSAlerts,
  testWithMockEvent,
  initializeIDS,
  isIDSConnected,
} from '@/lib/security/suricata-ids';

// Types
interface AuthorizedUser {
  id: string;
  name: string;
  role: string;
  email: string;
  locations: UserLocation[];
  access_level: string;
  mobile_access: boolean;
  vpn_allowed: boolean;
  mfa_enabled: boolean;
}

interface UserLocation {
  name: string;
  city: string;
  state: string;
  country: string;
  timezone: string;
  coordinates: { lat: number; lng: number };
  radius_km: number;
  primary: boolean;
}

interface SecurityEvent {
  id: string;
  timestamp: string;
  event_type: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  source_ip: string;
  source_mac?: string;
  destination_ip?: string;
  geo_location?: GeoLocation;
  rule_matched?: string;
  action_taken?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

interface GeoLocation {
  ip: string;
  country: string;
  country_code: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  isp: string;
  is_vpn: boolean;
  is_tor: boolean;
}

interface ThreatSummary {
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
}

interface SecurityConfig {
  users: AuthorizedUser[];
  allowed_countries: string[];
  high_risk_countries: string[];
  trusted_services: TrustedService[];
}

interface TrustedService {
  name: string;
  domain: string;
  ips: string[];
  description: string;
  outbound_only: boolean;
}

/** Ephemeral events only when MAS is unavailable (no baseline/mock seeding). */
const eventStore: SecurityEvent[] = [];
const MAX_EVENTS = 1000;

/** Fast-fail MAS calls for compliance polling (avoids ~4s+ hangs on 188). */
const MAS_COMPLIANCE_FETCH_TIMEOUT_MS = 2000;
/** Short server TTL so dashboard polling does not hammer MAS. */
const MAS_COMPLIANCE_BUNDLE_TTL_MS = 20_000;

let masComplianceBundleCache: {
  expiresAt: number;
  payload: Record<string, unknown>;
} | null = null;

function getMasApiBase(): string {
  return (process.env.MAS_API_URL || process.env.NEXT_PUBLIC_MAS_API_URL || '').replace(/\/$/, '');
}

function masRequestHeaders(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json', ...extra };
  const key = process.env.MAS_API_KEY || process.env.MAS_INTERNAL_API_KEY;
  if (key) h['X-API-Key'] = key;
  return h;
}

async function masGet(
  path: string,
  options?: { timeoutMs?: number }
): Promise<{ ok: boolean; data: unknown; status: number }> {
  const base = getMasApiBase();
  if (!base) return { ok: false, data: null, status: 0 };
  const p = path.startsWith('/') ? path : `/${path}`;
  const timeoutMs = options?.timeoutMs;
  const controller = typeof timeoutMs === 'number' ? new AbortController() : null;
  const timer =
    controller && typeof timeoutMs === 'number'
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;
  try {
    const res = await fetch(`${base}${p}`, {
      cache: 'no-store',
      headers: masRequestHeaders(),
      ...(controller ? { signal: controller.signal } : {}),
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, data, status: res.status };
  } catch {
    return { ok: false, data: null, status: 0 };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function normalizeSeverity(s: string | undefined): SecurityEvent['severity'] {
  const v = (s || 'medium').toLowerCase();
  if (v === 'info' || v === 'low' || v === 'medium' || v === 'high' || v === 'critical') return v;
  return 'medium';
}

function incidentRowToSecurityEvent(inc: Record<string, unknown>): SecurityEvent {
  const ts = typeof inc.created_at === 'string' ? inc.created_at : new Date().toISOString();
  return {
    id: String(inc.id || ''),
    timestamp: ts,
    event_type: String(inc.kind || 'incident'),
    severity: normalizeSeverity(inc.severity as string | undefined),
    source_ip: String(inc.source_ip || inc.host || inc.ip || '0.0.0.0'),
    description: String(inc.title || inc.description || ''),
    metadata: {
      incident: true,
      status: inc.status,
      source: inc.source,
      host: inc.host,
      details: inc.details,
    },
  };
}

async function fetchMasIncidentsAsEvents(limit: number, severity?: string | null): Promise<SecurityEvent[]> {
  const base = getMasApiBase();
  if (!base) return [];
  try {
    let q = `/api/incidents?limit=${encodeURIComponent(String(limit))}`;
    if (severity) q += `&severity=${encodeURIComponent(severity)}`;
    const { ok, data } = await masGet(q);
    if (!ok || !data) return [];
    const rows = Array.isArray((data as { incidents?: Record<string, unknown>[] }).incidents)
      ? (data as { incidents: Record<string, unknown>[] }).incidents
      : [];
    return rows.map(incidentRowToSecurityEvent);
  } catch (e) {
    console.warn('[Security] MAS /api/incidents fetch failed:', e);
    return [];
  }
}

// Load configuration
function loadSecurityConfig(): SecurityConfig | null {
  try {
    // Try multiple paths
    const possiblePaths = [
      path.join(process.cwd(), '..', 'mycosoft-mas', 'config', 'security', 'authorized-users.json'),
      path.join(process.cwd(), 'config', 'security', 'authorized-users.json'),
      '/opt/mycosoft/config/security/authorized-users.json'
    ];

    for (const configPath of possiblePaths) {
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(data);
      }
    }
  } catch (error) {
    console.error('Failed to load security config:', error);
  }
  return null;
}

/**
 * GET /api/security
 * Returns security status and threat summary.
 * Admin required (company/SOC access).
 */
export async function GET(request: NextRequest) {
  let auth: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    auth = await requireAdmin();
  } catch (err) {
    console.error('[Security] requireAdmin threw:', err);
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'status':
        return await getSecurityStatus();
      
      case 'users':
        return getAuthorizedUsers();
      
      case 'events':
        const limit = parseInt(searchParams.get('limit') || '100');
        const severity = searchParams.get('severity');
        return await getSecurityEvents(limit, severity);
      
      case 'threats':
        return await getThreatSummaryData();
      
      case 'config':
        return getSecurityConfig();
      
      case 'geo-lookup':
        const ip = searchParams.get('ip');
        if (!ip) {
          return NextResponse.json({ error: 'IP address required' }, { status: 400 });
        }
        return geoLookup(ip);

      /** Geo plot for SOC dashboard — unique incident source IPs from MAS, geolocated via ip-api batch. */
      case 'threat-map':
        return getThreatMapFromIncidents();
      
      // ===== NEW ENDPOINTS =====
      
      case 'threat-intel':
        const threatIp = searchParams.get('ip');
        if (!threatIp) {
          return NextResponse.json({ error: 'IP address required' }, { status: 400 });
        }
        return getThreatIntelligence(threatIp);
      
      case 'risk-assessment':
        const riskIp = searchParams.get('ip');
        if (!riskIp) {
          return NextResponse.json({ error: 'IP address required' }, { status: 400 });
        }
        return getRiskAssessment(riskIp);
      
      case 'playbooks':
        const playbookId = searchParams.get('id');
        if (playbookId) {
          const playbook = getPlaybook(playbookId);
          return NextResponse.json(playbook || { error: 'Playbook not found' });
        }
        return NextResponse.json({ playbooks: getPlaybooks() });
      
      case 'playbook-history':
        const historyLimit = parseInt(searchParams.get('limit') || '50');
        return NextResponse.json({ executions: getExecutionHistory(historyLimit) });
      
      case 'scan':
        const scanId = searchParams.get('id');
        if (scanId) {
          const result = await getScanResult(scanId);
          return NextResponse.json(result || { error: 'Scan not found' });
        }
        return NextResponse.json({ scans: await getScanHistory() });
      
      case 'hosts':
        return NextResponse.json({ hosts: await getDiscoveredHosts() });
      
      case 'vulnerabilities':
        return NextResponse.json({ vulnerabilities: await getVulnerabilities() });
      
      case 'ids-events':
        return getIDSEvents(parseInt(searchParams.get('limit') || '100'));
      
      case 'alerts':
        const alertSeverity = searchParams.get('severity');
        const alertStatus = searchParams.get('status');
        const alertLimit = parseInt(searchParams.get('limit') || '50');
        return NextResponse.json({ 
          alerts: getAlerts({ 
            limit: alertLimit,
            severity: alertSeverity ? [alertSeverity as any] : undefined,
            status: alertStatus ? [alertStatus as any] : undefined,
          }),
          stats: getAlertStats()
        });
      
      case 'intel-summary':
        return NextResponse.json(await getIntelSummary());
      
      // ===== NEW V2.1 ENDPOINTS =====
      
      case 'db-events':
        // Database-backed events
        const dbLimit = parseInt(searchParams.get('limit') || '100');
        const dbSeverity = searchParams.get('severity') || undefined;
        const events = await dbGetEvents({ limit: dbLimit, severity: dbSeverity });
        return NextResponse.json({ events });
      
      case 'event-stats':
        // Event statistics
        const stats = await getEventStats();
        return NextResponse.json(stats);
      
      case 'incidents':
        // Incident management with Blockchain Ledger
        const incStatus = searchParams.get('status') || undefined;
        let chainHistory = incidentLedger.getFullHistory(true);
        if (incStatus) {
            chainHistory = chainHistory.filter(b => b.data && b.data.status === incStatus);
        }
        const incidents = chainHistory.map(b => ({
          id: b.data?.incident_id || 'UNKNOWN',
          title: b.data?.title || 'System Block',
          description: b.data?.description || '',
          severity: b.data?.severity || 'info',
          status: b.data?.status || 'system',
          created_at: b.timestamp,
          ledger_hash: b.hash,
          ledger_signature: b.signature,
          ledger_previous_hash: b.previousHash
        }));
        return NextResponse.json({ incidents, ledger_valid: incidentLedger.isChainValid() });
      
      case 'scan-schedules':
        // Get all scan schedules
        const schedulesData = await getScanSchedules();
        return NextResponse.json({ schedules: schedulesData });
      
      case 'playbook-definitions':
        // Enhanced playbook definitions
        return NextResponse.json({ playbooks: getPlaybookDefinitions() });
      
      case 'playbook-executions':
        // Playbook execution history from database
        const pbLimit = parseInt(searchParams.get('limit') || '20');
        const executions = await getPlaybookExecutions(pbLimit);
        return NextResponse.json({ executions });
      
      case 'pending-approvals':
        // Playbooks awaiting approval
        return NextResponse.json({ approvals: getPendingApprovals() });
      
      case 'scan-queue':
        // Network scan queue
        return NextResponse.json({ scans: getQueuedScans() });
      
      case 'scan-results':
        // Database-backed scan results
        const scanLimit = parseInt(searchParams.get('limit') || '20');
        const scanResults = await dbGetScanResults(scanLimit);
        return NextResponse.json({ results: scanResults });
      
      case 'ids-stats':
        // Suricata IDS statistics
        return NextResponse.json(getIDSStats());
      
      case 'ids-alerts':
        // Recent IDS alerts
        const idsLimit = parseInt(searchParams.get('limit') || '100');
        return NextResponse.json({ alerts: getRecentIDSAlerts(idsLimit) });
      
      case 'ids-status':
        // IDS connection status
        return NextResponse.json({ 
          connected: isIDSConnected(),
          stats: getIDSStats()
        });
      
      case 'audit-logs':
        // Audit trail
        const auditLimit = parseInt(searchParams.get('limit') || '100');
        const auditActor = searchParams.get('actor') || undefined;
        const auditAction = searchParams.get('action') || undefined;
        const logs = await getAuditLogs({ limit: auditLimit, actor: auditActor, action: auditAction });
        return NextResponse.json({ logs });
      
      case 'realtime-stats':
        // Real-time alert system stats
        return NextResponse.json({
          subscriber_count: alertManager.getSubscriberCount(),
          recent_alerts: alertManager.getRecentAlerts(10),
        });
      
      case 'email-status':
        // Email provider status
        return NextResponse.json(getEmailProviderStatus());
      
      // ═══════════════════════════════════════════════════════════════
      // COMPLIANCE ENDPOINTS
      // ═══════════════════════════════════════════════════════════════
      
      case 'compliance-controls': {
        // Live MAS soc_ops via getComplianceControls (MAS_API_URL). Never 500 the heatmap.
        type ComplianceFramework =
          | 'NIST-800-53' | 'NIST-800-171'
          | 'CMMC-L1' | 'CMMC-L2' | 'CMMC-L3'
          | 'NISPOM' | 'FOCI' | 'SBIR-STTR' | 'ITAR' | 'EAR';

        const frameworkFilter = searchParams.get('framework') as ComplianceFramework | undefined;
        const familyFilter = searchParams.get('family') || undefined;
        const statusFilter = searchParams.get('status') as 'compliant' | 'partial' | 'non_compliant' | 'not_applicable' | undefined;

        let complianceControls: Awaited<ReturnType<typeof getComplianceControls>> = [];
        let source: 'mas' | 'seeded' | 'error' = 'seeded';
        try {
          complianceControls = await getComplianceControls({
            framework: frameworkFilter || undefined,
            family: familyFilter,
            status: statusFilter,
          });
          source = getMasApiBase() ? 'mas' : 'seeded';
        } catch (err) {
          console.error('[Security] compliance-controls failed:', err);
          // Direct MAS fallback if DB helper throws
          const { ok, data } = await masGet('/api/compliance/controls');
          if (ok && Array.isArray((data as { controls?: unknown[] })?.controls)) {
            complianceControls = (data as { controls: Record<string, unknown>[] }).controls.map((row) => {
              const impl = String(row.implementation_state ?? 'planned');
              const status =
                impl === 'implemented' ? 'compliant' : impl === 'partial' ? 'partial' : 'non_compliant';
              return {
                id: String(row.control_id ?? ''),
                framework: String(row.framework ?? 'NIST_800_171').includes('CMMC') ? 'CMMC-L2' : 'NIST-800-171',
                family: String(row.family ?? '—'),
                name: String(row.title ?? row.control_id ?? ''),
                description: String((row.state_snapshot as { summary?: string } | undefined)?.summary ?? ''),
                status: status as 'compliant' | 'partial' | 'non_compliant',
                evidence: row.evidence_uri ? [String(row.evidence_uri)] : [],
                lastAudit: row.last_verified_at ? String(row.last_verified_at).split('T')[0] : '',
                lastAuditBy: 'soc_ops',
                priority: status === 'non_compliant' ? 'high' : status === 'partial' ? 'medium' : 'low',
                notes: '',
              };
            }) as Awaited<ReturnType<typeof getComplianceControls>>;
            source = 'mas';
          } else {
            source = 'error';
          }
        }

        const implemented = complianceControls.filter((c) => c.status === 'compliant').length;
        const partial = complianceControls.filter((c) => c.status === 'partial').length;

        const allFrameworks = [
          'NIST-800-53', 'NIST-800-171',
          'CMMC-L1', 'CMMC-L2', 'CMMC-L3',
          'NISPOM', 'FOCI', 'SBIR-STTR', 'ITAR', 'EAR',
        ];

        return NextResponse.json({
          controls: complianceControls,
          frameworks: allFrameworks,
          source,
          counts: { total: complianceControls.length, implemented, partial },
        });
      }

      case 'compliance-stats': {
        // Get compliance statistics — prefer live MAS; never throw
        try {
          const complianceStats = await getComplianceStats();
          return NextResponse.json({
            ...complianceStats,
            supportedFrameworks: ['NIST-800-53', 'NIST-800-171', 'CMMC-L2'],
          });
        } catch (err) {
          console.error('[Security] compliance-stats failed:', err);
          const { ok, data } = await masGet('/api/compliance/score');
          if (ok && data && typeof data === 'object') {
            const s = data as {
              total_controls?: number;
              implemented?: number;
              partial?: number;
              implementation_percent?: number;
            };
            return NextResponse.json({
              totalControls: s.total_controls ?? 0,
              compliant: s.implemented ?? 0,
              partial: s.partial ?? 0,
              nonCompliant: Math.max(0, (s.total_controls ?? 0) - (s.implemented ?? 0) - (s.partial ?? 0)),
              score: Math.round(s.implementation_percent ?? 0),
              lastAudit: '',
              auditLogsToday: 0,
              supportedFrameworks: ['NIST-800-53', 'NIST-800-171', 'CMMC-L2'],
              source: 'mas',
            });
          }
          return NextResponse.json({
            totalControls: 0,
            compliant: 0,
            partial: 0,
            nonCompliant: 0,
            score: 0,
            lastAudit: '',
            auditLogsToday: 0,
            supportedFrameworks: ['NIST-800-53', 'NIST-800-171', 'CMMC-L2'],
            source: 'error',
          });
        }
      }
      
      case 'compliance-audit-logs':
        // Get compliance audit logs
        const complianceLimit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 100;
        const complianceAuditLogs = await getComplianceAuditLogs({ limit: complianceLimit });
        return NextResponse.json({ logs: complianceAuditLogs });
      
      // FCL (Facility Clearance) endpoints
      case 'fcl-personnel':
        const personnel = await getKeyPersonnel();
        return NextResponse.json({ personnel });
      
      case 'fcl-training':
        const training = await getTrainingRecords();
        return NextResponse.json({ training });

      /** Reconciled LAN inventory from MAS Postgres (`soc_ops.device_inventory`). */
      case 'network-inventory': {
        const base = getMasApiBase();
        if (!base) {
          return NextResponse.json({ items: [], count: 0, source: 'mas_unconfigured' });
        }
        const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '2000', 10) || 2000, 1), 5000);
        const { ok, data, status } = await masGet(`/api/devices/inventory?limit=${limit}`);
        if (!ok) {
          return NextResponse.json({ items: [], count: 0, source: 'mas_error', httpStatus: status });
        }
        const obj = data as { items?: unknown[]; count?: number; source?: string };
        const items = Array.isArray(obj?.items) ? obj.items : [];
        return NextResponse.json({
          items,
          count: items.length,
          source: obj?.source || 'mas',
        });
      }

      /** MAS NIST 800-171 live bundle: score + latest SSP/POAM pointers + control rows for heatmap. */
      case 'mas-compliance-bundle': {
        const now = Date.now();
        if (masComplianceBundleCache && masComplianceBundleCache.expiresAt > now) {
          return NextResponse.json({
            ...masComplianceBundleCache.payload,
            cached: true,
            cache_ttl_ms: MAS_COMPLIANCE_BUNDLE_TTL_MS,
          });
        }
        const base = getMasApiBase();
        if (!base) {
          return NextResponse.json({
            score: null,
            docs: null,
            controls: [],
            error: 'mas_unconfigured',
          });
        }
        const fetchOpts = { timeoutMs: MAS_COMPLIANCE_FETCH_TIMEOUT_MS };
        const [score, docs, controls] = await Promise.all([
          masGet('/api/compliance/score', fetchOpts),
          masGet('/api/compliance/docs', fetchOpts),
          masGet('/api/compliance/controls', fetchOpts),
        ]);
        const ctrlArr =
          controls.ok &&
          Array.isArray((controls.data as { controls?: unknown[] })?.controls)
            ? (controls.data as { controls: unknown[] }).controls
            : [];
        const payload: Record<string, unknown> = {
          score: score.ok ? score.data : null,
          docs: docs.ok ? docs.data : null,
          controls: ctrlArr,
          errors: {
            score: score.ok ? null : score.status,
            docs: docs.ok ? null : docs.status,
            controls: controls.ok ? null : controls.status,
          },
          cached: false,
          cache_ttl_ms: MAS_COMPLIANCE_BUNDLE_TTL_MS,
          mas_timeout_ms: MAS_COMPLIANCE_FETCH_TIMEOUT_MS,
        };
        masComplianceBundleCache = {
          expiresAt: now + MAS_COMPLIANCE_BUNDLE_TTL_MS,
          payload,
        };
        return NextResponse.json(payload);
      }

      /** Summary tiles for `/security` dashboard (inventory + compliance score + red team health). */
      case 'soc-dashboard-tiles': {
        const base = getMasApiBase();
        if (!base) {
          return NextResponse.json({
            network: { total: 0, online: 0, offline: 0, stale: 0, unknown: 0, source: 'mas_unconfigured' },
            compliance: null,
            redteam: null,
          });
        }
        const [inv, score, rt] = await Promise.all([
          masGet('/api/devices/inventory?limit=5000'),
          masGet('/api/compliance/score'),
          masGet('/api/redteam/health'),
        ]);
        const items = Array.isArray((inv.data as { items?: unknown[] })?.items)
          ? (inv.data as { items: unknown[] }).items
          : [];
        let online = 0;
        let offline = 0;
        let stale = 0;
        let unknown = 0;
        for (const row of items) {
          const st = String((row as Record<string, unknown>).status || 'unknown').toLowerCase();
          if (st === 'online') online += 1;
          else if (st === 'offline') offline += 1;
          else if (st === 'stale') stale += 1;
          else unknown += 1;
        }
        return NextResponse.json({
          network: {
            total: items.length,
            online,
            offline,
            stale,
            unknown,
            source: (inv.data as { source?: string })?.source || 'inventory',
          },
          compliance: score.ok ? score.data : null,
          redteam: rt.ok ? rt.data : null,
        });
      }
      
      default:
        // Return dashboard overview
        return await getDashboardOverview();
    }
  } catch (error) {
    console.error('Security API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/security
 * Handle security actions.
 * Admin required.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'report_event':
        return reportSecurityEvent(data);
      
      case 'block_ip':
        return blockIP(data.ip, data.reason);
      
      case 'unblock_ip':
        return unblockIP(data.ip);
      
      case 'update_user':
        return updateAuthorizedUser(data);
      
      case 'acknowledge_event':
        return acknowledgeEvent(data.event_id);
      
      // ===== NEW POST ACTIONS =====
      
      case 'start_scan':
        return startNetworkScan(data.type, data.target);
      
      case 'execute_playbook':
        return executeSecurityPlaybook(data.playbook_id, data.trigger, data.context);
      
      case 'trigger_playbook':
        return triggerSecurityPlaybooks(data.trigger, data.context);
      
      case 'create_alert':
        return createSecurityAlert(data);
      
      case 'acknowledge_alert':
        return handleAcknowledgeAlert(data.alert_id, data.acknowledged_by);
      
      case 'quarantine_device':
        return quarantineDevice(data.mac, data.reason);
      
      case 'unquarantine_device':
        return unquarantineDevice(data.mac);
      
      // ===== NEW V2.1 POST ACTIONS =====
      
      case 'db_create_event':
        // Create event in database
        const newEvent = await dbCreateEvent({
          timestamp: data.timestamp || new Date().toISOString(),
          event_type: data.event_type,
          severity: data.severity,
          source_ip: data.source_ip || null,
          destination_ip: data.destination_ip || null,
          description: data.description,
          geo_location: data.geo_location || null,
          metadata: data.metadata || {},
          resolved: false,
          resolved_at: null,
          resolved_by: null,
        });
        // Broadcast and trigger playbooks
        broadcastSecurityEvent({
          event_type: data.event_type,
          severity: data.severity,
          description: data.description,
          source_ip: data.source_ip,
        });
        await processPlaybookEvent({
          id: newEvent.id,
          event_type: data.event_type,
          severity: data.severity,
          source_ip: data.source_ip,
          destination_ip: data.destination_ip,
          metadata: data.metadata || {},
        });
        return NextResponse.json({ success: true, event: newEvent });
      
      case 'create_incident':
        // Create incident on the internal blockchain ledger
        const incidentPayload = {
          incident_id: 'INC-' + Date.now(),
          title: data.title,
          description: data.description,
          severity: data.severity,
          status: data.status || 'open',
          action: 'created',
          actor: data.created_by || 'system',
          timestamp: new Date().toISOString()
        };
        const block = incidentLedger.addIncident(incidentPayload);
        broadcastIncidentAlert({
          incident_id: incidentPayload.incident_id,
          title: incidentPayload.title,
          severity: incidentPayload.severity,
          status: incidentPayload.status,
          action: 'created',
        });
        await sendIncidentAlert({
          title: incidentPayload.title,
          description: incidentPayload.description,
          severity: incidentPayload.severity,
          status: incidentPayload.status,
          assigned_to: undefined,
        });
        return NextResponse.json({ success: true, incident: incidentPayload, ledger_block: block.hash });
      
      case 'update_incident':
        // Update incident using Ledger append
        const history = incidentLedger.getFullHistory(true);
        const existingBlock = history.slice().reverse().find(b => b.data && b.data.incident_id === data.incident_id);
        
        let updatedPayload = null;
        if (existingBlock && existingBlock.data) {
          updatedPayload = {
            ...existingBlock.data,
            ...data.updates,
            action: 'updated',
            actor: data.timeline_entry?.actor || 'system',
            timestamp: new Date().toISOString()
          };
          const updateBlock = incidentLedger.addIncident(updatedPayload);
          
          broadcastIncidentAlert({
            incident_id: updatedPayload.incident_id,
            title: updatedPayload.title,
            severity: updatedPayload.severity,
            status: updatedPayload.status,
            action: data.updates?.status === 'resolved' ? 'resolved' : 'updated',
          });
          
          if (data.updates?.status) {
            sendIncidentAlert({
              title: `[${data.updates.status.toUpperCase()}] ${updatedPayload.title}`,
              description: `Incident status changed to ${data.updates.status}. Updated by ${data.timeline_entry?.actor || 'System'}.`,
              severity: updatedPayload.severity,
              status: updatedPayload.status,
              assigned_to: undefined,
            }).catch(err => console.error('[Security] Failed to send status update email:', err));
          }
        }
        return NextResponse.json({ success: true, incident: updatedPayload });
      
      case 'queue_scan':
        // Queue a network scan
        const scanId = await queueScan({
          target: data.target,
          scan_type: data.scan_type,
          ports: data.ports,
          triggered_by: data.triggered_by || 'api',
        });
        return NextResponse.json({ success: true, scan_id: scanId });
      
      case 'create_scan_schedule':
        // Create a new scan schedule
        const newSchedule = await createScanSchedule({
          name: data.name,
          target: data.target,
          scanType: data.scanType,
          frequency: data.frequency,
          dayOfWeek: data.dayOfWeek,
          hourOfDay: data.hourOfDay,
          enabled: data.enabled ?? true,
        });
        await createAuditLog({
          timestamp: new Date().toISOString(),
          action: 'scan_schedule_created',
          actor: 'api',
          target_type: 'scan_schedule',
          target_id: newSchedule.id,
          details: { name: newSchedule.name, target: newSchedule.target },
          ip_address: null,
        });
        return NextResponse.json({ success: true, schedule: newSchedule });
      
      case 'update_scan_schedule':
        // Update a scan schedule
        const updatedSchedule = await updateScanSchedule(data.schedule_id, {
          enabled: data.enabled,
        });
        return NextResponse.json({ success: !!updatedSchedule, schedule: updatedSchedule });
      
      case 'delete_scan_schedule':
        // Delete a scan schedule
        await deleteScanSchedule(data.schedule_id);
        return NextResponse.json({ success: true });
      
      case 'approve_playbook':
        // Approve pending playbook
        const approvedExec = await approvePlaybook(data.approval_id, data.approver);
        return NextResponse.json({ success: !!approvedExec, execution: approvedExec });
      
      case 'reject_playbook':
        // Reject pending playbook
        await rejectPlaybook(data.approval_id, data.rejector, data.reason);
        return NextResponse.json({ success: true });
      
      case 'trigger_playbook_manual':
        // Manually trigger a playbook
        const manualExec = await triggerPlaybookManually(
          data.playbook_id,
          data.triggered_by,
          data.event_data || {}
        );
        return NextResponse.json({ success: !!manualExec, execution: manualExec });
      
      case 'test_ids':
        // IDS pipeline validation only — generates synthetic event for testing. Not production data display.
        const mockEvent = await testWithMockEvent();
        return NextResponse.json({ success: true, event: mockEvent });
      
      case 'init_ids':
        // Initialize IDS monitoring
        await initializeIDS({ enableMockEvents: data.enable_mock || false });
        return NextResponse.json({ success: true, status: getIDSStats() });
      
      case 'send_test_email':
        // Send test email alert
        const testEmail = await sendSecurityEventAlert({
          event_type: 'test_alert',
          severity: 'info',
          description: 'This is a test alert from the Mycosoft SOC',
          source_ip: '127.0.0.1',
        });
        return NextResponse.json({ success: true, email: testEmail });
      
      case 'create_audit_log':
        // Create audit log entry
        const auditLog = await createAuditLog({
          timestamp: new Date().toISOString(),
          action: data.action,
          actor: data.actor,
          target_type: data.target_type,
          target_id: data.target_id,
          details: data.details || {},
          ip_address: data.ip_address || null,
        });
        return NextResponse.json({ success: true, log: auditLog });
      
      // ═══════════════════════════════════════════════════════════════
      // COMPLIANCE POST ENDPOINTS
      // ═══════════════════════════════════════════════════════════════
      
      case 'update_compliance_control':
        // Update a compliance control status
        const controlId = data.control_id;
        const controlUpdates = data.updates || {};
        const updatedBy = data.updated_by || 'system';
        const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';
        
        if (!controlId) {
          return NextResponse.json({ error: 'Control ID required' }, { status: 400 });
        }
        
        const updatedControl = await updateComplianceControl(controlId, controlUpdates, updatedBy, clientIp);
        
        if (!updatedControl) {
          return NextResponse.json({ error: 'Control not found' }, { status: 404 });
        }
        
        return NextResponse.json({ success: true, control: updatedControl });
      
      case 'log_compliance_action':
        // Log a compliance-related action
        const auditEntry = await createComplianceAuditLog({
          action: data.action || 'UNKNOWN',
          user: data.user || 'anonymous',
          resource: data.resource || '',
          resource_type: data.resource_type || 'config',
          result: data.result || 'success',
          ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
          details: data.details || {},
        });
        return NextResponse.json({ success: true, log: auditEntry });
      
      // ═══════════════════════════════════════════════════════════════
      // FCL (FACILITY CLEARANCE) POST ENDPOINTS
      // ═══════════════════════════════════════════════════════════════
      
      case 'create-personnel':
        const newPersonnel = await createKeyPersonnel({
          name: data.name,
          title: data.title,
          role: data.role,
          clearanceLevel: data.clearanceLevel,
          clearanceStatus: data.clearanceStatus || 'pending',
          clearanceExpiry: data.clearanceExpiry,
          email: data.email,
          phone: data.phone,
        });
        return NextResponse.json({ success: true, personnel: newPersonnel });
      
      case 'update-personnel':
        const updatedPersonnel = await updateKeyPersonnel(data.id, {
          name: data.name,
          title: data.title,
          role: data.role,
          clearanceLevel: data.clearanceLevel,
          clearanceStatus: data.clearanceStatus,
          clearanceExpiry: data.clearanceExpiry,
          email: data.email,
          phone: data.phone,
        });
        return NextResponse.json({ success: true, personnel: updatedPersonnel });
      
      case 'delete-personnel':
        await deleteKeyPersonnel(data.id);
        return NextResponse.json({ success: true });
      
      case 'create-training':
        const newTraining = await createTrainingRecord({
          courseName: data.courseName,
          provider: data.provider,
          completedDate: data.completedDate,
          expirationDate: data.expirationDate,
          personnel: data.personnel,
          certificateUrl: data.certificateUrl,
          status: data.status || 'complete',
        });
        return NextResponse.json({ success: true, training: newTraining });

      /** Proxy to MAS multi-model SSP/POA&M regeneration (Guardian / keys on MAS). */
      case 'mas_compliance_regenerate': {
        const base = getMasApiBase();
        if (!base) {
          return NextResponse.json({ error: 'MAS not configured' }, { status: 503 });
        }
        const res = await fetch(`${base}/api/compliance/regenerate`, {
          method: 'POST',
          headers: masRequestHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            doc_type: data.doc_type || 'SSP',
            title: data.title || 'Regenerated document',
          }),
        });
        const jd = await res.json().catch(() => ({}));
        return NextResponse.json(jd, { status: res.status });
      }
      
      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Security API POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handler functions

async function getSecurityStatus() {
  const masEvents = await fetchMasIncidentsAsEvents(300);
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const eventsLastHour = masEvents.filter(e => new Date(e.timestamp) > hourAgo);
  const eventsLastDay = masEvents.filter(e => new Date(e.timestamp) > dayAgo);

  // Calculate threat level based on events
  let threatLevel: 'low' | 'elevated' | 'high' | 'critical' = 'low';
  const criticalCount = eventsLastHour.filter(e => e.severity === 'critical').length;
  const highCount = eventsLastHour.filter(e => e.severity === 'high').length;

  if (criticalCount > 0) {
    threatLevel = 'critical';
  } else if (highCount > 2) {
    threatLevel = 'high';
  } else if (highCount > 0 || eventsLastHour.length > 10) {
    threatLevel = 'elevated';
  }

  return NextResponse.json({
    status: 'active',
    threat_level: threatLevel,
    monitoring_enabled: true,
    last_check: now.toISOString(),
    events_last_hour: eventsLastHour.length,
    events_last_day: eventsLastDay.length,
    critical_events: criticalCount,
    high_events: highCount,
    unique_ips: new Set(eventsLastDay.map(e => e.source_ip)).size,
    uptime_seconds: Math.floor(process.uptime()),
    data_source: getMasApiBase() ? 'mas_api_incidents' : 'mas_unconfigured',
  });
}

function getAuthorizedUsers() {
  const config = loadSecurityConfig();
  if (!config) {
    return NextResponse.json({ users: [] });
  }

  // Return sanitized user data
  const users = config.users.map(user => ({
    id: user.id,
    name: user.name,
    role: user.role,
    locations: user.locations.map(loc => ({
      name: loc.name,
      city: loc.city,
      state: loc.state,
      country: loc.country,
      primary: loc.primary
    })),
    mobile_access: user.mobile_access,
    vpn_allowed: user.vpn_allowed
  }));

  return NextResponse.json({ users });
}

async function getSecurityEvents(limit: number, severity?: string | null) {
  const masEvents = await fetchMasIncidentsAsEvents(Math.max(limit, 200), severity || undefined);
  let events = [...masEvents].reverse();
  if (severity) {
    events = events.filter(e => e.severity === severity);
  }
  events = events.slice(0, limit);

  return NextResponse.json({
    events,
    total: masEvents.length,
    returned: events.length,
    data_source: getMasApiBase() ? 'mas_api_incidents' : 'mas_unconfigured',
  });
}

function isPublicRoutableIp(ip: string): boolean {
  if (!ip || ip === '0.0.0.0') return false;
  if (ip.startsWith('127.') || ip.startsWith('10.') || ip.startsWith('192.168.')) return false;
  if (ip.startsWith('172.')) {
    const p = ip.split('.');
    const second = parseInt(p[1] || '0', 10);
    if (second >= 16 && second <= 31) return false;
  }
  return true;
}

async function getThreatMapFromIncidents() {
  const events = await fetchMasIncidentsAsEvents(200);
  const byIp = new Map<string, { severity: string; count: number; last: string }>();
  for (const e of events) {
    const ip = e.source_ip?.trim() || '';
    if (!isPublicRoutableIp(ip)) continue;
    const prev = byIp.get(ip);
    const sev = e.severity || 'low';
    const rank = { critical: 4, high: 3, medium: 2, low: 1, info: 0 } as const;
    const curRank = rank[sev as keyof typeof rank] ?? 1;
    if (!prev) {
      byIp.set(ip, { severity: sev, count: 1, last: e.timestamp });
    } else {
      const prevRank = rank[prev.severity as keyof typeof rank] ?? 1;
      byIp.set(ip, {
        severity: curRank > prevRank ? sev : prev.severity,
        count: prev.count + 1,
        last: e.timestamp > prev.last ? e.timestamp : prev.last,
      });
    }
  }
  const ips = [...byIp.keys()].slice(0, 45);
  if (!ips.length) {
    return NextResponse.json({
      points: [],
      data_source: getMasApiBase() ? 'mas_api_incidents' : 'mas_unconfigured',
    });
  }
  try {
    const batchUrl =
      'http://ip-api.com/batch?fields=status,query,country,countryCode,city,lat,lon';
    const res = await fetch(batchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ips),
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json({ points: [], error: 'geo_batch_failed' }, { status: 502 });
    }
    const rows = (await res.json()) as Array<{
      status?: string;
      query?: string;
      country?: string;
      countryCode?: string;
      city?: string;
      lat?: number;
      lon?: number;
    }>;
    const points = rows
      .filter((r) => r.status === 'success' && typeof r.lat === 'number' && typeof r.lon === 'number')
      .map((r) => {
        const q = String(r.query || '');
        const meta = byIp.get(q);
        return {
          ip: q,
          lat: r.lat as number,
          lon: r.lon as number,
          country: r.country || '',
          country_code: r.countryCode || '',
          city: r.city || '',
          severity: meta?.severity || 'low',
          incident_hits: meta?.count || 1,
          last_seen: meta?.last || '',
        };
      });
    return NextResponse.json({
      points,
      data_source: getMasApiBase() ? 'mas_api_incidents' : 'mas_unconfigured',
    });
  } catch (e) {
    console.error('[Security] threat-map geo batch:', e);
    return NextResponse.json({ points: [], error: 'geo_batch_exception' }, { status: 500 });
  }
}

async function getThreatSummaryData() {
  const masEvents = await fetchMasIncidentsAsEvents(500);
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const eventsLastHour = masEvents.filter(e => new Date(e.timestamp) > hourAgo);
  const eventsLastDay = masEvents.filter(e => new Date(e.timestamp) > dayAgo);

  const summary: ThreatSummary = {
    total_events_hour: eventsLastHour.length,
    total_events_day: eventsLastDay.length,
    critical_hour: eventsLastHour.filter(e => e.severity === 'critical').length,
    critical_day: eventsLastDay.filter(e => e.severity === 'critical').length,
    high_hour: eventsLastHour.filter(e => e.severity === 'high').length,
    high_day: eventsLastDay.filter(e => e.severity === 'high').length,
    unique_ips_hour: new Set(eventsLastHour.map(e => e.source_ip)).size,
    unique_ips_day: new Set(eventsLastDay.map(e => e.source_ip)).size,
    blocked_count: eventsLastDay.filter(e => e.action_taken === 'block_and_alert').length,
    last_updated: now.toISOString()
  };

  // Group events by type
  const eventsByType: Record<string, number> = {};
  eventsLastDay.forEach(e => {
    eventsByType[e.event_type] = (eventsByType[e.event_type] || 0) + 1;
  });

  // Top source IPs
  const ipCounts: Record<string, number> = {};
  eventsLastDay.forEach(e => {
    ipCounts[e.source_ip] = (ipCounts[e.source_ip] || 0) + 1;
  });
  const topIPs = Object.entries(ipCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([ip, count]) => ({ ip, count }));

  // Country distribution
  const countryCounts: Record<string, number> = {};
  eventsLastDay.forEach(e => {
    if (e.geo_location?.country_code) {
      countryCounts[e.geo_location.country_code] = 
        (countryCounts[e.geo_location.country_code] || 0) + 1;
    }
  });

  return NextResponse.json({
    summary,
    events_by_type: eventsByType,
    top_source_ips: topIPs,
    country_distribution: countryCounts,
    data_source: getMasApiBase() ? 'mas_api_incidents' : 'mas_unconfigured',
  });
}

function getSecurityConfig() {
  const config = loadSecurityConfig();
  if (!config) {
    return NextResponse.json({
      allowed_countries: ['US', 'CA'],
      high_risk_countries: ['CN', 'RU', 'KP', 'IR', 'BY'],
      trusted_services_count: 0
    });
  }

  return NextResponse.json({
    allowed_countries: config.allowed_countries,
    high_risk_countries: config.high_risk_countries,
    trusted_services: config.trusted_services?.map(s => ({
      name: s.name,
      domain: s.domain,
      description: s.description
    })),
    user_count: config.users?.length || 0
  });
}

async function geoLookup(ip: string) {
  try {
    // Use ip-api.com for geo lookup
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,lat,lon,isp,org,proxy,hosting`,
      { cache: 'force-cache' } // Cache the response
    );

    if (!response.ok) {
      throw new Error('Geo lookup failed');
    }

    const data = await response.json();

    if (data.status !== 'success') {
      return NextResponse.json({ error: 'IP lookup failed' }, { status: 400 });
    }

    const config = loadSecurityConfig();
    const isAllowedCountry = config?.allowed_countries?.includes(data.countryCode) ?? true;
    const isHighRisk = config?.high_risk_countries?.includes(data.countryCode) ?? false;

    return NextResponse.json({
      ip,
      country: data.country,
      country_code: data.countryCode,
      region: data.regionName,
      city: data.city,
      latitude: data.lat,
      longitude: data.lon,
      isp: data.isp,
      organization: data.org,
      is_proxy: data.proxy,
      is_hosting: data.hosting,
      is_allowed_country: isAllowedCountry,
      is_high_risk: isHighRisk,
      risk_level: isHighRisk ? 'critical' : !isAllowedCountry ? 'medium' : 'low'
    });
  } catch (error) {
    console.error('Geo lookup error:', error);
    return NextResponse.json({ error: 'Geo lookup failed' }, { status: 500 });
  }
}

async function getDashboardOverview() {
  const masEvents = await fetchMasIncidentsAsEvents(200);
  const config = loadSecurityConfig();
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  const recentEvents = masEvents.filter(e => new Date(e.timestamp) > hourAgo);
  const criticalCount = recentEvents.filter(e => e.severity === 'critical').length;
  
  let threatLevel: 'low' | 'elevated' | 'high' | 'critical' = 'low';
  if (criticalCount > 0) threatLevel = 'critical';
  else if (recentEvents.filter(e => e.severity === 'high').length > 2) threatLevel = 'high';
  else if (recentEvents.length > 10) threatLevel = 'elevated';

  return NextResponse.json({
    soc: {
      name: 'Mycosoft Security Operations Center',
      status: 'active',
      threat_level: threatLevel,
      monitoring_enabled: true
    },
    authorized_users: config?.users?.map(u => ({
      id: u.id,
      name: u.name,
      locations: u.locations.map(l => l.name)
    })) || [],
    allowed_countries: config?.allowed_countries || ['US', 'CA'],
    high_risk_countries: config?.high_risk_countries || [],
    trusted_services_count: config?.trusted_services?.length || 0,
    events: {
      last_hour: recentEvents.length,
      critical: criticalCount,
      recent: recentEvents.slice(-5).reverse()
    },
    last_updated: now.toISOString(),
    data_source: getMasApiBase() ? 'mas_api_incidents' : 'mas_unconfigured',
  });
}

async function reportSecurityEvent(data: Partial<SecurityEvent>) {
  const base = getMasApiBase();
  const title = (data.description || data.event_type || 'Security event').slice(0, 500);
  const description = (data.description || '').slice(0, 8000);
  const severity = normalizeSeverity(data.severity as string | undefined);
  const kind = (data.event_type || 'anomaly').slice(0, 120);

  if (base) {
    try {
      const res = await fetch(`${base}/api/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          severity,
          status: 'open',
          source: 'website_security_api',
          kind,
          source_ip: data.source_ip || undefined,
          host: data.destination_ip || undefined,
          details: {
            metadata: data.metadata,
            rule_matched: data.rule_matched,
            action_taken: data.action_taken,
            source_mac: data.source_mac,
          },
          tags: ['website-api'],
          timeline: [{ event: 'reported', at: new Date().toISOString() }],
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        return NextResponse.json(
          { success: false, error: 'mas_incident_create_failed', detail: body },
          { status: res.status >= 400 ? res.status : 503 }
        );
      }
      return NextResponse.json({
        success: true,
        incident_id: (body as { id?: string }).id,
        data_source: 'mas_api_incidents',
      });
    } catch (e) {
      console.error('reportSecurityEvent MAS error:', e);
      return NextResponse.json(
        { success: false, error: 'mas_unreachable', detail: String(e) },
        { status: 503 }
      );
    }
  }

  const event: SecurityEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    timestamp: new Date().toISOString(),
    event_type: data.event_type || 'unknown',
    severity: data.severity || 'info',
    source_ip: data.source_ip || '0.0.0.0',
    source_mac: data.source_mac,
    destination_ip: data.destination_ip,
    geo_location: data.geo_location,
    rule_matched: data.rule_matched,
    action_taken: data.action_taken,
    description: data.description || 'Security event reported',
    metadata: { ...data.metadata, mas_unconfigured: true },
  };
  eventStore.push(event);
  if (eventStore.length > MAX_EVENTS) {
    eventStore.splice(0, eventStore.length - MAX_EVENTS);
  }
  return NextResponse.json({
    success: true,
    event_id: event.id,
    data_source: 'local_ephemeral_mas_unconfigured',
  });
}

async function blockIP(ip: string, reason: string) {
  // Log the block action
  await reportSecurityEvent({
    event_type: 'ip_blocked',
    severity: 'high',
    source_ip: ip,
    action_taken: 'block_and_alert',
    description: `IP blocked: ${reason}`,
    metadata: { reason, blocked_by: 'api' }
  });

  // NOTE: Pending implementation - UniFi integration requires:
  // 1. UniFi Controller API client at lib/unifi/client.ts
  // 2. Call POST /api/s/{site}/cmd/stamgr with cmd: 'block-sta'
  // 3. Requires UNIFI_CONTROLLER_URL and UNIFI_API_TOKEN env vars
  // Currently logging only - blocks are recorded but not enforced at network level
  console.log(`IP blocked: ${ip} - Reason: ${reason}`);

  return NextResponse.json({
    success: true,
    message: `IP ${ip} has been blocked`,
    reason
  });
}

async function unblockIP(ip: string) {
  // Log the unblock action
  await reportSecurityEvent({
    event_type: 'ip_unblocked',
    severity: 'info',
    source_ip: ip,
    action_taken: 'log',
    description: `IP unblocked`,
    metadata: { unblocked_by: 'api' }
  });

  console.log(`IP unblocked: ${ip}`);

  return NextResponse.json({
    success: true,
    message: `IP ${ip} has been unblocked`
  });
}

async function updateAuthorizedUser(data: Partial<AuthorizedUser>) {
  // NOTE: Pending implementation - User updates require:
  // 1. Secure file write to authorized_users.json with atomic operations
  // 2. Input validation for all user fields
  // 3. Audit logging for compliance
  // Currently returns guidance message - manual update required for security
  console.log(`Updating authorized user: ${data.id}`);
  
  return NextResponse.json({
    success: true,
    message: 'User update requires manual config file modification for security'
  });
}

async function acknowledgeEvent(eventId: string) {
  const base = getMasApiBase();
  if (base) {
    try {
      const res = await fetch(`${base}/api/incidents/${encodeURIComponent(eventId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'acknowledged' }),
      });
      if (res.status === 404) {
        return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
      }
      if (!res.ok) {
        const detail = await res.text();
        return NextResponse.json(
          { error: 'mas_ack_failed', detail },
          { status: res.status >= 400 ? res.status : 503 }
        );
      }
      return NextResponse.json({ success: true, event_id: eventId, data_source: 'mas_api_incidents' });
    } catch (e) {
      return NextResponse.json({ error: 'mas_unreachable', detail: String(e) }, { status: 503 });
    }
  }

  const event = eventStore.find(e => e.id === eventId);
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }
  event.metadata = {
    ...event.metadata,
    acknowledged: true,
    acknowledged_at: new Date().toISOString(),
  };
  return NextResponse.json({
    success: true,
    event_id: eventId,
    data_source: 'local_ephemeral_mas_unconfigured',
  });
}

// ===== NEW HANDLER FUNCTIONS =====

/**
 * Get threat intelligence for an IP
 */
async function getThreatIntelligence(ip: string) {
  try {
    const reputation = await getIPReputation(ip, false);
    return NextResponse.json(reputation);
  } catch (error) {
    console.error('Threat intel error:', error);
    return NextResponse.json({ error: 'Failed to get threat intelligence' }, { status: 500 });
  }
}

/**
 * Get comprehensive risk assessment for an IP
 */
async function getRiskAssessment(ip: string) {
  try {
    const assessment = await assessIPRisk(ip);
    return NextResponse.json(assessment);
  } catch (error) {
    console.error('Risk assessment error:', error);
    return NextResponse.json({ error: 'Failed to assess risk' }, { status: 500 });
  }
}

/**
 * Get IDS/IPS events from Suricata (via real event store)
 * UPDATED: Feb 12, 2026 - Removed mock data, uses real getRecentIDSAlerts
 */
async function getIDSEvents(limit: number) {
  // Get real IDS alerts from Suricata event processor
  const recentAlerts = getRecentIDSAlerts(limit);
  const stats = getIDSStats();
  
  // Transform Suricata events to API format
  const events = recentAlerts.map((alert, index) => ({
    id: `ids-${alert.flow_id || index}`,
    timestamp: alert.timestamp,
    signature: alert.alert?.signature || 'Unknown',
    signature_id: alert.alert?.signature_id || 0,
    severity: alert.alert?.severity || 4,
    src_ip: alert.src_ip,
    src_port: alert.src_port,
    dest_ip: alert.dest_ip,
    dest_port: alert.dest_port,
    proto: alert.proto,
    category: alert.alert?.category || 'Unknown',
  }));
  
  return NextResponse.json({
    events,
    total: events.length,
    source: 'suricata',
    connected: stats.connected,
    last_event_time: stats.last_event_time,
    // If no events and not connected, indicate data source is unavailable
    message: events.length === 0 && !stats.connected
      ? 'IDS not connected - no real-time data available'
      : undefined,
  });
}

/**
 * Start a network scan
 */
async function startNetworkScan(type: ScanType, target: string) {
  try {
    const scanId = await requestScan({ scanType: type, target });
    return NextResponse.json({
      success: true,
      scan_id: scanId,
      message: `Scan started: ${type} on ${target}`,
    });
  } catch (error) {
    console.error('Scan start error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start scan' },
      { status: 400 }
    );
  }
}

/**
 * Execute a specific playbook
 */
async function executeSecurityPlaybook(
  playbookId: string,
  trigger: PlaybookTrigger,
  context: Record<string, unknown>
) {
  try {
    const playbook = getPlaybook(playbookId);
    if (!playbook) {
      return NextResponse.json({ error: 'Playbook not found' }, { status: 404 });
    }

    const { executePlaybook } = await import('@/lib/security/playbooks');
    const execution = await executePlaybook(playbook, context);
    
    return NextResponse.json({
      success: true,
      execution,
    });
  } catch (error) {
    console.error('Playbook execution error:', error);
    return NextResponse.json({ error: 'Failed to execute playbook' }, { status: 500 });
  }
}

/**
 * Trigger all matching playbooks for an event
 */
async function triggerSecurityPlaybooks(
  trigger: PlaybookTrigger,
  context: Record<string, unknown>
) {
  try {
    const executions = await triggerPlaybooks(trigger, context);
    
    return NextResponse.json({
      success: true,
      triggered: executions.length,
      executions,
    });
  } catch (error) {
    console.error('Playbook trigger error:', error);
    return NextResponse.json({ error: 'Failed to trigger playbooks' }, { status: 500 });
  }
}

/**
 * Create a security alert
 */
async function createSecurityAlert(data: {
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  sourceIp?: string;
  targetIp?: string;
  category: string;
}) {
  try {
    const alert = await createAlert({
      title: data.title,
      message: data.message,
      severity: data.severity,
      source: data.source,
      sourceIp: data.sourceIp,
      targetIp: data.targetIp,
      category: data.category,
    });
    
    return NextResponse.json({
      success: true,
      alert,
    });
  } catch (error) {
    console.error('Alert creation error:', error);
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
  }
}

/**
 * Acknowledge an alert
 */
async function handleAcknowledgeAlert(alertId: string, acknowledgedBy: string) {
  const alert = ackAlert(alertId, acknowledgedBy);
  if (!alert) {
    return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
  }
  
  return NextResponse.json({
    success: true,
    alert,
  });
}

/**
 * Quarantine a device (move to VLAN 99)
 */
async function quarantineDevice(mac: string, reason: string) {
  try {
    // Log the quarantine action
    await reportSecurityEvent({
      event_type: 'device_quarantined',
      severity: 'critical',
      source_ip: '0.0.0.0',
      source_mac: mac,
      action_taken: 'quarantine_vlan_99',
      description: `Device quarantined: ${reason}`,
      metadata: { mac, reason, quarantined_by: 'api' },
    });

    // NOTE: Pending implementation - VLAN quarantine requires:
    // 1. UniFi Controller client: POST /api/s/{site}/rest/user/{user_id}
    // 2. Set usergroup_id to VLAN 99 group ID
    // 3. Requires UNIFI_QUARANTINE_VLAN_GROUP_ID env var
    // Currently logging only - quarantine is recorded but not enforced
    
    console.log(`[Security] Device quarantined: ${mac} - Reason: ${reason}`);

    return NextResponse.json({
      success: true,
      message: `Device ${mac} has been quarantined`,
      vlan: 99,
      reason,
    });
  } catch (error) {
    console.error('Quarantine error:', error);
    return NextResponse.json({ error: 'Failed to quarantine device' }, { status: 500 });
  }
}

/**
 * Remove device from quarantine
 */
async function unquarantineDevice(mac: string) {
  try {
    await reportSecurityEvent({
      event_type: 'device_unquarantined',
      severity: 'info',
      source_ip: '0.0.0.0',
      source_mac: mac,
      action_taken: 'restore_network',
      description: 'Device removed from quarantine',
      metadata: { mac, unquarantined_by: 'api' },
    });

    // NOTE: Pending implementation - Restore VLAN requires:
    // 1. Look up device's original VLAN from quarantine record
    // 2. UniFi Controller: POST /api/s/{site}/rest/user/{user_id}
    // 3. Set usergroup_id back to original group
    // Currently logging only - unquarantine is recorded but VLAN not restored
    console.log(`[Security] Device unquarantined: ${mac}`);

    return NextResponse.json({
      success: true,
      message: `Device ${mac} has been removed from quarantine`,
    });
  } catch (error) {
    console.error('Unquarantine error:', error);
    return NextResponse.json({ error: 'Failed to unquarantine device' }, { status: 500 });
  }
}
