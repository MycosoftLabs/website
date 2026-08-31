"use client"

/**
 * Post-pay welcome. Reads ?session_id= from Stripe's return URL.
 *
 * This page is the hand-off between "paid Stripe" and "inside the product". It
 * reads the session (read-only, grants nothing), then POSTs activate, which is
 * what actually provisions the tenant and sets the auth + tenant cookies. The
 * buyer should end up logged in on onboarding without ever being told to go
 * make an account — they already paid for one.
 *
 * WHY ACTIVATE AND NOT A SIGNUP LINK: the tenant is provisioned server-side
 * from the Stripe metadata the buyer already gave us at checkout. Sending them
 * to /signup would ask for the same facts twice and strand anyone who typed a
 * different email the second time.
 *
 * HONESTY BOUNDARY: nothing on this page grants entitlements. Activate re-reads
 * the session from Stripe; the verified webhook remains the real gate. When
 * provisioning fails we say so plainly rather than implying access exists.
 */

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react"
import {
  NeuBadge,
  NeuromorphicProvider,
} from "@/components/ui/neuromorphic"
import { GlassButton } from "@/components/ui/glass-button"
import { COMMERCIAL_NON_CUI_BANNER } from "@/lib/launchpad/constants"

const ONBOARDING = "/app/launchpad/onboarding"
const DASHBOARD = "/app/launchpad/dashboard"
const PRICING = "/fusarium/launchpad/pricing"

type NextStep = "pay" | "activate" | "onboarding" | "dashboard"

/** Mirrors GET /api/fusarium/launchpad/billing/session/:id. */
interface SessionStatus {
  paid: boolean
  email: string | null
  planName: string | null
  claimed: boolean
  company: string | null
  contactName: string | null
  jobTitle: string | null
  accessReady: boolean
  nextStep: NextStep | null
}

/** Mirrors POST /api/fusarium/launchpad/billing/activate on 200. */
interface ActivateResult {
  alreadyClaimed: boolean
  email: string | null
  loggedIn: boolean
  magicLinkSent: boolean
  redirectTo: string | null
  dashboardPath: string | null
  actionLink: string | null
}

type ActivatePhase = "idle" | "running" | "done" | "failed"

const isNextStep = (v: unknown): v is NextStep =>
  v === "pay" || v === "activate" || v === "onboarding" || v === "dashboard"

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null)

/**
 * Only a same-origin absolute path may drive a redirect. The value comes from
 * our own API, but a redirect target is exactly the thing worth pinning down.
 */
function safePath(value: unknown): string | null {
  if (typeof value !== "string") return null
  if (!value.startsWith("/") || value.startsWith("//")) return null
  return value
}

/**
 * Carry the Stripe session id onto an internal path so the next screen can look
 * the purchase up. Only ever applied to a path that already passed safePath.
 */
function withSessionId(path: string, sessionId: string): string {
  if (!sessionId) return path
  const [base, hash] = path.split("#")
  const joined = `${base}${base.includes("?") ? "&" : "?"}session_id=${encodeURIComponent(sessionId)}`
  return hash ? `${joined}#${hash}` : joined
}

/**
 * Where to send a buyer we could not log in. Activate's magic-link-failure
 * branch answers 200 with the BARE onboarding path, which would bounce straight
 * off middleware — so anything that is not already a login URL gets wrapped.
 */
function signInHref(redirectTo: unknown): string {
  const target = safePath(redirectTo) ?? ONBOARDING
  if (target.startsWith("/login")) return target
  return `/login?redirectTo=${encodeURIComponent(target)}`
}

/**
 * Activate failures are not interchangeable: "wait a minute" and "the payment
 * never landed" call for different moves from the buyer, so each reachable code
 * gets its own sentence instead of one shrug.
 */
