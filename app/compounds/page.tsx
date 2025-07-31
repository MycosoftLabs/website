import { notFound } from "next/navigation"
import { CompoundDirectory } from "@/components/compounds/compound-directory"
import type { Metadata } from "next"
import { COMPOUND_MAPPING } from "@/lib/data/compounds"

export const metadata: Metadata = {
  title: "Compounds - Mycosoft",
  description: "Explore fungal compounds in the Mycosoft database",
}

export default function CompoundsPage() {
  // Convert the object to an array of compounds
  const compoundsList = Object.values(COMPOUND_MAPPING)

  if (!compoundsList || compoundsList.length === 0) {
    notFound()
  }

  return (
    <div className="container mx-auto p-4 px-4 sm:px-6">
      <h1 className="text-3xl font-bold mb-6">Compound Directory</h1>
      <CompoundDirectory compounds={compoundsList} />
    </div>
  )
}
