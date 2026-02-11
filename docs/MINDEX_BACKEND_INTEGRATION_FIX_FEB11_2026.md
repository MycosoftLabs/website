# MINDEX Backend Integration Fix - February 11, 2026

## Issues Fixed

### 1. Mycorrhizae SDK Key Requirement ✅
**Problem**: The Mycorrhizae client SDK required manual API key configuration, causing friction in development.

**Solution**: 
- Added automatic dev key generation in `lib/mindex/mycorrhizae/client.ts`
- The client now auto-generates a development key if none is provided
- Production keys still use environment variables, but dev mode "just works"

```typescript
private generateDevKey(): string {
  if (typeof window === "undefined" && env.isDevelopment) {
    return `myco_dev_${Date.now().toString(36)}`
  }
  return ""
}
```

### 2. MINDEX API URL Pointing to Wrong VM ✅
**Problem**: Multiple files pointed MINDEX API to MAS VM (192.168.0.188:8001) instead of dedicated MINDEX VM (192.168.0.189:8000).

**Solution**: Updated all MINDEX API URLs across the codebase:

**Files Updated:**
- `lib/services/mindex-api.ts` - Changed default URL to 189:8000
- `lib/env.ts` - Updated canonical MINDEX API base URL with comment explaining VM layout
- `lib/mindex/mycorrhizae/client.ts` - Updated default Mycorrhizae URL to 187:8002

**VM Layout (Canonical):**
| VM | IP | Role | Port |
|----|-----|------|------|
| Sandbox | 192.168.0.187 | Website (Docker), Mycorrhizae | 3000, 8002 |
| MAS | 192.168.0.188 | Multi-Agent System | 8001 |
| MINDEX | 192.168.0.189 | Database (PostgreSQL, Qdrant, Redis) | 8000 |

### 3. Infrastructure Dashboard Integration ✅
**Status**: The `/natureos/mindex` infrastructure dashboard already properly integrates with the backend:

- ✅ Health checks via `/api/natureos/mindex/health`
- ✅ Stats from `/api/natureos/mindex/stats`
- ✅ Real-time taxa and observations data
- ✅ ETL sync triggering via `/api/natureos/mindex/sync`
- ✅ 12 dashboard sections with live data:
  - Overview
  - Encyclopedia
  - Data Pipeline
  - Integrity
  - Cryptography
  - Ledger
  - Network
  - Phylogeny
  - Genomics
  - Devices
  - M-Wave
  - Containers

### 4. Public MINDEX Page Updates ✅
**Problem**: Public `/mindex` page didn't showcase all MINDEX capabilities or provide proper navigation.

**Solution**: Updated `components/mindex/mindex-portal.tsx`:

**Added Capabilities Section** showing 12 major features:
1. Species Encyclopedia (5,500+ taxa)
2. Data Pipeline (ETL sync, quality metrics)
3. Integrity Verification (hash chains, timestamps)
4. Cryptography (SHA-256, Merkle trees)
5. Ledger Anchoring (Bitcoin, Solana, Hypergraph)
6. Mycorrhizal Network (protocol mesh)
7. Phylogenetic Trees (evolutionary relationships)
8. Genomics Browser (JBrowse, Gosling, Circos)
9. FCI Devices (MycoBrain monitoring)
10. M-Wave Analysis (seismic correlation)
11. Docker Containers (infrastructure monitoring)
12. Species Explorer (interactive map)

**Added Navigation Links**:
- Hero section now has 3 CTA buttons:
  - Open MINDEX Dashboard → `/natureos/mindex`
  - Species Explorer → `/natureos/mindex/explorer`
  - View Documentation → `#documentation`
- Bottom CTA section also updated with all 3 links

**Added Missing Icon Imports**:
- `BookOpen`, `Wallet`, `Dna`, `Waves`, `Container`

## API Routes Already Working

All 16 MINDEX API routes already proxy correctly to backend:

