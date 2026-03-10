/**
 * AVANI Public Page — Stewardship and Governance Layer
 * Route: /ai/avani
 * Per CURSOR_BRIEF_PUBLIC_AI_PAGE_MYCA_AVANI_MAR09_2026.md
 */

import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Shield, CheckCircle2, ArrowRight, Scale } from "lucide-react"

export const metadata: Metadata = {
  title: "AVANI | Stewardship and Governance Layer | Mycosoft",
  description:
    "AVANI is Mycosoft's grounding, governance, and safeguard layer. She evaluates what should happen before intelligence acts at full power. Policy, restraint, auditability, reversibility, and stewardship.",
}

export default function AVANIPage() {
  return (
    <div className="min-h-dvh">
      {/* Hero */}
      <section className="relative py-16 md:py-24 overflow-hidden border-b">
        <div className="container max-w-4xl mx-auto px-4 md:px-6 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border bg-amber-500/10 mb-6">
            <Shield className="h-7 w-7 text-amber-500" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6">
            AVANI
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-2">
            Stewardship and Governance Layer
          </p>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto mb-8">
            AVANI evaluates what should happen before intelligence acts at full power. She provides
            policy, restraint, auditability, reversibility, and stewardship so powerful AI can be
            deployed in the real world without losing accountability, safety, or human trust.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            <Link href="/ai">
              <Button variant="outline" size="lg" className="gap-2 min-h-[44px] min-w-[160px] px-6 touch-manipulation">
                AI Overview
              </Button>
            </Link>
            <Link href="/myca">
              <Button size="lg" className="gap-2 min-h-[44px] min-w-[120px] px-6 touch-manipulation">
                Meet MYCA
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="secondary" size="lg" className="gap-2 min-h-[44px] min-w-[140px] px-6 touch-manipulation">
                Talk to us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* What AVANI is */}
      <section className="py-16 md:py-20 border-b">
        <div className="container max-w-4xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">What AVANI Is</h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4">
            AVANI is Mycosoft&apos;s grounding, governance, and safeguard layer. She evaluates what
            should happen before intelligence acts at full power. She provides policy, restraint,
            auditability, reversibility, and stewardship.
          </p>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4">
            AVANI exists so the system can be trustworthy. She is the reason the system can be used
            in real organizations. She is the layer that keeps intelligence from becoming reckless,
            brittle, or unaccountable.
          </p>
          <p className="text-base font-medium">
            AVANI is not a filter bolted on at the end. She is part of how the system thinks
            safely in the first place.
          </p>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-16 md:py-20 border-b bg-muted/30">
        <div className="container max-w-5xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">AVANI Capabilities</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: Shield, title: "Policy & constitutional constraints", desc: "Constraints for AI actions" },
              { icon: CheckCircle2, title: "Grounding & approval logic", desc: "Before high-impact execution" },
              { icon: Scale, title: "Safety gating & risk-tiered authorization", desc: "Escalation and risk management" },
              { title: "Audit trails & traceability", desc: "Accountability and reversibility" },
              { title: "Protection against unsafe behavior", desc: "Deceptive or out-of-bounds behavior" },
              { title: "Ecological & human-centered stewardship", desc: "Biosphere-aware governance" },
              { title: "Seasonal / degraded states", desc: "Failure, uncertainty, missing oversight" },
              { title: "Kill-switch, pause, intervention", desc: "Human override support" },
            ].map((item, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  {item.icon ? (
                    <item.icon className="h-5 w-5 text-amber-500 mb-2" />
                  ) : null}
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Relationship to MYCA */}
      <section className="py-16 md:py-20 border-b">
        <div className="container max-w-4xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">How AVANI Works With MYCA</h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4">
            Most AI systems collapse intelligence and authority into one layer. Mycosoft separates
            them: MYCA expands capability; AVANI evaluates sustainability, safety, and legitimacy.
          </p>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4">
            MYCA moves work forward. AVANI ensures it remains grounded, reviewable, and bounded.
            MYCA helps humans, agents, and models do more. AVANI makes sure &quot;more&quot; does not
            become reckless.
          </p>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            Together, MYCA and AVANI create a system that can move quickly without becoming reckless —
            useful for real organizations where accountability matters.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Link href="/myca">
              <Button variant="outline" className="gap-2 min-h-[44px] touch-manipulation">
                Explore MYCA
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/ai">
              <Button variant="ghost" className="gap-2 min-h-[44px] touch-manipulation">
                AI Overview
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20">
        <div className="container max-w-4xl mx-auto px-4 md:px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Request Access</h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mb-8">
            Deploy governed AI with Mycosoft. Talk to us about human seats, agent seats, and
            infrastructure tiers.
          </p>
          <Link href="/contact">
            <Button size="lg" className="min-h-[44px] px-8 touch-manipulation">
              Talk to us
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
