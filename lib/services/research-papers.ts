// Service for fetching research papers from multiple sources
import { searchElsevierArticles, type ElsevierArticle } from "./elsevier"

export interface ResearchPaper {
  id: string
  title: string
  authors: string[]
  abstract: string
  year: number
  journal: string
  doi?: string
  url: string
  source: "elsevier" | "pubmed" | "google-scholar" | "researchgate"
  relatedSpecies: string[]
  keywords: string[]
}

// Search papers related to a specific species
export async function searchPapersBySpecies(scientificName: string, commonName?: string): Promise<ResearchPaper[]> {
  const papers: ResearchPaper[] = []

  try {
    // Search using both scientific and common names
    const searchTerms = [scientificName]
    if (commonName) searchTerms.push(commonName)

    // Search Elsevier
    for (const term of searchTerms) {
      const elsevierResults = await searchElsevierArticles(term)
      papers.push(...elsevierResults.map(formatElsevierPaper))
    }

    // TODO: Add PubMed, Google Scholar, etc.

    // Remove duplicates by DOI or title
    const uniquePapers = papers.filter(
      (paper, index, self) =>
        index === self.findIndex((p) => (p.doi && paper.doi && p.doi === paper.doi) || p.title === paper.title),
    )

    return uniquePapers
  } catch (error) {
    console.error("Error searching papers:", error)
    return []
  }
}

function formatElsevierPaper(article: ElsevierArticle): ResearchPaper {
  return {
    id: article.doi,
    title: article.title,
    authors: article.authors.map((a) => a.name),
    abstract: article.abstract || "",
    year: new Date(article.publicationDate).getFullYear(),
    journal: article.journal.name,
    doi: article.doi,
    url: article.url,
    source: "elsevier",
    relatedSpecies: [], // Will be populated by the caller
    keywords: article.keywords || [],
  }
}

// Get papers for multiple species at once
export async function batchSearchPapers(
  species: Array<{ scientificName: string; commonName?: string }>,
): Promise<Map<string, ResearchPaper[]>> {
  const results = new Map<string, ResearchPaper[]>()

  for (const sp of species) {
    const papers = await searchPapersBySpecies(sp.scientificName, sp.commonName)
    results.set(sp.scientificName, papers)
  }

  return results
}
