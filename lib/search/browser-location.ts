"use client"

export interface RememberedSearchLocation {
  lat: number
  lng: number
  accuracy?: number
  rememberedAt: number
}

const STORAGE_KEY = "mycosoft.search.location.v1"

function isValidLocation(value: unknown): value is RememberedSearchLocation {
  const loc = value as Partial<RememberedSearchLocation>
  return Number.isFinite(loc?.lat) && Number.isFinite(loc?.lng)
}

export function getRememberedSearchLocation(): RememberedSearchLocation | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return isValidLocation(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function rememberSearchLocation(location: Omit<RememberedSearchLocation, "rememberedAt">): RememberedSearchLocation {
  const remembered = { ...location, rememberedAt: Date.now() }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remembered))
  } catch {
    /* localStorage may be blocked; keep in-memory caller state only */
  }
  return remembered
}

export function requestRememberedSearchLocation(): Promise<RememberedSearchLocation | null> {
  if (typeof window === "undefined" || !navigator.geolocation) return Promise.resolve(null)
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(rememberSearchLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }))
      },
      () => resolve(null),
      { timeout: 8000, maximumAge: 24 * 60 * 60 * 1000, enableHighAccuracy: false }
    )
  })
}
