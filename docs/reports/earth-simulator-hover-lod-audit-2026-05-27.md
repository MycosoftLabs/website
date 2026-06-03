# Earth Simulator Hover / LOD Audit - 2026-05-27

## OpenGridWorks Reference

- Reference URL: `https://opengridworks.com/power-plants?layers=tx%2Cdatacenters%2Chpoints%2CrowTx%2CrowSubs&panel=closed`
- Observed load profile: DOM content loaded in about 293 ms, page load about 476 ms, 4 map canvases, 93 controls, 211 resources.
- Interaction model: hover creates a lightweight popup before click. The popup acts as partial selection and includes the primary asset plus stacked nearby assets when available.
- LOD model: assets scale by zoom and layer type; dense infrastructure is already in the map render pipeline and is revealed or hidden by zoom and viewport, not by React marker churn.

## Local Earth Simulator Changes

- Added a shared `__crep_hoverAsset` hover bus for native MapLibre layers, DOM markers, and overlay components.
- Added a floating `crep-hover-preview` asset card for pre-click hover selection.
- Wired hover previews for aircraft, satellites, vessels, buoys, events, species observations, power plants, transmission lines, subtransmission lines, substations, data centers, cell towers, military assets, Mycosoft devices, submarine cables, Eagle Eye cameras, and Eagle Eye events.
- MYCA analysis now receives hovered assets as `hovered <kind>` context, so the MYCA panel can explain what the user is reading on the map while keeping the existing analysis cadence guard.
- Marker hover state is throttled to avoid turning mouse movement into a render loop.

## Verification

- `cmd /c npx tsc --noEmit --pretty false` passed.
- Local browser QA at `http://localhost:3010/natureos/earth-simulator?_codex_hover_shell=1` passed:
  - Hover preview appeared for a map event.
  - MYCA Analysis was present.
  - MYCA included hover context.
  - No `Unhandled Runtime Error`, `ReferenceError`, `Build Error`, or `ChunkLoadError` appeared.
- Evidence:
  - `screenshots/earth-simulator-hover-myca-qa.png`
  - `screenshots/earth-simulator-hover-myca-qa.json`

## Follow-Up Risks

- Voice bridge WebSocket on `localhost:8999` is optional but currently unavailable in local QA.
- Some MapLibre icon warnings remain for late-loaded sprites such as `aircraft-icon`, `vessel-icon`, and duplicate `train-icon`.
- The next pass should expand hover parity into every remaining special project overlay that does not yet emit `__crep_hoverAsset`.
