"use client"

/**
 * Classification capability model for the commercial Fusarium host.
 *
 * The product exposes the intended U, CUI, SECRET, and TS/SCI tiers, while the
 * running host remains fixed at U. Higher tiers require current server-verified
 * identity, authorization, release policy, and an accredited processing
 * boundary. None of that evidence is available to this client today, so those
 * tiers fail closed and cannot change either the marking or the data plane.
 *
 * Browser state, URL input, and client identity claims are deliberately absent
 * from this control. A future unlock must be driven by a fresh, signed server
 * decision and must still be enforced by the serving boundary.
 */

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { Lock } from "lucide-react"

export type ClassificationId = "U" | "CUI" | "SECRET" | "TS_SCI"

export interface Classification {
  id: ClassificationId
  /** Short label for the segmented capability control. */
  short: string
  /** Banner text if this level is the verified active runtime level. */
  banner: string
  /** True when this commercial host cannot activate the level. */
  restricted: boolean
}

export const CLASSIFICATIONS: readonly Classification[] = [
  {
    id: "U",
    short: "U",
    banner: "UNCLASSIFIED // COMMERCIAL // MYCOSOFT_INC",
    restricted: false,
  },
  {
    id: "CUI",
    short: "CUI",
    banner: "CUI // LOCKED // NOT AVAILABLE ON THIS COMMERCIAL HOST",
    restricted: true,
  },
  {
    id: "SECRET",
    short: "SECRET",
    banner: "SECRET // LOCKED // NOT AVAILABLE ON THIS COMMERCIAL HOST",
    restricted: true,
  },
  {
    id: "TS_SCI",
    short: "TS/SCI",
    banner: "TOP SECRET // SCI // LOCKED // NOT AVAILABLE ON THIS COMMERCIAL HOST",
    restricted: true,
  },
] as const

export function classificationById(id: ClassificationId): Classification {
  return CLASSIFICATIONS.find((classification) => classification.id === id) ?? CLASSIFICATIONS[0]
}

interface Ctx {
  level: Classification
  setLevel: (id: ClassificationId) => void
  /** No higher-tier authorization is accepted without fresh server evidence. */
  authorized: boolean
  /** False until the server supplies a verifiable classification decision. */
  authResolved: boolean
  /** Local owner-only UI simulation; never classification authorization. */
  canSimulate: boolean
  simulated: boolean
}

const runtimeLevel = classificationById("U")
const failClosedContext: Ctx = {
  level: runtimeLevel,
  setLevel: () => undefined,
  authorized: false,
  authResolved: false,
  canSimulate: false,
  simulated: false,
}

const ClassificationContext = createContext<Ctx | null>(null)

export function ClassificationProvider({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedId] = useState<ClassificationId>("U")
  const [canSimulate, setCanSimulate] = useState(false)
  const [authResolved, setAuthResolved] = useState(false)

  useEffect(() => {
    let active = true
    void fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" })
      .then((response) => response.json())
      .then((payload) => {
        if (!active) return
        setCanSimulate(process.env.NODE_ENV === "development" && payload?.ok === true && payload?.user?.localDev === true && payload?.user?.role === "owner")
        setAuthResolved(true)
      })
      .catch(() => { if (active) setAuthResolved(true) })
    return () => { active = false }
  }, [])

  const value = useMemo<Ctx>(() => {
    const simulated = canSimulate && selectedId !== "U"
    const selected = classificationById(selectedId)
    return {
      level: simulated
        ? { ...selected, banner: `${selected.short} // DEVELOPMENT SIMULATION ONLY // NO CLASSIFIED DATA` }
        : runtimeLevel,
      setLevel: (id) => setSelectedId(canSimulate ? id : "U"),
      authorized: false,
      authResolved,
      canSimulate,
      simulated,
    }
  }, [authResolved, canSimulate, selectedId])

  return (
    <ClassificationContext.Provider value={value}>
      {children}
    </ClassificationContext.Provider>
  )
}

export function useClassification(): Ctx {
  const ctx = useContext(ClassificationContext)
  if (!ctx) throw new Error("useClassification must be used within a ClassificationProvider")
  return ctx
}

/** Shows the complete capability model while keeping every higher tier locked. */
export function ClassificationFloorControl() {
  const { level, setLevel, canSimulate, simulated } = useClassification()

  return (
    <div className="fx-classification">
      <span className="fx-classification-label">
        Classification capability
        <span className="fx-classification-locked-hint">{canSimulate ? " · owner dev simulation" : " · higher tiers locked"}</span>
      </span>
      <div
        className="fx-classification-seg"
        role="group"
        aria-label="Classification capability"
        aria-describedby="classification-capability-guardrail"
      >
        {CLASSIFICATIONS.map((classification) => {
          const active = classification.id === level.id
          const locked = classification.restricted && !canSimulate
          const title = locked
            ? `Locked: ${classification.short} requires current server-verified identity, authorization, release policy, and an accredited boundary. This commercial host is not accredited for ${classification.short}.`
            : classification.restricted
              ? `${classification.short} development UI simulation only. No classified authority or data-plane change.`
              : "Active runtime level: U / commercial unclassified"

          return (
            <button
              key={classification.id}
              type="button"
              className={`fx-classification-btn${active ? " active" : ""}${locked ? " locked" : ""}`}
              data-level={classification.id}
              aria-pressed={active}
              aria-label={`${classification.short}${locked ? ", locked" : ", active"}`}
              disabled={locked}
              title={title}
              onClick={() => setLevel(classification.id)}
            >
              {locked ? <Lock aria-hidden="true" className="fx-classification-lock" /> : null}
              {classification.short}
            </button>
          )
        })}
      </div>
      <span id="classification-capability-guardrail" className="sr-only">
        {canSimulate
          ? `Owner development simulation is available. ${simulated ? `${level.short} simulation is selected.` : "Unclassified is selected."} No classified authority or data-plane change is granted.`
          : "CUI, SECRET, and TS/SCI are locked. They require current server-verified identity, authorization, release policy, and an accredited processing boundary. This commercial host is not accredited for classified processing."}
      </span>
    </div>
  )
}

/** The fail-closed runtime never raises a higher-tier display notice. */
export function ClassificationNotice() {
  return null
}
