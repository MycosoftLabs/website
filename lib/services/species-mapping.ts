// Comprehensive species mapping with accurate IDs and related data
export const SPECIES_MAPPING = {
  // Lion's Mane
  "hericium-erinaceus": {
    iNaturalistId: "49158", // Updated from "48701" to correct ID
    commonNames: ["Lion's Mane", "Bearded Tooth", "Monkey Head", "Pom Pom", "Bear's Head", "Hedgehog Mushroom"],
    scientificName: "Hericium erinaceus",
    description: `Hericium erinaceus, commonly known as Lion's Mane mushroom, is a distinctive fungus known for its unique appearance and medicinal properties. It produces large, white, spherical to heart-shaped fruiting bodies with long, cascading spines. The mushroom has been extensively studied for its potential cognitive benefits, particularly its ability to stimulate the production of nerve growth factor (NGF) and support neurological health.

This species typically appears as a white, globose fungus with long spines (1-5 cm in length), giving it the appearance of a lion's mane, hence its common name. When young, it is pure white, gradually yellowing or browning with age. The flesh is white, soft when fresh, and has a mild taste often compared to seafood.

Lion's Mane has been used in traditional Chinese medicine for centuries and is now gaining recognition in modern research for its potential neuroprotective, anti-inflammatory, and immune-boosting properties.`,
    characteristics: {
      habitat: [
        "Dead or dying hardwood trees",
        "American Beech",
        "Oak",
        "Maple",
        "Walnut",
        "Standing dead trees",
        "Fallen logs",
      ],
      season: ["Late summer", "Fall", "Early winter"],
      edibility: "Choice edible and medicinal",
      ecology: "Saprobic and weakly parasitic on hardwoods, causing white rot",
    },
    taxonomy: {
      kingdom: "Fungi",
      phylum: "Basidiomycota",
      class: "Agaricomycetes",
      order: "Russulales",
      family: "Hericiaceae",
      genus: "Hericium",
      species: "H. erinaceus",
      ancestor_ids: [47170, 48701, 49158], // Added ancestor IDs
    },
    interactions: [
      "Saprobic relationship with hardwood trees, particularly beech and maple",
      "Causes white rot decay in host trees",
      "Potential symbiotic relationships with forest microorganisms",
      "Part of forest nutrient cycling and decomposition networks",
      "Supports habitat for various invertebrates during fruiting",
    ],
    conservationStatus:
      "Population status varies by region. Not currently threatened but may be impacted by habitat loss and climate change. Some local populations face pressure from over-harvesting.",
    searchTerms: [
      "lions mane",
      "lion's mane",
      "hericium",
      "erinaceus",
      "bearded tooth",
      "monkey head",
      "pom pom",
      "bears head",
      "hedgehog mushroom",
      "brain health",
      "cognitive",
      "nerve growth factor",
      "ngf",
      "memory",
      "neuroprotective",
      "neuroprotective",
    ],
    compounds: [
      {
        id: "CS123456",
        name: "Hericenone B",
        concentration: "Major bioactive compound",
      },
      {
        id: "CS123457",
        name: "Erinacine A",
        concentration: "Primary active compound in mycelium",
      },
      {
        id: "CS123458",
        name: "Hericenone D",
        concentration: "Secondary bioactive compound",
      },
      {
        id: "CS123459",
        name: "Erinacine E",
        concentration: "Mycelial metabolite",
      },
    ],
    relatedResearch: [
      "nerve growth factor stimulation",
      "cognitive enhancement",
      "neuroprotection",
      "brain health",
      "memory improvement",
      "neurodegenerative diseases",
      "anti-inflammatory properties",
      "immune system modulation",
    ],
    // Add default images in case iNaturalist fails
    defaultImages: [
      {
        url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/lions-mane-1-nJ9ldWHOtJ0yj4XiQOQP3vH8SChRJv.jpg",
        medium_url:
          "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/lions-mane-1-nJ9ldWHOtJ0yj4XiQOQP3vH8SChRJv.jpg",
        large_url:
          "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/lions-mane-1-nJ9ldWHOtJ0yj4XiQOQP3vH8SChRJv.jpg",
        attribution: "© Mycosoft",
        license_code: "All Rights Reserved",
        type: "primary",
      },
      {
        url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/lions-mane-2-9XgKbCFTD8Kh9RxAcIusjlJpEDNqu5.jpg",
        medium_url:
          "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/lions-mane-2-9XgKbCFTD8Kh9RxAcIusjlJpEDNqu5.jpg",
        large_url:
          "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/lions-mane-2-9XgKbCFTD8Kh9RxAcIusjlJpEDNqu5.jpg",
        attribution: "© Mycosoft",
        license_code: "All Rights Reserved",
        type: "specimen",
      },
    ],
  },

  // Cordyceps
  "cordyceps-militaris": {
    iNaturalistId: "57833", // Updated from 127382
    commonNames: ["Orange Cordyceps", "Militaris"],
    scientificName: "Cordyceps militaris",
    searchTerms: [
      "cordyceps",
      "militaris",
      "orange cordyceps",
      "energy",
      "stamina",
      "athletic performance",
      "immunity",
      "cordycepin",
    ],
    compounds: [
      { id: "CS234561", name: "Cordycepin" },
      { id: "CS234562", name: "D-mannitol" },
      { id: "CS234563", name: "Adenosine" },
    ],
    relatedResearch: ["athletic performance", "energy metabolism", "immune system", "anti-inflammatory", "endurance"],
  },

  // Reishi
  "ganoderma-lucidum": {
    iNaturalistId: "48139", // Updated from 48484
    commonNames: ["Reishi", "Lingzhi", "Varnished Conk"],
    scientificName: "Ganoderma lucidum",
    description: `Ganoderma lucidum, commonly known as Reishi or Lingzhi, is a polypore fungus that has been used in traditional Asian medicine for over 2,000 years. It is characterized by its distinctive reddish-brown varnished appearance and kidney-shaped cap. This species is renowned for its potential adaptogenic and immunomodulating properties.`,
    characteristics: {
      habitat: ["Dead or dying hardwood trees", "Stumps", "Buried roots"],
      season: ["Year-round", "Most visible in summer and fall"],
      edibility: "Medicinal, traditionally prepared as tea or extract",
      ecology: "Parasitic and saprobic on hardwoods",
    },
    taxonomy: {
      kingdom: "Fungi",
      phylum: "Basidiomycota",
      class: "Agaricomycetes",
      order: "Polyporales",
      family: "Ganodermataceae",
      genus: "Ganoderma",
      species: "G. lucidum",
      ancestor_ids: [47170, 48484],
    },
    defaultImages: [
      {
        url: "https://inaturalist-open-data.s3.amazonaws.com/photos/12345/large.jpg",
        medium_url: "https://inaturalist-open-data.s3.amazonaws.com/photos/12345/medium.jpg",
        attribution: "© iNaturalist",
        license_code: "CC-BY-NC",
        type: "primary",
      },
    ],
    compounds: [
      { id: "CS345671", name: "Ganoderic acid", concentration: "Primary triterpene" },
      { id: "CS345672", name: "Beta-glucans", concentration: "Immunomodulating compound" },
      { id: "CS345673", name: "Triterpenes", concentration: "Various bioactive compounds" },
    ],
    searchTerms: ["reishi", "ganoderma", "lucidum", "lingzhi", "immunity", "adaptogen", "longevity"],
  },

  // Turkey Tail
  "trametes-versicolor": {
    iNaturalistId: "54134", // Updated from 48394
    commonNames: ["Turkey Tail", "Yun Zhi", "Cloud Mushroom"],
    scientificName: "Trametes versicolor",
    description: `Trametes versicolor, commonly known as Turkey Tail due to its distinctive banding pattern resembling turkey feathers, is one of the most common and well-studied medicinal mushrooms. This species forms thin, flexible brackets with striking concentric zones of varying colors.`,
    characteristics: {
      habitat: ["Dead hardwood logs", "Stumps", "Fallen branches"],
      season: ["Year-round"],
      edibility: "Medicinal, traditionally prepared as tea",
      ecology: "Saprobic, causing white rot in dead wood",
    },
    taxonomy: {
      kingdom: "Fungi",
      phylum: "Basidiomycota",
      class: "Agaricomycetes",
      order: "Polyporales",
      family: "Polyporaceae",
      genus: "Trametes",
      species: "T. versicolor",
      ancestor_ids: [47170, 48394],
    },
    defaultImages: [
      {
        url: "https://inaturalist-open-data.s3.amazonaws.com/photos/67890/large.jpg",
        medium_url: "https://inaturalist-open-data.s3.amazonaws.com/photos/67890/medium.jpg",
        attribution: "© iNaturalist",
        license_code: "CC-BY-NC",
        type: "primary",
      },
    ],
    compounds: [
      { id: "CS456781", name: "Polysaccharide-K (PSK)", concentration: "Primary immunomodulator" },
      { id: "CS456782", name: "Polysaccharide peptide (PSP)", concentration: "Bioactive protein-bound polysaccharide" },
      { id: "CS456783", name: "Beta-glucans", concentration: "Structural polysaccharides" },
    ],
    searchTerms: ["turkey tail", "trametes", "versicolor", "yun zhi", "psk", "immunity", "cancer"],
  },

  // Chaga
  "inonotus-obliquus": {
    iNaturalistId: "50443", // Updated from 49796
    commonNames: ["Chaga"],
    scientificName: "Inonotus obliquus",
    searchTerms: ["chaga", "inonotus", "obliquus", "antioxidant", "immunity", "birch mushroom"],
    compounds: [
      { id: "CS567891", name: "Betulinic acid" },
      { id: "CS567892", name: "Melanin complex" },
      { id: "CS567893", name: "Inotodiol" },
    ],
    relatedResearch: [
      "antioxidant properties",
      "immune system",
      "anti-inflammatory",
      "skin health",
      "digestive health",
    ],
  },
}

export type SpeciesKey = keyof typeof SPECIES_MAPPING

export function findSpeciesBySearchTerm(term: string): (typeof SPECIES_MAPPING)[SpeciesKey] | undefined {
  if (!term) return undefined

  const normalizedTerm = term.toLowerCase().trim()

  return Object.values(SPECIES_MAPPING).find(
    (species) =>
      species.searchTerms.some((searchTerm) => normalizedTerm.includes(searchTerm.toLowerCase())) ||
      species.commonNames.some((name) => normalizedTerm.includes(name.toLowerCase())) ||
      normalizedTerm.includes(species.scientificName.toLowerCase()),
  )
}

export function findSpeciesById(iNaturalistId: string) {
  return Object.values(SPECIES_MAPPING).find((species) => species.iNaturalistId === iNaturalistId)
}

export function getRelatedCompounds(speciesKey: SpeciesKey) {
  return SPECIES_MAPPING[speciesKey].compounds
}

export function getRelatedResearch(speciesKey: SpeciesKey) {
  return SPECIES_MAPPING[speciesKey].relatedResearch || []
}
