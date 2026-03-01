import Link from "next/link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Team | Mycosoft",
  description: "Leadership and team directory for Mycosoft.",
}

export default function TeamPage() {
  return (
    <main className="min-h-dvh bg-background">
      <section className="container mx-auto px-4 py-10 md:py-14">
        <Link
          href="/about"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-primary"
        >
          Back to About
        </Link>
        <p className="mt-4 text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
          Team
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-semibold">Our Team</h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground">
          Meet the leadership and teams driving Mycosoft research, engineering, and operations.
        </p>
      </section>

      <section className="container mx-auto px-4 pb-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Leadership</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Executive leadership across science, engineering, and operations.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Research</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Scientists and analysts advancing fungal intelligence and ecology.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Engineering</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Platform engineers, device teams, and infrastructure specialists.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
