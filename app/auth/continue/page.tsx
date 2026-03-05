/**
 * Auth Continue - server-side redirect after password login.
 * Login route sets session cookies and redirects here; we immediately
 * redirect to the target page so cookies are sent with the request.
 */
import { redirect } from "next/navigation"

function sanitizeNext(next: string | null): string {
  if (!next || typeof next !== "string") return "/dashboard"
  // Only allow relative paths - prevent open redirect
  const trimmed = next.trim()
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/dashboard"
  return trimmed
}

export default async function AuthContinuePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const params = await searchParams
  const next = sanitizeNext(params.next ?? null)
  redirect(next)
}
