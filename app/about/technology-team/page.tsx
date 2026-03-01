import { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { TechnologyLiveFeed } from "@/components/about/TechnologyLiveFeed"
import { NeuromorphicProvider, NeuBadge, NeuCard, NeuCardContent } from "@/components/ui/neuromorphic"
import { ArrowRight, Code2, Server, Sparkles, Zap, GitBranch } from "lucide-react"

export const metadata: Metadata = {
  title: "Technology Team | Mycosoft",
  description:
    "Autonomous technology stack powering rapid development across software, firmware, and hardware.",
}

const STACK_ITEMS = [
  "Cursor",
  "GitHub",
  "Notion",
  "Docker",
  "Proxmox",
  "Vercel",
  "Replit",
  "FluxAI",
]

export default function TechnologyTeamPage() {
  return (
    <NeuromorphicProvider>
      <div className="min-h-dvh">
        <section className="relative py-16 md:py-24 overflow-hidden bg-gradient-to-b from-black via-slate-950/50 to-background">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.03)_1px,transparent_1px)] bg-[size:120px_120px]" />
          <div className="container max-w-6xl mx-auto px-4 md:px-6 relative z-10">
            <NeuBadge variant="default" className="mb-4 border border-white/20">
              Technology Team
            </NeuBadge>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4">
              Autonomous Engineering at Scale
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl">
              Built by rapid autonomous self learning &amp; evolving development across a massive
              codebase spanning software, firmware, and hardware systems.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="https://github.com/MycosoftLabs"
                target="_blank"
                className="inline-flex items-center gap-2 h-11 min-h-[44px] px-5 rounded-lg border border-green-500/40 text-green-300 text-sm font-semibold hover:bg-green-500/10 transition-colors touch-manipulation"
              >
                View GitHub
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 h-11 min-h-[44px] px-5 rounded-lg border border-border/60 text-sm font-semibold hover:bg-muted/40 transition-colors touch-manipulation"
              >
                Technology Docs
              </Link>
            </div>
          </div>
        </section>

        <section className="py-10 md:py-14">
          <div className="container max-w-6xl mx-auto px-4 md:px-6">
            <NeuCard id="cursor-stack" className="overflow-hidden">
              <div className="relative">
                <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-green-500/20 blur-3xl animate-pulse" />
                <div className="absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-purple-500/20 blur-3xl animate-pulse" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
                  <NeuCardContent className="p-6 md:p-8 space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                        <Code2 className="h-6 w-6 text-purple-400" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">Cursor Command Center</h2>
                        <p className="text-xs text-muted-foreground">
                          Agents, subagents, and code automation accelerated in real time.
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Cursor orchestrates MYCA’s development fabric, synchronizing code, deployments, and
                      infrastructure decisions across every repo and device layer.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Zap className="h-4 w-4 text-green-400" />
                          Agent acceleration
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Autonomous task routing across specialized subagents.
                        </p>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <GitBranch className="h-4 w-4 text-blue-400" />
                          Multi-repo automation
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Coordinated updates spanning software, firmware, and hardware.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {STACK_ITEMS.map((item) => (
                        <span
                          key={item}
                          className="text-xs font-semibold px-3 py-1.5 rounded-full border border-border/60 bg-muted/20"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Sparkles className="h-4 w-4 text-amber-400" />
                      Real-time coordination of agents, subagents, and code review cycles.
                    </div>
                  </NeuCardContent>
                  <div className="relative min-h-[220px] sm:min-h-[320px]">
                    <Image
                      src="/assets/team/technology-team.png"
                      alt="Cursor-led Mycosoft development environment"
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                  </div>
                </div>
              </div>
            </NeuCard>
          </div>
        </section>

        <section className="py-8 md:py-12">
          <div className="container max-w-6xl mx-auto px-4 md:px-6">
            <TechnologyLiveFeed />
          </div>
        </section>

        <section className="py-10 md:py-14">
          <div className="container max-w-6xl mx-auto px-4 md:px-6">
            <NeuCard className="overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="relative min-h-[280px] bg-black/40">
                  <Image
                    src="/assets/team/technology-team.png"
                    alt="Technology team workspace"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
                <NeuCardContent className="p-6 md:p-8 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                      <Server className="h-5 w-5 text-green-400" />
                    </div>
                    <h3 className="text-2xl font-bold">Autonomous Technology Stack</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Our engineering systems run in parallel across cloud, infrastructure, and device layers,
                    scaling compute up or down as needed. Tooling remains autonomous yet hardened against
                    operational risk.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Technology decisions are synchronized through MYCA and validated via CI, audits, and
                    cross-agent checks.
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
