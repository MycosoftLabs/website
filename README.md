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

## ðŸš€ Quick Start

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

## ðŸ“ Project Structure

```
website/
â”œâ”€â”€ app/                    # Next.js App Router
â”‚   â”œâ”€â”€ api/               # API routes
â”‚   â”œâ”€â”€ dashboard/         # CREP dashboard
â”‚   â”œâ”€â”€ natureos/          # NatureOS pages
â”‚   â”œâ”€â”€ devices/           # Device management
â”‚   â””â”€â”€ ...
â”œâ”€â”€ components/            # React components
â”‚   â”œâ”€â”€ crep/             # CREP dashboard components
â”‚   â”œâ”€â”€ natureos/         # NatureOS components
â”‚   â””â”€â”€ ui/               # Shadcn UI components
â”œâ”€â”€ lib/                   # Utilities and clients
â”‚   â”œâ”€â”€ oei/              # OEI data connectors
â”‚   â””â”€â”€ ...
â”œâ”€â”€ services/             # Backend Python services
â”‚   â”œâ”€â”€ collectors/       # Data collector services
â”‚   â”œâ”€â”€ geocoding/        # Geocoding pipeline
â”‚   â””â”€â”€ mycobrain/        # Device communication
â”œâ”€â”€ docs/                 # Documentation
â””â”€â”€ scripts/              # Deployment scripts
```

## ðŸ³ Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## ðŸ“Š Services

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

## ðŸ“š Documentation

- [System Architecture](./docs/SYSTEM_ARCHITECTURE.md)
- [CREP Dashboard Guide](./docs/CREP_DASHBOARD_GUIDE.md)
- [Port Assignments](./docs/PORT_ASSIGNMENTS.md)
- [Deployment Checklist](./docs/DEPLOYMENT_CHECKLIST.md)
- [MycoBrain Integration](./docs/MYCOBRAIN_INTEGRATION_COMPLETE.md)

## ðŸ”§ Configuration

Copy `.env.example` to `.env.local` and configure:

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
MINDEX_API_URL=http://localhost:8001
```

## ðŸ§ª Testing

```bash
# Run linter
npm run lint

# Run tests
npm run test

# Run integration tests
npm run test:integration
```

## ðŸš¢ Production Deployment

See [Deployment Checklist](./docs/DEPLOYMENT_CHECKLIST.md) for full instructions.

```powershell
# Create snapshot and deploy to Proxmox
.\scripts\deploy-to-proxmox.ps1
```

## âš ï¸ Important Notes

1. **This is the ACTIVE codebase** - All development should happen here
2. The deprecated `mycosoft-mas` dashboard (port 3001) should NOT be used
3. All services are containerized for single-snapshot deployment

## ðŸ“ Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.

## ðŸ“œ License

Copyright Â© 2026 Mycosoft. All rights reserved.
