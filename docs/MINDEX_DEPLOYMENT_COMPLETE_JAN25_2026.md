# MINDEX v2 Complete Deployment Documentation

**Date**: January 25, 2026  
**Status**: ✅ Deployed to Sandbox, ⚠️ Cloudflare Cache Purge Required

---

## Summary

This document records the complete MINDEX v2 infrastructure deployment, including bug fixes, backend setup, and UI/UX implementation.

---

## 1. Bug Fixes Applied

### `TypeError: e.id.slice is not a function`

**Root Cause**: Some ID properties returned from APIs (particularly iNaturalist) are numeric integers, but JavaScript string methods like `.slice()`, `.startsWith()`, `.replace()` were being called directly on them.

**Solution**: Wrapped all instances of ID string method calls with `String()` to ensure type safety.

**Files Modified**:

| File | Changes |
|------|---------|
| `components/natureos/mindex-dashboard.tsx` | `String(obs.id).slice(0, 8)` |
| `components/security/incidents/agent-activity-stream.tsx` | `String(activity.incident_id).slice(0, 12)` |
| `components/security/incidents/incident-stats-widgets.tsx` | `String(i.id).slice(0, 16)` |
| `components/security/incidents/incident-chain-visualizer.tsx` | `String(block.event_hash).slice()`, `String(rect.hash).slice()` |
| `app/security/incidents/page.tsx` | `String(incident.id).slice(0, 8)` |
| `app/natureos/smell-training/page.tsx` | `String(session.session_id).slice()`, `String(blob.id).slice()` |
| `components/mindex/agent-activity.tsx` | `String(r.id).slice(0, 8)` |
| `components/search/search-results.tsx` | `String(result.id).startsWith()` |
| `components/mas/topology/advanced-topology-3d.tsx` | `String(node.id).toLowerCase().includes()` |
| `lib/oei/connectors/usgs-volcano.ts` | `String(alert.id).replace()` |
| `lib/oei/connectors/nws-alerts.ts` | `String(props.id).replace()` |
| `lib/services/mindex-service.ts` | `String(taxon.id).replace().slice()` |
| `app/api/search/route.ts` | `result.id.toString()` |
| `lib/utils/species-validator.ts` | `exactMatch.id.toString()` |
| `app/api/search/suggestions/route.ts` | `result.id.toString()` |

---

## 2. MINDEX Backend Infrastructure

### Services Running on VM (192.168.0.187)

| Service | Container | Port | Status |
|---------|-----------|------|--------|
| PostgreSQL | `mindex-postgres-data` | 5434 | ✅ Running |
| MINDEX API | `mindex-api` | 8000 | ✅ Running |
| ETL Scheduler | `mindex-etl-scheduler` | N/A | ✅ Running (30-min interval) |

### Database Schema

