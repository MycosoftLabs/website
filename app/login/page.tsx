import type { Metadata } from 'next'
import { LoginForm } from "./LoginForm"

export const metadata: Metadata = {
  title: 'Sign In | Mycosoft',
  description: 'Sign in to your Mycosoft account.',
  alternates: {
    canonical: '/login',
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: 'Sign In | Mycosoft',
    description: 'Sign in to your Mycosoft account.',
    url: '/login',
  },
}

function normalizeRedirectForDevice(redirectTo: string, device: string | null) {
  if (!device) return redirectTo
  if (redirectTo === "/dashboard") return `/natureos/mycobrain?device=${encodeURIComponent(device)}`

  try {
    const url = new URL(redirectTo, "http://localhost")
    if (url.pathname !== "/natureos/mycobrain") return redirectTo
    url.searchParams.set("device", device)
    return `${url.pathname}${url.search}`
  } catch {
    return redirectTo
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const redirectTo =
    (typeof params.redirect === "string" ? params.redirect : null) ||
    (typeof params.redirectTo === "string" ? params.redirectTo : null) ||
    (typeof params.callbackUrl === "string" ? params.callbackUrl : null) ||
    "/dashboard"
  const device = typeof params.device === "string" ? params.device : null
  const normalizedRedirectTo = normalizeRedirectForDevice(redirectTo, device)
  const initialError =
    typeof params.error === "string" ? params.error : null
  const initialMessage =
    typeof params.message === "string" ? params.message : null

  return (
    <LoginForm
      redirectTo={normalizedRedirectTo}
      initialError={initialError}
      initialMessage={initialMessage}
    />
  )
}
