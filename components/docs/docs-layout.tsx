"use client"

import { useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, ChevronRight, Menu } from "lucide-react"
import { DOCS_CATALOG, type DocSection } from "@/lib/docs-catalog"

interface DocsLayoutProps {
  children: ReactNode
}

/**
 * Shared shell for every `/docs/**` route. Two-column at md+, single-column on
 * mobile with a "Browse documentation" disclosure on top.
 */
export function DocsLayout({ children }: DocsLayoutProps) {
  const pathname = usePathname() || "/docs"
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-10">
      {/* Mobile disclosure */}
      <div className="md:hidden mb-4">
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left text-sm font-medium"
          aria-expanded={mobileOpen}
          aria-controls="docs-mobile-sidebar"
        >
          <span className="flex items-center gap-2">
            <Menu className="h-4 w-4" aria-hidden />
            Browse documentation
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${mobileOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {mobileOpen ? (
          <div
            id="docs-mobile-sidebar"
            className="mt-2 rounded-lg border border-border bg-card p-4"
          >
            <DocsSidebar
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        ) : null}
      </div>

      <div className="md:grid md:grid-cols-[16rem_1fr] md:gap-10 lg:gap-12">
        {/* Desktop sidebar */}
        <aside className="hidden md:block">
          <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto pr-2">
            <DocsSidebar pathname={pathname} />
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  )
}

interface DocsSidebarProps {
  pathname: string
  onNavigate?: () => void
}

function DocsSidebar({ pathname, onNavigate }: DocsSidebarProps) {
  // Pre-compute which sections should start expanded: any section whose
  // href matches, or any section containing a matching entry.
  const initiallyOpen = useMemo(() => {
    const map: Record<string, boolean> = {}
    for (const section of DOCS_CATALOG) {
      const matchesSection = section.href ? pathname === section.href : false
      const matchesEntry = section.entries.some(
        (entry) => entry.href && pathname.startsWith(entry.href),
      )
      map[section.id] = matchesSection || matchesEntry
    }
    return map
  }, [pathname])

  return (
    <nav aria-label="Documentation navigation" className="space-y-1 text-sm">
      {DOCS_CATALOG.map((section) => (
        <SidebarSection
          key={section.id}
          section={section}
          pathname={pathname}
          defaultOpen={initiallyOpen[section.id] ?? false}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  )
}

interface SidebarSectionProps {
  section: DocSection
  pathname: string
  defaultOpen: boolean
  onNavigate?: () => void
}

function SidebarSection({ section, pathname, defaultOpen, onNavigate }: SidebarSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const hasChildren = section.entries.length > 0
  const isActiveSection = section.href ? pathname === section.href : false

  return (
    <div className="py-1">
      <div className="flex items-center">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={`docs-section-${section.id}`}
            className="mr-1 inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted"
          >
            {open ? (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            )}
            <span className="sr-only">
              {open ? "Collapse" : "Expand"} {section.title}
            </span>
          </button>
        ) : (
          <span className="mr-1 inline-block h-6 w-6" aria-hidden />
        )}

        {section.href ? (
          <Link
            href={section.href}
            onClick={onNavigate}
            className={`flex-1 rounded-md px-2 py-1 font-medium transition-colors ${
              isActiveSection
                ? "bg-muted text-foreground"
                : "text-foreground/85 hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            {section.title}
          </Link>
        ) : (
          <span className="flex-1 px-2 py-1 font-medium uppercase tracking-wider text-xs text-muted-foreground">
            {section.title}
          </span>
        )}
      </div>

      {hasChildren && open ? (
        <ul
          id={`docs-section-${section.id}`}
          className="mt-1 ml-7 space-y-0.5 border-l border-border/60 pl-3"
        >
          {section.entries.map((entry) => {
            if (!entry.href) return null
            const isActive = pathname === entry.href
            return (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  onClick={onNavigate}
                  className={`block rounded-md px-2 py-1 text-[13px] transition-colors ${
                    isActive
                      ? "bg-primary/10 text-foreground font-medium"
                      : "text-foreground/75 hover:bg-muted/60 hover:text-foreground"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {entry.title}
                </Link>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
