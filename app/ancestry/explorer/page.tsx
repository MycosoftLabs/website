"use client"

import { useState, useEffect, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
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

// Categories for quick filtering
const CATEGORIES = [
  { id: "all", label: "All Species", icon: Globe, count: 0 },
  { id: "edible", label: "Edible", icon: Leaf, count: 0 },
  { id: "medicinal", label: "Medicinal", icon: Pill, count: 0 },
  { id: "poisonous", label: "Poisonous", icon: Skull, count: 0 },
  { id: "psychoactive", label: "Psychoactive", icon: Zap, count: 0 },
  { id: "gourmet", label: "Gourmet", icon: Star, count: 0 },
]

const SORT_OPTIONS = [
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "family", label: "Family" },
  { value: "featured", label: "Featured First" },
]

interface Species {
  id: number
  uuid?: string
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
  const searchParams = useSearchParams()
  const router = useRouter()
  const urlSearch = searchParams.get("search") || ""

  const [species, setSpecies] = useState<Species[]>([])
  const [loading, setLoading] = useState(true)
  // Pre-fill from URL param (?search=Amanita+muscaria)
  const [searchQuery, setSearchQuery] = useState(urlSearch)
  const [selectedFamily, setSelectedFamily] = useState("All Families")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [dataCompleteness, setDataCompleteness] = useState<"all" | "has_images" | "has_description">("all")
  const [viewMode, setViewMode] = useState<"grid" | "list" | "compact">("grid")
  const [sortBy, setSortBy] = useState("featured")
  const [showFilters, setShowFilters] = useState(false)
  const [favorites, setFavorites] = useState<number[]>([])
  const [totalInDatabase, setTotalInDatabase] = useState(0)
  const [dataSource, setDataSource] = useState<string>("loading")
  const [dataset, setDataset] = useState<"popular" | "all_species" | "all_taxa">("popular")
  const [page, setPage] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  function getDatasetParams(nextDataset: "popular" | "all_species" | "all_taxa") {
    if (nextDataset === "popular") return { sort: "popular", rank: "species" }
    if (nextDataset === "all_taxa") return { sort: "alphabetical", rank: "all" }
    return { sort: "alphabetical", rank: "species" }
  }

  // Fetch first page (reset) when dataset changes
  useEffect(() => {
    async function fetchSpecies() {
      setLoading(true)
      try {
        const params = getDatasetParams(dataset)
        const response = await fetch(`/api/ancestry?limit=500&sort=${params.sort}&rank=${params.rank}&page=1`)
        if (response.ok) {
          const data = await response.json()
          if (data.species && data.species.length > 0) {
            const speciesData = data.species.map((s: any, index: number) => ({
              ...s,
              id: s.id || index + 1,
              family: s.family || "Unknown",
              description: s.description || null,
              characteristics: s.characteristics || [],
              habitat: s.habitat || null,
              edibility: s.edibility || null,
              season: s.season || null,
              distribution: s.distribution || null,
              featured: (s.observations_count || 0) > 5000,
            }))
            setSpecies(speciesData)
            setPage(1)
            setTotalInDatabase(data.total || speciesData.length)
            setDataSource(data.source || "mindex")
          } else {
            setSpecies([])
            setTotalInDatabase(data.total || 0)
            setDataSource(data.source || "none")
          }
        } else {
          setSpecies([])
          setTotalInDatabase(0)
          setDataSource("none")
        }
      } catch (error) {
        console.error("Failed to fetch species:", error)
        setSpecies([])
        setTotalInDatabase(0)
        setDataSource("none")
      } finally {
        setLoading(false)
      }
    }
    fetchSpecies()
  }, [dataset])

