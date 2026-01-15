# Changelog

All notable changes to the Mycosoft Website are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-01-15

### Added
- **CREP Dashboard Enhancements**
  - Zoom-based aircraft filtering to reduce map clutter
  - Animated trajectory lines for aircraft and vessels
  - Enhanced marker popups with detailed data
  - Fungal observation markers from MINDEX
  - MycoBrain device real-time markers

- **Data Collectors**
  - Aviation collector service (OpenSky Network)
  - Maritime collector service (AISstream)
  - Satellite collector service (CelesTrak)
  - Space weather collector service (NOAA SWPC)

- **Geocoding Pipeline**
  - Automatic GPS enrichment for MINDEX observations
  - Nominatim and Photon provider support
  - Redis and SQLite caching layers

- **MINDEX Event Logging**
  - Redis pub/sub for real-time event streaming
  - Local SQLite buffer for offline resilience
  - Batch event logging to MINDEX API

- **Infrastructure**
  - Comprehensive docker-compose.yml for all services
  - Proxmox deployment scripts
  - GitHub Actions CI/CD pipeline
  - Prometheus and Grafana monitoring

- **Documentation**
  - System Architecture document
  - CREP Dashboard user guide
  - Port assignments reference
  - Deployment checklist
  - Updated all READMEs

### Changed
- Removed artificial data limits on global events
- Enabled all data layers by default
- Improved data fetching intervals

### Fixed
- Maritime vessel visibility on CREP dashboard
- Fungal observation markers not displaying
- Aircraft trajectory lines not animating
- Event data caps limiting displayed information

### Deprecated
- mycosoft-mas dashboard (port 3001) - Use website (port 3000) instead

---

## [1.5.0] - 2026-01-14

### Added
- MycoBrain device integration
- WebSocket real-time communication
- Device management pages

### Fixed
- MycoBrain connection issues
- Device discovery on local network

---

## [1.4.0] - 2026-01-13

### Added
- NatureOS dashboard integration
- Live map with real-time data
- Earth simulator components

---

## [1.3.0] - 2026-01-10

### Added
- Species ancestry explorer
- Phylogenetic tree visualization
- MINDEX API integration

---

## [1.2.0] - 2026-01-05

### Added
- Compound simulator
- Growth analytics
- Petri dish simulator

---

## [1.1.0] - 2025-12-20

### Added
- Initial CREP dashboard
- Basic map functionality
- OEI data connectors

---

## [1.0.0] - 2025-12-01

### Added
- Initial release
- Next.js 15 with App Router
- Shadcn UI components
- Authentication system
- Species database
