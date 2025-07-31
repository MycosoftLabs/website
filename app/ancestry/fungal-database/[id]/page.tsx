import { Suspense } from "react"
import { notFound } from "next/navigation"
import { FungiProfile } from "@/components/fungal-database/fungi-profile"
import { Skeleton } from "@/components/ui/skeleton"

interface FungiProfilePageProps {
  params: {
    id: string
  }
}

export default function FungiProfilePage({ params }: FungiProfilePageProps) {
  if (!params.id || isNaN(Number(params.id))) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense
        fallback={
          <div className="space-y-8">
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Skeleton className="aspect-square w-full lg:col-span-1" />
              <div className="lg:col-span-2 space-y-6">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          </div>
        }
      >
        <FungiProfile id={params.id} />
      </Suspense>
    </div>
  )
}
