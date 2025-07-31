import type { Metadata } from "next"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { ExternalLink } from "lucide-react"

export const metadata: Metadata = {
  title: "Science & Research - Mycosoft",
  description: "Explore Mycosoft's scientific research and publications in mycology",
}

const NewsCluster = () => (
  <div className="space-y-4">
    <h2 className="text-xl font-semibold">Latest News</h2>
    <div className="space-y-4">
      <article className="space-y-1">
        <h3 className="font-medium">Mycosoft Achieves Breakthrough in Mycelial Computing</h3>
        <p className="text-sm text-muted-foreground">Mycosoft, 2025</p>
      </article>
      <article className="space-y-1">
        <h3 className="font-medium">New Study Reveals Potential of Fungi in Bioremediation</h3>
        <p className="text-sm text-muted-foreground">Environmental Science Journal, 2025</p>
      </article>
      <article className="space-y-1">
        <h3 className="font-medium">Mycosoft Partners with Leading Universities for Research</h3>
        <p className="text-sm text-muted-foreground">Mycosoft Press Release, 2025</p>
      </article>
    </div>
  </div>
)

const ScienceTopics = () => (
  <div className="space-y-4">
    <h2 className="text-xl font-semibold">Science Topics</h2>
    <ul className="space-y-2">
      <li className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-primary" />
        <span>Fungal Intelligence Networks</span>
      </li>
      <li className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-primary" />
        <span>Mycoremediation Technologies</span>
      </li>
      <li className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-primary" />
        <span>Medicinal Compounds</span>
      </li>
      <li className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-primary" />
        <span>Sustainable Materials</span>
      </li>
    </ul>
  </div>
)

const FCISection = () => (
  <div className="space-y-6">
    <h2 className="text-3xl font-bold">Fungal Computer Interface (FCI)</h2>
    <div className="relative aspect-video rounded-lg overflow-hidden">
      <Image
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/rs=w_1160,h_663-ESVi80C1sa4fkioBNtFcVtPlY1TkSq.webp"
        alt="Digital illustration of a mushroom merging with circuit board patterns"
        fill
        className="object-cover"
      />
    </div>
    <p className="text-lg text-muted-foreground">
      The Fungal Computer Interface (FCI) represents a revolutionary approach to computing by harnessing the natural
      intelligence and connectivity of mycelial networks. This technology aims to create a seamless interface between
      biological systems and computers, enabling new forms of data processing, environmental monitoring, and sustainable
      technology.
    </p>

    <div className="grid gap-6 md:grid-cols-2">
      {/* Hypha Programming Language */}
      <Card className="p-4">
        <div className="relative aspect-video rounded-lg overflow-hidden mb-4">
          <Image
            src="/placeholder.svg?height=300&width=400&text=Hypha+Language"
            alt="Hypha Programming Language"
            fill
            className="object-cover"
          />
        </div>
        <h3 className="text-xl font-semibold">Hypha Programming Language</h3>
        <p className="text-sm text-muted-foreground">
          Hypha is an open-source programming language designed specifically for interacting with and programming
          mycelial networks. It provides a high-level interface for controlling FCI devices, defining complex
          algorithms, and managing data flow within fungal systems.
        </p>
      </Card>

      {/* Mycorrhizae Protocol */}
      <Card className="p-4">
        <div className="relative aspect-video rounded-lg overflow-hidden mb-4">
          <Image
            src="/placeholder.svg?height=300&width=400&text=Mycorrhizae+Protocol"
            alt="Mycorrhizae Protocol"
            fill
            className="object-cover"
          />
        </div>
        <h3 className="text-xl font-semibold">Mycorrhizae Protocol</h3>
        <p className="text-sm text-muted-foreground">
          The Mycorrhizae Protocol is a communication standard used to connect all FCI devices, enabling seamless
          integration of intelligence algorithms, APIs, and databases. It facilitates the exchange of data and commands
          across the entire Mycosoft ecosystem, ensuring interoperability and efficient network management.
        </p>
      </Card>
    </div>
  </div>
)

export default function SciencePage() {
  return (
    <div className="container py-6 md:py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <h1 className="text-4xl font-bold mb-8">Science & Research</h1>
        <p className="text-xl text-muted-foreground mb-12">
          Advancing the field of mycology through cutting-edge research and innovation
        </p>

        <FCISection />

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mt-16">
          <NewsCluster />
          <ScienceTopics />

          {/* Strategic Partnerships */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Strategic Partnerships</h2>
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="relative w-24 h-24 flex-shrink-0">
                  <Image
                    src="https://sjc.microlink.io/hQ2pGM_Ffm495ihvZLjrPHCSnSDAXvHpOUIzWD7O1wslc97FIc8we8M81pU_kziq9a-TqjqAAQZ8bTHG-KLJEg.jpeg"
                    alt="7ensor Logo"
                    fill
                    className="object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    7ensor
                    <a href="https://7ensor.com" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Advanced sensing solutions for fungal monitoring and data collection
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="relative w-24 h-24 flex-shrink-0">
                  <Image
                    src="https://sjc.microlink.io/ftFaGqQjVhrFjfgpSqRq8wI9FeAaEP-mgVurB2y-KpyAqeeoQ2S05dfg_8wu4F_kPozduFmyWAWeJ1w2mWijAw.jpeg"
                    alt="MycoDAO Logo"
                    fill
                    className="object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    MycoDAO
                    <a href="https://mycodao.com" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Decentralized funding and governance for mycological research
                  </p>
                </div>
              </div>
            </Card>
            <p className="text-sm text-muted-foreground mt-4">More partnerships coming soon...</p>
          </div>
        </div>

        {/* Community & Collaborations */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Community & Collaborations</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Research Organizations */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Research Organizations</h3>
              <ul className="space-y-3">
                <li>
                  <h4 className="font-medium">FUNDIS</h4>
                  <p className="text-sm text-muted-foreground">Fungal Diversity Survey</p>
                </li>
                <li>
                  <h4 className="font-medium">NAMA</h4>
                  <p className="text-sm text-muted-foreground">North American Mycological Association</p>
                </li>
                <li>
                  <h4 className="font-medium">International Mycological Association</h4>
                  <p className="text-sm text-muted-foreground">Global mycology network</p>
                </li>
              </ul>
            </div>

            {/* Database Projects */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Database Projects</h3>
              <ul className="space-y-3">
                <li>
                  <h4 className="font-medium">MycoBank</h4>
                  <p className="text-sm text-muted-foreground">Fungal nomenclature database</p>
                </li>
                <li>
                  <h4 className="font-medium">FungiDB</h4>
                  <p className="text-sm text-muted-foreground">Fungal genomics database</p>
                </li>
                <li>
                  <h4 className="font-medium">iNaturalist</h4>
                  <p className="text-sm text-muted-foreground">Citizen science observations platform</p>
                </li>
              </ul>
            </div>

            {/* Academic Institutions */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Academic Institutions</h3>
              <ul className="space-y-3">
                <li>
                  <h4 className="font-medium">UC Berkeley</h4>
                  <p className="text-sm text-muted-foreground">Department of Plant & Microbial Biology</p>
                </li>
                <li>
                  <h4 className="font-medium">ETH Zürich</h4>
                  <p className="text-sm text-muted-foreground">Institute of Microbiology</p>
                </li>
                <li>
                  <h4 className="font-medium">Kew Gardens</h4>
                  <p className="text-sm text-muted-foreground">Fungal Biodiversity Research</p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
