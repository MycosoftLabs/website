import { redirect } from "next/navigation"

// May 21 2026 (Morgan): this route used to mount a second Earth Simulator
// (Cesium-based EarthSimulatorContainer from
// components/earth-simulator/cesium-globe.tsx). It was created during a
// SPUN data integration but the data was supposed to overlay the canonical
// CREP MapLibre globe at /natureos/earth-simulator as a filter, not spin up
// a parallel map. Redirecting here so any cached deep-link, search-results
// page, or sidebar entry lands on the real Earth Simulator instead.
//
// The Cesium components under components/earth-simulator/* are no longer
// reachable through the public site after this redirect — they should be
// pruned in a follow-up once we confirm no internal embed depends on them.

export default function DeprecatedAppsEarthSimulatorRedirect() {
  redirect("/natureos/earth-simulator")
}
