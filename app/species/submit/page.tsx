import Link from "next/link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Submit Species | Mycosoft",
  description: "Submit new species records for review and inclusion in MINDEX.",
}

export default function SpeciesSubmitPage() {
  return (
    <main className="min-h-dvh bg-background">
      <section className="container mx-auto px-4 py-10 md:py-14">
        <Link
          href="/species"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-primary"
        >
          Back to Species
        </Link>
        <p className="mt-4 text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
          Species Submission
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-semibold">
          Submit a Species
        </h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground">
          Provide verified observations, metadata, and supporting references for review.
        </p>
      </section>

      <section className="container mx-auto px-4 pb-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Observation data</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Include location, habitat context, and capture details.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Supporting evidence</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload imagery, lab results, or citations to support validation.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Review workflow</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Submissions route into MAS review queues and MINDEX ingestion.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
import { SubmitSpeciesForm } from "@/components/species/submit-species-form"

export default function SubmitSpeciesPage() {
  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <h1 className="text-3xl font-bold mb-8">Submit New Species</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Help us expand our database by submitting new fungal species information. All submissions are reviewed by our
          mycology team.
        </p>
        <SubmitSpeciesForm />
      </div>
    </div>
  )
}
