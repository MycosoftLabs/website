# Changelog: Incident Causality & Agent Resolution System

**Date:** January 24, 2026  
**Version:** 1.0.0

## [1.0.0] - 2026-01-24

### Added

#### Database Schema
- **`cascade_predictions` table**: Stores AI-generated cascade predictions with confidence scores, risk levels, and prevention tracking
- **`agent_resolutions` table**: Tracks all agent resolution actions with timing, success status, and cascades prevented
- **`agent_run_log` table**: Logs all agent runs with comprehensive metrics

#### Prediction Agent (`lib/security/agents/prediction-agent.ts`)
- **100+ incident pattern types** across 30+ categories:
  - Network, DDoS, Port Scan, Authentication, Brute Force
  - Malware, Ransomware, APT, Rootkit
  - Data Exfiltration, Data Breach, DLP
  - Access Control, Privilege Escalation, Lateral Movement
  - Endpoint, Process, Fileless
  - Injection, XSS, CSRF, SSRF, API
  - Cloud, Misconfiguration, IAM
  - Cryptojacking, Wallet
  - Insider, Sabotage, Fraud
  - Physical, IoT
  - DNS, Email
  - Certificate, Encryption
  - Compliance, Logging
  - Supply Chain, Software Update
  - Zero Day, Exploit
  - Social Engineering, Impersonation

- **Cascade mapping system**: Each pattern type maps to potential cascade incidents with:
  - Base confidence scores
  - Risk levels (critical/high/medium/low)
  - Recommended actions
  - Time to impact estimates

- **Severity multipliers**:
  - Critical: 1.25x confidence
  - High: 1.0x confidence
  - Medium: 0.80x confidence
  - Low: 0.65x confidence
  - Info: 0.50x confidence

- **Persistence functions**:
  - `savePredictions()` - Save to database
  - `getPredictionsForIncident()` - Fetch existing
  - `markPredictionPrevented()` - Update status
  - `logAgentRun()` - Track agent activity

#### Resolution Agent (`lib/security/agents/resolution-agent.ts`)
- **20+ resolution playbooks**:
  - Network: block_ip, rate_limit, traffic_analysis
  - DDoS: enable_ddos_protection, null_route, scale_resources
  - Authentication: force_mfa, lock_account, session_invalidation
  - Malware: isolate_endpoint, kill_process, quarantine_files
  - Ransomware: emergency_isolate, backup_verify, c2_block
  - Data Exfil: block_egress, dlp_alert, forensic_capture
  - Injection: waf_block, input_sanitize, db_audit
  - And more...

- **Automatic cascade prevention**: High-risk predictions are marked as prevented when incidents are resolved

- **Resolution functions**:
  - `resolveIncident()` - Resolve single incident
  - `resolvePendingIncidents()` - Batch resolution

#### API Endpoints

##### `/api/security/incidents/causality`
- **GET**: Fetch causality relationships
- **POST actions**:
  - `predict` - Generate cascade predictions
  - `prevent` - Mark prediction as prevented
  - `create` - Create causality relationship
  - `resolve` - Record agent resolution

##### `/api/security/agents`
- **GET actions**:
  - `status` - Agent statistics and health
  - `activity` - Recent agent activity
  - `runs` - Agent run history
  - `resolutions` - Resolution records
  - `predictions` - Cascade predictions

- **POST actions**:
  - `run_resolution` - Resolve specific incident
  - `run_batch_resolution` - Resolve multiple incidents
  - `run_prediction` - Generate predictions for pending incidents
  - `simulate_agent_activity` - Create test activity data

### Modified

#### `/api/security/incidents/causality/route.ts`
- Integrated with prediction agent
- Added support for `incident_data` in request body
- Generates predictions from chain data when incident not in memory
- Added agent run logging

#### `/api/security/incidents/test/route.ts`
- Added prediction generation on test incident creation
- Imports prediction agent functions
- Logs agent runs for test data generation
- Returns prediction count in response

#### `/app/security/incidents/page.tsx`
- Added `event_data` to `ChainBlock` interface
- Updated `BlockDetailPanel` to fetch predictions with incident data
- Improved error handling and logging for prediction fetching
- Predictions now display with confidence percentages and risk levels

### Technical Notes

- All database tables have RLS disabled for testing (enable with proper policies in production)
- Predictions expire after 24 hours by default
- Agent runs are logged with comprehensive metrics
- Resolution playbooks execute in order based on incident severity

### Dependencies

No new external dependencies added. Uses existing:
- `@supabase/supabase-js` for database operations
- Next.js API routes for endpoints
- React state management for frontend

### Migration

Applied migration: `add_cascade_predictions_and_agent_resolutions`

```sql
-- Creates tables: cascade_predictions, agent_resolutions, agent_run_log
-- Creates indexes for performance
-- Disables RLS for testing
```

---

## Quick Start

### Generate Test Data

```bash
# Create 10 critical incidents with predictions
curl -X POST http://localhost:3010/api/security/incidents/test \
  -H "Content-Type: application/json" \
  -d '{"type":"critical","count":10,"withChain":true,"withResolutions":true}'
```

### Check System Status

```bash
curl http://localhost:3010/api/security/agents?action=status
```

### Run Agent Resolution

```bash
curl -X POST http://localhost:3010/api/security/agents \
  -H "Content-Type: application/json" \
  -d '{"action":"run_batch_resolution","limit":5}'
```

### View in Browser

Navigate to `http://localhost:3010/security/incidents` and click on a block to see predictions.

---

*Document Created: January 24, 2026*
*Author: AI Development Agent*
