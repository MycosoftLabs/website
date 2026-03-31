---
description: Use when navigating or querying the MINDEX cryptographic mycological database at mycosoft.com/natureos/mindex — searching genome records, verifying data provenance, or accessing chain-of-custody audit trails. Requires company login.
---

# MINDEX Database

## Identity
- **Category**: science
- **Access Tier**: COMPANY (requires authenticated Mycosoft employee/contractor account)
- **Depends On**: platform-authentication, platform-navigation, platform-natureos-dashboard
- **Route**: `/natureos/mindex`
- **Key Components**: MINDEX API server (192.168.0.189:8000), blockchain verification layer, genome record viewer, audit trail panel, cross-validation engine

## Success Criteria (Eval)
- [ ] MINDEX dashboard loads showing database statistics (genome records 100k+, species observations 1M+)
- [ ] Search query returns matching records with provenance metadata and chain-of-custody info
- [ ] Blockchain verification badge appears on queried records confirming data integrity
- [ ] Audit trail for a selected record is viewable showing timestamped custody events

## Navigation Path (Computer Use)
1. Open browser to `mycosoft.com` — you see the homepage. If not logged in, you must authenticate first.
2. Click your profile icon or "Sign In" in the top-right — log in with company credentials.
3. Click **NatureOS** in the top navigation bar.
4. Click **MINDEX** — you arrive at the MINDEX landing page showing database overview stats.
5. Alternatively, navigate directly to `mycosoft.com/natureos/mindex` (will redirect to login if unauthenticated).

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| MINDEX dashboard header with "Mycological Data Integrity Index" title and Mycosoft logo | Top of the page | Confirms you are on the correct page |
| Database statistics cards showing counts: "100,000+ Genome Records", "1M+ Species Observations", "Image-Tagged Data", "Location-Tagged Data" | Upper section, arranged as a row of cards with large numbers | Read to understand database scope; no action needed |
| Search bar with placeholder text like "Search genomes, species, traits..." | Center-top area, prominent input field | Click and type your query (species name, genome ID, trait keyword) then press Enter |
| Record type tabs: "Genomes", "Traits", "Observations", "Images" | Below the search bar, horizontal tab row | Click a tab to filter results to that record type |
| Results table with columns: Record ID, Species, Type, Date, Verification Status (green checkmark or warning icon) | Center of page, below search/tabs | Scroll through results; click a row to open the full record detail |
| Blockchain verification badge (green shield icon with checkmark, or red warning triangle) | Inside each record row and on the record detail page | Green shield = data integrity verified; red triangle = integrity issue detected |
| Record detail panel (slides in from right or opens as a new view) showing: full metadata, genome sequence summary, provenance chain, images | Right side or full page after clicking a record | Read details; scroll down for provenance and chain-of-custody |
| Chain-of-custody timeline (vertical timeline with dated entries: "Collected", "Sequenced", "Verified", "Updated") | Inside record detail panel, lower section | Read chronological custody events; click an event for more detail |
| Audit trail button or tab labeled "Audit Trail" or "Provenance" | Inside record detail panel, as a tab or button | Click to expand the full audit log with timestamps, actors, and actions |
| Cross-validation panel showing comparison against external databases | Inside record detail or as a separate tab | Click "Cross-Validate" to check the record against iNaturalist/GBIF/GenBank |
| API documentation link or "API Access" button | Footer or sidebar | Click to view API endpoints (base: 192.168.0.189:8000) |

## Core Actions
### Action 1: Search for Genome Records
**Goal:** Find genomic data for a specific fungal species.
1. Click the search bar at the top of the MINDEX dashboard.
2. Type the species name (e.g., "Amanita muscaria") or a genome accession ID.
3. Press Enter — results appear in the table below.
4. Click the **Genomes** tab to filter to genome records only.
5. Click a result row to open the full genome record detail.

### Action 2: Verify Data Integrity
**Goal:** Confirm a record has not been tampered with.
1. Open any record by clicking its row in the results table.
2. Look for the blockchain verification badge — a green shield icon with a checkmark means verified.
3. If you see a red warning triangle, the record has an integrity concern — read the warning message.
4. Click the badge to see the full verification details: hash, block number, timestamp.

### Action 3: View Chain-of-Custody
**Goal:** Trace the history of a data record from collection to present.
1. Open a record detail panel by clicking a result row.
2. Scroll down to the chain-of-custody timeline section.
3. Read the timeline entries from top (earliest) to bottom (latest): "Collected by [researcher] on [date]", "Sequenced at [lab] on [date]", "Verified on [date]", etc.
4. Click any timeline entry to expand details (who, what, where, when).

### Action 4: Cross-Validate a Record
**Goal:** Check a MINDEX record against external databases.
1. Open a record detail panel.
2. Click the "Cross-Validate" button or tab.
3. The system queries external sources (iNaturalist, GBIF, GenBank) and shows match results.
4. Green checkmarks indicate matching data; yellow warnings indicate discrepancies; red X marks indicate conflicts.

### Action 5: Access the MINDEX API
**Goal:** Programmatically query the database.
1. Click the "API Access" or "API Documentation" link (footer or sidebar).
2. The API base URL is `http://192.168.0.189:8000`.
3. Review available endpoints: `/genomes`, `/traits`, `/observations`, `/verify/{record_id}`.
4. Use your company auth token in the Authorization header for API requests.

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Redirect to login page | Session expired or not authenticated | Log in with company credentials; MINDEX requires COMPANY-tier access |
| "Access Denied" or 403 error | Your account does not have MINDEX permissions | Contact IT to request MINDEX access for your company account |
| Search returns zero results | Query too specific or wrong record type tab selected | Broaden the search term; try the "All" tab instead of a specific type |
| Verification badge shows red warning | Data integrity issue detected in the blockchain audit | Do not treat the record as authoritative; report the issue via the audit trail panel |
| API returns 401 Unauthorized | Missing or expired auth token | Refresh your auth token from the MINDEX dashboard settings |
| Slow loading or timeout on large queries | Database is processing a large result set | Add more specific filters (date range, taxonomy) to narrow the query |

## Composability
- **Prerequisite skills**: platform-authentication (must be logged in with company account), platform-navigation, platform-natureos-dashboard
- **Next skills**: science-species-explorer (to visualize observations on a map), science-genetics-tools (to run genomic analysis on retrieved records), science-genomics-visualization (to visualize genome data from MINDEX)

## Computer Use Notes
- This page requires company authentication — always verify you are logged in before navigating here.
- The API server at 192.168.0.189:8000 is an internal network address; it is only reachable from within the Mycosoft network or VPN.
- Blockchain verification checks may take a few seconds per record — watch for a spinning indicator next to the badge.
- The audit trail can be long for frequently-updated records; use date filters within the audit panel if available.
- Record IDs follow a specific format (e.g., "MX-GEN-000001") — use this format in searches for exact matches.

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
