"use client"

import { useMemo } from "react"
import { usePathname } from "next/navigation"
import { useFusariumRole } from "@/lib/fusarium/personnel/role-context"

export function FusariumRoleSwitcher() {
  const pathname = usePathname() || "/fusarium"
  const { persona, role, roles, personas, setDuty } = useFusariumRole()
  const personaRoles = useMemo(
    () => (persona.persona_id === "owner_full" ? roles : roles.filter((item) => item.persona_id === persona.persona_id)),
    [persona.persona_id, roles],
  )

  function recordTelemetry(nextPersona: string, nextRole: string | null) {
    void fetch("/api/fusarium/personnel/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role_id: nextRole,
        persona_id: nextPersona,
        surface: pathname,
        tool: "duty-position",
        tab: nextPersona,
      }),
    }).catch(() => undefined)
  }

  return (
    <div className="fusarium-duty" data-testid="fusarium-duty-switcher">
      <label className="fusarium-duty-label" htmlFor="fusarium-persona">
        Duty
      </label>
      <select
        id="fusarium-persona"
        className="fusarium-duty-select"
        value={persona.persona_id}
        onChange={(event) => {
          const personaId = event.target.value
          const first = roles.find((item) => item.persona_id === personaId)
          const roleId = personaId === "owner_full" ? role?.role_id ?? null : first?.role_id ?? null
          setDuty({ personaId, roleId })
          recordTelemetry(personaId, roleId)
        }}
      >
        {personas.map((item) => (
          <option key={item.persona_id} value={item.persona_id}>
            {item.title}
          </option>
        ))}
      </select>
      <select
        id="fusarium-role"
        className="fusarium-duty-select"
        aria-label="Catalog role"
        value={role?.role_id ?? ""}
        onChange={(event) => {
          const roleId = event.target.value || null
          const match = roles.find((item) => item.role_id === roleId)
          setDuty({ personaId: match?.persona_id || persona.persona_id, roleId })
          recordTelemetry(match?.persona_id || persona.persona_id, roleId)
        }}
      >
        <option value="">No specific catalog role</option>
        {personaRoles.map((item) => (
          <option key={item.role_id} value={item.role_id}>
            {item.service} {item.specialty_code ? `${item.specialty_code} ` : ""}
            {item.role_title}
          </option>
        ))}
      </select>
    </div>
  )
}
