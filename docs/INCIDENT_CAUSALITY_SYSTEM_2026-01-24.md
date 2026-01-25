# Incident Causality & Agent-Based Resolution System

**Date:** January 24, 2026  
**Version:** 1.0.0  
**Author:** AI Engineering Team

## Overview

This document describes the comprehensive incident causality prediction and agent-based resolution system implemented for the Mycosoft Security Operations Center (SOC). The system provides real-time cascade predictions, automatic incident resolution, and full agent activity tracking.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Prediction Agent](#prediction-agent)
4. [Resolution Agent](#resolution-agent)
5. [API Endpoints](#api-endpoints)
6. [Frontend Integration](#frontend-integration)
7. [Incident Pattern Library](#incident-pattern-library)
8. [Resolution Playbooks](#resolution-playbooks)
9. [Testing & Verification](#testing--verification)
10. [Usage Examples](#usage-examples)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │ Incident Chain  │  │ Agent Activity  │  │ Causality Viewer    │  │
│  │ Explorer        │  │ Stream          │  │ (Predictions)       │  │
│  └────────┬────────┘  └────────┬────────┘  └──────────┬──────────┘  │
└───────────┼─────────────────────┼─────────────────────┼─────────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API Layer (Next.js)                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │ /chain          │  │ /agents         │  │ /causality          │  │
│  │ - entries       │  │ - status        │  │ - predict           │  │
│  │ - verify        │  │ - activity      │  │ - prevent           │  │
│  │ - stats         │  │ - resolutions   │  │ - relationships     │  │
│  └────────┬────────┘  └────────┬────────┘  └──────────┬──────────┘  │
└───────────┼─────────────────────┼─────────────────────┼─────────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Agent Layer                                  │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐   │
│  │  CascadePredictionAgent     │  │  IncidentResolutionAgent    │   │
│  │  - Pattern detection        │  │  - Playbook execution       │   │
│  │  - Confidence calculation   │  │  - Cascade prevention       │   │
│  │  - Prediction generation    │  │  - Activity logging         │   │
│  └──────────────┬──────────────┘  └──────────────┬──────────────┘   │
└─────────────────┼─────────────────────────────────┼─────────────────┘
                  │                                 │
                  ▼                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Supabase Database                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ cascade_     │  │ agent_       │  │ agent_run_   │               │
│  │ predictions  │  │ resolutions  │  │ log          │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ incidents    │  │ incident_    │  │ agent_       │               │
│  │              │  │ log_chain    │  │ incident_    │               │
│  │              │  │              │  │ activity     │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### New Tables Created

#### 1. `cascade_predictions`
Stores AI-generated predictions for incident cascades.

```sql
CREATE TABLE cascade_predictions (
  id VARCHAR(255) PRIMARY KEY,
  incident_id VARCHAR(255) NOT NULL,
  predicted_by_agent VARCHAR(255) NOT NULL,
  prediction_type VARCHAR(100) NOT NULL,
  potential_incident_type VARCHAR(255) NOT NULL,
  confidence DECIMAL(4,3) NOT NULL,  -- 0.000 to 1.000
  risk_level VARCHAR(20) NOT NULL,    -- critical, high, medium, low
  recommended_action TEXT,
  prediction_basis TEXT,
  status VARCHAR(50) DEFAULT 'active', -- active, prevented, occurred, dismissed, expired
  prevented_by_agent VARCHAR(255),
  prevented_at TIMESTAMPTZ,
  prevention_action TEXT,
  occurred_incident_id VARCHAR(255),
  occurred_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 2. `agent_resolutions`
Tracks when agents fix incidents.

```sql
CREATE TABLE agent_resolutions (
  id VARCHAR(255) PRIMARY KEY,
  incident_id VARCHAR(255) NOT NULL,
  agent_id VARCHAR(255) NOT NULL,
  agent_name VARCHAR(255) NOT NULL,
  resolution_type VARCHAR(100) NOT NULL, -- automatic, semi-automatic, assisted, manual
  action_taken TEXT NOT NULL,
  action_details JSONB DEFAULT '{}'::jsonb,
  success BOOLEAN DEFAULT true,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  cascades_prevented INTEGER DEFAULT 0,
  related_predictions VARCHAR(255)[],
  rollback_available BOOLEAN DEFAULT false,
  rollback_action TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 3. `agent_run_log`
Tracks continuous agent operations.

```sql
CREATE TABLE agent_run_log (
  id VARCHAR(255) PRIMARY KEY,
  agent_id VARCHAR(255) NOT NULL,
  agent_name VARCHAR(255) NOT NULL,
  run_type VARCHAR(100) NOT NULL,      -- scheduled, triggered, continuous, manual
  status VARCHAR(50) NOT NULL,          -- running, completed, failed, interrupted
  incidents_analyzed INTEGER DEFAULT 0,
  predictions_generated INTEGER DEFAULT 0,
  incidents_resolved INTEGER DEFAULT 0,
  cascades_prevented INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT,
  metrics JSONB DEFAULT '{}'::jsonb
);
```

---

## Prediction Agent

**File:** `lib/security/agents/prediction-agent.ts`

### Key Features

1. **Pattern Detection**: Analyzes incident title, description, and category to detect incident types
2. **Confidence Calculation**: Uses severity multipliers and pattern matching for accurate confidence scores
3. **Persistence**: Saves predictions to database for tracking and prevention
4. **Agent Logging**: Tracks all agent runs with metrics

### Severity Multipliers

| Severity | Multiplier |
|----------|------------|
| Critical | 1.25x |
| High | 1.0x |
| Medium | 0.80x |
| Low | 0.65x |
| Info | 0.50x |

### Core Functions

```typescript
// Generate predictions for an incident
generatePredictionsForIncident(incident: Incident, agentName?: string): CascadePrediction[]

// Save predictions to database
savePredictions(predictions: CascadePrediction[]): Promise<CascadePrediction[]>

// Get predictions for an incident
getPredictionsForIncident(incidentId: string): Promise<CascadePrediction[]>

// Mark a prediction as prevented
markPredictionPrevented(predictionId: string, agentId: string, action: string): Promise<boolean>

// Log an agent run
logAgentRun(agentId: string, agentName: string, metrics: RunMetrics): Promise<void>
```

---

## Resolution Agent

**File:** `lib/security/agents/resolution-agent.ts`

### Key Features

1. **Playbook Execution**: Automatically executes resolution playbooks based on incident type
2. **Cascade Prevention**: Marks high-risk predictions as prevented after resolution
3. **Activity Logging**: Logs all resolution actions to the database
4. **Status Updates**: Updates incident status to 'contained' after resolution

### Core Functions

```typescript
// Resolve a single incident
resolveIncident(
  incident: IncidentForResolution,
  agentId?: string,
  agentName?: string
): Promise<{
  success: boolean;
  actionsExecuted: ResolutionAction[];
  cascadesPrevented: number;
  error?: string;
}>

// Resolve multiple pending incidents
resolvePendingIncidents(
  limit?: number,
  agentId?: string,
  agentName?: string
): Promise<{
  processed: number;
  resolved: number;
  cascadesPrevented: number;
}>
```

---

## API Endpoints

### Causality API

**Base URL:** `/api/security/incidents/causality`

#### GET - Fetch Relationships
```
GET /api/security/incidents/causality?incident_id=xxx&action=relationships
```

Response:
```json
{
  "causedBy": [...],
  "causes": [...],
  "prevented": [...]
}
```

#### POST - Generate Predictions
```
POST /api/security/incidents/causality
Content-Type: application/json

{
  "action": "predict",
  "incident_id": "inc-xxx",
  "incident_data": {
    "title": "...",
    "severity": "critical",
    "category": "..."
  }
}
```

Response:
```json
{
  "success": true,
  "incident_id": "inc-xxx",
  "predictions": [
    {
      "id": "pred-xxx",
      "potential_incident_type": "Data Exfiltration",
      "confidence": 0.82,
      "risk_level": "critical",
      "recommended_action": "Block C2 communications",
      "prediction_basis": "Based on malware indicators"
    }
  ],
  "agent": "CascadePredictionAgent",
  "analyzed_at": "2026-01-24T23:48:06.895Z"
}
```

#### POST - Mark Prevention
```
POST /api/security/incidents/causality
Content-Type: application/json

{
  "action": "prevent",
  "prediction_id": "pred-xxx",
  "agent_id": "resolution-agent",
  "prevention_action": "Isolated endpoint and blocked C2"
}
```

### Agents API

**Base URL:** `/api/security/agents`

#### GET - Agent Status
```
GET /api/security/agents?action=status
```

Response:
```json
{
  "totalRuns": 16,
  "successfulRuns": 16,
  "failedRuns": 0,
  "incidentsResolved": 10,
  "activePredictions": 51,
  "cascadesPrevented": 45,
  "agents": [
    {
      "id": "cascade-prediction-agent",
      "name": "CascadePredictionAgent",
      "status": "active",
      "lastRun": "2026-01-24T23:47:05.406+00:00",
      "runsToday": 6
    }
  ]
}
```

#### POST - Run Batch Resolution
```
POST /api/security/agents
Content-Type: application/json

{
  "action": "run_batch_resolution",
  "limit": 10
}
```

#### POST - Simulate Agent Activity
```
POST /api/security/agents
Content-Type: application/json

{
  "action": "simulate_agent_activity",
  "count": 10
}
```

---

## Frontend Integration

### ChainBlock Interface Update

Added `event_data` property to support prediction generation:

```typescript
interface ChainBlock {
  id: string;
  sequence_number: number;
  event_hash: string;
  previous_hash: string;
  event_type: string;
  reporter_name: string;
  reporter_type: string;
  incident_id: string;
  created_at: string;
  event_data?: {
    title?: string;
    severity?: string;
    category?: string;
    description?: string;
    source_ip?: string;
    [key: string]: unknown;
  };
}
```

### BlockDetailPanel Updates

The `BlockDetailPanel` component now:
1. Fetches causality relationships via GET request
2. Fetches predictions via POST request with incident_data
3. Displays predictions with confidence percentages and risk levels
4. Shows prevented cascades with agent attribution

---

## Incident Pattern Library

### 30+ Pattern Categories

| Category | Example Patterns |
|----------|-----------------|
| Network | network, firewall, traffic, packet, router, switch |
| DDoS | ddos, flood, syn, amplification, volumetric |
| Port Scan | port scan, nmap, masscan, reconnaissance |
| Authentication | login, password, credential, mfa, sso, oauth |
| Brute Force | brute force, password spray, credential stuffing |
| Malware | malware, virus, trojan, worm, backdoor |
| Ransomware | ransomware, encryption, ransom, crypto locker |
| APT | apt, advanced persistent, nation state |
| Data Exfiltration | exfiltration, data leak, sensitive data, pii |
| Data Breach | data breach, exposure, disclosure |
| Access Control | access, permission, authorization, rbac |
| Privilege Escalation | privilege escalation, privesc, root access |
| Lateral Movement | lateral movement, pivot, pass the hash |
| Endpoint | endpoint, workstation, laptop, edr |
| Injection | sql injection, command injection, code injection |
| XSS | xss, cross site scripting, reflected xss |
| API | api, rest, graphql, rate limit |
| Cloud | cloud, aws, azure, gcp, s3, kubernetes |
| Misconfiguration | misconfiguration, exposed, public, default credentials |
| Cryptojacking | cryptojacking, mining, cryptocurrency |
| Insider | insider, employee, contractor |
| Physical | physical, badge, tailgating, datacenter |
| IoT | iot, scada, ics, operational technology |
| DNS | dns, domain, dns poisoning, dns hijack |
| Email | email, phishing, spear phishing, bec |
| Certificate | certificate, ssl, tls, expired cert |
| Compliance | compliance, audit, gdpr, hipaa, nist |
| Supply Chain | supply chain, third party, vendor, dependency |
| Zero Day | zero day, 0day, unknown vulnerability |
| Exploit | exploit, cve, vulnerability, buffer overflow |
| Social Engineering | social engineering, pretexting, vishing |

---

## Resolution Playbooks

### 20+ Playbook Types

Each playbook contains automated actions for specific incident types:

| Playbook | Actions |
|----------|---------|
| Network | block_ip, rate_limit, traffic_analysis |
| DDoS | enable_ddos_protection, null_route, scale_resources |
| Authentication | force_mfa, lock_account, session_invalidation |
| Malware | isolate_endpoint, kill_process, quarantine_files |
| Ransomware | emergency_isolate, backup_verify, c2_block |
| Data Exfil | block_egress, dlp_alert, forensic_capture |
| Injection | waf_block, input_sanitize, db_audit |
| Privilege Escalation | revoke_privileges, session_terminate, audit_changes |
| Lateral Movement | segment_network, block_smb, credential_rotation |
| Cloud | revoke_keys, iam_lockdown, resource_snapshot |
| DNS | sinkhole, dnssec_verify, cache_flush |
| Zero Day | virtual_patch, isolate_vulnerable, enhance_monitoring |

---

## Testing & Verification

### Generate Test Incidents

```bash
curl -X POST http://localhost:3010/api/security/incidents/test \
  -H "Content-Type: application/json" \
  -d '{"type":"critical","count":10,"withChain":true,"withResolutions":true}'
```

### Check Agent Status

```bash
curl http://localhost:3010/api/security/agents?action=status
```

### Run Batch Resolution

```bash
curl -X POST http://localhost:3010/api/security/agents \
  -H "Content-Type: application/json" \
  -d '{"action":"run_batch_resolution","limit":5}'
```

### Test Predictions

```bash
curl -X POST http://localhost:3010/api/security/incidents/causality \
  -H "Content-Type: application/json" \
  -d '{"action":"predict","incident_id":"inc-xxx"}'
```

---

## Usage Examples

### 1. View Predictions in UI

1. Navigate to `http://localhost:3010/security/incidents`
2. Click on a block in the "Incident Chain Explorer"
3. Expand "Incident Causality & Cascade Prediction"
4. View predictions with confidence scores

### 2. Trigger Agent Resolution

```javascript
// Run resolution on a specific incident
await fetch('/api/security/agents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'run_resolution',
    incident_id: 'inc-xxx'
  })
});
```

### 3. Get Prediction Statistics

```javascript
const stats = await fetch('/api/security/agents?action=status').then(r => r.json());
console.log('Active predictions:', stats.activePredictions);
console.log('Cascades prevented:', stats.cascadesPrevented);
```

---

## Files Modified/Created

### New Files

| File | Description |
|------|-------------|
| `lib/security/agents/prediction-agent.ts` | Cascade prediction agent with pattern detection |
| `lib/security/agents/resolution-agent.ts` | Incident resolution agent with playbooks |
| `app/api/security/agents/route.ts` | Agent management API |

### Modified Files

| File | Changes |
|------|---------|
| `app/api/security/incidents/causality/route.ts` | Updated to use prediction agent, added incident_data support |
| `app/api/security/incidents/test/route.ts` | Added prediction generation on test incident creation |
| `app/security/incidents/page.tsx` | Updated ChainBlock interface, improved prediction fetching |

### Database Migrations

| Migration | Tables Created |
|-----------|---------------|
| `add_cascade_predictions_and_agent_resolutions` | cascade_predictions, agent_resolutions, agent_run_log |

---

## Metrics & Monitoring

### Key Metrics Tracked

- **Agent Runs**: Total runs, successful, failed
- **Predictions**: Active, prevented, expired
- **Resolutions**: Total resolved, cascades prevented
- **Per-Agent Stats**: Runs today, last run timestamp

### Accessing Metrics

```bash
# Agent status with all metrics
curl http://localhost:3010/api/security/agents?action=status

# Recent agent activity
curl http://localhost:3010/api/security/agents?action=activity&limit=50

# Agent run history
curl http://localhost:3010/api/security/agents?action=runs&limit=100

# Active predictions
curl http://localhost:3010/api/security/agents?action=predictions&status=active
```

---

## Future Enhancements

1. **Continuous Background Agent**: Implement a cron job or edge function for continuous prediction and resolution
2. **Machine Learning Integration**: Train models on historical incident data for improved predictions
3. **Notification System**: Send alerts for high-confidence critical predictions
4. **Rollback Capability**: Implement rollback for automated actions
5. **Custom Playbooks**: Allow users to define custom resolution playbooks
6. **Prediction Accuracy Tracking**: Track prediction accuracy over time

---

## Support

For issues or questions, contact the Security Operations team or open an issue in the repository.

---

*Document Created: January 24, 2026*
*Author: AI Engineering Team*
