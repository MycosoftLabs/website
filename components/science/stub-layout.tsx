import Link from "next/link"
import { ArrowLeft, Construction } from "lucide-react"
import { NeuButton, NeuBadge } from "@/components/ui/neuromorphic"
import { STATUS_PILL_CLASSES } from "@/lib/science-publications"

interface ScienceStubLayoutProps {
  eyebrow?: string
  title: string
  description: string
  /** Anchor on /science to return to. Defaults to /science. */
  parentHref?: string
}

/**
 * Shared stub layout for the four `/science/{fci,nlm,materials,deployments}`
 * sub-routes. Renders a full-height dark section with an honest "in production"
 * status pill — these are not deployed lab pages yet.
 */
export function ScienceStubLayout({
  eyebrow = "Research Atlas · Sub-page",
  title,
  description,
  parentHref = "/science",
}: ScienceStubLayoutProps) {
  return (
    <section className="relative isolate min-h-dvh overflow-hidden bg-black text-white">
      {/* Gradient backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-950 via-black to-emerald-950/30"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(34,197,94,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.04)_1px,transparent_1px)] bg-[size:80px_80px]"
      />

      <div className="container mx-auto flex min-h-dvh max-w-4xl flex-col items-start justify-center gap-8 px-4 py-24 md:px-6">
        <NeuBadge variant="default" className="border-white/30 bg-white/10 text-white">
          {eyebrow}
        </NeuBadge>

        <h1 className="text-4xl font-bold leading-tight md:text-6xl">{title}</h1>

        <p className="max-w-2xl text-lg leading-relaxed text-white/75">{description}</p>

        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${STATUS_PILL_CLASSES["Frontier Hypothesis"]}`}
        >
          <Construction className="h-3.5 w-3.5" aria-hidden />
          Full lab page in production · Coming H2 2026
        </span>

        <div className="flex flex-wrap items-center gap-3 pt-4">
          <Link href={parentHref}>
            <NeuButton
              variant="default"
              className="gap-2 min-h-[44px] px-6 py-3 border border-white/30 bg-white/10 !text-white backdrop-blur-xl hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to atlas
            </NeuButton>
          </Link>
        </div>
      </div>
    </section>
  )
}
