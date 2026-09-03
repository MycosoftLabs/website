import Link from "next/link"
import { ArrowRight, Globe, Radio, Shield, Server } from "lucide-react"
import { requireFusariumOwner } from "@/lib/auth/api-auth"
import { FUSARIUM_MFA_ENROLL_PATH } from "@/lib/auth/fusarium-mfa"
import { probeFusariumRuntime } from "@/lib/fusarium-runtime-probe"

export const dynamic = "force-dynamic"

const operatorSurfaces = [
  {
    name: "Situational Awareness",
    href: "/dashboard/crep",
    copy: "CREP common picture already used by the public alpha.",
    icon: Globe,
  },
  {
    name: "Earth Simulator",
    href: "/natureos/earth-simulator",
    copy: "World model used by Fusarium and NatureOS.",
    icon: Radio,
  },
  {
    name: "Device Network",
    href: "/natureos/devices/network",
    copy: "Owner-gated fleet and LAN topology.",
    icon: Server,
  },
  {
    name: "Defense Briefing",
    href: "/defense/request-briefing",
    copy: "Mission-customer intake. Not an open telemetry leak.",
    icon: Shield,
  },
]

export default async function FusariumOperatorAppPage() {
  const auth = await requireFusariumOwner()
  if (auth.error || !auth.user) {
    return null
  }

  const runtime = await probeFusariumRuntime()

  return (
    <main className="min-h-dvh bg-black px-4 py-10 text-zinc-100 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
          Fusarium operator console
        </p>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Owner session active</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
          Signed in as {auth.user.email}. This path is the public Fusarium dashboard on
          mycosoft.com. Loopback twins-host on 8212 remains the local rollback and is not exposed.
        </p>
        <p className="mt-4">
          <Link
            href={`${FUSARIUM_MFA_ENROLL_PATH}?redirectTo=${encodeURIComponent("/fusarium/app")}`}
            className="inline-flex min-h-[44px] items-center text-sm text-emerald-400 underline-offset-4 hover:underline"
          >
            Enroll authenticator 2FA
          </Link>
        </p>

        <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-950 p-5">
          <h2 className="text-lg font-semibold">Runtime bind</h2>
          <p className="mt-2 text-sm text-zinc-400">
            {runtime.reachable
              ? `Internal Fusarium origin answered ${runtime.status} at the server-side bind.`
              : "Internal twins-host is not bound on this website origin. The public console uses the website BFF and existing alpha APIs. Local rollback remains http://127.0.0.1:8212/login?redirectTo=%2Ffusarium"}
          </p>
        </section>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {operatorSurfaces.map((surface) => (
            <Link
              key={surface.href}
              href={surface.href}
              className="min-h-[44px] rounded-2xl border border-white/10 bg-zinc-950 p-5 transition-colors hover:border-emerald-500/40"
            >
              <div className="flex items-center gap-3">
                <surface.icon className="h-5 w-5 text-emerald-400" />
                <h3 className="font-semibold">{surface.name}</h3>
              </div>
              <p className="mt-2 text-sm text-zinc-400">{surface.copy}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm text-emerald-400">
                Open <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
