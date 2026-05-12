import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight, BookOpen, ExternalLink, FileText } from "lucide-react"
import { DocsLayout } from "@/components/docs/docs-layout"
import {
  getSectionById,
  type DocEntry,
  type DocSource,
  type DocStatus,
} from "@/lib/docs-catalog"

export const metadata: Metadata = {
  title: "Devices",
  description: "Hardware reference: probes, edge compute, mesh nodes, and the firmware that runs on them.",
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

export default function Page() {
  const section = getSectionById("devices")
  if (!section) {
    return (
      <DocsLayout>
        <p className="text-sm text-muted-foreground">Section not found in catalog.</p>
      </DocsLayout>
    )
  }
  return (
    <DocsLayout>
      <article className="max-w-4xl">
        <nav aria-label="Breadcrumb" className="mb-3 text-xs text-muted-foreground">
          <Link href="/docs" className="hover:text-foreground">Docs</Link>
        </nav>
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{section.title}</h1>
          <p className="mt-3 text-base md:text-lg text-muted-foreground max-w-3xl">{section.description}</p>
        </header>

        <ul className="grid gap-3 sm:grid-cols-2">
          {section.entries.map((entry) => (
            <li key={entry.title}><EntryCard entry={entry} /></li>
          ))}
        </ul>
      </article>
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
        <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_CLASSES[status]}`}>
          {STATUS_LABEL[status]}
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{entry.description}</p>
      {entry.sources && entry.sources.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {entry.sources.map((s: DocSource) => {
            const Icon = SOURCE_ICON[s.kind]
            return (
              <li key={`${s.kind}-${s.href}`}>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${SOURCE_CLASSES[s.kind]}`}>
                  <Icon className="h-3 w-3" aria-hidden />
                  {s.label}
                </span>
              </li>
            )
          })}
        </ul>
      ) : null}
    </>
  )
  if (entry.href) {
    return <Link href={entry.href} className={cardClass}>{body}</Link>
  }
  return <div className={cardClass}>{body}</div>
}
