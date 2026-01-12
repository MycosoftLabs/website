# Environment Configuration

## Required Environment Variables

Create a `.env.local` file in the website root with these variables:

```bash
# MINDEX API Configuration
MINDEX_API_URL=http://localhost:8000
MINDEX_API_KEY=local-dev-key

# Database (Neon - optional fallback for ancestry data)
# NEON_DATABASE_URL=postgresql://user:pass@host/db

# Next.js
NODE_ENV=development
```

## MINDEX Connection

The website connects to MINDEX API for:
- Species data (`/api/mindex/taxa`)
- Search functionality
- Taxonomy information
- Telemetry data

**Default local configuration:**
- URL: `http://localhost:8000`
- API Key: `local-dev-key`

## Starting MINDEX

```bash
cd C:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex
docker-compose up -d
```

## Verifying Connection

```bash
curl -H "X-API-Key: local-dev-key" http://localhost:8000/api/mindex/health
```

Expected response:
```json
{"status": "ok", "db": "ok", "service": "mindex"}
```