  async function loadMore() {
    if (isLoadingMore) return
    if (searchQuery.trim().length > 0) return
    if (species.length >= totalInDatabase) return

    setIsLoadingMore(true)
    try {
      const nextPage = page + 1
      const params = getDatasetParams(dataset)
      const response = await fetch(`/api/ancestry?limit=500&sort=${params.sort}&rank=${params.rank}&page=${nextPage}`)
      if (!response.ok) return

      const data = await response.json()
      const nextItems = (data.species || []).map((s: any, index: number) => ({
        ...s,
        id: s.id || species.length + index + 1,
        family: s.family || "Unknown",
        description: s.description || null,
        characteristics: s.characteristics || [],
        habitat: s.habitat || null,
        edibility: s.edibility || null,
        season: s.season || null,
        distribution: s.distribution || null,
        featured: (s.observations_count || 0) > 5000,
      })) as Species[]

      if (typeof data.total === "number") setTotalInDatabase(data.total)
      setSpecies((prev) => [...prev, ...nextItems])
      setPage(nextPage)
    } finally {
      setIsLoadingMore(false)
    }
  }

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("species-favorites")
    if (saved) setFavorites(JSON.parse(saved))
  }, [])

  // Families derived from loaded species
  const families = useMemo(() => {
    const fams = new Set<string>()
    species.forEach((s) => {
      if (s.family && s.family !== "Unknown") fams.add(s.family)
    })
    return ["All Families", ...Array.from(fams).sort()]
  }, [species])

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

      // Data completeness filter
      let matchesCompleteness = true
      if (dataCompleteness === "has_images") matchesCompleteness = Boolean(s.image_url)
      else if (dataCompleteness === "has_description") matchesCompleteness = Boolean(s.description?.trim())

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

      return matchesSearch && matchesFamily && matchesCategory && matchesCompleteness
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
  }, [species, searchQuery, selectedFamily, selectedCategory, dataCompleteness, sortBy])

  const featuredSpecies = useMemo(() => species.filter((s) => s.featured), [species])

  function getSpeciesHref(s: Species) {
    const stableId = s.uuid || String(s.id)
    return `/ancestry/species/${encodeURIComponent(stableId)}`
  }

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
    setDataCompleteness("all")
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
                Discover the fascinating world of fungi. Browse {totalInDatabase || species.length}+ species with detailed information, 
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="text-3xl font-bold">{species.length.toLocaleString()}</div>
              <div className="text-sm text-green-200">Species Loaded</div>
              {totalInDatabase > species.length && (
                <div className="text-xs text-green-300 mt-1">of {totalInDatabase.toLocaleString()} in database</div>
              )}
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
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="text-lg font-bold capitalize">{dataSource}</div>
              <div className="text-sm text-green-200">Data Source</div>
              <div className="text-xs text-green-300 mt-1">
                {dataSource === "mindex" ? "MINDEX" : dataSource === "external_api" ? "iNaturalist / GBIF" : "None"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Status Banner - No data available */}
        {!loading && species.length === 0 && dataSource === "none" && (
          <div className="mb-6 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-amber-700 dark:text-amber-400">No Species Data Available</p>
                <p className="text-sm text-muted-foreground">
                  MINDEX service may not be running or synced. Start MINDEX with: docker-compose -f docker-compose.mindex.yml up -d
                </p>
              </div>
              <Button variant="outline" size="sm" className="shrink-0" asChild>
                <Link href="/natureos/mindex">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync MINDEX
                </Link>
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
                  <Link key={s.uuid || s.id} href={getSpeciesHref(s)} className="shrink-0 group">
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
                <Select
                  value={dataset}
                  onValueChange={(v) => {
                    const next = v as "popular" | "all_species" | "all_taxa"
                    setDataset(next)
                    setSearchQuery("")
                  }}
                >
                  <SelectTrigger className="w-[220px]">
                    <Globe className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Popular (iNaturalist)</SelectItem>
                    <SelectItem value="all_species">All Species (All sources)</SelectItem>
                    <SelectItem value="all_taxa">All Taxa (All ranks)</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedFamily} onValueChange={setSelectedFamily}>
                  <SelectTrigger className="w-[180px]">
                    <Leaf className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Family" />
                  </SelectTrigger>
                  <SelectContent>
                    {families.map((family) => (
                      <SelectItem key={family} value={family}>
                        {family}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={dataCompleteness} onValueChange={(v) => setDataCompleteness(v as typeof dataCompleteness)}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Data completeness" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All species</SelectItem>
                    <SelectItem value="has_images">Has images</SelectItem>
                    <SelectItem value="has_description">Has description</SelectItem>
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
                Showing <strong>{filteredSpecies.length}</strong> of {species.length} loaded
                {totalInDatabase > species.length ? ` (of ${totalInDatabase} in database)` : ""}
              </span>
              
              {(searchQuery || selectedFamily !== "All Families" || selectedCategory !== "all" || dataCompleteness !== "all") && (
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
                  {dataCompleteness !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      {dataCompleteness === "has_images" ? "Has images" : "Has description"}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setDataCompleteness("all")} />
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
            <div className="text-center space-y-4">
              <Microscope className="h-16 w-16 mx-auto text-muted-foreground mb-2" />
              <h3 className="text-2xl font-semibold">No species found</h3>
              {searchQuery.trim() ? (
                <>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    <span className="italic font-medium text-foreground">{searchQuery}</span> was not found in the local database.
                    It may exist in iNaturalist — open the detail page to view it directly.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                    <Button
                      onClick={() => router.push(`/ancestry/species/name/${encodeURIComponent(searchQuery.trim())}`)}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Look up &ldquo;{searchQuery}&rdquo; on iNaturalist
                    </Button>
                    <Button variant="outline" onClick={resetFilters}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Clear search
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    We couldn't find any species matching your criteria. Try adjusting your search or filters.
                  </p>
                  <Button onClick={resetFilters}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset Filters
                  </Button>
                </>
              )}
            </div>
          </Card>
        )}

        {/* Grid View */}
        {!loading && filteredSpecies.length > 0 && viewMode === "grid" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredSpecies.map((s) => (
              <Card key={s.uuid || s.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-2 hover:border-green-500">
                <Link href={getSpeciesHref(s)}>
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

                    {/* Data quality indicators */}
                    <div className="absolute top-3 right-3 flex gap-1">
                      {s.image_url && (
                        <span className="rounded bg-black/50 px-1.5 py-0.5" title="Has image">
                          <Camera className="h-3 w-3 text-white" />
                        </span>
                      )}
                      {s.description && (
                        <span className="rounded bg-black/50 px-1.5 py-0.5" title="Has description">
                          <BookOpen className="h-3 w-3 text-white" />
                        </span>
                      )}
                      {s.featured && (
                        <Badge className="bg-yellow-500 shadow-lg">
                          <Star className="h-3 w-3" />
                        </Badge>
                      )}
                    </div>
                    
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
                  <Link href={getSpeciesHref(s)}>
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
                  <Link href={getSpeciesHref(s)} className="text-sm text-green-600 hover:underline font-medium">
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
              <Link key={s.uuid || s.id} href={getSpeciesHref(s)} className="group">
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
                    <Link href={getSpeciesHref(s)} className="shrink-0">
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
                          <Link href={getSpeciesHref(s)}>
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

        {/* Load more (disabled while searching to avoid confusing partial search results) */}
        {!loading && searchQuery.trim().length === 0 && species.length < totalInDatabase && (
          <div className="flex justify-center mt-10">
            <Button type="button" variant="outline" onClick={loadMore} disabled={isLoadingMore}>
              {isLoadingMore ? "Loading…" : `Load more (${species.length.toLocaleString()} / ${totalInDatabase.toLocaleString()})`}
            </Button>
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
