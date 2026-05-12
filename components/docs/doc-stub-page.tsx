import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowUpRight, FileText, BookOpen, ExternalLink, Github } from "lucide-react"
import type { DocSource, DocStatus } from "@/lib/docs-catalog"
import { DocsLayout } from "./docs-layout"

interface DocStubPageProps {
  /** Title shown as the H1. */
  title: string
  description: string
  /** Crumb-trail label for the parent section (e.g. "Devices", "AI Stack"). */
  section: string
  /** Where the breadcrumb link points (defaults to /docs). */
  sectionHref?: string
  sources?: DocSource[]
  status?: DocStatus
  children?: ReactNode
}

const STATUS_LABEL: Record<DocStatus, string> = {
  stable: "Stable",
  draft: "Draft",
  frontier: "Frontier / Research",
  "coming-soon": "Coming soon",
}

const STATUS_CLASSES: Record<DocStatus, string> = {
  stable: "border-emerald-300/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  draft: "border-amber-300/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  frontier: "border-fuchsia-300/40 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300",
  "coming-soon": "border-cyan-300/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
}

const SOURCE_ICON = {
  pdf: FileText,
  gitbook: BookOpen,
  internal: ArrowUpRight,
  external: ExternalLink,
} as const

const SOURCE_LABEL = {
  pdf: "PDF",
  gitbook: "GitBook",
  internal: "Internal",
  external: "External",
} as const

const SOURCE_CLASSES = {
  pdf: "border-rose-300/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  gitbook: "border-sky-300/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  internal: "border-emerald-300/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  external: "border-slate-300/40 bg-slate-500/10 text-slate-700 dark:text-slate-300",
} as const

export function DocStubPage({
  title,
  description,
  section,
  sectionHref = "/docs",
  sources,
  status = "coming-soon",
  children,
}: DocStubPageProps) {
  return (
    <DocsLayout>
      <article className="max-w-3xl">
        <nav aria-label="Breadcrumb" className="mb-3 text-xs text-muted-foreground">
          <Link href="/docs" className="hover:text-foreground">
            Docs
          </Link>
          <span aria-hidden> / </span>
          <Link href={sectionHref} className="hover:text-foreground">
            {section}
          </Link>
        </nav>

        <header className="mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{title}</h1>
            <StatusPill status={status} />
          </div>
          <p className="mt-3 text-base md:text-lg text-muted-foreground">{description}</p>
        </header>

        {sources && sources.length > 0 ? (
          <section className="mb-8">
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Sources
            </h2>
            <ul className="flex flex-wrap gap-2">
              {sources.map((s) => {
                const Icon = SOURCE_ICON[s.kind]
                const isInternal = s.kind === "internal"
                const linkProps = isInternal
                  ? {}
                  : ({ target: "_blank", rel: "noopener noreferrer" } as const)
                return (
                  <li key={`${s.kind}-${s.href}`}>
                    <a
                      href={s.href}
                      {...linkProps}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:brightness-110 ${SOURCE_CLASSES[s.kind]}`}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                      {s.label || SOURCE_LABEL[s.kind]}
                    </a>
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}

        {status === "coming-soon" ? (
          <section className="mb-8 rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-semibold mb-1">This page is coming soon</h2>
            <p className="text-sm text-muted-foreground">
              The reference content for <strong>{title}</strong> is in production.
              The placeholder PDF and GitBook links above will resolve as soon as
              Morgan uploads the canonical artifacts. If you need this sooner, file
              an issue and we will prioritise.
            </p>
          </section>
        ) : null}

        {children ? (
          <section className="prose prose-neutral dark:prose-invert max-w-none">
            {children}
          </section>
        ) : null}

        <footer className="mt-10 flex flex-wrap items-center gap-3 border-t border-border pt-6">
          <a
            href="https://github.com/MycosoftLabs/website/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted/60"
          >
            <Github className="h-4 w-4" aria-hidden />
            Suggest an edit / contribute
          </a>
          <Link
            href="/docs"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to docs index
          </Link>
        </footer>
      </article>
    </DocsLayout>
  )
}

function StatusPill({ status }: { status: DocStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}
