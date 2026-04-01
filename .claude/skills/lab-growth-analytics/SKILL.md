---
description: Navigate and interact with the Growth Analytics tool at mycosoft.com for tracking growth rate, biomass, and morphological changes with charts and metrics (COMPANY-only access).
---

# Growth Analytics

## Identity
- **Category**: lab-tools
- **Access Tier**: COMPANY
- **Depends On**: platform-navigation, platform-natureos-dashboard
- **Route**: /natureos/tools/growth-analytics
- **Key Components**: app/natureos/tools/growth-analytics/page.tsx, components/natureos/tool-viewport.tsx

## Success Criteria (Eval)
- [ ] Growth analytics dashboard loads with at least one chart (line, bar, or area chart) showing growth data over time using Recharts
- [ ] A specific organism or experiment is selected and its growth rate, biomass, and morphological change metrics are displayed
- [ ] Date range or time window is adjusted and charts update to reflect the filtered data

## Navigation Path (Computer Use)
1. Navigate to mycosoft.com
2. Log in with a COMPANY-tier account (see platform-authentication skill)
3. Click "NatureOS" in header or navigate to /natureos
4. In sidebar, expand "Apps" or "Tools" section
5. Click "Growth Analytics"
6. Wait for tool viewport to load (you'll see a title bar reading "Growth Analytics")
7. The analytics dashboard will render with charts, metric cards, and filter controls
8. Select an organism/experiment and adjust time ranges to explore growth data

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Tool viewport title bar "Growth Analytics" | Top of content area | Confirms tool is loaded |
| Growth rate line chart (Recharts) | Main content area, top section | Shows growth rate over time — hover for data points |
| Biomass area chart | Main content area, below growth rate | Shows cumulative biomass accumulation |
| Morphological changes timeline | Main content area or side panel | Annotated timeline of structural changes |
| Metric summary cards (growth rate, biomass, health) | Top of dashboard, horizontal row | Quick-glance KPIs with current values and trends |
| Organism/experiment selector dropdown | Top-left of dashboard, above charts | Select which organism or experiment to analyze |
| Date range picker | Top-right of dashboard | Set start and end dates for data display |
| Time window buttons (24h, 7d, 30d, All) | Near date range picker | Quick-select common time windows |
| Chart type toggles (line, bar, area) | Near individual charts | Switch visualization type |
| Export data button | Top-right toolbar | Download data as CSV or PDF report |
| Comparison mode toggle | Toolbar | Overlay multiple organisms/experiments on same chart |
| Legend with color-coded series | Below or beside charts | Click legend items to show/hide series |

## Core Actions
### Action 1: View growth metrics for an organism
**Goal:** Select an organism and review its growth analytics dashboard
1. Locate the organism/experiment selector dropdown at the top of the dashboard
2. Click the dropdown and select an organism (e.g., "Pleurotus ostreatus - Batch 7")
3. The charts will update to show data for the selected organism
4. Review the metric summary cards at the top: current growth rate (mm/day), total biomass (grams), health score
5. Hover over the growth rate line chart to see specific daily values — a tooltip will appear with date and measurement
6. Scroll down to see the biomass area chart and morphological changes timeline

### Action 2: Filter by date range
**Goal:** Narrow the data to a specific time period
1. Locate the time window buttons near the top-right (24h, 7d, 30d, All)
2. Click "7d" to see the last 7 days of data — charts will redraw with the filtered range
3. For a custom range, click the date range picker
4. Select a start date and end date from the calendar widget
5. Click "Apply" — all charts and metrics will update to show only data within that window
6. The metric summary cards will recalculate averages and totals for the selected period

### Action 3: Compare multiple organisms
**Goal:** Overlay growth data from multiple organisms on the same chart for comparison
1. Look for a "Comparison Mode" toggle or "Add Comparison" button in the toolbar
2. Enable comparison mode — a second organism selector will appear
3. Select a second organism from the new dropdown
4. Both organisms' data will render on the same charts with different colors
5. Use the legend below the charts to identify which color corresponds to which organism
6. Click legend items to show/hide individual series
7. Hover over the chart to see side-by-side tooltips comparing values at the same time point

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| "Access Denied" or "Insufficient Permissions" | Account is not COMPANY tier | Log in with a COMPANY-tier account; this tool requires elevated access |
| Charts show "No Data" or empty axes | No data exists for the selected organism/date range | Select a different organism or expand the date range to "All" |
| Charts render but are blank or show a single point | Date range is too narrow | Expand the time window; try "30d" or "All" |
| Recharts library error or broken chart | Component rendering issue | Refresh the page; Recharts components may need re-initialization |
| Metric cards show dashes or "N/A" | Insufficient data to calculate metrics | Ensure the organism has enough data points; try a different selection |

## Composability
- **Prerequisite skills**: platform-navigation, platform-natureos-dashboard
- **Next skills**: lab-petri-dish (generate growth data to analyze), lab-lifecycle-simulator (predict future growth), lab-digital-twin (feed analytics into twin models)

## Computer Use Notes
- Tool viewport shows loading state before content appears — wait for title bar
- State persists via Supabase — selected organism, date range, and chart preferences survive page reload
- Charts are built with Recharts library — interactive tooltips appear on hover, legends are clickable
- COMPANY-only access — ensure the logged-in account has COMPANY tier permissions
- Multiple chart types are available — line charts for trends, area charts for cumulative data, bar charts for discrete comparisons
- Data may be sparse for new organisms — the dashboard handles this gracefully with "No Data" messages

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
