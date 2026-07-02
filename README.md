# Mycosoft


> **Proprietary — Mycosoft, Inc.** Authorized use only. See [LICENSE](./LICENSE) and [NOTICE](./NOTICE). U.S. defense/government and export-control terms may apply.
**Environmental Intelligence Platform**

[Mycosoft.com](https://mycosoft.com)

Mycosoft builds infrastructure for environmental intelligence, biological computing, and AI governance. Our platform connects edge hardware, AI systems, and geospatial data into a planetary-scale nervous system — pushing intelligence as close as possible to real-world signals while maintaining data sovereignty.

---

## Core Platforms

### MYCA — Environmental Super Intelligence
Edge-native intelligence distributed across hardware platforms and nodes. Powered by Nemotron foundation models with PersonaPlex voice-to-voice interaction, MYCA maintains a coherent worldview across every node in the network.

### NatureOS — Cloud Operating System
The central dashboard for environmental intelligence, integrating 38+ applications including MINDEX Explorer, MycoBrain device management, CREP monitoring, AI Studio, Fungi Compute, Ground Station, Model Training, and a full suite of Lab Tools.

### MINDEX — Mycological Database
The Mycosoft Data Integrity Index — a cryptographically-secured, tamper-evident mycological database with chain-of-custody tracking for global fungal species intelligence.

### AVANI — Live Earth Substrate
Continuous environmental and infrastructure context layer. AVANI works alongside MYCA to provide real-time situational awareness across biological and environmental domains.

### Defense — OEI & FUSARIUM
Operational Environmental Intelligence (OEI) and FUSARIUM provide integrated defense and biosecurity capabilities, including threat assessment and global situational awareness through the CREP Dashboard.

### Earth Simulator (NatureOS)
Live environmental intelligence globe at **`/natureos/earth-simulator`**. Layers include aircraft (zoom ≥ 3.5), vessels, satellites, fungal/nature observations, infrastructure PMTiles, weather overlays, and MYCA LIVE chat (MAS LLM + fast local map commands). Key BFF routes: `/api/crep/unified` (capped bundle), `/api/stream/entities` (SSE), `/api/earth2/health`. See [Earth Simulator capabilities](https://github.com/MycosoftLabs/website/blob/main/docs/EARTH_SIMULATOR_REFERENCE.md) and MAS doc `EARTH_SIMULATOR_PUBLIC_CAPABILITIES_JUN20_2026.md`.

---

## Key Features

- **MycoBrain Hardware Integration** — USB serial communication with ESP32-S3 + BME688 sensor platforms via the Mycosoft Device Protocol (MDP v1)
- **CREP** — Continuous Real-time Environmental Perception data collection and analysis
- **Biological Computing** — Fungal Computer Interface (FCI) and Hyphae Programming Language (HPL) for bridging mycelial networks to digital systems
- **Lab Tools** — 13 simulation and analysis applications: Alchemy Lab, Compound Simulator, Digital Twin, Earth Simulator, Genetic Circuit, Growth Analytics, Lifecycle Simulator, Mushroom Simulator, Petri Dish Simulator, Physics Simulator, Retrosynthesis, Spore Tracker, and Symbiosis
- **Ancestry** — Fungal lineage tracking database
- **AI Ecosystem** — Multi-provider LLM integration (Anthropic, OpenAI, Groq, Google AI) with LangChain orchestration

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 15, React 19, Tailwind CSS, Radix UI, Framer Motion |
| **Data Visualization** | D3, Recharts, Three.js, Deck.gl, Mapbox, Cesium, HiGlass |
| **Backend** | Next.js API Routes, Supabase, Drizzle ORM, PostgreSQL |
| **AI/ML** | Anthropic SDK, OpenAI SDK, LangChain, multi-provider support |
| **Hardware/IoT** | gRPC, Protobuf, Serial communication, MycoBrain Protocol |
| **Auth & Payments** | Supabase Auth, NextAuth, Stripe |
| **Real-time** | Socket.io |

---

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Or start Next.js only (no GPU services)
npm run dev:next-only
```

The dev server runs on port **3010** by default.

---

## Documentation

Comprehensive documentation is available in the [`/docs`](./docs) directory, covering architecture, integration guides, security, API routes, deployment, and more.

Additional service-level documentation:
- [Services Architecture](./README_SERVICES.md)
- [MycoBrain API](./services/mycobrain/README.md)

---

## License and export control

**Proprietary — Mycosoft, Inc. All Rights Reserved.**

This repository is proprietary software. No use, copy, modification, distribution,
or disclosure is permitted without **prior written authorization** from Mycosoft, Inc.

- See [LICENSE](./LICENSE) and [NOTICE](./NOTICE) in this repository.
- Portions may relate to U.S. defense, government, marine, acoustic, or environmental
  sensing use cases subject to applicable law, including **EAR** and potentially **ITAR**
  export controls. This repository is **not** marked as ITAR-classified unless explicitly
  labeled elsewhere.
- Mycosoft aligns engineering and security practices with **NIST** cybersecurity
  frameworks and **CMMC**-oriented controls at the organizational level; no certification
  is claimed by presence of this notice alone.
- U.S. Department of Defense and government use is subject to applicable federal law
  and contract terms.

**Contact:** legal@mycosoft.org
