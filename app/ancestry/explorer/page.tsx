"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Search,
  Grid,
  List,
  LayoutGrid,
  Loader2,
  ChevronRight,
  ChevronDown,
  Microscope,
  Leaf,
  TreeDeciduous,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  FlaskConical,
  MapPin,
  Dna,
  Star,
  Sparkles,
  Filter,
  SortAsc,
  SortDesc,
  Heart,
  Skull,
  Pill,
  Zap,
  Globe,
  Clock,
  TrendingUp,
  BookOpen,
  Camera,
  Share2,
  Bookmark,
  Info,
  X,
} from "lucide-react"

// Extended species data with more entries
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
]

// Categories for quick filtering
const CATEGORIES = [
  { id: "all", label: "All Species", icon: Globe, count: 0 },
  { id: "edible", label: "Edible", icon: Leaf, count: 0 },
  { id: "medicinal", label: "Medicinal", icon: Pill, count: 0 },
  { id: "poisonous", label: "Poisonous", icon: Skull, count: 0 },
  { id: "psychoactive", label: "Psychoactive", icon: Zap, count: 0 },
  { id: "gourmet", label: "Gourmet", icon: Star, count: 0 },
]

const ALL_FAMILIES = [
  "All Families",
  "Amanitaceae",
  "Agaricaceae",
  "Pleurotaceae",
  "Cantharellaceae",
  "Boletaceae",
  "Morchellaceae",
  "Ganodermataceae",
  "Omphalotaceae",
  "Hymenogastraceae",
  "Cordycipitaceae",
  "Polyporaceae",
  "Hericiaceae",
  "Tuberaceae",
  "Hymenochaetaceae",
  "Fomitopsidaceae",
]

const SORT_OPTIONS = [
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "family", label: "Family" },
  { value: "featured", label: "Featured First" },
]

interface Species {
  id: number
  scientific_name: string
  common_name: string | null
  family: string
  description: string | null
  image_url: string | null
  characteristics: string[]
  habitat: string | null
  edibility?: string
  season?: string
  distribution?: string
  featured?: boolean
}

