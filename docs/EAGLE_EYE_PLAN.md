# Eagle Eye for CREP — Integration Plan

> Apr 20, 2026 — dual-plane video intelligence layer on top of CREP, split into a **permanent plane** (registered, fixed-location feeds: Shinobi CCTV, traffic cams, weather webcams, live channels) and an **ephemeral plane** (public-media observations that appear at a place and time: YouTube Live, Bluesky/Mastodon/X video posts, TikTok research clips).

## Phase 0 — Prerequisites (Cursor Apr 20)

- ✅ `eagle.*` schema applied on MINDEX VM 189 (migration `eagle_schema_APR20_2026.sql`, commit `ab4781b`)
- ✅ `pgvector` extension available (postgis/postgis:16-3.4 image)
- ✅ MediaMTX running on MAS 188 (ports 8554 / 8889 / 1935 / 8888)
- ✅ MQTT telemetry `CAST(... AS jsonb)` SQL fix landed; `/telemetry/envelope` returns 200
- ✅ NAS paths `/mnt/nas/eagle/{clips,thumbnails,embeds,models,recordings}` created on 187
- ✅ `YOUTUBE_API_KEY` + `YOUTUBE_DATA_API_KEY` + `GOOGLE_PLACES_API_KEY` in prod `.env`
- ⏳ GHCR pull PAT (read:packages) — Morgan must create + run `ghcr_docker_login_sandbox_187.py`
- ⏳ Cloudflare tunnel → `media.mycosoft.com` (Cursor)
- ⏳ Jetson detector microservice (future Phase 4)

## Phase 1 — Contracts (this commit)

**MINDEX schema** (Cursor applied):

```sql
CREATE SCHEMA eagle;
CREATE TABLE eagle.video_sources (
  id TEXT PK, kind TEXT, provider TEXT, stable_location BOOLEAN,
  lat/lng DOUBLE, location_confidence REAL,
  stream_url TEXT, embed_url TEXT, media_url TEXT,
  source_status TEXT, permissions JSONB, retention_policy JSONB,
  created_at/updated_at TIMESTAMPTZ
);
CREATE TABLE eagle.video_events (
  id TEXT PK, video_source_id TEXT FK, observed_at TIMESTAMPTZ,
  start_at/end_at TIMESTAMPTZ, native_place/inferred_place TEXT,
  inference_confidence REAL, text_context TEXT, thumbnail_url TEXT,
  clip_ref TEXT, raw_metadata JSONB
);
CREATE TABLE eagle.object_tracks (
  id BIGSERIAL PK, video_event_id TEXT FK, class_label TEXT,
  open_vocab_label TEXT, track_id INT, bbox_series JSONB,
  mask_series JSONB, confidence_series JSONB,
  reid_embedding VECTOR(512), alert_flags TEXT[]
);
CREATE TABLE eagle.scene_index (
  id BIGSERIAL PK, video_event_id TEXT FK, transcript TEXT,
  ocr_text TEXT, vlm_summary TEXT, embedding VECTOR(768)
);
```

**Website API routes (this commit):**

| Route | Purpose |
|---|---|
| `GET /api/eagle/sources?bbox=&kind=&provider=&limit=` | Permanent camera registry, MINDEX-backed |
| `GET /api/eagle/events?bbox=&hoursBack=6&provider=&limit=` | Ephemeral events (social clips), MINDEX-backed |
| `GET /api/eagle/stream/[sourceId]` | Resolver: returns HLS (Shinobi via MediaMTX), WebRTC-WHEP (UniFi), or iframe embed_url (YouTube/EarthCam/Windy) |
| `GET /api/oei/youtube-live?bbox=&q=&maxResults=` | YouTube Live geo search (location + locationRadius) |

All routes are auth-aware: prefer `MINDEX_INTERNAL_TOKEN` (singular) → fall back to first token of `MINDEX_INTERNAL_TOKENS` (plural) → `MINDEX_API_KEY`.

