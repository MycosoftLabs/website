/**
 * Explicit allow-list for the FlyBrain BFF proxy (`/api/fusarium/flybrain/[...path]`).
 *
 * `allowPath(segments, method)` returns the MAS-relative path (`/sessions/abc/tick`) when the
 * request matches one of `FLYBRAIN_BFF_ROUTES` with an allowed method and valid ids, and `null`
 * for anything else. No user-controlled path ever reaches MAS unmatched.
 */

import { FLYBRAIN_BFF_ROUTES, FLYBRAIN_ID_PATTERN, type BffMethod } from "./contract"

const SEGMENT_FORBIDDEN = /[\\%?#/\s]/

function validSegment(segment: unknown): segment is string {
  return typeof segment === "string" && segment.length > 0 && segment.length <= 128 && segment !== "." && segment !== ".." && !SEGMENT_FORBIDDEN.test(segment)
}

function isParam(token: string) {
  return token.startsWith("{") && token.endsWith("}")
}

/** True when `segments` matches the route template (literal tokens equal, params id-validated). */
function matches(template: string, segments: string[]) {
  const tokens = template.split("/").filter(Boolean)
  if (tokens.length !== segments.length) return false
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]
    const segment = segments[i]
    if (isParam(token)) {
      if (!FLYBRAIN_ID_PATTERN.test(segment)) return false
    } else if (token !== segment) {
      return false
    }
  }
  return true
}

export function isFlyBrainId(value: unknown): value is string {
  return typeof value === "string" && FLYBRAIN_ID_PATTERN.test(value)
}

/**
 * @param segments catch-all path segments as Next.js hands them (already URL-decoded)
 * @param method HTTP method (any case)
 * @returns MAS-relative path such as `/sessions/fb-1/tick`, or `null` when not allowed
 */
export function allowPath(segments: unknown, method: unknown): string | null {
  if (!Array.isArray(segments) || segments.length === 0 || segments.length > 4) return null
  if (!segments.every(validSegment)) return null
  if (typeof method !== "string") return null
  const verb = method.toUpperCase() as BffMethod
  if (verb !== "GET" && verb !== "POST" && verb !== "DELETE") return null
  const parts = segments as string[]
  for (const route of FLYBRAIN_BFF_ROUTES) {
    if (!route.methods.includes(verb)) continue
    if (matches(route.path, parts)) return "/" + parts.join("/")
  }
  return null
}
