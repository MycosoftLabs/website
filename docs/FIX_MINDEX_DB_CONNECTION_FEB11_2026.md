# Fix MINDEX Database Connection Error

## Symptoms

- MINDEX API is reachable at `http://192.168.0.189:8000`
- Health endpoint returns `"db": "error"` or `"database": false`
- Species Explorer shows "MINDEX Database Connection Error"
- Dashboard shows Database status as "Disconnected"
- All data endpoints return empty results or 500 errors

## Quick Fix

SSH to the MINDEX VM and restart the Docker containers:

```bash
# 1. SSH to MINDEX VM
ssh mycosoft@192.168.0.189

# 2. Navigate to MINDEX directory
cd /home/mycosoft/mindex

# 3. Restart all containers (PostgreSQL, API, Redis, Qdrant)
docker compose restart

# 4. Wait for services to initialize
sleep 10

# 5. Verify database is connected
curl http://localhost:8000/api/mindex/health
# Expected: {"status": "ok", "db": "ok", ...}
```

## Verification

After restarting, verify from your local machine:

```bash
# Health check (should show db: "ok")
curl http://192.168.0.189:8000/api/mindex/health

# Taxa endpoint (should return data)
curl http://192.168.0.189:8000/api/mindex/taxa?limit=1

# Stats endpoint (should show counts > 0)
curl http://192.168.0.189:8000/api/mindex/stats
```

On the website:
- **Dashboard**: `http://localhost:3010/natureos/mindex` - Database status should show "Connected"
- **Species Explorer**: `http://localhost:3010/natureos/mindex/explorer` - Should display species catalog
- **Public Portal**: `http://localhost:3010/mindex` - Live stats should show real counts

## Root Cause

The PostgreSQL container on VM 189 occasionally loses its connection, typically after:
- VM reboot or power cycle
- Docker daemon restart
- Disk space issues on the VM
- Long periods of inactivity

## Alternative Fix (PowerShell from Windows admin machine)

```powershell
cd C:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\scripts
.\restart-mindex-vm.ps1
```

## VM Architecture Reference

| VM | IP | Role | Port |
|----|-----|------|------|
| Sandbox | 192.168.0.187 | Website (Docker), Mycorrhizae | 3000, 8002 |
| MAS | 192.168.0.188 | Multi-Agent System | 8001 |
| MINDEX | 192.168.0.189 | Database (PostgreSQL, Qdrant, Redis) | 8000 |

## Environment Variables

Ensure these are set in `.env.local`:

```env
MINDEX_API_URL=http://192.168.0.189:8000
MINDEX_API_BASE_URL=http://192.168.0.189:8000
NEXT_PUBLIC_MINDEX_URL=http://192.168.0.189:8000
```

## Related Documentation

- [MINDEX Fixes Complete (Feb 11, 2026)](./MINDEX_FIXES_COMPLETE_FEB11_2026.md)
- [MINDEX Backend Integration Fix (Feb 11, 2026)](./MINDEX_BACKEND_INTEGRATION_FIX_FEB11_2026.md)
