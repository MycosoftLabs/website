import { NextResponse } from "next/server"

// Extended fallback species data with more entries and details
const FALLBACK_SPECIES = [
  {
    id: 1,
    scientific_name: "Amanita phalloides",
    common_name: "Death Cap",
    family: "Amanitaceae",
    description: "The death cap is a deadly poisonous basidiomycete fungus, one of the most poisonous of all known toadstools. It has been involved in the majority of human deaths from mushroom poisoning.",
    image_url: "https://upload.wikimedia.org/wikipedia/commons/9/99/Amanita_phalloides_1.JPG",
    characteristics: ["Poisonous", "White spores", "Volva present"],
    habitat: "Deciduous and coniferous forests",
    edibility: "deadly",
    season: "Summer-Fall",
    distribution: "Europe, North America",
    featured: true,
  },
  {
    id: 2,
    scientific_name: "Agaricus bisporus",
    common_name: "Button Mushroom",
    family: "Agaricaceae",
    description: "An edible basidiomycete mushroom native to grasslands in Europe and North America. It is the most commonly consumed mushroom in the world.",
    image_url: "https://upload.wikimedia.org/wikipedia/commons/d/d9/Champignons_Agaricus.jpg",
    characteristics: ["Edible", "Brown spores", "Cultivated"],
    habitat: "Grasslands, cultivated",
    edibility: "edible",
    season: "Year-round",
    distribution: "Worldwide (cultivated)",
    featured: true,
  },
  {
    id: 3,
    scientific_name: "Pleurotus ostreatus",
    common_name: "Oyster Mushroom",
    family: "Pleurotaceae",
    description: "A common edible mushroom known for its distinctive oyster-shaped cap. It is prized for its mild flavor and is one of the most widely cultivated mushrooms.",
    image_url: "https://upload.wikimedia.org/wikipedia/commons/b/b2/Pleurotus_ostreatus_%28Oyster%29_mushroom.jpg",
    characteristics: ["Edible", "White spores", "Shelf fungus"],
    habitat: "Dead hardwood trees",
    edibility: "edible",
    season: "Fall-Spring",
    distribution: "Worldwide",
    featured: false,
  },
  {
    id: 4,
    scientific_name: "Cantharellus cibarius",
    common_name: "Golden Chanterelle",
    family: "Cantharellaceae",
    description: "A prized edible mushroom with a distinctive golden color and fruity aroma. It is one of the most popular wild-harvested mushrooms in the world.",
    image_url: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Chanterelle_Cantharellus_cibarius.jpg",
    characteristics: ["Edible", "Yellow", "Mycorrhizal", "Gourmet"],
    habitat: "Coniferous and deciduous forests",
    edibility: "choice",
    season: "Summer-Fall",
    distribution: "Northern Hemisphere",
    featured: true,
  },
  {
    id: 5,
    scientific_name: "Boletus edulis",
    common_name: "Porcini",
    family: "Boletaceae",
    description: "A highly prized edible mushroom known for its rich, nutty flavor. It is widely used in Italian cuisine and is one of the most sought-after wild mushrooms.",
    image_url: "https://upload.wikimedia.org/wikipedia/commons/5/5d/Boletus_edulis_EtsyEnza.jpg",
    characteristics: ["Edible", "Pores", "Mycorrhizal", "Gourmet"],
    habitat: "Coniferous and deciduous forests",
    edibility: "choice",
    season: "Summer-Fall",
    distribution: "Northern Hemisphere",
    featured: true,
  },
  {
    id: 6,
    scientific_name: "Morchella esculenta",
    common_name: "Yellow Morel",
    family: "Morchellaceae",
    description: "A distinctive edible mushroom with a honeycomb-like cap. It is one of the most readily recognized of all edible mushrooms and highly sought after.",
    image_url: "https://upload.wikimedia.org/wikipedia/commons/c/c8/Morchella_esculenta_2008_Ukraine.jpg",
    characteristics: ["Edible", "Ascomycete", "Spring fruiting", "Gourmet"],
    habitat: "Forests, disturbed areas, burn sites",
    edibility: "choice",
    season: "Spring",
    distribution: "Northern Hemisphere",
    featured: false,
  },
  {
    id: 7,
    scientific_name: "Ganoderma lucidum",
    common_name: "Reishi",
    family: "Ganodermataceae",
    description: "A polypore fungus used extensively in traditional Asian medicine. Known as the 'mushroom of immortality', it has been used medicinally for over 2,000 years.",
    image_url: "https://upload.wikimedia.org/wikipedia/commons/3/32/Ganoderma_lucidum_01.jpg",
    characteristics: ["Medicinal", "Bracket fungus", "Woody", "Adaptogenic"],
    habitat: "Dead or dying trees",
    edibility: "medicinal",
    season: "Year-round",
    distribution: "Worldwide",
    featured: true,
  },
  {
    id: 8,
    scientific_name: "Lentinula edodes",
    common_name: "Shiitake",
    family: "Omphalotaceae",
    description: "An edible mushroom native to East Asia, widely cultivated worldwide. It is the second most commonly cultivated edible mushroom and has significant medicinal properties.",
    image_url: "https://upload.wikimedia.org/wikipedia/commons/f/f9/Shiitakegrowing.jpg",
    characteristics: ["Edible", "Cultivated", "Medicinal", "Umami"],
    habitat: "Dead hardwood trees",
    edibility: "edible",
    season: "Year-round",
    distribution: "East Asia (native), Worldwide (cultivated)",
    featured: false,
  },
  {
    id: 9,
    scientific_name: "Psilocybe cubensis",
    common_name: "Golden Teacher",
    family: "Hymenogastraceae",
    description: "A species of psilocybin mushroom whose principal active compounds are psilocybin and psilocin. It is one of the most widely known psilocybin mushrooms.",
    image_url: "https://upload.wikimedia.org/wikipedia/commons/e/ea/Psilocybe_cubensis.jpg",
    characteristics: ["Psychoactive", "Blue bruising", "Subtropical"],
    habitat: "Cattle pastures, tropical regions",
    edibility: "psychoactive",
    season: "Year-round (tropical)",
    distribution: "Tropical and subtropical regions worldwide",
    featured: false,
  },
  {
    id: 10,
    scientific_name: "Cordyceps militaris",
    common_name: "Caterpillar Fungus",
    family: "Cordycipitaceae",
    description: "An entomopathogenic fungus known for its medicinal properties. It has been used in traditional Chinese medicine for centuries and is known for energy-boosting effects.",
    image_url: "https://upload.wikimedia.org/wikipedia/commons/3/31/2015-12-10_Cordyceps_militaris_%28L.%29_Fr_576181.jpg",
    characteristics: ["Medicinal", "Parasitic", "Orange", "Adaptogenic"],
    habitat: "Parasitizes insect larvae",
    edibility: "medicinal",
    season: "Summer-Fall",
    distribution: "Northern Hemisphere",
    featured: false,
  },
  {
    id: 11,
    scientific_name: "Trametes versicolor",
    common_name: "Turkey Tail",
    family: "Polyporaceae",
    description: "A common polypore mushroom known for its colorful concentric rings. It is one of the most well-researched medicinal mushrooms with proven immune-boosting properties.",
    image_url: "https://upload.wikimedia.org/wikipedia/commons/f/fb/Trametes_versicolor_G4.jpg",
    characteristics: ["Medicinal", "Bracket fungus", "Multicolored", "Immune-boosting"],
    habitat: "Dead hardwood trees",
    edibility: "medicinal",
    season: "Year-round",
    distribution: "Worldwide",
    featured: true,
  },
  {
    id: 12,
    scientific_name: "Hericium erinaceus",
    common_name: "Lion's Mane",
    family: "Hericiaceae",
    description: "An edible and medicinal mushroom known for its unique appearance and cognitive benefits. Research suggests it may support nerve growth and brain health.",
    image_url: "https://upload.wikimedia.org/wikipedia/commons/0/01/Igelstachelbart_Nov_06.jpg",
    characteristics: ["Edible", "Medicinal", "Tooth fungus", "Nootropic"],
    habitat: "Dead or dying hardwood trees",
    edibility: "choice",
    season: "Fall",
    distribution: "Northern Hemisphere",
    featured: true,
  },
  {
    id: 13,
    scientific_name: "Amanita muscaria",
    common_name: "Fly Agaric",
    family: "Amanitaceae",
    description: "One of the most recognizable mushrooms in popular culture with its bright red cap and white spots. It is poisonous and has been used for its psychoactive properties.",
    image_url: "https://upload.wikimedia.org/wikipedia/commons/3/32/Amanita_muscaria_3_vliegenzwammen_op_rij.jpg",
    characteristics: ["Poisonous", "Psychoactive", "Iconic", "Red cap"],
    habitat: "Birch and pine forests",
    edibility: "poisonous",
    season: "Summer-Fall",
    distribution: "Northern Hemisphere",
    featured: false,
  },
  {
    id: 14,
    scientific_name: "Tuber melanosporum",
    common_name: "Black Truffle",
    family: "Tuberaceae",
    description: "One of the most expensive and sought-after edible fungi in the world. Known as 'black diamond', it is prized for its intense aroma and flavor in haute cuisine.",
    image_url: "https://upload.wikimedia.org/wikipedia/commons/3/3d/Truffe_noire_du_P%C3%A9rigord.jpg",
    characteristics: ["Edible", "Mycorrhizal", "Underground", "Gourmet", "Rare"],
    habitat: "Underground near oak and hazelnut trees",
    edibility: "choice",
    season: "Winter",
    distribution: "Mediterranean Europe",
    featured: true,
  },
  {
    id: 15,
    scientific_name: "Inonotus obliquus",
    common_name: "Chaga",
    family: "Hymenochaetaceae",
    description: "A parasitic fungus that grows on birch trees. It has been used in folk medicine for centuries and is known for its high antioxidant content.",
    image_url: "https://upload.wikimedia.org/wikipedia/commons/8/8b/Inonotus_obliquus.jpg",
    characteristics: ["Medicinal", "Parasitic", "Black exterior", "Antioxidant"],
    habitat: "Birch trees in cold climates",
    edibility: "medicinal",
    season: "Year-round",
    distribution: "Northern latitudes",
    featured: false,
  },
  {
    id: 16,
    scientific_name: "Laetiporus sulphureus",
    common_name: "Chicken of the Woods",
    family: "Fomitopsidaceae",
    description: "A bright orange bracket fungus that is edible when young. It gets its name from its taste and texture which is said to resemble chicken.",
    image_url: "https://upload.wikimedia.org/wikipedia/commons/b/b5/Laetiporus_sulphureus_JPG01.jpg",
    characteristics: ["Edible", "Bracket fungus", "Orange", "Meat substitute"],
    habitat: "Dead or dying hardwood trees",
    edibility: "edible",
    season: "Spring-Fall",
    distribution: "North America, Europe",
    featured: false,
  },
  {
    id: 17,
    scientific_name: "Coprinus comatus",
    common_name: "Shaggy Mane",
    family: "Agaricaceae",
    description: "A distinctive edible mushroom with a cylindrical cap that dissolves into black ink as it matures. Must be consumed within hours of picking.",
    image_url: "https://upload.wikimedia.org/wikipedia/commons/7/77/Coprinus_comatus_2012_G1.jpg",
    characteristics: ["Edible", "Deliquescent", "Urban", "Short shelf life"],
    habitat: "Lawns, roadsides, disturbed areas",
    edibility: "edible",
    season: "Fall",
    distribution: "Worldwide",
    featured: false,
  },
  {
    id: 18,
    scientific_name: "Armillaria mellea",
    common_name: "Honey Mushroom",
    family: "Physalacriaceae",
    description: "One of the largest living organisms on Earth, with some individuals spanning thousands of acres. Edible when cooked but can be parasitic to trees.",
    image_url: "https://upload.wikimedia.org/wikipedia/commons/8/87/Armillaria_mellea_1.jpg",
    characteristics: ["Edible", "Parasitic", "Bioluminescent", "Rhizomorphs"],
    habitat: "Living and dead trees",
    edibility: "edible",
    season: "Fall",
    distribution: "Northern Hemisphere",
    featured: false,
  },
  {
    id: 19,
    scientific_name: "Lactarius deliciosus",
    common_name: "Saffron Milk Cap",
    family: "Russulaceae",
    description: "A prized edible mushroom known for its orange latex that bleeds when cut. Popular in Mediterranean cuisine and highly valued in Catalonia.",
    image_url: "https://upload.wikimedia.org/wikipedia/commons/9/93/Lactarius_deliciosus_1.jpg",
    characteristics: ["Edible", "Orange latex", "Mycorrhizal", "Gourmet"],
    habitat: "Pine forests",
    edibility: "choice",
    season: "Fall",
    distribution: "Europe, North America",
    featured: false,
  },
  {
    id: 20,
    scientific_name: "Gyromitra esculenta",
    common_name: "False Morel",
    family: "Discinaceae",
    description: "A toxic mushroom that resembles true morels. Contains the toxin gyromitrin which can be fatal. Some cultures eat it after special preparation.",
    image_url: "https://upload.wikimedia.org/wikipedia/commons/e/ec/Gyromitra_esculenta_1.JPG",
    characteristics: ["Poisonous", "Brain-like", "Spring fruiting"],
    habitat: "Sandy soils in coniferous forests",
    edibility: "poisonous",
    season: "Spring",
    distribution: "Northern Hemisphere",
    featured: false,
  },
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("query")?.toLowerCase()
  const filter = searchParams.get("filter")
  const category = searchParams.get("category")

  try {
    // Try to import and use the ancestry service
    const { getAllSpecies, searchSpecies, filterSpeciesByCharacteristic } = await import(
      "@/lib/services/ancestry-service"
    )

    let species

    if (query) {
      species = await searchSpecies(query)
    } else if (filter && filter !== "All") {
      species = await filterSpeciesByCharacteristic(filter)
    } else {
      species = await getAllSpecies()
    }

    // If we got results from the database, return them
    if (species && species.length > 0) {
      return NextResponse.json({ species, source: "database" })
    }

    // Fall back to static data
    throw new Error("No species found in database")
  } catch (error) {
    // Database not configured or error - use fallback data
    console.log("Using fallback species data:", error instanceof Error ? error.message : "Unknown error")

    let filteredSpecies = [...FALLBACK_SPECIES]

    if (query) {
      filteredSpecies = filteredSpecies.filter(
        (s) =>
          s.scientific_name.toLowerCase().includes(query) ||
          s.common_name?.toLowerCase().includes(query) ||
          s.family.toLowerCase().includes(query) ||
          s.description?.toLowerCase().includes(query) ||
          s.habitat?.toLowerCase().includes(query)
      )
    }

    if (filter && filter !== "All") {
      filteredSpecies = filteredSpecies.filter((s) =>
        s.characteristics.some((c) => c.toLowerCase() === filter.toLowerCase())
      )
    }

    if (category && category !== "all") {
      filteredSpecies = filteredSpecies.filter((s) => {
        const edibility = s.edibility?.toLowerCase() || ""
        const chars = s.characteristics.map((c) => c.toLowerCase())
        
        switch (category) {
          case "edible":
            return edibility === "edible" || edibility === "choice" || chars.includes("edible")
          case "medicinal":
            return edibility === "medicinal" || chars.includes("medicinal")
          case "poisonous":
            return edibility === "poisonous" || edibility === "deadly" || chars.includes("poisonous")
          case "psychoactive":
            return edibility === "psychoactive" || chars.includes("psychoactive")
          case "gourmet":
            return chars.includes("gourmet") || edibility === "choice"
          default:
            return true
        }
      })
    }

    return NextResponse.json({ species: filteredSpecies, source: "fallback" })
  }
}
