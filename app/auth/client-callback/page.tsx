import type { Metadata } from "next"
import { Suspense } from "react"
import { ClientCallbackContent } from "./client-callback-content"

export const metadata: Metadata = {
  title: "Signing In | Mycosoft",
  robots: {
    index: false,
    follow: false,
  },
}

export default function ClientCallbackPage() {
  return (
    <Suspense fallback={null}>
      <ClientCallbackContent />
    </Suspense>
  )
}
