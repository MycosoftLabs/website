import type { Metadata } from "next"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Briefcase,
  MapPin,
  Clock,
  Building2,
  ArrowRight,
  Users,
  Leaf,
  Brain,
  Heart,
  Zap,
  Globe,
  GraduationCap,
  Dumbbell,
  Coffee,
  Plane,
  DollarSign,
  ChevronRight,
  Sparkles,
} from "lucide-react"
import { createClient } from "@supabase/supabase-js"

export const metadata: Metadata = {
  title: "Careers | Mycosoft",
  description: "Join Mycosoft and help build the future of biological computing. Explore open positions in engineering, research, design, and more.",
}

export const dynamic = "force-dynamic"
export const revalidate = 0

interface Job {
  id: string
  title: string
  department: string
  location: string
  type: string
  level: string
  description: string
  requirements?: string[]
  is_active: boolean
  created_at: string
}

async function getJobs(): Promise<Job[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[Careers] Missing Supabase credentials")
    return []
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  try {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[Careers] Supabase error:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[Careers] Error fetching jobs:", error)
    return []
  }
}

function getTimeAgo(dateString: string): string {
  const now = new Date()
  const posted = new Date(dateString)
  const diffMs = now.getTime() - posted.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "1 day ago"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 14) return "1 week ago"
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 60) return "1 month ago"
  return `${Math.floor(diffDays / 30)} months ago`
}

const benefits = [
  {
    icon: Heart,
    title: "Health & Wellness",
    description: "Comprehensive medical, dental, and vision coverage for you and your family",
  },
  {
    icon: DollarSign,
    title: "Competitive Compensation",
    description: "Salary, equity, and performance bonuses that reflect your impact",
  },
  {
    icon: Plane,
    title: "Unlimited PTO",
    description: "Take the time you need to recharge and explore the world",
  },
  {
    icon: GraduationCap,
    title: "Learning Budget",
    description: "$2,000 annual budget for courses, conferences, and books",
  },
  {
    icon: Dumbbell,
    title: "Wellness Stipend",
    description: "Monthly allowance for gym, fitness classes, or mental health",
  },
  {
    icon: Coffee,
    title: "Flexible Work",
    description: "Remote-friendly culture with optional in-office collaboration",
  },
]

const values = [
  {
    icon: Leaf,
    title: "Sustainability First",
    description: "Every decision considers environmental impact. We build technology that regenerates rather than depletes.",
  },
  {
    icon: Brain,
    title: "Radical Innovation",
    description: "We pursue ideas that seem impossible. The intersection of biology and technology is our frontier.",
  },
  {
    icon: Users,
    title: "Open Collaboration",
    description: "Knowledge grows when shared. We contribute to open science and support each other's growth.",
  },
  {
    icon: Zap,
    title: "Move Fast, Learn Faster",
    description: "We experiment boldly, fail quickly, and iterate constantly. Progress beats perfection.",
  },
]

