"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { Microscope, Database, TreePine, Beaker, MapPin, BookOpen, Cpu, Network } from "lucide-react"

export function QuickAccess() {
  const router = useRouter()

  const features = [
    {
      title: "Species Identification",
      description: "Upload photos for AI-powered fungal identification",
      icon: Microscope,
      href: "/species/submit",
      badge: "AI Powered",
      color: "bg-green-50 text-green-700 border-green-200",
    },
    {
      title: "Research Database",
      description: "Access thousands of peer-reviewed mycological papers",
      icon: Database,
      href: "/papers",
      badge: "10K+ Papers",
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      title: "Phylogenetic Trees",
      description: "Explore evolutionary relationships between fungi",
      icon: TreePine,
      href: "/ancestry",
      badge: "Interactive",
      color: "bg-purple-50 text-purple-700 border-purple-200",
    },
    {
      title: "Chemical Compounds",
      description: "Discover bioactive molecules from fungal sources",
      icon: Beaker,
      href: "/compounds",
      badge: "5K+ Compounds",
      color: "bg-orange-50 text-orange-700 border-orange-200",
    },
    {
      title: "Spore Tracker",
      description: "Monitor spore distribution patterns globally",
      icon: MapPin,
      href: "/apps/spore-tracker",
      badge: "Live Data",
      color: "bg-teal-50 text-teal-700 border-teal-200",
    },
    {
      title: "Field Guide",
      description: "Comprehensive guide for mushroom foragers",
      icon: BookOpen,
      href: "/mushrooms",
      badge: "Expert Tips",
      color: "bg-amber-50 text-amber-700 border-amber-200",
    },
    {
      title: "NatureOS",
      description: "Advanced mycological research platform",
      icon: Cpu,
      href: "/natureos",
      badge: "Pro Tools",
      color: "bg-indigo-50 text-indigo-700 border-indigo-200",
    },
    {
      title: "Mycelium Network",
      description: "Connect with researchers worldwide",
      icon: Network,
      href: "/natureos/mycelium-network",
      badge: "Community",
      color: "bg-pink-50 text-pink-700 border-pink-200",
    },
  ]

  return (
    <section className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold mb-4">Quick Access</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Jump into our most popular tools and resources for mycological research and exploration.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card
                className="group hover:shadow-lg transition-all duration-300 cursor-pointer h-full"
                onClick={() => router.push(feature.href)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg ${feature.color}`}>
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {feature.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-sm leading-relaxed">{feature.description}</CardDescription>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-4 p-0 h-auto font-medium text-primary hover:text-primary/80"
                  >
                    Explore →
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16 text-center"
        >
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-4">Ready to dive deeper?</h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Join thousands of researchers, educators, and enthusiasts exploring the fascinating world of fungi.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" onClick={() => router.push("/signup")}>
                  Create Account
                </Button>
                <Button size="lg" variant="outline" onClick={() => router.push("/about")}>
                  Learn More
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}
