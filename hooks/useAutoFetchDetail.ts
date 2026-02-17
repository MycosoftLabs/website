/**
 * useAutoFetchDetail - Feb 2026
 *
 * System-wide hook for detail panels that may initially load incomplete data.
 * When data is incomplete (determined by `isIncomplete`), this hook automatically
 * re-fetches on an exponential-backoff schedule until:
 *   - Data is complete (isIncomplete returns false), OR
 *   - maxAttempts is exhausted
 *
 * The user never needs to close/reopen a panel — data appears live in-place.
 *
 * Usage (genetics example):
 *   const { data, loading, retrying, attempt } = useAutoFetchDetail({
 *     url: `/api/mindex/genetics/detail?accession=${accession}`,
 *     isIncomplete: (d) => !d?.sequence && d?.sequence_length > 0,
 *   })
 *
 * Applies to: genetics sequences, chemistry compounds, taxonomy species — any
 * detail view that may need to scrape external sources on first request.
 */

import { useState, useEffect, useRef, useCallback } from "react"

interface UseAutoFetchDetailOptions<T> {
  /** The URL to fetch. Set to null/undefined to disable fetching. */
  url: string | null | undefined
  /**
   * Return true when the fetched data is incomplete and needs a retry.
   * Return false (or when data is null) to stop retrying.
   */
  isIncomplete: (data: T | null) => boolean
  /**
   * Maximum number of retry attempts after the initial fetch.
   * Default: 8 (covers ~60s with exponential backoff capped at 10s)
   */
  maxAttempts?: number
  /**
   * Base delay in ms between retries. Doubles each attempt, capped at maxDelay.
   * Default: 2000 (2s)
   */
  baseDelay?: number
  /**
   * Maximum delay between retries (ms). Default: 10000 (10s)
   */
  maxDelay?: number
  /**
   * Transform raw JSON response before storing. Default: identity.
   */
  transform?: (raw: unknown) => T
}

interface UseAutoFetchDetailResult<T> {
  /** Current data (may be partial on first load, complete after retries) */
  data: T | null
  /** True during the initial fetch */
  loading: boolean
  /** True during a retry fetch */
  retrying: boolean
  /** Number of retries completed so far */
  attempt: number
  /** True when maxAttempts exhausted and data is still incomplete */
  gaveUp: boolean
  /** Error message if initial fetch fails */
  error: string | null
}

export function useAutoFetchDetail<T = unknown>({
  url,
  isIncomplete,
  maxAttempts = 8,
  baseDelay = 2000,
  maxDelay = 10000,
  transform,
}: UseAutoFetchDetailOptions<T>): UseAutoFetchDetailResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [gaveUp, setGaveUp] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use refs so the retry closure always sees the latest values without re-registering effects
  const attemptRef = useRef(0)
  const dataRef = useRef<T | null>(null)
  const cancelledRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doFetch = useCallback(
    async (isRetry: boolean) => {
      if (!url || cancelledRef.current) return

      if (isRetry) setRetrying(true)
      else { setLoading(true); setError(null) }

      try {
        const res = await fetch(url, { cache: "no-store" })
        if (cancelledRef.current) return

        if (!res.ok) {
          const msg = res.status === 404 ? "Not found" : `Error ${res.status}`
          if (!isRetry) setError(msg)
          return
        }

        const raw = await res.json()
        const result: T = transform ? transform(raw) : (raw as T)

        if (cancelledRef.current) return
        dataRef.current = result
        setData(result)
      } catch (e) {
        if (cancelledRef.current) return
        if (!isRetry) setError(e instanceof Error ? e.message : "Failed to load")
      } finally {
        if (!cancelledRef.current) {
          if (isRetry) setRetrying(false)
          else setLoading(false)
        }
      }
    },
    [url, transform]
  )

  // Schedule a retry after the appropriate delay
  const scheduleRetry = useCallback(() => {
    const att = attemptRef.current
    if (att >= maxAttempts) {
      setGaveUp(true)
      return
    }
    const delay = Math.min(baseDelay * Math.pow(1.8, att), maxDelay)
    timerRef.current = setTimeout(async () => {
      if (cancelledRef.current) return
      attemptRef.current += 1
      setAttempt(attemptRef.current)
      await doFetch(true)
      // After the retry fetch, the useEffect below will see updated data and
      // decide whether to schedule another retry.
    }, delay)
  }, [maxAttempts, baseDelay, maxDelay, doFetch])

  // Initial fetch when url changes
  useEffect(() => {
    if (!url) return
    cancelledRef.current = false
    attemptRef.current = 0
    dataRef.current = null
    setData(null)
    setLoading(false)
    setRetrying(false)
    setAttempt(0)
    setGaveUp(false)
    setError(null)

    void doFetch(false)

    return () => {
      cancelledRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [url]) // eslint-disable-line react-hooks/exhaustive-deps

  // After each data update, check if we need to retry
  useEffect(() => {
    if (loading || retrying || gaveUp) return
    if (!data && !error) return // Still waiting for initial fetch
    if (!isIncomplete(data)) return // Data is complete — no retry needed

    scheduleRetry()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [data, loading, retrying, gaveUp, error, isIncomplete, scheduleRetry])

  return { data, loading, retrying, attempt, gaveUp, error }
}
