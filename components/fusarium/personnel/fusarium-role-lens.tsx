"use client"

import Link from "next/link"
import { useFusariumRoleOptional } from "@/lib/fusarium/personnel/role-context"

interface FusariumRoleLensProps {
  surface: "earth-simulator" | "aerosol" | "situational-awareness" | "itdx" | "soc" | "command-control" | "devices"
}

export function FusariumRoleLens({ surface }: FusariumRoleLensProps) {
  const ctx = useFusariumRoleOptional()
  if (!ctx) return null
  const { persona, role, ownerSeesAll } = ctx
  const e = persona.entitlements
  const defaultHint =
    surface === "earth-simulator"
      ? e.defaultEarthSimLayers.join(", ")
      : surface === "aerosol"
        ? e.defaultAerosolFocus
        : surface === "itdx"
          ? e.defaultItdxView
          : e.defaultSaPanel

  return (
    <aside className="fusarium-role-lens" data-testid={`fusarium-role-lens-${surface}`}>
      <p>
        <strong>{persona.title}</strong>
        {role ? ` · ${role.service} ${role.specialty_code} ${role.role_title}` : " · catalog role not selected"}
      </p>
      <p>
        Suggested focus: {defaultHint}. Owner still sees every control. Live Data / FIRMS / governor are not removed.
      </p>
      <p className="fusarium-role-lens-muted">
        Owner override: {ownerSeesAll ? "on" : "off"}. Primary tools: {e.primaryTools.join(" · ")}
      </p>
      <div className="fusarium-role-lens-links">
        {e.primaryRoutes.slice(0, 4).map((href) => (
          <Link key={href} href={href}>
            {href.replace("/fusarium/", "") || "overview"}
          </Link>
        ))}
        <Link href="/fusarium/personnel/survey">Survey</Link>
        <Link href="/fusarium/personnel/outcomes">Outcomes</Link>
      </div>
    </aside>
  )
}
