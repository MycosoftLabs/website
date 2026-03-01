import { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { CorporateLiveFeed } from "@/components/about/CorporateLiveFeed"
import { NeuromorphicProvider, NeuBadge, NeuCard, NeuCardContent } from "@/components/ui/neuromorphic"
import { ArrowRight, Briefcase, Shield, Activity, Cpu, Users2, Radio } from "lucide-react"

export const metadata: Metadata = {
  title: "Corporate Team | Mycosoft",
  description:
    "Autonomous corporate leadership powered by frontier models and MYCA coordination.",
}

const CORPORATE_ROLES = [
  {
    id: "claude",
    title: "Claude CoWorker + Code",
    role: "Secretary + COO",
    detail:
      "Operational coordination, meeting synthesis, execution oversight, and autonomous procedural management.",
    icon: Briefcase,
  },
  {
    id: "chatgpt",
    title: "ChatGPT Projects + Codex",
    role: "Directors, planners, auditors",
    detail:
      "Strategic planning, director-level analysis, audits, and governance checks across the enterprise.",
    icon: Shield,
  },
  {
    id: "grok",
    title: "Grok Heavy",
    role: "State of affairs + insights",
    detail:
      "Continuous market, research, and situational intelligence with rapid insight synthesis.",
    icon: Activity,
  },
  {
    id: "google",
    title: "Gemini + Workspace + NotebookLM",
    role: "Back office + QA",
    detail:
      "Back-office operations, QA verification, and scientific structuring for documentation and policy.",
    icon: Cpu,
  },
  {
    id: "meta",
    title: "Meta AI Llama",
    role: "Knowledge synthesis",
    detail:
      "Long-form synthesis, organizational memory, and contextual reasoning across corporate domains.",
    icon: Users2,
  },
  {
    id: "myca",
    title: "MYCA Coordination",
    role: "CEO / CTO / CFO / COO bridge",
    detail:
      "MYCA coordinates all corporate agents, routing tasks, decisions, and approvals across the autonomous stack.",
    icon: Radio,
  },
]

export default function CorporateTeamPage() {
  return (
    <NeuromorphicProvider>
      <div className="min-h-dvh">
        {/* Hero */}
        <section className="relative py-16 md:py-24 overflow-hidden bg-gradient-to-b from-black via-slate-950/50 to-background">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.03)_1px,transparent_1px)] bg-[size:120px_120px]" />
          <div className="container max-w-6xl mx-auto px-4 md:px-6 relative z-10">
            <NeuBadge variant="default" className="mb-4 border border-white/20">
              Autonomous Corporation
            </NeuBadge>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4">
              Corporate Team
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl">
              Mycosoft’s board, C-suite, and director functions are executed by autonomous frontier
              services coordinated by MYCA. Each corporate agent fills critical leadership roles and
              interfaces through MYCA for unified decision making.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/myca"
                className="inline-flex items-center gap-2 h-11 min-h-[44px] min-w-[44px] px-5 rounded-lg border border-green-500/40 text-green-300 text-sm font-semibold hover:bg-green-500/10 transition-colors touch-manipulation"
              >
                MYCA Coordination
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 h-11 min-h-[44px] min-w-[44px] px-5 rounded-lg border border-border/60 text-sm font-semibold hover:bg-muted/40 transition-colors touch-manipulation"
              >
                Back to About
              </Link>
            </div>
          </div>
        </section>

        {/* Live widget */}
        <section className="relative py-10 md:py-12">
          <div className="container max-w-6xl mx-auto px-4 md:px-6">
            <CorporateLiveFeed />
          </div>
        </section>

        {/* Role mapping */}
        <section className="py-12 md:py-16">
          <div className="container max-w-6xl mx-auto px-4 md:px-6">
            <div className="text-center mb-10">
              <NeuBadge variant="default" className="mb-3 border border-white/20">
                Corporate Agents
              </NeuBadge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                How the Autonomous Corporation Operates
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mt-2">
                Each corporate agent fills a leadership function and routes decisions through MYCA
                for governance, accountability, and execution.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {CORPORATE_ROLES.map((role) => {
                const Icon = role.icon
                return (
                  <NeuCard key={role.id} className="overflow-hidden h-full">
                    <NeuCardContent className="p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-green-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold leading-tight">{role.title}</h3>
                          <p className="text-xs text-muted-foreground">{role.role}</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{role.detail}</p>
                    </NeuCardContent>
                  </NeuCard>
                )
              })}
            </div>
          </div>
        </section>

        {/* Visual demonstration */}
        <section className="py-12 md:py-16">
          <div className="container max-w-6xl mx-auto px-4 md:px-6">
            <NeuCard className="overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="relative min-h-[280px] bg-black/40">
                  <Image
                    src="/assets/team/corporate-team.png"
                    alt="Corporate autonomy visualization"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
                <NeuCardContent className="p-6 md:p-8 space-y-4">
                  <h3 className="text-2xl font-bold">Autonomous Leadership Stack</h3>
                  <p className="text-sm text-muted-foreground">
                    MYCA orchestrates every executive and director function with autonomous frontier
                    services. Each model contributes real-time reports, strategic plans, audits, and
                    operational directives—kept synchronized through MYCA’s governance loop.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    All corporate agents provide LLM and voice interfaces to MYCA, enabling fast
                    coordination without human bottlenecks.
                  </p>
                </NeuCardContent>
              </div>
            </NeuCard>
          </div>
        </section>
      </div>
    </NeuromorphicProvider>
  )
}
