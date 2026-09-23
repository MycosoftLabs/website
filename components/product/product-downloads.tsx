import Link from "next/link"
import { GithubLogo, HuggingfaceLogo } from "@/components/product/host-logos"
import type { DownloadLink, DownloadSection } from "@/lib/model-downloads"

const MYCOSOFT_MARK =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Mycosoft%20Logo%20(1)-lArPx4fwtqahyHVlnRLWWSfqWLIJpv.png"

interface ProductDownloadsProps {
  title: string
  parentHref: string
  parentLabel: string
  intro: string
  sections: DownloadSection[]
}

function HostMark({ host }: { host: DownloadLink["host"] }) {
  if (host === "github") return <GithubLogo className="h-7 w-7" />
  if (host === "huggingface") return <HuggingfaceLogo className="h-7 w-7" />
  return (
    // The mark is a white wordmark; invert it on the light glass so it stays readable.
    <img src={MYCOSOFT_MARK} alt="" className="h-7 w-7 object-contain invert dark:invert-0" />
  )
}

function hostName(host: DownloadLink["host"]) {
  if (host === "github") return "GitHub"
  if (host === "huggingface") return "Hugging Face"
  return "Mycosoft"
}

function HostControl({ link }: { link: DownloadLink }) {
  const className =
    "inline-flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-2xl border border-black/15 bg-white/35 px-3 text-sm text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_12px_28px_rgba(15,23,42,0.12)] backdrop-blur-md dark:border-white/25 dark:bg-white/10 dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_14px_30px_rgba(0,0,0,0.35)]"
  const body = (
    <>
      <HostMark host={link.host} />
      <span className="text-left leading-4">
        <span className="block font-medium">{hostName(link.host)}</span>
        <span className="block text-xs text-slate-600 dark:text-white/65">
          {link.href ? link.note : link.stateLabel ?? "Release pending"}
        </span>
      </span>
    </>
  )
  if (!link.href) {
    return (
      <span className={`${className} opacity-70`} title={link.note}>
        {body}
      </span>
    )
  }
  const external = link.href.startsWith("http")
  return (
    <a href={link.href} className={className} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {body}
    </a>
  )
}

export function ProductDownloads({ title, parentHref, parentLabel, intro, sections }: ProductDownloadsProps) {
  return (
    <div className="product-glass-page min-h-dvh text-slate-950 dark:text-white">
      <section className="border-b border-black/10 bg-white/15 backdrop-blur-xl dark:border-white/15 dark:bg-white/[0.06]">
        <div className="container mx-auto max-w-5xl px-4 py-12 md:px-6 md:py-16">
          <Link href={parentHref} className="inline-flex min-h-[44px] items-center text-sm text-slate-600 dark:text-white/70">
            {parentLabel}
          </Link>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700 dark:text-white/75">{intro}</p>
        </div>
      </section>
      <div className="container mx-auto max-w-5xl space-y-10 px-4 py-10 md:px-6">
        {sections.map((section) => (
          <section key={section.id} className="space-y-4">
            <h2 className="text-xl font-semibold">{section.title}</h2>
            {section.entries.map((entry) => (
              <article
                key={entry.name}
                className="rounded-3xl border border-black/10 bg-white/20 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_22px_48px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/20 dark:bg-white/[0.08] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_24px_50px_rgba(0,0,0,0.4)]"
              >
                <h3 className="text-lg font-semibold">{entry.name}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-white/75 sm:text-base">{entry.detail}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {entry.links.map((link) => (
                    <HostControl key={`${entry.name}-${link.host}-${link.note}`} link={link} />
                  ))}
                </div>
              </article>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
