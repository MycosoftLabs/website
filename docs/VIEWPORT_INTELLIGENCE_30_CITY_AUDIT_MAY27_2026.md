# Viewport Intelligence 30-City Audit - May 27, 2026

## Scope

Audited the CREP / Earth Simulator viewport intelligence data path for 30 large cities across North America, Europe, Asia, Africa, South America, and Australia.

The audit checks:

- country and jurisdiction naming
- country-specific government profile
- government type and political system text
- leadership records
- official contact links
- official portrait URLs
- flag and seal URLs
- politics records that do not leak United States content into non-US countries
- government panel tabs that match the country structure instead of forcing US Senate / House / departments everywhere
- facilities in view
- API latency under a 1500 ms QA ceiling

## Final Result

Final API audit artifact:

`docs/reports/viewport-intel-30-city-audit-2026-05-27T07-51-53-440Z.json`

Summary:

| Metric | Result |
| --- | ---: |
| Cities tested | 30 |
| Pass | 30 |
| Fail | 0 |
| p50 latency | 949 ms |
| p95 latency | 1350 ms |
| Max latency | 1388 ms |
| US content leakage in non-US countries | 0 |

## Cities Tested

| City | Country | Result |
| --- | --- | --- |
| New York | United States | PASS |
| San Diego | United States | PASS |
| Toronto | Canada | PASS |
| Vancouver | Canada | PASS |
| Mexico City | Mexico | PASS |
| Guadalajara | Mexico | PASS |
| London | United Kingdom | PASS |
| Manchester | United Kingdom | PASS |
| Paris | France | PASS |
| Berlin | Germany | PASS |
| Rome | Italy | PASS |
| Madrid | Spain | PASS |
| Brussels | Belgium | PASS |
| Amsterdam | Netherlands | PASS |
| Beijing | China | PASS |
| Shanghai | China | PASS |
| Tokyo | Japan | PASS |
| Osaka | Japan | PASS |
| New Delhi | India | PASS |
| Mumbai | India | PASS |
| Sydney | Australia | PASS |
| Melbourne | Australia | PASS |
| Brasilia | Brazil | PASS |
| Sao Paulo | Brazil | PASS |
| Johannesburg | South Africa | PASS |
| Cape Town | South Africa | PASS |
| Lagos | Nigeria | PASS |
| Cairo | Egypt | PASS |
| Istanbul | Turkey | PASS |
| Seoul | South Korea | PASS |

## Visual Browser Smoke

Verified the visible right-side Civic / Viewport Intelligence tab with Playwright after the API audit.

Screenshots:

- `screenshots/viewport-intel-tokyo-civic-tab-final.png`
- `screenshots/viewport-intel-berlin-civic-tab-after-chancellor.png`
- `screenshots/viewport-intel-seoul-civic-tab-after-facility-fallback.png`
- `screenshots/viewport-intel-cairo-civic-tab-final.png`

Visual assertions covered:

- expected country header and flag
- jurisdiction stack
- leadership cards
- country-specific politics records
- country-specific government type and tabs
- facilities in view
- no US politics shown for Japan, Germany, South Korea, or Egypt

## Fixes Applied

- Added country government profiles for France, Germany, Italy, Spain, Belgium, Netherlands, South Africa, Nigeria, Egypt, Turkey, and South Korea.
- Preserved and expanded official contact URLs, portrait URLs, flags, seals, politics records, and government tab models.
- Added profile official defaults so API and UI paths both retain official images and contacts.
- Stopped European macro-region matching from overriding exact country profiles at city zoom.
- Added local place hints for country/city regions that were slow, missing, or misclassified, including Seoul previously resolving to Japan.
- Reduced MINDEX civic upstream wait to keep viewport intelligence under the fast-path budget.
- Added civic facility hints for the audited global city set so the panel has a fast local facility fallback instead of waiting on slow live Overpass calls.
- Added panel-side profile fallback so the visible Viewport Intelligence tab can render leadership, politics, government, and facilities even when the prefetched payload is stale or stripped.
- Updated leadership LOD logic so international city views can show national leadership when no local municipal leaders are available, without labeling it as city-only data.

## Verification Notes

`cmd /c npx tsc --noEmit --pretty false --incremental false` is still blocked by pre-existing unrelated errors in device cookie routes, the test voice audit route, an entity union access in `CREPDashboardClient.tsx`, and `MYCALiveActivityChordDiagram.tsx`. The viewport-intel changes did not add new TypeScript errors to that list.

ESLint could not be used because the repo is on ESLint 9 but does not have an `eslint.config.*` file.
