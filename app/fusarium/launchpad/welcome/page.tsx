"use client"

/**
 * Post-pay welcome. Reads ?session_id= from Stripe's return URL.
 * Confirms payment via the read-only session API. Does not grant entitlements —
 * the webhook stages a pending purchase; signup + onboarding claims it by
 * verified auth email only.
 */

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck } from "lucide-react"
import {
  NeuBadge,
  NeuromorphicProvider,
} from "@/components/ui/neuromorphic"
import { GlassButton } from "@/components/ui/glass-button"
import { COMMERCIAL_NON_CUI_BANNER } from "@/lib/launchpad/constants"

interface SessionStatus {
  paid: boolean
  email: string | null
  lookupKey: string | null
  planName: string | null
  claimed: boolean
  kind: string | null
  company: string | null
}

export default function WelcomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
        </div>
      }
    >
      <WelcomeBody />
    </Suspense>
  )
}

function WelcomeBody() {
  const params = useSearchParams()
  const sessionId = params?.get("session_id") ?? ""
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading")
  const [status, setStatus] = useState<SessionStatus | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setState("missing")
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch(
          `/api/fusarium/launchpad/billing/session/${encodeURIComponent(sessionId)}`,
        )
        const d = await r.json().catch(() => ({}))
        if (cancelled) return
        if (!r.ok) {
          setErr(typeof d?.error === "string" ? d.error : "Could not confirm this payment.")
          setState("error")
          return
        }
        setStatus({
          paid: Boolean(d.paid),
          email: typeof d.email === "string" ? d.email : null,
          lookupKey: typeof d.lookupKey === "string" ? d.lookupKey : null,
          planName: typeof d.planName === "string" ? d.planName : null,
          claimed: Boolean(d.claimed),
          kind: typeof d.kind === "string" ? d.kind : null,
          company: typeof d.company === "string" ? d.company : null,
        })
        setState("ready")
      } catch {
        if (!cancelled) {
          setErr("Network error — please try again.")
          setState("error")
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sessionId])

  const onboarding = "/app/launchpad/onboarding"
  const signupHref = `/signup?redirectTo=${encodeURIComponent(onboarding)}`
  const loginHref = `/login?redirectTo=${encodeURIComponent(onboarding)}`

  return (
    <NeuromorphicProvider>
      <div className="launchpad-glass-page min-h-dvh">
        <div className="bg-slate-950 text-center py-1.5 px-4">
          <span className="text-[11px] tracking-widest font-semibold text-emerald-400">
            {COMMERCIAL_NON_CUI_BANNER}
          </span>
        </div>

        <section className="py-12">
          <div className="container max-w-2xl mx-auto px-4">
            <div className="text-center mb-8">
              <NeuBadge variant="default" className="mb-4">Welcome</NeuBadge>
              <h1 className="text-3xl md:text-4xl font-bold">Claim your Launchpad workspace</h1>
              <p className="text-muted-foreground mt-2">
                This page confirms your payment. It does not turn on entitlements by itself.
              </p>
            </div>

            {state === "loading" && (
              <div className="myco-glass-surface rounded-2xl border border-border/70 p-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-500" />
                <p className="text-sm text-muted-foreground mt-3">Confirming your checkout with Stripe…</p>
              </div>
            )}

            {state === "missing" && (
              <div className="myco-glass-surface rounded-2xl border border-border/70 p-6">
                <p className="text-sm text-muted-foreground">
                  No checkout session was provided. If you just paid, use the link Stripe emailed you,
                  or return to pricing and start again.
                </p>
                <Link
                  href="/fusarium/launchpad/pricing"
                  className="text-sm text-emerald-600 dark:text-emerald-400 underline underline-offset-2 mt-4 inline-block"
                >
                  Back to pricing
                </Link>
              </div>
            )}

            {state === "error" && (
              <div className="myco-glass-surface rounded-2xl border border-border/70 p-6">
                <p className="text-sm text-destructive">{err}</p>
                <Link
                  href="/fusarium/launchpad/pricing"
                  className="text-sm text-emerald-600 dark:text-emerald-400 underline underline-offset-2 mt-4 inline-block"
                >
                  Back to pricing
                </Link>
              </div>
            )}

            {state === "ready" && status && (
              <div className="space-y-6">
                <div className="myco-glass-surface rounded-2xl border-2 border-emerald-500/50 p-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-semibold">
                        {status.paid ? "Payment received" : "Checkout not complete"}
                      </p>
                      <h2 className="text-2xl font-bold mt-1">
                        {status.planName ?? "FUSARIUM Launchpad"}
                      </h2>
                      {status.email && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Sign in with <span className="font-medium text-foreground">{status.email}</span>
                          {" "}— the same address Stripe has. A different email cannot claim this purchase.
                        </p>
                      )}
                      {status.claimed && (
                        <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">
                          This purchase is already claimed on a workspace.
                        </p>
                      )}
                      {!status.paid && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Stripe has not marked this session paid yet. If you were charged, wait a moment
                          and refresh — provisioning waits on the verified webhook, not this page.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="myco-glass-surface rounded-2xl border border-border/70 p-6">
                  <h2 className="text-lg font-semibold mb-2">Next: create or open your workspace</h2>
                  <ol className="text-sm text-muted-foreground space-y-2 mb-6 list-decimal pl-5">
                    <li>Create an account (or sign in) with that email.</li>
                    <li>Name the company on onboarding. That step claims the paid purchase automatically.</li>
                    <li>Entitlements apply only after the claim matches your verified auth email.</li>
                  </ol>
                  <div className="flex flex-col sm:flex-row gap-3">
                    {status.claimed ? (
                      <GlassButton href="/app/launchpad/dashboard" className="myco-glass-button--block sm:flex-1">
                        Open workspace <ArrowRight className="ml-2 h-4 w-4 text-current" />
                      </GlassButton>
                    ) : (
                      <>
                        <GlassButton href={signupHref} className="myco-glass-button--block sm:flex-1">
                          Create account <ArrowRight className="ml-2 h-4 w-4 text-current" />
                        </GlassButton>
                        <GlassButton href={loginHref} className="myco-glass-button--block sm:flex-1">
                          Sign in
                        </GlassButton>
                      </>
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  Purchase does not confer certification, eligibility, or an award. Mycosoft is
                  pursuing CMMC Level 2 (Self-Assessment). This workspace is commercial / non-CUI.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </NeuromorphicProvider>
  )
}
