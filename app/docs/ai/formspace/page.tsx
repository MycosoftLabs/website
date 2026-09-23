import fs from "node:fs"
import path from "node:path"
import type { Metadata } from "next"
import Link from "next/link"
import { BookOpen, Table2 } from "lucide-react"
import { DocsLayout } from "@/components/docs/docs-layout"
import { FormSpacePaperRenderer } from "@/components/docs/formspace-paper-renderer"
import { Badge } from "@/components/ui/badge"
import { buildFormSpaceToc, parseFormSpacePaper } from "@/lib/formspace-paper"

export const metadata: Metadata = {
  title: "FormSpace",
  description:
    "FormSpace is Mycosoft’s mathematical framework for learning organization and emergent behavior.",
}

export const dynamic = "force-dynamic"

const markdownPath = path.join(process.cwd(), "docs", "ai", "formspace.md")

function loadPaper() {
  return parseFormSpacePaper(fs.readFileSync(markdownPath, "utf8"))
}

export default function Page() {
  const paper = loadPaper()
  const tableOfContents = buildFormSpaceToc(paper.body)

  return (
    <DocsLayout>
      <article className="max-w-5xl text-foreground" lang={paper.metadata.lang}>
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
          <Link href="/docs" className="hover:text-foreground">
            Docs
          </Link>
          <span aria-hidden> / </span>
          <Link href="/docs/ai" className="hover:text-foreground">
            SI Stack
          </Link>
        </nav>

        <header className="mb-8 overflow-hidden rounded-2xl border border-white/25 bg-white/55 p-6 shadow-2xl shadow-black/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/55 md:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">SI Stack</Badge>
            <Badge variant="default">Mathematical white paper</Badge>
            <Badge variant="outline">{paper.metadata.version}</Badge>
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-5xl">
            {paper.metadata.title}
          </h1>
          <p className="mt-4 max-w-3xl text-xl font-semibold leading-relaxed text-muted-foreground">
            {paper.metadata.subtitle}
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            {paper.metadata.author}
          </p>
        </header>

        <div className="mb-10 grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.72fr)] xl:grid-cols-[minmax(0,1fr)_26rem]">
          <section className="rounded-2xl border border-white/25 bg-white/50 p-5 shadow-xl shadow-black/10 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <BookOpen className="h-4 w-4" aria-hidden />
              Document role
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
              <p>
                This public-review white paper defines FormSpace as Mycosoft’s mathematical,
                experimental, and engineering contract for representing how biological, physical,
                computational, and collective systems organize, change, and recover.
              </p>
              <p>
                It specifies the objects a reader must be able to inspect: observations, typed Form
                States, local charts, comparison rules, transition models, target regions,
                uncertainty, interventions, completion tests, counterevidence, and versioned
                provenance. It also defines how NLM, FormSpace, MYCA, MINDEX, AVANI, FCI, and local
                controllers divide responsibility without treating a model prediction as authority
                to act.
              </p>
              <p>
                The document separates mathematical definitions, findings attributed to scientific
                literature, illustrative computations, proposed designs, and falsifiable
                hypotheses. Equations state conditional contracts and testable models; they are not
                presented as proof that every proposed biological target, attractor, transfer, or
                operational benefit has already been observed.
              </p>
              <p>
                Review should focus on four questions:
              </p>
              <ul className="grid gap-2 pl-5 text-sm sm:grid-cols-2">
                <li className="list-disc">Are the mathematical objects and assumptions coherent?</li>
                <li className="list-disc">Can the hypotheses be falsified by controlled experiments?</li>
                <li className="list-disc">Can implementation records be traced to evidence and versions?</li>
                <li className="list-disc">Are limitations kept adjacent to every scientific claim?</li>
              </ul>
              <p>
                All equations, algorithms, tables, references, figures, limitations, and evidence
                categories below are rendered from the same canonical publication source used by the
                FormSpace product page.
              </p>
            </div>
          </section>

          <aside className="relative h-96 overflow-hidden rounded-2xl border border-white/25 bg-white/50 p-5 shadow-xl shadow-black/10 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45 lg:h-auto lg:self-stretch">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <Table2 className="h-4 w-4" aria-hidden />
              Sections
            </h2>
            <ol className="absolute inset-x-5 bottom-5 top-14 space-y-1 overflow-y-auto overscroll-contain pr-2 text-sm">
              {tableOfContents.map((entry) => (
                <li key={`${entry.depth}-${entry.id}`}>
                  <a
                    href={`#${entry.id}`}
                    className={`block rounded-lg py-1 text-muted-foreground transition-colors hover:bg-white/50 hover:text-foreground dark:hover:bg-white/10 ${
                      entry.depth === 1 ? "px-2 font-medium" : entry.depth === 2 ? "pl-5 pr-2" : "pl-8 pr-2"
                    }`}
                  >
                    {entry.title}
                  </a>
                </li>
              ))}
            </ol>
          </aside>
        </div>

        <FormSpacePaperRenderer markdown={paper.body} />

        <footer className="mt-14 flex flex-wrap items-center gap-3 border-t border-border pt-6">
          <Link
            href="/docs/ai/nlm"
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted/60"
          >
            Nature Learning Model
          </Link>
          <Link
            href="/ai/formspace"
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted/60"
          >
            FormSpace
          </Link>
          <Link href="/docs/ai" className="text-sm text-muted-foreground hover:text-foreground">
            Back to SI Stack
          </Link>
        </footer>
      </article>
    </DocsLayout>
  )
}
