# Live System Connections Audit

Generated: 2026-05-27T06:30:39.227Z

## Scope

- Website API/BFF routes for MYCA, MAS, MINDEX, CREP, Eagle Eye, search, and health.
- Direct MAS and MINDEX health surfaces when configured.
- Supabase REST reachability when configured.
- Code-level risk scan for loopback defaults, response-key leaks, and secret-like literals.

## Findings

- MEDIUM: Slow integration probes exceed public MYCA target 3 probes took longer than 3000 ms.
- CRITICAL: website contains secret-like literals in source/documentation 13 file(s) matched secret-like patterns. Paths only are included in the report.
- MEDIUM: website still has loopback service defaults 120 file(s) reference loopback service ports. Verify each is dev-only or routed through a resolver.
- CRITICAL: mas contains secret-like literals in source/documentation 118 file(s) matched secret-like patterns. Paths only are included in the report.
- MEDIUM: mas still has loopback service defaults 120 file(s) reference loopback service ports. Verify each is dev-only or routed through a resolver.
- CRITICAL: mindex contains secret-like literals in source/documentation 16 file(s) matched secret-like patterns. Paths only are included in the report.
- MEDIUM: mindex still has loopback service defaults 57 file(s) reference loopback service ports. Verify each is dev-only or routed through a resolver.

## Probe Results

| Group | Probe | Method | Path | Target | Status | Latency | OK |
| --- | --- | --- | --- | --- | ---: | ---: | --- |
| website | website-health | GET | /api/health | loopback | 200 | 1511ms | yes |
| crep | crep-health | GET | /api/crep/health | loopback | 200 | 948ms | yes |
| myca | myca-connectivity | GET | /api/myca/connectivity | loopback | 200 | 4475ms | yes |
| myca | myca-live-activity | GET | /api/myca/live-activity | loopback | 200 | 6763ms | yes |
| myca | myca-orchestrator-get | GET | /api/mas/voice/orchestrator | loopback | 200 | 54ms | yes |
| myca | myca-chat-smoke | POST | /api/mas/voice/orchestrator | loopback | 200 | 135ms | yes |
| mas | website-mas-health-proxy | GET | /api/mas/health | loopback | 200 | 2207ms | yes |
| mindex | website-mindex-health-proxy | GET | /api/mindex/health | loopback | 200 | 2834ms | yes |
| mindex | natureos-mindex-health | GET | /api/natureos/mindex/health | loopback | 200 | 1983ms | yes |
| crep | crep-fungal-san-diego | GET | /api/crep/fungal?north=33.20&south=32.45&east=-116.70&west=-117.35&limit=200 | loopback | 200 | 26362ms | yes |
| mas | direct-mas-health | GET | /health | private-lan | 200 | 1135ms | yes |
| mas | direct-mas-myca-ping | GET | /api/myca/ping | private-lan | 200 | 2064ms | yes |
| mindex | direct-mindex-root-health | GET | /health | private-lan | 200 | 10ms | yes |
| mindex | direct-mindex-health | GET | /api/mindex/health | private-lan | 200 | 15ms | yes |
| mindex | direct-mindex-health-all | GET | /api/mindex/health/all | private-lan | 200 | 88ms | yes |
| supabase | supabase-rest-root | GET | /rest/v1/ | public-supabase | 401 | 60ms | yes |

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
