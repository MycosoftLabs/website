"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowRight,
  Brain,
  Cpu,
  Database,
  FlaskConical,
  Globe,
  Leaf,
  Lightbulb,
  LineChart,
  Microscope,
  Network,
  Rocket,
  Shield,
  Sparkles,
  Target,
  TreeDeciduous,
  Users,
  Zap,
  Award,
  Building2,
  Calendar,
  ChevronRight,
  ExternalLink,
  Github,
  Linkedin,
  MapPin,
  Play,
  Quote,
  Twitter,
  Factory,
  Beaker,
  Atom,
  CircuitBoard,
  Server,
  Satellite,
  Activity,
} from "lucide-react"

// Company Statistics
const companyStats = [
  { value: "2014", label: "Founded", icon: Calendar },
  { value: "10+", label: "Years R&D", icon: FlaskConical },
  { value: "50+", label: "Patents Filed", icon: Award },
  { value: "1M+", label: "Species Indexed", icon: Database },
  { value: "25+", label: "Countries", icon: Globe },
  { value: "∞", label: "Possibilities", icon: Sparkles },
]

// Timeline milestones
const milestones = [
  {
    year: "2014",
    title: "The Beginning",
    description: "Morgan Rockwell becomes one of the first to connect living fungi to computers using IoT and ECG sensors.",
  },
  {
    year: "2016",
    title: "First Bioelectric Interface",
    description: "Development of the first functional bioelectric interface between mycelium networks and digital systems.",
  },
  {
    year: "2018",
    title: "Mycosoft Labs Established",
    description: "Formal establishment of Mycosoft research laboratories focused on biological computing.",
  },
  {
    year: "2020",
    title: "MINDEX Launch",
    description: "Launch of the Mycological Index - the world's largest fungal species database with over 1 million entries.",
  },
  {
    year: "2022",
    title: "MycoBrain Development",
    description: "Introduction of MycoBrain hardware platform for real-time environmental monitoring and fungal interfacing.",
  },
  {
    year: "2023",
    title: "MYCA AI Deployed",
    description: "Launch of MYCA - the Mycosoft Cognitive Assistant, an AI system trained on mycological knowledge.",
  },
  {
    year: "2024",
    title: "NatureOS Platform",
    description: "Release of NatureOS - the operating system for Earth science and biological computing integration.",
  },
  {
    year: "2025",
    title: "Biological Computing",
    description: "First successful demonstration of mycelium-based computational components.",
  },
]

// Core values
const coreValues = [
  {
    icon: Leaf,
    title: "Sustainability First",
    description: "Every technology we develop must work in harmony with nature, not against it. We measure success by environmental impact.",
  },
  {
    icon: Brain,
    title: "Biological Intelligence",
    description: "We believe the future of computing lies not in silicon alone, but in the integration of biological and digital systems.",
  },
  {
    icon: Lightbulb,
    title: "Radical Innovation",
    description: "We pursue ideas that seem impossible today. The intersection of mycology and technology is our frontier.",
  },
  {
    icon: Users,
    title: "Open Science",
    description: "Knowledge should be shared. We contribute to open research and make our findings accessible to the scientific community.",
  },
  {
    icon: Shield,
    title: "Ethical Technology",
    description: "We develop technology that serves humanity and the planet. Every decision considers long-term consequences.",
  },
  {
    icon: Rocket,
    title: "Ambitious Vision",
    description: "We're building for the next century. Our goal is nothing less than redefining the relationship between technology and nature.",
  },
]

// Technology pillars
const technologyPillars = [
  {
    icon: CircuitBoard,
    title: "Biological Computing",
    description: "Growing organic capacitors, transistors, and processors from mycelium. We're developing the first true biological computer.",
    stats: "50+ Patents",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/biological%20computing-oqSPxCwmNWtBJ4fQ91qWdTmQDPyMYL.webp",
  },
  {
    icon: Network,
    title: "Mycelial Networks",
    description: "Harnessing nature's internet - the vast underground fungal networks that connect ecosystems globally.",
    stats: "1M+ Species",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/intelligence-fongique-scaled-e1632953070192.jpg-QcSkd9zn4uJrg5TC8gwWf8IOlxQiVj.jpeg",
  },
  {
    icon: Satellite,
    title: "Environmental Intelligence",
    description: "Real-time monitoring systems that bridge biological sensors with satellite data for unprecedented Earth observation.",
    stats: "25 Countries",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/enviornmental%20monitoring-ErgsKkzWy106AEq6Ak8G1GrpLHtyTu.webp",
  },
  {
    icon: Beaker,
    title: "Bioremediation",
    description: "Deploying fungi to break down pollutants, plastics, and hydrocarbons. Nature's solution to human contamination.",
    stats: "10+ Projects",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/hydrocarbon%20material%20science-wcEO75pjUfwXiebntL6AGEGvg4fPf2.webp",
  },
]

