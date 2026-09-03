"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { fieldLayerList, type FieldDataset, type FieldVariable } from "@/lib/crep/fields/registry"
import {
  DYNAMIC_FIELD_STALE_AFTER_MS,
  isDynamicFieldManifestStale,
} from "@/lib/crep/fields/field-playback"

export type ArraylakeFieldState = "cataloged" | "loading" | "available" | "stale" | "unbound" | "error"

export interface ArraylakeFieldOption {
  dataset: FieldDataset
  variable: FieldVariable
  layerId: string
}

export interface ArraylakeFieldStatus extends ArraylakeFieldOption {
  state: ArraylakeFieldState
  frameCount: number | null
  updatedAt: string | null
  newestFrameAt: string | null
  checkedAt: string | null
  storage: string | null
  reason: string
}

interface CatalogResponse {
  base_configured?: boolean
  local_base_configured?: boolean
  configured_base_present?: boolean
}

interface FieldManifest {
  baked?: boolean
  frames?: Array<{ t?: string | null; image?: string; tiles?: string; grid?: string }>
  updated?: string | null
  storage?: string | null
  reason?: string | null
}

export const ARRAYLAKE_FIELD_OPTIONS: readonly ArraylakeFieldOption[] = fieldLayerList()

function catalogedStatus(option: ArraylakeFieldOption): ArraylakeFieldStatus {
  return {
    ...option,
    state: "cataloged",
    frameCount: null,
    updatedAt: null,
    newestFrameAt: null,
    checkedAt: null,
    storage: null,
    reason: "Cataloged real source; select the field to inspect its baked manifest.",
  }
}

function newestTimestamp(values: Array<string | null | undefined>): string | null {
  return values
    .filter((value): value is string => typeof value === "string" && Number.isFinite(Date.parse(value)))
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null
}

function statusFromManifest(
  option: ArraylakeFieldOption,
  manifest: FieldManifest,
  checkedAt: string,
): ArraylakeFieldStatus {
  const frames = Array.isArray(manifest.frames)
    ? manifest.frames.filter((frame) => frame.image || frame.tiles || frame.grid)
    : []
  const newestFrameAt = newestTimestamp(frames.map((frame) => frame.t))
  if (!manifest.baked || frames.length === 0) {
    return {
      ...option,
      state: "unbound",
      frameCount: frames.length,
      updatedAt: manifest.updated ?? null,
      newestFrameAt,
      checkedAt,
      storage: manifest.storage ?? null,
      reason: manifest.reason || "No renderable baked frames are bound to this field.",
    }
  }

  const stale = isDynamicFieldManifestStale(manifest.updated, !!option.dataset.static)
  return {
    ...option,
    state: stale ? "stale" : "available",
    frameCount: frames.length,
    updatedAt: manifest.updated ?? null,
    newestFrameAt,
    checkedAt,
    storage: manifest.storage ?? null,
    reason: stale
      ? `Real baked frames are available, but the manifest is older than ${DYNAMIC_FIELD_STALE_AFTER_MS / 3_600_000} hours.`
      : "Real baked frames are available through the shared Earth Simulator view plane.",
  }
}

export function useArraylakeFields(active: boolean, enabledFieldIds: readonly string[]) {
  const enabledKey = enabledFieldIds.slice().sort().join("|")
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [baseConfigured, setBaseConfigured] = useState<boolean | null>(null)
  const [localBaseConfigured, setLocalBaseConfigured] = useState<boolean | null>(null)
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null)
  const [statusOverrides, setStatusOverrides] = useState<Record<string, ArraylakeFieldStatus>>({})

  useEffect(() => {
    if (!active) return
    const controller = new AbortController()
    const selected = new Set(enabledFieldIds)
    const checkedAt = new Date().toISOString()

    const load = async () => {
      setRefreshing(true)
      setStatusOverrides((current) => {
        const next = { ...current }
        for (const option of ARRAYLAKE_FIELD_OPTIONS) {
          if (selected.has(option.layerId)) {
            next[option.layerId] = {
              ...catalogedStatus(option),
              state: "loading",
              checkedAt,
              reason: "Checking the real baked manifest.",
            }
          } else {
            delete next[option.layerId]
          }
        }
        return next
      })

      try {
        const catalogResponse = await fetch("/api/crep/field/_catalog", {
          cache: "no-store",
          signal: controller.signal,
        })
        if (!catalogResponse.ok) throw new Error(`catalog ${catalogResponse.status}`)
        const catalog = await catalogResponse.json() as CatalogResponse
        const configured = catalog.base_configured === true
        setBaseConfigured(configured)
        setLocalBaseConfigured(catalog.local_base_configured === true)

        if (!configured) {
          setStatusOverrides(Object.fromEntries(
            ARRAYLAKE_FIELD_OPTIONS
              .filter((option) => selected.has(option.layerId))
              .map((option) => [option.layerId, {
                ...catalogedStatus(option),
                state: "unbound" as const,
                checkedAt,
                reason: "No local or configured Arraylake bake store is available.",
              }]),
          ))
          return
        }

        const resolved = await Promise.all(
          ARRAYLAKE_FIELD_OPTIONS
            .filter((option) => selected.has(option.layerId))
            .map(async (option): Promise<[string, ArraylakeFieldStatus]> => {
              try {
                const response = await fetch(`/api/crep/field/${option.dataset.id}/${option.variable.key}`, {
                  cache: "no-store",
                  signal: controller.signal,
                })
                if (!response.ok) throw new Error(`manifest ${response.status}`)
                const manifest = await response.json() as FieldManifest
                return [option.layerId, statusFromManifest(option, manifest, checkedAt)]
              } catch (error) {
                if (controller.signal.aborted) throw error
                return [option.layerId, {
                  ...catalogedStatus(option),
                  state: "error",
                  checkedAt,
                  reason: error instanceof Error ? error.message : "Manifest check failed.",
                }]
              }
            }),
        )
        if (!controller.signal.aborted) setStatusOverrides(Object.fromEntries(resolved))
      } catch (error) {
        if (controller.signal.aborted) return
        setBaseConfigured(false)
        setLocalBaseConfigured(false)
        setStatusOverrides(Object.fromEntries(
          ARRAYLAKE_FIELD_OPTIONS
            .filter((option) => selected.has(option.layerId))
            .map((option) => [option.layerId, {
              ...catalogedStatus(option),
              state: "error" as const,
              checkedAt,
              reason: error instanceof Error ? error.message : "Arraylake catalog check failed.",
            }]),
        ))
      } finally {
        if (!controller.signal.aborted) {
          setLastCheckedAt(checkedAt)
          setRefreshing(false)
        }
      }
    }

    void load()
    return () => controller.abort()
  }, [active, enabledKey, refreshNonce]) // eslint-disable-line react-hooks/exhaustive-deps

  const statuses = useMemo(
    () => ARRAYLAKE_FIELD_OPTIONS.map((option) => statusOverrides[option.layerId] ?? catalogedStatus(option)),
    [statusOverrides],
  )
  const refresh = useCallback(() => setRefreshNonce((value) => value + 1), [])

  return {
    statuses,
    baseConfigured,
    localBaseConfigured,
    lastCheckedAt,
    refreshing,
    refresh,
  }
}
