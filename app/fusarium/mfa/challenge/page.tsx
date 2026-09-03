import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { requireFusariumOwner } from "@/lib/auth/api-auth"
import { FUSARIUM_OWNER_LOGIN_PATH } from "@/lib/auth/fusarium-owner-gate"
import { FUSARIUM_OPERATOR_APP_PATH } from "@/lib/fusarium-operator-login"
import { FusariumMfaChallengeForm } from "../FusariumMfaChallengeForm"

export const metadata: Metadata = {
  title: "Fusarium Owner 2FA Challenge | Mycosoft",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default async function FusariumMfaChallengePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const requested =
    (typeof params.redirectTo === "string" ? params.redirectTo : null) || FUSARIUM_OPERATOR_APP_PATH
  const safeNext =
    requested.startsWith("/") && !requested.startsWith("//") && !requested.includes("://")
      ? requested
      : FUSARIUM_OPERATOR_APP_PATH

  const auth = await requireFusariumOwner({ allowAal1: true })
  if (auth.error?.status === 401) {
    redirect(`${FUSARIUM_OWNER_LOGIN_PATH}?redirectTo=${encodeURIComponent(safeNext)}`)
  }
  if (auth.error) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-black p-4 text-zinc-100">
        <section className="w-full max-w-xl rounded-xl border border-red-900/60 bg-zinc-950 p-6">
          <h1 className="text-2xl font-black">Owner authorization required</h1>
        </section>
      </main>
    )
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-black px-4 py-10">
      <FusariumMfaChallengeForm redirectTo={safeNext} />
    </main>
  )
}
