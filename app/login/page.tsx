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
  const initialError =
    typeof params.error === "string" ? params.error : null
  const initialMessage =
    typeof params.message === "string" ? params.message : null

  return (
    <LoginForm
      redirectTo={redirectTo}
      initialError={initialError}
      initialMessage={initialMessage}
    />
  )
}
