"use client"

import type React from "react"

import { useState } from "react"
import { Search, Sparkles, Database, Microscope } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"

export function SearchSection() {
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const quickSearches = [
    { label: "Amanita muscaria", icon: "🍄" },
    { label: "Psilocybe", icon: "🧠" },
    { label: "Penicillium", icon: "🔬" },
    { label: "Cordyceps", icon: "🐛" },
  ]

  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
            Explore the Fungal Kingdom
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Discover, identify, and research fungi with our comprehensive database powered by advanced AI and scientific
            expertise.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <form onSubmit={handleSearch} className="flex gap-2 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search species, compounds, or research papers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
            <Button type="submit" size="lg" className="h-12 px-8">
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-12"
        >
          <p className="text-sm text-muted-foreground mb-4">Popular searches:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {quickSearches.map((search, index) => (
              <Button
                key={search.label}
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery(search.label)
                  router.push(`/search?q=${encodeURIComponent(search.label)}`)
                }}
                className="text-sm"
              >
                <span className="mr-2">{search.icon}</span>
                {search.label}
              </Button>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="grid md:grid-cols-3 gap-6"
        >
          <Card
            className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
            onClick={() => router.push("/fungal-database")}
          >
            <CardContent className="p-6 text-center">
              <div className="mb-4 mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <Database className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">Fungal Database</h3>
              <p className="text-sm text-muted-foreground">
                Comprehensive collection of fungal species with detailed taxonomic information
              </p>
            </CardContent>
          </Card>

          <Card
            className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
            onClick={() => router.push("/myca-ai")}
          >
            <CardContent className="p-6 text-center">
              <div className="mb-4 mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <Sparkles className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">MYCA AI Assistant</h3>
              <p className="text-sm text-muted-foreground">
                AI-powered identification and research assistance for mycological studies
              </p>
            </CardContent>
          </Card>

          <Card
            className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
            onClick={() => router.push("/compounds")}
          >
            <CardContent className="p-6 text-center">
              <div className="mb-4 mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <Microscope className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">Compound Library</h3>
              <p className="text-sm text-muted-foreground">
                Explore bioactive compounds and their molecular structures
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}
