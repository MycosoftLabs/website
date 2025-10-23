import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PaperTemplate } from "@/components/templates/paper-template"
import { getWikipediaArticle } from "@/lib/services/wikipedia"

interface PaperPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function PaperPage({ params }: PaperPageProps) {
  try {
    const { id } = await params

    if (id.startsWith("wiki-")) {
      const speciesName = decodeURIComponent(id.replace("wiki-", ""))

      try {
        const wikiData = await getWikipediaArticle(speciesName)

        if (!wikiData) {
          notFound()
        }

        return (
          <PaperTemplate
            paper={{
              id: id,
              title: wikiData.title,
              authors: ["Wikipedia Contributors"],
              abstract: wikiData.extract || "No abstract available.",
              journal: "Wikipedia",
              year: new Date().getFullYear(),
              doi: `wiki/${encodeURIComponent(speciesName)}`,
              url: wikiData.url || `https://en.wikipedia.org/wiki/${encodeURIComponent(speciesName)}`,
              keywords: wikiData.categories || [],
              relatedSpecies: [
                {
                  id: speciesName.toLowerCase().replace(/\s+/g, "-"),
                  name: speciesName,
                  url: `/species/${speciesName.toLowerCase().replace(/\s+/g, "-")}`,
                },
              ],
            }}
          />
        )
      } catch (error) {
        console.error("Error fetching Wikipedia article:", error)
        notFound()
      }
    }

    const supabase = await createClient()

    const { data: paper, error } = await supabase
      .from("research_papers")
      .select(`
        *,
        species_papers (
          species (
            id,
            scientific_name,
            common_names,
            inaturalist_id
          )
        )
      `)
      .eq("id", id)
      .single()

    if (error || !paper) {
      console.error("Error fetching paper from database:", error)
      notFound()
    }

    const relatedSpecies =
      paper.species_papers?.map((sp: any) => ({
        id: sp.species.id,
        name: sp.species.common_names?.[0] || sp.species.scientific_name,
        url: `/species/${sp.species.inaturalist_id || sp.species.id}`,
      })) || []

    return (
      <PaperTemplate
        paper={{
          id: paper.id,
          title: paper.title,
          authors: paper.authors,
          abstract: paper.abstract || "No abstract available.",
          journal: paper.journal,
          year: paper.year,
          doi: paper.doi,
          url: paper.external_url || `https://doi.org/${paper.doi}`,
          keywords: paper.keywords || [],
          relatedSpecies,
        }}
      />
    )
  } catch (error) {
    console.error("Error fetching paper:", error)
    notFound()
  }
}
