---
description: Navigate Containers at mycosoft.com — Docker container management including viewing running containers, logs, resource usage, and container orchestration.
---

# Containers

## Identity
- **Category**: dev
- **Access Tier**: COMPANY-only
- **Depends On**: platform-authentication, platform-navigation
- **Route**: /natureos/containers
- **Key Components**: Container list, log viewer, resource usage charts, orchestration controls

## Success Criteria (Eval)
- [ ] Containers page loads at /natureos/containers
- [ ] Running containers are listed with name, status, image, uptime
- [ ] Container logs are viewable in real-time
- [ ] Resource usage (CPU, memory, network) is displayed per container
- [ ] Container orchestration actions work (start, stop, restart)

## Navigation Path (Computer Use)
1. Log in with COMPANY-tier credentials
2. Navigate to NatureOS section
3. Click "Containers" or go directly to /natureos/containers
4. View the container management dashboard

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Containers heading | Top of page | Confirms correct page |
| Container list table | Center — rows per running container | Browse containers; click for details |
| Container name column | In table — identifies each container | Identify the target container |
| Status badges | In table — Running/Stopped/Error | Green = running, Red = stopped/error |
| Image column | In table — Docker image name:tag | Verify correct image version |
| Uptime column | In table — time since last start | Check container stability |
| Resource usage charts | Per container or overview panel — CPU, memory, network | Monitor container resource consumption |
| Log viewer | Opens on container selection — scrolling log output | View real-time container logs |
| Action buttons | Per container row — Start/Stop/Restart | Control container lifecycle |
| Overview metrics | Top of page — total containers, running, stopped | Quick health summary |

## Core Actions
### Action 1: View Running Containers
**Goal:** See all containers and their current status
1. Navigate to /natureos/containers
2. Review the container list table
3. Check status badges for each container (Running, Stopped, Error)
4. Note image versions and uptime
5. Review overview metrics (total, running, stopped counts)

### Action 2: View Container Logs
**Goal:** Read real-time log output from a specific container
1. Click on a container row to select it
2. Open the log viewer panel
3. Logs stream in real-time (tail behavior)
4. Use search/filter to find specific log entries
5. Scroll up to view historical log lines
6. Look for error messages or warnings

### Action 3: Monitor Resource Usage
**Goal:** Check CPU, memory, and network consumption
1. Select a container or view the overview panel
2. Review CPU usage chart (percentage over time)
3. Review memory usage chart (MB/GB over time)
4. Review network I/O chart (bytes in/out)
5. Identify containers consuming excessive resources

### Action 4: Manage Container Lifecycle
**Goal:** Start, stop, or restart containers
1. Find the target container in the list
2. Click the appropriate action button:
   - Start — for stopped containers
   - Stop — for running containers
   - Restart — to cycle a running container
3. Confirm the action if prompted
4. Wait for the status badge to update
5. Verify the container is in the expected state

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Access denied / 403 | Not COMPANY-tier | Re-login with COMPANY-level credentials |
| Container list empty | No containers deployed or Docker daemon offline | Check Docker daemon status; verify deployment |
| Logs show "No output" | Container not producing logs or log driver misconfigured | Check container configuration; try stderr stream |
| Resource charts flat at zero | Metrics collection not running | Verify metrics agent is deployed (cAdvisor, Prometheus, etc.) |
| Restart fails with error | Container dependency issue or port conflict | Check error message; resolve dependencies; check port bindings |

## Composability
- **Prerequisite skills**: platform-authentication, platform-navigation
- **Next skills**: dev-cloud-shell, dev-functions, dev-api-gateway

## Computer Use Notes
- Container list is a standard table — click column headers to sort
- Status badges follow Docker conventions: green "Running", grey "Stopped", red "Error/Exited"
- Log viewer auto-scrolls to bottom (tail mode) — scroll up to pause auto-scroll
- Resource usage charts may use sparklines in the table or full charts in a detail panel
- Action buttons (Start/Stop/Restart) may require confirmation dialogs
- Container names may be long — look for truncation with tooltips
- COMPANY-tier access is required — this is a privileged operations interface

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
