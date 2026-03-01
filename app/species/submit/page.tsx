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
