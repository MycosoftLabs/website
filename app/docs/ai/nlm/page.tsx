import fs from "node:fs"
import path from "node:path"
import type { Metadata } from "next"
import Link from "next/link"
import type { ReactNode } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { BookOpen, Braces, Database, FunctionSquare, Table2 } from "lucide-react"
import { DocsLayout } from "@/components/docs/docs-layout"
import { Badge } from "@/components/ui/badge"

export const metadata: Metadata = {
  title: "NLM",
  description:
    "Nature Learning Model is Mycosoft's signal-native AI model family for calibrated physical telemetry, environmental state, and scientific prediction.",
}

const markdownPath = path.join(process.cwd(), "docs", "ai", "nlm.md")
const sourceMarkdown = fs.readFileSync(markdownPath, "utf8")
const articleMarkdown = sourceMarkdown.replace(
  /^# Nature Learning Model \(NLM\)\r?\n## Signal-native AI for physical reality\r?\n\r?\n\*\*Public technical article draft\*\*\s*\r?\n\*\*Prepared for Mycosoft\*\*\s*\r?\n\*\*Version:\*\* v0\.1, May 2026\r?\n\r?\n---\r?\n\r?\n/,
  "",
)

const tableOfContents = articleMarkdown
  .split(/\r?\n/)
  .filter((line) => /^##\s+/.test(line))
  .map((line) => {
    const title = line.replace(/^##\s+/, "").trim()
    return { title, id: slugify(title) }
  })

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function textFromChildren(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") {
    return String(children)
  }
  if (Array.isArray(children)) {
    return children.map(textFromChildren).join("")
  }
  return ""
}

function CodePanel({
  language,
  children,
}: {
  language: string
  children: ReactNode
}) {
  const isMath = language === "math"
  const Icon = isMath ? FunctionSquare : language === "json" || language === "yaml" ? Database : Braces

  return (
    <div
      className={`not-prose my-6 overflow-hidden rounded-xl border shadow-lg shadow-black/10 backdrop-blur-xl ${
        isMath
          ? "border-cyan-300/30 bg-cyan-950/90 text-cyan-50 dark:bg-cyan-950/70"
          : "border-white/15 bg-slate-950 text-slate-50 dark:bg-black/70"
      }`}
    >
      <div className="flex items-center justify-between border-b border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
        <span className="inline-flex items-center gap-2">
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {isMath ? "model math" : language || "code"}
        </span>
        <span className="text-white/45">NLM schema</span>
      </div>
      <pre className="max-h-[34rem] overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words p-4 text-sm leading-relaxed">
        <code className={isMath ? "font-mono text-cyan-50" : "font-mono text-slate-50"}>
          {children}
        </code>
      </pre>
    </div>
  )
}

export default function Page() {
  return (
    <DocsLayout>
      <article className="max-w-5xl text-foreground">
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
          <Link href="/docs" className="hover:text-foreground">
            Docs
          </Link>
          <span aria-hidden> / </span>
          <Link href="/docs/ai" className="hover:text-foreground">
            AI Stack
          </Link>
        </nav>

        <header className="mb-8 overflow-hidden rounded-2xl border border-white/25 bg-white/55 p-6 shadow-2xl shadow-black/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/55 md:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">AI Stack</Badge>
            <Badge variant="default">Public technical article</Badge>
            <Badge variant="outline">v0.1 · May 2026</Badge>
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-5xl">
            Nature Learning Model (NLM)
          </h1>
          <p className="mt-4 max-w-3xl text-xl font-semibold leading-relaxed text-muted-foreground">
            Signal-native AI for physical reality.
          </p>
          <p className="mt-4 max-w-3xl leading-relaxed text-muted-foreground">
            A technical demonstration document for NLM schemas, sensor-native
            model families, deterministic and stochastic learning objectives,
            inference contracts, and MINDEX/NatureOS integration.
          </p>
        </header>

        <div className="mb-10 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <section className="rounded-2xl border border-white/25 bg-white/50 p-5 shadow-xl shadow-black/10 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <BookOpen className="h-4 w-4" aria-hidden />
              Document Role
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              This page is formatted as a model demonstration reference, not a
              brochure. Tables remain scannable, schemas stay copyable, and math
              blocks are separated as model logic so MYCA, AVANI, and MINDEX
              concepts can be reviewed as implementation contracts.
            </p>
          </section>

          <aside className="rounded-2xl border border-white/25 bg-white/50 p-5 shadow-xl shadow-black/10 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <Table2 className="h-4 w-4" aria-hidden />
              Sections
            </h2>
            <ol className="mt-3 max-h-72 space-y-2 overflow-auto pr-1 text-sm">
              {tableOfContents.map((entry) => (
                <li key={entry.id}>
                  <a
                    href={`#${entry.id}`}
                    className="block rounded-lg px-2 py-1 text-muted-foreground transition-colors hover:bg-white/50 hover:text-foreground dark:hover:bg-white/10"
                  >
                    {entry.title}
                  </a>
                </li>
              ))}
            </ol>
          </aside>
        </div>

        <div className="nlm-technical-article">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2({ children }) {
                const text = textFromChildren(children)
                return (
                  <h2
                    id={slugify(text)}
                    className="mt-14 scroll-mt-24 border-t border-border pt-8 text-3xl font-bold tracking-tight"
                  >
                    {children}
                  </h2>
                )
              },
              h3({ children }) {
                const text = textFromChildren(children)
                return (
                  <h3
                    id={slugify(text)}
                    className="mt-10 scroll-mt-24 text-xl font-semibold tracking-tight"
                  >
                    {children}
                  </h3>
                )
              },
              p({ children }) {
                return <p className="my-5 leading-8 text-foreground/85">{children}</p>
              },
              strong({ children }) {
                return <strong className="font-semibold text-foreground">{children}</strong>
              },
              em({ children }) {
                return <em className="italic text-foreground/90">{children}</em>
              },
              ul({ children }) {
                return <ul className="my-5 ml-6 list-disc space-y-2 leading-7">{children}</ul>
              },
              ol({ children }) {
                return <ol className="my-5 ml-6 list-decimal space-y-2 leading-7">{children}</ol>
              },
              li({ children }) {
                return <li className="pl-1 text-foreground/85">{children}</li>
              },
              hr() {
                return <hr className="my-12 border-border" />
              },
              table({ children }) {
                return (
                  <div className="not-prose my-8 overflow-hidden rounded-xl border border-white/25 bg-white/60 shadow-xl shadow-black/10 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/50">
                    <table className="w-full table-fixed border-collapse text-sm">{children}</table>
                  </div>
                )
              },
              thead({ children }) {
                return <thead className="bg-emerald-500/10 text-left">{children}</thead>
              },
              th({ children }) {
                return (
                  <th className="break-words border-b border-border px-4 py-3 font-semibold text-foreground">
                    {children}
                  </th>
                )
              },
              td({ children }) {
                return (
                  <td className="break-words border-b border-border/60 px-4 py-3 align-top text-foreground/80">
                    {children}
                  </td>
                )
              },
              a({ href, children }) {
                return (
                  <a
                    href={href}
                    target={href?.startsWith("http") ? "_blank" : undefined}
                    rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-600 dark:text-emerald-300"
                  >
                    {children}
                  </a>
                )
              },
              pre({ children }) {
                return <>{children}</>
              },
              code({ children, className }) {
                const language = /language-(\w+)/.exec(className || "")?.[1]
                const value = String(children).replace(/\n$/, "")

                if (language) {
                  return <CodePanel language={language}>{value}</CodePanel>
                }

                return (
                  <code className="break-words rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground">
                    {children}
                  </code>
                )
              },
            }}
          >
            {articleMarkdown}
          </ReactMarkdown>
        </div>

        <footer className="mt-14 flex flex-wrap items-center gap-3 border-t border-border pt-6">
          <Link
            href="/docs/ai/myca"
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted/60"
          >
            MYCA
          </Link>
          <Link
            href="/docs/ai/avani"
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted/60"
          >
            AVANI
          </Link>
          <Link href="/docs/ai" className="text-sm text-muted-foreground hover:text-foreground">
            Back to AI Stack
          </Link>
        </footer>
      </article>
    </DocsLayout>
  )
}
