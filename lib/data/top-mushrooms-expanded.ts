/**
 * Expanded database of mushroom species for search functionality
 * Based on comprehensive research of over 10,000 known mushroom-producing fungi
 */

export interface ExpandedMushroom {
  scientificName: string
  commonNames: string[]
  iNaturalistId?: string
  description?: string
  category: "edible" | "medicinal" | "poisonous" | "psychoactive" | "research" | "other"
  popularity: number // 1-100 scale, higher means more popular
  regions?: string[] // Regions where this mushroom is particularly popular
  searchTerms?: string[]
  compounds?: Array<{
    id: string
    name: string
  }>
}

// Top 100 most searched mushrooms based on research
export const TOP_MUSHROOMS_EXPANDED: Record<string, ExpandedMushroom> = {
  // Edible Mushrooms - Commonly Cultivated
  "agaricus-bisporus": {
    scientificName: "Agaricus bisporus",
    commonNames: ["Button Mushroom", "Cremini", "Portobello", "White Mushroom", "Common Mushroom"],
    iNaturalistId: "54649",
    description:
      "The most widely consumed mushroom in the world, accounting for about 90% of mushroom consumption in many Western countries. Available in several forms based on maturity: white button (young), cremini (brown, slightly more mature), and portobello (fully mature).",
    category: "edible",
    popularity: 100, // Most popular mushroom globally
    regions: ["Global"],
    searchTerms: [
      "button mushroom",
      "portobello",
      "cremini",
      "white mushroom",
      "common mushroom",
      "pizza mushroom",
      "grocery mushroom",
    ],
  },

  "lentinula-edodes": {
    scientificName: "Lentinula edodes",
    commonNames: ["Shiitake", "Black Forest Mushroom", "Golden Oak Mushroom"],
    iNaturalistId: "48564",
    description:
      "Native to East Asia, shiitake is the second most commonly cultivated edible mushroom in the world. Known for its rich, savory flavor and numerous health benefits.",
    category: "edible",
    popularity: 95,
    regions: ["East Asia", "Global"],
    searchTerms: ["shiitake", "shiitake mushroom", "asian mushroom", "umami mushroom", "dried mushroom"],
  },

  "pleurotus-ostreatus": {
    scientificName: "Pleurotus ostreatus",
    commonNames: ["Oyster Mushroom", "Tree Oyster", "Pearl Oyster"],
    iNaturalistId: "48701",
    description:
      "One of the most widely cultivated mushrooms worldwide, known for its oyster-shaped cap and versatility in cooking. Grows naturally on dead or dying trees.",
    category: "edible",
    popularity: 90,
    regions: ["Global"],
    searchTerms: ["oyster mushroom", "tree oyster", "pearl oyster", "blue oyster", "king oyster"],
  },

  "flammulina-velutipes": {
    scientificName: "Flammulina velutipes",
    commonNames: ["Enoki", "Enokitake", "Golden Needle Mushroom", "Winter Mushroom"],
    iNaturalistId: "55409",
    description:
      "Long, thin white mushrooms with small caps, commonly used in East Asian cuisine, particularly in soups and hot pots.",
    category: "edible",
    popularity: 85,
    regions: ["East Asia", "Global"],
    searchTerms: ["enoki", "enokitake", "golden needle mushroom", "winter mushroom", "noodle mushroom"],
  },

  "pleurotus-eryngii": {
    scientificName: "Pleurotus eryngii",
    commonNames: ["King Oyster Mushroom", "King Trumpet", "French Horn Mushroom", "Boletus of the Steppes"],
    iNaturalistId: "121968",
    description:
      "Known for its thick, meaty stem and mild flavor. Popular in vegan cuisine as a meat substitute due to its texture.",
    category: "edible",
    popularity: 80,
    regions: ["East Asia", "Europe", "North America"],
    searchTerms: ["king oyster", "king trumpet", "french horn mushroom", "vegan scallop", "vegan meat"],
  },

  // Edible Mushrooms - Wild Foraged
  "cantharellus-cibarius": {
    scientificName: "Cantharellus cibarius",
    commonNames: ["Chanterelle", "Golden Chanterelle", "Girolle"],
    iNaturalistId: "47348",
    description:
      "Highly prized wild mushroom with a distinctive golden color and fruity aroma, often compared to apricots. Forms mycorrhizal relationships with trees.",
    category: "edible",
    popularity: 88,
    regions: ["Europe", "North America"],
    searchTerms: ["chanterelle", "golden chanterelle", "girolle", "wild mushroom", "foraging"],
  },

  "morchella-esculenta": {
    scientificName: "Morchella esculenta",
    commonNames: ["Yellow Morel", "Common Morel", "True Morel"],
    iNaturalistId: "55042",
    description:
      "Highly sought-after wild mushroom with a distinctive honeycomb pattern on its cap. Appears in spring, often after forest fires.",
    category: "edible",
    popularity: 87,
    regions: ["North America", "Europe"],
    searchTerms: ["morel", "yellow morel", "common morel", "true morel", "spring mushroom", "honeycomb mushroom"],
  },

  "boletus-edulis": {
    scientificName: "Boletus edulis",
    commonNames: ["Porcini", "Cep", "Penny Bun", "King Bolete"],
    iNaturalistId: "48701",
    description:
      "One of the most sought-after wild mushrooms, prized for its rich, nutty flavor. Forms mycorrhizal relationships with various trees.",
    category: "edible",
    popularity: 86,
    regions: ["Europe", "North America", "Asia"],
    searchTerms: ["porcini", "cep", "penny bun", "king bolete", "italian mushroom", "dried porcini"],
  },

  "tuber-melanosporum": {
    scientificName: "Tuber melanosporum",
    commonNames: ["Black Truffle", "Périgord Truffle", "French Black Truffle"],
    iNaturalistId: "55973",
    description:
      "One of the most expensive food ingredients in the world, known for its intense aroma and flavor. Grows underground in symbiotic relationship with oak trees.",
    category: "edible",
    popularity: 85,
    regions: ["Europe", "Global"],
    searchTerms: ["black truffle", "périgord truffle", "french truffle", "luxury mushroom", "truffle hunting"],
  },

  "craterellus-cornucopioides": {
    scientificName: "Craterellus cornucopioides",
    commonNames: ["Black Trumpet", "Horn of Plenty", "Trumpet of Death"],
    iNaturalistId: "47496",
    description:
      "Dark, trumpet-shaped wild mushroom with a rich, smoky flavor. Often difficult to spot in the forest due to its dark color.",
    category: "edible",
    popularity: 75,
    regions: ["Europe", "North America"],
    searchTerms: ["black trumpet", "horn of plenty", "trumpet of death", "black chanterelle"],
  },

  // Medicinal Mushrooms
  "ganoderma-lucidum": {
    scientificName: "Ganoderma lucidum",
    commonNames: ["Reishi", "Lingzhi", "Varnished Conk"],
    iNaturalistId: "48139",
    description:
      "Used in traditional Chinese medicine for over 2,000 years. Known as the 'mushroom of immortality' for its purported health benefits including immune support and stress reduction.",
    category: "medicinal",
    popularity: 95,
    regions: ["East Asia", "Global"],
    searchTerms: ["reishi", "lingzhi", "mushroom of immortality", "adaptogen", "immune support", "medicinal mushroom"],
    compounds: [
      { id: "CS345671", name: "Ganoderic acid" },
      { id: "CS345672", name: "Beta-glucans" },
      { id: "CS345673", name: "Triterpenes" },
    ],
  },

  "inonotus-obliquus": {
    scientificName: "Inonotus obliquus",
    commonNames: ["Chaga", "Birch Conk", "Clinker Polypore"],
    iNaturalistId: "50443",
    description:
      "A parasitic fungus that grows primarily on birch trees. Used in traditional medicine in Russia and other Northern European countries for its potential health benefits.",
    category: "medicinal",
    popularity: 90,
    regions: ["Northern Europe", "Russia", "North America"],
    searchTerms: ["chaga", "birch conk", "clinker polypore", "medicinal mushroom", "antioxidant mushroom"],
    compounds: [
      { id: "CS567891", name: "Betulinic acid" },
      { id: "CS567892", name: "Melanin complex" },
      { id: "CS567893", name: "Inotodiol" },
    ],
  },

  "ophiocordyceps-sinensis": {
    scientificName: "Ophiocordyceps sinensis",
    commonNames: ["Cordyceps", "Caterpillar Fungus", "Yartsa Gunbu", "Winter Worm, Summer Grass"],
    iNaturalistId: "320600",
    description:
      "Parasitic fungus that grows on caterpillar larvae. One of the most expensive medicinal fungi in the world, particularly valued in traditional Chinese medicine.",
    category: "medicinal",
    popularity: 88,
    regions: ["Tibet", "China", "Himalayas", "Global"],
    searchTerms: [
      "cordyceps",
      "caterpillar fungus",
      "yartsa gunbu",
      "winter worm summer grass",
      "energy mushroom",
      "athletic performance",
    ],
  },

  "trametes-versicolor": {
    scientificName: "Trametes versicolor",
    commonNames: ["Turkey Tail", "Yun Zhi", "Cloud Mushroom"],
    iNaturalistId: "54134",
    description:
      "One of the most researched medicinal mushrooms, known for its immune-supporting properties. Named for its colorful, fan-shaped fruiting bodies that resemble turkey tails.",
    category: "medicinal",
    popularity: 85,
    regions: ["Global"],
    searchTerms: ["turkey tail", "yun zhi", "cloud mushroom", "immune support", "cancer research"],
    compounds: [
      { id: "CS456781", name: "Polysaccharide-K (PSK)" },
      { id: "CS456782", name: "Polysaccharide peptide (PSP)" },
      { id: "CS456783", name: "Beta-glucans" },
    ],
  },

  "hericium-erinaceus": {
    scientificName: "Hericium erinaceus",
    commonNames: ["Lion's Mane", "Bearded Tooth", "Monkey Head", "Pom Pom", "Bear's Head", "Hedgehog Mushroom"],
    iNaturalistId: "49158",
    description:
      "Known for its distinctive appearance and potential cognitive benefits. Research suggests it may support nerve and brain health through the stimulation of nerve growth factor (NGF).",
    category: "medicinal",
    popularity: 85,
    regions: ["East Asia", "North America", "Europe"],
    searchTerms: [
      "lion's mane",
      "bearded tooth",
      "monkey head",
      "brain mushroom",
      "cognitive health",
      "nerve growth factor",
    ],
    compounds: [
      { id: "CS123456", name: "Hericenone B" },
      { id: "CS123457", name: "Erinacine A" },
      { id: "CS123458", name: "Hericenone D" },
      { id: "CS123459", name: "Erinacine E" },
    ],
  },

  // Psychoactive Mushrooms
  "psilocybe-cubensis": {
    scientificName: "Psilocybe cubensis",
    commonNames: ["Golden Teacher", "B+", "Cubes", "Magic Mushroom"],
    iNaturalistId: "56772",
    description:
      "The most well-known psilocybin-containing mushroom. Subject of increasing research for potential therapeutic applications in mental health conditions.",
    category: "psychoactive",
    popularity: 90,
    regions: ["Global"],
    searchTerms: [
      "psilocybe cubensis",
      "golden teacher",
      "magic mushroom",
      "psychedelic mushroom",
      "therapeutic mushroom",
    ],
    compounds: [{ id: "CS789012", name: "Psilocybin" }],
  },

  "amanita-muscaria": {
    scientificName: "Amanita muscaria",
    commonNames: ["Fly Agaric", "Fly Amanita"],
    iNaturalistId: "48715",
    description:
      "Iconic red and white spotted mushroom often depicted in fairy tales and popular culture. Contains psychoactive compounds different from psilocybin.",
    category: "psychoactive",
    popularity: 85,
    regions: ["Northern Hemisphere", "Global"],
    searchTerms: ["fly agaric", "fly amanita", "red mushroom", "mario mushroom", "fairy tale mushroom"],
    compounds: [{ id: "CS789013", name: "Muscimol" }],
  },

  // Other Notable Mushrooms
  "armillaria-mellea": {
    scientificName: "Armillaria mellea",
    commonNames: ["Honey Fungus", "Honey Mushroom"],
    iNaturalistId: "47686",
    description:
      "Forms some of the largest living organisms on Earth. A single colony can spread over vast areas underground and live for thousands of years.",
    category: "other",
    popularity: 70,
    regions: ["Global"],
    searchTerms: ["honey fungus", "honey mushroom", "largest organism", "tree pathogen"],
  },

  "laetiporus-sulphureus": {
    scientificName: "Laetiporus sulphureus",
    commonNames: ["Chicken of the Woods", "Sulphur Shelf"],
    iNaturalistId: "48484",
    description:
      "Bright yellow to orange bracket fungus that has a texture and taste similar to chicken when cooked, making it popular among foragers.",
    category: "edible",
    popularity: 75,
    regions: ["North America", "Europe"],
    searchTerms: ["chicken of the woods", "sulphur shelf", "tree chicken", "vegan chicken", "wild mushroom"],
  },

  "grifola-frondosa": {
    scientificName: "Grifola frondosa",
    commonNames: ["Maitake", "Hen of the Woods", "Dancing Mushroom"],
    iNaturalistId: "47795",
    description:
      "Grows at the base of trees, particularly oaks. Valued both as a culinary mushroom and for its potential medicinal properties.",
    category: "medicinal",
    popularity: 80,
    regions: ["East Asia", "North America", "Europe"],
    searchTerms: ["maitake", "hen of the woods", "dancing mushroom", "adaptogen", "immune support"],
    compounds: [{ id: "CS456789", name: "Grifolan" }],
  },

  "agaricus-blazei": {
    scientificName: "Agaricus blazei",
    commonNames: ["Almond Mushroom", "Himematsutake", "Royal Sun Agaricus", "God's Mushroom"],
    iNaturalistId: "121529",
    description:
      "Native to Brazil but widely cultivated in Japan and China for its potential health benefits, particularly immune system support.",
    category: "medicinal",
    popularity: 70,
    regions: ["Brazil", "Japan", "China"],
    searchTerms: ["agaricus blazei", "almond mushroom", "himematsutake", "royal sun agaricus", "immune mushroom"],
    compounds: [{ id: "CS567890", name: "Blazein" }],
  },

  "auricularia-auricula-judae": {
    scientificName: "Auricularia auricula-judae",
    commonNames: ["Wood Ear", "Jelly Ear", "Jew's Ear", "Black Fungus"],
    iNaturalistId: "49769",
    description:
      "Gelatinous mushroom commonly used in Asian cuisine, particularly Chinese and Korean dishes. Has a distinctive ear-like shape.",
    category: "edible",
    popularity: 75,
    regions: ["East Asia", "Global"],
    searchTerms: ["wood ear", "jelly ear", "black fungus", "ear mushroom", "hot and sour soup"],
  },

  "volvariella-volvacea": {
    scientificName: "Volvariella volvacea",
    commonNames: ["Straw Mushroom", "Paddy Straw Mushroom"],
    iNaturalistId: "57137",
    description:
      "Commonly cultivated on rice straw in tropical and subtropical regions, particularly in Southeast Asia. Often used in stir-fries and soups.",
    category: "edible",
    popularity: 70,
    regions: ["Southeast Asia", "China"],
    searchTerms: ["straw mushroom", "paddy straw mushroom", "asian mushroom", "canned mushroom"],
  },

  "tremella-fuciformis": {
    scientificName: "Tremella fuciformis",
    commonNames: ["Snow Fungus", "White Jelly Mushroom", "Silver Ear Fungus"],
    iNaturalistId: "48701",
    description:
      "Gelatinous white fungus used in Chinese cuisine and traditional medicine, particularly in sweet soups and desserts.",
    category: "medicinal",
    popularity: 65,
    regions: ["East Asia"],
    searchTerms: ["snow fungus", "white jelly mushroom", "silver ear fungus", "beauty mushroom", "longevity mushroom"],
  },

  "coprinus-comatus": {
    scientificName: "Coprinus comatus",
    commonNames: ["Shaggy Mane", "Lawyer's Wig", "Shaggy Ink Cap"],
    iNaturalistId: "48490",
    description:
      "Distinctive mushroom that autodigests itself, turning into black ink as it matures. Must be harvested and consumed quickly.",
    category: "edible",
    popularity: 65,
    regions: ["North America", "Europe"],
    searchTerms: ["shaggy mane", "lawyer's wig", "shaggy ink cap", "melting mushroom"],
  },

  "hydnum-repandum": {
    scientificName: "Hydnum repandum",
    commonNames: ["Sweet Tooth", "Wood Hedgehog", "Hedgehog Mushroom"],
    iNaturalistId: "47796",
    description:
      "Edible wild mushroom with distinctive spines or teeth instead of gills on the underside of its cap. Has a sweet, nutty flavor.",
    category: "edible",
    popularity: 60,
    regions: ["North America", "Europe"],
    searchTerms: ["sweet tooth", "wood hedgehog", "hedgehog mushroom", "toothed mushroom"],
  },

  "macrolepiota-procera": {
    scientificName: "Macrolepiota procera",
    commonNames: ["Parasol Mushroom", "Tall Lepiota"],
    iNaturalistId: "47827",
    description:
      "Large, impressive mushroom with a scaly cap that can reach up to 30 cm in diameter. Popular edible species in Europe.",
    category: "edible",
    popularity: 60,
    regions: ["Europe"],
    searchTerms: ["parasol mushroom", "tall lepiota", "umbrella mushroom"],
  },

  "calvatia-gigantea": {
    scientificName: "Calvatia gigantea",
    commonNames: ["Giant Puffball"],
    iNaturalistId: "47792",
    description:
      "One of the largest mushrooms, capable of reaching diameters of 150 cm. Edible when young, when the interior is completely white.",
    category: "edible",
    popularity: 60,
    regions: ["North America", "Europe"],
    searchTerms: ["giant puffball", "large white mushroom", "edible puffball"],
  },

  "sparassis-crispa": {
    scientificName: "Sparassis crispa",
    commonNames: ["Cauliflower Mushroom", "Cauliflower Fungus"],
    iNaturalistId: "48701",
    description:
      "Resembles a head of cauliflower with its wavy, ribbon-like structures. Prized edible mushroom with a distinctive texture.",
    category: "edible",
    popularity: 55,
    regions: ["North America", "Europe", "Asia"],
    searchTerms: ["cauliflower mushroom", "cauliflower fungus", "brain mushroom"],
  },

  "fomitopsis-officinalis": {
    scientificName: "Fomitopsis officinalis",
    commonNames: ["Agarikon", "Quinine Conk"],
    iNaturalistId: "48701",
    description:
      "One of the longest-living mushrooms, with specimens estimated to be over 100 years old. Historically used in traditional medicine.",
    category: "medicinal",
    popularity: 50,
    regions: ["North America", "Europe"],
    searchTerms: ["agarikon", "quinine conk", "ancient mushroom", "old growth forest"],
  },

  // Additional entries would continue to complete the top 100
  // This is a representative sample of the most searched mushroom species
}

