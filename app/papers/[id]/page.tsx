import { notFound } from "next/navigation"
import { getElsevierArticle } from "@/lib/services/elsevier"
import { PaperTemplate } from "@/components/templates/paper-template"

interface PaperPageProps {
  params: {
    id: string
  }
}

export default async function PaperPage({ params }: PaperPageProps) {
  try {
    const decodedDoi = decodeURIComponent(params.id)
    const paper = await getElsevierArticle(decodedDoi)

    return (
      <PaperTemplate
        paper={{
          id: paper.doi,
          title: paper.title,
          authors: paper.authors.map((author) => author.name),
          abstract: paper.abstract || "No abstract available.",
          journal: paper.journal.name,
          year: new Date(paper.publicationDate).getFullYear(),
          doi: paper.doi,
          url: paper.url,
          keywords: paper.keywords,
        }}
      />
    )
  } catch (error) {
    console.error("Error fetching paper:", error)
    notFound()
  }
}
