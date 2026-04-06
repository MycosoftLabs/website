---
description: Navigate OEI Monitoring at mycosoft.com — 13 active data connectors (NWS, OpenSky, AISstream, USGS, SWPC, GBIF, eBird, OpenAQ, OBIS, and more) feeding the event bus via Redis Streams and Supabase.
---

# OEI Monitoring

## Identity
- **Category**: defense
- **Access Tier**: COMPANY-only
- **Depends On**: platform-authentication, platform-navigation
- **Route**: OEI monitoring interface (accessible from defense/CREP admin panels)
- **Key Components**: 13 data connectors, Redis Streams event bus, Supabase entity/observation/event schema

## Success Criteria (Eval)
- [ ] OEI monitoring interface loads showing all 13 data connectors
- [ ] Each connector shows status (active/inactive/error) and last update time
- [ ] Event bus metrics visible (Redis Streams throughput)
- [ ] Entity, observation, and event counts displayed
- [ ] Individual connector details accessible (feed URL, update frequency, data format)

## Navigation Path (Computer Use)
1. Log in with COMPANY-tier credentials
2. Navigate to the OEI monitoring section (from defense or admin panels)
3. View the connector status dashboard
4. Click individual connectors for detailed status

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| OEI Monitoring heading | Top of page | Confirms correct interface |
| Connector status grid | Center — 13 cards or rows | Each shows connector name, status, last update |
| NWS (weather.gov) | Connector card — weather alerts | Check active/inactive status |
| OpenSky | Connector card — aircraft positions | Real-time aviation data feed |
| AISstream | Connector card — vessel positions | Maritime tracking data feed |
| USGS Volcano | Connector card — volcanic activity | Geological hazard data |
| FlightRadar24 | Connector card — commercial flights | Aviation tracking |
| CelesTrak | Connector card — satellite TLE data | Space object tracking |
| SWPC | Connector card — space weather/solar flares | Solar activity monitoring |
| Carbon Mapper | Connector card — methane emissions | Environmental gas detection |
| OpenRailway | Connector card — rail infrastructure | Transportation data |
| GBIF | Connector card — global biodiversity | Species observation data |
| eBird | Connector card — bird observations | Ornithological data |
| OpenAQ | Connector card — air quality | Atmospheric monitoring |
| OBIS | Connector card — ocean biodiversity | Marine species data |
| Event bus metrics | Bottom or sidebar — Redis Streams stats | Throughput, queue depth, error rates |

## Core Actions
### Action 1: Check All Connector Status
**Goal:** Verify all 13 data connectors are operational
1. Navigate to OEI monitoring interface
2. Scan the connector status grid
3. Look for green/active indicators on all 13 connectors
4. Note any connectors showing error or inactive status
5. Check last update timestamps — stale timestamps indicate issues

### Action 2: Inspect Individual Connector
**Goal:** Get detailed status of a specific data feed
1. Click on a connector card (e.g., NWS, OpenSky, GBIF)
2. Review detailed status: feed URL, update frequency, last successful pull
3. Check data format and schema mapping
4. View recent data samples if available
5. Check error logs for failed pulls

### Action 3: Monitor Event Bus Health
**Goal:** Verify Redis Streams and Supabase are processing correctly
1. Locate event bus metrics section
2. Check Redis Streams throughput (messages/second)
3. Verify queue depth is not growing unbounded
4. Check Supabase write success rate
5. Review entity/observation/event table counts

### Action 4: Review Data Schema
**Goal:** Understand the entity, observation, and event data model
1. Navigate to schema documentation section
2. Review entity schema (devices, locations, sources)
3. Review observation schema (sensor readings, species sightings)
4. Review event schema (alerts, incidents, anomalies)
5. Understand how connectors map to the unified schema

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Connector shows "Error" status | API key expired or upstream service down | Check API credentials; verify upstream service status |
| Stale "Last Update" timestamp | Connector polling failed or hung | Restart the connector; check logs for error details |
| Redis Streams queue growing | Consumer not keeping up with producers | Check consumer health; scale processing capacity |
| "0 events" for a connector | New connector not yet configured or feed empty | Verify connector configuration; check feed URL |
| Access denied | Not COMPANY-tier authenticated | Re-login with COMPANY-level credentials |

## Composability
- **Prerequisite skills**: platform-authentication, platform-navigation
- **Next skills**: defense-crep-dashboard, defense-fusarium, defense-soc-dashboard

## Computer Use Notes
- The 13 connectors are typically displayed as a grid of status cards
- Green = active, red = error, grey = inactive — look for colored status indicators
- Last update timestamps should be recent (within minutes for real-time feeds, hours for batch feeds)
- Redis Streams metrics may be in a separate monitoring panel
- Some connectors (OpenSky, AISstream) produce high-volume real-time data
- Others (GBIF, OBIS) are batch-updated on longer intervals
- The event bus architecture: Connectors -> Redis Streams -> Supabase (entity/observation/event tables)

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
