import type { Fungi } from "@/types/fungi"

export const mockFungiData: Fungi[] = [
  {
    id: 1,
    scientificName: "Amanita muscaria",
    commonName: "Fly Agaric",
    family: "Amanitaceae",
    genus: "Amanita",
    species: "muscaria",
    description:
      "Amanita muscaria, commonly known as the fly agaric or fly amanita, is a basidiomycete of the genus Amanita. It is also a muscimol mushroom. Native throughout the temperate and boreal regions of the Northern Hemisphere, Amanita muscaria has been unintentionally introduced to many countries in the Southern Hemisphere.",
    habitat: "Mixed and deciduous woodland, especially with birch and pine",
    ecology: "Mycorrhizal with various trees, particularly birch and pine",
    edibility: "Poisonous",
    toxicity: "Contains ibotenic acid and muscimol which are psychoactive",
    season: "Summer to late autumn",
    distribution: "Northern Hemisphere, introduced to parts of the Southern Hemisphere",
    notes: "Distinctive red cap with white spots, iconic in popular culture",
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2023-01-01T00:00:00Z",
    characteristics: {
      id: 1,
      fungiId: 1,
      capShape: "Convex to flat",
      capSurface: "Smooth with white warts",
      capColor: "Bright red to orange-red",
      bruises: false,
      odor: "Not distinctive",
      gillAttachment: "Free",
      gillSpacing: "Close",
      gillColor: "White",
      stalkShape: "Cylindrical",
      stalkRoot: "Bulbous",
      stalkSurfaceAboveRing: "Smooth",
      stalkSurfaceBelowRing: "Smooth with scales",
      stalkColorAboveRing: "White",
      stalkColorBelowRing: "White",
      veilType: "Partial",
      veilColor: "White",
      ringNumber: 1,
      ringType: "Skirt-like",
      sporePrintColor: "White",
      population: "Scattered to numerous",
      substrate: "Soil",
    },
    images: [
      {
        id: 1,
        fungiId: 1,
        imageUrl: "/classic-amanita.png",
        caption: "Amanita muscaria in natural habitat",
        isPrimary: true,
        createdAt: "2023-01-01T00:00:00Z",
      },
      {
        id: 2,
        fungiId: 1,
        imageUrl: "/amanita-close-up.png",
        caption: "Close-up of Amanita muscaria cap",
        isPrimary: false,
        createdAt: "2023-01-01T00:00:00Z",
      },
    ],
    taxonomy: {
      id: 1,
      fungiId: 1,
      kingdom: "Fungi",
      phylum: "Basidiomycota",
      class: "Agaricomycetes",
      orderName: "Agaricales",
      family: "Amanitaceae",
      genus: "Amanita",
      species: "muscaria",
    },
  },
  {
    id: 2,
    scientificName: "Boletus edulis",
    commonName: "Porcini",
    family: "Boletaceae",
    genus: "Boletus",
    species: "edulis",
    description:
      "Boletus edulis, commonly known as porcini, is an edible mushroom held in high regard in many cuisines, and is commonly prepared and eaten in soups, pasta, or risotto. The mushroom is low in fat and digestible carbohydrates, and high in protein, vitamins, minerals and dietary fiber.",
    habitat: "Deciduous and coniferous forests",
    ecology: "Mycorrhizal with various trees, particularly oak and pine",
    edibility: "Edible and choice",
    toxicity: "None",
    season: "Late summer to autumn",
    distribution: "Northern Hemisphere, particularly Europe and North America",
    notes: "Highly prized culinary mushroom with a nutty flavor",
    createdAt: "2023-01-02T00:00:00Z",
    updatedAt: "2023-01-02T00:00:00Z",
    characteristics: {
      id: 2,
      fungiId: 2,
      capShape: "Convex to flat",
      capSurface: "Smooth, slightly tacky when wet",
      capColor: "Brown to reddish-brown",
      bruises: false,
      odor: "Pleasant, nutty",
      gillAttachment: "None (has pores)",
      gillSpacing: "N/A",
      gillColor: "N/A",
      stalkShape: "Club-shaped",
      stalkRoot: "Solid",
      stalkSurfaceAboveRing: "Reticulated",
      stalkSurfaceBelowRing: "Reticulated",
      stalkColorAboveRing: "Whitish to brown",
      stalkColorBelowRing: "Whitish to brown",
      veilType: "None",
      veilColor: "N/A",
      ringNumber: 0,
      ringType: "N/A",
      sporePrintColor: "Olive-brown",
      population: "Scattered to numerous",
      substrate: "Soil",
    },
    images: [
      {
        id: 3,
        fungiId: 2,
        imageUrl: "/king-bolete-close-up.png",
        caption: "Boletus edulis in forest setting",
        isPrimary: true,
        createdAt: "2023-01-02T00:00:00Z",
      },
      {
        id: 4,
        fungiId: 2,
        imageUrl: "/boletus-edulis-pores-close-up.png",
        caption: "Underside showing pores of Boletus edulis",
        isPrimary: false,
        createdAt: "2023-01-02T00:00:00Z",
      },
    ],
    taxonomy: {
      id: 2,
      fungiId: 2,
      kingdom: "Fungi",
      phylum: "Basidiomycota",
      class: "Agaricomycetes",
      orderName: "Boletales",
      family: "Boletaceae",
      genus: "Boletus",
      species: "edulis",
    },
  },
  {
    id: 3,
    scientificName: "Cantharellus cibarius",
    commonName: "Chanterelle",
    family: "Cantharellaceae",
    genus: "Cantharellus",
    species: "cibarius",
    description:
      "Cantharellus cibarius, commonly known as the chanterelle, golden chanterelle or girolle, is a fungus. It is probably the best known species of the genus Cantharellus, if not the entire family of Cantharellaceae. It is orange or yellow, meaty and funnel-shaped.",
    habitat: "Deciduous and coniferous forests, often with oak, beech, or pine",
    ecology: "Mycorrhizal with various trees",
    edibility: "Edible and choice",
    toxicity: "None",
    season: "Summer to autumn",
    distribution: "Northern Hemisphere, particularly Europe and North America",
    notes: "Distinctive apricot-like odor and flavor",
    createdAt: "2023-01-03T00:00:00Z",
    updatedAt: "2023-01-03T00:00:00Z",
    characteristics: {
      id: 3,
      fungiId: 3,
      capShape: "Funnel-shaped",
      capSurface: "Smooth to slightly scaly",
      capColor: "Yellow to orange",
      bruises: false,
      odor: "Fruity, like apricots",
      gillAttachment: "Decurrent ridges, not true gills",
      gillSpacing: "Forked and interconnected",
      gillColor: "Same as cap",
      stalkShape: "Tapered downward",
      stalkRoot: "Solid",
      stalkSurfaceAboveRing: "Smooth",
      stalkSurfaceBelowRing: "Smooth",
      stalkColorAboveRing: "Same as cap",
      stalkColorBelowRing: "Same as cap",
      veilType: "None",
      veilColor: "N/A",
      ringNumber: 0,
      ringType: "N/A",
      sporePrintColor: "Pale yellow",
      population: "Scattered to numerous",
      substrate: "Soil",
    },
    images: [
      {
        id: 5,
        fungiId: 3,
        imageUrl: "/golden-chanterelles.png",
        caption: "Cantharellus cibarius growing in forest",
        isPrimary: true,
        createdAt: "2023-01-03T00:00:00Z",
      },
      {
        id: 6,
        fungiId: 3,
        imageUrl: "/placeholder.svg?height=400&width=600&query=Cantharellus%20cibarius%20group",
        caption: "Group of chanterelle mushrooms",
        isPrimary: false,
        createdAt: "2023-01-03T00:00:00Z",
      },
    ],
    taxonomy: {
      id: 3,
      fungiId: 3,
      kingdom: "Fungi",
      phylum: "Basidiomycota",
      class: "Agaricomycetes",
      orderName: "Cantharellales",
      family: "Cantharellaceae",
      genus: "Cantharellus",
      species: "cibarius",
    },
  },
]

