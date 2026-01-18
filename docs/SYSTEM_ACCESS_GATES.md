# Mycosoft NatureOS - System Access Gates

**Date:** January 17, 2026  
**Version:** 1.0  
**Classification:** INTERNAL - Security Architecture

---

## Access Gate Definitions

| Gate | Symbol | Description | Authentication |
|------|--------|-------------|----------------|
| **PUBLIC** | 🌍 | Open to everyone, no login required | None |
| **FREEMIUM** | 🆓 | Public with limited features, full access on signup | Optional |
| **AUTHENTICATED** | 🔐 | Requires login, any verified user | Required |
| **PREMIUM** | 💎 | Pay-to-play, subscription required | Required + Payment |
| **ADMIN** | 🛡️ | Admin users only | Required + Admin Role |
| **SUPER_ADMIN** | 👑 | Morgan only, highest clearance | Required + Super Admin |

---

## 📄 WEBSITE PAGES

### Public Pages (🌍)
| Page | Route | Description | Gate |
|------|-------|-------------|------|
| Homepage | `/` | Main landing page | 🌍 PUBLIC |
| About | `/about` | Company information | 🌍 PUBLIC |
| Team | `/about/team` | Team members | 🌍 PUBLIC |
| Privacy Policy | `/privacy` | Privacy terms | 🌍 PUBLIC |
| Terms of Service | `/terms` | Legal terms | 🌍 PUBLIC |
| Documentation | `/docs` | Public docs | 🌍 PUBLIC |
| Login | `/login` | Authentication | 🌍 PUBLIC |
| Signup | `/signup` | Registration | 🌍 PUBLIC |
| Preview | `/preview` | Feature preview | 🌍 PUBLIC |

### Freemium Pages (🆓)
| Page | Route | Description | Public Features | Premium Features |
|------|-------|-------------|-----------------|------------------|
| Search | `/search` | Global search | 10 results/day | Unlimited |
| Species Database | `/species` | Species lookup | View only | Full data export |
| Mushrooms | `/mushrooms` | Mushroom catalog | 50 species | 15,000+ species |
| Compounds | `/compounds` | Chemical database | View only | Simulate |
| Science | `/science` | Research papers | Abstracts | Full papers |
| Ancestry | `/ancestry` | Phylogenetic trees | Basic tree | Full explorer |

### Authenticated Pages (🔐)
| Page | Route | Description | Gate |
|------|-------|-------------|------|
| Profile | `/profile` | User profile | 🔐 AUTHENTICATED |
| Settings | `/settings` | User settings | 🔐 AUTHENTICATED |
| Dashboard | `/dashboard` | User dashboard | 🔐 AUTHENTICATED |
| Apps Hub | `/apps` | Application launcher | 🔐 AUTHENTICATED |

### Premium Pages (💎)
| Page | Route | Description | Tier | Price |
|------|-------|-------------|------|-------|
| CREP Dashboard | `/dashboard/crep` | Global intelligence | Pro | $29/mo |
| SOC Dashboard | `/dashboard/soc` | Security operations | Enterprise | $99/mo |
| MYCA AI | `/myca-ai` | AI assistant | Pro | $29/mo |
| Ancestry Explorer | `/ancestry/explorer` | Full phylogeny | Pro | $29/mo |
| Ancestry Tools | `/ancestry/tools` | Analysis tools | Pro | $29/mo |
| Genetic Analysis | `/ancestry/species/[id]` | Deep genetics | Pro | $29/mo |

### Admin Pages (🛡️)
| Page | Route | Description | Gate |
|------|-------|-------------|------|
| Device Manager | `/devices` | MycoBrain devices | 🛡️ ADMIN |
| Device Details | `/devices/[id]` | Device config | 🛡️ ADMIN |
| Security Dashboard | `/security` | Security center | 🛡️ ADMIN |
| Defense Dashboard | `/defense` | Threat monitoring | 🛡️ ADMIN |

### Super Admin Pages (👑)
| Page | Route | Description | Gate |
|------|-------|-------------|------|
| NatureOS Admin | `/natureos/settings` | System settings | 👑 SUPER_ADMIN |
| Model Training | `/natureos/model-training` | AI model config | 👑 SUPER_ADMIN |
| Containers | `/natureos/containers` | Docker management | 👑 SUPER_ADMIN |
| System Monitoring | `/natureos/monitoring` | Full system health | 👑 SUPER_ADMIN |

---

## 🌿 NATUREOS CONSOLE