export default function ExplorerPage() {
  const [species, setSpecies] = useState<Species[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFamily, setSelectedFamily] = useState("All Families")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [viewMode, setViewMode] = useState<"grid" | "list" | "compact">("grid")
  const [sortBy, setSortBy] = useState("featured")
  const [usingFallback, setUsingFallback] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [favorites, setFavorites] = useState<number[]>([])

  // Fetch species data
  useEffect(() => {
    async function fetchSpecies() {
      setLoading(true)
      try {
        // Fetch from MINDEX taxa API first
        const mindexResponse = await fetch("/api/natureos/mindex/taxa?limit=1000")
        if (mindexResponse.ok) {
          const mindexData = await mindexResponse.json()
          if (mindexData.taxa && mindexData.taxa.length > 0) {
            // Transform MINDEX taxa to species format
            const transformedSpecies = mindexData.taxa.map((taxon: any) => ({
              id: taxon.id,
              scientific_name: taxon.canonical_name,
              common_name: taxon.common_name,
              family: taxon.family || "Unknown",
              description: taxon.description || `${taxon.canonical_name} is a ${taxon.rank} in the ${taxon.family || "fungal"} family.`,
              image_url: taxon.image_url || null,
              characteristics: [taxon.rank, ...(taxon.edibility ? [taxon.edibility] : [])],
              habitat: taxon.habitat || null,
              edibility: taxon.edibility || "unknown",
              season: null,
              distribution: null,
              featured: false,
            }))
            setSpecies(transformedSpecies)
            setUsingFallback(false)
            setLoading(false)
            return
          }
        }
        
        // Fallback to local API
        const response = await fetch("/api/ancestry")
        if (response.ok) {
          const data = await response.json()
          if (data.species && data.species.length > 0) {
            setSpecies(data.species)
            setUsingFallback(data.source === "fallback")
          } else {
            setSpecies(FALLBACK_SPECIES)
            setUsingFallback(true)
          }
        } else {
          throw new Error("Failed to fetch species")
        }
      } catch {
        setSpecies(FALLBACK_SPECIES)
        setUsingFallback(true)
      } finally {
        setLoading(false)
      }
    }
    fetchSpecies()
  }, [])

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("species-favorites")
    if (saved) setFavorites(JSON.parse(saved))
  }, [])

  // Calculate category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: species.length }
    species.forEach((s) => {
      const edibility = s.edibility?.toLowerCase() || ""
      const chars = s.characteristics.map((c) => c.toLowerCase())
      
      if (edibility === "edible" || edibility === "choice" || chars.includes("edible")) counts.edible = (counts.edible || 0) + 1
      if (edibility === "medicinal" || chars.includes("medicinal")) counts.medicinal = (counts.medicinal || 0) + 1
      if (edibility === "poisonous" || edibility === "deadly" || chars.includes("poisonous")) counts.poisonous = (counts.poisonous || 0) + 1
      if (edibility === "psychoactive" || chars.includes("psychoactive")) counts.psychoactive = (counts.psychoactive || 0) + 1
      if (chars.includes("gourmet") || edibility === "choice") counts.gourmet = (counts.gourmet || 0) + 1
    })
    return counts
  }, [species])

  // Filter and sort species
  const filteredSpecies = useMemo(() => {
    let result = species.filter((s) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        s.scientific_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.common_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        s.family.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)

      // Family filter
      const matchesFamily = selectedFamily === "All Families" || s.family === selectedFamily

      // Category filter
      let matchesCategory = selectedCategory === "all"
      if (!matchesCategory) {
        const edibility = s.edibility?.toLowerCase() || ""
        const chars = s.characteristics.map((c) => c.toLowerCase())
        
        switch (selectedCategory) {
          case "edible":
            matchesCategory = edibility === "edible" || edibility === "choice" || chars.includes("edible")
            break
          case "medicinal":
            matchesCategory = edibility === "medicinal" || chars.includes("medicinal")
            break
          case "poisonous":
            matchesCategory = edibility === "poisonous" || edibility === "deadly" || chars.includes("poisonous")
            break
          case "psychoactive":
            matchesCategory = edibility === "psychoactive" || chars.includes("psychoactive")
            break
          case "gourmet":
            matchesCategory = chars.includes("gourmet") || edibility === "choice"
            break
        }
      }

      return matchesSearch && matchesFamily && matchesCategory
    })

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.scientific_name.localeCompare(b.scientific_name)
        case "name-desc":
          return b.scientific_name.localeCompare(a.scientific_name)
        case "family":
          return a.family.localeCompare(b.family)
        case "featured":
          if (a.featured && !b.featured) return -1
          if (!a.featured && b.featured) return 1
          return a.scientific_name.localeCompare(b.scientific_name)
        default:
          return 0
      }
    })

    return result
  }, [species, searchQuery, selectedFamily, selectedCategory, sortBy])

  const featuredSpecies = useMemo(() => species.filter((s) => s.featured), [species])

  const toggleFavorite = (id: number) => {
    const newFavorites = favorites.includes(id)
      ? favorites.filter((f) => f !== id)
      : [...favorites, id]
    setFavorites(newFavorites)
    localStorage.setItem("species-favorites", JSON.stringify(newFavorites))
  }

  const resetFilters = () => {
    setSearchQuery("")
    setSelectedFamily("All Families")
    setSelectedCategory("all")
    setSortBy("featured")
  }

  const getEdibilityColor = (s: Species) => {
    const edibility = s.edibility?.toLowerCase() || ""
    const chars = s.characteristics.map((c) => c.toLowerCase())
    
    if (edibility === "deadly" || chars.includes("poisonous")) return "bg-red-500"
    if (edibility === "poisonous") return "bg-orange-500"
    if (edibility === "psychoactive" || chars.includes("psychoactive")) return "bg-purple-500"
    if (edibility === "medicinal" || chars.includes("medicinal")) return "bg-blue-500"
    if (edibility === "choice" || chars.includes("gourmet")) return "bg-yellow-500"
    if (edibility === "edible" || chars.includes("edible")) return "bg-green-500"
    return "bg-gray-500"
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center gap-2 text-sm text-green-200 mb-4">
            <Link href="/ancestry" className="hover:text-white transition-colors">
              Ancestry
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white">Explorer</span>
          </div>
          
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Species Explorer
              </h1>
              <p className="text-lg text-green-100 max-w-2xl">
                Discover the fascinating world of fungi. Browse {species.length}+ species with detailed information, 
                images, and scientific data.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" asChild>
                <Link href="/ancestry/phylogeny">
                  <TreeDeciduous className="h-4 w-4 mr-2" />
                  Phylogeny
                </Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/ancestry/tools">
                  <FlaskConical className="h-4 w-4 mr-2" />
                  Tools
                </Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/ancestry/database">
                  <Dna className="h-4 w-4 mr-2" />
                  Database
                </Link>
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="text-3xl font-bold">{species.length}</div>
              <div className="text-sm text-green-200">Total Species</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="text-3xl font-bold">{categoryCounts.edible || 0}</div>
              <div className="text-sm text-green-200">Edible Species</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="text-3xl font-bold">{categoryCounts.medicinal || 0}</div>
              <div className="text-sm text-green-200">Medicinal Species</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="text-3xl font-bold">{new Set(species.map(s => s.family)).size}</div>
              <div className="text-sm text-green-200">Families</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Status Banner */}
        {usingFallback && (
          <div className="mb-6 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-yellow-600 dark:text-yellow-400">Sample Data Mode</p>
                <p className="text-sm text-muted-foreground">
                  Showing curated sample species. Connect database for full catalog.
                </p>
              </div>
              <Button variant="outline" size="sm" className="shrink-0">
                <Info className="h-4 w-4 mr-2" />
                Learn More
              </Button>
            </div>
          </div>
        )}

        {/* Featured Species Carousel */}
        {featuredSpecies.length > 0 && selectedCategory === "all" && !searchQuery && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-yellow-500" />
                Featured Species
              </h2>
              <Button variant="ghost" size="sm">
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-4 pb-4">
                {featuredSpecies.map((s) => (
                  <Link key={s.id} href={`/ancestry/species/${s.id}`} className="shrink-0 group">
                    <Card className="w-72 overflow-hidden hover:shadow-xl transition-all duration-300 border-2 hover:border-green-500">
                      <div className="relative h-40 overflow-hidden">
                        <img
                          src={s.image_url || "/placeholder.svg?height=160&width=288"}
                          alt={s.common_name || s.scientific_name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg?height=160&width=288"
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <Badge className="absolute top-2 right-2 bg-yellow-500">
                          <Star className="h-3 w-3 mr-1" /> Featured
                        </Badge>
                        <div className={`absolute bottom-2 left-2 w-3 h-3 rounded-full ${getEdibilityColor(s)}`} />
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold truncate group-hover:text-green-600">
                          {s.scientific_name}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {s.common_name || s.family}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}

        {/* Category Tabs */}
        <div className="mb-6">
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon
                const count = categoryCounts[cat.id] || 0
                const isActive = selectedCategory === cat.id
                return (
                  <Button
                    key={cat.id}
                    variant={isActive ? "default" : "outline"}
                    className={`shrink-0 ${isActive ? "bg-green-600 hover:bg-green-700" : ""}`}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {cat.label}
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {count}
                    </Badge>
                  </Button>
                )
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, family, habitat, or characteristics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <Select value={selectedFamily} onValueChange={setSelectedFamily}>
                  <SelectTrigger className="w-[180px]">
                    <Leaf className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Family" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_FAMILIES.map((family) => (
                      <SelectItem key={family} value={family}>
                        {family}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[160px]">
                    <SortAsc className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="outline" size="icon" onClick={resetFilters} title="Reset filters">
                  <RefreshCw className="h-4 w-4" />
                </Button>

                <Separator orientation="vertical" className="h-10" />

                <div className="flex border rounded-md">
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("grid")}
                    title="Grid view"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "compact" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("compact")}
                    title="Compact grid"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("list")}
                    title="List view"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Results count and active filters */}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                Showing <strong>{filteredSpecies.length}</strong> of {species.length} species
              </span>
              
              {(searchQuery || selectedFamily !== "All Families" || selectedCategory !== "all") && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  {searchQuery && (
                    <Badge variant="secondary" className="gap-1">
                      Search: {searchQuery}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery("")} />
                    </Badge>
                  )}
                  {selectedFamily !== "All Families" && (
                    <Badge variant="secondary" className="gap-1">
                      {selectedFamily}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedFamily("All Families")} />
                    </Badge>
                  )}
                  {selectedCategory !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      {CATEGORIES.find(c => c.id === selectedCategory)?.label}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedCategory("all")} />
                    </Badge>
                  )}
                  <Button variant="link" size="sm" onClick={resetFilters} className="text-muted-foreground h-auto p-0">
                    Clear all
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-green-600 mb-4" />
            <p className="text-muted-foreground">Loading species database...</p>
          </div>
        )}

        {/* No Results */}
        {!loading && filteredSpecies.length === 0 && (
          <Card className="py-16">
            <div className="text-center">
              <Microscope className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
              <h3 className="text-2xl font-semibold mb-2">No species found</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                We couldn't find any species matching your criteria. Try adjusting your search or filters.
              </p>
              <Button onClick={resetFilters}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset Filters
              </Button>
            </div>
          </Card>
        )}

        {/* Grid View */}
        {!loading && filteredSpecies.length > 0 && viewMode === "grid" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredSpecies.map((s) => (
              <Card key={s.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-2 hover:border-green-500">
                <Link href={`/ancestry/species/${s.id}`}>
                  <div className="relative h-52 overflow-hidden">
                    <img
                      src={s.image_url || "/placeholder.svg?height=208&width=300"}
                      alt={s.common_name || s.scientific_name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg?height=208&width=300"
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {/* Edibility indicator */}
                    <div className={`absolute top-3 left-3 w-4 h-4 rounded-full ${getEdibilityColor(s)} ring-2 ring-white shadow-lg`} />
                    
                    {/* Featured badge */}
                    {s.featured && (
                      <Badge className="absolute top-3 right-3 bg-yellow-500 shadow-lg">
                        <Star className="h-3 w-3" />
                      </Badge>
                    )}
                    
                    {/* Favorite button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute bottom-3 right-3 h-8 w-8 bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.preventDefault()
                        toggleFavorite(s.id)
                      }}
                    >
                      <Heart className={`h-4 w-4 ${favorites.includes(s.id) ? "fill-red-500 text-red-500" : ""}`} />
                    </Button>
              </div>
                </Link>
                
                <CardContent className="p-4">
                  <Link href={`/ancestry/species/${s.id}`}>
                    <h3 className="font-semibold text-lg group-hover:text-green-600 transition-colors line-clamp-1">
                      {s.scientific_name}
                    </h3>
                  </Link>
                  {s.common_name && (
                    <p className="text-sm text-muted-foreground line-clamp-1">{s.common_name}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    <Leaf className="h-3 w-3 inline mr-1" />
                    {s.family}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {s.characteristics.slice(0, 3).map((char, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className={`text-xs ${
                          char.toLowerCase() === "edible" || char.toLowerCase() === "gourmet"
                            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            : char.toLowerCase() === "poisonous"
                            ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                            : char.toLowerCase() === "medicinal"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                            : char.toLowerCase() === "psychoactive"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                            : ""
                        }`}
                      >
                      {char}
                      </Badge>
                    ))}
                    {s.characteristics.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{s.characteristics.length - 3}
                      </Badge>
                    )}
                  </div>
                </CardContent>
                
                <CardFooter className="p-4 pt-0 flex justify-between items-center">
                  <Link href={`/ancestry/species/${s.id}`} className="text-sm text-green-600 hover:underline font-medium">
                    View Details →
                  </Link>
                  {s.habitat && (
                    <span className="text-xs text-muted-foreground flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {s.habitat.split(",")[0]}
                    </span>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Compact Grid View */}
        {!loading && filteredSpecies.length > 0 && viewMode === "compact" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredSpecies.map((s) => (
              <Link key={s.id} href={`/ancestry/species/${s.id}`} className="group">
                <Card className="overflow-hidden hover:shadow-lg transition-all hover:border-green-500">
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={s.image_url || "/placeholder.svg?height=150&width=150"}
                      alt={s.common_name || s.scientific_name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg?height=150&width=150"
                      }}
                    />
                    <div className={`absolute top-2 left-2 w-3 h-3 rounded-full ${getEdibilityColor(s)} ring-2 ring-white`} />
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium text-sm truncate group-hover:text-green-600">
                      {s.common_name || s.scientific_name.split(" ")[0]}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate italic">
                      {s.scientific_name}
                    </p>
                  </CardContent>
                </Card>
              </Link>
                  ))}
                </div>
        )}

        {/* List View */}
        {!loading && filteredSpecies.length > 0 && viewMode === "list" && (
          <div className="space-y-3">
            {filteredSpecies.map((s) => (
              <Card key={s.id} className="hover:shadow-md transition-all hover:border-green-500/50 group">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Link href={`/ancestry/species/${s.id}`} className="shrink-0">
                      <div className="relative h-24 w-24 rounded-lg overflow-hidden">
                        <img
                          src={s.image_url || "/placeholder.svg?height=96&width=96"}
                          alt={s.common_name || s.scientific_name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg?height=96&width=96"
                          }}
                        />
                        <div className={`absolute top-1 left-1 w-3 h-3 rounded-full ${getEdibilityColor(s)} ring-2 ring-white`} />
                      </div>
                    </Link>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link href={`/ancestry/species/${s.id}`}>
                            <h3 className="font-semibold text-lg group-hover:text-green-600 transition-colors">
                              {s.scientific_name}
                            </h3>
                          </Link>
                          {s.common_name && (
                            <p className="text-sm text-muted-foreground">{s.common_name}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {s.featured && (
                            <Badge className="bg-yellow-500 shrink-0">
                              <Star className="h-3 w-3" />
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => toggleFavorite(s.id)}
                          >
                            <Heart className={`h-4 w-4 ${favorites.includes(s.id) ? "fill-red-500 text-red-500" : ""}`} />
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {s.description}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center">
                          <Leaf className="h-3 w-3 mr-1" />
                          {s.family}
                        </span>
                        {s.habitat && (
                          <span className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {s.habitat}
                          </span>
                        )}
                        {s.season && (
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {s.season}
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-2 flex flex-wrap gap-1">
                        {s.characteristics.map((char, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {char}
                          </Badge>
                        ))}
              </div>
            </div>
                    
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Links Footer */}
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <TreeDeciduous className="h-5 w-5" />
                Phylogenetic Trees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Explore evolutionary relationships through interactive 3D visualizations of fungal phylogeny.
              </p>
              <Button variant="outline" asChild className="w-full border-green-300 dark:border-green-700">
                <Link href="/ancestry/phylogeny">Explore Trees</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Dna className="h-5 w-5" />
                Genetic Database
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Access genetic sequences, genome annotations, and molecular data for research.
              </p>
              <Button variant="outline" asChild className="w-full border-blue-300 dark:border-blue-700">
                <Link href="/ancestry/database">View Database</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                <FlaskConical className="h-5 w-5" />
                Research Tools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Professional bioinformatics tools for sequence alignment, annotation, and analysis.
              </p>
              <Button variant="outline" asChild className="w-full border-purple-300 dark:border-purple-700">
                <Link href="/ancestry/tools">Open Tools</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
