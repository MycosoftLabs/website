// Comprehensive species mapping with accurate IDs and related data
export const SPECIES_MAPPING = {
  // Lion's Mane
  "hericium-erinaceus": {
    iNaturalistId: "48701",
    commonNames: ["Lion's Mane", "Bearded Tooth", "Monkey Head"],
    scientificName: "Hericium erinaceus",
    description:
      "Hericium erinaceus, also known as Lion's Mane mushroom, is a distinctive fungus known for its cascading white spines and its potential cognitive benefits. It typically grows on hardwood trees, particularly American Beech, and has been extensively studied for its medicinal properties.",
    characteristics: {
      habitat: [
        "Hardwood trees, especially American Beech",
        "Oak trees",
        "Maple trees",
        "Standing and fallen dead wood",
      ],
      season: ["Late summer", "Fall"],
      edibility: "Edible and medicinal",
      ecology: "Saprobic, causing white rot in hardwoods; occasionally weakly parasitic",
    },
    interactions: [
      "Forms beneficial relationships with hardwood trees",
      "Provides habitat for various insects",
      "Contributes to forest decomposition processes",
    ],
    conservationStatus: "Not threatened, but habitat loss may affect local populations",
    searchTerms: [
      "lions mane",
      "lion's mane",
      "lions mane research",
      "lion's mane research",
      "hericium",
      "erinaceus",
      "bearded tooth",
      "monkey head",
      "brain health",
      "cognitive",
      "nerve growth factor",
      "ngf",
      "memory",
      "neuroprotective",
      "hericium erinaceus research",
      "lions mane studies",
      "lion's mane studies",
    ],
    compounds: [
      { id: "CS123456", name: "Hericenone B" },
      { id: "CS123457", name: "Erinacine A" },
      { id: "CS123458", name: "Hericenone D" },
      { id: "CS123459", name: "Erinacine E" },
    ],
    relatedResearch: [
      "nerve growth factor",
      "cognitive enhancement",
      "neuroprotection",
      "brain health",
      "memory improvement",
    ],
  },

  // Cordyceps
  "cordyceps-militaris": {
    iNaturalistId: "127382",
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
    iNaturalistId: "48484",
    commonNames: ["Reishi", "Lingzhi"],
    scientificName: "Ganoderma lucidum",
    searchTerms: ["reishi", "ganoderma", "lucidum", "lingzhi", "immunity", "adaptogen", "longevity"],
    compounds: [
      { id: "CS345671", name: "Ganoderic acid" },
      { id: "CS345672", name: "Beta-glucans" },
      { id: "CS345673", name: "Triterpenes" },
    ],
    relatedResearch: [
      "immune modulation",
      "adaptogenic properties",
      "anti-inflammatory",
      "sleep quality",
      "stress reduction",
    ],
  },

  // Turkey Tail
  "trametes-versicolor": {
    iNaturalistId: "48394",
    commonNames: ["Turkey Tail", "Yun Zhi"],
    scientificName: "Trametes versicolor",
    searchTerms: ["turkey tail", "trametes", "versicolor", "yun zhi", "psk", "immunity", "cancer"],
    compounds: [
      { id: "CS456781", name: "Polysaccharide-K (PSK)" },
      { id: "CS456782", name: "Polysaccharide peptide (PSP)" },
      { id: "CS456783", name: "Beta-glucans" },
    ],
    relatedResearch: ["immune system support", "cancer research", "gut health", "microbiome", "antiviral"],
  },

  // Chaga
  "inonotus-obliquus": {
    iNaturalistId: "49796",
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
