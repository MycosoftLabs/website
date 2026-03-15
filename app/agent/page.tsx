/**
 * Agent Access — MYCA & AVANI Live Worldstate
 * Sell live connection time to external agents at $1/minute.
 * Created: March 14, 2026
 */

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Bot,
  Key,
  Clock,
  ArrowRight,
  Check,
  Loader2,
  Zap,
  Shield,
  Database,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSupabaseUser } from "@/hooks/use-supabase-user"
import { useSearchParams } from "next/navigation"

const FEATURES = [
  { icon: Bot, text: "Live worldstate from MYCA and AVANI" },
  { icon: Clock, text: "Metered by active connection minute" },
  { icon: Key, text: "API keys and session lifecycle" },
  { icon: Shield, text: "402 when balance exhausted — fail closed" },
  { icon: Database, text: "Prepaid minutes, no surprise billing" },
]

export default function AgentAccessPage() {
  const { user } = useSupabaseUser()
  const searchParams = useSearchParams()
  const success = searchParams.get("success") === "1"
  const [checkingOut, setCheckingOut] = useState(false)

  useEffect(() => {
    if (success) {
      window.history.replaceState({}, "", "/agent")
    }
  }, [success])

  async function handleBuyMinutes() {
    if (!user) {
      window.location.href = "/login?redirect=/agent"
      return
    }
    setCheckingOut(true)
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "agent_worldstate", minutes: 60 }),
      })
      if (res.ok) {
        const { url } = await res.json()
        window.location.href = url
      } else {
        const err = await res.json()
        alert(err.error || "Checkout failed")
      }
    } catch (e) {
      console.error(e)
      alert("Checkout failed. Please try again.")
    } finally {
      setCheckingOut(false)
    }
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-background to-muted/30">
      <section className="container max-w-4xl mx-auto px-4 sm:px-6 pt-16 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 dark:bg-amber-500/20 rounded-full text-amber-600 dark:text-amber-400 text-sm font-medium">
            <Zap className="w-4 h-4" />
            For external agents and integrations
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Agent Access — MYCA & AVANI Live Worldstate
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl">
            Connect your agents to live worldstate from MYCA and AVANI. Pay only for
            active connection time at <strong className="text-foreground">$1 per minute</strong>.
          </p>

          {success && (
            <div className="rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-4 text-emerald-700 dark:text-emerald-400">
              <p className="font-medium">Purchase complete.</p>
              <p className="text-sm mt-1">
                Your prepaid minutes are on your account. Use your API key to start a paid session.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button
              size="lg"
              className="min-h-[44px] text-base"
              onClick={handleBuyMinutes}
              disabled={checkingOut}
            >
              {checkingOut ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  Buy 60 minutes — $60
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
            <Button variant="outline" size="lg" asChild className="min-h-[44px] text-base">
              <Link href="/pricing#agent">View pricing</Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="min-h-[44px] text-base">
              <Link href="/agent/dashboard">View balance & usage</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      <section className="container max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h2 className="text-xl font-semibold mb-6">What you get</h2>
        <ul className="space-y-4">
          {FEATURES.map(({ icon: Icon, text }, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-muted-foreground">{text}</span>
            </motion.li>
          ))}
        </ul>
      </section>

      <section className="container max-w-4xl mx-auto px-4 sm:px-6 py-12 border-t">
        <h2 className="text-xl font-semibold mb-4">How it works</h2>
        <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
          <li>Sign up or sign in, then purchase a prepaid minute pack (e.g. 60 minutes).</li>
          <li>Receive an API key and account for metered session access.</li>
          <li>Call MAS to register, start a paid session, and send heartbeats to keep the session active.</li>
          <li>Use MYCA and AVANI worldstate endpoints only; all other paid routes are off until verified.</li>
          <li>When balance runs out, the API returns 402 Payment Required; top up to continue.</li>
        </ol>
        <p className="mt-6 text-sm text-muted-foreground">
          Start with MYCA and AVANI only. Full x402 payment-challenge flow is planned as a
          follow-up hardening phase.
        </p>
      </section>

      <section className="container max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-2xl border bg-card p-6 sm:p-8">
          <h2 className="text-xl font-semibold mb-2">Human users</h2>
          <p className="text-muted-foreground mb-4">
            If you&apos;re a person (not an agent), use search and the main site. Agent Access
            is for automated systems that need live worldstate connection time.
          </p>
          <Button variant="outline" asChild>
            <Link href="/search">Go to Search</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
