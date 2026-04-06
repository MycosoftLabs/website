---
description: Monitor system health, API performance, and device telemetry via Prometheus metrics and Grafana dashboards at mycosoft.com/natureos/monitoring.
---

# Infrastructure Monitoring

## Identity
- **Category**: infra
- **Access Tier**: COMPANY
- **Depends On**: platform-navigation, platform-natureos-dashboard
- **Route**: /natureos/monitoring
- **Key Components**: app/natureos/monitoring/page.tsx, components/natureos/monitoring-dashboard.tsx, components/natureos/alert-manager-panel.tsx

## Success Criteria (Eval)
- [ ] Prometheus metrics dashboard renders with live system health gauges (CPU, memory, disk, network)
- [ ] Grafana dashboard panels display API performance graphs (latency, throughput, error rates)
- [ ] Device telemetry aggregation view shows active device count and aggregated sensor readings
- [ ] AlertManager real-time alerts panel is visible and shows current alert state (firing/resolved)

## Navigation Path (Computer Use)
1. Navigate to mycosoft.com
2. Log in with COMPANY-tier credentials (see platform-authentication skill)
3. Click "NatureOS" in header or navigate to /natureos
4. In sidebar, expand "Infrastructure" section
5. Click "Monitoring"
6. Wait for monitoring dashboard to load — you will see multiple metric panels and graphs
7. The dashboard is divided into sections: System Health, API Performance, Device Telemetry, and Alerts

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Monitoring dashboard title bar | Top of content area | Confirms monitoring tool is loaded |
| System health gauges (CPU, Memory, Disk, Network) | Top row of dashboard | Observe current utilization percentages |
| API performance graphs (latency, throughput, error rate) | Middle section, Grafana-embedded panels | Hover over graph lines for exact values; use time range selector to adjust window |
| Device telemetry aggregation panel | Below API performance section | Shows active device count, aggregated sensor averages |
| AlertManager alerts panel | Right side or bottom section | Lists active alerts with severity (critical, warning, info) |
| Time range selector dropdown | Top-right of dashboard | Click to change time window (15m, 1h, 6h, 24h, 7d) |
| Refresh button | Near time range selector | Click to force-refresh all panels |
| Alert severity badges (red/yellow/blue) | In alerts panel next to each alert | Color indicates severity: red=critical, yellow=warning, blue=info |

## Core Actions
### Action 1: Review system health
**Goal:** Check current CPU, memory, disk, and network utilization across the platform
1. Wait for dashboard to load completely (all gauges show numeric values)
2. Observe the System Health section at the top — four gauge widgets show real-time percentages
3. If any gauge is in the red zone (>80%), click on it to drill into a detailed time-series graph
4. Note any sustained high utilization that may indicate capacity issues

### Action 2: Analyze API performance
**Goal:** Identify slow endpoints or elevated error rates
1. Scroll to the API Performance section with Grafana-embedded panels
2. Review the latency graph — look for spikes above the baseline
3. Check the error rate panel — any rate above 1% warrants investigation
4. Use the time range selector (top-right) to zoom into a specific incident window
5. Hover over graph points to see exact timestamps and values

### Action 3: Monitor device telemetry aggregation
**Goal:** Verify that field devices are reporting data correctly
1. Scroll to the Device Telemetry section
2. Check the "Active Devices" counter — compare against expected fleet size
3. Review aggregated sensor readings (temperature, humidity, soil moisture averages)
4. If active device count is lower than expected, check individual device status via infra-sporebase skill

### Action 4: Manage real-time alerts
**Goal:** Review and acknowledge active alerts from AlertManager
1. Locate the AlertManager panel (right side or bottom of dashboard)
2. Active alerts are listed with severity badge, title, and timestamp
3. Click on an alert to expand its details — shows affected service, metric value, and threshold
4. Click "Acknowledge" to silence a known alert
5. Click "View Runbook" if available to see recommended remediation steps

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| "Access Denied" or 403 error | User does not have COMPANY-tier access | Verify login credentials have COMPANY access level |
| Dashboard loads but panels show "No Data" | Prometheus scrape targets may be down | Check if Prometheus is running; try refreshing after 30 seconds |
| Grafana panels show loading spinner indefinitely | Grafana backend connection failed | Refresh the page; if persistent, check infra-storage for database connectivity |
| Alert panel is empty but system seems unhealthy | AlertManager rules may not be configured for the issue | Check Prometheus directly for raw metric values |
| Telemetry count shows 0 active devices | Device ingestion pipeline may be down | Check infra-sporebase for device connectivity status |

## Composability
- **Prerequisite skills**: platform-navigation, platform-natureos-dashboard, platform-authentication
- **Next skills**: infra-storage (investigate storage-related alerts), infra-sporebase (drill into device issues), infra-ground-station (satellite system health)

## Computer Use Notes
- COMPANY-tier access required — will see 403 if not authorized
- Grafana panels are embedded iframes — interactions happen within each panel's frame context
- Prometheus metrics refresh on a 15-second scrape interval; dashboard auto-refreshes every 30 seconds
- AlertManager notifications also route to external channels (Slack, PagerDuty) but the dashboard shows the canonical state
- Time range selector affects all panels simultaneously
- Heavy dashboard — allow 3-5 seconds for all panels to render

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
