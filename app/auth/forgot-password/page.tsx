import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Forgot Password | Mycosoft",
  robots: { index: false, follow: false },
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const next =
    (typeof params.redirectTo === "string" ? params.redirectTo : null) ||
    (typeof params.next === "string" ? params.next : null)
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") && !next.includes("://") ? next : "/login"
  const operator = safeNext.startsWith("/fusarium")
  redirect(
    operator
      ? `/fusarium/login?mode=forgot&redirectTo=${encodeURIComponent(safeNext)}`
      : `/login?redirectTo=${encodeURIComponent(safeNext)}`
  )
}
