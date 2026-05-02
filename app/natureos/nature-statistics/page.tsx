import type { Metadata } from "next"
import { NatureStatisticsView } from "@/components/natureos/nature-statistics-view"

export const metadata: Metadata = {
  title: "Nature Statistics | NatureOS",
  description:
    "World population (live), humans & machines, agents, air/ground/water quality, and all species by kingdom: plants, birds, insects, animals, marine, mammals, protista, bacteria, archaea.",
}

export default function NatureOSNatureStatisticsPage() {
  return <NatureStatisticsView />
}