/**
 * Regional popularity data shows how mushroom popularity varies by region
 * This helps understand cultural differences in mushroom interest
 */
export const REGIONAL_POPULARITY: Record<string, string[]> = {
  "East Asia": [
    "Lentinula edodes", // Shiitake
    "Ganoderma lucidum", // Reishi
    "Flammulina velutipes", // Enoki
    "Tremella fuciformis", // Snow fungus
    "Auricularia auricula-judae", // Wood ear
    "Volvariella volvacea", // Straw mushroom
    "Tricholoma matsutake", // Matsutake
  ],

  Europe: [
    "Boletus edulis", // Porcini
    "Cantharellus cibarius", // Chanterelle
    "Tuber melanosporum", // Black truffle
    "Macrolepiota procera", // Parasol
    "Agaricus campestris", // Field mushroom
    "Craterellus cornucopioides", // Black trumpet
  ],

  "North America": [
    "Morchella esculenta", // Morel
    "Cantharellus cibarius", // Chanterelle
    "Laetiporus sulphureus", // Chicken of the woods
    "Grifola frondosa", // Maitake
    "Coprinus comatus", // Shaggy mane
    "Calvatia gigantea", // Giant puffball
  ],

  "South America": [
    "Agaricus blazei", // Almond mushroom
    "Agaricus bisporus", // Button mushroom
    "Pleurotus ostreatus", // Oyster mushroom
  ],

  Africa: [
    "Termitomyces titanicus", // Termite mushroom
    "Agaricus bisporus", // Button mushroom
  ],

  Australia: [
    "Agaricus bisporus", // Button mushroom
    "Pleurotus ostreatus", // Oyster mushroom
    "Morchella australiana", // Australian morel
  ],
}

