# Mushroom Growth Simulator - Unreal Engine Integration Plan

## Overview
A high-fidelity 3D mushroom growth simulator using Unreal Engine for real-time visualization, capable of simulating mushroom growth from spore to harvest in seconds with scientific accuracy.

## Architecture

### Frontend (Next.js)
```
/apps/mushroom-sim/page.tsx (React Component)
├── Unreal Engine WebGL Build (Pixel Streaming)
├── Control Panel (React UI)
├── Real-time Data Sync
└── Database Integration (Save/Load Simulations)
```

### Backend Services
```
/api/mushroom-sim/
├── simulate (POST) - Run growth simulation
├── species (GET) - Get MINDEX species data
├── environments (GET) - Environmental presets
├── saves (GET/POST) - User simulation saves
└── analytics (GET) - Growth prediction analytics
```

### Unreal Engine Component
```
Unreal Project: MushroomGrowthSim
├── Blueprints/
│   ├── BP_Mushroom (Procedural mesh generation)
│   ├── BP_MyceliumNetwork (Subsurface growth)
│   ├── BP_Environment (Substrate, moisture, temp viz)
│   └── BP_TimeController (Accelerated time simulation)
├── Materials/
│   ├── M_MushroomCap (PBR with growth stages)
│   ├── M_MushroomStem (Procedural texture)
│   ├── M_Mycelium (Translucent network visualization)
│   └── M_Substrate (Dynamic wetness/nutrients)
├── Niagara/
│   ├── NS_SporeGermination
│   ├── NS_MyceliumGrowth
│   └── NS_PrimordiaFormation
└── AI/
    ├── GrowthBehaviorTree (Environmental response)
    └── NeuralNetworkPlugin (ML-driven growth patterns)
```

## Technical Implementation

### Phase 1: Unreal Engine Setup (Weeks 1-4)
1. **Unreal Project Creation**
   - Create new UE5.3+ project with Pixel Streaming plugin
   - Configure WebRTC for browser streaming
   - Set up development pipeline

2. **Procedural Mushroom Generation**
   - Implement L-System for hyphal growth
   - Create procedural mesh generation for caps/stems
   - Develop material system with growth stages
   - Implement realistic textures and PBR materials

3. **Physics & Growth Systems**
   - Subsurface mycelium network simulation
   - Nutrient diffusion system
   - Water transport mechanics
   - CO2/O2 exchange simulation

### Phase 2: MINDEX Integration (Weeks 5-6)
1. **Species Data Integration**
   ```typescript
   interface MushroomSpeciesData {
     id: string
     scientificName: string
     growthRate: GrowthCurve
     environmentalRequirements: {
       temperature: Range
       humidity: Range
       substrate: string[]
       co2Levels: Range
     }
     morphology: {
       capShape: string
       stemDiameter: Range
       gillSpacing: number
       sporePrintColor: string
     }
     genetics: {
       genomeSize: number
       growthGenes: GeneExpression[]
     }
   }
   ```

2. **Real-time Data Sync**
   - Fetch species parameters from MINDEX API
   - Map biological data to Unreal Engine parameters
   - Update growth simulations with real research data

### Phase 3: AI & ML Integration (Weeks 7-8)
1. **Growth Prediction Model**
   - Train neural network on MINDEX growth data
   - Implement prediction API
   - Integrate with Unreal Engine AI system

2. **Procedural Generation**
   - Use AI to generate realistic variations
   - Implement genetic variation system
   - Create realistic environmental responses

### Phase 4: Frontend Integration (Weeks 9-10)
1. **Pixel Streaming Integration**
   ```typescript
   // Embed Unreal Engine stream in React
   <PixelStreamingPlayer
     streamUrl="ws://localhost:8888"
     width="100%"
     height="600px"
     onReady={handleStreamReady}
   />
   ```

2. **Control Panel**
   - Species selector (MINDEX integration)
   - Environmental controls (temp, humidity, nutrients)
   - Time acceleration slider
   - Save/load simulation states
   - Screenshot & video capture

