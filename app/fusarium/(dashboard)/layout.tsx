import type { Metadata } from "next"
import { redirect } from "next/navigation"
import "../fusarium-operator.css"
import FusariumLayoutClient from "@/components/fusarium/fusarium-layout-client"
import { requireFusariumOwner } from "@/lib/auth/api-auth"
import { FUSARIUM_OWNER_LOGIN_PATH } from "@/lib/auth/fusarium-owner-gate"
import { FUSARIUM_MFA_CHALLENGE_PATH } from "@/lib/auth/fusarium-mfa"
import { FUSARIUM_OPERATOR_APP_PATH } from "@/lib/fusarium-operator-login"

/**
 * The FUSARIUM console lives at /fusarium.
 *
 * It is a route GROUP — (dashboard) adds no URL segment — so the existing
 * /fusarium/launchpad tree keeps its own layout and is untouched by this one.
 * Public login stays at /fusarium/login; this layout never wraps it.
 */
export const metadata: Metadata = {
  title: "FUSARIUM Platform — UNCLASSIFIED",
  description:
    "FUSARIUM defense console. Data binds to the Fusarium runtime; the civilian deployment is never a fallback.",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default async function FusariumDashboardLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireFusariumOwner()
  if (auth.mfaRequired) {
    redirect(`${FUSARIUM_MFA_CHALLENGE_PATH}?redirectTo=${encodeURIComponent(FUSARIUM_OPERATOR_APP_PATH)}`)
  }
  if (auth.error?.status === 401) {
    redirect(`${FUSARIUM_OWNER_LOGIN_PATH}?redirectTo=${encodeURIComponent(FUSARIUM_OPERATOR_APP_PATH)}`)
  }
  if (auth.error) {
    return (
      <main className="min-h-dvh bg-black p-8 text-zinc-100">
        <section className="mx-auto max-w-xl rounded-xl border border-red-900/60 bg-zinc-950 p-6 shadow-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-400">Fusarium access denied</p>
          <h1 className="mt-3 text-2xl font-black">Owner authorization required</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">This signed-in Mycosoft account is not authorized for the Fusarium operational console.</p>
          <a className="mt-6 inline-flex min-h-[44px] items-center rounded-md border border-zinc-700 px-4 py-2 text-sm" href="/auth/logout">Sign out and use an owner account</a>
        </section>
      </main>
    )
  }
  return <FusariumLayoutClient>{children}</FusariumLayoutClient>
}
