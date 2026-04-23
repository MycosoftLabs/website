/**
 * Worldview v1 response envelope — Apr 23, 2026
 *
 * Morgan: "token rate limited bundled and organized for users mostly agents".
 *
 * Every /api/worldview/v1/* response uses this uniform envelope so agents
 * write one parser. Full design in docs/WORLDVIEW_API_V2_PLAN.md §8.
 */

import { NextResponse } from "next/server"
import { randomBytes } from "node:crypto"

export type WorldviewErrorCode =
  | "UNAUTHENTICATED"
  | "INSUFFICIENT_SCOPE"
  | "INSUFFICIENT_BALANCE"
  | "RATE_LIMITED"
  | "DATASET_NOT_FOUND"
  | "BUNDLE_NOT_FOUND"
  | "INVALID_PARAMS"
  | "UPSTREAM_UNREACHABLE"
  | "TIMEOUT"
  | "INTERNAL"

export interface RateLimitState {
  limit_per_minute: number
  remaining_per_minute: number
  reset_at: string
  limit_per_day?: number
  remaining_per_day?: number
}

export interface SuccessEnvelope<T = any> {
  ok: true
  request_id: string
  dataset?: string
  bundle?: string
  cost_debited: number
  balance_remaining: number | null
  rate_limit: RateLimitState | null
  cache: "hit" | "miss" | "stale" | "bypass"
  generated_at: string
  ttl_s: number
  data: T
  meta?: Record<string, any>
}

export interface ErrorEnvelope {
  ok: false
  request_id: string
  dataset?: string
  error: {
    code: WorldviewErrorCode
    message: string
    details?: Record<string, any>
  }
  rate_limit?: RateLimitState | null
  balance_remaining?: number | null
}

export function newRequestId(): string {
  const ts = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)
  return `wx-${ts}-${randomBytes(3).toString("hex")}`
}

export function ok<T>(body: Omit<SuccessEnvelope<T>, "ok" | "request_id" | "generated_at"> & {
  request_id?: string
  generated_at?: string
}): NextResponse {
  const envelope: SuccessEnvelope<T> = {
    ok: true,
    request_id: body.request_id ?? newRequestId(),
    dataset: body.dataset,
    bundle: body.bundle,
    cost_debited: body.cost_debited,
    balance_remaining: body.balance_remaining,
    rate_limit: body.rate_limit,
    cache: body.cache,
    generated_at: body.generated_at ?? new Date().toISOString(),
    ttl_s: body.ttl_s,
    data: body.data,
    meta: body.meta,
  }
  const cacheControl = body.ttl_s > 0
    ? `private, max-age=${Math.min(body.ttl_s, 300)}, stale-while-revalidate=${Math.min(body.ttl_s * 2, 600)}`
    : "no-store"
  return NextResponse.json(envelope, {
    headers: {
      "X-Request-Id": envelope.request_id,
      "X-Worldview-Cost-Debited": String(envelope.cost_debited),
      "X-Worldview-Cache": envelope.cache,
      "Cache-Control": cacheControl,
    },
  })
}

export function err(args: {
  code: WorldviewErrorCode
  message: string
  status: number
  details?: Record<string, any>
  request_id?: string
  dataset?: string
  rate_limit?: RateLimitState | null
  balance_remaining?: number | null
  headers?: Record<string, string>
}): NextResponse {
  const envelope: ErrorEnvelope = {
    ok: false,
    request_id: args.request_id ?? newRequestId(),
    dataset: args.dataset,
    error: {
      code: args.code,
      message: args.message,
      details: args.details,
    },
    rate_limit: args.rate_limit ?? null,
    balance_remaining: args.balance_remaining ?? null,
  }
  return NextResponse.json(envelope, {
    status: args.status,
    headers: {
      "X-Request-Id": envelope.request_id,
      "X-Worldview-Error": args.code,
      ...(args.headers || {}),
    },
  })
}
