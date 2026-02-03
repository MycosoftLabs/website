# Scientific Components Documentation
## February 3, 2026

## Overview

This document provides comprehensive documentation for all scientific dashboard components.

---

## LabMonitor

### Purpose
Displays and controls laboratory instruments connected to MYCA.

### File
`components/scientific/lab-monitor.tsx`

### Props
None (uses hook internally)

### Hook
`useLabInstruments()` from `@/hooks/scientific`

### Features
- Real-time status updates (5s interval)
- Calibration control
- Add instrument dialog
- Live/Cached status indicator

### Usage
```tsx
import { LabMonitor } from '@/components/scientific'

<LabMonitor />
```

### API Calls
- `GET /api/scientific/lab` - List instruments
- `POST /api/scientific/lab/[id]/calibrate` - Calibrate

---

## SimulationPanel

### Purpose
Manages and monitors scientific simulations.

### File
`components/scientific/simulation-panel.tsx`

### Props
None (uses hook internally)

### Hook
`useSimulations()` from `@/hooks/scientific`

### Features
- GPU utilization display
- Queue length indicator
- Start new simulation dialog
- Pause/Resume/Cancel controls
- Progress tracking with ETA

### Usage
```tsx
import { SimulationPanel } from '@/components/scientific'

<SimulationPanel />
```

### Simulation Types
| Type | Description |
|------|-------------|
| `alphafold` | Protein structure prediction |
| `boltzgen` | Protein design |
| `mycelium` | Fungal network simulation |
| `cobrapy` | Metabolic pathway analysis |
| `physics` | General physics simulation |
| `molecular` | Molecular dynamics |

### API Calls
- `GET /api/scientific/simulation` - List simulations
- `POST /api/scientific/simulation` - Start simulation
- `POST /api/scientific/simulation/[id]/[action]` - Control

---

## ExperimentTracker

### Purpose
Tracks closed-loop experiment progress.

### File
`components/scientific/experiment-tracker.tsx`

### Props
None (uses hook internally)

### Hook
`useExperiments()` from `@/hooks/scientific`

### Features
- Step-by-step progress
- Status breakdown (running/pending/completed)
- Create experiment dialog
- Start/Pause/Cancel controls
- Relative timestamps

### Usage
```tsx
import { ExperimentTracker } from '@/components/scientific'

<ExperimentTracker />
```

### Experiment States
| Status | Color | Description |
|--------|-------|-------------|
| `pending` | Gray | Not yet started |
| `running` | Blue (pulse) | Currently executing |
| `completed` | Green | Successfully finished |
| `failed` | Red | Error occurred |

### API Calls
- `GET /api/scientific/experiments` - List experiments
- `POST /api/scientific/experiments` - Create experiment
- `POST /api/scientific/experiments/[id]/[action]` - Control

---

## HypothesisBoard

### Purpose
Manages scientific hypotheses and their validation.

### File
`components/scientific/hypothesis-board.tsx`

### Props
None

### Features
- Hypothesis statements
- Confidence scores
- Related experiments
- Status tracking
- Create hypothesis dialog

### Usage
```tsx
import { HypothesisBoard } from '@/components/scientific'

<HypothesisBoard />
```

### Hypothesis States
| Status | Color | Description |
|--------|-------|-------------|
| `proposed` | Gray | New hypothesis |
| `testing` | Yellow | Under investigation |
| `validated` | Green | Confirmed by evidence |
| `rejected` | Red | Disproven |

### API Calls
- `GET /api/scientific/hypotheses` - List hypotheses
- `POST /api/scientific/hypotheses` - Create hypothesis
- `POST /api/scientific/hypotheses/[id]/test` - Start test

---

## FCIMonitor

### Purpose
Controls FCI (Fungal Computer Interface) sessions.

### File
`components/scientific/fci-monitor.tsx`

### Props
None (uses hook internally)

### Hook
`useFCI()` from `@/hooks/scientific`

### Features
- Session management
- Signal quality indicator
- Duration tracking
- Electrode count display
- Stimulation control
- Recording control

### Usage
```tsx
import { FCIMonitor } from '@/components/scientific'

<FCIMonitor />
```

### Session States
| Status | Color | Description |
|--------|-------|-------------|
| `recording` | Red (pulse) | Active signal capture |
| `stimulating` | Yellow (pulse) | Electrical stimulation |
| `idle` | Gray | Session paused |
| `paused` | Blue | Temporarily stopped |

### API Calls
- `GET /api/bio/fci` - List sessions
- `POST /api/bio/fci` - Start session
- `POST /api/bio/fci/[id]/[action]` - Control session

---

## ElectrodeMap

### Purpose
Visualizes FCI electrode array status.

### File
`components/scientific/electrode-map.tsx`

### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sessionId` | `string?` | - | FCI session ID |
| `rows` | `number` | 8 | Grid rows |
| `cols` | `number` | 8 | Grid columns |

### Hook
`useFCI()` from `@/hooks/scientific`

### Features
- 8x8 electrode grid
- Interactive selection
- Signal intensity colors
- Impedance tooltips
- Active/Inactive indicators

### Usage
```tsx
import { ElectrodeMap } from '@/components/scientific'

<ElectrodeMap rows={8} cols={8} />
```

### Color Coding
| Color | Condition |
|-------|-----------|
| Green | Active, low signal (0-40%) |
| Yellow | Active, medium signal (40-70%) |
| Red | Active, high signal (70-100%) |
| Blue | Selected by user |
| Gray | Inactive electrode |

---

## MyceliumNetworkViz

### Purpose
Visualizes mycelium network growth simulation.

### File
`components/scientific/mycelium-network-viz.tsx`

### Props
None

### Features
- Canvas-based visualization
- Real-time node growth
- Signal propagation colors
- Start/Pause/Reset controls
- Node and edge counts

### Usage
```tsx
import { MyceliumNetworkViz } from '@/components/scientific'

<MyceliumNetworkViz />
```

### Visualization Details
- Nodes colored by signal intensity (green → red)
- Edges show network connections
- Growth probability: 5% per frame
- Max nodes: 100

---

## SafetyMonitor

### Purpose
Displays system safety metrics.

### File
`components/scientific/safety-monitor.tsx`

### Props
None

### Features
- Overall safety status
- Individual metric cards
- Progress indicators
- Color-coded status

### Usage
```tsx
import { SafetyMonitor } from '@/components/scientific'

<SafetyMonitor />
```

### Monitored Metrics
| Metric | Max | Description |
|--------|-----|-------------|
| Biosafety Level | BSL-4 | Current containment level |
| Air Quality Index | 100 | Lab air quality |
| Containment Integrity | 100% | Physical containment |
| Active Experiments | 15 | Concurrent experiments |
| Unreviewed Actions | 50 | Pending approvals |
| System Alignment | 100% | AI alignment score |

---

## Common Patterns

### Loading State
All components display a loading spinner while fetching data:
```tsx
if (isLoading) {
  return <Card><CardContent className="flex items-center justify-center py-8">
    <Loader2 className="h-6 w-6 animate-spin mr-2" />
    Loading...
  </CardContent></Card>
}
```

### Error Handling
Components show cached data with warning badge when backend unavailable:
```tsx
{!isLive && (
  <Badge variant="outline" className="text-yellow-500">
    <AlertCircle className="h-3 w-3 mr-1" /> Cached
  </Badge>
)}
```

### Refresh Control
All components have manual refresh capability:
```tsx
<Button size="sm" variant="ghost" onClick={() => refresh()}>
  <RefreshCw className="h-4 w-4" />
</Button>
```

---

*Documentation created: February 3, 2026*
