// lib/data/mock-species.ts
// This file contains mock data for the ancestry app

export interface Species {
  id: string
  name: string
  description: string
  characteristics: string[]
}

export const MOCK_SPECIES_DATA: Species[] = [
  {
    id: "1",
    name: "Agaricus bisporus",
    description: "The common button mushroom found in grocery stores.",
    characteristics: ["Edible", "Cultivated"],
  },
  {
    id: "2",
    name: "Amanita muscaria",
    description: "A poisonous mushroom with a distinctive red cap and white spots.",
    characteristics: ["Poisonous", "Mycorrhizal"],
  },
  {
    id: "3",
    name: "Cantharellus cibarius",
    description: "A prized edible mushroom with a fruity aroma.",
    characteristics: ["Edible", "Mycorrhizal"],
  },
  {
    id: "4",
    name: "Morchella esculenta",
    description: "A highly sought-after edible mushroom with a honeycomb pattern.",
    characteristics: ["Edible", "Mycorrhizal"],
  },
  {
    id: "5",
    name: "Boletus edulis",
    description: "A prized edible mushroom with a rich, nutty flavor.",
    characteristics: ["Edible", "Mycorrhizal"],
  },
  {
    id: "6",
    name: "Inonotus obliquus",
    description: "A parasitic fungus that grows on birch trees, used in traditional medicine.",
    characteristics: ["Medicinal", "Parasitic"],
  },
  {
    id: "7",
    name: "Trametes versicolor",
    description: "A common polypore mushroom known for its immune system benefits.",
    characteristics: ["Medicinal", "Saprotrophic"],
  },
  {
    id: "8",
    name: "Hericium erinaceus",
    description: "A medicinal mushroom known for its cognitive benefits.",
    characteristics: ["Medicinal", "Saprotrophic"],
  },
  {
    id: "9",
    name: "Pleurotus ostreatus",
    description: "A commonly cultivated edible mushroom with an oyster-like shape.",
    characteristics: ["Edible", "Saprotrophic"],
  },
  {
    id: "10",
    name: "Flammulina velutipes",
    description: "A mushroom with long, thin stems and small caps, commonly used in Asian cuisine.",
    characteristics: ["Edible", "Saprotrophic"],
  },
]
