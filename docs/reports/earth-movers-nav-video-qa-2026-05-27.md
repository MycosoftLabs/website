# Earth Simulator Movers, Navigation, and Video QA - May 27, 2026

## Scope

This pass focused on the active regression surface from the local `3010` environment:

- Earth Simulator vessels, boats, and satellites loading at San Diego zoom.
- The site-wide double-click / double-tap navigation issue.
- Home, About, Devices, and device-detail video playback after navigation changes.

## Fixes Applied

- Disabled `NavigationClickRescue` so the global document click handler cannot intercept navigation or pause/clear media during route changes.
- Simplified the mobile drawer navigation path so internal mobile drawer links perform a single full browser navigation and avoid the React `removeChild` route-transition crash.
- Added an in-flight guard to the Earth Simulator live-entity pump so aircraft, vessel, and satellite requests cannot stack across the startup timers.
- Bounded the live mover fetches at 90s so slow dev-server startup cannot make already-available mover data vanish before the response is consumed.

## Verification

### TypeScript

- `cmd /c npx tsc --noEmit --pretty false`
- Result: pass.

### Direct Mover APIs

- `/api/mindex/proxy/aircraft?limit=3000`
  - Result: 3,000 aircraft in about 5.0s.
- `/api/oei/aisstream?limit=8000`
  - Result: 8,000 vessels in about 4.5s, source `disk`.
- `/api/oei/satellites?category=active&mode=registry&limit=2500`
  - Result: 1,612 satellites in about 4.0s, source `satnogs`.

### Earth Simulator UI

- Route tested: `/natureos/earth-simulator?lat=32.7157&lng=-117.1611&zoom=10`.
- Screenshots:
  - `screenshots/earth-movers-inflight-guard-2026-05-27.png`
  - `screenshots/earth-movers-final-90s-2026-05-27.png`
- Result: map rendered at San Diego zoom with vessels and satellites visible in the UI.
- Pump behavior: one startup pump set fired, not four stacked sets:
  - one aircraft request,
  - two vessel requests, viewport plus global,
  - one satellite request.
- Visible UI evidence from screenshot:
  - `Boats: 137`
  - `Sats: 1612`
  - MYCA analysis saw `137 vessels` and `1612 satellites`.

### Single-Click / Single-Tap Navigation

Validated with Playwright on desktop and mobile drawer:

- Desktop Search: pass, `/search`, no console errors.
- Desktop About Us: pass, `/about`, no console errors.
- Desktop AI dropdown to AI overview: pass, `/ai`, no console errors.
- Mobile drawer Search: pass, `/search`, no console errors.
- Mobile drawer About Us: pass, `/about`, no console errors.
- Mobile drawer AI: pass, `/ai`, no console errors.

### Video Smoke

Validated visible hero videos advanced with no media errors:

- `/` homepage: `/assets/homepage/Mycosoft%20Background-web.mp4`, playing.
- `/about`: `/assets/about%20us/mycosoft-commercial-hero-2026-web.mp4`, playing.
- `/devices`: `/assets/devices/droids-hero-web.mp4`, playing.
- `/devices/mushroom-1`: `/assets/mushroom1/mushroom1-hero-2026-fast-web.mp4`, playing.
- `/devices/sporebase`: `/assets/sporebase/sporebase1publish-web.mp4`, playing.
- `/devices/hyphae-1`: `/assets/hyphae1/hero-web.mp4`, playing.
- `/devices/myconode`: `/assets/myconode/myconode%20hero1-web.mp4`, playing.
- `/devices/psathyrella`: `/assets/psathyrella/psathyrella-hero-2026-web.mp4`, playing.
- `/devices/alarm`: `/assets/alarm/alarm-hero-temp-web.mp4`, playing.

Additional ALARM probe:

- Repeated `/devices/alarm` three times after the smoke pass.
- Result: no `Invalid or unexpected token` reproduction; video readyState 4 and advancing each run.

## Remaining Non-Blocking Warnings

- Earth Simulator still emits warnings from PMTiles fallback paths and optional camera / voice services in dev.
- About and some device pages emit WebGL / Three.js performance warnings in headless Chromium.
- MycoNode still has a hydration warning unrelated to video playback.
- Agaric has video tags on the page, but no visible hero video in the first viewport during this pass.

## Status

The double-tap navigation fix is locally verified, the video surface did not regress, and Earth Simulator vessel / satellite UI now renders from populated local APIs without the startup pump stacking requests.
