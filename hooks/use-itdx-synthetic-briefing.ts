"use client"

import { useEffect, useState } from "react"
import { readDemoLog, type ItdxDemoLogEvent } from "@/lib/itdx/demo-log"
import type { MovementSnapshot } from "@/lib/fusarium/movement/contracts"
import type { WekaWalkthrough } from "@/lib/itdx/weka-v14-types"
import type {
  ItdxBriefingBundle,
  ItdxNlmBriefing,
  ItdxSituationBriefing,
  ItdxTask8Briefing,
} from "@/lib/itdx/synthetic-briefing"

interface UseItdxSyntheticBriefingOptions {
  isActive: boolean
  isPlaying: boolean
  replayIndex: number
}

async function readJson<T>(path: string): Promise<{ ok: boolean; status: number; data: T | null; error: string | null }> {
  try {
    const response = await fetch(path, { cache: "no-store" })
    const data = (await response.json().catch(() => null)) as T & { error?: string }
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: null,
        error: (data && typeof data === "object" && "error" in data && data.error) || `HTTP ${response.status}`,
      }
    }
    return { ok: true, status: response.status, data, error: null }
  } catch (error) {
    return { ok: false, status: 0, data: null, error: error instanceof Error ? error.message : "unreachable" }
  }
}

const EMPTY: ItdxBriefingBundle = {
  situation: null,
  nlm: null,
  movement: null,
  weka: null,
  task8: null,
  situationError: null,
  nlmError: null,
  movementError: null,
  wekaError: null,
  task8Error: null,
  loadedAt: null,
}

export function useItdxSyntheticBriefing({ isActive, isPlaying, replayIndex }: UseItdxSyntheticBriefingOptions) {
  const [bundle, setBundle] = useState<ItdxBriefingBundle>(EMPTY)
  const [ticks, setTicks] = useState<ItdxDemoLogEvent[]>([])

  useEffect(() => {
    if (!isActive) return
    let cancelled = false

    const load = async () => {
      if (typeof document !== "undefined" && document.hidden) return
      const [situation, nlm, movement, weka, task8] = await Promise.all([
        readJson<ItdxSituationBriefing>("/api/fusarium/itdx/situation"),
        readJson<ItdxNlmBriefing>("/api/fusarium/nlm/status"),
        readJson<MovementSnapshot>("/api/fusarium/movement/snapshot"),
        readJson<WekaWalkthrough>("/api/fusarium/itdx/weka-receipt"),
        readJson<ItdxTask8Briefing>("/api/fusarium/itdx/task8"),
      ])
      if (cancelled) return
      const raw = situation.data?.pathways?.geojson
      const features = Array.isArray(raw?.features) ? raw.features.slice(0, 48) : []
      if (features.length) {
        window.dispatchEvent(
          new CustomEvent("fusarium:itdx-pathways", {
            detail: { geojson: { type: "FeatureCollection", features } },
          }),
        )
      }
      setBundle({
        situation: situation.data,
        nlm: nlm.data,
        movement: movement.data,
        weka: weka.data,
        task8: task8.data,
        situationError: situation.error,
        nlmError: nlm.error,
        movementError: movement.error,
        wekaError: weka.ok ? null : weka.error,
        task8Error: task8.error,
        loadedAt: new Date().toISOString(),
      })
    }

    void load()
    const timer = window.setInterval(() => {
      void load()
    }, isPlaying ? 4000 : 8000)
    const onVisible = () => {
      if (!document.hidden) void load()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [isActive, isPlaying])

  useEffect(() => {
    if (!isActive) return
    let cancelled = false
    const load = async () => {
      const entries = await readDemoLog(10)
      if (!cancelled) setTicks(entries)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [isActive, replayIndex])

  return { bundle, ticks }
}
