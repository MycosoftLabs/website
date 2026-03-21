# Mycosoft

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

## License

Copyright © 2026 Mycosoft. All rights reserved.
