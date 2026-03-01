import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Docs | Mycosoft",
  description: "Documentation hub for Mycosoft systems, APIs, and operations.",
}

export default function DocsPage() {
  return (
    <main className="min-h-dvh bg-background">
      <section className="container mx-auto px-4 py-10 md:py-14">
        <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">Docs</p>
        <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-semibold">Documentation Hub</h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground">
          Find technical references, deployment guides, and system architecture documentation.
        </p>
      </section>

      <section className="container mx-auto px-4 pb-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Platform references</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Core architecture, API catalog, and system registries.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Operations guides</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Deployment, monitoring, and maintenance playbooks.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Developer resources</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              SDK usage, integration patterns, and workflow examples.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
import Link from "next/link"

export default function DocsPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Documentation</h1>
      <p className="mt-2 text-muted-foreground">
        Local docs are not published yet in this repo. This page exists to avoid broken navigation during local
        development.
      </p>

      <div className="mt-6 rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">Useful entry points:</p>
        <ul className="mt-3 list-disc pl-5 text-sm">
          <li>
            <Link className="underline" href="/natureos">
              NatureOS Dashboard
            </Link>
          </li>
          <li>
            <Link className="underline" href="/apps">
              Apps
            </Link>
          </li>
          <li>
            <Link className="underline" href="/devices">
              Devices
            </Link>
          </li>
        </ul>
      </div>
    </div>
  )
}