## Phase 2 — Permanent plane connectors (next commit)

- **Shinobi** — pull monitor list via `/:API_KEY/monitor/:GROUP_KEY`, map to `eagle.video_sources` with `provider=shinobi`, upsert via `/api/eagle/ingest/video_sources`
- **511 traffic** — Georgia / Bay Area / Road511 unified GeoJSON
- **Windy Webcams** — `api.windy.com/api/webcams/v2/list/webcam=*`, bbox-scoped
- **EarthCam** — public world-map directory
- **Webcamtaxi** — world-map JSON
- **NPS + USGS** — park/hazard webcam endpoints

Each connector becomes a scheduled ingest (cron every 30 min → 24 h depending on source freshness) that POSTs to `/api/mindex/ingest/video_sources` with `kind=permanent`, `stable_location=true`.

## Phase 3 — Ephemeral plane connectors

| Source | Geo strategy | Key status |
|---|---|---|
| YouTube Live | `eventType=live` + `location` + `locationRadius` | ✅ key live |
| Bluesky Jetstream | WebSocket, filter `media[type=video]` by keyword | no key needed |
| Mastodon streaming | `/api/v1/streaming/public` SSE, filter video attachments | no key needed |
| X v2 | `geo.place_id` recent search | needs `X_API_BEARER` |
| TikTok Display | per-user `/v2/video/list/` | needs `TIKTOK_CLIENT_*` |
| TikTok Research | approved non-profit only | pending |
| Snap Public Profile | allowlist-only | pending |
| Reddit | `search.json?q=&t=hour` video-type | secondary tier |

Location confidence ladder per event:
1. Native coordinates (YouTube location, X place_id resolve) — 0.9
2. Platform place / centroid of query — 0.45 (current YouTube default)
3. Caption/description NER — 0.3
4. OCR on thumbnail — 0.25
5. Visual geolocation model — 0.2

Every hop drops the tier badge in the UI.

## Phase 4 — AI stack (on Jetson / NemoClaw)

Three-pass pipeline:

1. **YOLO + ByteTrack** — `POST /detect { stream_url, sample_fps }` → `{ tracks: [{id, class, bbox_series}] }`. Writes to `eagle.object_tracks` with `track_id` + `bbox_series`.
2. **Grounding DINO + SAM 2** — `POST /open-vocab { stream_url, prompt, track=true }` for language-conditioned detection ("white van", "hazmat suit"). Masks stored in `mask_series`.
3. **Qwen2.5-VL** — `POST /describe { clip_url }` for clip-level reasoning. Summary written to `scene_index.vlm_summary`.

Pub/sub channel `eagle:detection:{video_event_id}` fires per new track so the UI can draw boxes live. Redis LRU cache 60 s.

## Phase 5 — Transport

MediaMTX on MAS 188 (Cursor Apr 20):
- **RTSP ingress** → published as HLS at `/${path}/index.m3u8` for browser playback
- **WebRTC-WHEP** at `/${path}/whep` for low-latency operator views
- **SRT** and **RTMP** for ingest from external encoders

`/api/eagle/stream/[sourceId]` is the resolver: figures out the playable URL per provider + auth tier.

Cloudflare tunnel → `media.mycosoft.com` needed for public HLS reads (pending Cursor).

## Phase 6 — UI (this commit — skeleton)

**Components:**
- `components/crep/layers/eagle-eye-overlay.tsx` — dual-plane MapLibre overlay (this commit)
- `components/crep/eagle-eye/VideoWallWidget.tsx` — click widget with hls.js / WebRTC / iframe (next commit)
- `components/crep/eagle-eye/TimelineScrubber.tsx` — 24 h bottom bar for ephemeral events (next)
- `components/crep/eagle-eye/DetectionOverlay.tsx` — bbox + track_id boxes on live video
- `components/crep/eagle-eye/OpenVocabSearchBar.tsx` — "white van" input → Grounding DINO
- `components/crep/eagle-eye/SourceFilterGroup.tsx` — permanent / ephemeral / AI / verified toggles

