---
description: Threat assessment workflow composing OEI Monitoring, CREP Dashboard, FUSARIUM, and SOC Dashboard for end-to-end incident detection, analysis, and response.
---

# Threat Assessment Workflow

## Identity
- **Category**: workflows
- **Access Tier**: AUTHENTICATED
- **Depends On**: defense-oei-monitoring, defense-crep-dashboard, defense-fusarium, defense-soc-dashboard
- **Route**: Multiple routes (workflow spans several tools)
- **Key Components**: Composed from defense-oei-monitoring, defense-crep-dashboard, defense-fusarium, defense-soc-dashboard components

## Success Criteria (Eval)
- [ ] OEI alert is received and visible in the OEI Monitoring dashboard
- [ ] Alert is visualized geographically on the CREP Dashboard map
- [ ] FUSARIUM impact assessment provides threat severity and affected area analysis
- [ ] SOC Dashboard receives escalated security-relevant events with response actions documented

## Navigation Path (Computer Use)
1. Navigate to mycosoft.com and log in (see platform-authentication skill)
2. Open NatureOS and navigate to OEI Monitoring (Defense section)
3. Identify incoming alert (earthquake, wildfire, biosecurity event)
4. Switch to CREP Dashboard for geographic visualization
5. Open FUSARIUM for impact assessment
6. If security-relevant, escalate to SOC Dashboard
7. Document response actions

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| OEI Monitoring dashboard | Main content area | Shows real-time environmental/security alerts |
| Alert feed (scrolling list) | Left panel or main area | Lists incoming alerts with severity, type, timestamp |
| Alert detail panel | Right panel or modal on click | Shows full alert data: location, magnitude, source, trend |
| CREP Dashboard map | Main content area (after navigation) | Geographic view with event overlays |
| Event markers on CREP map | On the map surface | Click to see event details; correlate with other data layers |
| FUSARIUM analysis interface | Main content area (after navigation) | Threat modeling and impact assessment tool |
| Impact assessment panel | FUSARIUM content area | Shows affected area, severity score, cascading effects |
| Threat severity indicator | FUSARIUM panel | Color-coded severity: green/yellow/orange/red/critical |
| SOC Dashboard | Main content area (after navigation) | Security operations center with incident management |
| Incident creation form | SOC Dashboard | Create and document security incidents |
| Response action checklist | SOC incident detail | Track response steps and completion |
| Escalation button | Alert detail or FUSARIUM | Click to escalate to SOC Dashboard |

## Core Actions
### Action 1: Receive and triage OEI alert
**Goal:** Identify and classify an incoming environmental or security alert
1. Open OEI Monitoring from NatureOS sidebar (Defense section)
2. Review the alert feed for new incoming alerts
3. Click on an alert to expand its details
4. Classify the alert type: earthquake, wildfire, biosecurity event, or other
5. Note severity level, location coordinates, and timestamp
6. Determine if the alert warrants further investigation

### Action 2: Visualize on CREP Dashboard
**Goal:** See the geographic context of the threat
1. Navigate to CREP Dashboard (Defense section in sidebar)
2. The map should show the alert location as a highlighted marker
3. Enable relevant data layers (seismic, thermal/wildfire, biosecurity zones)
4. Zoom into the affected area to assess geographic scope
5. Check for nearby infrastructure, population centers, or sensitive sites
6. Note any correlated events in the same region

### Action 3: Assess impact via FUSARIUM
**Goal:** Determine threat severity and potential cascading effects
1. Navigate to FUSARIUM (Defense section in sidebar)
2. Select or import the alert/event for analysis
3. FUSARIUM runs impact modeling -- wait for analysis to complete
4. Review the impact assessment:
   - Affected area (geographic extent)
   - Severity score (1-10 scale with color coding)
   - Cascading effects (secondary risks, chain reactions)
   - Recommended response level
5. Note whether the threat has security implications

### Action 4: Escalate to SOC Dashboard
**Goal:** Create a security incident for security-relevant threats
1. If FUSARIUM assessment indicates security relevance, click "Escalate to SOC"
2. Navigate to SOC Dashboard (Defense section in sidebar)
3. The escalated event appears as a new incident or pre-fills the incident form
4. Complete incident details: classification, priority, assigned team
5. Review the response action checklist generated based on threat type
6. Begin executing response actions and mark them as completed

### Action 5: Document response actions
**Goal:** Create a complete record of the threat assessment and response
1. In the SOC Dashboard incident detail, document all actions taken
2. Attach FUSARIUM impact assessment results
3. Add CREP Dashboard map snapshots showing geographic context
4. Note the timeline: alert received, assessment started, escalation, response initiation
5. Mark the incident status (investigating, responding, resolved, monitoring)
6. Close the incident when the threat is resolved or downgraded

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| OEI alert feed is empty | No active alerts or data feed disconnected | Check OEI connection status; verify date/time filters |
| CREP map does not show the alert location | Alert coordinates not mapped or layer disabled | Manually zoom to coordinates; enable all relevant layers |
| FUSARIUM analysis times out | Complex scenario or backend overloaded | Retry with simplified parameters; break into sub-assessments |
| Escalation to SOC fails | SOC integration not configured or permissions issue | Manually create incident in SOC Dashboard; copy alert details |
| SOC response checklist is empty | No playbook defined for this threat type | Create manual action items; request playbook creation for future events |

## Composability
- **Prerequisite skills**: platform-authentication, defense-oei-monitoring, defense-crep-dashboard
- **Next skills**: workflow-environmental-report (generate post-incident report), defense-security-compliance (ensure compliance with response procedures)

## Computer Use Notes
- This workflow crosses four tools -- each navigation may take 2-5 seconds
- OEI alerts are real-time via WebSocket -- new alerts appear automatically
- FUSARIUM analysis may take 10-60 seconds depending on scenario complexity
- SOC Dashboard incidents are persistent and audited -- all changes are logged
- Escalation creates a link between the original alert and the SOC incident
- Time-sensitive workflow -- prioritize triage speed over thoroughness in initial assessment
- All tools are in the Defense section of the NatureOS sidebar for quick access

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
