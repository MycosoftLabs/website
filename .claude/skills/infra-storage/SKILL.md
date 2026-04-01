---
description: Manage cloud and edge storage systems including Supabase Storage, Redis cache, SQLite local persistence, and PostgreSQL primary data at mycosoft.com/natureos/storage.
---

# Infrastructure Storage

## Identity
- **Category**: infra
- **Access Tier**: COMPANY
- **Depends On**: platform-navigation, platform-natureos-dashboard
- **Route**: /natureos/storage
- **Key Components**: app/natureos/storage/page.tsx, components/natureos/storage-dashboard.tsx, components/natureos/cache-controls.tsx

## Success Criteria (Eval)
- [ ] Storage dashboard renders showing usage metrics for all four storage backends (Supabase Storage, Redis, SQLite, PostgreSQL)
- [ ] File management interface allows browsing and searching stored files in Supabase Storage
- [ ] Cache controls panel displays Redis hit/miss ratios and provides flush/invalidate actions
- [ ] Storage usage bar charts or gauges show current vs. allocated capacity for each backend

## Navigation Path (Computer Use)
1. Navigate to mycosoft.com
2. Log in with COMPANY-tier credentials (see platform-authentication skill)
3. Click "NatureOS" in header or navigate to /natureos
4. In sidebar, expand "Infrastructure" section
5. Click "Storage"
6. Wait for storage dashboard to load — you will see panels for each storage backend
7. Dashboard sections: Overview (usage summary), File Management, Cache Controls, Database Status

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Storage dashboard title bar | Top of content area | Confirms storage tool is loaded |
| Usage overview cards (4 backends) | Top row — one card per backend | Each shows used/total capacity and a usage bar |
| Supabase Storage file browser | Main content area, tab or section | Browse folders, search files, upload/download |
| Redis cache stats panel | Dedicated section or tab | Shows hit rate, miss rate, memory used, key count |
| Cache control buttons (Flush, Invalidate Pattern) | Within Redis panel | Click to manage cache state |
| SQLite local persistence status | Section or card | Shows database size, table count, last sync time |
| PostgreSQL primary data status | Section or card | Shows connection pool, active queries, disk usage |
| Storage type tabs or navigation | Below title bar | Click tabs to switch between storage backend views |

## Core Actions
### Action 1: Review storage usage across all backends
**Goal:** Get an overview of storage consumption and capacity
1. Wait for dashboard to fully load (all four usage cards show numeric values)
2. Review the overview cards: Supabase Storage (file storage), Redis (cache memory), SQLite (local DB size), PostgreSQL (primary DB size)
3. Note any backend approaching capacity (>80% usage shown in yellow/red)
4. Click on a card to drill into detailed metrics for that backend

### Action 2: Manage files in Supabase Storage
**Goal:** Browse, search, upload, or download files
1. Navigate to the File Management section (click "Files" tab if tabbed interface)
2. Use the folder tree on the left to browse storage buckets
3. Use the search bar to find specific files by name or type
4. Click on a file to see metadata (size, type, upload date, URL)
5. Use "Upload" button to add new files; "Download" to retrieve files
6. Use "Delete" to remove files (confirmation dialog will appear)

### Action 3: Control Redis cache
**Goal:** Monitor cache performance and clear stale entries
1. Navigate to the Cache Controls section
2. Review hit/miss ratio — healthy cache shows >90% hit rate
3. Check memory usage against allocated Redis memory
4. To flush entire cache: click "Flush All" button (confirmation required)
5. To invalidate specific keys: enter a pattern in the "Invalidate Pattern" field and click "Apply"
6. Monitor the hit rate after invalidation to ensure cache is rebuilding properly

### Action 4: Check database health
**Goal:** Verify PostgreSQL and SQLite are operating normally
1. Review the PostgreSQL panel: connection pool utilization, active query count, disk usage
2. If connection pool is near max, note for capacity planning
3. Review the SQLite panel: database file size, last sync timestamp
4. Verify SQLite last sync is recent (within expected sync interval)

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| "Access Denied" or 403 error | User lacks COMPANY-tier access | Verify COMPANY credentials |
| Storage usage shows "N/A" for a backend | Backend service is unreachable | Check infra-monitoring for service health alerts |
| File browser shows empty bucket | No files uploaded or wrong bucket selected | Switch buckets using the folder tree; verify bucket name |
| Redis shows 0% hit rate | Cache was recently flushed or app not caching | Wait for cache to warm up; verify application cache configuration |
| PostgreSQL connection pool at 100% | Too many active connections | Check for connection leaks; consider increasing pool size |
| SQLite last sync shows stale timestamp | Edge sync pipeline is down | Check device connectivity via infra-sporebase |

## Composability
- **Prerequisite skills**: platform-navigation, platform-natureos-dashboard, platform-authentication
- **Next skills**: infra-monitoring (correlate storage alerts with system health), infra-sporebase (edge device storage sync)

## Computer Use Notes
- COMPANY-tier access required — will see 403 if not authorized
- File management operations (upload, delete) require confirmation dialogs — look for modal popups
- Cache flush is a destructive operation — temporarily increases latency as cache rebuilds
- PostgreSQL metrics update every 10 seconds; Redis stats update in real-time
- Supabase Storage file browser supports drag-and-drop upload
- Large file uploads show a progress bar — wait for completion before navigating away

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
