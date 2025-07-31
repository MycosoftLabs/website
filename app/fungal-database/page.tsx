import { Suspense } from "react"
import { FungalDatabaseExplorer } from "@/components/fungal-database/explorer"
import { FungalDatabaseHeader } from "@/components/fungal-database/header"
import { FungalDatabaseSkeleton } from "@/components/fungal-database/skeleton"

export const metadata = {
  title: "Fungal Database Explorer | Mycosoft",
  description: "Explore comprehensive data on various fungal species",
}

export default function FungalDatabasePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <FungalDatabaseHeader />
      <Suspense fallback={<FungalDatabaseSkeleton />}>
        <FungalDatabaseExplorer />
      </Suspense>
    </div>
  )
}
