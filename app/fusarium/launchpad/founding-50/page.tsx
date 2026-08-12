"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Loader2, Send } from "lucide-react"
import {
  NeuButton,
  NeuCard,
  NeuCardContent,
  NeuCardHeader,
  NeuBadge,
  NeuromorphicProvider,
} from "@/components/ui/neuromorphic"
import { COMMERCIAL_NON_CUI_BANNER } from "@/lib/launchpad/constants"
import { FOUNDING_PASS_CAP } from "@/lib/launchpad/catalog"

const STAGES = [
  ["idea", "Idea — entity not fully established"],
  ["entity", "Entity exists — registrations and acquisition knowledge are thin"],
  ["bidding", "Registered — proposals and capture are inconsistent"],
  ["award", "Expecting FCI/CUI or contract flow-downs"],
  ["production", "Hardware moving from prototype to production"],
] as const

const offerTerms = [
  `$397 one-time Founding Launch Pass, limited to the first ${FOUNDING_PASS_CAP} accepted companies`,
  "Guided activation plus the first 30 days of Launchpad Core",
  "A recurring plan is optional and explicitly selected — nothing auto-renews silently",
  "External providers (enclave, cloud, assessors, counsel, hardware) are paid directly by you",
  "No certification, no independent assessment, no legal advice, no award guarantee, no clearance sponsorship, no CUI hosting",
  "Applicants must have a legitimate technology or business and agree to truthful use",
]

const input =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base " +
  "focus:outline-none focus:ring-2 focus:ring-primary/40"

export default function Founding50Page() {
  const [form, setForm] = useState({
    name: "", email: "", company: "", website: "", builds: "",
    stage: "", targetAgencies: "", heardFrom: "",
  })
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState("sending"); setError(null)
    try {
      const r = await fetch("/api/fusarium/launchpad/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setError(d?.error || "Submission failed"); setState("error"); return }
      setState("done")
    } catch {
      setError("Network error — please try again"); setState("error")
    }
  }

  return (
    <NeuromorphicProvider>
      <div className="min-h-dvh">
        <div className="bg-slate-950 text-center py-1.5 px-4">
          <span className="text-[11px] tracking-widest font-semibold text-emerald-400">
            {COMMERCIAL_NON_CUI_BANNER}
          </span>
        </div>

        <div className="border-b border-border/50">
          <div className="container max-w-7xl mx-auto px-4 py-4">
            <Link href="/fusarium/launchpad" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to Launchpad
            </Link>
          </div>
        </div>

        <section className="py-16">
          <div className="container max-w-3xl mx-auto px-4">
            <div className="text-center mb-10">
              <NeuBadge variant="default" className="mb-4 border-destructive/30 text-destructive">
                Founding 50
              </NeuBadge>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance">
                Fifty technical startups. One guided path into defense contracting.
              </h1>
              <p className="text-lg text-muted-foreground">
                Apply below. Applications are reviewed in order; qualified companies receive an
                activation invitation when the cohort opens.
              </p>
            </div>

            <NeuCard className="mb-10">
              <NeuCardHeader>
                <h2 className="text-lg font-semibold">The offer, plainly</h2>
              </NeuCardHeader>
              <NeuCardContent>
                <ul className="space-y-2.5">
                  {offerTerms.map((t) => (
                    <li key={t} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {t}
                    </li>
                  ))}
                </ul>
              </NeuCardContent>
            </NeuCard>

            {state === "done" ? (
              <NeuCard>
                <NeuCardContent className="pt-8 pb-8 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Application received</h2>
                  <p className="text-muted-foreground">
                    We will review it and reply to {form.email || "your email"}. No payment is due now.
                  </p>
                </NeuCardContent>
              </NeuCard>
            ) : (
              <NeuCard>
                <NeuCardHeader>
                  <h2 className="text-lg font-semibold">Apply</h2>
                  <p className="text-sm text-muted-foreground">
                    Public, non-sensitive company facts only. Do not include CUI, credentials, or
                    proprietary technical data in this form.
                  </p>
                </NeuCardHeader>
                <NeuCardContent>
                  <form onSubmit={submit} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium block mb-1.5">Your name *</label>
                        <input required className={input} value={form.name} onChange={set("name")} />
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-1.5">Work email *</label>
                        <input required type="email" className={input} value={form.email} onChange={set("email")} />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium block mb-1.5">Company *</label>
                        <input required className={input} value={form.company} onChange={set("company")} />
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-1.5">Website</label>
                        <input className={input} placeholder="https://" value={form.website} onChange={set("website")} />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1.5">What does your company build?</label>
                      <textarea rows={3} className={input} value={form.builds} onChange={set("builds")}
                        placeholder="Robotics, AI, sensors, software, biotech, manufacturing…" />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1.5">Where are you today?</label>
                      <select className={input} value={form.stage} onChange={set("stage")}>
                        <option value="">Select a stage…</option>
                        {STAGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium block mb-1.5">Target agencies (optional)</label>
                        <input className={input} placeholder="Navy, DARPA, DIU…" value={form.targetAgencies} onChange={set("targetAgencies")} />
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-1.5">How did you hear about us?</label>
                        <input className={input} value={form.heardFrom} onChange={set("heardFrom")} />
                      </div>
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <NeuButton variant="primary" className="w-full py-3 text-base" disabled={state === "sending"}>
                      {state === "sending"
                        ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Submitting…</>
                        : <><Send className="mr-2 h-5 w-5" /> Submit application</>}
                    </NeuButton>
                    <p className="text-xs text-muted-foreground text-center">
                      Submitting an application creates no obligation on either side and stores only the
                      information above.
                    </p>
                  </form>
                </NeuCardContent>
              </NeuCard>
            )}
          </div>
        </section>
      </div>
    </NeuromorphicProvider>
  )
}