function activateFailureText(httpStatus: number, code: unknown, serverError: unknown): string {
  switch (typeof code === "string" ? code : "") {
    case "rate_limited":
      return "Too many activation attempts from this network in the last minute."
    case "not_paid":
      return "Stripe has not marked this checkout paid, so nothing was provisioned."
    case "session_not_found":
    case "not_storefront":
      return "Stripe does not recognise this session as a Launchpad storefront purchase."
    case "invalid_session":
      return "That checkout session reference is not a valid one."
    case "incomplete_session":
      return "This checkout is missing the billing identity we provision a workspace against."
    case "stripe_unconfigured":
    case "service_unconfigured":
      return "Workspace provisioning is not available in this environment right now."
    default:
      break
  }
  if (typeof serverError === "string" && serverError) return serverError
  return httpStatus >= 500
    ? "Provisioning failed on our side."
    : "We could not activate this purchase."
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
  /** Bumped by "Check again" so the read-only lookup re-runs. */
  const [reloadKey, setReloadKey] = useState(0)

  const [activatePhase, setActivatePhase] = useState<ActivatePhase>("idle")
  const [activate, setActivate] = useState<ActivateResult | null>(null)
  const [activateErr, setActivateErr] = useState<string | null>(null)

  /**
   * Activate is rate-limited at 8 hits/60s per IP and provisions a tenant, so a
   * re-render, a StrictMode double-effect, or an impatient click must not fire
   * a second POST. The ref holds the session it already fired for; only the
   * explicit retry clears it.
   */
  const activateRanFor = useRef<string | null>(null)

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
          email: str(d.email),
          planName: str(d.planName),
          claimed: Boolean(d.claimed),
          company: str(d.company),
          contactName: str(d.contactName),
          jobTitle: str(d.jobTitle),
          accessReady: Boolean(d.accessReady),
          nextStep: isNextStep(d.nextStep) ? d.nextStep : null,
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
  }, [sessionId, reloadKey])

  const runActivate = useCallback(async () => {
    if (!sessionId) return
    if (activateRanFor.current === sessionId) return
    activateRanFor.current = sessionId
    setActivatePhase("running")
    setActivateErr(null)
    try {
      const r = await fetch("/api/fusarium/launchpad/billing/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok || !d?.ok) {
        setActivateErr(activateFailureText(r.status, d?.code, d?.error))
        setActivatePhase("failed")
        return
      }
      const result: ActivateResult = {
        // A second activation of the same purchase is the expected shape of a
        // refresh or a returning buyer — success, not an error.
        alreadyClaimed: Boolean(d.alreadyClaimed),
        email: str(d.email),
        loggedIn: Boolean(d.loggedIn),
        magicLinkSent: Boolean(d.magicLinkSent),
        redirectTo: safePath(d.redirectTo),
        dashboardPath: safePath(d.dashboardPath),
        actionLink:
          typeof d.actionLink === "string" && d.actionLink.startsWith("https://")
            ? d.actionLink
            : null,
      }
      setActivate(result)
      setActivatePhase("done")
      if (result.loggedIn) {
        // Full document load rather than a client route change: activate set the
        // Supabase auth and lp_tenant cookies server-side, and middleware only
        // sees them on a fresh request.
        //
        // The session id rides along so onboarding can echo back what they
        // actually bought — the plan and their own stated reason. activate does
        // not put it in redirectTo, and this is the only hop that still knows
        // it, so without this the echo has no caller and never renders.
        window.location.assign(withSessionId(result.redirectTo ?? ONBOARDING, sessionId))
      }
    } catch {
      setActivateErr("Network error — provisioning did not complete.")
      setActivatePhase("failed")
    }
  }, [sessionId])

  useEffect(() => {
    if (state !== "ready") return
    if (status?.nextStep !== "activate") return
    void runActivate()
  }, [state, status?.nextStep, runActivate])

  const retryActivate = () => {
    activateRanFor.current = null
    void runActivate()
  }

  const nextStep = status?.nextStep ?? null

  const subtitle =
    state !== "ready" || !status
      ? "Confirming your checkout with Stripe."
      : nextStep === "pay"
        ? "This checkout has not been paid, so nothing has been provisioned."
        : nextStep === "activate"
          ? "Payment confirmed. We are turning on the workspace you bought."
          : "Your workspace is provisioned. Pick up where you left off."

  /** Read-only echo of the purchase. Absent fields are omitted, never faked. */
  const summary: Array<{ label: string; value: string }> = []
  if (status?.planName) summary.push({ label: "Plan", value: status.planName })
  if (status?.company) summary.push({ label: "Company", value: status.company })
  if (status?.contactName) summary.push({ label: "Contact", value: status.contactName })
  if (status?.jobTitle) summary.push({ label: "Role", value: status.jobTitle })

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
              <h1 className="text-3xl md:text-4xl font-bold">Your Launchpad workspace</h1>
              <p className="text-muted-foreground mt-2">{subtitle}</p>
            </div>

            {state === "loading" && (
              <div className="myco-glass-surface rounded-2xl border border-border/70 p-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-500" />
                <p className="text-sm text-muted-foreground mt-3">
                  Confirming your checkout with Stripe…
                </p>
              </div>
            )}

            {state === "missing" && (
              <div className="myco-glass-surface rounded-2xl border border-border/70 p-6">
                <p className="text-sm text-muted-foreground">
                  No checkout session was provided. If you just paid, use the link Stripe emailed you,
                  or return to pricing and start again.
                </p>
                <Link
                  href={PRICING}
                  className="text-sm text-emerald-600 dark:text-emerald-400 underline underline-offset-2 mt-4 inline-block"
                >
                  Back to pricing
                </Link>
              </div>
            )}

            {state === "error" && (
              <div className="myco-glass-surface rounded-2xl border border-border/70 p-6">
                <p className="text-sm text-destructive">{err}</p>
                {/* A failed lookup is usually transient, and this page is where
                    someone who just paid lands. Offering only "back to pricing"
                    points the one person who must not buy again straight at the
                    buy button, so retry comes first and the reassurance is
                    explicit. */}
                <p className="text-sm text-muted-foreground mt-3">
                  This is a problem reading your checkout, not a problem with your payment. Nothing
                  was granted and nothing was charged twice. Do not buy again — check back here.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <GlassButton
                    onClick={() => {
                      setState("loading")
                      setErr(null)
                      setReloadKey((n) => n + 1)
                    }}
                  >
                    Check again
                  </GlassButton>
                  <Link
                    href={PRICING}
                    className="text-sm text-muted-foreground underline underline-offset-2"
                  >
                    Back to pricing
                  </Link>
                </div>
              </div>
            )}

            {state === "ready" && status && (
              <div className="space-y-6">
                {/* What they bought — proof this page knows the purchase. */}
                <div
                  className={
                    status.paid
                      ? "myco-glass-surface rounded-2xl border-2 border-emerald-500/50 p-6"
                      : "myco-glass-surface rounded-2xl border border-border/70 p-6"
                  }
                >
                  <div className="flex items-start gap-3">
                    {status.paid ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 w-full">
                      {/* Colour tracks the state, not just the wording. Left
                          unconditional, "Checkout not complete" rendered in
                          success green next to an amber warning icon. */}
                      <p
                        className={
                          status.paid
                            ? "text-[11px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-semibold"
                            : "text-[11px] uppercase tracking-widest text-amber-600 dark:text-amber-400 font-semibold"
                        }
                      >
                        {status.paid ? "Payment received" : "Checkout not complete"}
                      </p>
                      {/* No product name unless we actually resolved one — the
                          storefront family name would read as the thing they
                          bought. */}
                      <h2 className="text-2xl font-bold mt-1">
                        {status.planName ?? "Your purchase"}
                      </h2>
                      {status.email && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Your workspace belongs to{" "}
                          <span className="font-medium text-foreground">{status.email}</span> — the
                          address Stripe has. A different email cannot claim this purchase.
                        </p>
                      )}
                      {summary.length > 1 && (
                        <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2 text-sm">
                          {summary.map((row) => (
                            <div key={row.label} className="min-w-0">
                              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                {row.label}
                              </dt>
                              <dd className="font-medium text-foreground break-words">{row.value}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </div>
                  </div>
                </div>

                {/* nextStep === "pay" — grant nothing, imply nothing. */}
                {nextStep === "pay" && (
                  <div className="myco-glass-surface rounded-2xl border border-border/70 p-6">
                    <h2 className="text-lg font-semibold mb-2">Checkout did not complete</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Stripe has not marked this session paid, so no workspace was created and no
                      access was granted. If you were charged, wait a moment and check again —
                      the verified payment webhook is the gate, not this page.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <GlassButton
                        onClick={() => {
                          setState("loading")
                          setReloadKey((n) => n + 1)
                        }}
                        className="myco-glass-button--block sm:flex-1"
                      >
                        <RefreshCw className="mr-2 h-4 w-4 text-current" /> Check again
                      </GlassButton>
                      <GlassButton href={PRICING} className="myco-glass-button--block sm:flex-1">
                        Back to pricing
                      </GlassButton>
                    </div>
                  </div>
                )}

                {/* nextStep === "activate" — the POST that actually provisions. */}
                {nextStep === "activate" && (
                  <div className="myco-glass-surface rounded-2xl border border-border/70 p-6">
                    {(activatePhase === "idle" || activatePhase === "running") && (
                      <div className="text-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-500" />
                        <h2 className="text-lg font-semibold mt-3">Setting up your workspace</h2>
                        <p className="text-sm text-muted-foreground mt-2">
                          Creating your tenant from the purchase Stripe confirmed, then signing you
                          in. This takes a few seconds — please do not close this tab.
                        </p>
                      </div>
                    )}

                    {activatePhase === "done" && activate?.loggedIn && (
                      <div className="text-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-500" />
                        <h2 className="text-lg font-semibold mt-3">You are signed in</h2>
                        <p className="text-sm text-muted-foreground mt-2">
                          Taking you to onboarding…
                        </p>
                      </div>
                    )}

                    {activatePhase === "done" && activate && !activate.loggedIn && (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="myco-glass-tile h-7 w-7 text-xs font-bold">1</span>
                          <h2 className="text-lg font-semibold">Sign in to finish</h2>
                        </div>
                        <p className="text-sm text-muted-foreground mb-6">
                          Your workspace is ready
                          {activate.alreadyClaimed ? " and this purchase was already activated" : ""}.
                          {activate.magicLinkSent ? (
                            <>
                              {" "}
                              We emailed a sign-in link to{" "}
                              <span className="font-medium text-foreground">
                                {activate.email ?? status.email ?? "the email Stripe has"}
                              </span>
                              . Use that inbox — a different address cannot claim this purchase.
                            </>
                          ) : (
                            <>
                              {" "}
                              We could not sign you in automatically. Continue as{" "}
                              <span className="font-medium text-foreground">
                                {activate.email ?? status.email ?? "the email Stripe has"}
                              </span>{" "}
                              — signing in under any other address will not reach it.
                            </>
                          )}
                        </p>
                        <GlassButton
                          href={
                            activate.actionLink ??
                            signInHref(withSessionId(safePath(activate.redirectTo) ?? ONBOARDING, sessionId))
                          }
                          className="myco-glass-button--block"
                        >
                          Continue to your workspace{" "}
                          <ArrowRight className="ml-2 h-4 w-4 text-current" />
                        </GlassButton>
                      </>
                    )}

                    {activatePhase === "failed" && (
                      <>
                        <div className="flex items-start gap-3 mb-4">
                          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <h2 className="text-lg font-semibold">Provisioning did not complete</h2>
                            <p className="text-sm text-destructive mt-1">{activateErr}</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-6">
                          No workspace was turned on and no access was granted. Your payment is safe
                          — Stripe holds the record, and our verified payment webhook is the real
                          gate for entitlements, not this page. Retry below; if it keeps failing,
                          reply to your Stripe receipt and we will finish it by hand.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <GlassButton
                            onClick={retryActivate}
                            className="myco-glass-button--block sm:flex-1"
                          >
                            <RefreshCw className="mr-2 h-4 w-4 text-current" /> Retry setup
                          </GlassButton>
                          <GlassButton
                            href={signInHref(withSessionId(ONBOARDING, sessionId))}
                            className="myco-glass-button--block sm:flex-1"
                          >
                            Sign in instead
                          </GlassButton>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Already provisioned — send them onward, do not re-provision. */}
                {(nextStep === "onboarding" || nextStep === "dashboard") && (
                  <div className="myco-glass-surface rounded-2xl border border-border/70 p-6">
                    <h2 className="text-lg font-semibold mb-2">
                      {nextStep === "onboarding" ? "Finish setting up" : "Your workspace is open"}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      {nextStep === "onboarding"
                        ? "This purchase is already claimed on a workspace. Accept the terms and your dashboard opens."
                        : "This purchase is already claimed and set up."}{" "}
                      You need to be signed in as{" "}
                      <span className="font-medium text-foreground">
                        {status.email ?? "the email Stripe has"}
                      </span>{" "}
                      to reach it.
                    </p>
                    <GlassButton
                      href={nextStep === "onboarding" ? withSessionId(ONBOARDING, sessionId) : DASHBOARD}
                      className="myco-glass-button--block"
                    >
                      {nextStep === "onboarding" ? "Continue to onboarding" : "Open dashboard"}{" "}
                      <ArrowRight className="ml-2 h-4 w-4 text-current" />
                    </GlassButton>
                  </div>
                )}

                {/* The GET answered, but with a step we do not recognise. */}
                {nextStep === null && (
                  <div className="myco-glass-surface rounded-2xl border border-border/70 p-6">
                    <p className="text-sm text-muted-foreground">
                      We confirmed this checkout but could not read what happens next, so nothing was
                      activated. Check again in a moment.
                    </p>
                    <GlassButton
                      onClick={() => {
                        setState("loading")
                        setReloadKey((n) => n + 1)
                      }}
                      className="myco-glass-button--block mt-4"
                    >
                      <RefreshCw className="mr-2 h-4 w-4 text-current" /> Check again
                    </GlassButton>
                  </div>
                )}

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
