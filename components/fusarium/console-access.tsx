"use client"

/**
 * Console access from the public defense page.
 *
 * Three states, decided by who is signed in:
 *
 *   signed out            → a sign-in link, and a plain statement that access
 *                           is restricted. No "enter" button that leads to a
 *                           bounce.
 *   signed in, not on the → told so explicitly, with the address that WOULD be
 *   allowlist               allowed, so it is obvious what to do about it.
 *   signed in, allowlisted → the working link into the console.
 *
 * WHY THE ALLOWLIST IS ALSO CHECKED IN MIDDLEWARE
 *
 * This component decides what to RENDER. It is not the access control — a
 * client component never is. The enforcement is the middleware owner gate
 * (pathRequiresOwner + OWNER_ALLOWED_EMAILS), which redirects every non-owner
 * before /fusarium is served. Hiding the link is a courtesy so nobody is
 * offered a door that will not open; removing this component would change
 * nothing about who can get in.
 *
 * CAC/PIV is the eventual path, and the mock shows it. It is deliberately NOT
 * claimed here: no CAC reader is integrated, and a button that says
 * INSERT_CAC_CARD while doing Supabase email auth would be a false claim about
 * an authentication method on a defense product.
 */

import Link from "next/link"
import { Lock, ShieldCheck, LogIn } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { OWNER_ALLOWED_EMAILS } from "@/lib/access/routes"

const CONSOLE_PATH = "/fusarium"

export function ConsoleAccess() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="rounded-lg border border-white/15 bg-white/5 p-5 text-sm text-slate-300">
        Checking access…
      </div>
    )
  }

  const email = (user?.email || "").toLowerCase()
  const allowed = Boolean(email) && OWNER_ALLOWED_EMAILS.includes(email)

  if (allowed) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
          <ShieldCheck className="h-4 w-4" />
          Authorized — {email}
        </div>
        <p className="mt-2 text-sm text-slate-300">
          Operational console access. Your session is audited.
        </p>
        <Link
          href={CONSOLE_PATH}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
        >
          <ShieldCheck className="h-4 w-4" />
          Open the FUSARIUM console
        </Link>
      </div>
    )
  }

  if (user) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-amber-300">
          <Lock className="h-4 w-4" />
          Signed in as {email || "an unrecognised account"} — not authorized
        </div>
        <p className="mt-2 text-sm text-slate-300">
          The operational console is restricted to an approved allowlist. Access for defense
          customers is not open yet; contact Mycosoft to be added.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-white/15 bg-white/5 p-5">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
        <Lock className="h-4 w-4" />
        Identity verification required
      </div>
      <p className="mt-2 text-sm text-slate-300">
        The FUSARIUM operational console is restricted. Sign in to continue — access is limited to
        an approved allowlist while defense customer accounts are being stood up. CAC/PIV is the
        planned credential and is not integrated yet.
      </p>
      <Link
        href={`/login?redirectTo=${encodeURIComponent(CONSOLE_PATH)}`}
        className="mt-4 inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
      >
        <LogIn className="h-4 w-4" />
        Sign in
      </Link>
    </div>
  )
}
