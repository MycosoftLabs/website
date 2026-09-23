# ITDX v2.0 local demo dual-mode — 17 Sep 2026

**Date:** 17 September 2026  
**Status:** Scaffolded on localhost:3010. **Not deployed.**  
**CFO:** RJ Ricasata.

**ChatGPT software-builder contract:** `MAS/mycosoft-mas/docs/ITDX_V2_CHATGPT_BUILDER_HANDOFF_SEP17_2026.md` (mirror `CODE/docs/ITDX_V2_CHATGPT_BUILDER_HANDOFF_SEP17_2026.md`). Slides stay in `ITDX_V2_CHATGPT_SLIDE_HANDOFF_SEP17_2026.md`.

## URLs

- Demo board: `http://localhost:3010/fusarium/itdx/v2`
- Trail AR: `http://localhost:3010/natureos/bluesight-trail`
- Fusarium lab: `http://localhost:3010/fusarium/itdx`

## Mode choice

`lib/fusarium/itdx/connectivity.ts` probes MAS `/health`, MINDEX `/health`, and MAS `/api/nlm/health` with a 3500 ms abort (never 45s).

- MAS HTTP 200 and not forced → **ONLINE (backends bound)**
- Else or `?force=offline` / `ITDX_FORCE_OFFLINE=1` → **OFFLINE LOCAL WEKA** (`wan_status: WAN_DOWN` when forced)
- NLM is **LAN-independent**: if 188 `/api/nlm/health` answers, chip is **NLM ONLINE / weights loaded**. `forecast_p` null = **FORECAST_ABSTAIN**, not UNBOUND. Only a failed NLM health call is **MAS_NLM_DOWN**.

## Local WEKA writes

`POST /api/fusarium/itdx/local-weka` runs real Java CLI and writes:

`website/.data/weka-campaign/SEP17_2026_LOCAL/scores.json`  
`website/.data/weka-campaign/SEP17_2026_LOCAL/scores.csv`  
plus stdout sidecars and a normalized fixture ARFF.

Sep 14 compatibility receipts stay at `website/.data/weka-campaign/SEP14_2026/`.

Honesty: fixture F1 = SYNTHETIC. Trail F1 = not yet scored. `forecast_p` null. WEKA ≠ NLM.

17 Sep local CLI (already written): ZeroR fixture 57.5% SYNTHETIC (weighted F1 null); J48 fixture 97.5% / 0.975 SYNTHETIC; trail J48 ignored 489222 unlabeled; SimpleKMeans 848/796/356 WCSS 1860.83 ARI not yet scored.
