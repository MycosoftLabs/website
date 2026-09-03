import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  FUSARIUM_OWNER_LOGIN_PATH,
  isFusariumOwnerEmail,
} from "@/lib/auth/fusarium-owner-gate"
import { FUSARIUM_OPERATOR_APP_PATH } from "@/lib/fusarium-operator-login"
import { FusariumLoginForm } from "./FusariumLoginForm"

export const metadata: Metadata = {
  title: "Fusarium Operator Sign In | Mycosoft",
  description: "Owner sign-in for the Fusarium operational console.",
  alternates: {
    canonical: FUSARIUM_OWNER_LOGIN_PATH,
  },
  robots: {
    index: false,
    follow: false,
  },
}

export const dynamic = "force-dynamic"

export default async function FusariumOperatorLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const requested =
    (typeof params.redirectTo === "string" ? params.redirectTo : null) ||
    (typeof params.redirect === "string" ? params.redirect : null) ||
    FUSARIUM_OPERATOR_APP_PATH
  const safeNext =
    requested.startsWith("/") && !requested.startsWith("//") && !requested.includes("://")
      ? requested
      : FUSARIUM_OPERATOR_APP_PATH

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user && isFusariumOwnerEmail(user.email)) {
    redirect(safeNext)
  }

  if (user && !isFusariumOwnerEmail(user.email)) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-black p-4 text-zinc-100">
        <section className="w-full max-w-xl rounded-xl border border-red-900/60 bg-zinc-950 p-6 shadow-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-400">
            Fusarium access denied
          </p>
          <h1 className="mt-3 text-2xl font-black">Owner authorization required</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            This signed-in Mycosoft account is not authorized for the Fusarium operational console.
          </p>
          <a
            className="mt-6 inline-flex min-h-[44px] items-center rounded-md border border-zinc-700 px-4 py-2 text-sm"
            href="/auth/logout"
          >
            Sign out and use an owner account
          </a>
        </section>
      </main>
    )
  }

  const initialError = typeof params.error === "string" ? params.error : null

  return (
    <main className="flex min-h-dvh items-center justify-center bg-black px-4 py-10">
      <FusariumLoginForm redirectTo={safeNext} initialError={initialError} />
    </main>
  )
}
