/**
 * Test API for Incident System
 * 
 * Creates test incidents to verify the SSE streaming and agent integration.
 * Supports batch generation of up to 100 incidents with chain entries.
 * 
 * @version 2.0.0
 * @date January 24, 2026
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  initializeSecurityAgents, 
} from '@/lib/security/agent-incident-reporter';
import { createIncident, updateIncident } from '@/lib/security/database';
import { logIncidentEvent, logAgentAction } from '@/lib/security/incident-chain';
import { broadcastIncidentEvent } from '../stream/route';

export const dynamic = 'force-dynamic';

/**
 * POST /api/security/incidents/test
 * Create test incidents for demonstration
 * 
 * Body:
 * - type: 'random' | 'critical' | 'high' | 'mixed' - type of incidents to create
 * - count: number (1-100) - number of incidents to create
 * - withChain: boolean - whether to create chain entries (default: true)
 * - withResolutions: boolean - whether to auto-resolve some incidents (default: true)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      type = 'random', 
      count = 1, 
      withChain = true,
      withResolutions = true,
    } = body;
    
    // Initialize agents
    initializeSecurityAgents();
    
    const created: string[] = [];
    const maxCount = Math.min(count, 100);
    
    // Create incidents in batches
    const batchSize = 10;
    for (let batch = 0; batch < Math.ceil(maxCount / batchSize); batch++) {
      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, maxCount);
      
      const promises = [];
      for (let i = batchStart; i < batchEnd; i++) {
        // Vary the type for 'mixed' mode
        let incidentType = type;
        if (type === 'mixed') {
          const rand = Math.random();
          if (rand < 0.1) incidentType = 'critical';
          else if (rand < 0.3) incidentType = 'high';
          else if (rand < 0.6) incidentType = 'medium';
          else incidentType = 'low';
        }
        
        promises.push(createTestIncident(incidentType, withChain));
      }
      
      const results = await Promise.allSettled(promises);
      
      for (const result of results) {
        if (result.status === 'fulfilled') {
          created.push(result.value.id);
          
          // Broadcast to SSE clients
          broadcastIncidentEvent({
            type: 'incident',
            data: result.value,
          });
        }
      }
      
      // Small delay between batches to prevent overwhelming
      if (batch < Math.ceil(maxCount / batchSize) - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Auto-resolve some incidents if requested
    if (withResolutions && created.length > 5) {
      const toResolve = Math.floor(created.length * 0.3); // Resolve 30%
      const resolvePromises = [];
      
      for (let i = 0; i < toResolve; i++) {
        const randomIndex = Math.floor(Math.random() * created.length);
        const incidentId = created[randomIndex];
        
        const statuses = ['resolved', 'contained', 'investigating'] as const;
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        resolvePromises.push(
          resolveTestIncident(incidentId, status, withChain)
        );
      }
      
      await Promise.allSettled(resolvePromises);
    }
    
    return NextResponse.json({
      success: true,
      message: `Created ${created.length} test incident(s)`,
      incident_ids: created,
      with_chain: withChain,
      with_resolutions: withResolutions,
    });
  } catch (error) {
    console.error('[Test API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create test incident' },
      { status: 500 }
    );
  }
}

async function resolveTestIncident(
  incidentId: string, 
  status: 'resolved' | 'contained' | 'investigating',
  withChain: boolean
) {
  const agents = [
    { id: 'incident-response', name: 'Incident Response Agent', category: 'security' as const },
    { id: 'guardian', name: 'System Guardian', category: 'security' as const },
    { id: 'soc-analyst', name: 'SOC Analyst', category: 'security' as const },
  ];
  
  const agent = agents[Math.floor(Math.random() * agents.length)];
  
  try {
    // Update incident
    await updateIncident(incidentId, {
      status,
      resolved_at: status === 'resolved' ? new Date().toISOString() : null,
    });
    
    if (withChain) {
      // Log to chain
      await logIncidentEvent({
        incident_id: incidentId,
        event_type: `status_${status}`,
        event_data: {
          old_status: 'open',
          new_status: status,
          test: true,
        },
        reporter_type: 'agent',
        reporter_id: agent.id,
        reporter_name: agent.name,
      });
      
      // Log agent activity
      await logAgentAction({
        agent_id: agent.id,
        agent_name: agent.name,
        agent_category: agent.category,
        incident_id: incidentId,
        action_type: status === 'resolved' ? 'resolved' : 'updated',
        action_data: { new_status: status, test: true },
        severity: 'medium',
      });
    }
  } catch (error) {
    console.error(`[Test API] Failed to resolve incident ${incidentId}:`, error);
  }
}

async function createTestIncident(type: string, withChain: boolean = true) {
  const severities = ['low', 'medium', 'high', 'critical'] as const;
  const categories = [
    'intrusion', 'malware', 'anomaly', 'policy_violation', 
    'unauthorized_access', 'data_breach', 'ddos', 'phishing',
    'insider_threat', 'crypto_mining', 'ransomware', 'apt'
  ] as const;
  
  const agents = [
    { id: 'watchdog', name: 'Threat Watchdog', category: 'security' as const },
    { id: 'hunter', name: 'Threat Hunter', category: 'security' as const },
    { id: 'guardian', name: 'System Guardian', category: 'security' as const },
    { id: 'network-sentinel', name: 'Network Sentinel', category: 'infrastructure' as const },
    { id: 'log-analyzer', name: 'Log Analyzer', category: 'monitoring' as const },
    { id: 'behavior-detector', name: 'Behavior Detector', category: 'security' as const },
    { id: 'file-integrity', name: 'File Integrity Monitor', category: 'security' as const },
    { id: 'endpoint-agent', name: 'Endpoint Protection Agent', category: 'security' as const },
  ];
  
  const sources = [
    '192.168.1.', '10.0.0.', '172.16.', '203.0.113.',
    '198.51.100.', '185.220.', '45.33.', '91.134.',
  ];
  
  const criticalTitles = [
    'CRITICAL: Active ransomware encryption detected',
    'CRITICAL: Root access compromised on production server',
    'CRITICAL: Data exfiltration in progress',
    'CRITICAL: APT group indicators detected',
    'CRITICAL: Zero-day exploit attempt detected',
    'CRITICAL: Unauthorized admin account created',
    'CRITICAL: Database breach detected',
    'CRITICAL: Supply chain attack indicators',
  ];
  
  const highTitles = [
    'Multiple failed login attempts from unusual location',
    'Suspicious outbound traffic to known C2 server',
    'Privilege escalation attempt detected',
    'Malware signature matched in memory scan',
    'Lateral movement detected in network',
    'Credential stuffing attack in progress',
    'SQL injection attempt blocked',
    'Suspicious PowerShell execution',
  ];
  
  const mediumTitles = [
    'Port scan detected from external IP',
    'Failed authentication threshold exceeded',
    'Unusual file access pattern detected',
    'Configuration change without approval',
    'Outdated software vulnerability detected',
    'Suspicious DNS queries observed',
    'Abnormal process behavior detected',
    'Network traffic anomaly detected',
  ];
  
  const lowTitles = [
    'SSL certificate expiring soon',
    'Minor policy violation detected',
    'Informational security scan completed',
    'Routine security audit finding',
    'Low-priority vulnerability identified',
    'Security patch available for review',
    'User activity logging enabled',
    'Firewall rule update recommended',
  ];
  
  let severity: typeof severities[number];
  let titles: string[];
  
  switch (type) {
    case 'critical':
      severity = 'critical';
      titles = criticalTitles;
      break;
    case 'high':
      severity = 'high';
      titles = highTitles;
      break;
    case 'medium':
      severity = 'medium';
      titles = mediumTitles;
      break;
    case 'low':
      severity = 'low';
      titles = lowTitles;
      break;
    default:
      severity = severities[Math.floor(Math.random() * severities.length)];
      titles = severity === 'critical' ? criticalTitles :
               severity === 'high' ? highTitles :
               severity === 'medium' ? mediumTitles : lowTitles;
  }
    
  const category = categories[Math.floor(Math.random() * categories.length)];
  const agent = agents[Math.floor(Math.random() * agents.length)];
  const title = titles[Math.floor(Math.random() * titles.length)];
  const sourceIP = sources[Math.floor(Math.random() * sources.length)] + 
                   Math.floor(Math.random() * 255);
  
  // Create incident
  const incident = await createIncident({
    title,
    description: `${agent.name} detected ${category.replace('_', ' ')} activity from ${sourceIP}. ` +
                 `Severity: ${severity.toUpperCase()}. Category: ${category}. ` +
                 `Automated analysis indicates potential ${category} behavior patterns.`,
    severity,
    status: 'open',
    assigned_to: null,
    resolved_at: null,
    events: [],
    tags: [category, `agent:${agent.id}`, 'automated', `source:${sourceIP.split('.').slice(0, 2).join('.')}`],
    timeline: [{
      timestamp: new Date().toISOString(),
      action: 'detected',
      actor: agent.name,
      details: `Incident automatically detected by ${agent.name} monitoring system`,
    }],
  });
  
  if (withChain) {
    // Log to chain
    await logIncidentEvent({
      incident_id: incident.id,
      event_type: `created_${severity}`,
      event_data: {
        title,
        severity,
        category,
        source_ip: sourceIP,
        automated: true,
      },
      reporter_type: 'agent',
      reporter_id: agent.id,
      reporter_name: agent.name,
    });
    
    // Log agent activity
    await logAgentAction({
      agent_id: agent.id,
      agent_name: agent.name,
      agent_category: agent.category,
      incident_id: incident.id,
      action_type: 'detected',
      action_data: { category, source_ip: sourceIP },
      severity,
    });
  }
  
  return incident;
}

/**
 * GET /api/security/incidents/test
 * Get test API status and usage information
 */
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    description: 'Test API for generating incidents with chain entries',
    endpoints: {
      create: 'POST /api/security/incidents/test',
      stream: 'GET /api/security/incidents/stream',
      incidents: 'GET /api/security/incidents',
      chain: 'GET /api/security/incidents/chain',
    },
    usage: {
      method: 'POST',
      body: {
        type: 'random | critical | high | medium | low | mixed',
        count: 'number (1-100)',
        withChain: 'boolean (default: true) - create chain entries',
        withResolutions: 'boolean (default: true) - auto-resolve ~30% of incidents',
      },
      examples: [
        { description: 'Create 50 mixed incidents', body: { type: 'mixed', count: 50 } },
        { description: 'Create 10 critical incidents', body: { type: 'critical', count: 10 } },
        { description: 'Quick test', body: { type: 'random', count: 5 } },
      ],
    },
    test_types: ['random', 'critical', 'high', 'medium', 'low', 'mixed'],
    max_count: 100,
  });
}
