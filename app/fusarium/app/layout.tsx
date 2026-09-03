import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { requireFusariumOwner } from "@/lib/auth/api-auth"
import { FUSARIUM_OWNER_LOGIN_PATH } from "@/lib/auth/fusarium-owner-gate"
import { FUSARIUM_OPERATOR_APP_PATH } from "@/lib/fusarium-operator-login"

export const metadata: Metadata = {
  title: "FUSARIUM Operator Console | Mycosoft",
  description: "Owner-only Fusarium operational console.",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default async function FusariumOperatorAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const auth = await requireFusariumOwner()
  if (auth.error?.status === 401) {
    redirect(`${FUSARIUM_OWNER_LOGIN_PATH}?redirectTo=${encodeURIComponent(FUSARIUM_OPERATOR_APP_PATH)}`)
  }
  if (auth.error) {
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
  return children
}