**Layer registry entries (this commit):**
- `eagleEyeCameras` — permanent plane master toggle
- `eagleEyeEvents` — ephemeral plane master toggle
- Sub-toggles: `eagleEyeShinobi`, `eagleEye511Traffic`, `eagleEyeWeatherCams`, `eagleEyeWebcams`, `eagleEyeNpsUsgs`, `eagleEyeYoutubeLive`, `eagleEyeBluesky`, `eagleEyeMastodon`, `eagleEyeTwitch`

**Glyphs:**
- Permanent cams: halo + core circle, color by provider (Shinobi cyan, 511 amber, Windy sky-blue, EarthCam violet, NPS/USGS green, UniFi cyan-300)
- Ephemeral events: yellow pulsing ring + core. Core color by `location_confidence`: >0.8 bright yellow (native), 0.5-0.8 amber (platform place), <0.5 orange (text/OCR/visual)

**LOD**: permanent visible zoom ≥ 3, ephemeral zoom ≥ 5. Viewport-scoped fetch, 5-min poll for permanent, 60-s poll for ephemeral.

## Phase 7 — MYCA voice commands

Via existing MAS voice-tool pattern (same one the MyceliumSeg validator uses):

- `"show me cameras near Brooklyn Bridge"` → flyTo + eagleEyeCameras on
- `"play the Times Square EarthCam"` → opens VideoWallWidget with provider=earthcam
- `"what's happening on this feed"` → `POST /api/eagle/describe` on selected source
- `"find any white vans in this viewport last hour"` → open-vocab search
- `"show social video from Chicago in the last 30 minutes"` → ephemeral plane filter

Reverse-route: detector emits `alert_flags=['weapon']` → MYCA subscriber dispatches notification.

## Phase 8 — Storage + cache

**NAS layout** (Cursor applied):
```
/mnt/nas/eagle/clips/         # Extracted clips (90 d TTL)
/mnt/nas/eagle/thumbnails/    # Keyframes (365 d TTL)
/mnt/nas/eagle/recordings/    # Shinobi managed
/mnt/nas/eagle/embeds/        # oEmbed HTML cache (7 d TTL)
/mnt/nas/eagle/models/        # YOLO / Grounding DINO / SAM 2 / Qwen2.5-VL
```

**Redis LRU** — 60 s TTL per stream URL (via existing MINDEX Redis).
**Server cache** — 30 s for `/api/eagle/sources` bbox, 30 s for `/api/eagle/events`, 60 s for `/api/oei/youtube-live`.
**Browser** — hls.js instance pool, max 4 concurrent.
**Backpressure** — zoom > 12 with >500 sources in viewport drops to deck.gl GridLayer cluster.

## Phase 9 — Safety rails

- `permissions` JSONB on every source row tracks access tier + consent + ToS URL
- `retention_policy` JSONB on events: default 24 h for social, configurable per provider
- "Operator-verified" flag set ONLY by explicit user action
- `provenance` column on every API response: chain of source / tier / platform
- Quarantined public-web capture service — isolated microservice with its own compliance gate, NEVER called from the default map

## Build order from here

1. **Phase 1 (this commit)** — routes + overlay skeleton ✓
2. **Phase 2 Shinobi + 511 + Windy ingest** — next
3. **Phase 3a YouTube + Bluesky + Mastodon** — next
4. **Phase 5 MediaMTX + Cloudflare tunnel** — pending Cursor
5. **Phase 6 VideoWallWidget + TimelineScrubber** — after Phase 2
6. **Phase 4 YOLO + ByteTrack detector** — pending Cursor Jetson deploy
7. **Phase 7 MYCA voice commands** — after Phase 6
8. **Phase 4b Grounding DINO + SAM 2 + VLM** — after Phase 4
9. **Phase 3b rest of socials (X / TikTok / Snap / Reddit)** — after keys
10. **Phase 9 quarantined capture** — last
