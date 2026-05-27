# Live System Connections Audit

Generated: 2026-05-27T09:01:16.342Z

## Scope

- Website API/BFF routes for MYCA, MAS, MINDEX, CREP, Eagle Eye, search, and health.
- Direct MAS and MINDEX health surfaces when configured.
- Supabase REST reachability when configured.
- Code-level risk scan for loopback defaults, response-key leaks, and secret-like literals.

## Findings

- MEDIUM: Slow integration probes exceed public MYCA target 4 probes took longer than 3000 ms.
- MEDIUM: website still has loopback service defaults 120 file(s) reference loopback service ports. Verify each is dev-only or routed through a resolver.
- CRITICAL: mas contains secret-like literals in source/documentation 118 file(s) matched secret-like patterns. Paths only are included in the report.
- MEDIUM: mas still has loopback service defaults 120 file(s) reference loopback service ports. Verify each is dev-only or routed through a resolver.
- CRITICAL: mindex contains secret-like literals in source/documentation 16 file(s) matched secret-like patterns. Paths only are included in the report.
- MEDIUM: mindex still has loopback service defaults 57 file(s) reference loopback service ports. Verify each is dev-only or routed through a resolver.

## Probe Results

| Group | Probe | Method | Path | Target | Status | Latency | OK |
| --- | --- | --- | --- | --- | ---: | ---: | --- |
| website | website-health | GET | /api/health | loopback | 200 | 4141ms | yes |
| crep | crep-health | GET | /api/crep/health | loopback | 200 | 648ms | yes |
| myca | myca-connectivity | GET | /api/myca/connectivity | loopback | 200 | 3650ms | yes |
| myca | myca-live-activity | GET | /api/myca/live-activity | loopback | 200 | 5288ms | yes |
| myca | myca-orchestrator-get | GET | /api/mas/voice/orchestrator | loopback | 200 | 44ms | yes |
| myca | myca-chat-smoke | POST | /api/mas/voice/orchestrator | loopback | 200 | 2868ms | yes |
| mas | website-mas-health-proxy | GET | /api/mas/health | loopback | 200 | 1471ms | yes |
| mindex | website-mindex-health-proxy | GET | /api/mindex/health | loopback | 200 | 2517ms | yes |
| mindex | natureos-mindex-health | GET | /api/natureos/mindex/health | loopback | 200 | 473ms | yes |
| crep | crep-fungal-san-diego | GET | /api/crep/fungal?north=33.20&south=32.45&east=-116.70&west=-117.35&limit=200 | loopback | 200 | 19889ms | yes |
| mas | direct-mas-health | GET | /health | private-lan | 200 | 136ms | yes |
| mas | direct-mas-myca-ping | GET | /api/myca/ping | private-lan | 200 | 1018ms | yes |
| mindex | direct-mindex-root-health | GET | /health | private-lan | 200 | 1017ms | yes |
| mindex | direct-mindex-health | GET | /api/mindex/health | private-lan | 200 | 1037ms | yes |
| mindex | direct-mindex-health-all | GET | /api/mindex/health/all | private-lan | 200 | 18ms | yes |
| supabase | supabase-rest-root | GET | /rest/v1/ | public-supabase | 401 | 67ms | yes |

## Route Inventory

Total website API route files: 658
- myca: 46
- mas: 41
- mindex: 66
- natureos: 81
- crep: 37
- eagle: 17
- search: 33
- health: 14
- supabase: 0

## Notes

- This report intentionally redacts concrete service URLs, raw response bodies, keys, tokens, and DSNs.
- Secret-like scan entries are file paths and pattern labels only; inspect and rotate credentials separately if any are real.
- Deployment is not performed by this audit.
