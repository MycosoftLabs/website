"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Loader2, Shield } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { FUSARIUM_OPERATOR_APP_PATH } from "@/lib/fusarium-operator-login"

interface FusariumMfaChallengeFormProps {
  redirectTo: string
}

export function FusariumMfaChallengeForm({ redirectTo }: FusariumMfaChallengeFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const supabase = createClient()
  const safeRedirect =
    redirectTo.startsWith("/") && !redirectTo.startsWith("//") && !redirectTo.includes("://")
      ? redirectTo
      : FUSARIUM_OPERATOR_APP_PATH

  useEffect(() => {
    let cancelled = false
    async function loadFactor() {
      if (!supabase || !isSupabaseConfigured) {
        setError("Fusarium operator sign-in is not configured.")
        return
      }
      const { data, error: listError } = await supabase.auth.mfa.listFactors()
      if (cancelled) return
      if (listError) {
        setError(listError.message)
        return
      }
      const verified = (data?.totp || []).find((factor) => factor.status === "verified")
      if (!verified) {
        setError("No verified authenticator is enrolled on this owner account yet.")
        return
      }
      setFactorId(verified.id)
    }
    void loadFactor()
    return () => {
      cancelled = true
    }
  }, [supabase])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !factorId) return
    setIsLoading(true)
    setError("")
    try {
      const { data, error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: code.trim(),
      })
      if (verifyError || !data) {
        setError(verifyError?.message || "Authenticator code was rejected")
        return
      }
      router.replace(safeRedirect)
    } catch (err) {
      setError(err instanceof Error ? err.message : "MFA challenge failed")
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
          <h1 className="text-2xl font-semibold text-white">Authenticator challenge</h1>
        </div>
      </div>
      <p className="mb-6 text-sm leading-6 text-zinc-400">
        Enter the current 6-digit code from the enrolled authenticator app. This is live Supabase TOTP
        MFA, not a placeholder check.
      </p>
      {error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="totp" className="text-zinc-200">
            Authenticator code
          </Label>
          <Input
            id="totp"
            name="totp"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="h-12 text-base"
          />
        </div>
        <Button
          className="h-12 w-full min-h-[44px]"
          type="submit"
          disabled={isLoading || !factorId || code.trim().length < 6}
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Verify owner session
        </Button>
      </form>
    </div>
  )
}
