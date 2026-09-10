"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { PERSONA_PROFILES, personaById, OWNER_PERSONA_ID } from "./personas"
import type { PersonaProfile, PersonnelRole } from "./types"

const STORAGE_KEY = "fusarium-duty-position"

interface DutyState {
  personaId: string
  roleId: string | null
}

interface RoleContextValue {
  persona: PersonaProfile
  role: PersonnelRole | null
  roles: PersonnelRole[]
  personas: PersonaProfile[]
  ownerSeesAll: true
  setDuty: (next: { personaId: string; roleId?: string | null }) => void
}

const RoleContext = createContext<RoleContextValue | null>(null)

function readStored(): DutyState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { personaId: OWNER_PERSONA_ID, roleId: null }
    const parsed = JSON.parse(raw) as DutyState
    return {
      personaId: typeof parsed.personaId === "string" ? parsed.personaId : OWNER_PERSONA_ID,
      roleId: typeof parsed.roleId === "string" ? parsed.roleId : null,
    }
  } catch {
    return { personaId: OWNER_PERSONA_ID, roleId: null }
  }
}

export function FusariumRoleProvider({ children }: { children: ReactNode }) {
  const [duty, setDutyState] = useState<DutyState>({ personaId: OWNER_PERSONA_ID, roleId: null })
  const [roles, setRoles] = useState<PersonnelRole[]>([])

  useEffect(() => {
    setDutyState(readStored())
  }, [])

  useEffect(() => {
    let cancelled = false
    void fetch("/api/fusarium/personnel/catalog", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data?.roles)) setRoles(data.roles as PersonnelRole[])
      })
      .catch(() => {
        if (!cancelled) setRoles([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const setDuty = useCallback((next: { personaId: string; roleId?: string | null }) => {
    setDutyState((prev) => {
      const state: DutyState = {
        personaId: next.personaId || prev.personaId,
        roleId: next.roleId === undefined ? prev.roleId : next.roleId,
      }
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch {
        /* ignore */
      }
      return state
    })
  }, [])

  const persona = useMemo(() => personaById(duty.personaId), [duty.personaId])
  const role = useMemo(
    () => roles.find((item) => item.role_id === duty.roleId) ?? null,
    [roles, duty.roleId],
  )

  const value = useMemo<RoleContextValue>(
    () => ({
      persona,
      role,
      roles,
      personas: PERSONA_PROFILES,
      ownerSeesAll: true,
      setDuty,
    }),
    [persona, role, roles, setDuty],
  )

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function useFusariumRole() {
  const ctx = useContext(RoleContext)
  if (!ctx) {
    throw new Error("useFusariumRole must be used inside FusariumRoleProvider")
  }
  return ctx
}

export function useFusariumRoleOptional() {
  return useContext(RoleContext)
}
