/**
 * Fungi Compute Loading State
 */

import { Skeleton } from "@/components/ui/skeleton"

export default function FungiComputeLoading() {
  return (
    <div className="min-h-screen bg-[#050810] p-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg bg-cyan-500/10" />
          <div>
            <Skeleton className="h-6 w-48 bg-cyan-500/10" />
            <Skeleton className="h-4 w-32 mt-1 bg-cyan-500/10" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32 bg-cyan-500/10" />
          <Skeleton className="h-9 w-24 bg-cyan-500/10" />
        </div>
      </div>

      {/* Main content grid skeleton */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left panel - Device selector & SDR controls */}
        <div className="col-span-3 space-y-4">
          <Skeleton className="h-48 rounded-xl bg-cyan-500/10" />
          <Skeleton className="h-64 rounded-xl bg-cyan-500/10" />
        </div>

        {/* Center - Main visualization area */}
        <div className="col-span-6 space-y-4">
          {/* Oscilloscope */}
          <Skeleton className="h-80 rounded-xl bg-cyan-500/10" />
          {/* Spectrum */}
          <Skeleton className="h-48 rounded-xl bg-cyan-500/10" />
        </div>

        {/* Right panel - Events & patterns */}
        <div className="col-span-3 space-y-4">
          <Skeleton className="h-64 rounded-xl bg-cyan-500/10" />
          <Skeleton className="h-48 rounded-xl bg-cyan-500/10" />
        </div>
      </div>

      {/* Bottom panel skeleton */}
      <div className="mt-4 grid grid-cols-4 gap-4">
        <Skeleton className="h-32 rounded-xl bg-cyan-500/10" />
        <Skeleton className="h-32 rounded-xl bg-cyan-500/10" />
        <Skeleton className="h-32 rounded-xl bg-cyan-500/10" />
        <Skeleton className="h-32 rounded-xl bg-cyan-500/10" />
      </div>
    </div>
  )
}
