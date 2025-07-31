import { Skeleton } from "@/components/ui/skeleton"

export default function DeviceLoading() {
  return (
    <div className="container py-8">
      <Skeleton className="h-12 w-1/3 mb-4" />
      <Skeleton className="h-6 w-2/3 mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Skeleton className="aspect-square h-[400px]" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-12 w-1/3" />
        </div>
      </div>
    </div>
  )
}
