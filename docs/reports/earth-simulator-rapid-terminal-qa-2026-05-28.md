# Earth Simulator Rapid Terminal QA

Date: 2026-05-28
Surface: `http://localhost:3010`
Scope: fast terminal smoke for Earth Simulator, search Earth widgets, devices, events, fungi, satellites, buoys, Eagle cameras, and responsive mobile/tablet layout.

## Commands

```powershell
npx.cmd tsc --noEmit --pretty false --incremental false
npx.cmd jest lib/search/__tests__/search-plan.test.ts --runInBand
Invoke-WebRequest http://localhost:3010/natureos/earth-simulator?_codex_health=2
node <endpoint smoke>
node <responsive smoke>
```

## Results

| Check | Result | Notes |
| --- | --- | --- |
| TypeScript | Pass | `npx.cmd tsc --noEmit --pretty false --incremental false` completed with no errors. |
| Search plan Jest | Pass | 7 tests passed in `lib/search/__tests__/search-plan.test.ts`. |
| Dev server | Pass | Port `3010` listening; Earth Simulator route returned `200`. |
| Home page | Pass | `200`, 122 ms in final rapid endpoint probe. |
| Earth Simulator page | Pass | `200`, 98 ms in final rapid endpoint probe. |
| Search devices page | Pass | `200`, 91 ms in final rapid endpoint probe. |
| Search devices API | Pass | `200`, `totalCount: 2`, source `live`. |
| Search earthquakes API | Pass | `200`, `totalCount: 1480`, source `live`. |
| Earth devices API | Pass, slow | `200`, 2 devices: Mushroom 1 and Hyphae 1; 7106 ms. |
| San Diego fungi API | Pass, moderate | `200`, 233 observations; 3473 ms. |
| Global events API | Pass, moderate | `200`, 200 events; 2875 ms. |
| Satellites API | Pass | `200`, 100 satellites, source `satnogs`; 54 ms. |
| Buoys API | Pass | `200`, 856 buoys, source `cache`; 58 ms. |
| Eagle camera sources | Pass | `200`, 20 sources for San Diego bbox; 67 ms. |
| San Diego viewport intel | Pass | `200`, resolves San Diego, San Diego County, California, United States; 64 ms. |
| Tablet responsive smoke | Pass | Desktop/tablet panels visible, classification strip absent. |
| Phone responsive smoke | Pass | Mobile mode active, NatureOS sidebar hidden, map full width, footer hidden, Intel and MYCA bottom sheets open correctly. |

## Artifacts

- JSON endpoint report: `docs/reports/earth-simulator-rapid-terminal-qa-2026-05-28.json`
- JSON responsive report: `docs/reports/earth-simulator-responsive-smoke-2026-05-28.json`
- Phone initial screenshot: `screenshots/earth-responsive-phone-initial-final2-2026-05-28.png`
- Phone Intel sheet screenshot: `screenshots/earth-responsive-phone-intel-final2-2026-05-28.png`
- Phone MYCA sheet screenshot: `screenshots/earth-responsive-phone-myca-final2-2026-05-28.png`
- Tablet screenshot: `screenshots/earth-responsive-tablet-final-2026-05-28.png`

## Issues Still Visible

- Device endpoint is too slow for a hot UI path at roughly 7 seconds in the rapid probe.
- San Diego fungi data exists but still depends on MINDEX/iNaturalist latency; this must continue moving toward hot MINDEX storage.
- Dev logs still show upstream timeout warnings around MINDEX/proxy/fungal taxa paths.
- This report is local-only. It does not prove production health or deployment safety.

## Recommendation

Do not deploy based only on this rapid terminal pass. Use it as a fast green signal, then run a focused browser QA pass for phone/tablet/desktop and split the dirty worktree into scoped commits before any blue-green deployment.