// Leadership
const leadership = [
  {
    name: "Morgan Rockwell",
    role: "Founder & CEO",
    bio: "Pioneer in fungal-computer integration. First to connect living mushrooms to digital systems using IoT and bioelectric sensors in 2014.",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/morgan-rockwell-mycosoft-founder.jpg",
    linkedin: "#",
    twitter: "#",
  },
]

// Products
const products = [
  {
    name: "Mushroom 1",
    description: "Smart cultivation system with integrated sensors",
    status: "Shipping",
  },
  {
    name: "SporeBase",
    description: "Professional-grade incubation platform",
    status: "Shipping",
  },
  {
    name: "MycoBrain",
    description: "Edge computing for biological monitoring",
    status: "Beta",
  },
  {
    name: "NatureOS",
    description: "Operating system for Earth science",
    status: "Live",
  },
  {
    name: "MYCA AI",
    description: "Mycological cognitive assistant",
    status: "Live",
  },
  {
    name: "MINDEX",
    description: "Global fungal species database",
    status: "Live",
  },
]

export default function AboutPage() {
  const [activeTimeline, setActiveTimeline] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTimeline((prev) => (prev + 1) % milestones.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section - Full Bleed */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-green-950/90 via-background/80 to-background z-10" />
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/rs=w_1160,h_663-ESVi80C1sa4fkioBNtFcVtPlY1TkSq.webp"
            alt="Mycelium network visualization"
            fill
            className="object-cover opacity-40"
            priority
          />
          {/* Animated grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.03)_1px,transparent_1px)] bg-[size:100px_100px] z-20" />
        </div>

        {/* Hero Content */}
        <div className="relative z-30 container max-w-6xl mx-auto px-6 text-center">
          <Badge className="mb-6 bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30">
            Est. 2014 • San Francisco, CA
          </Badge>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-green-400 via-emerald-300 to-teal-400 bg-clip-text text-transparent">
              Mycelium
            </span>
            <br />
            <span className="text-foreground">
              Is The New Silicon
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
            We're building the world's first biological computer. By integrating fungal intelligence 
            with modern technology, we're creating a new paradigm for sustainable computing 
            and environmental intelligence.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" className="gap-2 bg-green-600 hover:bg-green-700">
              <Play className="h-4 w-4" />
              Watch Our Story
            </Button>
            <Button size="lg" variant="outline" className="gap-2" asChild>
              <Link href="/devices">
                Explore Products
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y bg-muted/30">
        <div className="container max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {companyStats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="flex justify-center mb-2">
                  <stat.icon className="h-5 w-5 text-green-500" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="py-24 md:py-32">
        <div className="container max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Our Mission</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Redefining the relationship between
              <br />
              <span className="text-green-500">technology and nature</span>
            </h2>
          </div>

          <div className="relative">
            <Quote className="absolute -top-4 -left-4 h-12 w-12 text-green-500/20" />
            <blockquote className="text-2xl md:text-3xl font-light text-center leading-relaxed text-muted-foreground pl-8">
              "Nature has spent 3.8 billion years developing the most efficient computing systems on Earth. 
              Mycelial networks process information, adapt to environments, and solve complex problems 
              in ways silicon cannot. Our mission is to unlock this intelligence for humanity."
            </blockquote>
            <div className="text-center mt-8">
              <p className="font-semibold">Morgan Rockwell</p>
              <p className="text-sm text-muted-foreground">Founder & CEO</p>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Pillars */}
      <section className="py-24 bg-muted/30">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Technology</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Four Pillars of Innovation
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our research spans the intersection of biology, computing, and environmental science.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {technologyPillars.map((pillar, index) => (
              <Card key={pillar.title} className="overflow-hidden group hover:border-green-500/50 transition-all duration-300">
                <div className="grid md:grid-cols-2">
                  <div className="relative aspect-square md:aspect-auto">
                    <Image
                      src={pillar.image}
                      alt={pillar.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />
                  </div>
                  <CardContent className="p-6 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-green-500/20">
                        <pillar.icon className="h-6 w-6 text-green-500" />
                      </div>
                      <Badge variant="secondary">{pillar.stats}</Badge>
                    </div>
                    <h3 className="text-2xl font-bold mb-3">{pillar.title}</h3>
                    <p className="text-muted-foreground">{pillar.description}</p>
                    <Button variant="ghost" className="mt-4 w-fit gap-2 p-0 h-auto text-green-500 hover:text-green-400">
                      Learn more <ChevronRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-24">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Our Journey</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              A Decade of Discovery
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From connecting the first mushroom to a computer to building biological computing platforms.
            </p>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border hidden md:block" />

            <div className="space-y-12">
              {milestones.map((milestone, index) => (
                <div
                  key={milestone.year}
                  className={`relative grid md:grid-cols-2 gap-8 ${
                    index % 2 === 0 ? "" : "md:direction-rtl"
                  }`}
                >
                  {/* Content */}
                  <div className={`${index % 2 === 0 ? "md:text-right md:pr-12" : "md:text-left md:pl-12 md:col-start-2"}`}>
                    <div className="inline-block">
                      <Badge className="mb-3 bg-green-500/20 text-green-400 border-green-500/30">
                        {milestone.year}
                      </Badge>
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{milestone.title}</h3>
                    <p className="text-muted-foreground">{milestone.description}</p>
                  </div>

                  {/* Timeline dot */}
                  <div className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-green-500 border-4 border-background hidden md:block" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-24 bg-muted/30">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Our Values</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              What We Stand For
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our principles guide every decision, from research priorities to product development.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreValues.map((value) => (
              <Card key={value.title} className="p-6 hover:border-green-500/50 transition-all duration-300">
                <div className="p-3 rounded-xl bg-green-500/10 w-fit mb-4">
                  <value.icon className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="text-xl font-bold mb-2">{value.title}</h3>
                <p className="text-muted-foreground">{value.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section className="py-24">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Leadership</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Meet the Founder
            </h2>
          </div>

          <div className="max-w-4xl mx-auto">
            {leadership.map((leader) => (
              <Card key={leader.name} className="overflow-hidden">
                <div className="grid md:grid-cols-[300px,1fr] gap-0">
                  <div className="relative aspect-square md:aspect-auto">
                    <Image
                      src={leader.image}
                      alt={leader.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <CardContent className="p-8 flex flex-col justify-center">
                    <h3 className="text-3xl font-bold mb-1">{leader.name}</h3>
                    <p className="text-green-500 font-medium mb-4">{leader.role}</p>
                    <p className="text-lg text-muted-foreground mb-6">{leader.bio}</p>
                    <div className="flex gap-3">
                      <Button variant="outline" size="icon" asChild>
                        <a href={leader.linkedin} target="_blank" rel="noopener noreferrer">
                          <Linkedin className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button variant="outline" size="icon" asChild>
                        <a href={leader.twitter} target="_blank" rel="noopener noreferrer">
                          <Twitter className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">
              We're building a world-class team of mycologists, engineers, and visionaries.
            </p>
            <Button variant="outline" className="gap-2" asChild>
              <Link href="/careers">
                View Open Positions
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Products Showcase */}
      <section className="py-24 bg-muted/30">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Products</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              The Mycosoft Ecosystem
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Hardware and software designed to bridge biological and digital worlds.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <Card key={product.name} className="p-6 hover:border-green-500/50 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-bold">{product.name}</h3>
                  <Badge 
                    variant={product.status === "Shipping" ? "default" : product.status === "Live" ? "secondary" : "outline"}
                    className={product.status === "Shipping" ? "bg-green-500" : ""}
                  >
                    {product.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground">{product.description}</p>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button className="gap-2 bg-green-600 hover:bg-green-700" asChild>
              <Link href="/devices">
                Explore All Products
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* The Vision */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-950/50 to-background z-0" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.02)_1px,transparent_1px)] bg-[size:60px_60px] z-10" />
        
        <div className="container max-w-5xl mx-auto px-6 relative z-20">
          <div className="text-center">
            <Badge variant="outline" className="mb-4">The Vision</Badge>
            <h2 className="text-4xl md:text-6xl font-bold mb-8">
              Building the World's First
              <br />
              <span className="text-green-500">Biological Computer</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
              We envision a future where computing doesn't deplete the Earth but regenerates it. 
              Where technology grows rather than manufactures. Where intelligence emerges from 
              the same networks that have sustained life for billions of years.
            </p>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              The biological computer isn't just our goal—it's the next step in the evolution of 
              technology itself. Mycelium will do for computing what silicon did in the 20th century, 
              but sustainably, regeneratively, and in harmony with the planet.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-green-600">
        <div className="container max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Join the Fungal Intelligence Revolution
          </h2>
          <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
            Whether you're a researcher, developer, investor, or enthusiast—there's a place for you in our mission.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" variant="secondary" className="gap-2" asChild>
              <Link href="/devices">
                Get a Device
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="gap-2 bg-transparent text-white border-white hover:bg-white hover:text-green-600" asChild>
              <Link href="/science">
                Read Our Research
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Contact Info */}
      <section className="py-16 border-t">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="flex justify-center mb-3">
                <MapPin className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="font-bold mb-1">Headquarters</h3>
              <p className="text-muted-foreground">San Francisco, California</p>
            </div>
            <div>
              <div className="flex justify-center mb-3">
                <Building2 className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="font-bold mb-1">Research Labs</h3>
              <p className="text-muted-foreground">Multiple Locations Worldwide</p>
            </div>
            <div>
              <div className="flex justify-center mb-3">
                <Globe className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="font-bold mb-1">Global Presence</h3>
              <p className="text-muted-foreground">25+ Countries</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
