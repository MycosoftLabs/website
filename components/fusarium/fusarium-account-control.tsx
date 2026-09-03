"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { LogIn, UserRound } from "lucide-react"

type SessionUser = { email?: string; role?: string; localDev?: boolean }

export function FusariumAccountControl() {
  const [user, setUser] = useState<SessionUser | null>(null)

  useEffect(() => {
    let active = true
    void fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" })
      .then((response) => response.json())
      .then((payload) => { if (active) setUser(payload?.ok && payload.user ? payload.user : null) })
      .catch(() => { if (active) setUser(null) })
    return () => { active = false }
  }, [])

  if (!user) {
    return <Link className="account-control" href="/fusarium/login?redirectTo=%2Ffusarium"><LogIn aria-hidden="true" /><span>Sign in</span></Link>
  }

  return (
    <Link className="account-control" href="/fusarium/profile" title={user.email || "Mycosoft account"}>
      <UserRound aria-hidden="true" />
      <span><strong>{user.email || "Mycosoft operator"}</strong><small>{user.role || "authenticated"}</small></span>
    </Link>
  )
}
