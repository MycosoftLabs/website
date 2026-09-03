"use client"

import { useCallback, useState } from "react"
import { PsathyrellaControllerPresentation } from "./PsathyrellaControllerPresentation"
import { VehicleProfileConsole } from "./VehicleProfileConsole"

export type GlobalControlProfileId = "psathyrella" | "agaric" | "mushroom-1"

function initialProfile(): GlobalControlProfileId {
  if (typeof window === "undefined") return "psathyrella"
  const candidate = new URLSearchParams(window.location.search).get("vehicle")
  return candidate === "agaric" || candidate === "mushroom-1" || candidate === "psathyrella" ? candidate : "psathyrella"
}

/**
 * Selection boundary: Psathyrella is presentation-only here and hands the owner to the protected
 * existing controller. Agaric and Mushroom 1 remain local, visibly unbound profiles.
 */
export function GlobalControlSystemSelector() {
  const [profileId, setProfileId] = useState<GlobalControlProfileId>(initialProfile)

  const selectProfile = useCallback((next: GlobalControlProfileId) => {
    setProfileId(next)
    const url = new URL(window.location.href)
    url.searchParams.set("vehicle", next)
    window.history.replaceState(window.history.state, "", url)
  }, [])

  return profileId === "psathyrella" ? (
    <PsathyrellaControllerPresentation onProfileChange={selectProfile} />
  ) : (
    <VehicleProfileConsole profileId={profileId} onProfileChange={selectProfile} />
  )
}

export default GlobalControlSystemSelector
