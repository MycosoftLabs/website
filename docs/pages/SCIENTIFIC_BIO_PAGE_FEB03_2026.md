# Biological Interfaces Page Documentation
## February 3, 2026

## Page Information

- **Route**: `/scientific/bio`
- **File**: `app/scientific/bio/page.tsx`
- **Type**: Client Component

## Purpose

The Biological Interfaces page provides control and monitoring of the Fungal Computer Interface (FCI), MycoBrain neuromorphic processor, and genomic analysis tools.

## Features

### FCI Control
- Start/stop recording sessions
- Electrode array visualization
- Signal quality monitoring
- Stimulation control

### MycoBrain
- Submit computations
- View queued jobs
- Monitor processing status
- Result visualization

### Signal Analysis
- Real-time waveform display
- Pattern detection
- Anomaly alerts
- Historical playback

### Genomics (Planned)
- DNA sequencing interface
- Genome assembly
- Variant calling
- Phylogenetic analysis

## Components Used

| Component | Source | Purpose |
|-----------|--------|---------|
| `FCIMonitor` | `@/components/scientific` | FCI session control |
| `ElectrodeMap` | `@/components/scientific` | Electrode visualization |
| `Card` | `@/components/ui/card` | Section containers |
| `Tabs` | `@/components/ui/tabs` | Section navigation |
| `Progress` | `@/components/ui/progress` | Signal quality |
| `Badge` | `@/components/ui/badge` | Status indicators |

## Data Flow

### FCI Recording
```
Start Session →
  useFCI hook →
    /api/bio/fci →
      MAS Orchestrator →
        FCI Service →
          Petraeus Device →
            Electrode Array →
              Mycelium Sample
```

### MycoBrain Computation
```
Submit Job →
  /api/bio/mycobrain/compute →
    MAS Orchestrator →
      MycoBrain Service →
        Fungal Network →
          Bio-digital Processing →
            Result Extraction
```

## API Dependencies

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/bio/fci` | GET | List FCI sessions |
| `/api/bio/fci` | POST | Start new session |
| `/api/bio/fci/[id]/[action]` | POST | Control session |
| `/api/bio/fci/[id]/signals` | GET | Get signal data |
| `/api/bio/mycobrain` | GET | MycoBrain status |
| `/api/bio/mycobrain/compute` | POST | Submit computation |

## MINDEX Integration

### Stored Data
- FCI session metadata (`bio.fci_sessions`)
- Electrical signals (`bio.electrical_signals`)
- Stimulation events (`bio.stimulation_events`)
- Computation results

### Queries
- Historical session analysis
- Pattern matching across sessions
- Signal correlation studies

## MYCA Integration

### Agents
- **FCIAgent**: Manages recording sessions
- **MycoBrainAgent**: Handles computation jobs
- **SignalAgent**: Real-time pattern detection

### Automated Tasks
- Anomaly detection and alerting
- Optimal stimulation parameters
- Session scheduling
- Result interpretation

## Electrode Array Specification

- **Configuration**: 8x8 (64 electrodes)
- **Spacing**: 200 μm
- **Impedance Range**: 50-150 kΩ
- **Sample Rate**: 1000 Hz default

## Signal Color Coding

| Color | Signal Level | Meaning |
|-------|-------------|---------|
| Green | 0-40% | Low activity |
| Yellow | 40-70% | Medium activity |
| Red | 70-100% | High activity |
| Gray | N/A | Inactive electrode |

## MycoBrain Computation Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| Graph Solving | Shortest path optimization | Network routing |
| Pattern Recognition | Signal classification | Anomaly detection |
| Analog Compute | Bio-digital computation | Optimization problems |

## Future Enhancements

1. Real-time 3D electrode visualization
2. WebGL signal waveforms
3. CRISPR gene editing interface
4. DNA synthesis workflows
5. Multi-species comparison

---

*Documentation created: February 3, 2026*
