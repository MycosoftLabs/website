import { Suspense } from "react"
import { notFound } from "next/navigation"
import { FungiProfile } from "@/components/fungal-database/fungi-profile"
import { FungiProfileSkeleton } from "@/components/fungal-database/fungi-profile-skeleton"
import { getFungiById } from "@/lib/mock-data"

interface FungiProfilePageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({ params }: FungiProfilePageProps) {
  const fungi = getFungiById(Number.parseInt(params.id))

  if (!fungi) {
    return {
      title: "Fungi Not Found | Mycosoft",
      description: "The requested fungi could not be found",
    }
  }

  return {
    title: `${fungi.scientificName} | Mycosoft Fungal Database`,
    description: fungi.description.substring(0, 160),
  }
}

export default function FungiProfilePage({ params }: FungiProfilePageProps) {
  const fungi = getFungiById(Number.parseInt(params.id))

  if (!fungi) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<FungiProfileSkeleton />}>
        <FungiProfile fungi={fungi} />
      </Suspense>
    </div>
  )
}
