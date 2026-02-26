# CREP WebSocket Agent Bus Upgrade – Feb 11, 2026

## Overview

Comprehensive WebSocket and CREP upgrade for HTTPS compatibility, new health endpoint, and topology fixes. Ensures CREP and all MAS-related WebSocket clients work when the site is served over HTTPS (e.g. sandbox.mycosoft.com).

---

## What Was Done

### 1. WebSocket HTTPS Compatibility (`getSecureWebSocketUrl`)

**File:** `lib/utils/websocket-url.ts`

Browsers block `ws://` connections from pages loaded over `https://`. The utility converts URLs to `wss://` when `window.location.protocol === "https:"`.

**Updated clients:**

| File | Purpose |
|------|---------|
| `lib/crep/streaming/entity-websocket-client.ts` | CREP entity stream → MAS `/api/entities/stream` |
| `hooks/use-topology-websocket-simple.ts` | MYCA Live Activity Panel → MAS `/ws/topology` |
| `components/mas/topology/use-topology-websocket.ts` | Advanced topology → MAS `/api/dashboard/ws` |
| `lib/mycorrhizae-client.ts` | Mycorrhizae WebSocket subscribe |
| `lib/fungi-compute/websocket-client.ts` | FCI signal streaming |

### 2. CREP Health API (`/api/crep/health`)

**File:** `app/api/crep/health/route.ts`

- Checks MAS and MINDEX connectivity
- Used by Fungi Compute control panel (`components/fungi-compute/control-panel.tsx`)
- Returns `{ status, services, timestamp, crep_version }`

### 3. CREP Dependency Map

```
CREP Dashboard (/dashboard/crep)
├── EntityStreamClient → MAS WebSocket (getSecureWebSocketUrl)
├── REST APIs
│   ├── /api/natureos/global-events
│   ├── /api/oei/flightradar24
│   ├── /api/oei/aisstream
│   ├── /api/oei/satellites
│   ├── /api/oei/space-weather
│   ├── /api/crep/fungal
│   ├── /api/crep/health   ← NEW
│   └── /api/crep/demo/elephant-conservation
├── MINDEX (via /api/crep/fungal)
└── MAS (Entity stream, global events)
```

---

## Testing CREP

### CREP-only dev server (port 3020)

```powershell
cd C:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website
.\scripts\start-crep-dev.ps1
# Or: npm run dev:crep
```

**URL:** http://localhost:3020/dashboard/crep

### Main dev server (port 3010)

CREP is also at: http://localhost:3010/dashboard/crep

### Health check

```bash
curl http://localhost:3020/api/crep/health
```

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_MAS_WS_URL` | `ws://192.168.0.188:8001` | MAS WebSocket base (EntityStreamClient, topology) |
| `MAS_API_URL` | `http://192.168.0.188:8001` | MAS REST base |
| `MINDEX_API_URL` | `http://192.168.0.189:8000` | MINDEX API base |

**Production (HTTPS):** When served over `https://`, all WebSocket clients automatically use `wss://` via `getSecureWebSocketUrl`. If MAS does not support WSS, set `NEXT_PUBLIC_MAS_WS_URL` to a URL that does (e.g. `wss://mas.mycosoft.com` via Cloudflare proxy).

---

## Remaining Work (Future)

1. **MYCA chat in CREP** – Replace simulated responses with real `/api/myca/consciousness/chat` or equivalent.
2. **CREP memory integration** – Add MAS memory API calls for context if desired.
3. **Entity stream proxy** – Consider Next.js WebSocket proxy if direct MAS connection fails behind reverse proxies.

---

## References

- `docs/CREP_LIVE_EVENTS_SANDBOX_FEB12_2026.md` – Live events, toast, blinking markers
- `docs/CREP_DASHBOARD_GUIDE.md` – CREP user guide
- `docs/CREP_LIVE_EVENTS_DEPLOYMENT_HANDOFF_FEB11_2026.md` – Deployment checklist
