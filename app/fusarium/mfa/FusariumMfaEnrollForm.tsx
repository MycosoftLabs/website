"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Loader2, Shield } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { FUSARIUM_OPERATOR_APP_PATH } from "@/lib/fusarium-operator-login"

interface FusariumMfaEnrollFormProps {
  redirectTo: string
}

export function FusariumMfaEnrollForm({ redirectTo }: FusariumMfaEnrollFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [showSecret, setShowSecret] = useState(false)
  const [code, setCode] = useState("")
  const supabase = createClient()
  const safeRedirect =
    redirectTo.startsWith("/") && !redirectTo.startsWith("//") && !redirectTo.includes("://")
      ? redirectTo
      : FUSARIUM_OPERATOR_APP_PATH

  async function startEnroll() {
    if (!supabase || !isSupabaseConfigured) {
      setError("Fusarium operator sign-in is not configured.")
      return
    }
    setIsLoading(true)
    setError("")
    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Fusarium owner",
      })
      if (enrollError || !data) {
        setError(enrollError?.message || "TOTP enrollment is not available on this project.")
        return
      }
      setFactorId(data.id)
      setQrCode(data.totp.qr_code)
      setSecret(data.totp.secret)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start TOTP enrollment")
    } finally {
      setIsLoading(false)
    }
  }

  async function verifyEnroll(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !factorId) return
    setIsLoading(true)
    setError("")
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      })
      if (challengeError || !challenge) {
        setError(challengeError?.message || "Could not start MFA challenge")
        return
      }
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: code.trim(),
      })
      if (verifyError) {
        setError(verifyError.message)
        return
      }
      router.replace(safeRedirect)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify authenticator")
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
          <h1 className="text-2xl font-semibold text-white">Enroll authenticator 2FA</h1>
        </div>
      </div>
      <p className="mb-6 text-sm leading-6 text-zinc-400">
        This uses live Supabase TOTP MFA. Scan the QR code in an authenticator app, then enter the
        6-digit code. Email OTP remains available as a first-factor magic link, not a fake 2FA badge.
      </p>
      {error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {!factorId ? (
        <Button className="h-12 w-full min-h-[44px]" type="button" disabled={isLoading} onClick={startEnroll}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Generate authenticator QR
        </Button>
      ) : (
        <form onSubmit={verifyEnroll} className="space-y-4">
          {qrCode ? (
            <img
              src={qrCode}
              alt="Authenticator QR code"
              className="mx-auto h-48 w-48 rounded-lg bg-white p-2"
            />
          ) : null}
          {secret ? (
            <div className="space-y-2 text-center">
              <Button
                type="button"
                variant="ghost"
                className="h-12 min-h-[44px] text-sm text-zinc-400"
                onClick={() => setShowSecret((current) => !current)}
              >
                {showSecret ? "Hide setup key" : "Show setup key"}
              </Button>
              {showSecret ? <p className="break-all text-xs text-zinc-500">{secret}</p> : null}
            </div>
          ) : null}
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
          <Button className="h-12 w-full min-h-[44px]" type="submit" disabled={isLoading || code.trim().length < 6}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Verify and continue
          </Button>
        </form>
      )}
    </div>
  )
}
