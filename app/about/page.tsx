"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { teamMembers } from "@/lib/team-data"
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
  CheckCircle2,
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

// Products - Prepared for image/icon customization
const products = [
  {
    name: "SporeBase",
    description: "Professional-grade incubation platform with IoT integration for temperature, humidity, CO2, and growth monitoring. The cornerstone of automated cultivation.",
    status: "Shipping",
    featured: true,
    // Placeholder for Canva-derived images
    imagePlaceholder: "/images/products/sporebase-hero.png",
    iconColor: "emerald",
    link: "/devices/sporebase",
  },
  {
    name: "MycoBrain",
    description: "Edge computing module with dual BME688 sensors for IAQ, eCO2, bVOC, and BSEC2-powered smell detection. The brain behind biological monitoring.",
    status: "Beta",
    featured: true,
    imagePlaceholder: "/images/products/mycobrain-hero.png",
    iconColor: "blue",
    link: "/devices/mycobrain",
  },
  {
    name: "Mushroom 1",
    description: "Smart cultivation system with integrated sensors for home and professional growers.",
    status: "Shipping",
    imagePlaceholder: "/images/products/mushroom1-hero.png",
    iconColor: "green",
    link: "/devices/mushroom1",
  },
  {
    name: "NatureOS",
    description: "Operating system for Earth science with real-time data from satellites, sensors, and biological networks.",
    status: "Live",
    featured: true,
    imagePlaceholder: "/images/products/natureos-hero.png",
    iconColor: "teal",
    link: "/natureos",
  },
  {
    name: "MYCA AI",
    description: "Mycological cognitive assistant powered by 42+ specialized agents working 24/7 on research, analysis, and automation.",
    status: "Live",
    imagePlaceholder: "/images/products/myca-hero.png",
    iconColor: "purple",
    link: "/apps/myca",
  },
  {
    name: "MINDEX",
    description: "Global fungal intelligence database with 1M+ species, genomes, observations, and taxonomic data from iNaturalist, GBIF, and more.",
    status: "Live",
    featured: true,
    imagePlaceholder: "/images/products/mindex-hero.png",
    iconColor: "amber",
    link: "/search",
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

          <div className="relative mb-12">
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

          <div className="prose prose-lg max-w-none text-center">
            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
              Mycosoft exists to bridge the gap between biological intelligence and digital technology. 
              We believe that the future of computing lies not in replacing nature, but in integrating 
              with it. Our mission is to develop technologies that work in harmony with Earth's natural 
              systems, creating sustainable solutions that regenerate rather than deplete.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              We're building the world's first biological computer—a system where mycelium networks 
              serve as processors, memory, and communication channels. This isn't science fiction; 
              it's the next evolution of technology, and it's happening now.
            </p>
          </div>
        </div>
      </section>

      {/* Origin Story */}
      <section className="py-24 bg-muted/30">
        <div className="container max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Our Origin</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              The Beginning of a Revolution
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="relative aspect-video rounded-lg overflow-hidden mb-6">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/morgan-rockwell-mycosoft-founder.jpg"
                  alt="Morgan Rockwell connecting fungi to computers"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold mb-4">2014: The First Connection</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  In 2014, Morgan Rockwell made history by becoming one of the first researchers to 
                  successfully connect living fungi to computers. Using IoT sensors and ECG technology, 
                  he demonstrated that mycelial networks could communicate with digital systems, 
                  opening entirely new frontiers in biological computing.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  This breakthrough wasn't just a proof of concept—it was the foundation for an 
                  entirely new field of research. Morgan's work showed that nature's most efficient 
                  information processing systems could be integrated with modern technology, creating 
                  possibilities that had never existed before.
                </p>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-4">From Research to Reality</h3>
                <p className="text-muted-foreground leading-relaxed">
                  What started as a research project in 2014 has grown into Mycosoft—a company 
                  developing real products that bridge biological and digital worlds. From the 
                  MycoBrain hardware platform to NatureOS and MYCA AI, we're building the 
                  infrastructure for a new era of sustainable computing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="py-24">
        <div className="container max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">The Founder</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Morgan Rockwell
            </h2>
            <p className="text-xl text-muted-foreground">
              Visionary, Pioneer, and Leader of the Fungal Intelligence Revolution
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="p-6">
              <div className="p-3 rounded-xl bg-green-500/10 w-fit mb-4">
                <FlaskConical className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Pioneer</h3>
              <p className="text-muted-foreground">
                First to connect living fungi to computers using IoT and bioelectric sensors in 2014
              </p>
            </Card>
            <Card className="p-6">
              <div className="p-3 rounded-xl bg-green-500/10 w-fit mb-4">
                <Lightbulb className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Innovator</h3>
              <p className="text-muted-foreground">
                Developed the first functional bioelectric interface between mycelium and digital systems
              </p>
            </Card>
            <Card className="p-6">
              <div className="p-3 rounded-xl bg-green-500/10 w-fit mb-4">
                <Rocket className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Leader</h3>
              <p className="text-muted-foreground">
                Founded Mycosoft Labs in 2018 and led the development of biological computing platforms
              </p>
            </Card>
          </div>

          <div className="prose prose-lg max-w-none">
            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
              Morgan Rockwell's vision extends far beyond technology. He sees a future where computing 
              doesn't deplete the Earth but regenerates it. Where intelligence emerges from the same 
              networks that have sustained life for billions of years. Where mycelium does for computing 
              what silicon did in the 20th century—but sustainably, regeneratively, and in harmony with 
              the planet.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Under Morgan's leadership, Mycosoft has grown from a research project into a company 
              developing the world's first biological computer. His groundbreaking work has opened 
              new frontiers in biological computing, demonstrating that nature's most efficient 
              information processing systems can be integrated with modern technology.
            </p>
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
              These values aren't just words—they're the foundation of everything we build.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
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

          <div className="max-w-4xl mx-auto">
            <Card className="p-8 bg-background/50">
              <h3 className="text-2xl font-bold mb-6 text-center">Living Our Values</h3>
              <div className="space-y-4 text-muted-foreground">
                <p className="leading-relaxed">
                  At Mycosoft, our values aren't just posted on a wall—they're embedded in our code, 
                  our research, and our products. Every line of code we write, every device we build, 
                  and every decision we make is evaluated against these principles.
                </p>
                <p className="leading-relaxed">
                  We measure success not just by technological achievement, but by environmental impact. 
                  We pursue innovation that serves both humanity and the planet. We share knowledge 
                  because we believe that solving the world's greatest challenges requires collaboration, 
                  not competition.
                </p>
                <p className="leading-relaxed">
                  These values have guided us from a research project in 2014 to a company developing 
                  the world's first biological computer. They'll continue to guide us as we build the 
                  future of sustainable computing.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Core Team */}
      <section className="py-24">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Our Team</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Meet the Core Team
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A world-class team of mycologists, engineers, and visionaries building the future of biological computing.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamMembers.map((member) => (
              <Link key={member.slug} href={`/about/team/${member.slug}`}>
                <Card className="group hover:border-green-500/50 transition-all duration-300 cursor-pointer overflow-hidden h-full">
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <Image
                      src={member.image}
                      alt={member.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <Badge className="mb-2 bg-green-500/20 text-green-400 border-green-500/30">
                        {member.role}
                      </Badge>
                      <h3 className="text-2xl font-bold mb-2">{member.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{member.bio}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">
              We're always looking for talented individuals to join our mission.
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

      {/* Key Devices and Applications */}
      <section className="py-24 bg-muted/30">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Our Products</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Key Devices and Applications
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Hardware and software designed to bridge biological and digital worlds, enabling 
              researchers, developers, and enthusiasts to explore fungal intelligence.
            </p>
          </div>

          {/* Featured Products - Large Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {products.filter(p => p.featured).slice(0, 2).map((product) => (
              <Card key={product.name} className={`p-6 hover:border-${product.iconColor}-500/50 transition-all h-full flex flex-col relative overflow-hidden group`}>
                {/* Placeholder for parallax background image */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity product-bg-placeholder" />
                
                <div className="flex items-start justify-between mb-3 relative z-10">
                  <div className="flex items-center gap-3">
                    {/* Icon placeholder - ready for custom SVG/image */}
                    <div className={`p-2 rounded-lg bg-${product.iconColor}-500/20`}>
                      <Server className={`h-6 w-6 text-${product.iconColor}-500`} />
                    </div>
                    <h3 className="text-2xl font-bold">{product.name}</h3>
                  </div>
                  <Badge 
                    variant={product.status === "Shipping" ? "default" : product.status === "Live" ? "secondary" : "outline"}
                    className={product.status === "Shipping" ? "bg-green-500" : product.status === "Beta" ? "bg-blue-500" : ""}
                  >
                    {product.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground flex-grow relative z-10">{product.description}</p>
                <Button variant="ghost" className="mt-4 w-fit gap-2 p-0 h-auto text-green-500 hover:text-green-400 relative z-10" asChild>
                  <Link href={product.link}>
                    Learn more <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </Card>
            ))}
          </div>

          {/* Other Products - Smaller Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {products.filter(p => !p.featured || products.filter(x => x.featured).indexOf(p) >= 2).map((product) => (
              <Card key={product.name} className="p-4 hover:border-green-500/50 transition-all h-full flex flex-col">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-bold">{product.name}</h3>
                  <Badge 
                    variant={product.status === "Shipping" ? "default" : product.status === "Live" ? "secondary" : "outline"}
                    className={`text-xs ${product.status === "Shipping" ? "bg-green-500" : product.status === "Beta" ? "bg-blue-500" : ""}`}
                  >
                    {product.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground flex-grow line-clamp-2">{product.description}</p>
                <Button variant="ghost" className="mt-3 w-fit gap-1 p-0 h-auto text-green-500 hover:text-green-400 text-sm" asChild>
                  <Link href={product.link}>
                    Learn more <ChevronRight className="h-3 w-3" />
                  </Link>
                </Button>
              </Card>
            ))}
          </div>

          {/* Applications Section */}
          <div className="mt-16">
            <h3 className="text-3xl font-bold mb-8 text-center">Applications & Use Cases</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <Microscope className="h-6 w-6 text-green-500" />
                  </div>
                  <h4 className="text-xl font-bold">Scientific Research</h4>
                </div>
                <p className="text-muted-foreground">
                  Enable mycologists and researchers to study fungal networks, species identification, 
                  and environmental monitoring with unprecedented precision and scale.
                </p>
              </Card>
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <Factory className="h-6 w-6 text-green-500" />
                  </div>
                  <h4 className="text-xl font-bold">Bioremediation</h4>
                </div>
                <p className="text-muted-foreground">
                  Deploy fungi to break down pollutants, plastics, and hydrocarbons. Nature's solution 
                  to human contamination, monitored and optimized through our technology.
                </p>
              </Card>
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <Activity className="h-6 w-6 text-green-500" />
                  </div>
                  <h4 className="text-xl font-bold">Environmental Monitoring</h4>
                </div>
                <p className="text-muted-foreground">
                  Real-time monitoring systems that bridge biological sensors with satellite data for 
                  unprecedented Earth observation and climate tracking.
                </p>
              </Card>
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <CircuitBoard className="h-6 w-6 text-green-500" />
                  </div>
                  <h4 className="text-xl font-bold">Biological Computing</h4>
                </div>
                <p className="text-muted-foreground">
                  Develop organic computing components from mycelium—capacitors, transistors, and 
                  processors that grow rather than manufacture.
                </p>
              </Card>
            </div>
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
            <div className="space-y-6 text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              <p>
                We envision a future where computing doesn't deplete the Earth but regenerates it. 
                Where technology grows rather than manufactures. Where intelligence emerges from 
                the same networks that have sustained life for billions of years.
              </p>
              <p>
                The biological computer isn't just our goal—it's the next step in the evolution of 
                technology itself. Mycelium will do for computing what silicon did in the 20th century, 
                but sustainably, regeneratively, and in harmony with the planet.
              </p>
              <p>
                This vision drives everything we do. From the MycoBrain devices monitoring environmental 
                conditions to NatureOS connecting biological and digital systems, from MYCA AI understanding 
                mycological knowledge to MINDEX cataloging the world's fungal diversity—every product, 
                every research project, every line of code brings us closer to this future.
              </p>
              <p className="text-lg font-semibold text-foreground">
                We're not just building technology. We're building the foundation for a new era of 
                sustainable computing that works in harmony with nature.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Focus */}
      <section className="py-24">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Technology Focus</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Where Biology Meets Technology
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our research spans multiple domains, all converging on a single goal: creating 
              sustainable technology that works in harmony with nature.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 rounded-xl bg-green-500/20">
                  <Atom className="h-8 w-8 text-green-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Biological Computing</h3>
                  <p className="text-sm text-muted-foreground">Growing organic processors</p>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We're developing the world's first biological computer by growing organic capacitors, 
                transistors, and processors from mycelium. This isn't just sustainable—it's regenerative. 
                Our goal is to use mycelium as a sustainable alternative for building next-generation 
                hardware that works in harmony with the planet.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>50+ patents filed in biological computing</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Active research in organic component development</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Partnerships with leading research institutions</span>
                </li>
              </ul>
            </Card>

            <Card className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 rounded-xl bg-green-500/20">
                  <Network className="h-8 w-8 text-green-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Mycelial Networks</h3>
                  <p className="text-sm text-muted-foreground">Nature's internet</p>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Mycelial networks are nature's internet—vast underground fungal networks that connect 
                ecosystems globally. We're harnessing this natural infrastructure to create 
                communication systems that work through soil and organic matter, enabling data 
                transmission that's both low-energy and environmentally friendly.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>1M+ species indexed in MINDEX database</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Real-time monitoring of mycelial networks</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Encrypted data transmission through soil</span>
                </li>
              </ul>
            </Card>

            <Card className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 rounded-xl bg-green-500/20">
                  <Satellite className="h-8 w-8 text-green-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Environmental Intelligence</h3>
                  <p className="text-sm text-muted-foreground">Earth observation systems</p>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Our environmental monitoring systems bridge biological sensors with satellite data, 
                creating unprecedented Earth observation capabilities. From climate tracking to 
                ecosystem health monitoring, we're building the infrastructure for planetary-scale 
                environmental intelligence.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Deployed in 25+ countries worldwide</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Real-time sensor data integration</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Satellite and ground sensor fusion</span>
                </li>
              </ul>
            </Card>

            <Card className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 rounded-xl bg-green-500/20">
                  <Beaker className="h-8 w-8 text-green-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Bioremediation</h3>
                  <p className="text-sm text-muted-foreground">Nature's cleanup solution</p>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We deploy fungi to break down pollutants, plastics, and hydrocarbons. This is nature's 
                solution to human contamination, and we're using technology to optimize and scale it. 
                Our bioremediation projects are cleaning up contaminated sites while advancing our 
                understanding of fungal capabilities.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>10+ active bioremediation projects</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Plastic and hydrocarbon degradation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Real-time monitoring and optimization</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section - Invitation to Join */}
      <section className="py-24 bg-green-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="container max-w-5xl mx-auto px-6 text-center relative z-10">
          <Badge className="mb-6 bg-white/20 text-white border-white/30 hover:bg-white/30">
            Join Us
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Join the Fungal Intelligence Revolution
          </h2>
          <p className="text-xl text-green-100 mb-4 max-w-2xl mx-auto leading-relaxed">
            We're building the future of sustainable computing, and we need passionate people to join us. 
            Whether you're a researcher pushing the boundaries of biological computing, a developer 
            building the infrastructure, an investor supporting innovation, or an enthusiast exploring 
            fungal intelligence—there's a place for you in our mission.
          </p>
          <p className="text-lg text-green-50 mb-8 max-w-2xl mx-auto">
            Together, we're creating technology that doesn't just work with nature—it grows from it. 
            This is more than a company; it's a movement toward a sustainable, regenerative future.
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
            <Button size="lg" variant="outline" className="gap-2 bg-transparent text-white border-white hover:bg-white hover:text-green-600" asChild>
              <Link href="/careers">
                View Careers
                <Users className="h-4 w-4" />
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