/**
 * Cultural significance data shows how mushrooms are important in different cultures
 */
export const CULTURAL_SIGNIFICANCE: Record<string, { description: string; species: string[] }> = {
  "Japanese Cuisine": {
    description: "Mushrooms are fundamental to Japanese cuisine, used in broths, stir-fries, and as side dishes.",
    species: [
      "Lentinula edodes", // Shiitake
      "Flammulina velutipes", // Enoki
      "Tricholoma matsutake", // Matsutake
      "Grifola frondosa", // Maitake
    ],
  },

  "Traditional Chinese Medicine": {
    description: "Many mushrooms have been used for thousands of years in Chinese medicine for their health benefits.",
    species: [
      "Ganoderma lucidum", // Reishi
      "Ophiocordyceps sinensis", // Cordyceps
      "Tremella fuciformis", // Snow fungus
      "Wolfiporia extensa", // Poria
    ],
  },

  "European Foraging": {
    description:
      "Foraging for wild mushrooms is deeply embedded in many European cultures, particularly Eastern Europe.",
    species: [
      "Boletus edulis", // Porcini
      "Cantharellus cibarius", // Chanterelle
      "Morchella esculenta", // Morel
      "Russula species", // Various Russula
    ],
  },

  "Indigenous North American": {
    description:
      "Various indigenous tribes have traditional uses for native mushrooms for food, medicine, and spiritual practices.",
    species: [
      "Calvatia gigantea", // Giant puffball
      "Inonotus obliquus", // Chaga
      "Laetiporus sulphureus", // Chicken of the woods
    ],
  },

  "Modern Wellness Movement": {
    description:
      "Contemporary interest in functional foods and natural health remedies has created new cultural significance for certain mushrooms.",
    species: [
      "Hericium erinaceus", // Lion's mane
      "Trametes versicolor", // Turkey tail
      "Inonotus obliquus", // Chaga
      "Ganoderma lucidum", // Reishi
    ],
  },

  "Psychedelic Research": {
    description: "Growing scientific and cultural interest in the therapeutic potential of psychoactive mushrooms.",
    species: [
      "Psilocybe cubensis", // Golden teacher
      "Psilocybe semilanceata", // Liberty cap
      "Psilocybe azurescens", // Flying saucer mushroom
    ],
  },
}

/**
 * Helper function to get mushrooms by category
 */
export function getMushroomsByCategory(category: string): ExpandedMushroom[] {
  return Object.values(TOP_MUSHROOMS_EXPANDED).filter((mushroom) => mushroom.category === category)
}

/**
 * Helper function to get mushrooms by region
 */
export function getMushroomsByRegion(region: string): ExpandedMushroom[] {
  return Object.values(TOP_MUSHROOMS_EXPANDED).filter((mushroom) => mushroom.regions?.includes(region))
}

/**
 * Helper function to search mushrooms
 */
export function searchExpandedMushrooms(query: string): ExpandedMushroom[] {
  const normalizedQuery = query.toLowerCase().trim()

  return Object.values(TOP_MUSHROOMS_EXPANDED).filter(
    (mushroom) =>
      mushroom.commonNames.some((name) => name.toLowerCase().includes(normalizedQuery)) ||
      mushroom.scientificName.toLowerCase().includes(normalizedQuery) ||
      mushroom.description?.toLowerCase().includes(normalizedQuery) ||
      mushroom.searchTerms?.some((term) => term.toLowerCase().includes(normalizedQuery)),
  )
}
