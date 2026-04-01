---
description: View and manage MAS agent status, health metrics, and configuration at mycosoft.com/natureos/mas.
---

# MAS Agent Management

## Identity
- **Category**: mas
- **Access Tier**: AUTHENTICATED
- **Depends On**: platform-navigation, platform-natureos-dashboard, platform-authentication
- **Route**: /natureos/mas
- **Key Components**: app/natureos/mas/page.tsx, components/natureos/mas-agent-overview.tsx, components/natureos/agent-detail-panel.tsx, components/natureos/agent-health-metrics.tsx

## Success Criteria (Eval)
- [ ] Agent overview dashboard renders showing agent categories with active/inactive counts
- [ ] Health metrics summary displays error rates and aggregate performance indicators
- [ ] Individual agent drill-down shows CPU, memory, tasks completed/queued, messages/sec, and uptime
- [ ] Agent configuration panel allows viewing current agent parameters

## Navigation Path (Computer Use)
1. Navigate to mycosoft.com
2. Log in if needed (see platform-authentication skill)
3. Click "NatureOS" in header or navigate to /natureos
4. In sidebar, expand "MAS" section
5. Click "Agent Management" or the MAS overview link
6. Wait for agent overview to load -- summary cards and agent table appear
7. Dashboard sections: Category Overview, Agent Table, Health Metrics, Agent Detail

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| MAS overview title bar | Top of content area | Confirms MAS management tool is loaded |
| Category overview cards | Top row | One card per agent category showing active/inactive/error counts |
| Agent table (sortable, filterable) | Main content area | Lists all agents with name, category, status, key metrics |
| Status badges (active/inactive/error) | In agent table rows | Color-coded: green=active, gray=inactive, red=error |
| Health metrics summary panel | Above or beside agent table | Aggregate error rates, average CPU/memory, total messages/sec |
| Search/filter bar | Above agent table | Filter agents by name, category, or status |
| Agent detail panel | Right side or modal on agent click | Shows full metrics for selected agent |
| CPU usage indicator | In agent detail panel | Current CPU utilization percentage |
| Memory usage indicator | In agent detail panel | Current memory utilization |
| Tasks completed counter | In agent detail panel | Total tasks completed since last restart |
| Tasks queued counter | In agent detail panel | Current pending tasks in queue |
| Messages/sec metric | In agent detail panel | Current message throughput |
| Uptime display | In agent detail panel | Time since last restart |
| Configuration tab/section | In agent detail panel | Shows agent configuration parameters |

## Core Actions
### Action 1: Review agent overview by category
**Goal:** Understand the overall health distribution across agent categories
1. Wait for category overview cards to load (each shows numeric counts)
2. Scan cards: core (10 agents), financial (12), mycology (25), research (15), DAO (40), and others
3. Note categories with elevated error counts (red badge numbers)
4. Click on a category card to filter the agent table to that category

### Action 2: Drill into individual agent metrics
**Goal:** Investigate a specific agent's performance and health
1. In the agent table, find the target agent (use search bar or sort by status)
2. Click on the agent row to open the detail panel
3. Review key metrics:
   - CPU: sustained >80% may indicate overload
   - Memory: check for memory leak patterns (steady increase)
   - Tasks completed vs. queued: large queue indicates backlog
   - Messages/sec: compare against baseline for the agent type
   - Uptime: recent restart may indicate a crash
4. Check the configuration tab for current agent parameters

### Action 3: Identify problematic agents
**Goal:** Find agents with errors or degraded performance
1. In the filter bar, select status "Error" to show only errored agents
2. Sort by error rate (descending) to see worst performers first
3. For each errored agent, click to view detail and note the error messages
4. Check if errors are concentrated in a single category (may indicate systemic issue)
5. Cross-reference with infra-monitoring for related system alerts

### Action 4: View agent configuration
**Goal:** Review and understand an agent's current configuration
1. Select an agent from the table
2. In the detail panel, click the "Configuration" tab
3. Review parameters: task limits, message routing rules, resource allocations
4. Note any non-default values that may affect performance
5. Configuration changes require appropriate permissions

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Agent table is empty | MAS backend not responding | Check infra-monitoring for MAS service health |
| Category cards show 0 for all counts | Data fetch failed | Refresh page; check network connectivity |
| Agent detail panel shows stale data | WebSocket disconnected or agent not reporting | Check connection status; verify agent is running |
| High error count across all categories | Systemic issue (network, database, etc.) | Check infra-monitoring and infra-storage for root cause |
| Configuration tab shows "Loading..." indefinitely | Config API endpoint down | Refresh page; try selecting a different agent first |

## Composability
- **Prerequisite skills**: platform-navigation, platform-natureos-dashboard, platform-authentication
- **Next skills**: mas-topology-viewer (visualize agent relationships in 3D), mas-agent-spawn (create new agents), infra-monitoring (system-level health)

## Computer Use Notes
- AUTHENTICATED access required -- any logged-in user can view agent status
- Agent metrics update in real-time via WebSocket -- no manual refresh needed
- Agent table supports column sorting (click header) and multi-criteria filtering
- Detail panel can be pinned open while browsing the agent table
- Agent categories match the 14 categories in the topology viewer
- Some configuration changes may require COMPANY-tier access

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
