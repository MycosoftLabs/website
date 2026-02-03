# MYCA Scientific Dashboard Integration Plan
## February 3, 2026

## Executive Summary

This document outlines the comprehensive plan to integrate the Scientific Dashboard frontend with the MYCA backend services, MINDEX database, and multi-agent system.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (Next.js Website)                          │
│                         localhost:3010 / mycosoft.com                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  Pages                    │  Components              │  Hooks/Services       │
│  - /scientific            │  - LabMonitor            │  - useNatureOS        │
│  - /scientific/lab        │  - SimulationPanel       │  - useSimulation      │
│  - /scientific/simulation │  - ExperimentTracker     │  - useBio             │
│  - /scientific/experiments│  - HypothesisBoard       │  - useMemory          │
│  - /scientific/bio        │  - FCIMonitor            │  - useMYCA            │
│  - /scientific/memory     │  - ElectrodeMap          │  - mycaApiService     │
│                           │  - MyceliumNetworkViz    │  - mindexService      │
│                           │  - SafetyMonitor         │                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ REST API / WebSocket
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      WEBSITE API ROUTES (Next.js API)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  /api/scientific/lab        → MAS Orchestrator                               │
│  /api/scientific/simulation → MAS Orchestrator → Simulation Services         │
│  /api/scientific/experiments→ MAS Orchestrator → Experiment Loop             │
│  /api/scientific/hypotheses → MAS Orchestrator → Hypothesis Agent            │
│  /api/bio/fci               → MAS Orchestrator → FCI Service                 │
│  /api/bio/mycobrain         → MAS Orchestrator → MycoBrain Service           │
│  /api/natureos/devices      → MAS Orchestrator → NatureOS Device Manager     │
│  /api/natureos/telemetry    → MAS Orchestrator → NatureOS Telemetry          │
│  /api/memory/*              → MAS Orchestrator → Memory System               │
│  /api/mindex/*              → MINDEX Database API                            │
│  /api/myca/*                → MYCA Agent Orchestrator                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MAS ORCHESTRATOR (192.168.0.188:8001)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Core Services:                                                              │
│  - mycosoft_mas/core/orchestrator.py                                         │
│  - mycosoft_mas/core/myca_workflow_orchestrator.py                           │
│  - mycosoft_mas/core/prompt_manager.py                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  NatureOS:                   │  Scientific:            │  Bio:               │
│  - natureos/platform.py      │  - simulation/          │  - bio/fci.py       │
│  - natureos/device_manager   │    protein_design.py    │  - bio/mycobrain.py │
│  - natureos/telemetry.py     │  - simulation/mycelium  │  - bio/electrode    │
│  - natureos/signal_processor │  - feedback/exp_loop    │  - bio/signal       │
├─────────────────────────────────────────────────────────────────────────────┤
│  Memory:                     │  Safety:                │  Agents:            │
│  - memory/short_term.py      │  - safety/guardian.py   │  - agents/v2/       │
│  - memory/long_term.py       │  - safety/alignment.py  │    scientific_agents│
│  - memory/vector_memory.py   │  - safety/biosafety.py  │    lab_agents       │
│  - memory/graph_memory.py    │  - safety/sandboxing    │    simulation_agents│
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MINDEX DATABASE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  PostgreSQL with pgvector extension                                          │
│  Schemas:                                                                    │
│  - natureos.* (devices, telemetry, commands, events)                         │
│  - bio.* (fci_sessions, electrical_signals, stimulation_events)              │
│  - simulation.* (runs, hypotheses)                                           │
│  - memory.* (conversations, facts, user_profiles)                            │
│  - mindex.* (embeddings, knowledge_edges)                                    │
│  - ledger.* (blocks, entries, ip_nfts)                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Integration Tasks

### Phase 1: API Routes (Priority: HIGH)

Create Next.js API routes that proxy to MAS Orchestrator.

| API Route | MAS Endpoint | Purpose |
|-----------|--------------|---------|
| `/api/scientific/lab/instruments` | `/lab/instruments` | Get lab instruments |
| `/api/scientific/lab/protocols` | `/lab/protocols` | Get/create protocols |
| `/api/scientific/simulation` | `/simulation/jobs` | Simulation CRUD |
| `/api/scientific/experiments` | `/experiments` | Experiment CRUD |
| `/api/scientific/hypotheses` | `/hypotheses` | Hypothesis CRUD |
| `/api/bio/fci/sessions` | `/bio/fci/sessions` | FCI session CRUD |
| `/api/bio/fci/[id]/signals` | `/bio/fci/{id}/signals` | Get FCI signals |
| `/api/bio/mycobrain/compute` | `/bio/mycobrain/compute` | Submit computation |
| `/api/natureos/devices` | `/natureos/devices` | Device CRUD |
| `/api/natureos/telemetry` | `/natureos/telemetry` | Telemetry data |
| `/api/memory/conversations` | `/memory/conversations` | Conversation history |
| `/api/memory/facts` | `/memory/facts` | Fact storage |
| `/api/mindex/query` | `/mindex/query` | MINDEX queries |
| `/api/myca/agents` | `/myca/agents` | Agent status |
| `/api/myca/chat` | `/myca/chat` | Agent communication |

### Phase 2: Service Layer (Priority: HIGH)

Create TypeScript service classes for API communication.

```typescript
// lib/services/mas-api.ts
export class MASApiService {
  baseUrl = process.env.NEXT_PUBLIC_MAS_URL || 'http://192.168.0.188:8001'
  
  async getLabInstruments(): Promise<Instrument[]>
  async getSimulations(): Promise<Simulation[]>
  async startSimulation(config: SimulationConfig): Promise<SimulationJob>
  async getExperiments(): Promise<Experiment[]>
  async createExperiment(data: ExperimentCreate): Promise<Experiment>
  async getFCISessions(): Promise<FCISession[]>
  async getDevices(): Promise<Device[]>
  async getTelemetry(deviceId: string): Promise<TelemetryPoint[]>
  // ... more methods
}

// lib/services/mindex-api.ts
export class MINDEXApiService {
  async query(sql: string): Promise<QueryResult>
  async getEmbeddings(ids: string[]): Promise<Embedding[]>
  async searchSimilar(vector: number[], limit: number): Promise<SearchResult[]>
  async getKnowledgeGraph(nodeId: string): Promise<GraphNode>
}

// lib/services/myca-api.ts  
export class MYCAApiService {
  async getAgents(): Promise<Agent[]>
  async chat(message: string, context?: object): Promise<ChatResponse>
  async executeTask(taskType: string, params: object): Promise<TaskResult>
}
```

### Phase 3: React Hooks (Priority: HIGH)

Create custom hooks for data fetching with SWR/React Query.

```typescript
// hooks/useLabInstruments.ts
export function useLabInstruments() {
  return useSWR('/api/scientific/lab/instruments', fetcher, {
    refreshInterval: 5000, // Real-time updates
  })
}

// hooks/useSimulations.ts
export function useSimulations() {
  return useSWR('/api/scientific/simulation', fetcher, {
    refreshInterval: 3000,
  })
}

// hooks/useFCISessions.ts
export function useFCISessions() {
  return useSWR('/api/bio/fci/sessions', fetcher, {
    refreshInterval: 2000, // Fast refresh for live data
  })
}
```

### Phase 4: Component Updates (Priority: MEDIUM)

Update each component to use real data.

| Component | Data Source | Real-time? |
|-----------|-------------|------------|
| LabMonitor | `/api/scientific/lab/instruments` | Yes (5s) |
| SimulationPanel | `/api/scientific/simulation` | Yes (3s) |
| ExperimentTracker | `/api/scientific/experiments` | Yes (5s) |
| HypothesisBoard | `/api/scientific/hypotheses` | No |
| FCIMonitor | `/api/bio/fci/sessions` | Yes (2s) |
| ElectrodeMap | `/api/bio/fci/{id}/electrodes` | Yes (1s) |
| MyceliumNetworkViz | `/api/simulation/mycelium/{id}/state` | Yes (100ms) |
| SafetyMonitor | `/api/safety/status` | Yes (5s) |

### Phase 5: MINDEX Integration (Priority: MEDIUM)

Connect components to MINDEX for data persistence and queries.

- Store experiment results in MINDEX
- Query historical data from MINDEX
- Use vector search for similar experiments/hypotheses
- Store telemetry time-series data
- Knowledge graph for species relationships

### Phase 6: MYCA Integration (Priority: MEDIUM)

Connect to MYCA multi-agent system for intelligent operations.

- Use ScientistAgent for hypothesis generation
- Use LabAgent for instrument control
- Use SimulationAgent for job management
- Use HypothesisAgent for validation
- Use MemoryAgent for context retrieval

---

## 3. Environment Configuration

```env
# .env.local (website)
NEXT_PUBLIC_MAS_URL=http://192.168.0.188:8001
NEXT_PUBLIC_MINDEX_URL=http://192.168.0.188:5432
NEXT_PUBLIC_WS_URL=ws://192.168.0.188:8001/ws

# Production
MAS_ORCHESTRATOR_URL=http://mas-orchestrator:8001
MINDEX_DATABASE_URL=postgresql://mindex:password@mindex-db:5432/mindex
```

---

## 4. Data Flow Examples

### Example 1: Starting a Simulation

```
User clicks "New Simulation" → 
  SimulationPanel.startSimulation() →
    POST /api/scientific/simulation →
      MAS Orchestrator receives request →
        SimulationAgent.start_job() →
          GPU Service allocates resources →
            AlphaFold/Mycelium service starts →
              Job status stored in MINDEX →
                WebSocket pushes progress updates →
                  SimulationPanel updates UI
```

### Example 2: FCI Recording

```
User starts FCI session →
  FCIMonitor.startSession() →
    POST /api/bio/fci/sessions →
      MAS Orchestrator →
        FCI Service connects to Petraeus device →
          Electrode signals streamed via WebSocket →
            SignalVisualizer renders waveforms →
              Data stored in MINDEX bio.electrical_signals
```

### Example 3: Hypothesis Validation

```
User creates hypothesis →
  HypothesisBoard.create() →
    POST /api/scientific/hypotheses →
      MAS Orchestrator →
        HypothesisAgent evaluates →
          Searches MINDEX for related experiments →
            Creates experiment design →
              LabAgent executes experiment →
                Results analyzed →
                  Hypothesis status updated
```

---

## 5. WebSocket Events

Real-time updates via WebSocket connection:

| Event | Data | Components |
|-------|------|------------|
| `simulation.progress` | `{id, progress, eta}` | SimulationPanel |
| `experiment.step` | `{id, step, status}` | ExperimentTracker |
| `fci.signal` | `{session_id, channels, samples}` | SignalVisualizer |
| `device.status` | `{device_id, status}` | DeviceGrid |
| `telemetry.update` | `{device_id, readings}` | TelemetryChart |
| `mycelium.state` | `{sim_id, nodes, edges}` | MyceliumNetworkViz |
| `safety.alert` | `{type, message, severity}` | SafetyMonitor |

---

## 6. Implementation Timeline

| Phase | Tasks | Status |
|-------|-------|--------|
| 1 | API Routes | In Progress |
| 2 | Service Layer | Pending |
| 3 | React Hooks | Pending |
| 4 | Component Updates | Pending |
| 5 | MINDEX Integration | Pending |
| 6 | MYCA Integration | Pending |
| 7 | Testing | Pending |
| 8 | Documentation | Pending |

---

## 7. Success Criteria

- [ ] All components display real data from MAS backend
- [ ] Real-time updates via WebSocket (< 100ms latency)
- [ ] MINDEX queries return accurate historical data
- [ ] MYCA agents respond to user actions
- [ ] Error handling and loading states
- [ ] Mobile-responsive design
- [ ] Performance: < 1s initial load, < 100ms updates

---

*Document created: February 3, 2026*