export function getAllFungi(): Fungi[] {
  return mockFungiData
}

export function getFungiById(id: number): Fungi | undefined {
  return mockFungiData.find((fungi) => fungi.id === id)
}

export function searchFungi(query: string): Fungi[] {
  const lowerQuery = query.toLowerCase()
  return mockFungiData.filter(
    (fungi) =>
      fungi.scientificName.toLowerCase().includes(lowerQuery) ||
      fungi.commonName.toLowerCase().includes(lowerQuery) ||
      fungi.family.toLowerCase().includes(lowerQuery) ||
      fungi.genus.toLowerCase().includes(lowerQuery) ||
      fungi.description.toLowerCase().includes(lowerQuery),
  )
}

export function filterFungi(options: Record<string, string>): Fungi[] {
  return mockFungiData.filter((fungi) => {
    for (const [key, value] of Object.entries(options)) {
      if (value) {
        const fungiValue = fungi[key as keyof Fungi]
        if (typeof fungiValue === "string" && !fungiValue.toLowerCase().includes(value.toLowerCase())) {
          return false
        }
      }
    }
    return true
  })
}

export function getUniqueValues(field: keyof Fungi): string[] {
  const values = new Set<string>()
  mockFungiData.forEach((fungi) => {
    const value = fungi[field]
    if (typeof value === "string") {
      values.add(value)
    }
  })
  return Array.from(values).sort()
}
