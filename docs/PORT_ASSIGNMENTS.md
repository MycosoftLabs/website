# Mycosoft Port Assignments

> **Last Updated**: 2026-01-15T14:30:00Z  
> **Version**: 2.0.0

## ⚠️ IMPORTANT: Active Codebase

| System | Port | Status |
|--------|------|--------|
| **Mycosoft Website** | **3000** | ✅ ACTIVE |
| ~~MAS Dashboard~~ | ~~3001~~ | ❌ DEPRECATED |

---

## Core Services

| Port | Service | Protocol | Container | Description |
|------|---------|----------|-----------|-------------|
| 3000 | Website | HTTP | mycosoft-website | Next.js main application |
| 3030 | Grafana | HTTP | mycosoft-grafana | Monitoring dashboards |
| 5432 | PostgreSQL | TCP | mycosoft-postgres | Primary database |
| 5678 | N8n | HTTP | mycosoft-n8n | Workflow automation |
| 6379 | Redis | TCP | mycosoft-redis | Cache layer |
| 8765 | MycoBrain | WS/HTTP | mycosoft-mycobrain | Device communication |
| 9090 | Prometheus | HTTP | mycosoft-prometheus | Metrics collection |

---

## Data Collectors

| Port | Service | Protocol | Container | Data Source |
|------|---------|----------|-----------|-------------|
| 8101 | Aviation | HTTP | mycosoft-aviation | OpenSky Network |
| 8102 | Maritime | HTTP | mycosoft-maritime | AISstream |
| 8103 | Satellite | HTTP | mycosoft-satellite | CelesTrak |
| 8104 | Space Weather | HTTP | mycosoft-spaceweather | NOAA SWPC |
| 8105 | Carbon Mapper | HTTP | mycosoft-carbon | CarbonMapper API |
| 8106 | Railway | HTTP | mycosoft-railway | OpenRailwayMap |
| 8107 | Geocoding | HTTP | mycosoft-geocoding | Nominatim/Photon |

---

## External Integrations

| Port | Service | Protocol | Description |
|------|---------|----------|-------------|
| 8001 | MINDEX API | HTTP | Fungal database (external) |
| 6333 | Qdrant | HTTP | Vector database |
| 8443 | UniFi Controller | HTTPS | Network management |
| 8006 | Proxmox API | HTTPS | VM management |

---

## Development Ports

| Port | Service | Description |
|------|---------|-------------|
| 3000 | Next.js Dev | Development server |
| 5555 | Drizzle Studio | Database GUI |
| 9229 | Node Debug | Node.js debugger |

---

## Port Ranges Reserved

| Range | Purpose |
|-------|---------|
| 3000-3099 | Web applications |
| 5000-5999 | Databases & infrastructure |
| 6000-6999 | Cache & messaging |
| 8000-8199 | API services & collectors |
| 9000-9999 | Monitoring & metrics |

---

## Firewall Rules

### Production (Proxmox VM)

```bash
# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow internal services (from specific IPs only)
ufw allow from 192.168.1.0/24 to any port 3000
ufw allow from 192.168.1.0/24 to any port 8765

# Block direct database access
ufw deny 5432/tcp
ufw deny 6379/tcp
```

### Docker Network

All containers communicate via `mycosoft-network` bridge:
- Subnet: `172.28.0.0/16`
- Gateway: `172.28.0.1`

---

## Health Check Endpoints

| Service | URL | Expected Response |
|---------|-----|-------------------|
| Website | `http://localhost:3000/api/health` | `{"status":"ok"}` |
| MycoBrain | `http://localhost:8765/health` | `{"status":"ok"}` |
| Prometheus | `http://localhost:9090/-/healthy` | `OK` |
| Redis | `redis-cli ping` | `PONG` |
| PostgreSQL | `pg_isready` | Exit code 0 |
