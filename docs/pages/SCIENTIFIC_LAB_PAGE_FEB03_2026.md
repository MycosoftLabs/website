# Laboratory Control Page Documentation
## February 3, 2026

## Page Information

- **Route**: `/scientific/lab`
- **File**: `app/scientific/lab/page.tsx`
- **Type**: Server Component

## Purpose

The Laboratory Control page provides comprehensive control and monitoring of all laboratory instruments connected to the MYCA system.

## Features

### Instrument Management
- Real-time instrument status monitoring
- Calibration controls for each instrument
- Add new instruments
- View instrument details

### Protocol Management
- View available lab protocols
- Protocol execution status
- Create new protocols

### Sample Tracking (Planned)
- Sample inventory management
- Chain of custody
- Location tracking

### Consumables (Planned)
- Consumable inventory
- Reorder alerts
- Usage tracking

## Components Used

| Component | Source | Purpose |
|-----------|--------|---------|
| `LabMonitor` | `@/components/scientific` | Main instrument display |
| `Card` | `@/components/ui/card` | Protocol/sample containers |
| `Button` | `@/components/ui/button` | Action controls |

## Data Flow

```
User Action →
  LabMonitor component →
    useLabInstruments hook →
      /api/scientific/lab →
        MAS Orchestrator →
          NatureOS Device Manager →
            Physical Instruments
```

## API Dependencies

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/scientific/lab` | GET | List instruments |
| `/api/scientific/lab` | POST | Add instrument |
| `/api/scientific/lab/[id]/calibrate` | POST | Calibrate instrument |
| `/api/scientific/lab/protocols` | GET | List protocols |

## MINDEX Integration

- Stores calibration history
- Logs instrument usage
- Records protocol executions
- Tracks sample movements

## MYCA Integration

- LabAgent controls instruments
- Automated calibration scheduling
- Protocol execution by agents
- Anomaly detection and alerts

## Supported Instrument Types

| Type | Icon | Capabilities |
|------|------|--------------|
| Incubator | 🌡️ | Temperature, humidity control |
| Pipettor | 💉 | Automated liquid handling |
| Bioreactor | 🧪 | Fermentation monitoring |
| Microscope | 🔬 | Imaging, analysis |
| Sequencer | 🧬 | DNA/RNA sequencing |
| Centrifuge | 🔄 | Sample separation |

## Error States

- **Offline**: Instrument not responding
- **Maintenance**: Scheduled maintenance
- **Busy**: Currently executing task
- **Error**: Fault detected

## Future Enhancements

1. 3D lab layout visualization
2. Automated scheduling
3. Predictive maintenance
4. Remote instrument control
5. Video feed integration

---

*Documentation created: February 3, 2026*
