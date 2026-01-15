# Mycosoft Website

> **Version**: 2.0.0  
> **Last Updated**: 2026-01-15T14:30:00Z  
> **Port**: 3000 (ACTIVE)

## Overview

The Mycosoft Website is the primary platform for the Mycosoft ecosystem, providing:

- **CREP Dashboard** - Real-time environmental situational awareness
- **NatureOS Dashboard** - Earth systems monitoring and simulation
- **MycoBrain Integration** - IoT device management for environmental sensing
- **Species Database** - Comprehensive fungal species information
- **Ancestry Tools** - Phylogenetic analysis and species relationships

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## 📁 Project Structure

```
website/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── dashboard/         # CREP dashboard
│   ├── natureos/          # NatureOS pages
│   ├── devices/           # Device management
│   └── ...
├── components/            # React components
│   ├── crep/             # CREP dashboard components
│   ├── natureos/         # NatureOS components
│   └── ui/               # Shadcn UI components
├── lib/                   # Utilities and clients
│   ├── oei/              # OEI data connectors
│   └── ...
├── services/             # Backend Python services
│   ├── collectors/       # Data collector services
│   ├── geocoding/        # Geocoding pipeline
│   └── mycobrain/        # Device communication
├── docs/                 # Documentation
└── scripts/              # Deployment scripts
```

## 🐳 Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## 📊 Services

| Service | Port | Description |
|---------|------|-------------|
| Website | 3000 | Next.js application |
| MycoBrain | 8765 | Device WebSocket service |
| Aviation Collector | 8101 | Aircraft position data |
| Maritime Collector | 8102 | Vessel position data |
| Satellite Collector | 8103 | Satellite tracking |
| Space Weather | 8104 | Solar activity data |
| Geocoding | 8107 | Location enrichment |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache |

## 📚 Documentation

- [System Architecture](./docs/SYSTEM_ARCHITECTURE.md)
- [CREP Dashboard Guide](./docs/CREP_DASHBOARD_GUIDE.md)
- [Port Assignments](./docs/PORT_ASSIGNMENTS.md)
- [Deployment Checklist](./docs/DEPLOYMENT_CHECKLIST.md)
- [MycoBrain Integration](./docs/MYCOBRAIN_INTEGRATION_COMPLETE.md)

## 🔧 Configuration

Copy `.env.example` to `.env.local` and configure:

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
MINDEX_API_URL=http://localhost:8001
```

## 🧪 Testing

```bash
# Run linter
npm run lint

# Run tests
npm run test

# Run integration tests
npm run test:integration
```

## 🚢 Production Deployment

See [Deployment Checklist](./docs/DEPLOYMENT_CHECKLIST.md) for full instructions.

```powershell
# Create snapshot and deploy to Proxmox
.\scripts\deploy-to-proxmox.ps1
```

## ⚠️ Important Notes

1. **This is the ACTIVE codebase** - All development should happen here
2. The deprecated `mycosoft-mas` dashboard (port 3001) should NOT be used
3. All services are containerized for single-snapshot deployment

## 📝 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.

## 📜 License

Copyright © 2026 Mycosoft. All rights reserved.
