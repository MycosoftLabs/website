import Link from "next/link"
import { ArrowUpRight, BookOpen, ExternalLink, FileText } from "lucide-react"
import { DocsLayout } from "@/components/docs/docs-layout"
import {
  DOCS_CATALOG,
  type DocEntry,
  type DocSource,
  type DocStatus,
} from "@/lib/docs-catalog"

export const metadata = {
  title: "Documentation",
  description:
    "Mycosoft developer documentation — AI stack, multi-agent system, MINDEX, APIs, devices, apps, open source, defense, and security.",
}

const STATUS_LABEL: Record<DocStatus, string> = {
  stable: "Stable",
  draft: "Draft",
  frontier: "Frontier / Research",
  "coming-soon": "Coming soon",
}

const STATUS_CLASSES: Record<DocStatus, string> = {
  stable: "border-emerald-300/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
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

const SOURCE_CLASSES = {
  pdf: "border-rose-300/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  gitbook: "border-sky-300/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  internal: "border-emerald-300/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  external: "border-slate-300/40 bg-slate-500/10 text-slate-700 dark:text-slate-300",
} as const

export default function DocsIndexPage() {
  return (
    <DocsLayout>
      <header className="mb-10 max-w-3xl">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
          Developer documentation
        </p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Mycosoft Developer Documentation
        </h1>
        <p className="mt-3 text-base md:text-lg text-muted-foreground">
          A reference for the entire Mycosoft platform — the AI stack, the
          multi-agent system, MINDEX, our APIs, every device and app, and the
          security and compliance posture for federal deployments.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Most pages link out to a canonical PDF and GitBook source. Pages marked
          <span className="mx-1 inline-block align-middle">
            <StatusBadge status="coming-soon" />
          </span>
          are placeholders whose links will resolve as the artifacts land.
          Frontier topics (NLM, FCI probes) are deliberately flagged
          <span className="mx-1 inline-block align-middle">
            <StatusBadge status="frontier" />
          </span>
          — they are research surfaces, not solved capabilities.
        </p>
      </header>

      <div className="space-y-12">
        {DOCS_CATALOG.map((section) => (
          <section key={section.id} aria-labelledby={`docs-${section.id}`}>
            <div className="mb-4 border-b border-border pb-2">
              {section.href ? (
                <Link
                  href={section.href}
                  id={`docs-${section.id}`}
                  className="group inline-flex items-baseline gap-2 text-2xl font-semibold tracking-tight hover:text-foreground"
                >
                  {section.title}
                  <span
                    aria-hidden
                    className="text-sm font-normal text-muted-foreground group-hover:text-foreground"
                  >
                    →
                  </span>
                </Link>
              ) : (
                <h2
                  id={`docs-${section.id}`}
                  className="text-2xl font-semibold tracking-tight"
                >
                  {section.title}
                </h2>
              )}
              <p className="mt-1 text-sm text-muted-foreground max-w-3xl">
                {section.description}
              </p>
            </div>

            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.entries.map((entry) => (
                <li key={`${section.id}-${entry.title}`}>
                  <EntryCard entry={entry} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </DocsLayout>
  )
}

function EntryCard({ entry }: { entry: DocEntry }) {
  const status: DocStatus = entry.status ?? "coming-soon"
  const cardClass = `group flex h-full flex-col rounded-lg border border-border bg-card p-4 transition-colors${
    entry.href ? " hover:border-foreground/20 hover:bg-muted/40" : ""
  }`

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold tracking-tight">{entry.title}</h3>
        <StatusBadge status={status} />
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {entry.description}
      </p>
      {entry.sources && entry.sources.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {entry.sources.map((s) => (
            <li key={`${entry.title}-${s.kind}-${s.href}`}>
              <SourceChip source={s} />
            </li>
          ))}
        </ul>
      ) : null}
    </>
  )

  if (entry.href) {
    return (
      <Link href={entry.href} className={cardClass}>
        {body}
      </Link>
    )
  }
  return <div className={cardClass}>{body}</div>
}

function SourceChip({ source }: { source: DocSource }) {
  const Icon = SOURCE_ICON[source.kind]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${SOURCE_CLASSES[source.kind]}`}
      title={source.href}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {source.label}
    </span>
  )
}

function StatusBadge({ status }: { status: DocStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}
