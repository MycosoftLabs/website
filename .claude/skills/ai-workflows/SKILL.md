---
description: Manage AI workflow automation at mycosoft.com/natureos/workflows — n8n workflow orchestration across local and cloud instances, gateway control plane, platform integrations (Discord, Slack, Notion, etc.), sandbox execution, and MAS repository workflow import.
---

# AI Workflows

## Identity
- **Category**: ai
- **Access Tier**: COMPANY
- **Depends On**: platform-natureos-dashboard
- **Route**: /natureos/workflows
- **Key Components**: app/natureos/workflows/page.tsx, api/natureos/n8n (n8n status API), api/natureos/n8n/workflows-list (known workflows API), api/natureos/n8n/import (workflow import API), api/natureos/gateway (gateway status API)

## Success Criteria (Eval)
- [ ] Workflows page loads with "Workflow Automation" heading, instance tabs (Local localhost:5678 and Cloud mycosoft.app.n8n.cloud) with connection status dots, and three summary cards (Status, Total Workflows, Recent Executions)
- [ ] Gateway Control Plane card displays tool route counts across builtin, sandbox, workflow, and agent categories
- [ ] Platform Integrations card shows 7 connected platforms (Discord, Slack, Signal, WhatsApp, Gmail, Asana, Notion) with status indicators
- [ ] Workflow list displays all workflows from the selected n8n instance with active/inactive badges and last-updated timestamps
- [ ] Available Workflows in MAS Repository section shows importable workflow definitions grouped by category (MYCA, Native, Ops, Speech, Defense, Other)

## Navigation Path (Computer Use)
1. Navigate to mycosoft.com and log in with company-level access
2. Open the NatureOS dashboard at /natureos
3. In the sidebar, expand the appropriate section and click "Workflows", or navigate directly to /natureos/workflows
4. The Workflow Automation page loads with the DashboardShell layout
5. Two instance tabs at the top: Local (localhost:5678) and Cloud (mycosoft.app.n8n.cloud)

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| "Workflow Automation" heading | Top of page in DashboardHeader | Confirms you are on the workflows page |
| Local / Cloud instance tabs with status dots | Top-left, below heading | Switch between n8n instances; green dot = connected, red = disconnected |
| "Refresh" button | Top-right | Force-refresh n8n connection status and workflow data |
| "Import workflows to cloud" button | Top-right (only visible on Cloud tab) | Imports workflow definitions from MAS repository to cloud n8n instance |
| "Open n8n" button with external link icon | Top-right | Opens the selected n8n instance UI in a new tab |
| Status card | First of three summary cards | Shows "Connected" or "Disconnected" with colored indicator |
| Total Workflows card | Second summary card | Total count with active workflows sub-count |
| Recent Executions card | Third summary card | Number of executions in the last hour |
| Gateway Control Plane card with Router icon | Below summary cards | Shows tool route breakdown: Built-in tools, Sandbox tools, Workflow tools, Agent tools |
| Platform Integrations card | Below gateway card | 7 platform tiles (Discord, Slack, Signal, WhatsApp, Gmail, Asana, Notion) with green status dots |
| Sandbox Execution card | Below integrations | Active sandboxes count and WebSocket connections count |
| Import status message | Below sandbox card (conditional) | Shows import results: created, updated, skipped counts |
| Workflows list | Main card below status sections | Each workflow row shows play/pause icon, name, last updated date, and Active/Inactive badge |
| Recent Executions list | Below workflows card | Each execution row shows status icon (checkmark/X/spinner), workflow ID, timestamp, and status badge |
| Available Workflows in MAS Repository | Bottom card (dashed border) | Category stats (6 categories with counts), scrollable list of importable workflows with category badges, import command |

## Core Actions
### Action 1: Monitor n8n workflow status
**Goal:** Check which workflows are running and their recent execution history
1. Navigate to /natureos/workflows
2. Select the instance tab (Local or Cloud) — check the status dot for connectivity
3. View the three summary cards: connection status, total/active workflow counts, recent executions
4. Scroll to the Workflows list to see individual workflows with their active/inactive state
5. Scroll to Recent Executions to see success/error/running status of latest runs
6. Click "Refresh" to update all data

### Action 2: Import workflows from MAS repository to cloud
**Goal:** Deploy workflow definitions from the repository to the cloud n8n instance
1. Switch to the "Cloud" tab
2. Scroll to the bottom to see "Available Workflows in MAS Repository" — review the category breakdown and individual workflow descriptions
3. Click "Import workflows to cloud" in the top-right
4. Wait for the import to complete — a status message appears showing created/updated/skipped counts
5. The workflow list auto-refreshes to show newly imported workflows

### Action 3: Access n8n directly for workflow editing
**Goal:** Open the full n8n visual workflow editor
1. Click "Open n8n" in the top-right to open the selected instance in a new browser tab
2. Local instance opens at http://localhost:5678 (requires local network access)
3. Cloud instance opens at https://mycosoft.app.n8n.cloud
4. Use the n8n editor to create, modify, or debug workflows visually

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Both instance tabs show red dots and "Disconnected" | n8n services not running or network unreachable | For local: ensure n8n is running at localhost:5678; for cloud: check mycosoft.app.n8n.cloud availability |
| Local tab connected but Cloud shows disconnected | Cloud n8n API key not configured or expired | Check environment variable for n8n cloud API credentials |
| "Import workflows to cloud" fails with error message | Cloud n8n API rejected the import or workflows already exist | Read the error message; "skipped" means workflows already imported; check API key permissions |
| Gateway Control Plane shows all zeros | /api/natureos/gateway endpoint unreachable | The gateway service may be down; tool routing still works via fallback defaults (9 builtin, 3 sandbox, 2 workflow, 1 agent) |
| Platform integrations all show green but workflows fail | Integration configured but not authenticated | Open n8n directly to check credential setup for each platform |
| Workflows list empty despite "Connected" status | n8n has no workflows configured yet | Create workflows in n8n UI, or use the import feature to load from MAS repository |
| "Open n8n" link for local instance fails | Not on the local network | localhost:5678 is only accessible from the same machine or network; use Cloud tab for remote access |

## Composability
- **Prerequisite skills**: platform-natureos-dashboard (NatureOS layout and sidebar)
- **Next skills**: ai-studio (workflows feed into MAS agent orchestration), ai-myca-chat (MYCA can trigger workflows), defense-oei-monitoring (data connector workflows)
- **Related**: mas-agent-management (agents can be workflow-triggered), device-telemetry (sensor data workflows)

## Computer Use Notes
- The page auto-refreshes n8n status every 30 seconds via setInterval
- The gateway status is fetched once on mount and does not auto-refresh
- Known workflows list is fetched once from /api/natureos/n8n/workflows-list on mount
- The import action (POST /api/natureos/n8n/import) can take several seconds — the button shows "Importing..." during the operation
- Platform integrations are statically defined in the component (PLATFORM_INTEGRATIONS array) — status indicators reflect availability, not live authentication state
- Workflow categories in the MAS repository: myca (MYCA-related), native (NatureOS native), ops (operations), speech (voice/audio), defense (security), other
- The DashboardShell wrapper provides consistent max-w-7xl container layout
- Sandbox execution stats (active sandboxes, connections) come from the gateway API and reflect real-time WebSocket-based tool execution state

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
