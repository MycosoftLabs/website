# MYCA Scientific System Architecture
## February 3, 2026

## Overview

The MYCA (Mycosoft Computational AI) Scientific Architecture is a comprehensive system for autonomous scientific discovery, integrating AI agents, biological interfaces, and laboratory automation.

---

## 1. System Layers

### Layer 1: Frontend (Website)
**Location**: `C:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\`

```
website/
├── app/                    # Next.js App Router
│   ├── scientific/         # Scientific dashboard pages
│   ├── natureos/           # NatureOS device management
│   ├── devices/            # Hardware devices
│   └── api/                # API routes (proxy to MAS)
├── components/             # React components
│   ├── scientific/         # Scientific components
│   ├── devices/            # Device components
│   └── ui/                 # Shadcn UI components
├── hooks/                  # React hooks
│   └── scientific/         # Scientific data hooks
└── lib/services/           # API service classes
```

### Layer 2: MAS Orchestrator
**Location**: `C:\Users\admin2\Desktop\MYCOSOFT\CODE\MAS\mycosoft-mas\`

```
mycosoft_mas/
├── core/                   # Core orchestration
│   ├── orchestrator.py     # Main orchestrator
│   └── prompt_manager.py   # Prompt management
├── agents/v2/              # AI agents
│   ├── scientific_agents.py
│   ├── lab_agents.py
│   └── simulation_agents.py
├── natureos/               # NatureOS platform
│   ├── platform.py
│   ├── device_manager.py
│   ├── telemetry.py
│   └── signal_processor.py
├── bio/                    # Biological interfaces
│   ├── fci.py
│   ├── mycobrain.py
│   └── electrode_array.py
├── simulation/             # Simulation engines
│   ├── protein_design.py
│   ├── mycelium.py
│   └── physics.py
├── memory/                 # Memory systems
│   ├── short_term.py
│   ├── long_term.py
│   ├── vector_memory.py
│   └── graph_memory.py
├── safety/                 # Safety systems
│   ├── guardian_agent.py
│   ├── alignment.py
│   └── biosafety.py
└── llm/                    # LLM integration
    ├── model_wrapper.py
    ├── mycospeak.py
    └── rag_engine.py
```

### Layer 3: MINDEX Database
**Type**: PostgreSQL with pgvector extension

```
Schemas:
├── natureos/              # Device and telemetry data
│   ├── devices
│   ├── telemetry
│   ├── commands
│   └── environmental_events
├── bio/                   # Biological interface data
│   ├── fci_sessions
│   ├── electrical_signals
│   └── stimulation_events
├── simulation/            # Simulation data
│   ├── runs
│   └── hypotheses
├── memory/                # Memory storage
│   ├── conversations
│   ├── facts
│   └── user_profiles
├── mindex/                # Knowledge storage
│   ├── embeddings
│   └── knowledge_edges
└── ledger/                # Provenance ledger
    ├── blocks
    ├── entries
    └── ip_nfts
