"use client"

import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Dna, CircleDot, Globe, Layers } from "lucide-react"
import { LazyLoader } from "@/components/performance/lazy-loader"
import React from "react"

// Loading skeleton components for better UX
function GenomeTrackSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10">
            <Dna className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <CardTitle className="text-lg">Genome Track Viewer</CardTitle>
            <p className="text-sm text-muted-foreground">Loading visualization...</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-green-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CircosSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <CircleDot className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <CardTitle className="text-lg">Circos Visualization</CardTitle>
            <p className="text-sm text-muted-foreground">Loading circular plot...</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="aspect-square flex items-center justify-center bg-muted/30 rounded-lg">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      </CardContent>
    </Card>
  )
}

function SpeciesExplorerSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10">
            <Globe className="h-5 w-5 text-cyan-500" />
          </div>
          <div>
            <CardTitle className="text-lg">Species Explorer</CardTitle>
            <p className="text-sm text-muted-foreground">Loading spatial data...</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  )
}

function JBrowseSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10">
            <Layers className="h-5 w-5 text-indigo-500" />
          </div>
          <div>
            <CardTitle className="text-lg">Genome Browser</CardTitle>
            <p className="text-sm text-muted-foreground">Loading JBrowse2...</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-8 w-16" />
          ))}
        </div>
        <Skeleton className="h-8 w-full mb-2" />
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-20 w-full mb-2" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  )
}

// Lazy-loaded components with SSR disabled for browser-only visualizations
export const GenomeTrackViewerLazy = dynamic(
  () => import("@/components/mindex/genome-track-viewer").then(mod => ({ default: mod.GenomeTrackViewer })),
  { 
    ssr: false, 
    loading: () => <GenomeTrackSkeleton />
  }
)

export const CircosViewerLazy = dynamic(
  () => import("@/components/mindex/circos-viewer").then(mod => ({ default: mod.CircosViewer })),
  { 
    ssr: false, 
    loading: () => <CircosSkeleton />
  }
)

export const SpeciesExplorerLazy = dynamic(
  () => import("@/components/mindex/species-explorer").then(mod => ({ default: mod.SpeciesExplorer })),
  { 
    ssr: false, 
    loading: () => <SpeciesExplorerSkeleton />
  }
)

export const JBrowseViewerLazy = dynamic(
  () => import("@/components/mindex/jbrowse-viewer").then(mod => ({ default: mod.JBrowseViewer })),
  { 
    ssr: false, 
    loading: () => <JBrowseSkeleton />
  }
)

// Note: Props types are defined inline in original components
// Use ComponentProps<typeof GenomeTrackViewerLazy> if needed

// Visibility-based wrappers - only load when scrolled into view
interface VisibilityWrapperProps {
  children: React.ReactNode
  skeleton: React.ReactNode
  minHeight?: number
  unloadOnExit?: boolean
}

function VisibilityWrapper({ children, skeleton, minHeight = 300, unloadOnExit = false }: VisibilityWrapperProps) {
  return (
    <LazyLoader
      skeleton={skeleton}
      minHeight={minHeight}
      rootMargin="100px"
      unloadOnExit={unloadOnExit}
      unloadDelay={10000}
    >
      {children}
    </LazyLoader>
  )
}

// Visibility-based lazy components - load ONLY when visible in viewport
export function GenomeTrackViewerVisibility(props: React.ComponentProps<typeof GenomeTrackViewerLazy>) {
  return (
    <VisibilityWrapper skeleton={<GenomeTrackSkeleton />} minHeight={400}>
      <GenomeTrackViewerLazy {...props} />
    </VisibilityWrapper>
  )
}

export function CircosViewerVisibility(props: React.ComponentProps<typeof CircosViewerLazy>) {
  return (
    <VisibilityWrapper skeleton={<CircosSkeleton />} minHeight={400}>
      <CircosViewerLazy {...props} />
    </VisibilityWrapper>
  )
}

export function SpeciesExplorerVisibility(props: React.ComponentProps<typeof SpeciesExplorerLazy>) {
  return (
    <VisibilityWrapper skeleton={<SpeciesExplorerSkeleton />} minHeight={450}>
      <SpeciesExplorerLazy {...props} />
    </VisibilityWrapper>
  )
}

export function JBrowseViewerVisibility(props: React.ComponentProps<typeof JBrowseViewerLazy>) {
  return (
    <VisibilityWrapper skeleton={<JBrowseSkeleton />} minHeight={300}>
      <JBrowseViewerLazy {...props} />
    </VisibilityWrapper>
  )
}
