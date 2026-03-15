import { LoginForm } from "./LoginForm"

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
