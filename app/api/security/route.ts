/**
 * Security Operations Center API
 * 
 * Provides endpoints for security monitoring, threat detection,
 * and event management.
 * 
 * @version 1.0.1
 */

import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

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
        return getThreatSummary();
      
      case 'config':
        return getSecurityConfig();
      
      case 'geo-lookup':
        const ip = searchParams.get('ip');
        if (!ip) {
          return NextResponse.json({ error: 'IP address required' }, { status: 400 });
        }
        return geoLookup(ip);
      
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

function getThreatSummary(): NextResponse {
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

  // TODO: Integrate with UniFi to actually block the IP
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
  // TODO: Implement user update with proper file writing
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
