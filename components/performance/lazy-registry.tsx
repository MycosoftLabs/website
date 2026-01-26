"use client"

/**
 * Lazy Component Registry
 * 
 * Centralized registry of all lazy-loadable heavy components.
 * Components are loaded only when needed and properly cleaned up when unmounted.
 * 
 * Usage:
 * ```tsx
 * import { LazyEarthSimulator } from "@/components/performance/lazy-registry"
 * 
 * // Component will only load when rendered
 * <LazyEarthSimulator />
 * ```
 */

import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Globe, FlaskConical, Microscope, Brain, Map, Network, BarChart3 } from "lucide-react"

// ============================================================================
// Generic Skeletons
// ============================================================================

function AppSkeleton({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
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

function FullPageSkeleton({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-lg text-muted-foreground">Loading {title}...</p>
    </div>
  )
}

// ============================================================================
// NatureOS Apps (Heavy 3D/WebGL components)
// ============================================================================

export const LazyEarthSimulator = dynamic(
  () => import("@/app/apps/earth-simulator/page").then(mod => ({ default: mod.default })),
  { 
    ssr: false, 
    loading: () => <FullPageSkeleton title="Earth Simulator" />
  }
)

export const LazyPetriDishSimulator = dynamic(
  () => import("@/components/simulators/petri-dish-simulator"),
  { 
    ssr: false, 
    loading: () => <AppSkeleton icon={FlaskConical} title="Petri Dish Simulator" description="Loading simulation..." />
  }
)

export const LazyMushroomSimulator = dynamic(
  () => import("@/components/simulators/mushroom-simulator"),
  { 
    ssr: false, 
    loading: () => <AppSkeleton icon={Microscope} title="Mushroom Simulator" description="Loading 3D model..." />
  }
)

// ============================================================================
// AI Components
// ============================================================================

export const LazyChat = dynamic(
  () => import("@/components/chat/chat").then(mod => ({ default: mod.Chat })),
  { 
    ssr: false, 
    loading: () => <AppSkeleton icon={Brain} title="Myca AI" description="Initializing AI..." />
  }
)

export const LazyTransformerExplainer = dynamic(
  () => import("@/components/ai-studio/transformer-explainer"),
  { 
    ssr: false, 
    loading: () => <FullPageSkeleton title="Transformer Explainer" />
  }
)

// ============================================================================
// Map Components (Local/Self-hosted - no cloud dependencies)
// ============================================================================

export const LazyLocalMap = dynamic(
  () => import("@/components/maps/local-map"),
  { 
    ssr: false, 
    loading: () => <AppSkeleton icon={Map} title="Map" description="Loading map..." />
  }
)

// Deprecated: Use LazyLocalMap instead - kept for backward compatibility
export const LazyAzureMap = dynamic(
  () => import("@/components/maps/local-map"), // Redirects to local map
  { 
    ssr: false, 
    loading: () => <AppSkeleton icon={Map} title="Map" description="Loading map..." />
  }
)

export const LazyCREPDashboard = dynamic(
  () => import("@/components/dashboard/crep-dashboard"),
  { 
    ssr: false, 
    loading: () => <FullPageSkeleton title="CREP Dashboard" />
  }
)

// ============================================================================
// Visualization Components
// ============================================================================

export const LazyMycorrhizalNetwork = dynamic(
  () => import("@/components/visualizations/mycorrhizal-network-viz"),
  { 
    ssr: false, 
    loading: () => <AppSkeleton icon={Network} title="Mycorrhizal Network" description="Loading network..." />
  }
)

export const LazyPhylogeneticTree = dynamic(
  () => import("@/components/ancestry/phylogenetic-tree"),
  { 
    ssr: false, 
    loading: () => <AppSkeleton icon={Network} title="Phylogenetic Tree" description="Loading tree..." />
  }
)

export const LazyGrowthAnalytics = dynamic(
  () => import("@/components/analytics/growth-analytics"),
  { 
    ssr: false, 
    loading: () => <AppSkeleton icon={BarChart3} title="Growth Analytics" description="Loading charts..." />
  }
)

// ============================================================================
// Re-export MINDEX viewers from lazy-viewers.tsx
// ============================================================================

export { 
  GenomeTrackViewerLazy,
  CircosViewerLazy,
  SpeciesExplorerLazy,
  JBrowseViewerLazy,
  GenomeTrackViewerVisibility,
  CircosViewerVisibility,
  SpeciesExplorerVisibility,
  JBrowseViewerVisibility,
} from "@/components/mindex/lazy-viewers"

// ============================================================================
// Type-safe lazy import helper
// ============================================================================

/**
 * Create a lazy-loaded component with proper typing
 * 
 * @example
 * const LazyMyComponent = createLazyComponent(
 *   () => import("@/components/MyComponent"),
 *   { title: "My Component", icon: Globe }
 * )
 */
export function createLazyComponent<P extends object>(
  importFn: () => Promise<{ default: React.ComponentType<P> }>,
  options: { 
    title: string
    icon?: React.ElementType
    description?: string
    ssr?: boolean
    fullPage?: boolean
  }
) {
  const { title, icon = Globe, description = "Loading...", ssr = false, fullPage = false } = options
  
  return dynamic(importFn, {
    ssr,
    loading: () => fullPage 
      ? <FullPageSkeleton title={title} />
      : <AppSkeleton icon={icon} title={title} description={description} />,
  })
}
