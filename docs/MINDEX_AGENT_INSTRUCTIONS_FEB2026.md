# MINDEX Agent Instructions — February 2026

## Overview

MINDEX is the primary data integrity database for the Mycosoft platform. It lives on VM **192.168.0.189:8000** and stores taxa, genetic sequences, compounds, observations, IP assets, and device telemetry. This document describes all currently known issues, their root causes, and the exact steps to fix them.

---

## Current Status of MINDEX Endpoints

| Endpoint | Status | Issue |
|---|---|---|
| `GET /api/mindex/health` | ❌ 404 | Wrong path — correct path is `/api/mindex/health` per OpenAPI, but the router may not be registered |
| `GET /api/mindex/unified-search` | ✅ 200 | Works, but slow (can timeout at 6s) |
| `GET /api/mindex/taxa` | ✅ 200 | Works |
| `GET /api/mindex/compounds` | ✅ 200 | Works |
| `GET /api/mindex/genetics` | ❌ 500 | `bio.genetic_sequence` table schema mismatch |
| `GET /api/mindex/observations` | ❌ 500 | `observations` table missing or schema mismatch |
| `GET /api/mindex/unified-search/taxa/by-location` | ✅ 200 | Returns empty — no observation data loaded |

---

## Critical Issues to Fix

### Issue 1: `GET /api/mindex/genetics` → 500

**Root cause:** The `bio.genetic_sequence` table either does not exist or has a schema mismatch. The genetics router tries to query `bio.genetic_sequence` but encounters an error at runtime.

**Fix steps (SSH to MINDEX VM):**
```bash
ssh mycosoft@192.168.0.189

# Check if the table exists
docker exec -it mindex-postgres psql -U postgres -d mindex -c "\dt bio.*"

# If bio schema missing, create it:
docker exec -it mindex-postgres psql -U postgres -d mindex -c "CREATE SCHEMA IF NOT EXISTS bio;"

# Check current migrations
docker exec mindex-api cat /app/migrations/*.sql | grep genetic_sequence

# Run the genetics migration manually
docker exec mindex-api python -m alembic upgrade head
# OR apply specific migration:
docker exec -it mindex-postgres psql -U postgres -d mindex << 'SQL'
CREATE TABLE IF NOT EXISTS bio.genetic_sequence (
    id SERIAL PRIMARY KEY,
    accession VARCHAR(50) UNIQUE NOT NULL,
    species_name VARCHAR(255),
    gene VARCHAR(50),
    region VARCHAR(50),
    sequence TEXT NOT NULL DEFAULT '',
    sequence_length INTEGER DEFAULT 0,
    sequence_type VARCHAR(20) DEFAULT 'dna',
    source VARCHAR(50) DEFAULT 'genbank',
    source_url TEXT,
    definition TEXT,
    organism VARCHAR(255),
    taxonomy TEXT,
    metadata JSONB DEFAULT '{}',
    pubmed_id INTEGER,
    doi VARCHAR(200),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_genetic_sequence_accession ON bio.genetic_sequence(accession);
CREATE INDEX IF NOT EXISTS idx_genetic_sequence_species ON bio.genetic_sequence(species_name);
CREATE INDEX IF NOT EXISTS idx_genetic_sequence_organism ON bio.genetic_sequence(organism);
SQL

# Restart the MINDEX API container
docker restart mindex-api

# Verify fix
curl -H "X-API-Key: local-dev-key" http://localhost:8000/api/mindex/genetics?limit=1
```

---

### Issue 2: `GET /api/mindex/observations` → 500

**Root cause:** The `observations` table likely has a schema error or a column was added without migration.

**Fix steps:**
```bash
ssh mycosoft@192.168.0.189

# Check observations table
docker exec -it mindex-postgres psql -U postgres -d mindex -c "\d observations"

# Check the error in MINDEX logs
docker logs mindex-api --tail 50 2>&1 | grep -i "observation\|error\|500"

# If table is missing, apply migration 0009:
docker exec -it mindex-postgres psql -U postgres -d mindex << 'SQL'
CREATE TABLE IF NOT EXISTS observations (
    id SERIAL PRIMARY KEY,
    taxon_id INTEGER REFERENCES taxa(id),
    scientific_name VARCHAR(255) NOT NULL,
    common_name VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    observed_at TIMESTAMP,
    observer VARCHAR(255),
    image_url TEXT,
    source VARCHAR(50) DEFAULT 'inaturalist',
    source_id VARCHAR(100),
    quality_grade VARCHAR(20),
    place_guess TEXT,
    is_toxic BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_observations_taxon ON observations(taxon_id);
CREATE INDEX IF NOT EXISTS idx_observations_location ON observations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_observations_scientific ON observations(scientific_name);
SQL

docker restart mindex-api

# Test fix
curl -H "X-API-Key: local-dev-key" "http://localhost:8000/api/mindex/observations?limit=3"
```

---

### Issue 3: Unified Search Timeouts (6s)

**Root cause:** MINDEX unified search queries multiple tables in parallel. Under load or with cold Docker containers, queries exceed the 6s timeout the website enforces.

