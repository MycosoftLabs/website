import Link from "next/link"
import { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AncestryKingdomTiles } from "@/components/ancestry/ancestry-kingdom-tiles"

export const metadata: Metadata = {
  title: "Ancestry | Mycosoft",
  description: "All-life ancestry — taxonomy, media, and research links from MINDEX.",
}

export default function AncestryPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="py-12 md:py-20 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">All-Life Ancestry</h1>
        <p className="text-xl text-foreground/70 max-w-3xl mx-auto mb-8">
          Explore taxonomy across kingdoms with data from the Mycosoft Index: observations, media, genomes, and
          literature, unified under one ancestry surface.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/natureos/ancestry/explorer">
            <Button className="bg-green-600 hover:bg-green-700">Start Exploring</Button>
          </Link>
          <Link href="/natureos/ancestry/database">
            <Button
              variant="outline"
              className="border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
            >
              Access Database
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12">
        <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
          Tools for Taxonomic Research
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Species Explorer</CardTitle>
              <CardDescription>Browse MINDEX taxa with kingdom-aware filters</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-foreground/70">
                Search and filter species across all kingdoms where MINDEX has coverage; fungi retain legacy traits like
                edibility when data exists.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/natureos/ancestry/explorer" className="text-green-600 hover:underline">
                Open Explorer →
              </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Phylogenetic Trees</CardTitle>
              <CardDescription>Visualize evolutionary relationships</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-foreground/70">
                Lineage views are built from materialized taxonomy in MINDEX; pick a taxon to walk from kingdom to
                species.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/natureos/ancestry/phylogeny" className="text-green-600 hover:underline">
                View Trees →
              </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Genetic Database</CardTitle>
              <CardDescription>Access genetic information and research data</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-foreground/70">
                Sequences and annotations when ingested for your taxon — not limited to fungi.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/natureos/ancestry/database" className="text-green-600 hover:underline">
                Search Database →
              </Link>
            </CardFooter>
          </Card>
        </div>

        {/* Additional Tools Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Analysis Tools</CardTitle>
              <CardDescription>Professional-grade bioinformatics tools</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-foreground/70">
                Access our suite of analysis tools including DNA sequencing, sequence alignment, genome annotation, 
                and interaction prediction for your research.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/natureos/ancestry/tools" className="text-green-600 hover:underline">
                Explore Tools →
              </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Species Index</CardTitle>
              <CardDescription>Cross-kingdom species graph</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-foreground/70">
                Browse the Mycosoft Index: unified taxa, media, and observations as pipelines sync GBIF, iNat, and more.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/mindex" className="text-green-600 hover:underline">
                Visit MIndex →
              </Link>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Live kingdom coverage (MINDEX) */}
      <section className="py-12 bg-muted rounded-lg my-12">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 text-foreground">
            Taxon coverage by kingdom
          </h2>
          <p className="text-center text-foreground/70 text-sm sm:text-base mb-8 max-w-2xl mx-auto">
            Counts from MINDEX <code className="text-xs sm:text-sm">bio.kingdom_stats</code>. Empty until the all-life
            migration and sync jobs have populated data.
          </p>
          <AncestryKingdomTiles />
        </div>
      </section>

      {/* Research — no placeholder papers; use species detail publications when MINDEX has links */}
      <section className="py-12">
        <h2 className="text-3xl font-bold text-center mb-4 text-foreground">Research &amp; literature</h2>
        <p className="text-center text-foreground/70 max-w-2xl mx-auto mb-8 text-sm sm:text-base">
          Publication links are shown on individual species when <code>bio.publication_taxon</code> has data. This
          section is intentionally free of sample papers — only real MINDEX-backed references appear in the app.
        </p>
        <div className="max-w-lg mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Open a species</CardTitle>
              <CardDescription>Taxonomy, genetics, and linked papers</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-foreground/70 text-sm sm:text-base">
                Use the explorer to find a taxon, then open its profile for the Research tab.
              </p>
            </CardContent>
            <CardFooter>
              <Link
                href="/natureos/ancestry/explorer"
                className="min-h-[44px] inline-flex items-center text-emerald-600 hover:underline"
              >
                Go to Explorer →
              </Link>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 text-center">
        <h2 className="text-3xl font-bold mb-6 text-foreground">Ready to explore the tree of life?</h2>
        <p className="text-xl text-foreground/70 max-w-3xl mx-auto mb-8">
          Search MINDEX-backed taxa, then drill into media, genomes, and interactions as data is ingested.
        </p>
        <Link href="/natureos/ancestry/explorer">
          <Button className="bg-green-600 hover:bg-green-700">Get Started Now</Button>
        </Link>
      </section>
    </div>
  )
}
