import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function AncestryPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="py-12 md:py-20 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">Explore Fungal Ancestry</h1>
        <p className="text-xl text-foreground/70 max-w-3xl mx-auto mb-8">
          Discover the evolutionary relationships and genetic history of fungal species through our comprehensive
          database and visualization tools.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/ancestry/explorer">
            <Button className="bg-green-600 hover:bg-green-700">Start Exploring</Button>
          </Link>
          <Link href="/ancestry/database">
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
          Powerful Tools for Mycological Research
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Species Explorer</CardTitle>
              <CardDescription>Browse our comprehensive database of fungal species</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-foreground/70">
                Access detailed information on thousands of fungal species, including taxonomic classification, habitat,
                distribution, and more.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/ancestry/explorer" className="text-green-600 hover:underline">
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
                Explore interactive phylogenetic trees showing the evolutionary relationships between different fungal
                species and families.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/ancestry/phylogeny" className="text-green-600 hover:underline">
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
                Search our extensive database of fungal genetic information, including genome sequences, gene
                annotations, and more.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/ancestry/database" className="text-green-600 hover:underline">
                Search Database →
              </Link>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-muted rounded-lg my-12">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">Our Growing Database</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "15,000+", label: "Species" },
              { value: "8,500+", label: "Genomes" },
              { value: "250,000+", label: "Genes" },
              { value: "1,200+", label: "Research Papers" },
            ].map((stat, i) => (
              <div key={i}>
                <p className="text-4xl font-bold text-green-600 mb-2">{stat.value}</p>
                <p className="text-foreground/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Research */}
      <section className="py-12">
        <h2 className="text-3xl font-bold text-center mb-12 text-foreground">Featured Research</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Evolutionary History of Agaricales",
              author: "Dr. Maria Chen",
              excerpt:
                "A comprehensive study of the evolutionary relationships within the Agaricales order, revealing new insights into fungal diversification patterns.",
            },
            {
              title: "Genomic Analysis of Medicinal Fungi",
              author: "Dr. James Wilson",
              excerpt:
                "Comparative genomic analysis of medicinal fungi species, identifying key genetic factors responsible for bioactive compound production.",
            },
            {
              title: "Climate Change Effects on Fungal Distribution",
              author: "Dr. Sarah Johnson",
              excerpt:
                "Long-term study examining how climate change is affecting the global distribution and genetic diversity of key fungal species.",
            },
          ].map((paper, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle>{paper.title}</CardTitle>
                <CardDescription>{paper.author}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/70">{paper.excerpt}</p>
              </CardContent>
              <CardFooter>
                <Link href="#" className="text-green-600 hover:underline">
                  Read Paper →
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 text-center">
        <h2 className="text-3xl font-bold mb-6 text-foreground">Ready to Explore Fungal Ancestry?</h2>
        <p className="text-xl text-foreground/70 max-w-3xl mx-auto mb-8">
          Join researchers worldwide in exploring the fascinating world of fungal genetics and evolution.
        </p>
        <Link href="/ancestry/explorer">
          <Button className="bg-green-600 hover:bg-green-700">Get Started Now</Button>
        </Link>
      </section>
    </div>
  )
}
