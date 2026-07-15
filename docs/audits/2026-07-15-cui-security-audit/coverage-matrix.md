# Coverage Matrix — Lane A (Claude) · 2026-07-15

Maps each check performed to the NIST 800-171 controls it exercises, and states what was covered vs. deferred. Honesty rule: "covered" = a real command/API was run and its output examined; "deferred" = not run this pass (never silently treated as compliant).

| # | Check | Tool / evidence | NIST 800-171 | Result |
|---|---|---|---|---|
| A1.1 | Tracked-secret file scan (.env/.pem/.key/credentials) | `git ls-files` filter | 3.1.1, 3.13.11 | Covered — only `.env.example` templates tracked; clean |
| A1.2 | Hardcoded key-pattern scan (source) | `git grep` regex (sk-/AKIA/gh_/xox/PEM/JWT) | 3.13.11 | Covered — setup-ssh/Dockerfile hits = false positives (secret refs) |
| A1.3 | Committed API key | `git grep` AIza + history | 3.5.2, 3.13.10 | **Finding 0001 (HIGH)** — Google Maps key in 4 files + history |
| A1.4 | Git-history secret scan | `git log --follow` | 3.13.11 | Covered — key traced to commit 753a7bb2 |
| A1.5 | CUI/export-marking scan | `git grep` CUI//‖FOUO‖ITAR‖NOFORN | 3.1.22, 3.8.4 | Covered — hits are compliance-tooling/public-data, no CUI-doc leak |
| A1.6 | PII scan (SSN) | `git grep` \d3-\d2-\d4 | 3.1.22 | Covered — no PII leak (geojson phone-number false positives) |
| A1.7 | Dependency CVEs | `npm audit --json` | 3.14.1, 3.11.2 | **Finding 0008 (LOW)** — 1 high (undici), 10 mod, 5 low |
| A1.8 | Build/temp hygiene | `git ls-files` | 3.1.22 | **Finding 0010 (LOW)** — temp files tracked |
| A1.13 | CMMC module integrity | ingest verifier + MD5 | 3.12.x | Covered — reference MD5 `abca7ab1…`, SPRS gated, posture honest |
| A2.1 | Repo visibility | `gh repo view` | 3.1.3, 3.1.22 | Covered — **PUBLIC** (amplifies 0001) |
| A2.2 | Branch protection | `gh api …/branches/main/protection` | 3.4.3, 3.4.5, 3.12.2 | **Finding 0004 (MED)** — not protected |
| A2.3 | Outside collaborators | `gh api …/collaborators?affiliation=outside` | 3.1.1 | Covered — none |
| A2.4 | Secret scanning / push protection | `gh api …/security_and_analysis` | 3.14.6 | Covered — both enabled (positive) |
| A2.5 | Org 2FA / members / OAuth / PAT | `gh api /orgs/MycosoftLabs` | 3.5.3 | **Deferred — Finding 0011** (token lacks org-owner scope) |
| A3.Supabase.1 | RLS policy review | MCP get_advisors(security) | 3.1.1, 3.1.2 | **Findings 0003, 0007** |
| A3.Supabase.2 | SECURITY DEFINER exposure | MCP get_advisors | 3.1.5–3.1.7 | **Finding 0002 (MED)** |
| A3.Supabase.3 | Function search_path | MCP get_advisors | 3.14.1, 3.4.2 | **Finding 0005 (LOW)** |
| A3.Supabase.4 | Public storage buckets | MCP get_advisors | 3.1.22 | **Finding 0006 (LOW)** |
| A3.Supabase.5 | Project inventory | MCP list_projects | 3.4.1, 3.8.9 | **Finding 0009 (LOW)** — 2 orphaned projects |
| A3.AWS/Vercel/CF/Workspace/Gmail | Cloud-console audit | — | 3.1.x, 3.13.x | **Deferred** — requires operator credentialed login (out of automated scope) |
| A4.1 | Security headers / TLS | `curl -sI https://mycosoft.com` | 3.13.8, 3.13.15 | Covered — strong (CSP/HSTS-preload/XFO/nosniff), positive |
| A4.2 | External port exposure (Shodan/Censys) | — | 3.13.1 | **Deferred** — no scanner/API key this pass |
| A4.3 | DNS / cert-transparency / subdomain enum | — | 3.13.1 | **Deferred** — recommend crt.sh + subfinder next pass |
| A5 | Policy/SSP document cross-check | file check | 3.12.x | Covered — 14 policies + IR runbook generated (`Downloads/cmmc_l2_policies/`); POA&M = 1 item (AU.L2-3.3.4) |
| — | Teaming-partner ("zeetachec") | `git grep` | — | Covered — zero (self-perform upheld) |
| — | Name integrity (Rockcoons/Ricasata) | `git grep` | — | Covered — no misuse (geojson false positives reviewed) |

**Families touched by Lane A findings:** AC (3.1.1/.2/.5/.6/.7/.22), AU (3.3.8/.9), CM (3.4.1/.3/.5), IA (3.5.2/.3), RA (3.11.2), SC (3.13.10/.11), SI (3.14.1).
**Families needing Lane B / operator for full coverage:** PE (physical), MA (maintenance), MP (media), and the network/endpoint/cloud-console portions of AC/AU/SC/SI.
