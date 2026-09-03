"use client"

import { useEffect, useState } from "react"
import { ShieldCheck, UserRound } from "lucide-react"

type SessionUser = { email?: string; role?: string; localDev?: boolean }

export default function FusariumProfilePage() {
  const [user, setUser] = useState<SessionUser | null>(null)

  useEffect(() => {
    void fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" })
      .then((response) => response.json())
      .then((payload) => setUser(payload?.ok && payload.user ? payload.user : null))
      .catch(() => setUser(null))
  }, [])

  const signOut = async () => {
    await fetch("/api/auth/local-dev-session", { method: "DELETE", credentials: "same-origin" }).catch(() => null)
    window.location.assign("/auth/logout")
  }

  return (
    <section className="account-page" aria-labelledby="fusarium-profile-title">
      <header><span>Platform · authenticated operator</span><h1 id="fusarium-profile-title">Account &amp; access</h1><p>Fusarium uses the shared Mycosoft identity boundary. Credentials and session tokens are never displayed here.</p></header>
      <div className="account-card">
        <UserRound aria-hidden="true" />
        <div><small>Signed-in identity</small><strong>{user?.email || "Session unavailable"}</strong><span>{user?.localDev ? "Local signed owner session" : "Mycosoft authenticated session"}</span></div>
        <b>{user?.role || "unknown"}</b>
      </div>
      <div className="account-card">
        <ShieldCheck aria-hidden="true" />
        <div><small>Authorization posture</small><strong>Owner-gated operational console</strong><span>Device telemetry and protected platform APIs enforce server-side authorization independently of this display.</span></div>
      </div>
      <button className="account-signout" type="button" onClick={() => void signOut()}>Sign out of Fusarium</button>
    </section>
  )
}
