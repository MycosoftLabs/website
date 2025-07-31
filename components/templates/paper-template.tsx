import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExternalLink, FileText, Users, Calendar, Book } from "lucide-react"

interface Author {
  name: string
  affiliation?: string
  orcid?: string
}

interface Paper {
  id: string
  title: string
  authors: string[]
  abstract: string
  journal: string
  year: number
  doi: string
  url: string
  keywords?: string[]
  citations?: number
  fullText?: string
  relatedSpecies?: Array<{
    id: string
    name: string
    url: string
  }>
  relatedCompounds?: Array<{
    id: string
    name: string
    url: string
  }>
}

interface PaperTemplateProps {
  paper: Paper
}

export function PaperTemplate({ paper }: PaperTemplateProps) {
  return (
    <div className="container py-6 md:py-8">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="space-y-2">
                <CardTitle className="text-2xl">{paper.title}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{paper.journal}</Badge>
                  <Badge variant="outline">{paper.year}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="abstract">
                <TabsList>
                  <TabsTrigger value="abstract">Abstract</TabsTrigger>
                  <TabsTrigger value="fulltext">Full Text</TabsTrigger>
                  <TabsTrigger value="references">References</TabsTrigger>
                </TabsList>

                <TabsContent value="abstract" className="mt-4">
                  <div className="prose dark:prose-invert max-w-none">
                    <p>{paper.abstract}</p>
                    {paper.keywords && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold mb-2">Keywords</h4>
                        <div className="flex flex-wrap gap-2">
                          {paper.keywords.map((keyword) => (
                            <Badge key={keyword} variant="secondary">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="fulltext" className="mt-4">
                  <div className="aspect-[8.5/11] w-full">
                    <iframe
                      src={paper.url}
                      className="w-full h-full border-0 rounded-lg"
                      title={`Full text of ${paper.title}`}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="references" className="mt-4">
                  <p className="text-muted-foreground">View references and citations on the publisher's website.</p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Paper Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="space-y-1">
                  <h4 className="text-sm font-medium">Authors</h4>
                  <p className="text-sm text-muted-foreground">{paper.authors.join(", ")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Book className="h-4 w-4 text-muted-foreground" />
                <div className="space-y-1">
                  <h4 className="text-sm font-medium">Journal</h4>
                  <p className="text-sm text-muted-foreground">{paper.journal}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div className="space-y-1">
                  <h4 className="text-sm font-medium">Year</h4>
                  <p className="text-sm text-muted-foreground">{paper.year}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div className="space-y-1">
                  <h4 className="text-sm font-medium">DOI</h4>
                  <p className="text-sm text-muted-foreground">{paper.doi}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {(paper.relatedSpecies || paper.relatedCompounds) && (
            <Card>
              <CardHeader>
                <CardTitle>Related Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {paper.relatedSpecies && paper.relatedSpecies.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Species</h4>
                    <ul className="space-y-2">
                      {paper.relatedSpecies.map((species) => (
                        <li key={species.id}>
                          <Button variant="link" className="h-auto p-0" asChild>
                            <a href={species.url}>{species.name}</a>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {paper.relatedCompounds && paper.relatedCompounds.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Compounds</h4>
                    <ul className="space-y-2">
                      {paper.relatedCompounds.map((compound) => (
                        <li key={compound.id}>
                          <Button variant="link" className="h-auto p-0" asChild>
                            <a href={compound.url}>{compound.name}</a>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6">
              <Button className="w-full" asChild>
                <a href={paper.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View on Publisher Site
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