| Page | Route | Description | Gate |
|------|-------|-------------|------|
| NatureOS Home | `/natureos` | Console overview | 🔐 AUTHENTICATED |
| AI Studio | `/natureos/ai-studio` | AI playground | 💎 PREMIUM |
| Live Map | `/natureos/live-map` | Real-time tracking | 💎 PREMIUM |
| MINDEX | `/natureos/mindex` | Species database | 🆓 FREEMIUM |
| Devices | `/natureos/devices` | Device dashboard | 🔐 AUTHENTICATED |
| Network | `/natureos/devices/network` | Network topology | 🛡️ ADMIN |
| Drone | `/natureos/drone` | Drone control | 👑 SUPER_ADMIN |
| Shell | `/natureos/shell` | System terminal | 👑 SUPER_ADMIN |
| MAS | `/natureos/mas` | Agent system | 🛡️ ADMIN |
| Workflows | `/natureos/workflows` | n8n workflows | 🛡️ ADMIN |
| Functions | `/natureos/functions` | Edge functions | 🛡️ ADMIN |
| Integrations | `/natureos/integrations` | API connections | 🛡️ ADMIN |
| Storage | `/natureos/storage` | File storage | 🔐 AUTHENTICATED |
| Cloud | `/natureos/cloud` | Cloud resources | 👑 SUPER_ADMIN |
| SDK | `/natureos/sdk` | Developer SDK | 💎 PREMIUM |
| API | `/natureos/api` | API explorer | 💎 PREMIUM |
| WiFiSense | `/natureos/wifisense` | Location sensing | 🛡️ ADMIN |
| Smell Training | `/natureos/smell-training` | ML training | 👑 SUPER_ADMIN |

---

## 🔌 API ENDPOINTS

### Public APIs (🌍)
| Endpoint | Method | Description | Rate Limit |
|----------|--------|-------------|------------|
| `/api/health` | GET | System health | Unlimited |
| `/api/auth/*` | ALL | Authentication | 100/min |
| `/api/search` | GET | Basic search | 10/day |

### Freemium APIs (🆓)
| Endpoint | Method | Description | Free Limit | Paid Limit |
|----------|--------|-------------|------------|------------|
| `/api/species/*` | GET | Species data | 50/day | Unlimited |
| `/api/compounds/*` | GET | Compound data | 20/day | Unlimited |
| `/api/ancestry/*` | GET | Ancestry data | 10/day | Unlimited |
| `/api/search/suggestions` | GET | Search hints | 100/day | Unlimited |

### Authenticated APIs (🔐)
| Endpoint | Method | Description | Gate |
|----------|--------|-------------|------|
| `/api/user/*` | ALL | User management | 🔐 |
| `/api/storage/*` | ALL | File operations | 🔐 |
| `/api/upload/*` | POST | File uploads | 🔐 |
| `/api/chat/*` | ALL | AI chat | 🔐 |

### Premium APIs (💎)
| Endpoint | Method | Description | Gate |
|----------|--------|-------------|------|
| `/api/ai/*` | ALL | AI models | 💎 |
| `/api/embeddings/*` | ALL | Vector search | 💎 |
| `/api/compounds/simulate` | POST | Simulations | 💎 |
| `/api/growth/predict` | POST | Predictions | 💎 |
| `/api/genetics/*` | ALL | Genetic analysis | 💎 |

### Admin APIs (🛡️)
| Endpoint | Method | Description | Gate |
|----------|--------|-------------|------|
| `/api/devices/*` | ALL | Device management | 🛡️ |
| `/api/mycobrain/*` | ALL | MycoBrain control | 🛡️ |
| `/api/firmware/*` | ALL | Firmware updates | 🛡️ |
| `/api/mindex/*` | ALL | MINDEX admin | 🛡️ |
| `/api/unifi/*` | ALL | Network control | 🛡️ |
| `/api/myca/*` | ALL | Agent control | 🛡️ |
| `/api/security/*` | ALL | Security ops | 🛡️ |

### Super Admin APIs (👑)
| Endpoint | Method | Description | Gate |
|----------|--------|-------------|------|
| `/api/docker/*` | ALL | Container control | 👑 |
| `/api/services/*` | ALL | Service management | 👑 |
| `/api/natureos/system/*` | ALL | Core system | 👑 |
| `/api/natureos/shell/*` | ALL | Shell commands | 👑 |
| `/api/scrapers/*` | ALL | Data scrapers | 👑 |

### External Data APIs (🌍 → 🛡️)
| Endpoint | Method | Description | Gate |
|----------|--------|-------------|------|
| `/api/oei/opensky/*` | GET | Flight tracking | 🆓 (basic) / 💎 (full) |
| `/api/oei/aisstream/*` | GET | Ship tracking | 🆓 (basic) / 💎 (full) |
| `/api/oei/satellites/*` | GET | Satellite data | 💎 PREMIUM |
| `/api/oei/gbif/*` | GET | Biodiversity | 🆓 FREEMIUM |
| `/api/oei/inaturalist/*` | GET | Observations | 🆓 FREEMIUM |
| `/api/weather/*` | GET | Weather data | 🆓 FREEMIUM |
| `/api/earth-simulator/*` | ALL | Earth sim | 💎 PREMIUM |
| `/api/crep/*` | ALL | CREP intel | 💎 PREMIUM |

---

## 🗄️ DATABASES

### Supabase (Cloud)
| Table | Description | Gate |
|-------|-------------|------|
| `profiles` | User profiles | 🔐 Own data |
| `devices` | MycoBrain devices | 🛡️ ADMIN |
| `telemetry` | Sensor data | 🛡️ ADMIN |
| `species` | Species catalog | 🆓 Read / 🛡️ Write |
| `documents` | Vector docs | 💎 PREMIUM |

