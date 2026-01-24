## MINDEX gRPC (v2 scaffold)

This directory provides the **gRPC surface area** for high-throughput telemetry ingestion and bidirectional command streams.

### Status

- **Proto defined**: `mindex.proto`
- **Server implementation**: to be implemented in the MINDEX backend service (not the Next.js website)

### Why it lives here

The website repo ships shared contracts for clients, dashboards, and agent tooling. The authoritative service implementation should run alongside the MINDEX API (FastAPI stack).

