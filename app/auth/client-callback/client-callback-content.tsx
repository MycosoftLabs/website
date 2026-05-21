"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

function sanitizeNext(value: string | null): string {
  if (!value) return "/dashboard"
  const trimmed = value.trim()
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("://")) {
    return "/dashboard"
  }
  return trimmed
}

function redirectToLogin(error: string, next: string) {
  const params = new URLSearchParams({
    error,
    redirectTo: next,
  })
  window.location.replace(`/login?${params.toString()}`)
}

export function ClientCallbackContent() {
  const searchParams = useSearchParams()
  const startedRef = useRef(false)
  const [message, setMessage] = useState("Finishing sign in...")

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const finishSignIn = async () => {
      const code = searchParams.get("code")
      const next = sanitizeNext(searchParams.get("next") || searchParams.get("redirectTo"))

      if (!code) {
        redirectToLogin("Missing auth code", next)
        return
      }

      const supabase = createClient()
      if (!supabase) {
        redirectToLogin("Sign-in is not configured. Missing Supabase env.", next)
        return
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        redirectToLogin(error.message, next)
        return
      }

      setMessage("Opening dashboard...")
      window.location.replace(next)
    }

    finishSignIn().catch((err) => {
      const next = sanitizeNext(searchParams.get("next") || searchParams.get("redirectTo"))
      redirectToLogin(err instanceof Error ? err.message : "Failed to finish sign in", next)
    })
  }, [searchParams])

  return (
    <div className="container flex min-h-dvh w-screen flex-col items-center justify-center gap-3 py-8">
      <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