| Route | Purpose |
|-------|---------|
| `/api/natureos/mindex/health` | System health check |
| `/api/natureos/mindex/stats` | Database statistics |
| `/api/natureos/mindex/taxa` | Taxa search |
| `/api/natureos/mindex/taxa/[id]` | Single taxon |
| `/api/natureos/mindex/observations` | Observation data |
| `/api/natureos/mindex/sync` | ETL sync trigger |
| `/api/natureos/mindex/etl-status` | ETL pipeline status |
| `/api/natureos/mindex/search` | Full-text search |
| `/api/natureos/mindex/compounds` | Chemical compounds |
| `/api/natureos/mindex/phylogeny` | Phylogenetic data |
| `/api/natureos/mindex/genes/[species]` | Genome data |
| `/api/natureos/mindex/genomes` | Genome records |
| `/api/natureos/mindex/devices` | FCI devices |
| `/api/natureos/mindex/containers` | Docker containers |
| `/api/natureos/mindex/mwave` | M-Wave analysis |
| `/api/natureos/mindex/ledger` | Blockchain ledger status |

## Testing Checklist

### Local Dev (Port 3010)
- [x] Page loads without errors
- [x] Icons render correctly
- [x] Links navigate properly
- [x] Live stats fetch from API

### Pages to Test
1. **Public Portal** - http://localhost:3010/mindex
   - Capabilities section displays all 12 features
   - Hero CTA buttons link correctly
   - Live stats update from backend

2. **Infrastructure Dashboard** - http://localhost:3010/natureos/mindex
   - Health status shows API/DB connectivity
   - Stats display taxa and observation counts
   - All 12 sections accessible via sidebar
   - Data syncs from VM 189:8000

3. **Species Explorer** - http://localhost:3010/natureos/mindex/explorer
   - Map loads with observation pins
   - Data fetches from backend

## Deployment Steps

1. **Commit changes**:
   ```bash
   git add .
   git commit -m "Fix MINDEX backend integration and update public portal"
   ```

2. **Push to GitHub**:
   ```bash
   git push origin main
   ```

3. **Deploy to Sandbox VM (187)**:
   ```bash
   ssh mycosoft@192.168.0.187
   cd /opt/mycosoft/website
   git pull
   docker build -t mycosoft-always-on-mycosoft-website:latest --no-cache .
   docker stop mycosoft-website && docker rm mycosoft-website
   docker run -d --name mycosoft-website -p 3000:3000 \
     -v /opt/mycosoft/media/website/assets:/app/public/assets:ro \
     --restart unless-stopped mycosoft-always-on-mycosoft-website:latest
   ```

4. **Purge Cloudflare cache**:
   - Go to Cloudflare dashboard
   - Select mycosoft.com zone
   - Caching → Purge Everything

5. **Verify on sandbox.mycosoft.com**:
   - Check https://sandbox.mycosoft.com/mindex
   - Check https://sandbox.mycosoft.com/natureos/mindex
   - Verify API connectivity to 192.168.0.189:8000

## Environment Variables

Ensure `.env.local` has correct VM URLs:

```env
# MINDEX (VM 189:8000)
MINDEX_API_URL=http://192.168.0.189:8000
MINDEX_API_BASE_URL=http://192.168.0.189:8000
NEXT_PUBLIC_MINDEX_URL=http://192.168.0.189:8000

# MAS (VM 188:8001)
MAS_API_URL=http://192.168.0.188:8001
NEXT_PUBLIC_MAS_API_URL=http://192.168.0.188:8001

# Mycorrhizae (VM 187:8002)
MYCORRHIZAE_API_URL=http://192.168.0.187:8002

# Auto-generated keys (optional for dev)
MYCORRHIZAE_PUBLISH_KEY=myco_pub_[auto-generated]
MINDEX_API_KEY=mindex_[auto-generated]
```

## Related Documentation

- [VM Layout](./VM_LAYOUT_AND_DEV_REMOTE_SERVICES_FEB06_2026.md)
- [MINDEX System Registry](../mycosoft-mas/docs/SYSTEM_REGISTRY_FEB04_2026.md)
- [API Catalog](../mycosoft-mas/docs/API_CATALOG_FEB04_2026.md)
- [Deployment Pipeline](./DEV_TO_SANDBOX_PIPELINE_FEB06_2026.md)

---

**Status**: ✅ All fixes complete and tested locally
**Next**: Deploy to Sandbox VM and verify on sandbox.mycosoft.com
