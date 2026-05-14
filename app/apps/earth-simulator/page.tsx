"use client";

import dynamic from "next/dynamic";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { classifyAndRoute } from "@/lib/search/search-intelligence-router";

const EarthSimulatorContainer = dynamic(
  () =>
    import("@/components/earth-simulator/earth-simulator-container").then((m) => ({
      default: m.EarthSimulatorContainer,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white">
        Loading Earth Simulator...
      </div>
    ),
  }
);

function EarthSimulatorPageContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const earthContextFilters = useMemo(
    () => query.trim().length >= 2 ? classifyAndRoute(query).earthContextFilters : null,
    [query]
  );

  return (
    <div className="w-full h-screen bg-black text-white">
      <EarthSimulatorContainer
        initialQuery={query}
        earthContextFilters={earthContextFilters}
      />
    </div>
  );
}

export default function EarthSimulatorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-black text-white">
          Loading Earth Simulator...
        </div>
      }
    >
      <EarthSimulatorPageContent />
    </Suspense>
  );
}
