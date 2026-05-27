/**
 * Session-scoped MYCA viewport dismissals (worth mentioning chips, latest events).
 * May 25, 2026
 */

const DISMISSED_MENTIONS_KEY = "crep:myca:dismissed-mentions"
const DISMISSED_EVENTS_KEY = "crep:myca:dismissed-events"

function readSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.map(String))
  } catch {
    return new Set()
  }
}

function writeSet(key: string, ids: Set<string>) {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(key, JSON.stringify([...ids]))
  } catch {
    /* quota / private mode */
  }
}

export function getDismissedMycaMentions(): Set<string> {
  return readSet(DISMISSED_MENTIONS_KEY)
}

export function dismissMycaMention(id: string) {
  const next = getDismissedMycaMentions()
  next.add(id)
  writeSet(DISMISSED_MENTIONS_KEY, next)
}

export function getDismissedMycaEvents(): Set<string> {
  return readSet(DISMISSED_EVENTS_KEY)
}

export function dismissMycaEvent(id: string) {
  const next = getDismissedMycaEvents()
  next.add(id)
  writeSet(DISMISSED_EVENTS_KEY, next)
}
