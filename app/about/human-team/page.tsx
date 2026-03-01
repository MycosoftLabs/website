import { Metadata } from "next"
import Link from "next/link"
import { HumanTeamProfiles } from "@/components/about/HumanTeamProfiles"
import { HumanLeadershipFeed } from "@/components/about/HumanLeadershipFeed"
import { NeuromorphicProvider, NeuBadge, NeuCard, NeuCardContent } from "@/components/ui/neuromorphic"
import { ArrowRight, Leaf, Users2, HeartHandshake } from "lucide-react"

export const metadata: Metadata = {
  title: "Human Team | Mycosoft",
  description:
    "Human leadership and philosophy guiding an autonomous corporation.",
}

export default function HumanTeamPage() {
  return (
    <NeuromorphicProvider>
      <div className="min-h-dvh">
        <section className="relative py-16 md:py-24 overflow-hidden bg-gradient-to-b from-black via-slate-950/50 to-background">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.03)_1px,transparent_1px)] bg-[size:120px_120px]" />
          <div className="container max-w-6xl mx-auto px-4 md:px-6 relative z-10">
            <NeuBadge variant="default" className="mb-4 border border-white/20">
              Human Team
            </NeuBadge>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4">
              Human Leadership & Philosophy
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl">
              Human leadership guides purpose, vision, context, insight, accountability, and ecological
              responsibility across all digital teams &amp; the entire platform.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/about"
                className="inline-flex items-center gap-2 h-11 min-h-[44px] px-5 rounded-lg border border-border/60 text-sm font-semibold hover:bg-muted/40 transition-colors touch-manipulation"
              >
                Back to About
              </Link>
              <Link
                href="/about/team"
                className="inline-flex items-center gap-2 h-11 min-h-[44px] px-5 rounded-lg border border-green-500/40 text-green-300 text-sm font-semibold hover:bg-green-500/10 transition-colors touch-manipulation"
              >
                View all profiles
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="py-10 md:py-14">
          <div className="container max-w-6xl mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <NeuCard className="overflow-hidden">
                <NeuCardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                      <Users2 className="h-5 w-5 text-green-400" />
                    </div>
                    <h2 className="text-xl font-bold">Human vs Digital Operations</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Digital teams execute at scale; human leadership sets vision, values, and accountability.
                    Humans steer the mission while MYCA executes and learns in real time.
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                      Human vision, oversight, ethics
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                      Digital execution, scale, automation
                    </div>
                  </div>
                </NeuCardContent>
              </NeuCard>

              <NeuCard className="overflow-hidden">
                <NeuCardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                      <Leaf className="h-5 w-5 text-amber-400" />
                    </div>
                    <h2 className="text-xl font-bold">Human Philosophy</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Human leadership ensures ecological stewardship, transparency, and responsibility remain
                    central to the autonomous corporation.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    The human team defines the ethical boundaries that digital systems must respect.
                  </p>
                </NeuCardContent>
              </NeuCard>
            </div>
          </div>
        </section>

        <section className="py-4">
          <div className="container max-w-6xl mx-auto px-4 md:px-6">
            <HumanLeadershipFeed />
          </div>
        </section>

        <section className="py-4 md:py-8">
          <div className="container max-w-6xl mx-auto px-4 md:px-6">
            <HumanTeamProfiles />
          </div>
        </section>

        <section className="py-10 md:py-14">
          <div className="container max-w-6xl mx-auto px-4 md:px-6">
            <NeuCard className="overflow-hidden">
              <NeuCardContent className="p-6 md:p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                    <HeartHandshake className="h-5 w-5 text-purple-400" />
                  </div>
                  <h3 className="text-2xl font-bold">Human + Digital Partnership</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Human leadership sets the compass; digital systems expand capacity and speed. This
                  partnership keeps Mycosoft fast, autonomous, and grounded in human purpose.
                </p>
              </NeuCardContent>
            </NeuCard>
          </div>
        </section>
      </div>
    </NeuromorphicProvider>
  )
}
