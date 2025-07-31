export interface ElsevierArticle {
  id: string
  doi: string
  title: string
  authors: Array<{
    name: string
    affiliation?: string
  }>
  publicationDate: string
  journal: {
    name: string
    volume?: string
    issue?: string
  }
  abstract?: string
  keywords?: string[]
  url: string
}

// Mock data for development
const MOCK_ARTICLES: ElsevierArticle[] = [
  {
    id: "1-s2.0-S0944711323001838",
    doi: "10.1016/j.phymed.2023.154819",
    title: "Neurotrophic properties of the Lion's mane medicinal mushroom, Hericium erinaceus (Higher Basidiomycetes)",
    authors: [
      { name: "Lai, Puei-Lene", affiliation: "University of Malaya" },
      { name: "Naidu, Murali", affiliation: "University of Malaya" },
      { name: "Sabaratnam, Vikineswary", affiliation: "University of Malaya" },
    ],
    publicationDate: "2024-01-15",
    journal: {
      name: "Phytomedicine",
      volume: "45",
      issue: "1",
    },
    abstract:
      "Hericium erinaceus, also known as Lion's Mane mushroom, has demonstrated significant neurotrophic properties in both in vitro and in vivo studies. This review examines the current evidence for its potential applications in cognitive enhancement and neuroprotection.",
    keywords: ["Lion's Mane", "Hericium erinaceus", "Neurotrophic factors", "Cognitive function", "Neuroprotection"],
    url: "https://www.sciencedirect.com/science/article/abs/pii/S0944711323001838",
  },
  {
    id: "1-s2.0-S0031942222001583",
    doi: "10.1016/j.phytochem.2022.113233",
    title: "Chemical constituents and biological activities of Lion's Mane (Hericium erinaceus)",
    authors: [
      { name: "Chen, Jiahui", affiliation: "Chinese Academy of Sciences" },
      { name: "Li, Wei", affiliation: "Chinese Academy of Sciences" },
    ],
    publicationDate: "2024-02-01",
    journal: {
      name: "Phytochemistry",
      volume: "206",
    },
    abstract:
      "This comprehensive analysis identifies and characterizes the key bioactive compounds present in Hericium erinaceus, including hericenones and erinacines, and their potential therapeutic applications.",
    keywords: ["Medicinal mushrooms", "Natural products", "Bioactive compounds", "Hericenones", "Erinacines"],
    url: "https://www.sciencedirect.com/science/article/abs/pii/S0031942222001583",
  },
  {
    id: "1-s2.0-S0308814623001838",
    doi: "10.1016/j.foodchem.2023.135819",
    title: "Neuroprotective effects of Hericium erinaceus mycelium and its isolated compounds",
    authors: [
      { name: "Wang, Xiaofei", affiliation: "Nanjing Agricultural University" },
      { name: "Zhang, Yu", affiliation: "Nanjing Agricultural University" },
    ],
    publicationDate: "2023-12-15",
    journal: {
      name: "Food Chemistry",
      volume: "415",
    },
    abstract:
      "Recent studies have shown that Lion's Mane mushroom and its compounds exhibit significant neuroprotective properties. This research investigates the mechanisms behind these effects and their potential therapeutic applications.",
    keywords: ["Lion's Mane", "Neuroprotection", "Mycelium", "Bioactive compounds"],
    url: "https://www.sciencedirect.com/science/article/abs/pii/S0308814623001838",
  },
]

export async function searchElsevierArticles(query: string): Promise<ElsevierArticle[]> {
  if (!query) {
    return []
  }

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Search mock data
  const normalizedQuery = query.toLowerCase()
  return MOCK_ARTICLES.filter(
    (article) =>
      article.title.toLowerCase().includes(normalizedQuery) ||
      article.abstract?.toLowerCase().includes(normalizedQuery) ||
      article.keywords?.some((keyword) => keyword.toLowerCase().includes(normalizedQuery)) ||
      article.authors.some((author) => author.name.toLowerCase().includes(normalizedQuery)),
  )
}

export async function getElsevierArticle(doi: string): Promise<ElsevierArticle> {
  if (!doi) {
    throw new Error("DOI is required")
  }

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Search mock data
  const article = MOCK_ARTICLES.find((article) => article.doi === doi)

  if (!article) {
    throw new Error("Article not found")
  }

  return article
}
