"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { AlertCircle, Loader2, Mail, Shield } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { FUSARIUM_OPERATOR_APP_PATH } from "@/lib/fusarium-operator-login"

interface FusariumLoginFormProps {
  redirectTo: string
  initialError?: string | null
}

export function FusariumLoginForm({ redirectTo, initialError }: FusariumLoginFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(initialError ?? "")
  const [message, setMessage] = useState("")
  const [showMagicLink, setShowMagicLink] = useState(false)
  const supabase = createClient()
  const safeRedirect =
    redirectTo.startsWith("/") && !redirectTo.startsWith("//") && !redirectTo.includes("://")
      ? redirectTo
      : FUSARIUM_OPERATOR_APP_PATH

  const handleMagicLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase || !isSupabaseConfigured) {
      setError("Fusarium operator sign-in is not configured.")
      return
    }
    setIsLoading(true)
    setError("")
    setMessage("")
    const formData = new FormData(event.currentTarget)
    const email = String(formData.get("email") || "")
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeRedirect)}`,
        },
      })
      if (otpError) {
        setError(otpError.message)
      } else {
        setMessage("Check your email for the operator sign-in link.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send magic link")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-950/90 p-6 shadow-2xl sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
          <Shield className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
            Fusarium operator
          </p>
          <h1 className="text-2xl font-semibold text-white">Owner sign-in</h1>
        </div>
      </div>
      <p className="mb-6 text-sm leading-6 text-zinc-400">
        This is the Fusarium operational console. Civilian website accounts use{" "}
        <Link href="/login" className="text-emerald-400 underline underline-offset-4">
          mycosoft.com/login
        </Link>
        . Only the owner session may continue.
      </p>

      {error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {message ? (
        <Alert className="mb-4 border-emerald-500/40 bg-emerald-500/10">
          <Mail className="h-4 w-4 text-emerald-400" />
          <AlertDescription className="text-emerald-300">{message}</AlertDescription>
        </Alert>
      ) : null}

      {showMagicLink ? (
        <form onSubmit={handleMagicLink} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-zinc-200">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              disabled={isLoading}
              className="h-12 text-base"
            />
          </div>
          <Button className="h-12 w-full min-h-[44px]" type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
            Send operator magic link
          </Button>
          <Button
            variant="ghost"
            className="h-12 w-full min-h-[44px]"
            type="button"
            onClick={() => setShowMagicLink(false)}
          >
            Back to password sign-in
          </Button>
        </form>
      ) : (
        <form
          action={`/fusarium/auth/login?redirectTo=${encodeURIComponent(safeRedirect)}`}
          method="POST"
          className="space-y-4"
        >
          <input type="hidden" name="redirectTo" value={safeRedirect} />
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-zinc-200">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              disabled={isLoading}
              className="h-12 text-base"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password" className="text-zinc-200">
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={isLoading}
              className="h-12 text-base"
            />
          </div>
          <Button type="submit" className="h-12 w-full min-h-[44px]" disabled={isLoading}>
            Sign in to Fusarium
          </Button>
          <Button
            variant="ghost"
            className="h-12 w-full min-h-[44px]"
            type="button"
            onClick={() => setShowMagicLink(true)}
          >
            Sign in with magic link
          </Button>
        </form>
      )}
    </div>
  )
}
