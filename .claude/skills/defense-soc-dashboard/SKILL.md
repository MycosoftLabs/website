---
description: Navigate the SOC Dashboard at mycosoft.com — Security Operations Center with network monitoring, incident management, compliance/audit, FCL tracking, and Exostar DoD supply chain integration (AES-256-GCM encrypted).
---

# SOC Dashboard

## Identity
- **Category**: defense
- **Access Tier**: ADMIN-only
- **Depends On**: platform-authentication, platform-navigation
- **Route**: /security
- **Key Components**: SOC dashboard, UniFi network monitor, incident manager, compliance/audit docs, FCL tracker, Exostar integration, tour system
- **Reference**: docs/SECURITY_TECHNICAL_ARCHITECTURE.md

## Success Criteria (Eval)
- [ ] SOC Dashboard loads at /security
- [ ] Security overview displays current threat posture
- [ ] Network Monitor shows UniFi device status
- [ ] Incident Management lists active/resolved incidents
- [ ] Compliance & Audit section shows SSP and POA&M documents
- [ ] FCL Tracking displays key personnel records
- [ ] Exostar Integration panel shows DoD supply chain status (AES-256-GCM encrypted)
- [ ] Tour system available for onboarding new users

## Navigation Path (Computer Use)
1. Log in with ADMIN-tier credentials
2. Navigate to /security
3. The SOC Dashboard landing page shows security overview
4. Use the sidebar or tab navigation to access sub-sections: Network, Incidents, Compliance, FCL, Exostar

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| SOC Dashboard heading | Top of page | Confirms correct security center |
| Security Overview / Threat Posture | Main content area — summary cards/metrics | Review current security status |
| Network Monitor tab/link | Sidebar or top navigation | Click for UniFi network device view |
| Incident Management tab/link | Sidebar or top navigation | Click for incident tracking |
| Compliance & Audit tab/link | Sidebar or top navigation | Click for SSP/POA&M documents |
| FCL Tracking tab/link | Sidebar or top navigation | Click for key personnel management |
| Exostar Integration tab/link | Sidebar or top navigation | Click for DoD supply chain panel |
| Tour button | Top-right or floating button | Click to start onboarding tour |
| Alert/notification badges | On navigation items | Indicates items needing attention |

## Core Actions
### Action 1: Review Security Overview
**Goal:** Understand current security posture at a glance
1. Navigate to /security
2. Review the SOC Dashboard landing page
3. Check threat level indicators and active alert counts
4. Note any critical incidents requiring immediate attention
5. Review recent security events timeline

### Action 2: Monitor Network Devices
**Goal:** Check UniFi network infrastructure health
1. Click Network Monitor tab
2. Review connected UniFi devices (APs, switches, gateways)
3. Check device status (online/offline), firmware versions
4. Review network traffic and anomaly indicators
5. Note any devices showing warnings or errors

### Action 3: Manage Security Incidents
**Goal:** Track and respond to security incidents
1. Click Incident Management tab
2. Review active incidents sorted by severity
3. Click an incident to see details, timeline, and assigned personnel
4. Update incident status (investigating, contained, resolved)
5. Add notes and evidence to incident records

### Action 4: Access Compliance Documents
**Goal:** Review SSP and POA&M compliance documents
1. Click Compliance & Audit tab
2. Browse SSP (System Security Plan) documents
3. Browse POA&M (Plan of Action & Milestones) documents
4. Check document status (draft, approved, expired)
5. Download or view documents as needed

### Action 5: Manage FCL Tracking
**Goal:** Track key personnel for Facility Clearance Level
1. Click FCL Tracking tab
2. Review key personnel list with clearance status
3. Check clearance expiration dates
4. Update personnel records as needed

### Action 6: Check Exostar Integration
**Goal:** Verify DoD supply chain connectivity
1. Click Exostar Integration tab
2. Verify connection status to Exostar platform
3. Confirm AES-256-GCM encryption is active
4. Review DoD SCRM (Supply Chain Risk Management) data
5. Check last sync timestamp and data integrity

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Access denied / 403 | Not ADMIN-tier — elevated privileges required | Request ADMIN access from system administrator |
| Network Monitor shows "No devices" | UniFi controller not connected | Check UniFi controller configuration and API credentials |
| Exostar "Connection Failed" | Exostar API unreachable or credentials expired | Verify Exostar credentials; check network to external services |
| Compliance docs show "Expired" | Documents need renewal | Initiate document review and update cycle |
| Tour not starting | JavaScript error or tour configuration issue | Refresh the page; try a different browser |

## Composability
- **Prerequisite skills**: platform-authentication, platform-navigation
- **Next skills**: defense-security-compliance, defense-fusarium, defense-crep-dashboard

## Computer Use Notes
- ADMIN access is required — this is a privileged security interface
- The SOC Dashboard uses a sidebar navigation pattern for sub-sections
- Exostar integration handles DoD supply chain data with AES-256-GCM encryption — look for encryption status indicators
- The tour system provides a guided walkthrough — useful for first-time visitors
- UniFi network monitor may show a network topology diagram
- Incident severity uses standard levels: Critical, High, Medium, Low, Informational
- Reference docs/SECURITY_TECHNICAL_ARCHITECTURE.md for technical details

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