3. **Real-time Communication**
   - WebSocket connection to Unreal Engine
   - Bidirectional data flow
   - State synchronization

### Phase 5: Database & Saves (Weeks 11-12)
1. **Simulation State Schema**
   ```typescript
   interface SimulationSave {
     id: string
     userId: string
     speciesId: string
     timestamp: Date
     growthStage: string
     environment: EnvironmentState
     duration: number // simulated time in hours
     screenshot: string
     analytics: {
       biomass: number
       fruitBodyCount: number
       avgCapDiameter: number
     }
   }
   ```

2. **Training Data Export**
   - Export simulation results for ML training
   - Store in MINDEX for analysis
   - Contribute to growth prediction models

## Technology Stack

### Unreal Engine
- **Version**: 5.3 or later
- **Plugins**:
  - Pixel Streaming (WebRTC)
  - Niagara VFX
  - Chaos Physics
  - Neural Network Inference (NNI)

### Frontend
- **Framework**: Next.js 14+ with TypeScript
- **3D Library**: Three.js (for preview thumbnails)
- **State**: Zustand or Jotai
- **WebRTC**: Simple-peer for streaming

### Backend
- **Runtime**: Node.js / Bun
- **Framework**: Next.js API routes
- **Database**: PostgreSQL (MINDEX integration)
- **Cache**: Redis (simulation states)

### Hosting
- **Unreal Engine**: Dedicated server with GPU (AWS G4dn or local)
- **Frontend**: Vercel / CloudFlare
- **Database**: Supabase or self-hosted PostgreSQL

## Scientific Accuracy

### Growth Modeling
1. **Mycelium Colonization**
   - Hyphal extension rate: 0.1-10 mm/h (species-dependent)
   - Branching patterns: L-System with stochastic elements
   - Nutrient depletion model

2. **Primordia Formation**
   - Environmental triggers (temperature drop, light exposure)
   - Minimum mycelial biomass threshold
   - Hormonal signaling simulation

3. **Fruiting Body Development**
   - Morphogenesis stages (button → young → mature)
   - Cell division and expansion model
   - Resource allocation from mycelium

### Environmental Factors
- Temperature effects on enzyme activity (Q10 model)
- Humidity and evapotranspiration
- CO2 levels and photosynthesis (if applicable)
- Light spectrum and photoperiod
- Substrate composition and nutrient availability

## Performance Targets
- **Frame Rate**: 60 FPS at 1080p
- **Simulation Speed**: 1000x real-time (1 month in 43 seconds)
- **Latency**: <100ms for control inputs
- **Concurrent Users**: 50+ simultaneous simulations

## Data Flow
```
User Input → Next.js Frontend → WebSocket → Unreal Engine
                                              ↓
MINDEX API ← PostgreSQL ← Simulation State ←┘
    ↓
Growth Parameters → Unreal Engine Blueprint → Visual Update
```

## Development Timeline
1. **Weeks 1-4**: Unreal Engine core systems
2. **Weeks 5-6**: MINDEX integration
3. **Weeks 7-8**: AI/ML integration
4. **Weeks 9-10**: Frontend integration
5. **Weeks 11-12**: Database & polish
6. **Week 13**: Testing & optimization
7. **Week 14**: Documentation & deployment

## Future Enhancements
- VR support for immersive observation
- Multi-species competition simulations
- Disease and contamination modeling
- Laboratory equipment integration (real sensors)
- Educational curriculum integration
- Research paper export functionality

## Cost Estimation
- **Development**: 14 weeks @ 1 FTE developer
- **Infrastructure**:
  - GPU server: $500-1000/month (AWS G4dn.xlarge)
  - Storage: $50/month
  - CDN: $100/month
- **Unreal Engine**: Royalty-free for internal tools
- **Total Initial**: ~$2,000-3,000/month operational

## Success Metrics
- Simulation accuracy vs real growth data: >90%
- User engagement: >5 min average session
- Educational adoption: 10+ schools/universities
- Research citations: Used in 5+ papers within 1 year
