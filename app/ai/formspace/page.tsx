import fs from "node:fs"
import path from "node:path"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { FormSpacePaperRenderer } from "@/components/docs/formspace-paper-renderer"
import { extractFormSpaceExcerpt, parseFormSpacePaper } from "@/lib/formspace-paper"

export const metadata: Metadata = {
  title: "FormSpace | Mycosoft",
  description:
    "FormSpace is Mycosoft’s mathematical framework for learning organization and emergent behavior.",
}

export const dynamic = "force-dynamic"

const GLASS =
  "rounded-2xl border border-black/10 bg-white/20 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-xl dark:border-white/20 dark:bg-black/20 dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"

const markdownPath = path.join(process.cwd(), "docs", "ai", "formspace.md")

function loadPaperExcerpt() {
  const paper = parseFormSpacePaper(fs.readFileSync(markdownPath, "utf8"))
  return {
    metadata: paper.metadata,
    excerpt: extractFormSpaceExcerpt(paper.body),
  }
}

export default function FormspacePage() {
  const paper = loadPaperExcerpt()

  return (
    <div className="product-glass-page min-h-dvh text-slate-950 dark:text-white">
      <section className={`${GLASS} rounded-none border-x-0 border-t-0`}>
        <div className="container mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-600 dark:text-white/70">
            Environmental Platonic Map
          </p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl md:text-5xl">
            {paper.metadata.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700 sm:text-lg dark:text-white/80">
            {paper.metadata.subtitle}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/docs/ai/formspace"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-black/15 bg-white/40 px-4 text-sm backdrop-blur-md dark:border-white/30 dark:bg-white/10"
            >
              Read the white paper
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/ai/formspace/downloads"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-black/15 bg-white/25 px-4 text-sm backdrop-blur-md dark:border-white/30 dark:bg-white/10"
            >
              Downloads
            </Link>
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-6xl space-y-8 px-4 py-12 md:px-6">
        <section className={`${GLASS} p-5 sm:p-6 md:p-8`}>
          <FormSpacePaperRenderer markdown={paper.excerpt} />
        </section>

        <section className="flex flex-col gap-3 border-t border-black/10 py-8 sm:flex-row dark:border-white/15">
          <Link
            href="/docs/ai/formspace"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-black/15 bg-white/40 px-4 text-sm backdrop-blur-md dark:border-white/30 dark:bg-white/10"
          >
            Read the complete white paper
          </Link>
          <Link
            href="/ai/formspace/downloads"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-black/15 bg-white/25 px-4 text-sm backdrop-blur-md dark:border-white/30 dark:bg-white/10"
          >
            Downloads
          </Link>
          <Link
            href="/myca/nlm"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-black/15 bg-white/25 px-4 text-sm backdrop-blur-md dark:border-white/30 dark:bg-white/10"
          >
            Nature Learning Model
          </Link>
        </section>
      </div>
    </div>
  )
}
