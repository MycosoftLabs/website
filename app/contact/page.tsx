import type { Metadata } from "next"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Mail,
  MapPin,
  Clock,
  Building2,
  Globe,
  Github,
  Twitter,
  Linkedin,
  Phone,
  Cpu,
  FlaskConical,
  Handshake,
  Leaf,
} from "lucide-react"
import { ContactForm } from "@/components/contact/contact-form"

export const metadata: Metadata = {
  title: "Contact Us | Mycosoft",
  description: "Get in touch with the Mycosoft team. Reach us about AI systems, hardware, biotechnology research, partnerships, and platform inquiries.",
}

const contactMethods = [
  {
    icon: Mail,
    title: "General Inquiries",
    description: "Questions about Mycosoft",
    value: "hello@mycosoft.org",
    link: "mailto:hello@mycosoft.org",
  },
  {
    icon: Cpu,
    title: "Product & Platform",
    description: "NatureOS, MYCA, devices",
    value: "support@mycosoft.org",
    link: "mailto:support@mycosoft.org",
  },
  {
    icon: Handshake,
    title: "Partnerships",
    description: "Research & business collaboration",
    value: "partners@mycosoft.org",
    link: "mailto:partners@mycosoft.org",
  },
  {
    icon: Phone,
    title: "Phone",
    description: "Direct line",
    value: "(619) 483-1077",
    link: "tel:+16194831077",
  },
]

const socialLinks = [
  { icon: Github, label: "GitHub", href: "https://github.com/MycosoftLabs" },
  { icon: Twitter, label: "Twitter", href: "https://twitter.com/mycosoftorg" },
  { icon: Linkedin, label: "LinkedIn", href: "https://linkedin.com/company/mycosoft" },
]

export default function ContactPage() {
  return (
    <div className="min-h-dvh bg-background">
      {/* Hero Section */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-green-950/30 to-background z-0" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.02)_1px,transparent_1px)] bg-[size:60px_60px] z-10" />
        
        <div className="container max-w-5xl mx-auto px-6 relative z-20 text-center">
          <Badge className="mb-6 bg-green-500/20 text-green-400 border-green-500/30">
            Get in Touch
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Let's Build{" "}
            <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              Something Together
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Mycosoft builds AI, automation, and sensor-driven systems that connect technology with nature.
            Reach out about our platforms, research, hardware, or partnership opportunities.
          </p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-12">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {contactMethods.map((method) => (
              <a 
                key={method.title} 
                href={method.link}
                className="block"
              >
                <Card className="h-full hover:border-green-500/50 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="p-2 rounded-lg bg-green-500/10 w-fit mb-2">
                      <method.icon className="h-5 w-5 text-green-500" />
                    </div>
                    <CardTitle className="text-lg">{method.title}</CardTitle>
                    <CardDescription>{method.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <span className="text-sm text-green-500 hover:text-green-400">
                      {method.value}
                    </span>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Main Contact Form Section */}
      <section className="py-16">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-5 gap-12">
            {/* Contact Form */}
            <div className="lg:col-span-3">
              <ContactForm />
            </div>

            {/* Sidebar Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Office Location */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-green-500" />
                    Headquarters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Chula Vista, California</span>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                      451 Acero Pl, Chula Vista, CA 91910
                    </p>
                    <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <a href="tel:+16194831077" className="hover:text-green-500 transition-colors">
                        (619) 483-1077
                      </a>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Pacific Time (UTC-8)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* What We Work On */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-green-500" />
                    What We Work On
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded bg-green-500/10 mt-0.5">
                      <Cpu className="h-3.5 w-3.5 text-green-500" />
                    </div>
                    <div>
                      <span className="font-medium text-foreground">AI Hardware & Software</span>
                      <p className="text-muted-foreground">Edge devices, NatureOS, MYCA agent systems</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded bg-green-500/10 mt-0.5">
                      <FlaskConical className="h-3.5 w-3.5 text-green-500" />
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Biotechnology</span>
                      <p className="text-muted-foreground">Fungal computing, environmental sensing, MINDEX</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded bg-green-500/10 mt-0.5">
                      <Globe className="h-3.5 w-3.5 text-green-500" />
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Automation & Sensing</span>
                      <p className="text-muted-foreground">CREP environmental perception, OEI intelligence</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Social Links */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-green-500" />
                    Connect With Us
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    {socialLinks.map((social) => (
                      <a
                        key={social.label}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                        aria-label={social.label}
                      >
                        <social.icon className="h-5 w-5" />
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-16 bg-muted/30">
        <div className="container max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold mb-8 text-center">Explore Mycosoft</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <Link href="/ai">
              <Card className="h-full hover:border-green-500/50 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="p-2 rounded-lg bg-blue-500/10 w-fit mb-2">
                    <Cpu className="h-5 w-5 text-blue-500" />
                  </div>
                  <CardTitle className="text-lg">AI & Platforms</CardTitle>
                  <CardDescription>
                    Learn about MYCA, AVANI, NatureOS, and our AI infrastructure
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/devices">
              <Card className="h-full hover:border-green-500/50 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="p-2 rounded-lg bg-purple-500/10 w-fit mb-2">
                    <FlaskConical className="h-5 w-5 text-purple-500" />
                  </div>
                  <CardTitle className="text-lg">Hardware & Devices</CardTitle>
                  <CardDescription>
                    MycoBrain, Sporebase, and sensor-driven edge systems
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/science">
              <Card className="h-full hover:border-green-500/50 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="p-2 rounded-lg bg-amber-500/10 w-fit mb-2">
                    <Leaf className="h-5 w-5 text-amber-500" />
                  </div>
                  <CardTitle className="text-lg">Research</CardTitle>
                  <CardDescription>
                    Mycology, fungal computing, and environmental science
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