### MINDEX (PostgreSQL :8000)
| Collection | Description | Gate |
|------------|-------------|------|
| Species | 15,000+ fungal species | 🆓 Read / 🛡️ Write |
| Compounds | Chemical compounds | 🆓 Read / 🛡️ Write |
| Observations | Field observations | 🔐 Own / 🛡️ All |
| Telemetry | Device telemetry | 🛡️ ADMIN |
| Smells | Olfactory training | 👑 SUPER_ADMIN |

### Qdrant (Vector DB :6333)
| Collection | Description | Gate |
|------------|-------------|------|
| Species Embeddings | Semantic species search | 💎 PREMIUM |
| Document Embeddings | RAG knowledge base | 💎 PREMIUM |
| Research Papers | Scientific literature | 💎 PREMIUM |

### Redis (:6379)
| Purpose | Description | Gate |
|---------|-------------|------|
| Sessions | User sessions | 🔐 |
| Cache | API cache | 🌍 |
| Rate Limits | Usage tracking | 🌍 |
| Queues | Job queues | 🛡️ |

---

## 🐳 SERVICES & CONTAINERS

### Always-On Stack
| Service | Port | Description | Gate |
|---------|------|-------------|------|
| Website | 3000 | Main website | 🌍 (pages vary) |
| MINDEX API | 8000 | Species database | 🆓 / 🛡️ |
| MycoBrain Service | 8003 | Device mgmt | 🛡️ ADMIN |

### MAS Stack
| Service | Port | Description | Gate |
|---------|------|-------------|------|
| MAS Orchestrator | 8001 | Agent system | 🛡️ ADMIN |
| Grafana | 3002 | Monitoring | 🛡️ ADMIN |
| Prometheus | 9090 | Metrics | 🛡️ ADMIN |
| n8n | 5678 | Workflows | 🛡️ ADMIN |
| Qdrant | 6345 | Vectors | 👑 SUPER_ADMIN |
| Redis | 6390 | Cache | 👑 SUPER_ADMIN |
| Whisper | 8765 | STT | 🛡️ ADMIN |
| TTS Piper | 10200 | Speech | 🛡️ ADMIN |
| OpenEDAI Speech | 5500 | Voice | 🛡️ ADMIN |
| Voice UI | 8090 | Voice interface | 🛡️ ADMIN |
| MYCA Dashboard | 3100 | Agent UI | 🛡️ ADMIN |
| Ollama | 11434 | Local LLM | 👑 SUPER_ADMIN |
| PostgreSQL | 5433 | Database | 👑 SUPER_ADMIN |

---

## 🔗 EXTERNAL INTEGRATIONS

| Integration | Description | Gate |
|-------------|-------------|------|
| Supabase | Auth, DB, Storage | 🔐 |
| OpenAI | GPT, Embeddings | 💎 |
| Anthropic | Claude | 💎 |
| Groq | Fast inference | 💎 |
| Google Gemini | LLM | 💎 |
| Google Maps | Mapping | 🆓 |
| iNaturalist | Observations | 🆓 |
| GBIF | Biodiversity | 🆓 |
| OpenSky | Flight tracking | 🆓 / 💎 |
| AISStream | Ship tracking | 🆓 / 💎 |
| NOAA | Weather | 🆓 |
| FlightRadar24 | Aviation | 💎 |
| UniFi | Network | 🛡️ |
| Discord | Bot | 🛡️ |
| Asana | Tasks | 🛡️ |
| AWS | Cloud compute | 👑 |
| Azure | Cloud compute | 👑 |
| GCP | Cloud compute | 👑 |

---

## 💰 PRICING TIERS

### Free (🆓)
- Basic species search (50/day)
- Mushroom catalog (limited)
- Weather data
- Basic maps
- Community features

### Pro ($29/mo) (💎)
- Unlimited species data
- CREP Dashboard
- MYCA AI Assistant
- Full ancestry explorer
- Compound simulations
- Flight/ship tracking
- API access (10K calls/mo)

### Enterprise ($99/mo) (💎+)
- Everything in Pro
- SOC Dashboard
- Priority support
- Custom integrations
- Team management
- Unlimited API calls
- SLA guarantee

### Self-Hosted (Contact)
- Full NatureOS deployment
- MycoBrain device kit
- On-premise support
- White-label options

---

## 🔒 ROLE DEFINITIONS

```typescript
enum UserRole {
  ANONYMOUS = 'anonymous',     // No login
  USER = 'user',               // Logged in
  PREMIUM = 'premium',         // Paid subscriber
  ADMIN = 'admin',             // Administrator
  SUPER_ADMIN = 'super_admin'  // Morgan only
}
```

### Role Hierarchy
```
SUPER_ADMIN (Morgan)
    ↓
  ADMIN
    ↓
 PREMIUM
    ↓
   USER
    ↓
ANONYMOUS
```