```

---

## 2. Component Communication

### Request Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                                  │
│                        (Next.js Website - Port 3010)                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                           API Routes (Proxy)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MAS ORCHESTRATOR                                    │
│                    (FastAPI - 192.168.0.188:8001)                            │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐                 │
│  │ Lab Agent │  │Simulation │  │ Scientist │  │Hypothesis │                 │
│  │           │  │   Agent   │  │   Agent   │  │   Agent   │                 │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘                 │
└────────┼──────────────┼──────────────┼──────────────┼───────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  NatureOS   │ │  Simulation │ │   Memory    │ │   Safety    │
│  Platform   │ │   Services  │ │   System    │ │   System    │
└──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
       │               │               │               │
       ▼               ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MINDEX DATABASE                                     │
│                    (PostgreSQL + pgvector)                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                         Hardware Interfaces
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PHYSICAL DEVICES                                    │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐                 │
│  │ Mushroom1 │  │  Petraeus │  │ SporeBase │  │  MycoNode │                 │
│  │  (IoT)    │  │   (FCI)   │  │ (Spores)  │  │  (Soil)   │                 │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Service Ports

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| Website | 3010 | HTTP | User interface |
| MAS Orchestrator | 8001 | HTTP/WS | Main API |
| NatureOS Platform | 8010 | HTTP | Device management |
| Signal Processor | 8011 | HTTP | Signal analysis |
| FCI Service | 8020 | HTTP | FCI sessions |
| MycoBrain Service | 8021 | HTTP | Neuromorphic compute |
| AlphaFold Service | 8030 | HTTP | Protein prediction |
| Mycelium Simulator | 8031 | HTTP | Network simulation |
| MINDEX Database | 5432 | PostgreSQL | Data storage |
| Redis | 6379 | Redis | Caching/queues |

---

## 3. Data Models

### Instrument
```typescript
interface Instrument {
  id: string
  name: string
  type: 'incubator' | 'pipettor' | 'bioreactor' | 'microscope' | ...
  status: 'online' | 'offline' | 'busy' | 'maintenance'
  lastCalibration?: string
  currentTask?: string
}
```

### Simulation
```typescript
interface Simulation {
  id: string
  name: string
  type: 'alphafold' | 'boltzgen' | 'mycelium' | 'cobrapy' | 'physics' | 'molecular'
  status: 'queued' | 'running' | 'completed' | 'failed' | 'paused'
  progress: number
  eta?: string
  config: Record<string, unknown>
  result?: unknown
}
```

### Experiment
```typescript
interface Experiment {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  currentStep: number
  totalSteps: number
  parameters: Record<string, unknown>
  startedAt?: string
  completedAt?: string
}
```

### FCISession
```typescript
interface FCISession {
  id: string
  species: string
  strain?: string
  status: 'recording' | 'stimulating' | 'idle' | 'paused'
  duration: number
  electrodesActive: number
  totalElectrodes: number
  sampleRate: number
}
```

### Hypothesis
```typescript
interface Hypothesis {
  id: string
  statement: string
  status: 'proposed' | 'testing' | 'validated' | 'rejected'
  confidence?: number
  experiments: string[]
  evidence?: unknown[]
}
```

---

## 4. Security Architecture

### Authentication
- Supabase Auth for user authentication
- JWT tokens for API access
- Session management via cookies

### Authorization
- Role-Based Access Control (RBAC)
- Resource-level permissions
- Agent permissions for automated actions

### Data Security
- TLS encryption in transit
- AES-256 encryption at rest
- Audit logging for all actions

### Biosafety
- Guardian Agent monitors all actions
- Alignment checks for AI outputs
- BSL-level containment validation

---

## 5. Deployment Architecture

### Local Development
```
localhost:3010  → Website (Next.js dev server)
localhost:8001  → MAS Orchestrator (uvicorn)
localhost:5432  → PostgreSQL (Docker)
localhost:6379  → Redis (Docker)
```

### Production (VM: 192.168.0.187)
```
sandbox.mycosoft.com → Website (Docker container)
192.168.0.188:8001   → MAS Orchestrator (Docker)
192.168.0.188:5432   → PostgreSQL (Docker)
192.168.0.188:6379   → Redis (Docker)
```

### Container Network
```yaml
networks:
  mycosoft-network:
    services:
      - mycosoft-website
      - mas-orchestrator
      - mindex-postgres
      - redis
      - natureos-platform
      - simulation-services
```

---

## 6. Monitoring & Observability

### Metrics
- Prometheus for metrics collection
- Grafana dashboards for visualization
- Custom metrics for scientific operations

### Logging
- Loki for log aggregation
- Structured JSON logging
- Audit logs for compliance

### Tracing
- Distributed tracing for request flow
- Performance monitoring
- Error tracking

---

## 7. Integration Points

### External Services
- **OpenAI/Anthropic**: LLM inference
- **ElevenLabs**: Voice synthesis
- **PersonaPlex**: Voice interaction
- **AlphaFold**: Protein prediction
- **Supabase**: Database hosting

### Hardware Interfaces
- **MQTT**: IoT device communication
- **ROS2**: Robotics integration
- **LoRa**: Long-range mesh networking
- **USB/Serial**: Lab instrument control

### Data Sources
- **NCBI**: Biological databases
- **UniProt**: Protein databases
- **PubMed**: Research literature
- **GBIF**: Species occurrence data

---

*Documentation created: February 3, 2026*
