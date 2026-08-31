/**
 * Shared singleton: is the MAP view the active center view right now?
 *
 * All center views stay MOUNTED (CenterViewport toggles visibility, never unmounts — that would
 * tear down MapLibre/media DOM and throw the removeChild crash that freezes the controls). The
 * downside: the WebGL map keeps running its animation loops even while hidden behind the CAMERA /
 * SONAR / scope panes. Combined with a live (and up-to-30×-scaled) webcam, that double GPU load
 * starves the main thread and the controls freeze — worst on iPad.
 *
 * CenterViewport sets this flag from the active view; the map's animated layers (buoy pulse,
 * sensor contacts, mesh packets, ghost track) read it in their rAF/timer ticks and SKIP painting
 * while the map isn't the active view. They resume (and catch up to live telemetry) the instant
 * MAP is shown again — no teardown, no re-init.
 */
let mapViewActive = true;

export function setMapViewActive(active: boolean) {
  mapViewActive = active;
}

export function isMapViewActive(): boolean {
  return mapViewActive;
}
