"use client"

import { Shield, Scale, Eye, Users, FileCheck, ArrowRight } from "lucide-react"
import Link from "next/link"
export default function EthicsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-muted/30 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background/80 px-4 py-1.5 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            Ethics Framework
          </div>
          <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Mycosoft Ethics Policy
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Our AI systems operate under a structured ethics framework — Truth, Incentive, and Horizon gates — with sector-specific checklists and mandatory human oversight.
          </p>
        </div>
      </section>

      {/* Three Gates */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-2xl font-bold">Three-Gate Pipeline</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <GateCard
              icon={Scale}
              title="Truth Gate"
              description="Every autonomous action is fact-checked against MINDEX and authoritative sources before execution. Claims must be verifiable; ecological and scientific statements must align with our knowledge base."
            />
            <GateCard
              icon={Eye}
              title="Incentive Gate"
              description="We screen for manipulation, hidden agendas, and misaligned incentives. Actions that could deceive users or stakeholders are blocked. Transparency is mandatory."
            />
            <GateCard
              icon={ArrowRight}
              title="Horizon Gate"
              description="Long-term consequences are considered. We evaluate second-order effects and avoid irreversible harm. Short-term gains that create lasting negative impact are rejected."
            />
          </div>
        </div>
      </section>

      {/* Sector Checklists */}
      <section className="border-t bg-muted/20 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-2xl font-bold">Sector-Specific Checklists</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <ChecklistCard
              title="Defense & Dual-Use"
              items={["Dual-use review", "Export control compliance", "Impact assessment"]}
            />
            <ChecklistCard
              title="Public Sector"
              items={["Data privacy", "Bias audit", "Transparency requirements"]}
            />
            <ChecklistCard
              title="Hardware Deployment"
              items={["Environmental impact", "Usage constraints", "Safety verification"]}
            />
            <ChecklistCard
              title="General Operations"
              items={["Truth verification", "Incentive alignment", "Horizon check", "Human override"]}
            />
          </div>
        </div>
      </section>

      {/* Human Oversight */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-6 text-2xl font-bold">Human Oversight</h2>
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-muted-foreground">
                  Every autonomous action can be revoked or corrected by a human. Morgan (CEO) and designated keyholders retain final authority. The ethics review gate runs before each task execution — blocks are logged, warnings are surfaced, and humans are always in the loop for high-risk decisions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ethics Training */}
      <section className="border-t bg-muted/20 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Ethics Training</h2>
              <p className="mt-2 text-muted-foreground">
                Our agents undergo scenario-based ethics training before production deployment. Pass/fail thresholds and grading rubrics are defined in config.
              </p>
            </div>
            <Link
              href="/ethics-training"
              className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              <FileCheck className="h-4 w-4" />
              View Ethics Training
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm text-muted-foreground">
            For contract ethics annex templates or compliance inquiries, contact{" "}
            <a href="mailto:legal@mycosoft.com" className="underline hover:text-foreground">
              legal@mycosoft.com
            </a>
          </p>
        </div>
      </section>
    </div>
  )
}

function GateCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function ChecklistCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h3 className="mb-3 font-semibold">{title}</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
