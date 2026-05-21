import type { ResearchStatus } from "./science-publications"

export type EndangeredSpeciesTone =
  | "marine"
  | "habitat"
  | "field"
  | "learning"

export interface EndangeredSpeciesSignal {
  id: string
  value: string
  label: string
  detail: string
  sourceName: string
  sourceHref: string
  tone: EndangeredSpeciesTone
}

export interface EndangeredSpeciesProject {
  id: string
  title: string
  status: ResearchStatus
  focus: string
  detail: string
  evidence: string[]
  sourceName: string
  sourceHref: string
  tone: EndangeredSpeciesTone
}

export interface EndangeredSpeciesSource {
  name: string
  label: string
  href: string
}

export const ENDANGERED_SPECIES_DIGEST = {
  eventDate: "May 15, 2026",
  lastCurated: "May 15, 2026",
  nextReview: "May 22, 2026",
  cadence: "Weekly static refresh",
  deck:
    "A static research digest for Endangered Species Day, centered on recovery science, habitat protection, field monitoring, and public biodiversity literacy.",
}

export const ENDANGERED_SPECIES_SIGNALS: EndangeredSpeciesSignal[] = [
  {
    id: "right-whale-calves",
    value: "23",
    label: "right whale calves",
    detail:
      "NOAA reported the strongest North Atlantic right whale calving season count since 2009.",
    sourceName: "NOAA Fisheries",
    sourceHref:
      "https://www.fisheries.noaa.gov/feature-story/good-news-stories-endangered-species-day-2026",
    tone: "marine",
  },
  {
    id: "monk-seal-entanglement",
    value: "70%",
    label: "entanglement reduction",
    detail:
      "Marine debris removal in the Northwestern Hawaiian Islands reduced Hawaiian monk seal entanglement by as much as 70 percent on some islands.",
    sourceName: "NOAA Fisheries",
    sourceHref:
      "https://www.fisheries.noaa.gov/feature-story/good-news-stories-endangered-species-day-2026",
    tone: "habitat",
  },
  {
    id: "leatherback-kei-islands",
    value: "85%",
    label: "local take reduction",
    detail:
      "NOAA and WWF-supported community monitoring reduced leatherback turtle and nest take for consumption in Indonesia's Kei Islands.",
    sourceName: "NOAA Fisheries",
    sourceHref:
      "https://www.fisheries.noaa.gov/feature-story/good-news-stories-endangered-species-day-2026",
    tone: "field",
  },
  {
    id: "global-endangered-species",
    value: "16k+",
    label: "endangered species listed",
    detail:
      "Britannica summarizes the IUCN Red List scale across plants, animals, fungi, and algae.",
    sourceName: "Britannica",
    sourceHref: "https://www.britannica.com/story/endangered-species-day",
    tone: "learning",
  },
]

export const ENDANGERED_SPECIES_PROJECTS: EndangeredSpeciesProject[] = [
  {
    id: "marine-recovery-surveys",
    title: "Marine Recovery Surveys",
    status: "Research",
    focus: "Population surveys, nesting counts, and recovery trend analysis",
    detail:
      "Endangered Species Day 2026 gives the science page a recovery lens: right whale calving, sea turtle rebounds, salmon and steelhead abundance, and monk seal debris-response work all point to measurable conservation signals.",
    evidence: [
      "Right whale calving counts from Southeast survey work",
      "Sea turtle status review and nest-protection analysis",
      "Pacific Coast salmon and steelhead abundance after ESA listing",
    ],
    sourceName: "NOAA Fisheries",
    sourceHref:
      "https://www.fisheries.noaa.gov/feature-story/good-news-stories-endangered-species-day-2026",
    tone: "marine",
  },
  {
    id: "community-nesting-beaches",
    title: "Community Nesting Beach Monitoring",
    status: "Deployed",
    focus: "Local data gathering, stewardship, and protected beach observations",
    detail:
      "The NOAA-WWF leatherback work in the Indo-Pacific is a strong model for conservation data collection: locally led monitoring, field records, and behavior change around nesting beaches.",
    evidence: [
      "Community monitoring at leatherback nesting beaches",
      "Reduced consumption pressure in the Kei Islands",
      "International partnership across NOAA, WWF-US, and WWF Indonesia",
    ],
    sourceName: "NOAA Fisheries",
    sourceHref:
      "https://www.fisheries.noaa.gov/feature-story/good-news-stories-endangered-species-day-2026",
    tone: "field",
  },
  {
    id: "habitat-law-restoration",
    title: "Habitat Law and Restoration",
    status: "Research",
    focus: "Endangered Species Act protections, habitat repair, and climate-smart corridors",
    detail:
      "NWF and Britannica frame conservation as a long-running public science project: legal protection, habitat restoration, funding, and local stewardship all become part of the recovery stack.",
    evidence: [
      "Endangered Species Day is observed on the third Friday in May",
      "NWF highlights the risk facing more than one-third of U.S. fish and wildlife species",
      "Recovery depends on intervention against habitat loss, invasive species, pollution, and climate pressure",
    ],
    sourceName: "National Wildlife Federation",
    sourceHref:
      "https://www.nwf.org/Our-Work/Wildlife-Conservation/Endangered-Species/Endangered-Species-Day",
    tone: "habitat",
  },
  {
    id: "public-biodiversity-literacy",
    title: "Public Biodiversity Literacy",
    status: "Prototype",
    focus: "Species education, school activities, and public participation",
    detail:
      "The public-facing layer matters: WWF and NWF package endangered species science into learning resources, species stories, local events, and practical ways to help communities notice biodiversity before it disappears.",
    evidence: [
      "WWF examples span mountain gorillas, giant pandas, black rhinos, and tigers",
      "NWF points visitors toward events, education resources, and local conservation action",
      "Britannica grounds the day in biodiversity awareness and recovery history",
    ],
    sourceName: "WWF UK",
    sourceHref: "https://www.wwf.org.uk/learn/world-days/endangered-species-day",
    tone: "learning",
  },
]

export const ENDANGERED_SPECIES_SOURCES: EndangeredSpeciesSource[] = [
  {
    name: "NOAA Fisheries",
    label: "2026 recovery stories",
    href: "https://www.fisheries.noaa.gov/feature-story/good-news-stories-endangered-species-day-2026",
  },
  {
    name: "National Wildlife Federation",
    label: "Endangered Species Day",
    href: "https://www.nwf.org/Our-Work/Wildlife-Conservation/Endangered-Species/Endangered-Species-Day",
  },
  {
    name: "WWF UK",
    label: "Species learning guide",
    href: "https://www.wwf.org.uk/learn/world-days/endangered-species-day",
  },
  {
    name: "Britannica",
    label: "Calendar and context",
    href: "https://www.britannica.com/story/endangered-species-day",
  },
]
