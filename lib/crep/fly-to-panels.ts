/** Collapse country / project / metro fly-to dropdowns (CREP map click-away). */
import type {
  JurisdictionEntry,
  ViewportGeographyLod,
  ViewportPlaceLike,
} from "@/lib/crep/viewport-place"

export const CREP_COLLAPSE_FLYTO_EVENT = "crep:collapse-flyto"

/** Instant viewport intelligence label when user clicks a fly-to chip. */
export const CREP_VIEWPORT_GEOGRAPHY_OVERRIDE_EVENT = "crep:viewport-geography-override"

export interface ViewportGeographyOverrideDetail {
  headline: string
  subheadline?: string
  geographyLod?: ViewportGeographyLod

  place?: ViewportPlaceLike

  jurisdictionStack?: JurisdictionEntry[]
  /** Clear override after map settles (ms). */
  expiresAt: number
}

export function collapseFlyToPanels() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(CREP_COLLAPSE_FLYTO_EVENT))
}

export function setViewportGeographyOverride(
  detail: Omit<ViewportGeographyOverrideDetail, "expiresAt">,
  ttlMs = 45_000,
) {
  if (typeof window === "undefined") return
  window.dispatchEvent(
    new CustomEvent<ViewportGeographyOverrideDetail>(CREP_VIEWPORT_GEOGRAPHY_OVERRIDE_EVENT, {
      detail: { ...detail, expiresAt: Date.now() + ttlMs },
    }),
  )
}