export default async function CareersPage() {
  const openPositions = await getJobs()

  // Calculate department counts
  const departments = openPositions.reduce((acc: Record<string, number>, job) => {
    acc[job.department] = (acc[job.department] || 0) + 1
    return acc
  }, {})

  const departmentList = Object.entries(departments).map(([name, count]) => ({
    name,
    count,
  }))
  return (
    <div className="min-h-dvh bg-background">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/30 to-background z-0" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(168,85,247,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.02)_1px,transparent_1px)] bg-[size:60px_60px] z-10" />
        
        <div className="container max-w-5xl mx-auto px-6 relative z-20">
          <div className="text-center">
            <Badge className="mb-6 bg-purple-500/20 text-purple-400 border-purple-500/30">
              We're Hiring
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Build the Future of{" "}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Biological Computing
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Join a team of scientists, engineers, and visionaries working to bridge the gap between 
              nature and technology. Help us create sustainable computing that works in harmony with Earth.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" className="gap-2 bg-purple-600 hover:bg-purple-700" asChild>
                <a href="#positions">
                  View Open Positions
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/about">Learn About Us</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y bg-muted/30">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-purple-500 mb-1">{openPositions.length}</div>
              <div className="text-sm text-muted-foreground">Open Positions</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-500 mb-1">50+</div>
              <div className="text-sm text-muted-foreground">Team Members</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-500 mb-1">25+</div>
              <div className="text-sm text-muted-foreground">Countries</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-500 mb-1">60%</div>
              <div className="text-sm text-muted-foreground">Remote Team</div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Join Us */}
      <section className="py-20">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Why Join Mycosoft</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Work That Matters</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              At Mycosoft, you'll work on technology that has the potential to reshape our relationship 
              with the natural world. Every line of code, every experiment, every idea brings us closer 
              to sustainable computing.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {values.map((value) => (
              <Card key={value.title} className="hover:border-purple-500/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-purple-500/10">
                      <value.icon className="h-6 w-6 text-purple-500" />
                    </div>
                    <div>
                      <CardTitle className="text-xl mb-2">{value.title}</CardTitle>
                      <CardDescription className="text-base">{value.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-muted/30">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Benefits & Perks</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Taking Care of Our Team</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We believe that great work comes from people who feel supported and valued.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit) => (
              <Card key={benefit.title}>
                <CardHeader>
                  <div className="p-2 rounded-lg bg-purple-500/10 w-fit mb-2">
                    <benefit.icon className="h-5 w-5 text-purple-500" />
                  </div>
                  <CardTitle className="text-lg">{benefit.title}</CardTitle>
                  <CardDescription>{benefit.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section id="positions" className="py-20">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <Badge variant="outline" className="mb-4">Open Positions</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">Join Our Team</h2>
              <p className="text-muted-foreground">
                {openPositions.length} open positions across {departmentList.length} departments
              </p>
            </div>
            {departmentList.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {departmentList.map((dept) => (
                  <Badge 
                    key={dept.name} 
                    variant="secondary" 
                    className="cursor-pointer hover:bg-purple-500/20"
                  >
                    {dept.name} ({dept.count})
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {openPositions.length > 0 ? (
            <div className="space-y-4">
              {openPositions.map((position) => (
                <Card 
                  key={position.id} 
                  className="hover:border-purple-500/50 transition-colors cursor-pointer group"
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold group-hover:text-purple-500 transition-colors">
                            {position.title}
                          </h3>
                          <Badge variant="secondary">{position.level}</Badge>
                        </div>
                        {position.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {position.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-4 w-4" />
                            {position.department}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {position.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {position.type}
                          </span>
                          <span className="text-muted-foreground/60">
                            Posted {getTimeAgo(position.created_at)}
                          </span>
                        </div>
                      </div>
                      <Button variant="outline" className="gap-2 shrink-0 w-full sm:w-auto" asChild>
                        <a href={`mailto:careers@mycosoft.com?subject=Application for ${position.title}`}>
                          Apply Now
                          <ChevronRight className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <Briefcase className="h-12 w-12 text-muted-foreground" />
                <h3 className="text-xl font-semibold">No Open Positions</h3>
                <p className="text-muted-foreground max-w-md">
                  We don't have any open positions right now, but we're always looking for talented people. 
                  Send your resume to careers@mycosoft.com and we'll keep you in mind.
                </p>
                <Button variant="outline" asChild>
                  <a href="mailto:careers@mycosoft.com">Send Your Resume</a>
                </Button>
              </div>
            </Card>
          )}
        </div>
      </section>

      {/* Hiring Process */}
      <section className="py-20 bg-muted/30">
        <div className="container max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Our Process</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How We Hire</h2>
            <p className="text-muted-foreground">
              Our interview process is designed to be transparent, fair, and respectful of your time.
            </p>
          </div>

          <div className="space-y-6">
            {[
              {
                step: "01",
                title: "Application Review",
                description: "We review every application carefully. You'll hear back within 1 week.",
              },
              {
                step: "02",
                title: "Initial Call",
                description: "30-minute conversation with a recruiter to discuss the role and your background.",
              },
              {
                step: "03",
                title: "Technical Interview",
                description: "Deep dive into your skills with our engineering or research team.",
              },
              {
                step: "04",
                title: "Team Interviews",
                description: "Meet the team you'll be working with and learn about our culture.",
              },
              {
                step: "05",
                title: "Offer",
                description: "If there's a match, we'll extend an offer and welcome you to the team!",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-6">
                <div className="text-4xl font-bold text-purple-500/30">{item.step}</div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container max-w-4xl mx-auto px-6 text-center">
          <Sparkles className="h-12 w-12 text-purple-500 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Don't See the Right Role?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            We're always interested in meeting talented people. Send us your resume and tell us 
            how you'd like to contribute to our mission.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" className="gap-2 bg-purple-600 hover:bg-purple-700" asChild>
              <a href="mailto:careers@mycosoft.com">
                Get in Touch
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/about">Learn About Our Mission</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
