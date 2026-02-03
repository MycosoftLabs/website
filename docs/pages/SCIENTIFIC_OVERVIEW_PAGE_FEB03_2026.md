# Scientific Overview Page Documentation
## February 3, 2026

## Page Information

- **Route**: `/scientific`
- **File**: `app/scientific/page.tsx`
- **Layout**: `app/scientific/layout.tsx`
- **Type**: Server Component with Client Components

## Purpose

The Scientific Overview page serves as the main dashboard for MYCA's autonomous scientific research capabilities. It provides a high-level view of all scientific operations including active experiments, running simulations, lab instruments, and hypotheses.

## Features

### Statistics Cards
- Active Experiments count with running/pending breakdown
- Simulations count with type breakdown
- Lab Instruments count with online/offline status
- Hypotheses count with validation status

### Tabbed Interface
- **Overview**: Combined view of LabMonitor and SimulationPanel
- **Lab**: Full LabMonitor component
- **Simulations**: Full SimulationPanel component
- **Experiments**: ExperimentTracker component
- **Hypotheses**: HypothesisBoard component

## Components Used

| Component | Source | Purpose |
|-----------|--------|---------|
| `LabMonitor` | `@/components/scientific` | Lab instruments status |
| `SimulationPanel` | `@/components/scientific` | Active simulations |
| `ExperimentTracker` | `@/components/scientific` | Experiment progress |
| `HypothesisBoard` | `@/components/scientific` | Hypothesis management |
| `Card` | `@/components/ui/card` | Stat display containers |
| `Tabs` | `@/components/ui/tabs` | Tab navigation |

## Data Flow

```
Page Load →
  Layout renders sidebar →
    Page fetches stats from /api/scientific/stats →
      Components fetch own data via hooks →
        Real-time updates via SWR polling
```

## API Dependencies

| Endpoint | Purpose | Refresh Rate |
|----------|---------|--------------|
| `/api/scientific/lab` | Lab instruments | 5 seconds |
| `/api/scientific/simulation` | Simulations | 3 seconds |
| `/api/scientific/experiments` | Experiments | 5 seconds |
| `/api/scientific/hypotheses` | Hypotheses | On demand |

## MINDEX Integration

The page queries MINDEX for:
- Historical experiment data
- Simulation result archives
- Knowledge graph relationships

## MYCA Integration

The page can interact with MYCA agents for:
- Generating new hypotheses
- Requesting experiment designs
- Automated data analysis

## Error Handling

- Shows cached data when backend unavailable
- Displays "Cached" badge on components
- Graceful fallback to mock data

## Future Enhancements

1. Real-time WebSocket updates
2. Customizable dashboard layout
3. Alert notifications
4. Export functionality
5. Advanced filtering

---

*Documentation created: February 3, 2026*
