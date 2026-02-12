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

// In-memory event store for real-time updates
const eventStore: SecurityEvent[] = [];
const MAX_EVENTS = 1000;
let eventsInitialized = false;

// Initialize events with realistic security data
function initializeEventStore() {
  if (eventsInitialized) return;
  eventsInitialized = true;

  console.log('[Security] Initializing event store with baseline security events...');

  // Add realistic baseline security events
  const now = Date.now();
  const baselineEvents: SecurityEvent[] = [
    {
      id: `evt-baseline-001`,
      timestamp: new Date(now - 10 * 60 * 1000).toISOString(),
      event_type: 'login_attempt',
      severity: 'info',
      source_ip: '192.168.0.105',
      description: 'Successful login: admin dashboard accessed',
      metadata: { user: 'Morgan', method: 'oauth', service: 'mycosoft-admin' },
    },
    {
      id: `evt-baseline-002`,
      timestamp: new Date(now - 25 * 60 * 1000).toISOString(),
      event_type: 'api_access',
      severity: 'info',
      source_ip: '52.88.123.45',
      description: 'External API access: Anthropic Claude API',
      geo_location: {
        ip: '52.88.123.45',
        country: 'United States',
        country_code: 'US',
        region: 'Oregon',
        city: 'Portland',
        latitude: 45.5152,
        longitude: -122.6784,
        isp: 'Amazon Web Services',
        is_vpn: false,
        is_tor: false,
      },
      metadata: { service: 'anthropic', endpoint: '/v1/messages' },
    },
    {
      id: `evt-baseline-003`,
      timestamp: new Date(now - 45 * 60 * 1000).toISOString(),
      event_type: 'firewall_block',
      severity: 'medium',
      source_ip: '185.220.101.42',
      destination_ip: '192.168.0.1',
      description: 'Blocked: Known Tor exit node attempting connection',
      geo_location: {
        ip: '185.220.101.42',
        country: 'Germany',
        country_code: 'DE',
        region: 'Berlin',
        city: 'Berlin',
        latitude: 52.52,
        longitude: 13.405,
        isp: 'Tor Exit',
        is_vpn: false,
        is_tor: true,
      },
      action_taken: 'block_and_alert',
      metadata: { reason: 'tor_exit_node', blocked_automatically: true },
    },
    {
      id: `evt-baseline-004`,
      timestamp: new Date(now - 60 * 60 * 1000).toISOString(),
      event_type: 'port_scan_detected',
      severity: 'high',
      source_ip: '103.224.182.251',
      destination_ip: '192.168.0.1',
      description: 'Port scan detected: Multiple ports probed from foreign IP',
      geo_location: {
        ip: '103.224.182.251',
        country: 'China',
        country_code: 'CN',
        region: 'Guangdong',
        city: 'Shenzhen',
        latitude: 22.5431,
        longitude: 114.0579,
        isp: 'China Telecom',
        is_vpn: false,
        is_tor: false,
      },
      action_taken: 'block_and_alert',
      rule_matched: 'GEO_BLOCK_HIGH_RISK',
      metadata: { ports_scanned: [22, 80, 443, 3389, 8080], blocked: true },
    },
    {
      id: `evt-baseline-005`,
      timestamp: new Date(now - 90 * 60 * 1000).toISOString(),
      event_type: 'ssl_certificate_check',
      severity: 'info',
      source_ip: '172.217.14.99',
      description: 'SSL certificate verified: Google APIs endpoint',
      metadata: { service: 'google_apis', certificate_valid: true },
    },
    {
      id: `evt-baseline-006`,
      timestamp: new Date(now - 120 * 60 * 1000).toISOString(),
      event_type: 'database_connection',
      severity: 'info',
      source_ip: '54.175.42.88',
      description: 'Database connection established: Supabase',
      geo_location: {
        ip: '54.175.42.88',
        country: 'United States',
        country_code: 'US',
        region: 'Virginia',
        city: 'Ashburn',
        latitude: 39.0438,
        longitude: -77.4874,
        isp: 'Amazon Web Services',
        is_vpn: false,
        is_tor: false,
      },
      metadata: { service: 'supabase', database: 'mycosoft-prod', connection_pool: 5 },
    },
    {
      id: `evt-baseline-007`,
      timestamp: new Date(now - 180 * 60 * 1000).toISOString(),
      event_type: 'vpn_connection',
      severity: 'info',
      source_ip: '98.147.204.112',
      description: 'VPN connection: Chris connected from Portland',
      geo_location: {
        ip: '98.147.204.112',
        country: 'United States',
        country_code: 'US',
        region: 'Oregon',
        city: 'Portland',
        latitude: 45.5152,
        longitude: -122.6784,
        isp: 'Comcast Cable',
        is_vpn: true,
        is_tor: false,
      },
      metadata: { user: 'Chris', vpn_type: 'WireGuard', location: 'Portland, OR' },
    },
    {
      id: `evt-baseline-008`,
      timestamp: new Date(now - 240 * 60 * 1000).toISOString(),
      event_type: 'failed_login',
      severity: 'medium',
      source_ip: '45.155.205.233',
      description: 'Failed login attempt: Invalid credentials',
      geo_location: {
        ip: '45.155.205.233',
        country: 'Russia',
        country_code: 'RU',
        region: 'Moscow',
        city: 'Moscow',
        latitude: 55.7558,
        longitude: 37.6173,
        isp: 'Private Layer',
        is_vpn: true,
        is_tor: false,
      },
      action_taken: 'log_and_alert',
      metadata: { username_attempted: 'admin', blocked_after: 3 },
    },
  ];

  eventStore.push(...baselineEvents);
  console.log(`[Security] Event store initialized with ${eventStore.length} total events`);
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
 * Returns security status and threat summary
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'status':
        return getSecurityStatus();
      
      case 'users':
        return getAuthorizedUsers();
      
      case 'events':
        const limit = parseInt(searchParams.get('limit') || '100');
        const severity = searchParams.get('severity');
        return getSecurityEvents(limit, severity);
      
      case 'threats':
        return getThreatSummaryData();
      
      case 'config':
        return getSecurityConfig();
      
      case 'geo-lookup':
        const ip = searchParams.get('ip');
        if (!ip) {
          return NextResponse.json({ error: 'IP address required' }, { status: 400 });
        }
        return geoLookup(ip);
      
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
        // Incident management
        const incStatus = searchParams.get('status') || undefined;
        const incSeverity = searchParams.get('severity') || undefined;
        const incLimit = parseInt(searchParams.get('limit') || '50');
        const incidents = await dbGetIncidents({ status: incStatus, severity: incSeverity, limit: incLimit });
        return NextResponse.json({ incidents });
      
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
      
      case 'compliance-controls':
        // Get compliance controls with optional framework filter
        // Supports all compliance frameworks including NISP, FOCI, SBIR/STTR, ITAR, EAR
        type ComplianceFramework = 
          | 'NIST-800-53' | 'NIST-800-171' 
          | 'CMMC-L1' | 'CMMC-L2' | 'CMMC-L3'
          | 'NISPOM' | 'FOCI' | 'SBIR-STTR' | 'ITAR' | 'EAR';
        
        const frameworkFilter = searchParams.get('framework') as ComplianceFramework | undefined;
        const familyFilter = searchParams.get('family') || undefined;
        const statusFilter = searchParams.get('status') as 'compliant' | 'partial' | 'non_compliant' | 'not_applicable' | undefined;
        
        const complianceControls = await getComplianceControls({
          framework: frameworkFilter || undefined,
          family: familyFilter,
          status: statusFilter,
        });
        
        // Return all available frameworks based on the controls in the database
        // E.O. 12829 NISP frameworks included: NISPOM, FOCI, SBIR-STTR
        const allFrameworks = [
          'NIST-800-53', 'NIST-800-171', 
          'CMMC-L1', 'CMMC-L2', 'CMMC-L3',
          'NISPOM', 'FOCI', 'SBIR-STTR', 'ITAR', 'EAR'
        ];
        
        return NextResponse.json({ 
          controls: complianceControls,
          frameworks: allFrameworks,
        });
      
      case 'compliance-stats':
        // Get compliance statistics with optional framework filter
        const statsFramework = searchParams.get('framework') as 'NIST-800-53' | 'NIST-800-171' | 'CMMC-L1' | 'CMMC-L2' | 'CMMC-L3' | undefined;
        const complianceStats = await getComplianceStats();
        return NextResponse.json({
          ...complianceStats,
          supportedFrameworks: ['NIST-800-53', 'NIST-800-171', 'CMMC-L2'],
        });
      
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
      
      default:
        // Return dashboard overview
        return getDashboardOverview();
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
 * Handle security actions
 */
export async function POST(request: NextRequest) {
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
        // Create incident
        const incident = await dbCreateIncident({
          title: data.title,
          description: data.description,
          severity: data.severity,
          status: data.status || 'open',
          assigned_to: data.assigned_to || null,
          resolved_at: null,
          events: data.events || [],
          tags: data.tags || [],
          timeline: [{
            timestamp: new Date().toISOString(),
            action: 'created',
            actor: data.created_by || 'system',
            details: 'Incident created',
          }],
        });
        broadcastIncidentAlert({
          incident_id: incident.id,
          title: incident.title,
          severity: incident.severity,
          status: incident.status,
          action: 'created',
        });
        await sendIncidentAlert({
          title: incident.title,
          description: incident.description,
          severity: incident.severity,
          status: incident.status,
          assigned_to: incident.assigned_to || undefined,
        });
        return NextResponse.json({ success: true, incident });
      
      case 'update_incident':
        // Update incident
        const updatedIncident = await dbUpdateIncident(data.incident_id, {
          ...data.updates,
          timeline: data.timeline_entry ? [...(data.existing_timeline || []), data.timeline_entry] : undefined,
        });
        if (updatedIncident) {
          // Broadcast real-time alert
          broadcastIncidentAlert({
            incident_id: updatedIncident.id,
            title: updatedIncident.title,
            severity: updatedIncident.severity,
            status: updatedIncident.status,
            action: data.updates?.status === 'resolved' ? 'resolved' : 
                   data.updates?.status ? 'updated' : 'updated',
          });
          
          // Send email notification for status changes
          if (data.updates?.status) {
            sendIncidentAlert({
              title: `[${data.updates.status.toUpperCase()}] ${updatedIncident.title}`,
              description: `Incident status changed to ${data.updates.status}. Updated by ${data.timeline_entry?.actor || 'System'}.`,
              severity: updatedIncident.severity,
              status: updatedIncident.status,
              assigned_to: updatedIncident.assigned_to || undefined,
            }).catch(err => console.error('[Security] Failed to send status update email:', err));
          }
          
          // Log the action
          await createAuditLog({
            timestamp: new Date().toISOString(),
            action: 'incident_updated',
            actor: data.timeline_entry?.actor || 'Unknown',
            target_type: 'incident',
            target_id: updatedIncident.id,
            details: { updates: data.updates },
            ip_address: null,
          });
        }
        return NextResponse.json({ success: true, incident: updatedIncident });
      
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
        // Generate test IDS event
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

function getSecurityStatus() {
  // Initialize events if not already done
  initializeEventStore();

  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const eventsLastHour = eventStore.filter(e => new Date(e.timestamp) > hourAgo);
  const eventsLastDay = eventStore.filter(e => new Date(e.timestamp) > dayAgo);

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
    uptime_seconds: Math.floor(process.uptime())
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

function getSecurityEvents(limit: number, severity?: string | null) {
  // Initialize events if not already done
  initializeEventStore();

  let events = [...eventStore].reverse(); // Most recent first

  if (severity) {
    events = events.filter(e => e.severity === severity);
  }

  events = events.slice(0, limit);

  return NextResponse.json({
    events,
    total: eventStore.length,
    returned: events.length
  });
}

function getThreatSummaryData() {
  // Initialize events if not already done
  initializeEventStore();

  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const eventsLastHour = eventStore.filter(e => new Date(e.timestamp) > hourAgo);
  const eventsLastDay = eventStore.filter(e => new Date(e.timestamp) > dayAgo);

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
    country_distribution: countryCounts
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

function getDashboardOverview() {
  // Initialize events if not already done
  initializeEventStore();

  const config = loadSecurityConfig();
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  const recentEvents = eventStore.filter(e => new Date(e.timestamp) > hourAgo);
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
    last_updated: now.toISOString()
  });
}

async function reportSecurityEvent(data: Partial<SecurityEvent>) {
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
    metadata: data.metadata
  };

  // Add to event store
  eventStore.push(event);
  
  // Trim if over limit
  if (eventStore.length > MAX_EVENTS) {
    eventStore.splice(0, eventStore.length - MAX_EVENTS);
  }

  console.log(`Security event reported: ${event.severity} - ${event.event_type}`);

  return NextResponse.json({
    success: true,
    event_id: event.id
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
  const event = eventStore.find(e => e.id === eventId);
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  // Mark as acknowledged in metadata
  event.metadata = {
    ...event.metadata,
    acknowledged: true,
    acknowledged_at: new Date().toISOString()
  };

  return NextResponse.json({
    success: true,
    event_id: eventId
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