Tables created:
- `taxa` - Taxonomic data (10,000+ species)
- `observations` - Observation records (800+ with location)
- `traits` - Fungal traits
- `genomes` - DNA sequence data
- `compounds` - Bioactive compounds
- `synonyms` - Taxonomic synonyms
- `external_ids` - Cross-references to external databases
- `etl_runs` - ETL execution logs

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/mindex/health` | Health check |
| `GET /api/mindex/stats` | Aggregated statistics |
| `GET /api/mindex/taxa` | List taxa with pagination |
| `GET /api/mindex/observations` | List observations |
| `GET /api/mindex/etl/status` | ETL pipeline status |

### NAS Integration

- Mount point: `/opt/mycosoft/media/mindex-backups`
- Backup schedule: Daily at 2 AM
- Retention: 7 days

---

## 3. UI/UX Implementation

### MINDEX Dashboard Features

The MINDEX Infrastructure dashboard (`/natureos/mindex`) includes:

1. **Overview Section**
   - API Status (Online/Offline)
   - Database Connection Status
   - ETL Pipeline Status
   - Total Taxa Count

2. **Live Data Visualization**
   - Live Data Blocks (3D isometric blocks with animated hashes)
   - Hash Stream (real-time hash values)
   - Tron-inspired circuit animations

3. **Data Statistics**
   - Observations count with location/image breakdown
   - Data sources breakdown (iNat, GBIF, etc.)
   - Biological data (Genomes, Traits, Synonyms)
   - Recent Activity feed

4. **Side Panel Navigation**
   - Overview
   - Encyclopedia
   - Data Pipeline
   - Integrity
   - Cryptography
   - Ledger
   - Network
   - Phylogeny
   - Devices
   - M-Wave
   - Containers

### Design System

- **Color Scheme**: Purple-dominant with cyan accents
- **Animations**: Tron-inspired circuit lines, glassmorphism
- **Typography**: Monospace for hashes, system fonts for content

---

## 4. Deployment Process

### Git Commit

```
8870af0 Fix TypeError: e.id.slice - wrap all .id string methods with String()
```

### Deployment Steps

1. ✅ Push to GitHub main branch
2. ✅ Run `MASTER_DEPLOY.py --quick`
3. ✅ Git pull on VM (code at 8870af0)
4. ✅ Docker image rebuilt
5. ✅ Container restarted
6. ✅ Local verification (HTTP 200)
7. ⚠️ Cloudflare cache purge (manual required)
8. ✅ Sandbox endpoint responding

---

## 5. Cloudflare Cache Purge Instructions

The Cloudflare cache is serving old JavaScript bundles. To fix:

### Option 1: Cloudflare Dashboard

1. Go to https://dash.cloudflare.com
2. Select `mycosoft.com` zone
3. Navigate to **Caching** → **Configuration**
4. Click **Purge Everything**

### Option 2: API (requires token)

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

### Option 3: Hard Refresh

Users can do a hard refresh:
- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

---

## 6. Current System Status

### Local Development (localhost:3010)
- ✅ All features working
- ✅ No JavaScript errors
- ✅ Live data visualization active
- ✅ Real data from MINDEX API (10,000 taxa, 800 observations)

### Sandbox (sandbox.mycosoft.com)
- ⚠️ Cloudflare serving cached JS
- ⚠️ `e.id.slice` error until cache purge
- ✅ Backend API responding
- ✅ Database connected

### Verification URLs

After Cloudflare purge, verify at:
- Dashboard: https://sandbox.mycosoft.com/natureos/mindex
- API Health: https://sandbox.mycosoft.com/api/natureos/mindex/health
- API Stats: https://sandbox.mycosoft.com/api/natureos/mindex/stats

---

## 7. Known Issues

1. **Hydration Warning**: `Math.random()` in `DataBlockViz` causes SSR/client mismatch (cosmetic only)
2. **Missing Endpoints**: `/api/natureos/mindex/sync` returns 404 (not implemented yet)
3. **Docker Containers**: `/api/docker/containers` returns 503 when Docker socket not accessible

---

## 8. Next Steps

1. [ ] Purge Cloudflare cache
2. [ ] Verify sandbox works after purge
3. [ ] Implement remaining encyclopedia features
4. [ ] Add real genome/trait/synonym data
5. [ ] Complete data pipeline visualization
6. [ ] Add real-time SSE streaming

---

## Appendix: File Structure

```
website/
├── components/
│   ├── natureos/
│   │   └── mindex-dashboard.tsx       # Main dashboard component
│   ├── ui/
│   │   ├── tron-circuit-animation.tsx # Tron background animation
│   │   ├── data-block-viz.tsx         # 3D isometric blocks
│   │   ├── pixel-grid-viz.tsx         # Pixel grid animation
│   │   └── glowing-border.tsx         # Neon border effect
│   └── mindex/
│       ├── agent-activity.tsx
│       ├── merkle-tree-viz.tsx
│       └── hash-chain-visualizer.tsx
├── app/
│   ├── natureos/
│   │   └── mindex/
│   │       └── page.tsx               # Dashboard page
│   └── api/
│       └── natureos/
│           └── mindex/
│               ├── stats/route.ts     # Stats API (BFF proxy)
│               └── ledger/route.ts    # Ledger status API
└── docs/
    └── MINDEX_DEPLOYMENT_COMPLETE_JAN25_2026.md  # This file
```

---

*Documentation generated on January 25, 2026*
