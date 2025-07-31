"use client"

import { SearchSection } from "@/components/search-section"
import { SearchResults } from "@/components/search/search-results"
import { useState } from "react"

const sampleResults = [
  {
    id: "48701",
    title: "Lion's Mane",
    description: "A medicinal mushroom known for its potential cognitive benefits and distinctive appearance.",
    type: "fungi" as const,
    url: "/species/48701",
    source: "iNaturalist" as const,
  },
  {
    id: "CS123456",
    title: "Hericenone B",
    description: "A bioactive compound isolated from Lion's Mane mushroom with neurotrophic properties.",
    type: "compound" as const,
    url: "/compounds/CS123456",
    source: "ChemSpider" as const,
  },
  {
    id: "10.1016/j.phymed.2023.154819",
    title: "Neurotrophic properties of the Lion's mane medicinal mushroom",
    description:
      "Research paper examining the cognitive enhancement and neuroprotective effects of Hericium erinaceus.",
    type: "paper" as const,
    url: "/papers/10.1016/j.phymed.2023.154819",
    source: "Elsevier" as const,
    metadata: {
      authors: ["Lai, P.L.", "Naidu, M.", "Sabaratnam, V."],
      year: 2024,
      journal: "Phytomedicine",
    },
  },
]

export default function PreviewPage() {
  const [query, setQuery] = useState("")

  return (
    <div className="min-h-screen bg-background">
      <SearchSection />
      <div className="container mx-auto px-4 py-8">{query && <SearchResults query={query} />}</div>
    </div>
  )
}
