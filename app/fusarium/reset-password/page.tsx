import type { Metadata } from "next"
import { FusariumResetPasswordForm } from "./FusariumResetPasswordForm"

export const metadata: Metadata = {
  title: "Fusarium Owner Password Reset | Mycosoft",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default function FusariumResetPasswordPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-black px-4 py-10">
      <FusariumResetPasswordForm />
    </main>
  )
}
