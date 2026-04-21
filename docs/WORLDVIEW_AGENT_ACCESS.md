# WorldView Agent Access — MYCA + PersonaPlex integration

**Created:** Apr 22, 2026 · Morgan direction: "myca and worldview needs snapshots thats what out agent access to worldview shows and it needs update with this new capability."

WorldView is the canonical real-time view of CREP state. Any MYCA agent, PersonaPlex voice consumer, or external Mycosoft tool that needs "what's on CREP right now" reads from here — not from the individual connectors, not from MapLibre state, not from browser DOM.

---

## Two endpoints

### 1. `GET /api/worldview/snapshot?project=oyster|goffs|global`
**One-shot poll.** Returns the full state in a single JSON. 30 s edge cache + 2 min SWR. Use when you need a point-in-time answer and don't need push updates.

### 2. `GET /api/worldview/stream?project=oyster|goffs|global` (**new — Apr 22, 2026**)
**Server-Sent Events.** Pushes a fresh snapshot every 60 s over a long-lived connection. Use for narration, live monitoring, or any agent that should react to changes without polling.

Connection lifecycle:
- `hello` event on connect (metadata: project, tick interval, reconnect hint)
- `snapshot` event every 60 s (full payload)
- `health_drop` event fires immediately when MINDEX or MAS reachability flips to false (don't wait for next tick)
- `error` event on transient failure (SSE spec says client auto-reconnects after close)
- 5 min maxDuration — browser/Node SSE clients auto-reconnect

---

## Snapshot shape

```json
{
  "generated_at": "2026-04-22T03:14:12.001Z",
  "latency_ms": 1830,
  "project": "oyster",
  "live_entities": {
    "aircraft": 1969,
    "vessels": 0,
    "satellites": 0,
    "buoys": 805,
    "military_facilities": 769,
    "eagle_video_sources": 3235
  },
  "projects": {
    "oyster": {
      "anchor": {
        "id": "oyster-mycosoft",
        "name": "Project Oyster — Tijuana Estuary",
        "lat": 32.5650, "lng": -117.1200,
        "metadata": {
          "thesis_completed": "2026-03-15",
          "owner": "Morgan (MYCODAO)",
          "partners": "MYCODAO, MYCOSOFT, TRNERR, SDAPCD, IBWC, UCSD Scripps, NASA JPL/EMIT",
          "contamination_status": "Closed 1000+ days (IB beach), chronic sewage"
        }
      },
      "cameras": 15,
      "cameras_with_stream": 15,
      "sensors": 40,
      "sensor_breakdown": {
        "aqi": 10, "tide": 3, "streamflow": 2, "waterquality": 4,
        "oceanography": 4, "plume": 4, "crossborder": 3, "emit": 2,
        "light": 1, "noise": 2, "soil": 2, "buoy": 3
      },
      "pfm_plume_active": true,
      "pfm_flow_m3s": 12.5,
      "emit_plumes": 3,
      "inat_observations": 200,
      "sources_used": [...]
    },
    "goffs": { "..." }
  },
  "middleware": {
    "mindex":  { "url": "http://192.168.0.189:8000", "reachable": true,  "latency_ms": 6 },
    "mas":     { "url": "http://192.168.0.188:8001", "reachable": true,  "latency_ms": 161 },
    "personaplex_voice": { "url": "ws://192.168.0.241:8999/...", "reachable": null, "note": "Probed client-side only" },
    "shinobi": { "url": "http://192.168.0.188:8080", "reachable": null }
  }
}
```

---

## Agent consumer patterns

### PersonaPlex voice (Legion 192.168.0.241)
```javascript
// Inside the voice bridge's crep-awareness module
const es = new EventSource("http://192.168.0.187:3000/api/worldview/stream?project=global");

es.addEventListener("hello", (e) => {
  const { project, interval_ms } = JSON.parse(e.data);
  voiceBridge.log(`WorldView stream open for ${project}, ticking every ${interval_ms / 1000}s`);
});

es.addEventListener("snapshot", (e) => {
  const snap = JSON.parse(e.data);
  // Narrate deltas to Morgan:
  //   "1,969 aircraft live · 805 buoys reporting · Project Oyster: plume
  //    active at 12.5 m³/s, 3 EMIT methane detections, 40 sensors
  //    streaming, 15 cameras with live video"
  voiceBridge.updateCrepContext(snap);
});

es.addEventListener("health_drop", (e) => {
  const { service } = JSON.parse(e.data);
  voiceBridge.alert(`Heads up Morgan — ${service} just went unreachable.`);
});

es.onerror = () => {
  // SSE auto-reconnects; just log the transient drop
  voiceBridge.log("WorldView stream reconnecting...");
};
```

### Lab MYCA agents (CEO/CTO/CFO/COO nodes)
```python
# Python consumer for NemoClaw agents
import httpx
from sseclient import SSEClient

with httpx.stream("GET", "http://192.168.0.187:3000/api/worldview/stream?project=oyster", timeout=None) as r:
    for sse in SSEClient(r.iter_text()):
        if sse.event == "snapshot":
            snap = json.loads(sse.data)
            # Feed into local NemoClaw context
            agent.ingest_crep_state(snap)
        elif sse.event == "health_drop":
            agent.escalate(json.loads(sse.data))
```

### MYCA APP (Morgan's dashboard)
```typescript
// React hook for MYCA APP
function useWorldView(project: "oyster" | "goffs" | "global" = "global") {
  const [snapshot, setSnapshot] = useState(null);
  const [healthDrops, setHealthDrops] = useState([]);
  useEffect(() => {
    const es = new EventSource(`/api/worldview/stream?project=${project}`);
    es.addEventListener("snapshot", (e) => setSnapshot(JSON.parse(e.data)));
    es.addEventListener("health_drop", (e) => setHealthDrops((prev) => [...prev, JSON.parse(e.data)]));
    return () => es.close();
  }, [project]);
  return { snapshot, healthDrops };
}
```

### Monitoring / ops
```bash
# Quick terminal watcher
curl -N "http://localhost:3010/api/worldview/stream?project=global" | \
  awk '/^event:/ {e=$2} /^data:/ && e=="snapshot" {print strftime("%H:%M:%S"), $0 | "head -c 200"}'
```

---

## Capability matrix

| Agent | One-shot snapshot | SSE stream | Use when |
|---|---|---|---|
| MYCA voice (PersonaPlex) | — | ✅ | Always-on narration of CREP state |
| Lab CEO/CTO/CFO/COO agents | — | ✅ | Agents need live CREP context alongside department data |
| MYCA APP dashboard | — | ✅ | Operator-facing live dashboard |
| MINDEX health monitoring | ✅ | — | Periodic probe of MINDEX+MAS reachability |
| External sales/partner dashboards | ✅ | — | Morgan demos Oyster state to a stakeholder |
| CI / test automation | ✅ | — | Regression test asserts snapshot shape |

---

## What's NOT in WorldView (by design)

- **Camera video frames** — too big. Agents fetch individual streams via `/api/eagle/stream/[id]` or snapshot proxy.
- **Full iNat observation photos** — too big. Counts only in WorldView; detail via `/api/crep/nature/preloaded?project=...`.
- **PMTiles data** — agents don't paint maps; they just need state counts.
- **Raw PFM contour coordinates** — Oyster state shows `pfm_plume_active: true` + `pfm_flow_m3s`, not the full polygon. Fetch `/api/crep/oyster/plume` if geometry is needed.

---

## Freshness guarantees

| Field | Source | Max staleness |
|---|---|---|
| `live_entities.aircraft` | FlightRadar24 pump | 30 s (CREP pump cadence) |
| `live_entities.vessels` | AISstream pump | 30 s |
| `live_entities.satellites` | CelesTrak + MINDEX registry | 30 s |
| `live_entities.buoys` | NDBC | 30 s |
| `live_entities.eagle_video_sources` | MINDEX | 60 s |
| `projects.oyster.pfm_*` | `/api/crep/oyster/plume` (SWR, bg refresh) | 6 h |
| `projects.oyster.emit_plumes` | MINDEX or NASA CMR STAC | 24 h |
| `projects.*.inat_observations` | MINDEX preload (cache) OR live iNat | 6 h (cache) |
| `middleware.*.reachable` | Live HEAD probe | 0 s (fresh per snapshot) |

---

## Cursor-lane dependencies

- `crep.project_nature_cache` DDL (`mindex/migrations/crep_project_nature_cache_APR22_2026.sql`) applied on 189
- `crep.emit_plumes` table (pending — emit-stac-backfill.mjs ingests into it)
- PersonaPlex voice bridge running on 192.168.0.241:8999 (currently stopped per audit)
- MAS `/api/entities/stream` canonical route confirmed (client expects it at :8001/api/entities/stream)

These are orthogonal to the WorldView endpoints themselves — the snapshot aggregator already serves useful data without them, with fields gracefully degrading to null/empty when upstream isn't available.

---

## Keeping WorldView current

When adding new CREP sub-layers (e.g. future projects beyond Oyster + Goffs):
1. Extend `PROJECT_BBOX` in `app/api/crep/nature/preloaded/route.ts`
2. Add the project summary shape in `app/api/worldview/snapshot/route.ts` (model after `oysterSummary` / `goffsSummary`)
3. Wire the new layer's click-event dispatcher the same way (`crep:<project>:site-click`)
4. Nothing to change in `/api/worldview/stream` — it auto-proxies whatever the snapshot route returns.

Consumers get the new fields on the next SSE tick without any client-side change.