**Fix steps:**
```bash
ssh mycosoft@192.168.0.189

# Check PostgreSQL slow queries
docker exec -it mindex-postgres psql -U postgres -d mindex << 'SQL'
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
SQL

# Add missing indexes (if queries are slow)
docker exec -it mindex-postgres psql -U postgres -d mindex << 'SQL'
-- Taxa search index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_taxa_name_trgm 
ON taxa USING gin(scientific_name gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_taxa_common_trgm 
ON taxa USING gin(common_name gin_trgm_ops);

-- Enable trigram extension for fast text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Compounds search index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compounds_name_trgm 
ON compounds USING gin(name gin_trgm_ops);
SQL

# Increase shared memory / work_mem for better performance
docker exec -it mindex-postgres psql -U postgres << 'SQL'
ALTER SYSTEM SET work_mem = '16MB';
ALTER SYSTEM SET shared_buffers = '256MB';
SELECT pg_reload_conf();
SQL

# Restart containers to apply
docker restart mindex-postgres mindex-api
```

---

### Issue 4: `taxa/by-location` Returns Empty Data

**Root cause:** Observations table has no data. iNaturalist observations have not been ingested into MINDEX.

**Fix steps (run ETL to populate observations):**
```bash
ssh mycosoft@192.168.0.189
cd /home/mycosoft/mycosoft/mindex

# Run the observations ETL job
docker exec mindex-api python -m mindex_etl.jobs.sync_observations --limit 500

# OR trigger via API if endpoint exists
curl -X POST -H "X-API-Key: local-dev-key" \
  http://localhost:8000/api/mindex/observations/ingest \
  -H "Content-Type: application/json" \
  -d '{"source": "inaturalist", "taxa": ["Amanita", "Psilocybe", "Ganoderma", "Hericium"], "limit": 100}'
```

---

## Deployment Checklist After Fixes

```bash
ssh mycosoft@192.168.0.189

# 1. Verify all containers are running
docker ps | grep mindex

# 2. Check MINDEX API logs for errors  
docker logs mindex-api --tail 100 2>&1 | grep -E "ERROR|500|exception" | tail -20

# 3. Run health check
curl http://localhost:8000/api/mindex/health

# 4. Test each critical endpoint
curl -H "X-API-Key: local-dev-key" "http://localhost:8000/api/mindex/taxa?limit=2"
curl -H "X-API-Key: local-dev-key" "http://localhost:8000/api/mindex/genetics?limit=2"
curl -H "X-API-Key: local-dev-key" "http://localhost:8000/api/mindex/compounds?limit=2"
curl -H "X-API-Key: local-dev-key" "http://localhost:8000/api/mindex/observations?limit=2"
curl -H "X-API-Key: local-dev-key" "http://localhost:8000/api/mindex/unified-search?q=Amanita&limit=3"

# 5. Deploy updated code if needed
cd /home/mycosoft/mycosoft/mindex
git pull origin main
docker compose stop mindex-api
docker compose build --no-cache mindex-api
docker compose up -d mindex-api
```

---

## Website → MINDEX Integration Notes

The website (`192.168.0.187`) connects to MINDEX via:
- `MINDEX_API_URL=http://192.168.0.189:8000`
- API key: `MINDEX_API_KEY` env var (fallback: `local-dev-key`)

The unified search route (`app/api/search/unified/route.ts`) queries MINDEX with a 6s timeout. If MINDEX is slow, the website falls back to external APIs (iNaturalist, PubChem, NCBI, CrossRef).

### Background auto-store (MINDEX keeps growing automatically)
Every search triggers background ingestion into MINDEX:
- Species from iNaturalist → `POST /api/mindex/species/ingest-background`
- Genetics from NCBI → `POST /api/mindex/genetics/ingest-background`
- Compounds from PubChem → `POST /api/mindex/compounds/detail?name=...`
- Compound-species relationships → stored on each compound detail lookup

This means MINDEX grows automatically with each search. Once the genetics and observations tables are fixed, MINDEX will self-populate over time.

---

## MINDEX Data Architecture

```
MINDEX (192.168.0.189:8000)
├── taxa                  ← Species data (works ✅)
├── compounds             ← Chemical compounds (works ✅)  
├── bio.genetic_sequence  ← DNA sequences (500 ❌ — fix Issue 1)
├── observations          ← Field sightings with lat/lng (500 ❌ — fix Issue 2)
├── unified_search        ← Cross-table search (works ✅, slow)
├── mycobrain/            ← Device telemetry (works ✅)
└── research/             ← Research papers (works ✅)
```

---

## Related Website Paths

| Feature | File |
|---|---|
| Unified search API | `app/api/search/unified/route.ts` |
| Genetics detail API | `app/api/mindex/genetics/detail/route.ts` |
| Genetics ingest | `app/api/mindex/genetics/ingest-background/route.ts` |
| Species detail API | `app/api/mindex/species/detail/route.ts` |
| Species ingest | `app/api/mindex/species/ingest-background/route.ts` |
| Compounds detail API | `app/api/mindex/compounds/detail/route.ts` |
| CREP fungal observations | `app/api/crep/fungal/route.ts` |

---

## Quick Diagnostic Commands

```bash
# Is MINDEX reachable?
curl -s http://192.168.0.189:8000/api/mindex/version | python3 -m json.tool

# What's the current MINDEX version?
ssh mycosoft@192.168.0.189 "cd /home/mycosoft/mycosoft/mindex && git log -1 --format='%h %s %ar'"

# Check database size
docker exec -it mindex-postgres psql -U postgres -d mindex -c \
  "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 15;"

# Count records in key tables
docker exec -it mindex-postgres psql -U postgres -d mindex -c \
  "SELECT 'taxa' as t, COUNT(*) FROM taxa UNION ALL SELECT 'compounds', COUNT(*) FROM compounds UNION ALL SELECT 'bio.genetic_sequence', COUNT(*) FROM bio.genetic_sequence;"
```

---

*Last updated: February 2026 | Auto-generated by Mycosoft MYCA coding agent*
