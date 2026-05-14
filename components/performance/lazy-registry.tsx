// @ts-nocheck
"use client"

/**
 * Lazy Component Registry (minimal)
 *
 * Only exports that have real targets and active consumers.
 * Heavy CREP bundle loads on demand for `/natureos/earth-simulator`.
 */

import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Globe } from "lucide-react"

function FullPageSkeleton({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-lg text-muted-foreground">Loading {title}...</p>
    </div>
  )
}

export const LazyCREPDashboard = dynamic(
  () =>
    import("@/app/dashboard/crep/CREPDashboardLoader").then((mod) => ({
      default: mod.default,
    })),
  {
    ssr: false,
    loading: () => <FullPageSkeleton title="Earth Simulator" />,
  },
)

function AppSkeleton({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <Card className="overflow-hidden animate-pulse">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-48 w-full" />
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Create a lazy-loaded component with proper typing
 */
export function createLazyComponent<P extends object>(
  importFn: () => Promise<{ default: React.ComponentType<P> }>,
  options: {
    title: string
    icon?: React.ElementType
    description?: string
    ssr?: boolean
    fullPage?: boolean
  },
) {
  const {
    title,
    icon = Globe,
    description = "Loading...",
    ssr = false,
    fullPage = false,
  } = options

  return dynamic(importFn, {
    ssr,
    loading: () =>
      fullPage ? (
        <FullPageSkeleton title={title} />
      ) : (
        <AppSkeleton icon={icon} title={title} description={description} />
      ),
  })
}
